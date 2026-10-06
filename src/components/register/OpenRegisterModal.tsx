'use client';

import React, { useState } from 'react';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import { Landmark, X, Check } from 'lucide-react';

export function OpenRegisterModal() {
  const { isRegisterOpenModalOpen, setIsRegisterOpenModalOpen, refreshRegister, showToast } = usePOS();
  const { user } = useAuth();

  const [openingAmount, setOpeningAmount] = useState<string>('5000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isRegisterOpenModalOpen) return null;

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(openingAmount);
    if (isNaN(amt) || amt < 0) {
      setError('Please enter a valid opening cash float (0 or greater).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          opening_amount: amt,
          cashier_name: user?.display_name || user?.full_name || 'Admin',
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Register opened with Rs. ${amt}`, 'success');
        await refreshRegister();
        setIsRegisterOpenModalOpen(false);
      } else {
        setError(data.error || 'Failed to open register.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-800" />
            <h3 className="font-bold text-slate-900 text-sm">Open Cash Register</h3>
          </div>
          <button
            onClick={() => setIsRegisterOpenModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleOpen} className="p-5 space-y-4">
          <p className="text-xs text-slate-600">
            Please count and enter the starting cash float in the cash drawer before taking orders.
          </p>

          {error && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-900">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Opening Cash Float (Rs.)
            </label>
            <input
              type="number"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="e.g. 5000"
              autoFocus
              className="w-full px-3 py-2 text-base font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[0, 2000, 3000, 5000, 10000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setOpeningAmount(String(val))}
                className="px-2.5 py-1 text-xs font-mono rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              >
                Rs. {val}
              </button>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRegisterOpenModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Opening...' : 'Open Register'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
