'use client';

import React, { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';
import {
  BarChart3,
  Calendar,
  Printer,
  FileDown,
  DollarSign,
  CreditCard,
  UtensilsCrossed,
  Tags,
  Landmark,
  Ban,
  ShieldCheck,
} from 'lucide-react';

export default function ReportsPage() {
  const [range, setRange] = useState<string>('today');
  const [activeTab, setActiveTab] = useState<'sales' | 'payments' | 'products' | 'categories' | 'register' | 'voids' | 'audit'>('sales');
  const [reportData, setReportData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      try {
        const [repRes, auditRes] = await Promise.all([
          fetch(`/api/reports?range=${range}`),
          fetch('/api/audit?limit=50'),
        ]);

        const rep = await repRes.json();
        const aud = await auditRes.json();

        if (rep.success) setReportData(rep);
        if (aud.success) setAuditLogs(aud.logs || []);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, [range]);

  const summary = reportData?.summary || {};
  const payments = reportData?.payments || [];
  const productSales = reportData?.productSales || [];
  const categorySales = reportData?.categorySales || [];
  const registerSessions = reportData?.registerSessions || [];
  const voidOrders = reportData?.voidOrders || [];

  // Export current active view to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    let filename = `report-${activeTab}-${range}.csv`;

    if (activeTab === 'sales') {
      csvContent += 'Metric,Amount (PKR)\n';
      csvContent += `Gross Sales,${summary.grossSales || 0}\n`;
      csvContent += `Total Discounts,${summary.totalDiscounts || 0}\n`;
      csvContent += `Total Refunds,${summary.totalRefundAmount || 0}\n`;
      csvContent += `Tax Amount,${summary.totalTax || 0}\n`;
      csvContent += `Service Charge,${summary.totalServiceCharge || 0}\n`;
      csvContent += `Net Sales,${summary.netSales || 0}\n`;
      csvContent += `Total Completed Orders,${summary.totalOrders || 0}\n`;
    } else if (activeTab === 'payments') {
      csvContent += 'Payment Method,Transactions,Total Amount (PKR)\n';
      payments.forEach((p: any) => {
        csvContent += `"${p.payment_method_name}",${p.transactions_count},${p.total_amount}\n`;
      });
    } else if (activeTab === 'products') {
      csvContent += 'Product Name,Category,Quantity Sold,Revenue (PKR)\n';
      productSales.forEach((p: any) => {
        csvContent += `"${p.product_name}","${p.category_name || ''}",${p.quantity_sold},${p.total_revenue}\n`;
      });
    } else if (activeTab === 'categories') {
      csvContent += 'Category,Items Sold,Revenue (PKR)\n';
      categorySales.forEach((c: any) => {
        csvContent += `"${c.category_name}",${c.total_items_sold},${c.total_revenue}\n`;
      });
    } else if (activeTab === 'register') {
      csvContent += 'Opened At,Closed At,Opening Float,Expected Cash,Actual Cash,Difference\n';
      registerSessions.forEach((rs: any) => {
        csvContent += `"${rs.opened_at}","${rs.closed_at || ''}",${rs.opening_amount},${rs.expected_amount || 0},${rs.actual_amount || 0},${rs.difference || 0}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden select-none space-y-4 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-800" />
            <span>Financial & Operational Reports</span>
          </h1>
          <p className="text-xs text-slate-500">Authoritative metrics calculated from InsForge PostgreSQL</p>
        </div>

        {/* Date Filter & Export */}
        <div className="flex items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {['today', 'yesterday', 'this_week', 'this_month'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                  range === r
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
            title="Export CSV"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 transition-colors"
            title="Print report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Report Module Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
        {[
          { id: 'sales', label: 'Sales Summary', icon: DollarSign },
          { id: 'payments', label: 'Payment Methods', icon: CreditCard },
          { id: 'products', label: 'Product Sales', icon: UtensilsCrossed },
          { id: 'categories', label: 'Category Sales', icon: Tags },
          { id: 'register', label: 'Drawer Shifts', icon: Landmark },
          { id: 'voids', label: 'Void Orders', icon: Ban },
          { id: 'audit', label: 'Immutable Audit Log', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-emerald-800 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Report Display Container */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Calculating report data...
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-5">
            {/* 1. SALES REPORT */}
            {activeTab === 'sales' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sales Accounting Breakdown</h3>
                  <p className="text-xs text-slate-500">Gross Sales − Discounts − Refunds = Net Sales</p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50/50">
                  <div className="p-3.5 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Gross Sales</span>
                    <span className="font-mono font-bold text-slate-900">{formatMoney(summary.grossSales || 0)}</span>
                  </div>
                  <div className="p-3.5 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Discounts Given</span>
                    <span className="font-mono font-bold text-emerald-800">-{formatMoney(summary.totalDiscounts || 0)}</span>
                  </div>
                  <div className="p-3.5 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Refunds Deducted</span>
                    <span className="font-mono font-bold text-red-700">-{formatMoney(summary.totalRefundAmount || 0)}</span>
                  </div>
                  {summary.totalTax > 0 && (
                    <div className="p-3.5 flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">Tax Collected</span>
                      <span className="font-mono font-bold text-slate-900">+{formatMoney(summary.totalTax || 0)}</span>
                    </div>
                  )}
                  {summary.totalServiceCharge > 0 && (
                    <div className="p-3.5 flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">Service Charges</span>
                      <span className="font-mono font-bold text-slate-900">+{formatMoney(summary.totalServiceCharge || 0)}</span>
                    </div>
                  )}
                  <div className="p-4 bg-emerald-50/80 flex justify-between items-baseline text-sm font-extrabold text-emerald-950">
                    <span>NET SALES</span>
                    <span className="font-mono text-xl">{formatMoney(summary.netSales || 0)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500">Completed Orders</span>
                    <p className="font-mono font-bold text-base text-slate-900 mt-1">{summary.totalOrders || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500">Refunded Orders</span>
                    <p className="font-mono font-bold text-base text-red-700 mt-1">{summary.totalRefunds || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PAYMENT METHODS REPORT */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Collection by Payment Channel</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-center">Transactions</th>
                        <th className="py-2.5 px-3 text-right">Total Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p: any) => (
                        <tr key={p.payment_method_id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{p.payment_method_name}</td>
                          <td className="py-2.5 px-3 uppercase text-[10px] text-slate-500 font-bold">{p.payment_method_type}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{p.transactions_count}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatMoney(p.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. PRODUCT SALES REPORT */}
            {activeTab === 'products' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Product Sales Volume & Revenue</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Quantity Sold</th>
                        <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productSales.map((ps: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{ps.product_name}</td>
                          <td className="py-2.5 px-3 text-slate-500">{ps.category_name || 'Nashta'}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{ps.quantity_sold}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900">{formatMoney(ps.total_revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. CATEGORY REPORT */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Revenue by Category</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Category Name</th>
                        <th className="py-2.5 px-3 text-center">Total Items Sold</th>
                        <th className="py-2.5 px-3 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categorySales.map((cs: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{cs.category_name}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{cs.total_items_sold}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatMoney(cs.total_revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. REGISTER SHIFTS REPORT */}
            {activeTab === 'register' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Cash Register Shift Reconciliation Records</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Opened</th>
                        <th className="py-2.5 px-3">Closed</th>
                        <th className="py-2.5 px-3">Cashier</th>
                        <th className="py-2.5 px-3 text-right">Opening Float</th>
                        <th className="py-2.5 px-3 text-right">Expected</th>
                        <th className="py-2.5 px-3 text-right">Actual Counted</th>
                        <th className="py-2.5 px-3 text-right">Difference</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registerSessions.map((rs: any) => (
                        <tr key={rs.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono">{formatDateTime(rs.opened_at)}</td>
                          <td className="py-2.5 px-3 font-mono">{rs.closed_at ? formatDateTime(rs.closed_at) : 'Active Shift'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{rs.user_name_snapshot}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatMoney(rs.opening_amount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">{rs.expected_amount !== null ? formatMoney(rs.expected_amount) : '-'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{rs.actual_amount !== null ? formatMoney(rs.actual_amount) : '-'}</td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${rs.difference === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                            {rs.difference !== null ? formatMoney(rs.difference) : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${rs.status === 'open' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {rs.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. VOID REPORT */}
            {activeTab === 'voids' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Voided Transactions Log</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Receipt #</th>
                        <th className="py-2.5 px-3">Voided At</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3">Void Reason</th>
                        <th className="py-2.5 px-3">Cashier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {voidOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-400">No voided transactions.</td>
                        </tr>
                      ) : (
                        voidOrders.map((vo: any) => (
                          <tr key={vo.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{vo.receipt_number}</td>
                            <td className="py-2.5 px-3 font-mono">{formatDateTime(vo.voided_at)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700">{formatMoney(vo.grand_total)}</td>
                            <td className="py-2.5 px-3 text-slate-800 font-medium">{vo.void_reason}</td>
                            <td className="py-2.5 px-3 text-slate-600">{vo.cashier_name_snapshot}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. IMMUTABLE AUDIT LOG */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                          <td className="py-2 px-3 font-bold text-emerald-950 uppercase">{log.action}</td>
                          <td className="py-2 px-3 font-sans text-xs text-slate-800">{log.description}</td>
                          <td className="py-2 px-3 text-slate-600">{log.user_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
