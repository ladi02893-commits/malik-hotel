'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { Product } from '@/types';
import { formatMoney, multiplyMoney } from '@/lib/money';
import { Search, X, Check, ArrowRight, CornerDownLeft, AlertCircle, Plus, Minus, Hash } from 'lucide-react';

export function ProductSearch() {
  const {
    products,
    searchQuery,
    setSearchQuery,
    addToCart,
    deleteSelectedCartItem,
    showToast,
    quickCheckoutAndPrint,
  } = usePOS();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [selectedProductForQty, setSelectedProductForQty] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [priceInput, setPriceInput] = useState<string>('');
  const [activeInputType, setActiveInputType] = useState<'qty' | 'price'>('qty');

  // Auto-focus search input on initial load & handle F2
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setSelectedProductForQty(null);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    return products
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const shortNameMatch = p.short_name?.toLowerCase().includes(q);
        const skuMatch = p.sku?.toLowerCase().includes(q);
        const codeMatch = p.product_code?.toLowerCase().includes(q);
        return Boolean(nameMatch || shortNameMatch || skuMatch || codeMatch);
      })
      .slice(0, 10);
  }, [products, searchQuery]);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // When quantity modal opens, auto-focus & select the number
  useEffect(() => {
    if (selectedProductForQty) {
      const timer = setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedProductForQty]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        // keep query but close dropdown if needed
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Confirm product selection & enter quantity input mode
  const handleSelectProduct = (product: Product) => {
    if (product.availability === 'sold_out') {
      showToast(`${product.name} is currently sold out!`, 'warning');
      return;
    }
    setSelectedProductForQty(product);
    setQuantityInput('1');
    setPriceInput(String(product.selling_price));
    setActiveInputType('qty');
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

  // Confirm quantity and add to cart
  const handleConfirmQuantity = () => {
    if (!selectedProductForQty) return;

    const qty = parseFloat(quantityInput);
    const targetPrice = parseFloat(priceInput);

    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity of 0.5 or more', 'warning');
      qtyInputRef.current?.focus();
      return;
    }

    // Determine custom unit price if user specifically typed an exact amount that doesn't match standard rate
    let customUnitPrice: number | undefined = undefined;
    if (activeInputType === 'price' && !isNaN(targetPrice) && targetPrice > 0) {
      const standardCost = Number((qty * selectedProductForQty.selling_price).toFixed(2));
      if (Math.abs(standardCost - targetPrice) >= 0.5) {
        customUnitPrice = Number((targetPrice / qty).toFixed(2));
      }
    }

    addToCart(selectedProductForQty, [], undefined, qty, customUnitPrice);

    // Reset & refocus search immediately so cashier can type next item without mouse
    setSelectedProductForQty(null);
    setSearchQuery('');
    setHighlightedIndex(0);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);
  };

  const handleCancelQuantity = () => {
    setSelectedProductForQty(null);
    setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 40);
  };

  // Keyboard navigation inside search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 1. Shift + Enter = Fast Cash Checkout & Print Bill
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      quickCheckoutAndPrint();
      return;
    }

    // 2. Down Arrow = Next item in dropdown
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredProducts.length);
      }
      return;
    }

    // 3. Up Arrow = Previous item in dropdown
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + filteredProducts.length) % filteredProducts.length);
      }
      return;
    }

    // 4. Enter = Select highlighted item & prompt for quantity
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        const product = filteredProducts[highlightedIndex] || filteredProducts[0];
        handleSelectProduct(product);
      } else if (searchQuery.trim()) {
        showToast(`No menu item found for "${searchQuery}"`, 'warning');
      }
      return;
    }

    // 5. Delete key = If search query is empty, delete selected cart item
    if (e.key === 'Delete') {
      if (searchQuery === '') {
        e.preventDefault();
        deleteSelectedCartItem();
      }
      return;
    }

    // 6. Escape = Clear search query
    if (e.key === 'Escape') {
      e.preventDefault();
      setSearchQuery('');
      return;
    }
  };

  // Modal-level keyboard handler: Q for Quantity, A for Amount
  useEffect(() => {
    if (!selectedProductForQty) return;

    const handleModalKeys = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setActiveInputType('qty');
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setActiveInputType('price');
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleModalKeys);
    return () => window.removeEventListener('keydown', handleModalKeys);
  }, [selectedProductForQty]);

  // Keyboard handling inside quantity input
  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmQuantity();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelQuantity();
      return;
    }

    // A key -> Switch to Amount / Price mode
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      setActiveInputType('price');
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
      return;
    }

    // Q key -> Keep in Quantity mode and select
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      qtyInputRef.current?.select();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === '+') {
      e.preventDefault();
      stepPlus();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === '-') {
      e.preventDefault();
      stepMinus();
      return;
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmQuantity();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelQuantity();
      return;
    }

    // Q key -> Switch to Quantity mode
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      setActiveInputType('qty');
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
      return;
    }

    // A key -> Keep in Amount mode and select
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
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

  return (
    <div className="relative flex-1">
      {/* 1. MAIN SEARCH INPUT */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={searchInputRef}
          data-pos-search="true"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search menu item... [Enter] to select • [Del] delete bill item • [Shift+Enter] print"
          className="w-full pl-9 pr-14 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 rounded border border-slate-200 select-none">
              F2
            </kbd>
          )}
        </div>
      </div>

      {/* 2. AUTO-SUGGESTION DROPDOWN */}
      {searchQuery.trim().length > 0 && !selectedProductForQty && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-40 divide-y divide-slate-100 max-h-80 overflow-y-auto"
        >
          {filteredProducts.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              No menu items matching &ldquo;<span className="font-semibold">{searchQuery}</span>&rdquo;
            </div>
          ) : (
            filteredProducts.map((p, idx) => {
              const isSelected = idx === highlightedIndex;
              const isSoldOut = p.availability === 'sold_out';

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/80 border-l-4 border-emerald-700 text-emerald-950 font-medium'
                      : 'hover:bg-slate-50 text-slate-800'
                  } ${isSoldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold truncate">{p.name}</span>
                    {p.short_name && p.short_name !== p.name && (
                      <span className="text-[10px] text-slate-400 font-normal">({p.short_name})</span>
                    )}
                    {p.product_code && (
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1 rounded">
                        #{p.product_code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold font-mono text-emerald-800">
                      {formatMoney(p.selling_price)}
                    </span>
                    {isSoldOut ? (
                      <span className="text-[10px] text-red-600 font-bold uppercase">Sold Out</span>
                    ) : isSelected ? (
                      <span className="text-[10px] bg-emerald-700 text-white font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <CornerDownLeft className="w-2.5 h-2.5" />
                        <span>Enter</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. QUANTITY & PRICE INPUT MODAL (POPUP / OVERLAY) */}
      {selectedProductForQty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            {/* Header info */}
            <div className="text-center pb-2 border-b border-slate-100">
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">
                Quantity & Price
              </span>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                {selectedProductForQty.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Rate: {formatMoney(selectedProductForQty.selling_price)} per full plate
              </p>
            </div>

            {/* Side-by-side Dual Input: Quantity (Tadad) & Amount (Rupaye) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Quantity Field */}
              <div
                onClick={() => {
                  setActiveInputType('qty');
                  qtyInputRef.current?.focus();
                  qtyInputRef.current?.select();
                }}
                className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  activeInputType === 'qty'
                    ? 'border-emerald-700 bg-emerald-50/30'
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
                  <span className="text-[9px] font-mono text-emerald-800 font-bold">Plate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      stepMinus();
                    }}
                    className="w-7 h-7 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center active:scale-95 text-xs"
                    title="Decrease (-)"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    ref={qtyInputRef}
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={quantityInput}
                    onFocus={() => setActiveInputType('qty')}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    onKeyDown={handleQtyKeyDown}
                    className="w-full text-center text-lg font-extrabold font-mono text-slate-900 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      stepPlus();
                    }}
                    className="w-7 h-7 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center active:scale-95 text-xs"
                    title="Increase (+)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Amount / Price Field (e.g. 100 k chane) */}
              <div
                onClick={() => {
                  setActiveInputType('price');
                  priceInputRef.current?.focus();
                  priceInputRef.current?.select();
                }}
                className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  activeInputType === 'price'
                    ? 'border-emerald-700 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-white text-emerald-800 border border-emerald-300 rounded shadow-2xs">
                      A
                    </kbd>
                    <span>Amount (Rupaye)</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-800 font-bold">Rs.</span>
                </div>
                <div className="flex items-center h-7">
                  <span className="text-xs font-bold text-slate-400 font-mono mr-1">Rs.</span>
                  <input
                    ref={priceInputRef}
                    type="number"
                    step="10"
                    min="1"
                    value={priceInput}
                    onFocus={() => setActiveInputType('price')}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    onKeyDown={handlePriceKeyDown}
                    placeholder="e.g. 100"
                    className="w-full text-center text-lg font-extrabold font-mono text-slate-900 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Portion Chips */}
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Portion:
              </span>
              <div className="grid grid-cols-5 gap-1.5">
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
                      className={`py-1.5 px-1 rounded-md text-xs font-bold font-mono transition-all border ${
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

            {/* Quick Rupee Amount Chips (e.g. 50, 100, 150, 200) */}
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Rupaye:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 150, 200].map((amt) => {
                  const isActive = parseFloat(priceInput) === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleSetAmount(amt)}
                      className={`py-1.5 px-1 rounded-md text-xs font-bold font-mono transition-all border ${
                        isActive
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                          : 'bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-900 border-emerald-200'
                      }`}
                    >
                      Rs. {amt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtotal Preview */}
            <div className="bg-slate-900 text-white rounded-lg p-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Bill Line Total:</span>
              <span className="text-base font-extrabold font-mono text-emerald-400">
                {formatMoney(currentSubtotal)}
              </span>
            </div>

            {/* Action Buttons & Keyboard Hints */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmQuantity}
                className="w-full py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Add to Bill</span>
                <kbd className="text-[10px] font-mono bg-emerald-900/60 text-emerald-200 px-1.5 py-0.5 rounded ml-1">
                  Enter
                </kbd>
              </button>

              <button
                type="button"
                onClick={handleCancelQuantity}
                className="w-full py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <span>Cancel</span>
                <kbd className="text-[10px] font-mono bg-slate-200 text-slate-500 px-1 py-0.2 rounded ml-1">
                  Esc
                </kbd>
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400">
              Press <kbd className="text-slate-700 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Q</kbd> for Quantity • <kbd className="text-slate-700 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded border border-slate-200">A</kbd> for Amount • <kbd className="text-slate-700 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</kbd> to add
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
