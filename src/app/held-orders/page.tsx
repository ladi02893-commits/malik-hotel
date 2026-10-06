'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePOS } from '@/context/POSContext';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';
import { HeldOrder } from '@/types';
import { Clock, PlayCircle, Trash2, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function HeldOrdersPage() {
  const router = useRouter();
  const { resumeOrder, showToast } = usePOS();
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHeldOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/held-orders');
      const data = await res.json();
      if (data.success) {
        setHeldOrders(data.heldOrders || []);
      }
    } catch (e) {
      console.error('Failed to load held orders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHeldOrders();
  }, []);

  const handleResume = async (id: string) => {
    const res = await resumeOrder(id);
    if (res.success) {
      router.push('/pos');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/held-orders?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Held order deleted', 'info');
        fetchHeldOrders();
      }
    } catch (e) {
      console.error('Failed to delete held order:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden select-none space-y-4 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span>Held Orders</span>
            </h1>
            <p className="text-xs text-slate-500">Unpaid carts paused during counter rush</p>
          </div>
        </div>

        <span className="text-xs font-mono font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          {heldOrders.length} active hold{heldOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Held Orders List */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Loading held orders...
          </div>
        ) : heldOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No held orders found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Press F4 in POS billing to place an order on hold</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto divide-y divide-slate-100">
            {heldOrders.map((ho) => (
              <div key={ho.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                      {ho.hold_number}
                    </span>
                    {ho.customer_name ? (
                      <span className="font-semibold text-xs text-slate-800 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {ho.customer_name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Walk-in</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="font-bold text-slate-800 text-sm">{formatMoney(ho.grand_total)}</span>
                    <span>•</span>
                    <span>{ho.items_count || ho.cart_payload?.items?.length || 0} items</span>
                    <span>•</span>
                    <span>Held: {formatDateTime(ho.created_at)}</span>
                    <span>•</span>
                    <span>Cashier: {ho.cashier_name_snapshot}</span>
                  </div>

                  {ho.note && (
                    <p className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block">
                      Note: {ho.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(ho.id)}
                    className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                    title="Cancel held order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleResume(ho.id)}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Resume Order</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
