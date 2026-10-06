'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePOS } from '@/context/POSContext';
import { formatMoney } from '@/lib/money';
import { PurchaseInvoice, Vendor, RawMaterial } from '@/types';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  CreditCard,
  FileText,
  DollarSign,
  X,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface PurchaseItemRow {
  raw_material_id?: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const { showToast, activeRegister, refreshRegister } = usePOS();

  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [summary, setSummary] = useState({ totalPurchases: 0, totalPaid: 0, totalUnpaid: 0, invoicesCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [rangeFilter, setRangeFilter] = useState('this_month');
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<PurchaseInvoice | null>(null);

  // Form states
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorNameInput, setVendorNameInput] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PurchaseItemRow[]>([
    { item_name: '', quantity: 1, unit: 'kg', unit_price: 0, line_total: 0 },
  ]);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deductDrawer, setDeductDrawer] = useState(false);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch purchases list
  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/purchases', window.location.origin);
      url.searchParams.set('range', rangeFilter);
      if (vendorFilter !== 'all') url.searchParams.set('vendor_id', vendorFilter);
      if (searchQuery) url.searchParams.set('search', searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setPurchases(data.purchases || []);
        setSummary(data.summary || { totalPurchases: 0, totalPaid: 0, totalUnpaid: 0, invoicesCount: 0 });
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch vendors and raw materials catalogues for dropdowns
  const fetchAuxData = async () => {
    try {
      const [vRes, mRes] = await Promise.all([
        fetch('/api/vendors').then((r) => r.json()),
        fetch('/api/raw-materials').then((r) => r.json()),
      ]);
      if (vRes.success) setVendors(vRes.vendors || []);
      if (mRes.success) setRawMaterials(mRes.rawMaterials || []);
    } catch (e) {
      console.error('Failed to fetch aux data:', e);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [rangeFilter, vendorFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchases();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle vendor select in purchase form
  const handleSelectVendor = (vId: string) => {
    setSelectedVendorId(vId);
    const found = vendors.find((v) => v.id === vId);
    if (found) {
      setVendorNameInput(found.name);
    }
  };

  // Row item actions
  const handleItemMaterialChange = (idx: number, rawMaterialId: string) => {
    const mat = rawMaterials.find((m) => m.id === rawMaterialId);
    const updated = [...items];
    if (mat) {
      updated[idx] = {
        ...updated[idx],
        raw_material_id: mat.id,
        item_name: mat.name,
        unit: mat.unit,
        unit_price: mat.default_price,
        line_total: Number((updated[idx].quantity * mat.default_price).toFixed(2)),
      };
    }
    setItems(updated);
    recalculatePaidDefault(updated);
  };

  const handleItemFieldChange = (idx: number, field: 'item_name' | 'quantity' | 'unit' | 'unit_price', val: any) => {
    const updated = [...items];
    const row = { ...updated[idx], [field]: val };
    const q = parseFloat(String(row.quantity)) || 0;
    const p = parseFloat(String(row.unit_price)) || 0;
    row.line_total = Number((q * p).toFixed(2));
    updated[idx] = row;
    setItems(updated);
    recalculatePaidDefault(updated);
  };

  const handleAddItemRow = () => {
    setItems([...items, { item_name: '', quantity: 1, unit: 'kg', unit_price: 0, line_total: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    recalculatePaidDefault(updated);
  };

  const recalculatePaidDefault = (currentItems: PurchaseItemRow[]) => {
    const sub = currentItems.reduce((acc, row) => acc + (row.line_total || 0), 0);
    const disc = parseFloat(discountAmount) || 0;
    const net = Math.max(0, sub - disc);
    // By default suggest full paid
    setPaidAmount(String(net));
  };

  const currentSubtotal = items.reduce((acc, row) => acc + (row.line_total || 0), 0);
  const currentNetTotal = Math.max(0, currentSubtotal - (parseFloat(discountAmount) || 0));
  const currentPaid = Math.min(currentNetTotal, Math.max(0, parseFloat(paidAmount) || 0));
  const currentBalance = Math.max(0, currentNetTotal - currentPaid);

  // Submit new purchase bill
  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!vendorNameInput.trim()) {
      setFormError('Please select or write a vendor name.');
      return;
    }

    const validItems = items.filter((i) => i.item_name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one item with valid quantity and name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: selectedVendorId || undefined,
          vendor_name: vendorNameInput.trim(),
          invoice_date: invoiceDate,
          items: validItems,
          discount_amount: parseFloat(discountAmount) || 0,
          paid_amount: currentPaid,
          payment_method: paymentMethod,
          deduct_from_register: deductDrawer,
          notes,
          cashier_name: user?.display_name || user?.full_name || 'Admin',
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Purchase bill ${data.invoice.invoice_number} saved!`, 'success');
        setIsCreateModalOpen(false);
        // Reset form
        setSelectedVendorId('');
        setVendorNameInput('');
        setItems([{ item_name: '', quantity: 1, unit: 'kg', unit_price: 0, line_total: 0 }]);
        setDiscountAmount('0');
        setPaidAmount('0');
        setNotes('');
        setDeductDrawer(false);
        fetchPurchases();
        fetchAuxData();
        if (deductDrawer) refreshRegister();
      } else {
        setFormError(data.error || 'Failed to save purchase bill.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error saving purchase bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 bg-slate-50 gap-6">
      {/* 1. Header & Summary Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Maal Purchases (Kacha Maal Entry)</h1>
              <p className="text-xs text-slate-500">Roozana ata, ghee, chana, doodh, anday waghera ki delivery bills</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record New Purchase (Maal Bill)</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Purchases</p>
          <p className="text-xl font-black text-slate-900 mt-1">{formatMoney(summary.totalPurchases)}</p>
          <span className="text-[11px] text-slate-500">{summary.invoicesCount} purchase bills</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Paid Amount (Naqad / Cash)</p>
          <p className="text-xl font-black text-emerald-800 mt-1">{formatMoney(summary.totalPaid)}</p>
          <span className="text-[11px] text-emerald-600">Cleared payments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Unpaid / Udhaar (Credit)</p>
          <p className="text-xl font-black text-red-900 mt-1">{formatMoney(summary.totalUnpaid)}</p>
          <span className="text-[11px] text-red-600 font-semibold">Vendors ka dena baqi</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Vendors</p>
          <p className="text-xl font-black text-slate-900 mt-1">{vendors.length}</p>
          <span className="text-[11px] text-slate-500">Active suppliers</span>
        </div>
      </div>

      {/* 3. Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Range tabs */}
          {['today', 'yesterday', 'this_week', 'this_month', 'all'].map((r) => (
            <button
              key={r}
              onClick={() => setRangeFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                rangeFilter === r
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Vendor dropdown filter */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="all">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bill #, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* 4. Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            <span>Loading purchases history...</span>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No purchase bills recorded for this period. Click "+ Record New Purchase" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance (Udhaar)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((inv) => {
                  const isCredit = inv.payment_status === 'credit';
                  const isPartial = inv.payment_status === 'partial';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {inv.invoice_date}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {inv.vendor_name_snapshot}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {inv.items?.map((i: any) => `${i.quantity} ${i.unit} ${i.item_name_snapshot}`).join(', ') || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {formatMoney(inv.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                        {formatMoney(inv.paid_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        {inv.balance_amount > 0 ? (
                          <span className="text-red-800 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[11px]">
                            {formatMoney(inv.balance_amount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Rs. 0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isCredit
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : isPartial
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedInvoiceForView(inv)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                          title="View Invoice Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: RECORD NEW PURCHASE BILL ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-800" />
                Record Raw Material Purchase (Maal Entry)
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Vendor & Date selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Select or Type Vendor / Supplier *</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedVendorId}
                      onChange={(e) => handleSelectVendor(e.target.value)}
                      className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                    >
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.category})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      required
                      placeholder="Or enter vendor name"
                      value={vendorNameInput}
                      onChange={(e) => setVendorNameInput(e.target.value)}
                      className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Items Line Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Purchase Items (Maal List)</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100 p-2 space-y-2">
                  {items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {/* Preset Raw Material dropdown */}
                      <select
                        value={row.raw_material_id || ''}
                        onChange={(e) => handleItemMaterialChange(idx, e.target.value)}
                        className="w-44 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs"
                      >
                        <option value="">-- Quick Pick Raw Material --</option>
                        {rawMaterials.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {rm.name}
                          </option>
                        ))}
                      </select>

                      {/* Item Name */}
                      <input
                        type="text"
                        placeholder="Item name (e.g. Chakki Atta)"
                        value={row.item_name}
                        onChange={(e) => handleItemFieldChange(idx, 'item_name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs focus:outline-none focus:border-emerald-700"
                      />

                      {/* Quantity */}
                      <input
                        type="number"
                        placeholder="Qty"
                        step="0.5"
                        min="0.1"
                        value={row.quantity}
                        onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs text-center"
                      />

                      {/* Unit */}
                      <input
                        type="text"
                        placeholder="Unit (kg/tin)"
                        value={row.unit}
                        onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                        className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs text-center"
                      />

                      {/* Unit Price */}
                      <input
                        type="number"
                        placeholder="Rate"
                        min="0"
                        value={row.unit_price || ''}
                        onChange={(e) => handleItemFieldChange(idx, 'unit_price', e.target.value)}
                        className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs text-right"
                      />

                      {/* Line Total */}
                      <div className="w-24 text-right font-bold text-slate-900 pr-1">
                        Rs. {row.line_total}
                      </div>

                      {/* Delete row */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-300 hover:text-red-600 disabled:opacity-30 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculations & Payment fields */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Subtotal:</span>
                  <span className="font-bold">{formatMoney(currentSubtotal)}</span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <span className="text-slate-700">Discount on bill:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountAmount}
                    onChange={(e) => {
                      setDiscountAmount(e.target.value);
                      const d = parseFloat(e.target.value) || 0;
                      setPaidAmount(String(Math.max(0, currentSubtotal - d)));
                    }}
                    className="w-32 px-2.5 py-1 bg-white border border-slate-200 rounded text-right font-medium"
                  />
                </div>

                <div className="flex justify-between items-center font-black text-slate-900 text-sm border-t border-slate-200 pt-2">
                  <span>Net Total Amount:</span>
                  <span>{formatMoney(currentNetTotal)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cash / Amount Paid Now (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      max={currentNetTotal}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-emerald-700"
                    >
                      <option value="cash">Cash (Naqad)</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="credit">Full Udhaar (Credit)</option>
                    </select>
                  </div>
                </div>

                {/* Remaining Balance Indicator */}
                <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-600 font-semibold">Remaining Udhaar (Added to Vendor Khata):</span>
                  <span className={`font-black text-sm ${currentBalance > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                    {formatMoney(currentBalance)}
                  </span>
                </div>

                {/* Deduct from drawer option */}
                {paymentMethod === 'cash' && currentPaid > 0 && activeRegister && (
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deductDrawer}
                      onChange={(e) => setDeductDrawer(e.target.checked)}
                      className="w-4 h-4 text-emerald-800 rounded"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-amber-900">Deduct Rs. {currentPaid} from Cash Drawer Float</span>
                      <p className="text-amber-800 text-[10px]">Is cash payment ko register drawer kharchay (CASH_OUT) mein add karein.</p>
                    </div>
                  </label>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Optional delivery notes, vehicle number, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Purchase Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: INVOICE DETAIL VIEW ================= */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purchase Bill</span>
                <h3 className="font-bold text-slate-900 text-sm">{selectedInvoiceForView.invoice_number}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoiceForView(null)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Vendor</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedInvoiceForView.vendor_name_snapshot}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Date</p>
                  <p className="font-bold text-slate-900">{selectedInvoiceForView.invoice_date}</p>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoiceForView.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.item_name_snapshot}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{item.quantity} {item.unit}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{formatMoney(item.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatMoney(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatMoney(selectedInvoiceForView.subtotal)}</span>
                </div>
                {selectedInvoiceForView.discount_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Discount:</span>
                    <span>- {formatMoney(selectedInvoiceForView.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>{formatMoney(selectedInvoiceForView.total_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-800">
                  <span>Paid:</span>
                  <span>{formatMoney(selectedInvoiceForView.paid_amount)}</span>
                </div>
                {selectedInvoiceForView.balance_amount > 0 && (
                  <div className="flex justify-between font-bold text-red-800">
                    <span>Balance (Udhaar):</span>
                    <span>{formatMoney(selectedInvoiceForView.balance_amount)}</span>
                  </div>
                )}
              </div>

              {selectedInvoiceForView.notes && (
                <div className="text-slate-500 italic text-[11px]">
                  Note: {selectedInvoiceForView.notes}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedInvoiceForView(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
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
