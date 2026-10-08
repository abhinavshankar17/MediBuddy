const API_BASE_URL = '/api';

/**
 * Fetch notifications for current user / patient / caregiver
 * @param {Object} [filter] - { recipientId, recipientRole, patientId, read }
 */
export async function getNotifications(filter = {}) {
  try {
    const params = new URLSearchParams();
    if (filter.recipientId) params.append('recipientId', filter.recipientId);
    if (filter.recipientRole) params.append('recipientRole', filter.recipientRole);
    if (filter.patientId) params.append('patientId', filter.patientId);
    if (filter.read !== undefined) params.append('read', filter.read);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/notifications${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const result = await res.json();
    return result.data || [];
  } catch (err) {
    console.warn('Error fetching notifications:', err.message);
    return [];
  }
}

/**
 * Mark a notification as read
 * @param {string} notificationId
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    const result = await res.json();
    return result.data;
  } catch (err) {
    console.warn('Error marking notification as read:', err.message);
    return null;
  }
}

/**
 * Mark all notifications as read
 * @param {Object} [filter]
 */
export async function markAllNotificationsAsRead(filter = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter)
    });
    if (!res.ok) throw new Error('Failed to mark all notifications as read');
    return true;
  } catch (err) {
    console.warn('Error marking all notifications as read:', err.message);
    return false;
  }
}

/**
 * Delete a specific notification
 * @param {string} notificationId
 */
export async function deleteNotification(notificationId) {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete notification');
    return true;
  } catch (err) {
    console.warn('Error deleting notification:', err.message);
    return false;
  }
}

/**
 * Clear all notifications
 * @param {Object} [filter]
 */
export async function clearAllNotifications(filter = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter)
    });
    if (!res.ok) throw new Error('Failed to clear notifications');
    return true;
  } catch (err) {
    console.warn('Error clearing notifications:', err.message);
    return false;
  }
}

/**
 * Trigger background check for medication reminder notifications
 */
export async function triggerNotificationCheck() {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to process notifications');
    const result = await res.json();
    return result.data;
  } catch (err) {
    console.warn('Error triggering notification process:', err.message);
    return null;
  }
}
