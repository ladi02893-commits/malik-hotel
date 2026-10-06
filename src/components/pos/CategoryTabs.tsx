'use client';

import React from 'react';
import { usePOS } from '@/context/POSContext';

export function CategoryTabs() {
  const { categories, selectedCategoryId, setSelectedCategoryId, products } = usePOS();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin select-none">
      <button
        onClick={() => setSelectedCategoryId('all')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
          selectedCategoryId === 'all'
            ? 'bg-slate-900 text-white font-semibold shadow-xs'
            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
        }`}
      >
        <span>All Items</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            selectedCategoryId === 'all' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {products.length}
        </span>
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        const count = products.filter((p) => p.category_id === cat.id).length;

        return (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              isSelected
                ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{cat.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
