'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';
import { Order } from '@/types';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Ban,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export default function OrdersPage() {
  const { setCompletedOrderForReceipt, showToast } = usePOS();
  const { can, verifySupervisorPin, user } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [range, setRange] = useState<string>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Void Modal State
  const [orderToVoid, setOrderToVoid] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidPin, setVoidPin] = useState<string>('');
  const [voidError, setVoidError] = useState<string>('');
  const [isVoiding, setIsVoiding] = useState<boolean>(false);

  // Refund Modal State
  const [orderToRefund, setOrderToRefund] = useState<Order | null>(null);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundReason, setRefundReason] = useState<string>('Customer complaint');
  const [refundMethod, setRefundMethod] = useState<string>('cash');
  const [refundItemsQuantities, setRefundItemsQuantities] = useState<Record<string, number>>({});
  const [refundError, setRefundError] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', range);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (paymentFilter !== 'all') params.set('payment_method', paymentFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setIsLoading(false);
    }
  }, [range, statusFilter, paymentFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Open Full Detail Modal
  const handleOpenDetail = async (orderId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setSelectedOrder(data.order);
      }
    } catch (e) {
      console.error('Failed to fetch order detail:', e);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Reprint Receipt
  const handleReprint = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setCompletedOrderForReceipt({
          ...data.order,
          reprint_count: (data.order.reprint_count || 0) + 1,
        });
      }
    } catch (e) {
      console.error('Reprint failed:', e);
    }
  };

  // Handle Void
  const handleConfirmVoid = async () => {
    if (!orderToVoid) return;
    setVoidError('');

    if (!voidReason.trim()) {
      setVoidError('Void reason is mandatory.');
      return;
    }

    setIsVoiding(true);
    try {
      const res = await fetch(`/api/orders/${orderToVoid.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: voidReason.trim(),
          admin_pin: voidPin,
          cashier_name: user?.display_name || user?.full_name || 'Admin',
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Order ${orderToVoid.receipt_number} voided`, 'success');
        setOrderToVoid(null);
        setVoidReason('');
        setVoidPin('');
        fetchOrders();
        if (selectedOrder?.id === orderToVoid.id) {
          setSelectedOrder(null);
        }
      } else {
        setVoidError(data.error || 'Failed to void order.');
      }
    } catch (err: any) {
      setVoidError(err.message || 'Network error.');
    } finally {
      setIsVoiding(false);
    }
  };

  // Open Refund Modal for Order
  const handleOpenRefund = async (orderId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        const order = data.order;
        setOrderToRefund(order);
        setRefundType('full');
        setRefundReason('Customer complaint');
        setRefundMethod(order.payments?.[0]?.payment_method_id || 'cash');

        // Initialize partial items quantities to maximum remaining refundable
        const initialQty: Record<string, number> = {};
        order.items?.forEach((i: any) => {
          initialQty[i.id] = i.quantity - (i.refunded_quantity || 0);
        });
        setRefundItemsQuantities(initialQty);
      }
    } catch (e) {
      console.error('Failed to load order for refund:', e);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Handle Submit Refund
  const handleConfirmRefund = async () => {
    if (!orderToRefund) return;
    setRefundError('');

    if (!refundReason.trim()) {
      setRefundError('Refund reason is required.');
      return;
    }

    const payload: any = {
      order_id: orderToRefund.id,
      refund_type: refundType,
      refund_method: refundMethod,
      reason: refundReason.trim(),
      cashier_name: user?.display_name || user?.full_name || 'Admin',
      user_id: user?.id,
    };

    if (refundType === 'partial') {
      const itemsToRefund = Object.entries(refundItemsQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([order_item_id, quantity]) => ({
          order_item_id,
          quantity,
        }));

      if (itemsToRefund.length === 0) {
        setRefundError('Please select at least one item quantity to refund.');
        return;
      }
      payload.refund_items = itemsToRefund;
    }

    setIsRefunding(true);
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Refund ${data.refund?.refund_number || ''} completed successfully`, 'success');
        setOrderToRefund(null);
        fetchOrders();
        if (selectedOrder?.id === orderToRefund.id) {
          setSelectedOrder(null);
        }
      } else {
        setRefundError(data.error || 'Failed to process refund.');
      }
    } catch (err: any) {
      setRefundError(err.message || 'Network error.');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden select-none space-y-4 max-w-7xl mx-auto w-full">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-800" />
            <span>Order History & Receipt Records</span>
          </h1>
          <p className="text-xs text-slate-500">Track bills, print duplicates, process refunds and audit voids</p>
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
          {['today', 'yesterday', 'this_week', 'this_month', 'all'].map((r) => (
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
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt #, order #, customer..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="refunded">Fully Refunded</option>
            <option value="voided">Voided</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash Only</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          {orders.length} order{orders.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Orders Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-3">Receipt #</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">Total Due</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const statusColors: Record<string, string> = {
                    completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    partially_refunded: 'bg-amber-50 text-amber-900 border-amber-200',
                    refunded: 'bg-red-50 text-red-800 border-red-200',
                    voided: 'bg-slate-100 text-slate-600 border-slate-300 line-through',
                  };

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {order.receipt_number}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {order.customer_name_snapshot || <span className="text-slate-400">Walk-in</span>}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-medium">
                        {order.items_count}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatMoney(order.subtotal)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-800">
                        {order.discount_amount > 0 ? `-${formatMoney(order.discount_amount)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">
                        {formatMoney(order.grand_total)}
                      </td>
                      <td className="py-2 px-3 text-slate-600 capitalize">
                        {order.payment_methods_summary || 'Cash'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            statusColors[order.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View details */}
                          <button
                            onClick={() => handleOpenDetail(order.id)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title="View order details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Reprint receipt */}
                          <button
                            onClick={() => handleReprint(order.id)}
                            className="p-1 text-slate-500 hover:text-emerald-800 hover:bg-slate-100 rounded"
                            title="Print duplicate receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Refund action if not voided or fully refunded */}
                          {order.status !== 'voided' && order.status !== 'refunded' && can('refund.create') && (
                            <button
                              onClick={() => handleOpenRefund(order.id)}
                              className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded"
                              title="Process refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Void action if not already voided */}
                          {order.status !== 'voided' && can('order.void') && (
                            <button
                              onClick={() => {
                                setOrderToVoid(order);
                                setVoidReason('');
                                setVoidPin('');
                                setVoidError('');
                              }}
                              className="p-1 text-slate-400 hover:text-red-700 hover:bg-slate-100 rounded"
                              title="Void order transaction"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Receipt #{selectedOrder.receipt_number}</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {formatDateTime(selectedOrder.created_at)} • Order: {selectedOrder.order_number}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Status and Cashier Info */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Cashier: </span>
                  <span className="font-medium text-slate-800">{selectedOrder.cashier_name_snapshot}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Status: </span>
                  <span className="font-bold uppercase text-slate-900">{selectedOrder.status}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-slate-900">{item.product_name_snapshot}</p>
                          {item.addons?.map((a: any, idx: number) => (
                            <p key={idx} className="text-[10px] text-emerald-800">
                              + {a.addon_name_snapshot} ({formatMoney(a.line_total)})
                            </p>
                          ))}
                          {item.note && <p className="text-[10px] text-amber-800 italic">Note: {item.note}</p>}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-medium">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatMoney(item.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{formatMoney(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-mono">{formatMoney(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Discount:</span>
                    <span className="font-mono font-bold">- {formatMoney(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-900">{formatMoney(selectedOrder.grand_total)}</span>
                </div>
              </div>

              {/* Payments */}
              <div>
                <p className="font-bold text-xs text-slate-700 mb-1.5">Payment Details</p>
                <div className="space-y-1">
                  {selectedOrder.payments?.map((p) => (
                    <div key={p.id} className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200 capitalize">
                      <span>{p.payment_method_id}</span>
                      <span className="font-mono font-bold">{formatMoney(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refunds History if exists */}
              {selectedOrder.refunds && selectedOrder.refunds.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50/70 border border-red-200 space-y-1 text-xs">
                  <p className="font-bold text-red-900">Refunds History</p>
                  {selectedOrder.refunds.map((r: any) => (
                    <div key={r.id} className="flex justify-between text-red-800">
                      <span>{r.refund_number}: {r.reason}</span>
                      <span className="font-mono font-bold">-{formatMoney(r.total_refund_amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleReprint(selectedOrder.id)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Reprint Receipt</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. VOID ORDER CONFIRMATION MODAL */}
      {orderToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-red-50/60">
              <h3 className="font-bold text-red-900 text-xs flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-red-700" />
                <span>Void Receipt {orderToVoid.receipt_number}?</span>
              </h3>
              <button onClick={() => setOrderToVoid(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                This transaction will remain permanently in audit history. If cash was taken, it will reverse the cash movement in the drawer.
              </p>

              {voidError && (
                <div className="p-2 rounded bg-red-50 border border-red-200 text-red-900">
                  {voidError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Void Reason <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Cashier mistake / Duplicate order..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisor PIN (Default 1234)
                </label>
                <input
                  type="password"
                  value={voidPin}
                  onChange={(e) => setVoidPin(e.target.value)}
                  placeholder="Enter 4-digit PIN..."
                  maxLength={6}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setOrderToVoid(null)}
                disabled={isVoiding}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={isVoiding}
                className="px-4 py-1.5 text-xs font-bold bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isVoiding ? 'Voiding...' : 'Void Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REFUND MODAL */}
      {orderToRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Process Refund: {orderToRefund.receipt_number}
                </h3>
              </div>
              <button onClick={() => setOrderToRefund(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {refundError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-900">
                  {refundError}
                </div>
              )}

              {/* Refund Type Toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg font-semibold text-center">
                <button
                  type="button"
                  onClick={() => setRefundType('full')}
                  className={`py-1.5 rounded-md ${
                    refundType === 'full' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Full Refund ({formatMoney(orderToRefund.grand_total)})
                </button>
                <button
                  type="button"
                  onClick={() => setRefundType('partial')}
                  className={`py-1.5 rounded-md ${
                    refundType === 'partial' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Partial Item Refund
                </button>
              </div>

              {/* Partial Items Selection */}
              {refundType === 'partial' && (
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="font-bold text-slate-700">Select Quantities to Refund:</p>
                  <div className="space-y-2">
                    {orderToRefund.items?.map((item) => {
                      const maxQty = item.quantity - (item.refunded_quantity || 0);
                      const currentVal = refundItemsQuantities[item.id] || 0;

                      return (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200 last:border-b-0">
                          <div>
                            <p className="font-semibold text-slate-900">{item.product_name_snapshot}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Unit: {formatMoney(item.unit_price)} • Max: {maxQty}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={maxQty}
                              value={currentVal}
                              onChange={(e) =>
                                setRefundItemsQuantities({
                                  ...refundItemsQuantities,
                                  [item.id]: Math.min(maxQty, Math.max(0, parseInt(e.target.value, 10) || 0)),
                                })
                              }
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-center font-bold"
                            />
                            <span className="text-[11px] text-slate-500 font-mono">
                              = {formatMoney(item.unit_price * currentVal)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Refund Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Refund Method
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                >
                  <option value="cash">Cash (Drawer Deduct)</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Refund Reason <span className="text-red-600">*</span>
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none mb-1.5"
                >
                  <option value="Customer complaint">Customer complaint</option>
                  <option value="Wrong item served">Wrong item served</option>
                  <option value="Duplicate charge">Duplicate charge</option>
                  <option value="Product unavailable">Product unavailable</option>
                  <option value="Staff error">Staff error</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Additional details regarding refund..."
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setOrderToRefund(null)}
                disabled={isRefunding}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRefund}
                disabled={isRefunding}
                className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                {isRefunding ? 'Refunding...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
