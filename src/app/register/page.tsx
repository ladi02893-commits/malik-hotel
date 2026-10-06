'use client';

import React, { useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { OpenRegisterModal } from '@/components/register/OpenRegisterModal';
import { CloseRegisterModal } from '@/components/register/CloseRegisterModal';
import { CashMovementModal } from '@/components/register/CashMovementModal';

export default function RegisterPage() {
  const {
    activeRegister,
    setIsRegisterOpenModalOpen,
    setIsRegisterCloseModalOpen,
    setIsCashMovementModalOpen,
    setCashMovementType,
    refreshRegister,
  } = usePOS();

  const [registerData, setRegisterData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRegisterDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/register');
      const data = await res.json();
      if (data.success) {
        setRegisterData(data.activeRegister || null);
      }
    } catch (e) {
      console.error('Failed to load register:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisterDetails();
  }, [activeRegister]);

  const breakdown = registerData?.breakdown || {};
  const transactions = registerData?.transactions || [];

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden select-none space-y-4 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-800" />
            <span>Cash Register & Drawer Management</span>
          </h1>
          <p className="text-xs text-slate-500">Daily cash opening, expense tracking, and shift closing reconciliation</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeRegister ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setCashMovementType('CASH_IN');
                  setIsCashMovementModalOpen(true);
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Cash In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCashMovementType('CASH_OUT');
                  setIsCashMovementModalOpen(true);
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Cash Out</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRegisterCloseModalOpen(true)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <span>Close Shift Reconciliation</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsRegisterOpenModalOpen(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Open Cash Drawer Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* DRAWER STATUS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Opening Cash */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Opening Float</span>
          <p className="font-mono font-bold text-base text-slate-900 mt-1">
            {formatMoney(breakdown.opening_amount || 0)}
          </p>
          <span className="text-[10px] text-slate-400">Drawer starting cash</span>
        </div>

        {/* Cash Sales */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Cash Sales</span>
          <p className="font-mono font-bold text-base text-emerald-800 mt-1">
            +{formatMoney(breakdown.cash_sales || 0)}
          </p>
          <span className="text-[10px] text-slate-400">Total physical cash</span>
        </div>

        {/* Cash In */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Cash In</span>
          <p className="font-mono font-bold text-base text-slate-800 mt-1">
            +{formatMoney(breakdown.cash_in || 0)}
          </p>
          <span className="text-[10px] text-slate-400">Owner additions</span>
        </div>

        {/* Cash Out */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Cash Out</span>
          <p className="font-mono font-bold text-base text-red-700 mt-1">
            -{formatMoney(breakdown.cash_out || 0)}
          </p>
          <span className="text-[10px] text-slate-400">Expenses & suppliers</span>
        </div>

        {/* Cash Refunds */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Cash Refunds</span>
          <p className="font-mono font-bold text-base text-red-700 mt-1">
            -{formatMoney(breakdown.cash_refunds || 0)}
          </p>
          <span className="text-[10px] text-slate-400">Cash returned</span>
        </div>

        {/* Expected Cash in Drawer */}
        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] text-emerald-950 font-bold uppercase tracking-tight">Expected Drawer Cash</span>
          <p className="font-mono font-extrabold text-lg text-emerald-950 mt-1">
            {formatMoney(breakdown.expected_cash || 0)}
          </p>
          <span className="text-[10px] text-emerald-800 font-semibold">Active shift balance</span>
        </div>
      </div>

      {/* SHIFT TRANSACTIONS LOG */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900">Shift Cash Movements & Log</h2>
          <span className="text-xs text-slate-500 font-mono">
            {transactions.length} drawer transaction{transactions.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Note</th>
                <th className="py-2.5 px-3">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Loading shift log...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No cash drawer movements recorded for this session.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => {
                  const typeColors: Record<string, string> = {
                    OPENING: 'bg-slate-100 text-slate-800',
                    SALE: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                    CASH_IN: 'bg-blue-50 text-blue-800 border border-blue-200',
                    CASH_OUT: 'bg-amber-50 text-amber-900 border border-amber-200',
                    REFUND: 'bg-red-50 text-red-800 border border-red-200',
                    ADJUSTMENT: 'bg-purple-50 text-purple-800 border border-purple-200',
                  };

                  const isPositive = ['OPENING', 'SALE', 'CASH_IN'].includes(tx.type);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${typeColors[tx.type] || 'bg-slate-100'}`}>
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-800' : 'text-red-700'}`}>
                        {isPositive ? `+${formatMoney(tx.amount)}` : `-${formatMoney(tx.amount)}`}
                      </td>
                      <td className="py-2 px-3 text-slate-800 font-medium">
                        {tx.reason || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-500">
                        {tx.note || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {tx.user_name_snapshot || 'Admin'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OpenRegisterModal />
      <CloseRegisterModal />
      <CashMovementModal />
    </div>
  );
}
