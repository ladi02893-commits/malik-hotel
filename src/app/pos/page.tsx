'use client';

import React, { useState } from 'react';
import { usePOS } from '@/context/POSContext';
import { ProductSearch } from '@/components/pos/ProductSearch';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { Cart } from '@/components/pos/Cart';
import { CartCalculations } from '@/components/pos/CartCalculations';
import { POSFooterActions } from '@/components/pos/POSFooterActions';
import { POSMenuSidebar } from '@/components/pos/POSMenuSidebar';
import { InlineItemSelector } from '@/components/pos/InlineItemSelector';

// Modals
import { PaymentModal } from '@/components/pos/PaymentModal';
import { DiscountModal } from '@/components/pos/DiscountModal';
import { ItemNoteModal } from '@/components/pos/ItemNoteModal';
import { ItemAddonModal } from '@/components/pos/ItemAddonModal';
import { HoldOrderModal } from '@/components/pos/HoldOrderModal';
import { HeldOrdersModal } from '@/components/pos/HeldOrdersModal';
import { OpenRegisterModal } from '@/components/register/OpenRegisterModal';
import { CloseRegisterModal } from '@/components/register/CloseRegisterModal';
import { CashMovementModal } from '@/components/register/CashMovementModal';

import { CartItem, Product } from '@/types';
import { ArrowDownLeft, ArrowUpRight, Clock, Landmark } from 'lucide-react';

