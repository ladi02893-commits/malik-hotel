'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Sliders,
  CreditCard,
  Printer,
  ShieldCheck,
  History,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { BusinessSettings, POSSettings, ReceiptSettings, PaymentMethod } from '@/types';
import { formatDateTime } from '@/lib/dates';

type SettingsTab = 'general' | 'pos' | 'payments' | 'receipts' | 'security' | 'audit';

export default function SettingsPage() {
  const {
    businessSettings,
    posSettings,
    receiptSettings,
    paymentMethods,
    updateSection,
    refreshSettings,
    isLoading: settingsLoading,
  } = useSettings();

  const { showToast } = usePOS();
  const { currentUser, profiles, refreshAuth, updateAdminPin } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Form states initialized from settings
  const [businessForm, setBusinessForm] = useState<BusinessSettings>(businessSettings);
  const [posForm, setPOSForm] = useState<POSSettings>(posSettings);
  const [receiptForm, setReceiptForm] = useState<ReceiptSettings>(receiptSettings);
  const [paymentMethodsForm, setPaymentMethodsForm] = useState<PaymentMethod[]>(paymentMethods);

  // Admin PIN update state
  const [newAdminPinInput, setNewAdminPinInput] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // User management state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'cashier'>('cashier');
  const [newUserPin, setNewUserPin] = useState('1234');

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('all');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when context finishes initial loading
  useEffect(() => {
    setBusinessForm(businessSettings);
    setPOSForm(posSettings);
    setReceiptForm(receiptSettings);
    setPaymentMethodsForm(paymentMethods);
  }, [businessSettings, posSettings, receiptSettings, paymentMethods]);

  // Load audit logs if audit tab selected
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const url = auditFilter === 'all' ? '/api/audit?limit=50' : `/api/audit?limit=50&action=${auditFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Audit fetch error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditFilter]);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSection('business', businessForm);
    setIsSaving(false);
    if (res.success) {
      showToast('Business details updated successfully', 'success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      showToast(res.error || 'Failed to update business settings', 'error');
    }
  };

  const handleSavePOS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSection('pos', posForm);
    setIsSaving(false);
    if (res.success) {
      showToast('POS feature settings updated successfully', 'success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      showToast(res.error || 'Failed to update POS settings', 'error');
    }
  };

  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSection('receipt', receiptForm);
    setIsSaving(false);
    if (res.success) {
      showToast('Receipt template updated successfully', 'success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      showToast(res.error || 'Failed to update receipt settings', 'error');
    }
  };

  const handleSavePayments = async () => {
    setIsSaving(true);
    const res = await updateSection('payments', paymentMethodsForm);
    setIsSaving(false);
    if (res.success) {
      showToast('Payment methods saved successfully', 'success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      showToast(res.error || 'Failed to save payment methods', 'error');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_profile',
          full_name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          pin_code: newUserPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Staff account created for ${newUserName}`, 'success');
        setShowAddUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPin('1234');
        await refreshAuth();
      } else {
        showToast(data.error || 'Failed to create staff account', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    }
  };

  const handleUpdateAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPinInput || newAdminPinInput.trim().length < 4) {
      showToast('Admin PIN kam az kam 4 digits ka hona chahiye', 'error');
      return;
    }
    setIsUpdatingPin(true);
    const res = await updateAdminPin(newAdminPinInput.trim());
    setIsUpdatingPin(false);
    if (res.success) {
      showToast('Master Admin PIN kamiyabi se update ho gaya!', 'success');
      setNewAdminPinInput('');
      await refreshAuth();
    } else {
      showToast(res.error || 'PIN update krne mein masla aya', 'error');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'pos', label: 'POS Features', icon: Sliders },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
    { id: 'receipts', label: 'Receipt Template', icon: Printer },
    { id: 'security', label: 'Security & Staff', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-slate-900">System & POS Settings</h1>
          <p className="text-xs text-slate-500">
            Configure business profile, operational flags, payments, thermal receipt layout, and security rules
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Changes applied live to POS</span>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-1 flex-shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                isActive
                  ? 'border-emerald-800 text-emerald-900 bg-emerald-50/40'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-800' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl">
        {/* ================= 1. GENERAL SETTINGS ================= */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveBusiness} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Business Profile</h2>
              <p className="text-xs text-slate-500">Official business information used across receipts and reporting</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={businessForm.phone}
                  onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Location / Address</label>
                <input
                  type="text"
                  required
                  value={businessForm.location}
                  onChange={(e) => setBusinessForm({ ...businessForm, location: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Code</label>
                <input
                  type="text"
                  disabled
                  value={businessForm.currency}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Fixed to PKR for Pakistani Nashta Point operations</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Display Symbol</label>
                <input
                  type="text"
                  value={businessForm.currency_symbol}
                  onChange={(e) => setBusinessForm({ ...businessForm, currency_symbol: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Display prefix in billing (e.g. Rs.)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
                <input
                  type="text"
                  disabled
                  value={businessForm.timezone}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Asia/Karachi (+05:00 PKT)</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save General Settings'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= 2. POS FEATURES & FLAGS ================= */}
        {activeTab === 'pos' && (
          <form onSubmit={handleSavePOS} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">POS Operational Flags</h2>
              <p className="text-xs text-slate-500">
                Directly toggles UI controls, discount rules, cash register enforcement, and taxes
              </p>
            </div>

            <div className="space-y-4">
              {/* Discounts Group */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Discounts System</h3>
                    <p className="text-[11px] text-slate-500">Allow cashiers to apply fixed or percentage discounts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posForm.enable_discounts}
                      onChange={(e) => setPOSForm({ ...posForm, enable_discounts: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-800"></div>
                  </label>
                </div>

                {posForm.enable_discounts && (
                  <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Max Cashier Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={posForm.max_cashier_discount_percent}
                        onChange={(e) =>
                          setPOSForm({ ...posForm, max_cashier_discount_percent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Discounts above this require supervisor PIN approval</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Require PIN Above (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={posForm.require_pin_above_percent}
                        onChange={(e) =>
                          setPOSForm({ ...posForm, require_pin_above_percent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Strict supervisor authorization threshold</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allow_fixed"
                        checked={posForm.allow_fixed_discount}
                        onChange={(e) => setPOSForm({ ...posForm, allow_fixed_discount: e.target.checked })}
                        className="rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <label htmlFor="allow_fixed" className="text-xs text-slate-700 font-medium">
                        Allow Fixed Rupee Discounts (e.g. Rs. 100 off)
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allow_item_disc"
                        checked={posForm.allow_item_discount}
                        onChange={(e) => setPOSForm({ ...posForm, allow_item_discount: e.target.checked })}
                        className="rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <label htmlFor="allow_item_desc" className="text-xs text-slate-700 font-medium">
                        Allow Per-Item Line Discounts
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Flow Controls */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <h3 className="text-xs font-bold text-slate-900">Billing & Cart Features</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posForm.enable_split_payment}
                      onChange={(e) => setPOSForm({ ...posForm, enable_split_payment: e.target.checked })}
                      className="rounded text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Enable Split Payment</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posForm.enable_hold_orders}
                      onChange={(e) => setPOSForm({ ...posForm, enable_hold_orders: e.target.checked })}
                      className="rounded text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Enable Hold & Resume Cart (F4)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posForm.enable_item_notes}
                      onChange={(e) => setPOSForm({ ...posForm, enable_item_notes: e.target.checked })}
                      className="rounded text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Enable Kitchen Notes (e.g. Mirch kam, Chai strong)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posForm.enable_addons}
                      onChange={(e) => setPOSForm({ ...posForm, enable_addons: e.target.checked })}
                      className="rounded text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Enable Product Extras & Add-ons (e.g. Extra Egg, Butter)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posForm.enable_rounding}
                      onChange={(e) => setPOSForm({ ...posForm, enable_rounding: e.target.checked })}
                      className="rounded text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Enable Rounding to nearest Rupee</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posForm.require_open_register}
                      onChange={(e) => setPOSForm({ ...posForm, require_open_register: e.target.checked })}
                      className="rounded text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Require Active Cash Register Shift before Sales</span>
                  </label>
                </div>
              </div>

              {/* Tax & Service Charge */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <h3 className="text-xs font-bold text-slate-900">Tax & Service Charges</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Enable Tax (GST/PRA)</span>
                      <input
                        type="checkbox"
                        checked={posForm.enable_tax}
                        onChange={(e) => setPOSForm({ ...posForm, enable_tax: e.target.checked })}
                        className="rounded text-emerald-800"
                      />
                    </div>
                    {posForm.enable_tax && (
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Tax Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={posForm.tax_rate_percent}
                          onChange={(e) =>
                            setPOSForm({ ...posForm, tax_rate_percent: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Enable Service Charge</span>
                      <input
                        type="checkbox"
                        checked={posForm.enable_service_charge}
                        onChange={(e) => setPOSForm({ ...posForm, enable_service_charge: e.target.checked })}
                        className="rounded text-emerald-800"
                      />
                    </div>
                    {posForm.enable_service_charge && (
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Service Charge (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={posForm.service_charge_percent}
                          onChange={(e) =>
                            setPOSForm({ ...posForm, service_charge_percent: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save POS Settings'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= 3. PAYMENT METHODS ================= */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Payment Methods Configuration</h2>
              <p className="text-xs text-slate-500">
                Disabled payment methods are instantly removed from the cashier checkout modal
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Payment Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Default Method</th>
                    <th className="p-3 text-center">Require Ref / Trx ID</th>
                    <th className="p-3 text-center">Sort Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentMethodsForm.map((pm, idx) => (
                    <tr key={pm.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-medium text-slate-900">
                        <input
                          type="text"
                          value={pm.name}
                          onChange={(e) => {
                            const updated = [...paymentMethodsForm];
                            updated[idx].name = e.target.value;
                            setPaymentMethodsForm(updated);
                          }}
                          className="px-2 py-1 rounded border border-slate-200 text-xs w-36 font-semibold"
                        />
                      </td>

                      <td className="p-3 text-slate-500 uppercase font-mono text-[11px]">{pm.type}</td>

                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={pm.is_active}
                          onChange={(e) => {
                            const updated = [...paymentMethodsForm];
                            updated[idx].is_active = e.target.checked;
                            setPaymentMethodsForm(updated);
                          }}
                          className="rounded text-emerald-800"
                        />
                      </td>

                      <td className="p-3 text-center">
                        <input
                          type="radio"
                          name="default_payment"
                          checked={pm.is_default}
                          onChange={() => {
                            const updated = paymentMethodsForm.map((p, i) => ({
                              ...p,
                              is_default: i === idx,
                            }));
                            setPaymentMethodsForm(updated);
                          }}
                          className="text-emerald-800"
                        />
                      </td>

                      <td className="p-3 text-center">
                        {pm.type !== 'cash' ? (
                          <input
                            type="checkbox"
                            checked={pm.require_reference}
                            onChange={(e) => {
                              const updated = [...paymentMethodsForm];
                              updated[idx].require_reference = e.target.checked;
                              setPaymentMethodsForm(updated);
                            }}
                            className="rounded text-emerald-800"
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={pm.sort_order}
                          onChange={(e) => {
                            const updated = [...paymentMethodsForm];
                            updated[idx].sort_order = parseInt(e.target.value, 10) || 0;
                            setPaymentMethodsForm(updated);
                          }}
                          className="w-16 px-2 py-1 rounded border border-slate-200 text-xs text-center font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSavePayments}
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Payment Methods'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 4. RECEIPT TEMPLATE ================= */}
        {activeTab === 'receipts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Settings Form */}
            <form onSubmit={handleSaveReceipt} className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">80mm Thermal Receipt Layout</h2>
                <p className="text-xs text-slate-500">Configure text header, contact details, and visibility flags</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Business Title</label>
                  <input
                    type="text"
                    required
                    value={receiptForm.business_name}
                    onChange={(e) => setReceiptForm({ ...receiptForm, business_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Address</label>
                    <input
                      type="text"
                      value={receiptForm.address}
                      onChange={(e) => setReceiptForm({ ...receiptForm, address: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Phone</label>
                    <input
                      type="text"
                      value={receiptForm.phone}
                      onChange={(e) => setReceiptForm({ ...receiptForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Prefix</label>
                    <input
                      type="text"
                      value={receiptForm.receipt_prefix}
                      onChange={(e) => setReceiptForm({ ...receiptForm, receipt_prefix: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Order Prefix</label>
                    <input
                      type="text"
                      value={receiptForm.order_prefix}
                      onChange={(e) => setReceiptForm({ ...receiptForm, order_prefix: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Refund Prefix</label>
                    <input
                      type="text"
                      value={receiptForm.refund_prefix}
                      onChange={(e) => setReceiptForm({ ...receiptForm, refund_prefix: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Header Welcome Note</label>
                  <input
                    type="text"
                    value={receiptForm.header_message}
                    onChange={(e) => setReceiptForm({ ...receiptForm, header_message: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Footer Greeting Note</label>
                  <input
                    type="text"
                    value={receiptForm.footer_message}
                    onChange={(e) => setReceiptForm({ ...receiptForm, footer_message: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                {/* Visibility toggles */}
                <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptForm.show_cashier}
                      onChange={(e) => setReceiptForm({ ...receiptForm, show_cashier: e.target.checked })}
                      className="rounded text-emerald-800"
                    />
                    <span>Show Cashier Name</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptForm.show_customer}
                      onChange={(e) => setReceiptForm({ ...receiptForm, show_customer: e.target.checked })}
                      className="rounded text-emerald-800"
                    />
                    <span>Show Customer Name</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptForm.show_payment_method}
                      onChange={(e) => setReceiptForm({ ...receiptForm, show_payment_method: e.target.checked })}
                      className="rounded text-emerald-800"
                    />
                    <span>Show Payment Method</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptForm.show_discount}
                      onChange={(e) => setReceiptForm({ ...receiptForm, show_discount: e.target.checked })}
                      className="rounded text-emerald-800"
                    />
                    <span>Show Discount Details</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptForm.auto_print}
                      onChange={(e) => setReceiptForm({ ...receiptForm, auto_print: e.target.checked })}
                      className="rounded text-emerald-800"
                    />
                    <span>Auto Trigger Browser Print</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Receipt Settings'}</span>
                </button>
              </div>
            </form>

            {/* Live 80mm Preview */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Live 80mm Receipt Preview
              </span>

              <div className="w-[72mm] bg-white border border-dashed border-slate-300 p-4 font-mono text-[11px] leading-tight text-slate-800 shadow-xs">
                {/* Header */}
                <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-400">
                  <p className="font-extrabold text-xs">{receiptForm.business_name || 'MALIK TASTY NASHTA POINT'}</p>
                  <p className="text-[10px]">{receiptForm.address || 'Vehari Road, Hasilpur'}</p>
                  {receiptForm.phone && <p className="text-[10px]">{receiptForm.phone}</p>}
                  {receiptForm.header_message && (
                    <p className="text-[9px] italic text-slate-500 pt-1">{receiptForm.header_message}</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="py-2 space-y-0.5 text-[10px] border-b border-dashed border-slate-400">
                  <div className="flex justify-between">
                    <span>Receipt:</span>
                    <span className="font-bold">{receiptForm.receipt_prefix}0001257</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>01-10-2026 11:20 AM</span>
                  </div>
                  {receiptForm.show_cashier && (
                    <div className="flex justify-between">
                      <span>Cashier:</span>
                      <span>Admin (Malik)</span>
                    </div>
                  )}
                  {receiptForm.show_customer && (
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span>Walk-in Customer</span>
                    </div>
                  )}
                </div>

                {/* Sample items */}
                <div className="py-2 space-y-1 text-[10px] border-b border-dashed border-slate-400">
                  <div className="flex justify-between">
                    <span>2 x Anda Paratha</span>
                    <span>Rs. 360</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 x Special Chana</span>
                    <span>Rs. 150</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2 x Karak Chai</span>
                    <span>Rs. 160</span>
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2 space-y-1 text-[10px] border-b border-dashed border-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. 670</span>
                  </div>
                  {receiptForm.show_discount && (
                    <div className="flex justify-between text-emerald-800">
                      <span>Discount:</span>
                      <span>- Rs. 20</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-slate-200">
                    <span>TOTAL:</span>
                    <span>Rs. 650</span>
                  </div>
                  {receiptForm.show_payment_method && (
                    <div className="pt-1 flex justify-between text-[9px] text-slate-600">
                      <span>Paid via Cash</span>
                      <span>Tendered: Rs. 1,000</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>Change Returned</span>
                    <span>Rs. 350</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-3 space-y-0.5">
                  <p className="font-semibold text-[10px]">{receiptForm.footer_message || 'Thank You - Visit Again!'}</p>
                  <p className="text-[8px] text-slate-400">Powered by Ammar Ahmad - 03260603565</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. SECURITY & STAFF ================= */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Security & Staff Management</h2>
              <p className="text-xs text-slate-500">
                Manage cashier profiles, authorization PIN codes, and sensitive operation policies
              </p>
            </div>

            {/* Approval Policies */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <h3 className="text-xs font-bold text-slate-900">Financial Authorization Rules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={posForm.require_void_approval}
                    onChange={(e) => setPOSForm({ ...posForm, require_void_approval: e.target.checked })}
                    className="rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Require Supervisor PIN for Voiding Orders</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={posForm.require_refund_approval}
                    onChange={(e) => setPOSForm({ ...posForm, require_refund_approval: e.target.checked })}
                    className="rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Require Supervisor PIN for Customer Refunds</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={posForm.require_refund_reason}
                    onChange={(e) => setPOSForm({ ...posForm, require_refund_reason: e.target.checked })}
                    className="rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Make Refund Reason Mandatory</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePOS}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors"
                >
                  Save Policy Rules
                </button>
              </div>
            </div>

            {/* Master Admin PIN Management */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Master Admin PIN Code</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Yeh PIN code Admin Portal, Products, Categories, Reports aur Settings ko unlock krne ke liye zaroori hai. (Default: 1234)
                </p>
              </div>

              <form onSubmit={handleUpdateAdminPin} className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="New 4-digit PIN (e.g. 1234)"
                  value={newAdminPinInput}
                  onChange={(e) => setNewAdminPinInput(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold w-48 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                <button
                  type="submit"
                  disabled={isUpdatingPin || newAdminPinInput.length < 4}
                  className="px-4 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-2xs"
                >
                  {isUpdatingPin ? 'Updating...' : 'Change Admin PIN'}
                </button>
              </form>
            </div>

            {/* Staff Profiles List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">User Profiles & Cashiers</h3>
                  <p className="text-[11px] text-slate-500">Authorized personnel who can sign in to the counter</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Staff Profile</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">PIN Code</th>
                      <th className="p-3 text-right">Current Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profiles.map((p) => {
                      const isSelf = currentUser?.id === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-semibold text-slate-900">{p.full_name}</td>
                          <td className="p-3 text-slate-500">{p.email}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                p.role === 'admin'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}
                            >
                              {p.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">
                            {p.pin_code ? '••••' : 'None'}
                          </td>
                          <td className="p-3 text-right">
                            {isSelf ? (
                              <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Active Logged In
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. AUDIT TRAIL ================= */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">System Audit Trail</h2>
                <p className="text-xs text-slate-500">
                  Immutable log of all financial checkouts, drawer movements, refunds, voids, and price modifications
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">All Actions</option>
                  <option value="SALE_COMPLETED">Sales Completed</option>
                  <option value="ORDER_VOIDED">Order Voids</option>
                  <option value="REFUND_ISSUED">Refunds Issued</option>
                  <option value="RECEIPT_REPRINT">Receipt Reprints</option>
                  <option value="REGISTER_OPENED">Register Opened</option>
                  <option value="REGISTER_CLOSED">Register Closed</option>
                  <option value="CASH_IN">Cash In</option>
                  <option value="CASH_OUT">Cash Out</option>
                  <option value="SETTINGS_UPDATED">Settings Updated</option>
                </select>

                <button
                  type="button"
                  onClick={fetchAuditLogs}
                  disabled={auditLoading}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                  title="Refresh Audit Log"
                >
                  <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin text-emerald-800' : ''}`} />
                </button>
              </div>
            </div>

            {auditLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading audit history...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No audit events found.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[500px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                          {log.user_name || 'System'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {log.entity_type} {log.entity_id ? `(#${String(log.entity_id).substring(0, 8)})` : ''}
                        </td>
                        <td className="p-3 text-slate-700 max-w-md truncate" title={log.description}>
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleCreateStaff}
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add New Staff Account</h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Tariq Mehmood"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Username</label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="tariq@maliknashta.pk"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none"
                >
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">4-digit PIN Code</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono tracking-widest text-center"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs"
              >
                Create Staff Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
