import React from 'react';
import { cn } from '../utils/cn';

export default function Card({ children, className = '', title, subtitle, action, variant = 'default', ...props }) {
  const variantStyles = {
    default: 'claude-card p-6 bg-white border border-[#E8E2D7] rounded-2xl shadow-xs hover:border-[#D6CEBE]',
    compact: 'claude-card p-4.5 bg-white border border-[#E8E2D7] rounded-xl shadow-xs',
    gradient: 'claude-card p-6 bg-gradient-to-br from-white via-[#FAF8F5] to-[#F4F0E8]/40 border border-[#E8E2D7] rounded-2xl shadow-xs',
    emerald: 'claude-card p-6 bg-gradient-to-br from-white via-[#FAF8F5] to-emerald-50/40 border border-emerald-200/60 rounded-2xl shadow-xs',
    stat: 'claude-card p-5 bg-white border border-[#E8E2D7] rounded-2xl shadow-xs hover:-translate-y-0.5 transition-all'
  };

  return (
    <div className={cn(variantStyles[variant] || variantStyles.default, className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F4F0E8]">
          <div>
            {title && <h3 className="text-base font-bold text-[#1C1917] tracking-tight font-serif">{title}</h3>}
            {subtitle && <p className="text-xs text-[#78716C] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
