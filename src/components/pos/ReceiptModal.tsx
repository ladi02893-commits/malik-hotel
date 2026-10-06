'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePOS } from '@/context/POSContext';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney } from '@/lib/money';
import { formatReceiptDate, formatTime } from '@/lib/dates';
import { Printer, CheckCircle, X, RotateCcw } from 'lucide-react';

export function ReceiptModal() {
  const {
    completedOrderForReceipt,
    setCompletedOrderForReceipt,
    isQuickPrint,
    setIsQuickPrint,
  } = usePOS();
  const { receiptSettings } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const order = completedOrderForReceipt;

  // Auto trigger browser print if auto_print is on OR if triggered via Shift+Enter quick checkout
  useEffect(() => {
    if (order) {
      document.body.classList.add('printing-thermal-receipt');
      if (receiptSettings.auto_print || isQuickPrint) {
        const timer = setTimeout(() => {
          try {
            window.print();
          } catch (e) {
            console.error('Failed to trigger window.print:', e);
          }
        }, 250);
        return () => clearTimeout(timer);
      }
      return () => {
        document.body.classList.remove('printing-thermal-receipt');
      };
    } else {
      document.body.classList.remove('printing-thermal-receipt');
    }
  }, [order, receiptSettings.auto_print, isQuickPrint]);

  const handlePrint = async () => {
    if (order && order.reprint_count > 0) {
      // Log reprint on backend
      try {
        await fetch(`/api/orders/${order.id}/reprint`, { method: 'POST' });
      } catch (e) {
        console.error('Failed to log reprint:', e);
      }
    }
    window.print();
  };

  const handleClose = () => {
    document.body.classList.remove('printing-thermal-receipt');
    setCompletedOrderForReceipt(null);
    setIsQuickPrint(false);
    setTimeout(() => {
      const searchInput = document.querySelector<HTMLInputElement>('input[data-pos-search="true"]');
      searchInput?.focus();
      searchInput?.select();
    }, 40);
  };

  // Keyboard controls inside Receipt Modal
  useEffect(() => {
    if (!order) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close modal on Escape or regular Enter
      if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        handleClose();
        return;
      }

      // Re-print on Shift+Enter or P key
      if ((e.key === 'Enter' && e.shiftKey) || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlePrint();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order]);

  if (!order) return null;

  return (
    <>
      {/* 1. ONSCREEN MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span className="font-bold text-xs">Sale Completed</span>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-emerald-200 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Receipt Preview Body (Styled as 80mm thermal paper) */}
          <div className="p-4 bg-slate-100 flex-1 overflow-y-auto max-h-[70vh]">
            <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs font-mono text-xs text-slate-800 space-y-2">
              {/* Header Title */}
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                {order.reprint_count > 0 && (
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">
                    *** REPRINT DUPLICATE ***
                  </p>
                )}
                <h2 className="font-extrabold text-sm tracking-tight uppercase text-slate-900">
                  {receiptSettings.business_name || 'MALIK TASTY NASHTA POINT'}
                </h2>
                <p className="text-[11px] text-slate-500">{receiptSettings.address || 'Vehari Road, Hasilpur'}</p>
                {receiptSettings.phone && (
                  <p className="text-[10px] text-slate-500">Ph: {receiptSettings.phone}</p>
                )}
                {receiptSettings.header_message && (
                  <p className="text-[10px] text-emerald-800 mt-1 italic">{receiptSettings.header_message}</p>
                )}
              </div>

              {/* Order Meta */}
              <div className="text-[11px] space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt:</span>
                  <span className="font-bold">{order.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order:</span>
                  <span>{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{formatReceiptDate(order.created_at)} {formatTime(order.created_at)}</span>
                </div>
                {receiptSettings.show_cashier && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cashier:</span>
                    <span>{order.cashier_name_snapshot}</span>
                  </div>
                )}
                {receiptSettings.show_customer && order.customer_name_snapshot && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span>{order.customer_name_snapshot}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
                {order.items?.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between">
                      <span>{item.quantity} × {item.product_name_snapshot}</span>
                      <span className="font-bold">{formatMoney(item.line_total)}</span>
                    </div>
                    {item.addons && item.addons.length > 0 && (
                      <div className="pl-3 text-[10px] text-slate-500">
                        {item.addons.map((a: any, aidx: number) => (
                          <div key={aidx} className="flex justify-between">
                            <span>+ {a.addon_name_snapshot || a.name_snapshot}</span>
                            <span>{formatMoney(a.line_total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.note && (
                      <p className="pl-3 text-[10px] text-slate-400 italic">({item.note})</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                {receiptSettings.show_discount && order.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Discount</span>
                    <span>- {formatMoney(order.discount_amount)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>+{formatMoney(order.tax_amount)}</span>
                  </div>
                )}
                {order.service_charge_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge</span>
                    <span>+{formatMoney(order.service_charge_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL</span>
                  <span>{formatMoney(order.grand_total)}</span>
                </div>
              </div>

              {/* Payments Breakdown */}
              {receiptSettings.show_payment_method && (
                <div className="text-[11px] space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                  {order.payments?.map((p, pidx) => (
                    <div key={pidx} className="flex justify-between capitalize">
                      <span className="text-slate-500">Paid ({p.payment_method_id}):</span>
                      <span>{formatMoney(p.amount)}</span>
                    </div>
                  ))}
                  {order.change_returned > 0 && (
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Change:</span>
                      <span>{formatMoney(order.change_returned)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-[10px] text-slate-500 pt-2 space-y-0.5">
                <p className="font-semibold">{receiptSettings.footer_message || 'Thank You - Visit Again!'}</p>
                <p className="text-[9px] text-slate-400">Powered by Ammar Ahmad - 03260603565</p>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>New Order</span>
              <kbd className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded border border-slate-200">
                Enter / Esc
              </kbd>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
              <kbd className="text-[10px] font-mono bg-emerald-950/60 text-emerald-200 px-1.5 py-0.5 rounded">
                Shift+Enter
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED 80MM THERMAL RECEIPT PRINT AREA (Portaled to body to avoid DOM nesting and clipping) */}
      {mounted && typeof document !== 'undefined'
        ? createPortal(
            <div ref={printRef} className="thermal-receipt-print-area">
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                {order.reprint_count > 0 && (
                  <p style={{ fontWeight: 'bold', fontSize: '10px' }}>*** REPRINT ***</p>
                )}
                <h2 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>
                  {receiptSettings.business_name || 'MALIK TASTY NASHTA POINT'}
                </h2>
                <p style={{ fontSize: '10px', margin: '2px 0' }}>{receiptSettings.address || 'Vehari Road, Hasilpur'}</p>
                {receiptSettings.phone && (
                  <p style={{ fontSize: '10px', margin: '1px 0' }}>Ph: {receiptSettings.phone}</p>
                )}
                {receiptSettings.header_message && (
                  <p style={{ fontSize: '9px', fontStyle: 'italic', margin: '2px 0' }}>{receiptSettings.header_message}</p>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Receipt: {order.receipt_number}</span>
                  <span>Order: {order.order_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Date: {formatReceiptDate(order.created_at)}</span>
                  <span>Time: {formatTime(order.created_at)}</span>
                </div>
                {receiptSettings.show_cashier && (
                  <div>Cashier: {order.cashier_name_snapshot}</div>
                )}
                {receiptSettings.show_customer && order.customer_name_snapshot && (
                  <div>Customer: {order.customer_name_snapshot}</div>
                )}
              </div>

              <div style={{ padding: '6px 0', fontSize: '10px' }}>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.quantity} x {item.product_name_snapshot}</span>
                      <span>{formatMoney(item.line_total)}</span>
                    </div>
                    {item.addons?.map((a: any, aidx: number) => (
                      <div key={aidx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', fontSize: '9px' }}>
                        <span>+ {a.addon_name_snapshot || a.name_snapshot}</span>
                        <span>{formatMoney(a.line_total)}</span>
                      </div>
                    ))}
                    {item.note && (
                      <div style={{ paddingLeft: '8px', fontSize: '8px', fontStyle: 'italic' }}>({item.note})</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                {receiptSettings.show_discount && order.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount</span>
                    <span>- {formatMoney(order.discount_amount)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax</span>
                    <span>+{formatMoney(order.tax_amount)}</span>
                  </div>
                )}
                {order.service_charge_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Service Charge</span>
                    <span>+{formatMoney(order.service_charge_amount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>
                  <span>TOTAL</span>
                  <span>{formatMoney(order.grand_total)}</span>
                </div>
              </div>

              {receiptSettings.show_payment_method && (
                <div style={{ borderBottom: '1px dashed #000', padding: '4px 0', fontSize: '10px' }}>
                  {order.payments?.map((p, pidx) => (
                    <div key={pidx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ textTransform: 'capitalize' }}>Payment: {p.payment_method_id}</span>
                      <span>{formatMoney(p.amount)}</span>
                    </div>
                  ))}
                  {order.change_returned > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <span>Change:</span>
                      <span>{formatMoney(order.change_returned)}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '9px' }}>
                <p style={{ margin: '0' }}>{receiptSettings.footer_message || 'Thank You - Visit Again'}</p>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
