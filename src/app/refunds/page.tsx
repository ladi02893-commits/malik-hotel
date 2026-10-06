'use client';

import React, { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';
import { Refund } from '@/types';
import { RotateCcw, Search, Eye, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/refunds');
      const data = await res.json();
      if (data.success) {
        setRefunds(data.refunds || []);
      }
    } catch (e) {
      console.error('Failed to load refunds:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const filteredRefunds = refunds.filter((r: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      r.refund_number.toLowerCase().includes(q) ||
      r.original_receipt_number?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden select-none space-y-4 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-700" />
              <span>Refund Transactions</span>
            </h1>
            <p className="text-xs text-slate-500">Audit trail of customer returns and cash drawer deductions</p>
          </div>
        </div>

        <Link
          href="/orders"
          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5"
        >
          <span>Find Order to Refund</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search refund #, receipt #, reason..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {filteredRefunds.length} record{filteredRefunds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Refunds Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Refund #</th>
                <th className="py-2.5 px-3">Original Receipt #</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-right">Refund Amount</th>
                <th className="py-2.5 px-3">Processed By</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    Loading refunds...
                  </td>
                </tr>
              ) : filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No refund records found.
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-red-900">
                      {r.refund_number}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {r.original_receipt_number}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(r.created_at)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {r.reason}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {r.refund_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 capitalize text-slate-600 font-medium">
                      {r.refund_method}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700">
                      -{formatMoney(r.total_refund_amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.user_name_snapshot}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedRefund(r)}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="View item breakdown"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Details Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-red-50/60">
              <h3 className="font-bold text-red-950 text-xs">
                Refund Record: {selectedRefund.refund_number}
              </h3>
              <button onClick={() => setSelectedRefund(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Receipt:</span>
                  <span className="font-mono font-bold">{selectedRefund.order?.receipt_number || (selectedRefund as any).original_receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reason:</span>
                  <span className="font-semibold text-slate-900">{selectedRefund.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="capitalize font-medium">{selectedRefund.refund_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{formatDateTime(selectedRefund.created_at)}</span>
                </div>
              </div>

              {selectedRefund.items && selectedRefund.items.length > 0 && (
                <div>
                  <p className="font-bold text-slate-700 text-xs mb-1.5">Returned Items:</p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {selectedRefund.items.map((it: any) => (
                      <div key={it.id} className="p-2 flex justify-between items-center text-xs">
                        <span>{it.quantity} × {it.product_name_snapshot}</span>
                        <span className="font-mono font-bold text-red-700">-{formatMoney(it.refund_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                <span>Total Refunded:</span>
                <span className="font-mono text-red-700">-{formatMoney(selectedRefund.total_refund_amount)}</span>
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedRefund(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
