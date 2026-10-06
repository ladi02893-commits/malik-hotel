'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '@/context/POSContext';
import { X, PauseCircle, Check } from 'lucide-react';

export function HoldOrderModal() {
  const { isHoldModalOpen, setIsHoldModalOpen, holdCurrentOrder, customerName, cart } = usePOS();
  const [name, setName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isHoldModalOpen) {
      setName(customerName || '');
      setNote('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isHoldModalOpen, customerName]);

  if (!isHoldModalOpen) return null;

  const handleHold = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (cart.length === 0) {
      setIsHoldModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await holdCurrentOrder(name, note);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none animate-in fade-in duration-100"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsHoldModalOpen(false);
        }
      }}
    >
      <form
        onSubmit={handleHold}
        className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <PauseCircle className="w-4 h-4 text-amber-600" />
            <span>Hold Current Order</span>
          </h3>
          <button
            type="button"
            onClick={() => setIsHoldModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500">
            Current bill will be placed on hold. You can resume it anytime from the top bar &ldquo;Held&rdquo; button.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name / Table / Token (Optional)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Table 4 / Token 12 / Ahmed"
              className="w-full px-3 py-2 text-xs text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hold Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Stepped out for cash / waiting for friend..."
              className="w-full px-3 py-2 text-xs text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsHoldModalOpen(false)}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1"
          >
            <span>Cancel</span>
            <kbd className="text-[10px] font-mono bg-slate-200 text-slate-500 px-1 rounded">Esc</kbd>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Holding...' : 'Confirm Hold'}</span>
            <kbd className="text-[10px] font-mono bg-amber-800/80 text-amber-100 px-1.5 py-0.5 rounded ml-1">
              Enter
            </kbd>
          </button>
        </div>
      </form>
    </div>
  );
}
