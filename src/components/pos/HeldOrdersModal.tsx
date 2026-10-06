'use client';

import React, { useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import { formatMoney } from '@/lib/money';
import { formatTime } from '@/lib/dates';
import { HeldOrder } from '@/types';
import { X, Clock, PlayCircle, Trash2, User } from 'lucide-react';

export function HeldOrdersModal() {
  const { isHeldListModalOpen, setIsHeldListModalOpen, resumeOrder } = usePOS();
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    if (isHeldListModalOpen) {
      fetchHeldOrders();
    }
  }, [isHeldListModalOpen]);

  if (!isHeldListModalOpen) return null;

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/held-orders?id=${id}`, { method: 'DELETE' });
      fetchHeldOrders();
    } catch (e) {
      console.error('Failed to delete held order:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">Held Orders</h3>
          </div>
          <button
            onClick={() => setIsHeldListModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Body */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          {isLoading ? (
            <p className="text-center py-8 text-xs text-slate-400">Loading held orders...</p>
          ) : heldOrders.length === 0 ? (
            <div className="text-center py-10 select-none">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No held orders</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Orders placed on hold will appear here</p>
            </div>
          ) : (
            heldOrders.map((ho) => (
              <div key={ho.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
                      {ho.hold_number}
                    </span>
                    {ho.customer_name && (
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {ho.customer_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>{ho.items_count || ho.cart_payload?.items?.length || 0} items</span>
                    <span>•</span>
                    <span className="text-emerald-800 font-semibold">{formatMoney(ho.grand_total)}</span>
                    <span>•</span>
                    <span>{formatTime(ho.created_at)}</span>
                  </div>

                  {ho.note && (
                    <p className="text-[11px] text-slate-600 italic">Note: {ho.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(ho.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                    title="Delete held order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => resumeOrder(ho.id)}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={() => setIsHeldListModalOpen(false)}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
