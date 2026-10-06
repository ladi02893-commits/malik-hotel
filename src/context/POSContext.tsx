'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Category,
  Product,
  CartItem,
  CartTotals,
  SelectedAddon,
  RegisterSession,
  PaymentEntry,
  QuickNote,
  PaymentMethod,
  Order,
} from '@/types';
import { addMoney, subtractMoney, multiplyMoney, calculateRounding } from '@/lib/money';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

interface POSContextType {
  // Data
  categories: Category[];
  products: Product[];
  quickNotes: QuickNote[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  isConnected: boolean;
  activeRegister: RegisterSession | null;
  heldOrdersCount: number;

  // Filters
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedProductForQty: Product | null;
  setSelectedProductForQty: (product: Product | null) => void;
  selectProductForQty: (product: Product) => void;

  // Cart State
  cart: CartItem[];
  selectedCartItemId: string | null;
  setSelectedCartItemId: (id: string | null) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  discountType?: 'percentage' | 'fixed';
  discountValue: number;

  // Calculations
  totals: CartTotals;

  // Cart Operations
  addToCart: (product: Product, addons?: SelectedAddon[], note?: string, quantity?: number, customUnitPrice?: number) => void;
  updateQuantity: (itemId: string, newQty: number) => void;
  updateItemNote: (itemId: string, note?: string) => void;
  updateItemAddons: (itemId: string, addons: SelectedAddon[]) => void;
  updateItemDiscount: (itemId: string, discount: number) => void;
  removeFromCart: (itemId: string) => void;
  deleteSelectedCartItem: () => void;
  selectNextCartItem: () => void;
  selectPrevCartItem: () => void;
  clearCart: () => void;
  applyDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  removeDiscount: () => void;

  // Order Operations
  completeCheckout: (payments: PaymentEntry[], adminPin?: string) => Promise<{ success: boolean; order?: Order; error?: string }>;
  quickCheckoutAndPrint: () => Promise<{ success: boolean; order?: Order; error?: string }>;
  isQuickPrint: boolean;
  setIsQuickPrint: (val: boolean) => void;
  holdCurrentOrder: (customerName?: string, note?: string) => Promise<{ success: boolean; holdNumber?: string; error?: string }>;
  resumeOrder: (holdId: string) => Promise<{ success: boolean; error?: string }>;

  // Register & Catalog Operations
  refreshRegister: () => Promise<void>;
  refreshPOSData: () => Promise<void>;

  // Receipt & UI Modals
  completedOrderForReceipt: Order | null;
  setCompletedOrderForReceipt: (order: Order | null) => void;
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
  isHoldModalOpen: boolean;
  setIsHoldModalOpen: (open: boolean) => void;
  isHeldListModalOpen: boolean;
  setIsHeldListModalOpen: (open: boolean) => void;
  isDiscountModalOpen: boolean;
  setIsDiscountModalOpen: (open: boolean) => void;
  isRegisterOpenModalOpen: boolean;
  setIsRegisterOpenModalOpen: (open: boolean) => void;
  isRegisterCloseModalOpen: boolean;
  setIsRegisterCloseModalOpen: (open: boolean) => void;
  isCashMovementModalOpen: boolean;
  setIsCashMovementModalOpen: (open: boolean) => void;
  cashMovementType: 'CASH_IN' | 'CASH_OUT';
  setCashMovementType: (type: 'CASH_IN' | 'CASH_OUT') => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: React.ReactNode }) {
  const { posSettings, refreshSettings } = useSettings();
  const { user } = useAuth();

  // Primary Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activeRegister, setActiveRegister] = useState<RegisterSession | null>(null);
  const [heldOrdersCount, setHeldOrdersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductForQty, setSelectedProductForQty] = useState<Product | null>(null);


  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [isQuickPrint, setIsQuickPrint] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | undefined>(undefined);
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Modals
  const [completedOrderForReceipt, setCompletedOrderForReceipt] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isHeldListModalOpen, setIsHeldListModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isRegisterOpenModalOpen, setIsRegisterOpenModalOpen] = useState(false);
  const [isRegisterCloseModalOpen, setIsRegisterCloseModalOpen] = useState(false);
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [cashMovementType, setCashMovementType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const selectProductForQty = useCallback((product: Product) => {
    if (product.availability === 'sold_out') {
      showToast(`${product.name} is currently sold out!`, 'warning');
      return;
    }
    setSelectedProductForQty(product);
  }, [showToast]);

  // Fetch initial POS data
  const loadPOSData = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/init');
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
        setProducts(data.products || []);
        setQuickNotes(data.quickNotes || []);
        setPaymentMethods(data.paymentMethods || []);
        setActiveRegister(data.activeRegister || null);
        setHeldOrdersCount(data.heldOrdersCount || 0);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error('Failed to load POS data:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPOSData();
  }, [loadPOSData]);

  // Refresh register state
  const refreshRegister = async () => {
    try {
      const res = await fetch('/api/register');
      const data = await res.json();
      if (data.success) {
        setActiveRegister(data.activeRegister || null);
      }
    } catch (err) {
      console.error('Failed to refresh register:', err);
    }
  };

  // -------------------------------------------------------------
  // CART CALCULATIONS (AUTHORITATIVE PREVIEW)
  // -------------------------------------------------------------
  const totals: CartTotals = useMemo(() => {
    // 1. Line items sum
    const subtotal = cart.reduce((acc, item) => addMoney(acc, item.line_total), 0);

    // 2. Order-level discount
    let discountAmount = 0;
    if (posSettings.enable_discounts && discountValue > 0) {
      if (discountType === 'percentage') {
        const percent = Math.min(100, Math.max(0, discountValue));
        discountAmount = multiplyMoney(subtotal, percent / 100);
      } else if (discountType === 'fixed') {
        discountAmount = Math.min(subtotal, discountValue);
      }
    }

    const discountedSubtotal = subtractMoney(subtotal, discountAmount);

    // 3. Tax
    let taxAmount = 0;
    if (posSettings.enable_tax && posSettings.tax_rate_percent > 0) {
      taxAmount = multiplyMoney(discountedSubtotal, posSettings.tax_rate_percent / 100);
    }

    // 4. Service Charge
    let serviceChargeAmount = 0;
    if (posSettings.enable_service_charge && posSettings.service_charge_percent > 0) {
      serviceChargeAmount = multiplyMoney(discountedSubtotal, posSettings.service_charge_percent / 100);
    }

    // 5. Rounding
    const rawTotal = addMoney(discountedSubtotal, taxAmount, serviceChargeAmount);
    const { roundedTotal, roundingAmount } = calculateRounding(rawTotal, posSettings.enable_rounding);

    return {
      subtotal,
      discount_amount: discountAmount,
      discount_type: discountType,
      discount_value: discountValue,
      tax_amount: taxAmount,
      service_charge_amount: serviceChargeAmount,
      rounding_amount: roundingAmount,
      grand_total: roundedTotal,
    };
  }, [cart, discountType, discountValue, posSettings]);

  // -------------------------------------------------------------
  // CART ACTIONS
  // -------------------------------------------------------------
  const addToCart = (
    product: Product,
    addons: SelectedAddon[] = [],
    note?: string,
    quantity: number = 1,
    customUnitPrice?: number
  ) => {
    const rawQty = Number(quantity);
    const qtyToAdd = isNaN(rawQty) || rawQty <= 0 ? 1 : rawQty;
    const effectiveUnitPrice = customUnitPrice !== undefined && customUnitPrice > 0 ? customUnitPrice : product.selling_price;

    if (product.availability === 'sold_out') {
      showToast(`${product.name} is currently sold out`, 'warning');
      return;
    }

    setCart((prev) => {
      // If item has no custom note or addons and no custom unit price, check if it already exists in cart
      if (addons.length === 0 && !note && !customUnitPrice) {
        const existingIdx = prev.findIndex(
          (item) => item.product_id === product.id && item.addons.length === 0 && !item.note && !item.custom_unit_price
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          const item = updated[existingIdx];
          const newQty = Number((item.quantity + qtyToAdd).toFixed(2));
          const itemSubtotal = multiplyMoney(item.unit_price, newQty);
          const lineTotal = subtractMoney(itemSubtotal, item.item_discount);
          updated[existingIdx] = {
            ...item,
            quantity: newQty,
            line_total: lineTotal,
          };
          setSelectedCartItemId(item.id);
          return updated;
        }
      }

      // Add as new line
      const addonsTotal = addons.reduce(
        (sum, a) => addMoney(sum, multiplyMoney(a.price, a.quantity)),
        0
      );
      const unitTotal = addMoney(effectiveUnitPrice, addonsTotal);
      const lineTotal = multiplyMoney(unitTotal, qtyToAdd);

      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        product_id: product.id,
        name: product.name,
        short_name: product.short_name,
        unit_price: effectiveUnitPrice,
        quantity: qtyToAdd,
        addons,
        note: note || undefined,
        item_discount: 0,
        line_total: lineTotal,
        custom_unit_price: customUnitPrice,
      };

      setSelectedCartItemId(newItem.id);
      return [...prev, newItem];
    });

    showToast(`Added ${qtyToAdd}x ${product.short_name || product.name}`, 'info');
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const effectivePrice = item.custom_unit_price || item.unit_price;
          const itemSubtotal = multiplyMoney(effectivePrice, newQty);
          const addonsTotal = item.addons.reduce((sum, a) => addMoney(sum, multiplyMoney(a.price, a.quantity)), 0);
          const lineTotal = subtractMoney(addMoney(itemSubtotal, addonsTotal), item.item_discount);
          return {
            ...item,
            quantity: newQty,
            line_total: lineTotal,
          };
        }
        return item;
      })
    );
  };

  const updateItemNote = (itemId: string, note?: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, note: note ? note.trim() : undefined } : item))
    );
  };

  const updateItemAddons = (itemId: string, addons: SelectedAddon[]) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const effectivePrice = item.custom_unit_price || item.unit_price;
          const itemSubtotal = multiplyMoney(effectivePrice, item.quantity);
          const addonsTotal = addons.reduce((sum, a) => addMoney(sum, multiplyMoney(a.price, a.quantity)), 0);
          const lineTotal = subtractMoney(addMoney(itemSubtotal, addonsTotal), item.item_discount);
          return {
            ...item,
            addons,
            line_total: lineTotal,
          };
        }
        return item;
      })
    );
  };

  const updateItemDiscount = (itemId: string, discount: number) => {
    const cleanDiscount = Math.max(0, discount);
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const effectivePrice = item.custom_unit_price || item.unit_price;
          const itemSubtotal = multiplyMoney(effectivePrice, item.quantity);
          const addonsTotal = item.addons.reduce((sum, a) => addMoney(sum, multiplyMoney(a.price, a.quantity)), 0);
          const totalBeforeDisc = addMoney(itemSubtotal, addonsTotal);
          const lineTotal = subtractMoney(totalBeforeDisc, Math.min(totalBeforeDisc, cleanDiscount));
          return {
            ...item,
            item_discount: cleanDiscount,
            line_total: lineTotal,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const remaining = prev.filter((item) => item.id !== itemId);
      if (selectedCartItemId === itemId) {
        setSelectedCartItemId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });
    showToast('Item removed', 'info');
  };

  const deleteSelectedCartItem = () => {
    setCart((prev) => {
      if (prev.length === 0) return prev;
      const target = prev.find((i) => i.id === selectedCartItemId) || prev[prev.length - 1];
      if (!target) return prev;
      showToast(`Removed "${target.short_name || target.name}" from bill`, 'info');
      const remaining = prev.filter((i) => i.id !== target.id);
      setSelectedCartItemId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      return remaining;
    });
  };

  const selectNextCartItem = () => {
    setCart((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((i) => i.id === selectedCartItemId);
      const nextIdx = idx < prev.length - 1 ? idx + 1 : 0;
      setSelectedCartItemId(prev[nextIdx].id);
      return prev;
    });
  };

  const selectPrevCartItem = () => {
    setCart((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((i) => i.id === selectedCartItemId);
      const prevIdx = idx > 0 ? idx - 1 : prev.length - 1;
      setSelectedCartItemId(prev[prevIdx].id);
      return prev;
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCartItemId(null);
    setCustomerName('');
    setCustomerPhone('');
    setOrderNotes('');
    setDiscountType(undefined);
    setDiscountValue(0);
    showToast('Order cleared', 'info');
  };

  const applyDiscount = (type: 'percentage' | 'fixed', value: number) => {
    setDiscountType(type);
    setDiscountValue(value);
    showToast(`Applied ${type === 'percentage' ? `${value}%` : `Rs. ${value}`} discount`, 'success');
  };

  const removeDiscount = () => {
    setDiscountType(undefined);
    setDiscountValue(0);
    showToast('Discount removed', 'info');
  };

  // -------------------------------------------------------------
  // CHECKOUT
  // -------------------------------------------------------------
  const completeCheckout = async (payments: PaymentEntry[], adminPin?: string) => {
    if (cart.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    try {
      const idempotencyKey = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          discount_type: discountType,
          discount_value: discountValue,
          admin_pin: adminPin,
          payments,
          customer_name: customerName,
          customer_phone: customerPhone,
          notes: orderNotes,
          idempotency_key: idempotencyKey,
          cashier_name: user?.display_name || user?.full_name || 'Admin',
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        // Success
        setCompletedOrderForReceipt(data.order);
        clearCart();
        setIsPaymentModalOpen(false);
        showToast(`Order completed: Receipt #${data.order.receipt_number}`, 'success');
        refreshRegister();
        return { success: true, order: data.order };
      } else {
        showToast(data.error || 'Unable to complete payment', 'error');
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast('Connection problem during checkout', 'error');
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Fast Cash Checkout & Auto-print for Shift + Enter
  const quickCheckoutAndPrint = async (): Promise<{ success: boolean; order?: Order; error?: string }> => {
    if (cart.length === 0) {
      showToast('Bill is empty. Please add items first.', 'warning');
      return { success: false, error: 'Cart is empty' };
    }

    if (posSettings.require_open_register && !activeRegister) {
      showToast('Please open the cash register first.', 'warning');
      setIsRegisterOpenModalOpen(true);
      return { success: false, error: 'Register not open' };
    }

    setIsQuickPrint(true);
    const payments: PaymentEntry[] = [
      {
        method_id: 'cash',
        method_name: 'Cash',
        amount: totals.grand_total,
        amount_tendered: totals.grand_total,
        change_returned: 0,
      },
    ];

    const result = await completeCheckout(payments);
    if (!result.success) {
      setIsQuickPrint(false);
    }
    return result;
  };

  // -------------------------------------------------------------
  // HOLD / RESUME
  // -------------------------------------------------------------
  const holdCurrentOrder = async (custName?: string, noteText?: string) => {
    if (cart.length === 0) {
      showToast('Bill is empty. Add items first to hold.', 'warning');
      return { success: false, error: 'Cart is empty' };
    }

    try {
      const res = await fetch('/api/held-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_payload: {
            items: cart,
            discount_type: discountType,
            discount_value: discountValue,
            notes: orderNotes,
          },
          customer_name: custName || customerName,
          note: noteText || orderNotes,
          subtotal: totals.subtotal,
          discount_amount: totals.discount_amount,
          grand_total: totals.grand_total,
          cashier_name: user?.display_name || user?.full_name || 'Admin',
          user_id: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.heldOrder) {
        showToast(`Order held (${data.heldOrder.hold_number})`, 'success');
        setCart([]);
        setSelectedCartItemId(null);
        setCustomerName('');
        setCustomerPhone('');
        setOrderNotes('');
        setDiscountType(undefined);
        setDiscountValue(0);
        setIsHoldModalOpen(false);
        setHeldOrdersCount((c) => c + 1);
        return { success: true, holdNumber: data.heldOrder.hold_number };
      } else {
        showToast(data.error || 'Failed to hold order', 'error');
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      showToast(err.message || 'Connection problem', 'error');
      return { success: false, error: err.message };
    }
  };

  const resumeOrder = async (holdId: string) => {
    try {
      const res = await fetch(`/api/held-orders?id=${holdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_name: user?.display_name || user?.full_name || 'Admin',
        }),
      });

      const data = await res.json();
      if (data.success && data.cart_payload) {
        setCart(data.cart_payload.items || []);
        setDiscountType(data.cart_payload.discount_type);
        setDiscountValue(data.cart_payload.discount_value || 0);
        setOrderNotes(data.cart_payload.notes || data.note || '');
        setCustomerName(data.customer_name || '');
        setHeldOrdersCount((c) => Math.max(0, c - 1));
        setIsHeldListModalOpen(false);
        showToast('Held order restored to cart', 'success');
        return { success: true };
      } else {
        showToast(data.error || 'Failed to resume order', 'error');
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      showToast(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  return (
    <POSContext.Provider
      value={{
        categories,
        products,
        quickNotes,
        paymentMethods,
        isLoading,
        isConnected,
        activeRegister,
        heldOrdersCount,
        selectedCategoryId,
        setSelectedCategoryId,
        searchQuery,
        setSearchQuery,
        selectedProductForQty,
        setSelectedProductForQty,
        selectProductForQty,
        cart,
        selectedCartItemId,
        setSelectedCartItemId,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        orderNotes,
        setOrderNotes,
        discountType,
        discountValue,
        totals,
        addToCart,
        updateQuantity,
        updateItemNote,
        updateItemAddons,
        updateItemDiscount,
        removeFromCart,
        deleteSelectedCartItem,
        selectNextCartItem,
        selectPrevCartItem,
        clearCart,
        applyDiscount,
        removeDiscount,
        completeCheckout,
        quickCheckoutAndPrint,
        isQuickPrint,
        setIsQuickPrint,
        holdCurrentOrder,
        resumeOrder,
        refreshRegister,
        refreshPOSData: loadPOSData,
        completedOrderForReceipt,
        setCompletedOrderForReceipt,
        isPaymentModalOpen,
        setIsPaymentModalOpen,
        isHoldModalOpen,
        setIsHoldModalOpen,
        isHeldListModalOpen,
        setIsHeldListModalOpen,
        isDiscountModalOpen,
        setIsDiscountModalOpen,
        isRegisterOpenModalOpen,
        setIsRegisterOpenModalOpen,
        isRegisterCloseModalOpen,
        setIsRegisterCloseModalOpen,
        isCashMovementModalOpen,
        setIsCashMovementModalOpen,
        cashMovementType,
        setCashMovementType,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
}
