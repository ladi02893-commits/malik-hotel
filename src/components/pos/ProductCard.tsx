'use client';

import React from 'react';
import { Product } from '@/types';
import { formatMoney } from '@/lib/money';
import { usePOS } from '@/context/POSContext';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onOpenAddons?: (product: Product) => void;
}

export function ProductCard({ product, onOpenAddons }: ProductCardProps) {
  const { addToCart } = usePOS();
  const isSoldOut = product.availability === 'sold_out';

  const handleClick = () => {
    if (isSoldOut) return;

    // If product has add-on groups available and callback provided, open add-on selector optionally
    // Otherwise add directly to cart
    addToCart(product);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative group p-3 rounded-lg border transition-all select-none text-left flex flex-col justify-between h-24 ${
        isSoldOut
          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
          : 'bg-white border-slate-200 hover:border-emerald-600 hover:shadow-xs active:scale-[0.99] cursor-pointer'
      }`}
    >
      {/* Top: Name & optional badge */}
      <div>
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-xs leading-tight text-slate-900 group-hover:text-emerald-900 line-clamp-2">
            {product.name}
          </h3>
          {!isSoldOut && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded bg-emerald-50 text-emerald-800 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Price & Availability */}
      <div className="flex items-end justify-between mt-1">
        <span className="font-bold text-xs text-emerald-800">
          {formatMoney(product.selling_price)}
        </span>

        {isSoldOut ? (
          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase">
            Sold Out
          </span>
        ) : (
          product.addon_groups && product.addon_groups.length > 0 && onOpenAddons && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddons(product);
              }}
              className="text-[10px] font-medium text-slate-500 hover:text-emerald-800 bg-slate-50 hover:bg-emerald-50 px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
            >
              + Extras
            </button>
          )
        )}
      </div>
    </div>
  );
}
