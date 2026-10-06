'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '@/context/POSContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { X, Percent, Tag, ShieldCheck, Check } from 'lucide-react';

export function DiscountModal() {
  const { isDiscountModalOpen, setIsDiscountModalOpen, applyDiscount, totals } = usePOS();
  const { posSettings } = useSettings();
  const { verifySupervisorPin } = useAuth();

  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDiscountModalOpen) {
      setValue(totals.discount_value ? String(totals.discount_value) : '');
      setDiscountType(totals.discount_type || 'percentage');
      setPin('');
      setError('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isDiscountModalOpen, totals.discount_value, totals.discount_type]);

  if (!isDiscountModalOpen) return null;

  const numVal = parseFloat(value) || 0;
  const maxCashierPct = parseFloat(String(posSettings.max_cashier_discount_percent || 15));
  const pinThreshold = parseFloat(String(posSettings.require_pin_above_percent || 20));

  const needsPin = discountType === 'percentage' && numVal > pinThreshold;

  const handleApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setError('');

    if (numVal <= 0) {
      setError('Please enter a discount greater than 0.');
      inputRef.current?.focus();
      return;
    }

    if (discountType === 'percentage') {
      if (numVal > 100) {
        setError('Percentage cannot exceed 100%.');
        inputRef.current?.focus();
        return;
      }

      if (needsPin) {
        setIsSubmitting(true);
        const isVerified = await verifySupervisorPin(pin);
        setIsSubmitting(false);
        if (!isVerified) {
          setError('Invalid supervisor/admin PIN.');
          return;
        }
      }
    } else {
      if (!posSettings.allow_fixed_discount) {
        setError('Fixed discounts are disabled in POS settings.');
        return;
      }
      if (numVal > totals.subtotal) {
        setError(`Discount cannot exceed subtotal (Rs. ${totals.subtotal}).`);
        inputRef.current?.focus();
        return;
      }
    }

    applyDiscount(discountType, numVal);
    handleClose();
  };

  const handleClose = () => {
    setIsDiscountModalOpen(false);
    setTimeout(() => {
      const searchInput = document.querySelector<HTMLInputElement>('input[data-pos-search="true"]');
      searchInput?.focus();
    }, 40);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none animate-in fade-in duration-100"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleClose();
        }
      }}
    >
      <form
        onSubmit={handleApply}
        className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-800" />
            <span>Apply Order Discount</span>
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-900 font-medium">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setDiscountType('percentage');
                setError('');
                inputRef.current?.focus();
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                discountType === 'percentage'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Percentage (%)</span>
            </button>

            {posSettings.allow_fixed_discount && (
              <button
                type="button"
                onClick={() => {
                  setDiscountType('fixed');
                  setError('');
                  inputRef.current?.focus();
                }}
                className={`py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  discountType === 'fixed'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Fixed (Rs.)</span>
              </button>
            )}
          </div>

          {/* Value Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (Rs.)'}
            </label>
            <input
              ref={inputRef}
              type="number"
              step="any"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 150'}
              className="w-full px-3 py-2 text-sm font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            {discountType === 'percentage' && (
              <p className="text-[11px] text-slate-400 mt-1">
                Standard limit: {maxCashierPct}%. Above {pinThreshold}% requires supervisor PIN.
              </p>
            )}
          </div>

          {/* Supervisor PIN input if required */}
          {needsPin && (
            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Supervisor PIN Required</span>
              </div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN..."
                maxLength={6}
                className="w-full px-3 py-1.5 text-xs font-mono rounded border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1"
          >
            <span>Cancel</span>
            <kbd className="text-[10px] font-mono bg-slate-200 text-slate-500 px-1 rounded">Esc</kbd>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Applying...' : 'Apply Discount'}</span>
            <kbd className="text-[10px] font-mono bg-emerald-950 text-emerald-200 px-1.5 py-0.5 rounded ml-1">
              Enter
            </kbd>
          </button>
        </div>
      </form>
    </div>
  );
}
