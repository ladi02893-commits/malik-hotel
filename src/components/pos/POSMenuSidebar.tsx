'use client';

import React, { useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { Product } from '@/types';
import { formatMoney } from '@/lib/money';
import { Utensils, Sparkles } from 'lucide-react';

export function POSMenuSidebar() {
  const {
    products,
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedProductForQty,
    selectProductForQty,
    searchQuery,
  } = usePOS();

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.short_name && p.short_name.toLowerCase().includes(q))
        );
      }
      return selectedCategoryId === 'all' || p.category_id === selectedCategoryId;
    });
  }, [products, selectedCategoryId, searchQuery]);

  return (
    <div className="w-56 sm:w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 select-none overflow-hidden">
      {/* 1. Header: Title & Total Count */}
      <div className="p-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-emerald-800" />
          <span className="font-bold text-xs text-slate-800 tracking-tight">Menu Items</span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
          {filteredProducts.length} items
        </span>
      </div>

      {/* 2. Compact Category Pills (All, Nashta, etc.) */}
      <div className="p-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCategoryId('all')}
          className={`px-2 py-1 rounded text-[11px] font-semibold whitespace-nowrap transition-colors ${
            selectedCategoryId === 'all'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`px-2 py-1 rounded text-[11px] font-semibold whitespace-nowrap transition-colors ${
              selectedCategoryId === cat.id
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 3. Compact Items List ("chota chota") */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredProducts.map((p) => {
          const isSelected = selectedProductForQty?.id === p.id;
          const isSoldOut = p.availability === 'sold_out';

          return (
            <button
              key={p.id}
              type="button"
              disabled={isSoldOut}
              onClick={() => selectProductForQty(p)}
              className={`w-full p-2 rounded-lg border text-left transition-all flex items-center justify-between group ${
                isSelected
                  ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/20 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-500 shadow-2xs'
              } ${isSoldOut ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'}`}
            >
              <div className="min-w-0 pr-1.5">
                <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-950 truncate leading-tight">
                  {p.name}
                </div>
                {p.short_name && p.short_name !== p.name && (
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    {p.short_name}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="font-black font-mono text-xs text-emerald-800 bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-200/80">
                  {formatMoney(p.selling_price)}
                </span>
              </div>
            </button>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400">
            No items in this category
          </div>
        )}
      </div>

      {/* 4. Bottom Hint */}
      <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-[10px] text-slate-500 text-center font-mono">
        Click to set amount & add
      </div>
    </div>
  );
}
