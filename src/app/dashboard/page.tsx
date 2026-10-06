'use client';

import React, { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import { formatTime } from '@/lib/dates';
import { usePOS } from '@/context/POSContext';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingBag,
  Banknote,
  Smartphone,
  RotateCcw,
  Landmark,
  ArrowRight,
  TrendingUp,
  Receipt,
  UtensilsCrossed,
} from 'lucide-react';

export default function DashboardPage() {
  const { activeRegister } = usePOS();
  const [data, setData] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [repRes, ordersRes] = await Promise.all([
          fetch('/api/reports?range=today'),
          fetch('/api/orders?range=today&limit=8'),
        ]);

        const repData = await repRes.json();
        const ordersData = await ordersRes.json();

        if (repData.success) setData(repData);
        if (ordersData.success) setRecentOrders(ordersData.orders || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const summary = data?.summary || {};
  const payments = data?.payments || [];
  const topProducts = data?.productSales?.slice(0, 5) || [];
  const hourly = data?.hourlyTrend || [];

  const cashAmount = payments.find((p: any) => p.payment_method_id === 'cash')?.total_amount || 0;
  const digitalAmount = payments
    .filter((p: any) => p.payment_method_id !== 'cash')
    .reduce((sum: number, p: any) => sum + p.total_amount, 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 select-none max-w-7xl mx-auto w-full">
      {/* Page Title & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Today's Restaurant Overview</h1>
          <p className="text-xs text-slate-500">Live sales performance and counter metrics</p>
        </div>

        <Link
          href="/pos"
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <span>Open POS Billing</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* TOP 6 KPI METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Today's Net Sales */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Today's Sales</span>
            <div className="p-1 rounded bg-emerald-50 text-emerald-800">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-extrabold text-lg text-slate-900 font-mono">
              {formatMoney(summary.netSales || 0)}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Gross: {formatMoney(summary.grossSales || 0)}</p>
          </div>
        </div>

        {/* 2. Total Orders */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Orders Today</span>
            <div className="p-1 rounded bg-blue-50 text-blue-700">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-extrabold text-lg text-slate-900 font-mono">
              {summary.totalOrders || 0}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Completed bills</p>
          </div>
        </div>

        {/* 3. Cash Sales */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Cash Sales</span>
            <div className="p-1 rounded bg-emerald-50 text-emerald-700">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-extrabold text-lg text-emerald-900 font-mono">
              {formatMoney(cashAmount)}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Physical cash</p>
          </div>
        </div>

        {/* 4. Discounts */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Discounts</span>
            <div className="p-1 rounded bg-amber-50 text-amber-700">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-extrabold text-lg text-amber-950 font-mono">
              {formatMoney(summary.totalDiscount || 0)}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Applied reductions</p>
          </div>
        </div>

        {/* 5. Refunds */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Refunds</span>
            <div className="p-1 rounded bg-red-50 text-red-700">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-extrabold text-lg text-red-900 font-mono">
              {formatMoney(summary.totalRefundAmount || 0)}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.totalRefunds || 0} returned transactions</p>
          </div>
        </div>

        {/* 6. Register Status */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Register</span>
            <div className="p-1 rounded bg-slate-100 text-slate-700">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`inline-block font-bold text-xs uppercase px-2 py-0.5 rounded ${
                activeRegister
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {activeRegister ? 'Shift OPEN' : 'Shift CLOSED'}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              {activeRegister ? `Opened: ${formatMoney(activeRegister.opening_amount)}` : 'Click to open shift'}
            </p>
          </div>
        </div>
      </div>

      {/* MID SECTION: SALES TREND & PAYMENT BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly Sales Trend */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-800" />
              <h2 className="text-xs font-bold text-slate-900">Today's Hourly Sales Velocity</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">PKR (Rs.)</span>
          </div>

          {hourly.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              <span>No orders recorded yet today. First bill will display hourly trend.</span>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {hourly.map((h: any) => {
                const maxVal = Math.max(...hourly.map((x: any) => x.sales), 1);
                const pct = Math.round((h.sales / maxVal) * 100);

                return (
                  <div key={h.hour} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-mono text-slate-500 font-medium">{h.hour}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-800 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="w-24 text-right font-mono font-bold text-slate-800">
                      {formatMoney(h.sales)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-900">Payment Breakdown</h2>
            <Link href="/reports" className="text-[11px] text-emerald-800 hover:underline">
              Full Report
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No payments processed today</p>
            ) : (
              payments.map((p: any) => {
                const total = summary.grandSales || 1;
                const pct = Math.round((p.total_amount / total) * 100);

                return (
                  <div key={p.payment_method_id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{p.payment_method_name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatMoney(p.total_amount)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.payment_method_id === 'cash'
                            ? 'bg-emerald-700'
                            : p.payment_method_id === 'jazzcash'
                            ? 'bg-red-600'
                            : p.payment_method_id === 'easypaisa'
                            ? 'bg-emerald-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: TOP SELLING ITEMS & RECENT ORDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Selling Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-800" />
              <h2 className="text-xs font-bold text-slate-900">Top Selling Menu Items Today</h2>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No items sold yet today</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {topProducts.map((prod: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-mono font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{prod.product_name}</p>
                      <p className="text-[10px] text-slate-400">{prod.category_name || 'Nashta'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 font-mono">{formatMoney(prod.total_revenue)}</span>
                    <p className="text-[10px] text-slate-500 font-mono">{prod.quantity_sold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-bold text-slate-900">Recent Transactions</h2>
            </div>
            <Link href="/orders" className="text-[11px] text-emerald-800 hover:underline">
              View All Orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No completed orders yet today</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentOrders.map((o) => (
                <div key={o.id} className="py-2 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{o.receipt_number}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {o.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatTime(o.created_at)} • {o.items_count} items • {o.payment_methods_summary}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-900">{formatMoney(o.grand_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
