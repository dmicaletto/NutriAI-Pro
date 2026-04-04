import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function AdvisorToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed bottom-28 left-4 right-4 z-[200] animate-in slide-in-from-bottom-4 duration-300 md:max-w-md md:mx-auto">
      <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-2xl flex gap-3 items-start">
        <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-sm flex-1 leading-snug">{message}</p>
        <button onClick={onDismiss} className="text-gray-400 hover:text-white shrink-0 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
