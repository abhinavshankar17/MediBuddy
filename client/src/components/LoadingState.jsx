import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading care data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[240px] glass-panel rounded-xl text-center">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-300">{message}</p>
      <span className="text-xs text-slate-500 mt-1">Medi Buddy Intelligence Syncing</span>
    </div>
  );
}
