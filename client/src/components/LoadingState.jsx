import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message }) {
  const { t } = useTranslation();
  const displayMessage = message || t('common.loadingData', 'Loading care data...');

  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[240px] glass-panel rounded-xl text-center">
      <Loader2 className="w-8 h-8 text-[#CC785C] animate-spin mb-3" />
      <p className="text-sm font-medium text-[#1C1917]">{displayMessage}</p>
      <span className="text-xs text-[#78716C] mt-1">{t('common.appTagline', 'Medi Buddy Intelligence Syncing')}</span>
    </div>
  );
}
