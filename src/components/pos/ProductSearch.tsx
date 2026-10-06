'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { Product } from '@/types';
import { formatMoney } from '@/lib/money';
import { Search, X, CornerDownLeft } from 'lucide-react';

export function ProductSearch() {
  const {
    products,
    searchQuery,
    setSearchQuery,
    selectProductForQty,
    deleteSelectedCartItem,
    showToast,
    quickCheckoutAndPrint,
  } = usePOS();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Auto-focus search input on initial load & handle F2
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        // Dropdown handled by searchQuery
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Confirm product selection -> passes to inline selector right on the screen!
  const handleSelectProduct = (product: Product) => {
    if (product.availability === 'sold_out') {
      showToast(`${product.name} is currently sold out!`, 'warning');
      return;
    }
    selectProductForQty(product);
    setSearchQuery('');
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

    // 4. Enter = Select highlighted item & trigger inline selector on the screen
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

  return (
    <div className="relative flex-1">
      {/* MAIN SEARCH INPUT */}
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
          placeholder="Search menu item... [Enter] to select • [Del] delete bill item • [Shift+Enter] pay"
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

      {/* AUTO-SUGGESTION DROPDOWN */}
      {searchQuery.trim().length > 0 && (
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
    </div>
  );
}
