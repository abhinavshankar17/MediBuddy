import React from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action
}) {
  const { t } = useTranslation();
  const displayTitle = title || t('common.noData', 'No Data Available');
  const displayDescription = description || t('common.noDataDesc', 'There are currently no items to display in this view.');

  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white border border-[#E8E2D7] rounded-2xl shadow-xs text-center">
      <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E8E2D7] flex items-center justify-center mb-3 text-[#A8A29E]">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-[#1C1917]">{displayTitle}</h4>
      <p className="text-xs text-[#78716C] max-w-sm mt-1 mb-4">{displayDescription}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
