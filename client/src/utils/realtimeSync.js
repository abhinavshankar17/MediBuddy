import { useState, useEffect, useCallback, useRef } from 'react';

const SYNC_CHANNEL_NAME = 'medibuddy_realtime_sync';
const STORAGE_SYNC_KEY = 'medibuddy_last_sync_timestamp';

/**
 * Dispatch real-time notification across all browser tabs, windows, and in-memory listeners
 * @param {Object} detail { type, patientId, reminderId, ... }
 */
export function notifyPatientUpdate(detail = {}) {
  const payload = {
    ...detail,
    timestamp: Date.now()
  };

  // 1. In-tab custom DOM event
  try {
    window.dispatchEvent(new CustomEvent('medibuddy_patient_update', { detail: payload }));
  } catch (e) {}

  // 2. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    }
  } catch (e) {}

  // 3. Storage event fallback for cross-tab communication
  try {
    localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(payload));
  } catch (e) {}
}

/**
 * React hook providing real-time data sync for Caregiver & Patient views
 * @param {Object} options
 * @param {string} options.patientId - Target patient ID to track
 * @param {Function} options.onUpdate - Callback invoked when a real-time update occurs (receives isSilent: boolean)
 * @param {number} [options.pollingInterval=4000] - Fallback polling interval in ms (default 4s)
 * @param {boolean} [options.enabled=true] - Whether real-time sync is active
 */
export function useRealtimeSync({
  patientId = 'P001',
  onUpdate,
  pollingInterval = 4000,
  enabled = true
} = {}) {
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const triggerUpdate = useCallback(
    async (isSilent = true) => {
      if (!onUpdateRef.current) return;
      try {
        setIsRefreshing(true);
        await onUpdateRef.current(isSilent);
        setLastSyncTime(new Date());
      } catch (err) {
        console.warn('[useRealtimeSync] update callback error:', err);
      } finally {
        setIsRefreshing(false);
      }
    },
    []
  );

  // Manual refresh helper
  const refreshNow = useCallback(() => {
    return triggerUpdate(false);
  }, [triggerUpdate]);

  useEffect(() => {
    if (!enabled || !patientId) return;

    let sseSource = null;
    let pollTimer = null;
    let isCancelled = false;

    // 1. Connect to Backend Server-Sent Events (SSE) Stream
    try {
      const sseUrl = `/api/caregiver/patients/${encodeURIComponent(patientId)}/live-stream`;
      sseSource = new EventSource(sseUrl);

      sseSource.onopen = () => {
        if (!isCancelled) setIsLiveConnected(true);
      };

      sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type !== 'connected') {
            triggerUpdate(true);
          }
        } catch (e) {
          triggerUpdate(true);
        }
      };

      sseSource.onerror = () => {
        if (!isCancelled) setIsLiveConnected(false);
      };
    } catch (e) {
      setIsLiveConnected(false);
    }

    // 2. Intra-tab Custom Event Listener
    const handleCustomUpdate = (e) => {
      const detail = e.detail;
      if (!detail || !detail.patientId || detail.patientId === patientId) {
        triggerUpdate(true);
      }
    };
    window.addEventListener('medibuddy_patient_update', handleCustomUpdate);

    // 3. Cross-tab BroadcastChannel
    let broadcastChannel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        broadcastChannel.onmessage = (e) => {
          const data = e.data;
          if (!data || !data.patientId || data.patientId === patientId) {
            triggerUpdate(true);
          }
        };
      }
    } catch (e) {}

    // 4. Cross-tab Storage Listener
    const handleStorage = (e) => {
      if (e.key === STORAGE_SYNC_KEY || e.key === 'medibuddy_confirmed_reminders') {
        triggerUpdate(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 5. Window Focus / Tab Visibility Change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerUpdate(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    // 6. Periodic Fallback Polling Interval (every 4s)
    if (pollingInterval > 0) {
      pollTimer = setInterval(() => {
        triggerUpdate(true);
      }, pollingInterval);
    }

    return () => {
      isCancelled = true;
      if (sseSource) {
        sseSource.close();
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      window.removeEventListener('medibuddy_patient_update', handleCustomUpdate);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [patientId, enabled, pollingInterval, triggerUpdate]);

  return {
    isLiveConnected,
    isRefreshing,
    lastSyncTime,
    refreshNow
  };
}
