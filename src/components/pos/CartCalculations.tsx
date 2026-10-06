'use client';

import React from 'react';
import { usePOS } from '@/context/POSContext';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney } from '@/lib/money';
import { Tag, X } from 'lucide-react';

export function CartCalculations() {
  const { totals, setIsDiscountModalOpen, removeDiscount } = usePOS();
  const { posSettings } = useSettings();

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 space-y-1 text-xs select-none">
      {/* Subtotal */}
      <div className="flex justify-between items-center text-slate-600">
        <span>Subtotal</span>
        <span className="font-mono font-medium">{formatMoney(totals.subtotal)}</span>
      </div>

      {/* Discount Row (only shown if discounts enabled in settings) */}
      {posSettings.enable_discounts && (
        <div className="flex justify-between items-center text-slate-600">
          <div className="flex items-center gap-1.5">
            <span>Discount</span>
            {totals.discount_amount > 0 ? (
              <span className="text-[10px] text-emerald-800 bg-emerald-100/70 px-1 rounded font-medium">
                {totals.discount_type === 'percentage' ? `${totals.discount_value}%` : 'Fixed'}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            {totals.discount_amount > 0 ? (
              <>
                <span className="font-mono font-semibold text-emerald-700">
                  - {formatMoney(totals.discount_amount)}
                </span>
                <button
                  onClick={removeDiscount}
                  className="p-0.5 text-slate-400 hover:text-red-600 rounded"
                  title="Remove discount"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsDiscountModalOpen(true)}
                className="text-[11px] text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 font-semibold"
                title="Add discount to bill (D)"
              >
                <Tag className="w-3 h-3" />
                <span>Add Discount</span>
                <kbd className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded border border-emerald-300 ml-0.5">
                  D
                </kbd>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tax if enabled */}
      {posSettings.enable_tax && (
        <div className="flex justify-between items-center text-slate-600">
          <span>Tax ({posSettings.tax_rate_percent}%)</span>
          <span className="font-mono">+{formatMoney(totals.tax_amount)}</span>
        </div>
      )}

      {/* Service Charge if enabled */}
      {posSettings.enable_service_charge && (
        <div className="flex justify-between items-center text-slate-600">
          <span>Service Charge ({posSettings.service_charge_percent}%)</span>
          <span className="font-mono">+{formatMoney(totals.service_charge_amount)}</span>
        </div>
      )}

      {/* Round Off if enabled */}
      {posSettings.enable_rounding && totals.rounding_amount !== 0 && (
        <div className="flex justify-between items-center text-slate-500 text-[11px]">
          <span>Round Off</span>
          <span className="font-mono">
            {totals.rounding_amount > 0 ? `+${totals.rounding_amount}` : totals.rounding_amount}
          </span>
        </div>
      )}

      {/* Grand Total */}
      <div className="pt-1.5 border-t border-slate-200/80 flex justify-between items-baseline">
        <span className="font-bold text-slate-900 text-xs uppercase tracking-tight">Total Due</span>
        <span className="font-extrabold text-base text-emerald-900 font-mono">
          {formatMoney(totals.grand_total)}
        </span>
      </div>
    </div>
  );
}