export default function POSPage() {
  const {
    heldOrdersCount,
    setIsHeldListModalOpen,
    activeRegister,
    setIsRegisterOpenModalOpen,
    setIsRegisterCloseModalOpen,
    setIsCashMovementModalOpen,
    setCashMovementType,
    quickCheckoutAndPrint,
    deleteSelectedCartItem,
    selectNextCartItem,
    selectPrevCartItem,
    searchQuery,
    cart,
    setIsHoldModalOpen,
    setIsDiscountModalOpen,
    isPaymentModalOpen,
    isHoldModalOpen,
    isHeldListModalOpen,
    isDiscountModalOpen,
    isRegisterOpenModalOpen,
    isRegisterCloseModalOpen,
    isCashMovementModalOpen,
    completedOrderForReceipt,
    showToast,
  } = usePOS();

  const isAnyModalActive =
    isPaymentModalOpen ||
    isHoldModalOpen ||
    isHeldListModalOpen ||
    isDiscountModalOpen ||
    isRegisterOpenModalOpen ||
    isRegisterCloseModalOpen ||
    isCashMovementModalOpen ||
    Boolean(completedOrderForReceipt);

  // Global POS Keyboard Shortcuts
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If another modal or receipt popup is already active, ignore POS global page shortcuts
      if (isAnyModalActive) return;

      // 1. Shift + Enter or F6 -> Quick Cash Checkout & Print Bill
      if ((e.key === 'Enter' && e.shiftKey) || e.key === 'F6') {
        e.preventDefault();
        quickCheckoutAndPrint();
        return;
      }

      // 2. Delete key -> Remove active / selected item from bill
      if (e.key === 'Delete') {
        const target = e.target as HTMLElement | null;
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
        const isSearch = target?.getAttribute('data-pos-search') === 'true';

        // Only trigger delete if not in an input OR if inside search bar with empty query
        if (!isInput || (isSearch && searchQuery === '')) {
          e.preventDefault();
          deleteSelectedCartItem();
        }
        return;
      }

      // 3. Ctrl+Up or Alt+Up -> Previous cart item
      if ((e.ctrlKey || e.altKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrevCartItem();
        return;
      }

      // 4. Ctrl+Down or Alt+Down -> Next cart item
      if ((e.ctrlKey || e.altKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        selectNextCartItem();
        return;
      }

      // 5. F4 -> Hold Current Order
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsHoldModalOpen(true);
        } else {
          showToast('Bill is empty. Add items first to hold.', 'warning');
        }
        return;
      }

      // 6. D key -> Apply Discount to current order
      if (e.key === 'd' || e.key === 'D') {
        const target = e.target as HTMLElement | null;
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
        const isAltOrCtrl = e.altKey || e.ctrlKey;

        // If outside an active text input, or if using Alt+D / Ctrl+D
        if (!isInput || isAltOrCtrl) {
          e.preventDefault();
          if (cart.length > 0) {
            setIsDiscountModalOpen(true);
          } else {
            showToast('Bill is empty. Add items first to apply discount.', 'warning');
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isAnyModalActive,
    quickCheckoutAndPrint,
    deleteSelectedCartItem,
    selectPrevCartItem,
    selectNextCartItem,
    searchQuery,
    cart.length,
    setIsHoldModalOpen,
    setIsDiscountModalOpen,
    showToast,
  ]);

  // Modals item target
  const [activeItemForNote, setActiveItemForNote] = useState<CartItem | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const [activeItemForAddons, setActiveItemForAddons] = useState<CartItem | null>(null);
  const [activeProductForAddons, setActiveProductForAddons] = useState<Product | null>(null);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);

  const handleOpenItemNote = (item: CartItem) => {
    setActiveItemForNote(item);
    setIsNoteModalOpen(true);
  };

  const handleOpenItemAddons = (item: CartItem) => {
    setActiveItemForNote(null);
    setActiveProductForAddons(null);
    setActiveItemForAddons(item);
    setIsAddonModalOpen(true);
  };

  const handleOpenProductAddons = (product: Product) => {
    setActiveItemForAddons(null);
    setActiveProductForAddons(product);
    setIsAddonModalOpen(true);
  };

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-3.25rem)] pos-container">
      {/* 1. COMPACT MENU SIDEBAR ON ONE SIDE */}
      <POSMenuSidebar />

      {/* 2. CENTER: SEARCH, INLINE QUANTITY & PRICE SELECTOR & MENU GRID */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden gap-2 bg-slate-50/50">
        {/* Top Control Bar: Search + Quick Drawer & Hold triggers */}
        <div className="flex items-center gap-2">
          <ProductSearch />

          {/* Quick Cash Register Controls */}
          {activeRegister ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCashMovementType('CASH_IN');
                  setIsCashMovementModalOpen(true);
                }}
                className="px-2.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-800 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Add cash into drawer"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cash In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCashMovementType('CASH_OUT');
                  setIsCashMovementModalOpen(true);
                }}
                className="px-2.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-amber-800 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Pay expense from drawer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cash Out</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRegisterCloseModalOpen(true)}
                className="px-2.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                title="End of shift register close"
              >
                <Landmark className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Close Shift</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsRegisterOpenModalOpen(true)}
              className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Open Register</span>
            </button>
          )}

          {/* Held Orders Quick Access Button */}
          <button
            type="button"
            onClick={() => setIsHeldListModalOpen(true)}
            className="px-2.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors relative"
            title="View held orders"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Held</span>
            {heldOrdersCount > 0 && (
              <span className="bg-amber-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {heldOrdersCount}
              </span>
            )}
          </button>
        </div>

        {/* INLINE QUANTITY & PRICE SELECTOR (Right on the screen below search!) */}
        <InlineItemSelector />

        {/* Categories Bar */}
        <CategoryTabs />

        {/* Product Cards Grid */}
        <ProductGrid onOpenAddons={handleOpenProductAddons} />

        {/* BOTTOM QUICK SHORTCUTS BAR FOR CASHIER (KEYBOARD-FIRST) */}
        <div className="bg-white border border-slate-200/90 rounded-lg px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-600 shadow-2xs select-none flex-shrink-0">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Fast Keys:
            </span>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-800">F2</kbd>
              <span>Search</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-800">Enter</kbd>
              <span>Select & Qty</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded font-mono text-[10px]">Delete</kbd>
              <span>Delete Item</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-800">Ctrl+↑/↓</kbd>
              <span>Pick Item</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold font-mono text-[10px]">D</kbd>
              <span className="font-semibold text-emerald-900">Discount</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-amber-50 border border-amber-300 text-amber-800 font-bold font-mono text-[10px]">F4</kbd>
              <span className="font-semibold text-amber-900">Hold</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-emerald-800 flex-shrink-0 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <span>Pay:</span>
            <kbd className="px-1.5 py-0.5 bg-emerald-800 text-white rounded font-mono text-[10px]">Shift + Enter</kbd>
          </div>
        </div>
      </div>

      {/* RIGHT: CURRENT ORDER CART & CHECKOUT */}
      <div className="w-80 md:w-96 flex flex-col border-l border-slate-200 bg-white flex-shrink-0 z-10 shadow-xs">
        <Cart
          onOpenItemNote={handleOpenItemNote}
          onOpenItemAddons={handleOpenItemAddons}
        />
        <CartCalculations />
        <POSFooterActions />
      </div>

      {/* ALL ATTACHED MODALS */}
      <PaymentModal />
      <DiscountModal />
      <HoldOrderModal />
      <HeldOrdersModal />
      <OpenRegisterModal />
      <CloseRegisterModal />
      <CashMovementModal />

      <ItemNoteModal
        item={activeItemForNote}
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setActiveItemForNote(null);
        }}
      />

      <ItemAddonModal
        item={activeItemForAddons}
        product={activeProductForAddons}
        isOpen={isAddonModalOpen}
        onClose={() => {
          setIsAddonModalOpen(false);
          setActiveItemForAddons(null);
          setActiveProductForAddons(null);
        }}
      />
    </div>
  );
}
