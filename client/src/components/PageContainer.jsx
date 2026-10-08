import React from 'react';

export default function PageContainer({ title, subtitle, badge, actions, children }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D7]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1917] font-serif">
                {title}
              </h1>
              {badge && <div>{badge}</div>}
            </div>
            {subtitle && <p className="text-xs sm:text-sm text-[#78716C] font-medium mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
