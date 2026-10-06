'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BusinessSettings, POSSettings, ReceiptSettings, PaymentMethod } from '@/types';

interface SettingsContextType {
  businessSettings: BusinessSettings;
  posSettings: POSSettings;
  receiptSettings: ReceiptSettings;
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSection: (section: 'business' | 'pos' | 'receipt' | 'payments', data: any) => Promise<{ success: boolean; error?: string }>;
}

const defaultBusiness: BusinessSettings = {
  id: 'default',
  business_name: 'Malik Tasty Nashta Point',
  location: 'Vehari Road, Hasilpur, Punjab, Pakistan',
  phone: '0300-1234567',
  currency: 'PKR',
  currency_symbol: 'Rs.',
  timezone: 'Asia/Karachi',
  is_setup_completed: true,
  updated_at: new Date().toISOString(),
};

const defaultPOS: POSSettings = {
  id: 'default',
  enable_discounts: true,
  max_cashier_discount_percent: 15,
  require_pin_above_percent: 20,
  allow_fixed_discount: true,
  allow_item_discount: true,
  enable_split_payment: true,
  enable_split_bill: false,
  enable_hold_orders: true,
  enable_item_notes: true,
  enable_addons: true,
  enable_tax: false,
  tax_rate_percent: 0,
  enable_service_charge: false,
  service_charge_percent: 0,
  enable_rounding: true,
  require_open_register: true,
  require_refund_approval: false,
  require_void_approval: true,
  require_refund_reason: true,
  updated_at: new Date().toISOString(),
};

const defaultReceipt: ReceiptSettings = {
  id: 'default',
  business_name: 'MALIK TASTY NASHTA POINT',
  address: 'Vehari Road, Hasilpur',
  phone: '0300-1234567',
  receipt_prefix: 'MTN-',
  order_prefix: 'ORD-',
  refund_prefix: 'REF-',
  header_message: 'Fresh & Crispy Nashta Everyday',
  footer_message: 'Thank You - Visit Again!',
  show_cashier: true,
  show_customer: true,
  show_payment_method: true,
  show_discount: true,
  auto_print: false,
  paper_width_mm: 80,
  print_copies: 1,
  updated_at: new Date().toISOString(),
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(defaultBusiness);
  const [posSettings, setPosSettings] = useState<POSSettings>(defaultPOS);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(defaultReceipt);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        if (data.businessSettings) setBusinessSettings(data.businessSettings);
        if (data.posSettings) setPosSettings(data.posSettings);
        if (data.receiptSettings) setReceiptSettings(data.receiptSettings);
        if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSection = async (section: 'business' | 'pos' | 'receipt' | 'payments', data: any) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data }),
      });
      const result = await res.json();
      if (result.success) {
        await refreshSettings();
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to update settings' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        businessSettings,
        posSettings,
        receiptSettings,
        paymentMethods,
        isLoading,
        refreshSettings,
        updateSection,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
