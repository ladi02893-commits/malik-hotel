'use client';

import React, { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import { DailySummaryData } from '@/types';
import {
  BadgeDollarSign,
  TrendingUp,
  ShoppingBag,
  Landmark,
  Users,
  Calendar,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Receipt,
  Scale,
} from 'lucide-react';

export default function DailySummaryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async (date: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/daily-summary?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setSummaryData(data.data);
      }
    } catch (err) {
      console.error('Failed to load daily summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedDate);
  }, [selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 bg-slate-50 gap-6">
      {/* 1. Header & Date Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-2xs">
            <BadgeDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Roozana Hisaab Kitab (Daily Summary)</h1>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Live Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Sale, Raw Material Kharidari, Cash Drawer Opening/Closing aur Vendor Payables</p>
          </div>
        </div>

        {/* Date Selector & Print */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin" />
          <span>Generating daily reconciliation hisaab...</span>
        </div>
      ) : summaryData ? (
        <div className="space-y-6">
          {/* 2. THE 4 MAIN PILLARS (Top KPI Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: TODAY'S TOTAL SALES */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Net Sale</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{formatMoney(summaryData.sales.net_sales)}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{summaryData.sales.total_orders} Orders</span>
                <span className="font-semibold text-emerald-800">Cash: {formatMoney(summaryData.sales.cash_sales)}</span>
              </div>
            </div>

            {/* CARD 2: TODAY'S RAW MATERIAL PURCHASES */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Maal Kharidari (Purchases)</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                  <ShoppingBag className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-amber-900 mt-2">{formatMoney(summaryData.purchases.total_purchases)}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-medium">Naqad: {formatMoney(summaryData.purchases.paid_cash)}</span>
                <span className="text-red-700 font-bold">Udhaar: {formatMoney(summaryData.purchases.unpaid_credit)}</span>
              </div>
            </div>

            {/* CARD 3: CASH DRAWER (OPENING VS CLOSING) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash Drawer In-Hand</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
                  <Landmark className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-blue-950 mt-2">{formatMoney(summaryData.cash_drawer.expected_cash)}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Opening: {formatMoney(summaryData.cash_drawer.opening_float)}</span>
                <span className="font-semibold text-blue-800">
                  {summaryData.cash_drawer.is_open ? 'Drawer Open' : 'Closed'}
                </span>
              </div>
            </div>

            {/* CARD 4: VENDORS TOTAL OUTSTANDING PAYABLE */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vendors Ka Dena Baqi (Payables)</span>
                <span className="p-2 rounded-xl bg-red-50 text-red-800 border border-red-200">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-red-900 mt-2">{formatMoney(summaryData.vendors.total_outstanding_payable)}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Kul Baqaya Udhaar</span>
                <span className="font-semibold text-slate-700">Paid Today: {formatMoney(summaryData.vendors.payments_made_today)}</span>
              </div>
            </div>
          </div>

          {/* 3. OPERATIONAL MARGIN & CASH FLOW SUMMARY BANNER */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Day's Financial Margin
              </span>
              <h2 className="text-xl font-bold">
                Aaj Ka Operational Margin (Sale — Raw Material Kharidari)
              </h2>
              <p className="text-xs text-emerald-200">
                Bina kisi doosre kharchay ke, aaj ki POS sale aur raw material kacha maal ka farq:
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[11px] text-emerald-300 font-semibold uppercase">Daily Gross Margin</p>
                <p className={`text-2xl font-black ${summaryData.margin.day_gross_margin >= 0 ? 'text-white' : 'text-red-300'}`}>
                  {formatMoney(summaryData.margin.day_gross_margin)}
                </p>
              </div>

              <div className="w-px h-10 bg-emerald-700" />

              <div className="text-right">
                <p className="text-[11px] text-emerald-300 font-semibold uppercase">Net Drawer Cash Flow</p>
                <p className="text-2xl font-black text-amber-300">
                  {formatMoney(summaryData.margin.net_cash_flow)}
                </p>
              </div>
            </div>
          </div>

          {/* 4. TWO-COLUMN DETAILED BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN: CASH DRAWER RECONCILIATION */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-800" />
                  <h3 className="font-bold text-slate-900 text-sm">Cash Drawer Hisaab (Opening / Closing)</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500">{selectedDate}</span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-2 text-slate-700">
                  <span className="font-medium">1. Subah Ka Opening Cash Float:</span>
                  <span className="font-bold">{formatMoney(summaryData.cash_drawer.opening_float)}</span>
                </div>

                <div className="flex justify-between py-2 text-emerald-800">
                  <span className="font-medium flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    2. Cash POS Sales (Naqad Sale):
                  </span>
                  <span className="font-bold">+{formatMoney(summaryData.cash_drawer.cash_sales)}</span>
                </div>

                <div className="flex justify-between py-2 text-emerald-800">
                  <span className="font-medium flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    3. Cash In (Drawer Float Additions):
                  </span>
                  <span className="font-bold">+{formatMoney(summaryData.cash_drawer.cash_in)}</span>
                </div>

                <div className="flex justify-between py-2 text-red-700">
                  <span className="font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    4. Cash Out / Drawer Kharchay:
                  </span>
                  <span className="font-bold">-{formatMoney(summaryData.cash_drawer.cash_out)}</span>
                </div>

                <div className="flex justify-between py-2 text-red-700">
                  <span className="font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    5. Cash Refunds:
                  </span>
                  <span className="font-bold">-{formatMoney(summaryData.cash_drawer.cash_refunds)}</span>
                </div>

                <div className="flex justify-between py-3 font-black text-slate-900 text-sm bg-slate-50 px-3 rounded-xl border border-slate-200 mt-2">
                  <span>Sham Ka Expected Cash In Hand:</span>
                  <span className="text-emerald-900">{formatMoney(summaryData.cash_drawer.expected_cash)}</span>
                </div>

                {summaryData.cash_drawer.actual_cash !== undefined && (
                  <div className="flex justify-between py-2 text-xs px-3">
                    <span className="text-slate-600">Counted Actual Closing Cash:</span>
                    <span className="font-bold text-slate-900">{formatMoney(summaryData.cash_drawer.actual_cash)}</span>
                  </div>
                )}

                {summaryData.cash_drawer.difference !== undefined && summaryData.cash_drawer.difference !== 0 && (
                  <div className="flex justify-between py-2 text-xs px-3 bg-red-50 text-red-900 font-bold rounded-lg border border-red-200">
                    <span>Cash Discrepancy / Farq:</span>
                    <span>{formatMoney(summaryData.cash_drawer.difference)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: RAW MATERIAL DELIVERIES (MAAL BOUGHT TODAY) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-700" />
                  <h3 className="font-bold text-slate-900 text-sm">Aaj Delivery Hua Maal (Top Items)</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {summaryData.purchases.total_invoices} Invoices
                </span>
              </div>

              {summaryData.purchases.top_items.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Aaj koi maal purchase record nahi hua.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Raw Item</th>
                        <th className="py-2.5 px-3 text-center">Total Quantity</th>
                        <th className="py-2.5 px-3 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summaryData.purchases.top_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatMoney(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Purchase Payment Breakdown */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Naqad Paid (Cash)</p>
                  <p className="text-base font-black text-emerald-900 mt-0.5">
                    {formatMoney(summaryData.purchases.paid_cash)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-[10px] uppercase font-bold text-red-700">Udhaar Khata (Credit)</p>
                  <p className="text-base font-black text-red-900 mt-0.5">
                    {formatMoney(summaryData.purchases.unpaid_credit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
