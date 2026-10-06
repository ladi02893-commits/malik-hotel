'use client';

import React, { useEffect, useState } from 'react';
import { usePOS } from '@/context/POSContext';
import { formatMoney } from '@/lib/money';
import { PauseCircle, Trash2, CreditCard } from 'lucide-react';

export function POSFooterActions() {
  const {
    cart,
    totals,
    clearCart,
    quickCheckoutAndPrint,
    setIsHoldModalOpen,
    activeRegister,
    setIsRegisterOpenModalOpen,
  } = usePOS();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const isCartEmpty = cart.length === 0;

  // Keyboard shortcuts F4 (Hold), Shift+Enter / F6 (Pay), F9 (Clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F6' || (e.key === 'Enter' && e.shiftKey)) {
        e.preventDefault();
        if (!isCartEmpty) {
          if (!activeRegister) {
            setIsRegisterOpenModalOpen(true);
          } else {
            quickCheckoutAndPrint();
          }
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (!isCartEmpty) {
          setIsHoldModalOpen(true);
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (!isCartEmpty) {
          setShowClearConfirm(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartEmpty, activeRegister, quickCheckoutAndPrint, setIsHoldModalOpen, setIsRegisterOpenModalOpen]);

  const handlePayClick = () => {
    if (isCartEmpty) return;
    if (!activeRegister) {
      setIsRegisterOpenModalOpen(true);
      return;
    }
    quickCheckoutAndPrint();
  };

  return (
    <div className="p-3 bg-white border-t border-slate-200 select-none">
      {/* Confirmation bar if clear clicked */}
      {showClearConfirm ? (
        <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-200 text-xs">
          <span className="font-semibold text-red-900">Clear current order?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                clearCart();
                setShowClearConfirm(false);
              }}
              className="px-2.5 py-1 rounded bg-red-700 text-white hover:bg-red-800 font-semibold"
            >
              Clear Order
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-2">
          {/* Hold Button (F4) */}
          <button
            onClick={() => setIsHoldModalOpen(true)}
            disabled={isCartEmpty}
            className="col-span-3 py-2.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            title="Hold order (F4)"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>Hold</span>
            <kbd className="hidden lg:inline text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded">F4</kbd>
          </button>

          {/* Clear Button (F9) */}
          <button
            onClick={() => {
              if (cart.length > 0) setShowClearConfirm(true);
            }}
            disabled={isCartEmpty}
            className="col-span-3 py-2.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-red-700 disabled:opacity-40 text-slate-600 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            title="Clear order (F9)"
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Clear</span>
            <kbd className="hidden lg:inline text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded">F9</kbd>
          </button>

          {/* Pay Button - Dominant Primary Action with shortcut below */}
          <button
            onClick={handlePayClick}
            disabled={isCartEmpty}
            className="col-span-6 py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-40 text-white font-bold flex flex-col items-center justify-center shadow-xs transition-colors"
            title="Pay and print receipt immediately (Shift + Enter)"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-extrabold tracking-wide">Pay</span>
              <span className="font-mono text-sm tracking-tight">
                {formatMoney(totals.grand_total)}
              </span>
            </div>
            <div className="w-full text-center mt-0.5">
              <span className="text-[10px] font-mono text-emerald-200/90 font-medium">
                [Shift + Enter]
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
