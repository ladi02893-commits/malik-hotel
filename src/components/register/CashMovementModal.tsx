'use client';

import React, { useState } from 'react';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';

export function CashMovementModal() {
  const {
    isCashMovementModalOpen,
    setIsCashMovementModalOpen,
    cashMovementType,
    setCashMovementType,
    refreshRegister,
    showToast,
  } = usePOS();
  const { user } = useAuth();

  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isCashMovementModalOpen) return null;

  const isCashIn = cashMovementType === 'CASH_IN';

  const commonReasonsIn = ['Owner Cash Addition', 'Change Float Top-up', 'Bank Cash Withdrawal'];
  const commonReasonsOut = ['Milk / Dairy Supplier', 'Flour / Atta Expense', 'Gas Cylinder', 'Daily Labor / Tip', 'Emergency Purchase'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }

    if (!reason.trim()) {
      setError('Reason is mandatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isCashIn ? 'cash_in' : 'cash_out',
          amount: parsedAmt,
          reason: reason.trim(),
          note: note.trim() || undefined,
          cashier_name: user?.display_name || user?.full_name || 'Admin',
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(isCashIn ? `Rs. ${parsedAmt} added to drawer` : `Rs. ${parsedAmt} paid from drawer`, 'success');
        await refreshRegister();
        setIsCashMovementModalOpen(false);
        setAmount('');
        setReason('');
        setNote('');
      } else {
        setError(data.error || 'Failed to record cash movement.');
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
            {isCashIn ? (
              <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
            ) : (
              <ArrowUpRight className="w-4 h-4 text-amber-700" />
            )}
            <h3 className="font-bold text-slate-900 text-sm">
              {isCashIn ? 'Cash In (Add Cash)' : 'Cash Out (Pay Expense)'}
            </h3>
          </div>
          <button
            onClick={() => setIsCashMovementModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-900">
              {error}
            </div>
          )}

          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setCashMovementType('CASH_IN');
                setError('');
              }}
              className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                isCashIn ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Cash In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCashMovementType('CASH_OUT');
                setError('');
              }}
              className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                !isCashIn ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Cash Out</span>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (Rs.)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500"
              autoFocus
              className="w-full px-3 py-2 text-base font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Reason / Category
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Select quick reason or type custom..."
              className="w-full px-3 py-1.5 text-xs text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />

            {/* Quick Reason Suggestions */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(isCashIn ? commonReasonsIn : commonReasonsOut).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Optional Note / Supplier Bill #
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 50 liters milk from Gujjar dairy..."
              className="w-full px-3 py-1.5 text-xs text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCashMovementModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-xs ${
                isCashIn
                  ? 'bg-emerald-800 hover:bg-emerald-900'
                  : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              {isSubmitting ? 'Recording...' : isCashIn ? 'Confirm Cash In' : 'Confirm Cash Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
