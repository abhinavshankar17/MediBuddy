import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title,
  message,
  onRetry
}) {
  const { t } = useTranslation();
  const displayTitle = title || t('common.errorOccurred', 'Unable to Load Component');
  const displayMessage = message || t('common.tryAgain', 'An error occurred while rendering this section. Please try again.');

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-rose-200 rounded-2xl shadow-xs text-center">
      <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-rose-600">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-[#1C1917]">{displayTitle}</h4>
      <p className="text-xs text-[#78716C] max-w-md mt-1 mb-4">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#1C1917] bg-[#FAF8F5] hover:bg-[#F4F0E8] border border-[#E8E2D7] rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#CC785C]" />
          {t('common.retry', 'Retry Request')}
        </button>
      )}
    </div>
  );
}
