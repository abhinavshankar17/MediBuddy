import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, ArrowLeft, Check, AlertCircle } from 'lucide-react';

export default function SwipeConfirmButton({
  onConfirm,
  isConfirmed = false,
  confirmedTime = null,
  disabled = false,
  loading = false,
  error = null
}) {
  const { t } = useTranslation();
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const startXRef = useRef(0);

  const handleStart = (clientX) => {
    if (disabled || isConfirmed || loading) return;
    setIsDragging(true);
    startXRef.current = clientX;
  };

  const handleMove = (clientX) => {
    if (!isDragging || !containerRef.current) return;
    const width = containerRef.current.clientWidth - 56; // handle width
    if (width <= 0) return;

    // Swipe left calculation (start at right, drag to left)
    const diff = startXRef.current - clientX;
    const progress = Math.min(Math.max(diff / width, 0), 1);
    setDragProgress(progress);

    if (progress >= 0.75) {
      setIsDragging(false);
      setDragProgress(1);
      if (onConfirm) onConfirm();
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragProgress < 0.75) {
      setDragProgress(0);
    }
  };

  // Touch event handlers
  const handleTouchStart = (e) => handleStart(e.touches[0].clientX);
  const handleTouchMove = (e) => handleMove(e.touches[0].clientX);
  const handleTouchEnd = () => handleEnd();

  // Mouse event handlers
  const handleMouseDown = (e) => handleStart(e.clientX);
  useEffect(() => {
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  // If already confirmed or taken
  if (isConfirmed) {
    return (
      <div className="w-full p-3 rounded-2xl bg-[#059669]/10 border border-[#059669]/30 flex items-center justify-between text-xs text-[#059669] font-bold shadow-2xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>{t('medication.taken', '✓ Taken')}</span>
        </div>
        {confirmedTime && (
          <span className="text-[11px] font-medium text-[#059669]/90">
            {t('medication.confirmedAt', { time: confirmedTime, defaultValue: `Confirmed at ${confirmedTime}` })}
          </span>
        )}
      </div>
    );
  }

  // If loading
  if (loading) {
    return (
      <div className="w-full p-3 rounded-2xl bg-[#CC785C]/10 border border-[#CC785C]/30 flex items-center justify-center gap-2 text-xs text-[#CC785C] font-bold">
        <Loader2 className="w-4 h-4 animate-spin text-[#CC785C]" />
        <span>{t('medication.confirming', 'Confirming dosage intake...')}</span>
      </div>
    );
  }

  const containerWidth = containerRef.current ? containerRef.current.clientWidth - 56 : 240;
  const translateXPixels = dragProgress * containerWidth;

  return (
    <div className="space-y-2">
      {/* Swipe Track Container */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className="relative w-full h-12 bg-[#F4F0E8] border border-[#E8E2D7] rounded-2xl p-1 select-none overflow-hidden cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-between touch-none"
      >
        {/* Fill Background */}
        <div
          className="absolute right-0 top-0 bottom-0 bg-[#059669]/20 transition-all duration-75 rounded-2xl"
          style={{ width: `${dragProgress * 100}%` }}
        />

        {/* Center Label */}
        <div className="w-full text-center text-xs font-bold text-[#78716C] z-0 flex items-center justify-center gap-2 pointer-events-none px-4">
          <ArrowLeft className="w-3.5 h-3.5 text-[#CC785C] animate-pulse flex-shrink-0" />
          <span className="truncate">{t('medication.swipeToConfirm', 'Swipe left to confirm taken')}</span>
        </div>

        {/* Sliding Draggable Thumb Handle */}
        <div
          className="absolute right-1 top-1 bottom-1 w-11 rounded-xl bg-[#CC785C] text-white flex items-center justify-center shadow-md z-10 transition-transform duration-75 active:scale-95"
          style={{ transform: `translateX(-${translateXPixels}px)` }}
        >
          <ArrowLeft className="w-4 h-4" />
        </div>
      </div>

      {/* Fallback Direct Button for Accessibility & Instant Mobile Tap */}
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-[#A8A29E] hidden sm:inline">{t('medication.dragOrTap', 'Drag thumb or tap')}</span>
        <button
          onClick={() => {
            if (!loading && !isConfirmed && onConfirm) onConfirm();
          }}
          disabled={disabled || loading}
          className="font-bold text-[#CC785C] hover:text-[#B86549] underline cursor-pointer p-1"
        >
          {t('medication.tapToConfirm', 'Or tap to confirm taken →')}
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
