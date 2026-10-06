'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePOS } from '@/context/POSContext';
import { formatMoney } from '@/lib/money';
import { Vendor } from '@/types';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Tag,
  CreditCard,
  FileText,
  DollarSign,
  ArrowDownLeft,
  X,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowUpRight,
} from 'lucide-react';

export default function VendorsPage() {
  const { user } = useAuth();
  const { showToast, activeRegister, refreshRegister } = usePOS();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [totalPayables, setTotalPayables] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedVendorForPay, setSelectedVendorForPay] = useState<Vendor | null>(null);

  // Ledger / Khata Drawer state
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState<Vendor | null>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Form states for Add Vendor
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    category: 'General',
    address: '',
    opening_balance: '0',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form states for Record Payment
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [deductDrawer, setDeductDrawer] = useState(false);

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/vendors', window.location.origin);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      if (categoryFilter !== 'all') url.searchParams.set('category', categoryFilter);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setVendors(data.vendors || []);
        setTotalPayables(data.totalPayables || 0);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [categoryFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Open ledger for a vendor
  const handleOpenLedger = async (vendor: Vendor) => {
    setSelectedVendorForLedger(vendor);
    setIsLoadingLedger(true);
    try {
      const res = await fetch(`/api/vendors/${vendor.id}`);
      const data = await res.json();
      if (data.success) {
        setLedgerData(data.ledger || []);
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  // Add Vendor submission
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim()) {
      setFormError('Vendor name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setIsAddModalOpen(false);
        setFormData({ name: '', phone: '', category: 'General', address: '', opening_balance: '0' });
        fetchVendors();
      } else {
        setFormError(data.error || 'Failed to save vendor');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error saving vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record Payment submission
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorForPay) return;
    const num = parseFloat(payAmount);
    if (isNaN(num) || num <= 0) {
      setFormError('Please enter an amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/vendor-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: selectedVendorForPay.id,
          amount: num,
          payment_method: payMethod,
          reference_number: payReference,
          notes: payNotes,
          deduct_from_register: deductDrawer,
          cashier_name: user?.display_name || user?.full_name || 'Admin',
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Paid Rs. ${num} to ${selectedVendorForPay.name}`, 'success');
        setIsPayModalOpen(false);
        setSelectedVendorForPay(null);
        setPayAmount('');
        setPayReference('');
        setPayNotes('');
        setDeductDrawer(false);
        fetchVendors();
        if (deductDrawer) refreshRegister();
      } else {
        setFormError(data.error || 'Payment failed');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['all', 'Flour', 'Oil & Ghee', 'Dairy', 'Poultry', 'Pulses', 'Spices', 'Packaging', 'General'];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 bg-slate-50 gap-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Vendors & Suppliers (Khata)</h1>
              <p className="text-xs text-slate-500">Kacha maal suppliers ki directory aur unka len-den / baqaya hisaab</p>
            </div>
          </div>
        </div>

        {/* Quick Metrics & Add Button */}
        <div className="flex items-center gap-3">
          <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-right">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Total Payable (Kul Baqaya)</p>
            <p className="text-lg font-black text-red-900">{formatMoney(totalPayables)}</p>
          </div>

          <button
            onClick={() => {
              setFormData({ name: '', phone: '', category: 'General', address: '', opening_balance: '0' });
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Vendor</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vendor name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Vendors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            <span>Loading vendors directory...</span>
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No vendors found. Click "+ Add New Vendor" to register your first supplier.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Contact & Location</th>
                  <th className="py-3 px-4 text-right">Total Purchased</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Current Baqaya (Payable)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((vendor) => {
                  const hasDue = vendor.current_balance > 0;
                  return (
                    <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {vendor.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {vendor.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="space-y-0.5">
                          {vendor.phone && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{vendor.phone}</span>
                            </div>
                          )}
                          {vendor.address && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[200px]">{vendor.address}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        {formatMoney(vendor.total_purchases_amount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-800">
                        {formatMoney(vendor.total_payments_amount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        {hasDue ? (
                          <span className="inline-block bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded font-black text-xs">
                            {formatMoney(vendor.current_balance)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-xs">Rs. 0 (Nil)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenLedger(vendor)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="View Khata Statement"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Khata</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedVendorForPay(vendor);
                              setPayAmount(vendor.current_balance > 0 ? String(vendor.current_balance) : '');
                              setFormError('');
                              setIsPayModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Pay this vendor"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD NEW VENDOR ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-800" />
                Add New Vendor / Supplier
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madina Atta Chakki, Haji Ghee Traders"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Material Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                  >
                    <option value="Flour">Flour / Atta</option>
                    <option value="Oil & Ghee">Oil & Ghee</option>
                    <option value="Dairy">Dairy (Milk & Dahi)</option>
                    <option value="Poultry">Poultry / Eggs</option>
                    <option value="Pulses">Pulses / Chana</option>
                    <option value="Spices">Spices / Masalay</option>
                    <option value="Packaging">Packaging</option>
                    <option value="General">General Merchant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Address / Mandi Location</label>
                <input
                  type="text"
                  placeholder="e.g. Ghalla Mandi, Hasilpur"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Previous / Opening Udhaar (Rs.)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                />
                <p className="text-[10px] text-slate-400 mt-1">Agar is vendor ka pehle se koi udhaar baqi hai to likhein.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD PAYMENT TO VENDOR ================= */}
      {isPayModalOpen && selectedVendorForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Make Payment to Vendor</h3>
                <p className="text-[11px] text-slate-500">{selectedVendorForPay.name}</p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Current Payable (Dena Baqi):</span>
                <span className="font-black text-red-900 text-sm">{formatMoney(selectedVendorForPay.current_balance)}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  placeholder="Enter amount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-base focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                  >
                    <option value="cash">Cash (Naqad)</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ref / Cheque #</label>
                  <input
                    type="text"
                    placeholder="Optional reference"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Deduct from Cash Drawer Toggle */}
              {payMethod === 'cash' && activeRegister && (
                <label className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductDrawer}
                    onChange={(e) => setDeductDrawer(e.target.checked)}
                    className="w-4 h-4 text-emerald-800 rounded border-slate-300"
                  />
                  <div className="text-[11px]">
                    <span className="font-bold text-amber-900">Deduct from Cash Register Drawer</span>
                    <p className="text-amber-800 text-[10px]">Is payment ko current cash drawer kharchon (CASH_OUT) mein record karein.</p>
                  </div>
                </label>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Paid for last week's ghee supply"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DRAWER: VENDOR KHATA STATEMENT ================= */}
      {selectedVendorForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-2xs select-none">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vendor Khata Statement</span>
                <h2 className="text-base font-bold text-slate-900">{selectedVendorForLedger.name}</h2>
                <p className="text-xs text-slate-500">Phone: {selectedVendorForLedger.phone || 'N/A'} • {selectedVendorForLedger.category}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Current Payable</p>
                  <p className="text-base font-black text-red-800">{formatMoney(selectedVendorForLedger.current_balance)}</p>
                </div>

                <button
                  onClick={() => setSelectedVendorForLedger(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Statement Table */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingLedger ? (
                <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
                  <span>Loading khata statement...</span>
                </div>
              ) : ledgerData.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No purchases or payment entries found for this vendor yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Bill / Ref #</th>
                      <th className="py-2.5 px-3 text-right">Bill Total (Credit)</th>
                      <th className="py-2.5 px-3 text-right">Paid (Debit)</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerData.map((item, idx) => {
                      const isPurchase = item.type === 'PURCHASE';
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">{item.date}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isPurchase
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-medium text-slate-800">{item.ref_number}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800">
                            {item.credit > 0 ? formatMoney(item.credit) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-800">
                            {item.paid > 0 ? formatMoney(item.paid) : '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px] truncate max-w-[150px]">
                            {item.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedVendorForPay(selectedVendorForLedger);
                  setPayAmount(selectedVendorForLedger.current_balance > 0 ? String(selectedVendorForLedger.current_balance) : '');
                  setIsPayModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Make Payment to Vendor</span>
              </button>

              <button
                onClick={() => setSelectedVendorForLedger(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
