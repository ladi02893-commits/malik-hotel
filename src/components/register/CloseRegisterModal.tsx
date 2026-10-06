'use client';

import React, { useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, subtractMoney } from '@/lib/money';
import { Landmark, X, AlertTriangle, CheckCircle } from 'lucide-react';

export function CloseRegisterModal() {
  const { isRegisterCloseModalOpen, setIsRegisterCloseModalOpen, refreshRegister, showToast } = usePOS();
  const { user } = useAuth();

  const [registerData, setRegisterData] = useState<any>(null);
  const [actualCash, setActualCash] = useState<string>('');
  const [closingNote, setClosingNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isRegisterCloseModalOpen) {
      setClosingSummary(null);
      setActualCash('');
      setClosingNote('');
      setError('');

      // Fetch live register details
      fetch('/api/register')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.activeRegister) {
            setRegisterData(data.activeRegister);
            setActualCash(String(data.activeRegister.breakdown?.expected_cash || 0));
          }
        });
    }
  }, [isRegisterCloseModalOpen]);

  if (!isRegisterCloseModalOpen) return null;

  const expectedCash = registerData?.breakdown?.expected_cash || 0;
  const actualNum = parseFloat(actualCash) || 0;
  const difference = subtractMoney(actualNum, expectedCash);

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isNaN(actualNum) || actualNum < 0) {
      setError('Please enter a valid actual cash amount.');
      return;
    }

    if (difference !== 0 && !closingNote.trim()) {
      setError('A discrepancy exists. Please provide an explanation note before closing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          actual_amount: actualNum,
          closing_note: closingNote.trim(),
          cashier_name: user?.display_name || user?.full_name || 'Admin',
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setClosingSummary(data.summary);
        showToast('Cash register closed successfully', 'success');
        await refreshRegister();
      } else {
        setError(data.error || 'Failed to close register.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-slate-800" />
            <h3 className="font-bold text-slate-900 text-sm">
              {closingSummary ? 'Register Closing Report' : 'End of Shift Register Reconciliation'}
            </h3>
          </div>
          <button
            onClick={() => setIsRegisterCloseModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {closingSummary ? (
          /* SUMMARY REPORT DISPLAY */
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Shift successfully closed & reconciled.</span>
            </div>

            <div className="space-y-1.5 text-xs border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Opening Balance:</span>
                <span className="font-mono font-bold">{formatMoney(closingSummary.opening_amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Cash Sales:</span>
                <span className="font-mono font-bold text-emerald-800">+{formatMoney(closingSummary.cash_sales)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Cash In (Added):</span>
                <span className="font-mono font-bold">+{formatMoney(closingSummary.cash_in)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Cash Refunds:</span>
                <span className="font-mono font-bold text-red-700">-{formatMoney(closingSummary.cash_refunds)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Cash Out (Expense):</span>
                <span className="font-mono font-bold text-red-700">-{formatMoney(closingSummary.cash_out)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-300 font-bold">
                <span>Expected Drawer Cash:</span>
                <span className="font-mono text-slate-900">{formatMoney(closingSummary.expected_amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-300 font-bold">
                <span>Actual Cash Counted:</span>
                <span className="font-mono text-slate-900">{formatMoney(closingSummary.actual_amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm font-extrabold">
                <span>Difference:</span>
                <span className={`font-mono ${closingSummary.difference === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {formatMoney(closingSummary.difference)}
                </span>
              </div>
            </div>

            {closingSummary.closing_note && (
              <div className="text-xs text-slate-600 p-2.5 rounded bg-slate-100">
                <span className="font-semibold text-slate-700">Closing Note: </span>
                <span>{closingSummary.closing_note}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRegisterCloseModalOpen(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Report
              </button>
            </div>
          </div>
        ) : (
          /* RECONCILIATION FORM */
          <form onSubmit={handleCloseRegister} className="p-5 space-y-4 overflow-y-auto">
            {error && (
              <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-900">
                {error}
              </div>
            )}

            {/* Shift Breakdown Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Opening Cash Float:</span>
                <span className="font-mono">{formatMoney(registerData?.breakdown?.opening_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cash Sales:</span>
                <span className="font-mono text-emerald-800">+{formatMoney(registerData?.breakdown?.cash_sales || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Digital / Card Sales:</span>
                <span className="font-mono text-blue-700">{formatMoney(registerData?.breakdown?.digital_sales || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cash In:</span>
                <span className="font-mono text-slate-700">+{formatMoney(registerData?.breakdown?.cash_in || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cash Refunds:</span>
                <span className="font-mono text-red-700">-{formatMoney(registerData?.breakdown?.cash_refunds || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cash Out:</span>
                <span className="font-mono text-red-700">-{formatMoney(registerData?.breakdown?.cash_out || 0)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Expected Drawer Cash:</span>
                <span className="font-mono text-sm">{formatMoney(expectedCash)}</span>
              </div>
            </div>

            {/* Actual Counted Cash Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Actual Physical Cash Counted in Drawer (Rs.)
              </label>
              <input
                type="number"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="Count all physical cash and enter total..."
                autoFocus
                className="w-full px-3 py-2 text-base font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Discrepancy Box */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                difference === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2">
                {difference === 0 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span className="font-semibold">
                  {difference === 0 ? 'Drawer Balanced (Exact)' : 'Cash Difference / Discrepancy'}
                </span>
              </div>
              <span className="font-mono font-bold text-sm">
                {difference > 0 ? `+${formatMoney(difference)}` : formatMoney(difference)}
              </span>
            </div>

            {/* Explanation Note */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Closing Note / Discrepancy Explanation {difference !== 0 && <span className="text-red-600">*</span>}
              </label>
              <textarea
                rows={2}
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder={difference !== 0 ? 'Explain discrepancy (e.g. short change on order)...' : 'Optional closing remark...'}
                className="w-full px-3 py-1.5 text-xs text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRegisterCloseModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg transition-colors"
              >
                {isSubmitting ? 'Closing...' : 'Confirm & Close Shift'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
