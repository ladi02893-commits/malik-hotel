'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '@/context/POSContext';
import { Product } from '@/types';
import { formatMoney, multiplyMoney } from '@/lib/money';
import { Check, X, Plus, Minus, Hash, Coins, Calculator } from 'lucide-react';

export function InlineItemSelector() {
  const {
    products,
    selectedProductForQty,
    setSelectedProductForQty,
    addToCart,
    showToast,
  } = usePOS();

  const priceInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [priceInput, setPriceInput] = useState<string>('');
  // Requirement 4: "by defult price ay quantity ni" -> default is 'price'
  const [activeInputType, setActiveInputType] = useState<'price' | 'qty'>('price');

  // When a product is selected, initialize with its price as DEFAULT and auto-focus Price field
  useEffect(() => {
    if (selectedProductForQty) {
      setQuantityInput('1');
      setPriceInput(String(selectedProductForQty.selling_price));
      setActiveInputType('price');

      const timer = setTimeout(() => {
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [selectedProductForQty]);

  const handlePriceChange = (val: string) => {
    setPriceInput(val);
    setActiveInputType('price');
    if (!selectedProductForQty || selectedProductForQty.selling_price <= 0) return;
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const calcQty = Number((num / selectedProductForQty.selling_price).toFixed(2));
      setQuantityInput(String(calcQty));
    }
  };

  const handleQuantityChange = (val: string) => {
    setQuantityInput(val);
    setActiveInputType('qty');
    if (!selectedProductForQty) return;
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setPriceInput(String(Math.round(num * selectedProductForQty.selling_price)));
    }
  };

  const handleSetPortion = (portion: number) => {
    if (!selectedProductForQty) return;
    setQuantityInput(String(portion));
    setPriceInput(String(Math.round(portion * selectedProductForQty.selling_price)));
    setActiveInputType('qty');
    qtyInputRef.current?.focus();
    qtyInputRef.current?.select();
  };

  const handleSetAmount = (amount: number) => {
    if (!selectedProductForQty || selectedProductForQty.selling_price <= 0) return;
    setPriceInput(String(amount));
    const calcQty = Number((amount / selectedProductForQty.selling_price).toFixed(2));
    setQuantityInput(String(calcQty));
    setActiveInputType('price');
    priceInputRef.current?.focus();
    priceInputRef.current?.select();
  };

  const stepMinus = () => {
    const current = parseFloat(quantityInput) || 1;
    let next = 1;
    if (current > 1) {
      next = current % 1 !== 0 ? Math.floor(current) : current - 1;
    } else if (current === 1) {
      next = 0.5;
    } else {
      next = Math.max(0.25, Number((current - 0.25).toFixed(2)));
    }
    handleQuantityChange(String(next));
    qtyInputRef.current?.focus();
  };

  const stepPlus = () => {
    const current = parseFloat(quantityInput) || 1;
    let next = 1;
    if (current < 1) {
      next = 1;
    } else {
      next = current % 1 !== 0 ? Math.ceil(current) : current + 1;
    }
    handleQuantityChange(String(next));
    qtyInputRef.current?.focus();
  };

  const handleConfirm = () => {
    if (!selectedProductForQty) return;

    const qty = parseFloat(quantityInput);
    const targetPrice = parseFloat(priceInput);

    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid amount or quantity', 'warning');
      priceInputRef.current?.focus();
      return;
    }

    let customUnitPrice: number | undefined = undefined;
    if (activeInputType === 'price' && !isNaN(targetPrice) && targetPrice > 0) {
      const standardCost = Number((qty * selectedProductForQty.selling_price).toFixed(2));
      if (Math.abs(standardCost - targetPrice) >= 0.5) {
        customUnitPrice = Number((targetPrice / qty).toFixed(2));
      }
    }

    addToCart(selectedProductForQty, [], undefined, qty, customUnitPrice);
    setSelectedProductForQty(null);

    // Focus back to search bar
    setTimeout(() => {
      const search = document.querySelector<HTMLInputElement>('input[data-pos-search="true"]');
      search?.focus();
    }, 40);
  };

  const handleCancel = () => {
    setSelectedProductForQty(null);
    setTimeout(() => {
      const search = document.querySelector<HTMLInputElement>('input[data-pos-search="true"]');
      search?.focus();
    }, 40);
  };

  // Keyboard navigation inside inline selector
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
      return;
    }

    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      setActiveInputType('qty');
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
      return;
    }

    if (e.key === 'a' || e.key === 'A' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      setActiveInputType('price');
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
      return;
    }
  };

  const parsedQty = parseFloat(quantityInput) || 1;
  const parsedPrice = parseFloat(priceInput) || 0;
  const currentSubtotal =
    activeInputType === 'price' && parsedPrice > 0
      ? parsedPrice
      : selectedProductForQty
      ? multiplyMoney(selectedProductForQty.selling_price, parsedQty)
      : 0;

  // If no product is selected, display quick-select suggestion pills
  if (!selectedProductForQty) {
    const popularItems = products.slice(0, 6);
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium overflow-x-auto py-0.5">
          <span className="font-bold text-slate-700 flex items-center gap-1 flex-shrink-0">
            <Coins className="w-3.5 h-3.5 text-emerald-700" />
            Quick Select:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {popularItems.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProductForQty(p)}
                className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded text-slate-800 text-[11px] font-semibold transition-colors flex items-center gap-1"
              >
                <span>{p.name}</span>
                <span className="text-emerald-800 font-mono font-bold">Rs.{p.selling_price}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-1 flex-shrink-0">
          <span>Click item or [Enter] from search to set price/qty</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="bg-white border-2 border-emerald-700 rounded-xl p-3 shadow-md space-y-2.5 transition-all animate-in fade-in duration-100"
    >
      {/* 1. Header: Product Name + Rate */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            Selected Item
          </span>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
            {selectedProductForQty.name}
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            (Rate: {formatMoney(selectedProductForQty.selling_price)})
          </span>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
          title="Cancel [Esc]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Dual Inputs: Price (Default Focused) & Quantity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* PRICE / AMOUNT FIELD - DEFAULT ACTIVE */}
        <div
          onClick={() => {
            setActiveInputType('price');
            priceInputRef.current?.focus();
            priceInputRef.current?.select();
          }}
          className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
            activeInputType === 'price'
              ? 'border-emerald-700 bg-emerald-50/40 ring-2 ring-emerald-700/20'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-white text-emerald-800 border border-emerald-300 rounded shadow-2xs">
                A / Price
              </kbd>
              <span className="text-emerald-950 font-bold">Amount (Rupaye) - Default</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-800 font-bold">Rs.</span>
          </div>
          <div className="flex items-center h-8">
            <span className="text-sm font-bold text-slate-400 font-mono mr-1.5">Rs.</span>
            <input
              ref={priceInputRef}
              type="number"
              step="10"
              min="1"
              value={priceInput}
              onFocus={() => setActiveInputType('price')}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="e.g. 100"
              className="w-full text-left sm:text-center text-xl font-black font-mono text-slate-900 bg-transparent focus:outline-none"
            />
          </div>
        </div>

        {/* QUANTITY FIELD */}
        <div
          onClick={() => {
            setActiveInputType('qty');
            qtyInputRef.current?.focus();
            qtyInputRef.current?.select();
          }}
          className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
            activeInputType === 'qty'
              ? 'border-emerald-700 bg-emerald-50/40 ring-2 ring-emerald-700/20'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-white text-emerald-800 border border-emerald-300 rounded shadow-2xs">
                Q
              </kbd>
              <span>Quantity (Tadad)</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-800 font-bold">Plate / Qty</span>
          </div>
          <div className="flex items-center gap-2 h-8">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stepMinus();
              }}
              className="w-8 h-8 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center active:scale-95 text-xs shadow-2xs"
              title="Decrease (-)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              ref={qtyInputRef}
              type="number"
              step="0.5"
              min="0.1"
              value={quantityInput}
              onFocus={() => setActiveInputType('qty')}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-full text-center text-xl font-black font-mono text-slate-900 bg-transparent focus:outline-none"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stepPlus();
              }}
              className="w-8 h-8 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center active:scale-95 text-xs shadow-2xs"
              title="Increase (+)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Quick Chips: Quick Rupaye & Quick Portions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
        {/* Quick Amount Chips */}
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Quick Rupaye:
          </span>
          <div className="grid grid-cols-4 gap-1">
            {[50, 100, 150, 200].map((amt) => {
              const isActive = parseFloat(priceInput) === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSetAmount(amt)}
                  className={`py-1 px-1 rounded text-xs font-bold font-mono transition-all border ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                      : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                  }`}
                >
                  Rs.{amt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Portion Chips */}
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Quick Portion:
          </span>
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: '0.25 (1/4)', val: 0.25 },
              { label: '0.5 (Half)', val: 0.5 },
              { label: '1 (Full)', val: 1 },
              { label: '1.5', val: 1.5 },
              { label: '2', val: 2 },
            ].map((chip) => {
              const isActive = parseFloat(quantityInput) === chip.val && activeInputType === 'qty';
              return (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => handleSetPortion(chip.val)}
                  className={`py-1 px-0.5 rounded text-[11px] font-bold font-mono transition-all border text-center ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Total and Confirm Buttons */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Line Total:</span>
          <span className="text-lg font-black font-mono text-emerald-800">
            {formatMoney(currentSubtotal)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1"
          >
            <span>Cancel</span>
            <kbd className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded">Esc</kbd>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Add to Bill</span>
            <kbd className="text-[9px] font-mono bg-emerald-950/70 text-emerald-200 px-1 rounded ml-0.5">
              Enter
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
