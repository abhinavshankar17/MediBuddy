import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Unable to Load Component',
  message = 'An error occurred while rendering this section. Please try again.',
  onRetry
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 glass-panel border-rose-900/40 rounded-xl text-center">
      <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800/50 flex items-center justify-center mb-3 text-rose-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-100">{title}</h4>
      <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}
