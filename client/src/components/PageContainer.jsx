import React from 'react';

export default function PageContainer({ title, subtitle, badge, actions, children }) {
  return (
    <div className="p-3.5 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6 animate-fade-in">
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#E8E2D7]">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {title && (
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1C1917] font-serif">
                  {title}
                </h1>
              )}
              {badge && <div className="flex-shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#78716C] font-medium leading-relaxed max-w-3xl">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto justify-start sm:justify-end flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="space-y-4 sm:space-y-6">{children}</div>
    </div>
  );
}
