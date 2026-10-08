import React from 'react';
import { cn } from '../utils/cn';

export default function StatusBadge({ status, label, icon: Icon, className = '' }) {
  const normalized = (status || label || '').toLowerCase();

  let colorStyle = 'bg-[#F4F0E8] text-[#78716C] border-[#E8E2D7]';
  let dotColor = 'bg-[#78716C]';

  if (['completed', 'taken', 'low', 'normal', 'passed', 'active', 'good'].includes(normalized)) {
    colorStyle = 'bg-[#059669]/10 text-[#059669] border-[#059669]/20 font-bold';
    dotColor = 'bg-[#059669]';
  } else if (['pending', 'medium', 'started', 'snoozed', 'warning', 'scheduled'].includes(normalized)) {
    colorStyle = 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20 font-bold';
    dotColor = 'bg-[#D97706]';
  } else if (['missed', 'high', 'failed', 'urgent', 'escalated', 'not_taken', 'open'].includes(normalized)) {
    colorStyle = 'bg-[#E11D48]/10 text-[#E11D48] border-[#E11D48]/20 font-bold';
    dotColor = 'bg-[#E11D48]';
  } else if (['info', 'new', 'confirmed'].includes(normalized)) {
    colorStyle = 'bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20 font-bold';
    dotColor = 'bg-[#CC785C]';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border transition-all',
        colorStyle,
        className
      )}
    >
      {Icon ? (
        <Icon className="w-3.5 h-3.5" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      )}
      <span>{label || status}</span>
    </span>
  );
}
