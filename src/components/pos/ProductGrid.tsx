'use client';

import React, { useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { ProductCard } from './ProductCard';
import { Product } from '@/types';
import { Utensils } from 'lucide-react';

interface ProductGridProps {
  onOpenAddons?: (product: Product) => void;
}

export function ProductGrid({ onOpenAddons }: ProductGridProps) {
  const { products, selectedCategoryId, searchQuery, isLoading } = usePOS();

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return products.filter((product) => {
      // If there is an active search query, search all products across all categories
      if (query) {
        const nameMatch = product.name.toLowerCase().includes(query);
        const shortNameMatch = product.short_name?.toLowerCase().includes(query);
        const skuMatch = product.sku?.toLowerCase().includes(query);
        const codeMatch = product.product_code?.toLowerCase().includes(query);
        return Boolean(nameMatch || shortNameMatch || skuMatch || codeMatch);
      }

      // Category match
      return selectedCategoryId === 'all' || product.category_id === selectedCategoryId;
    });
  }, [products, selectedCategoryId, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
        <span>Loading menu items...</span>
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <Utensils className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-700">No products found</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {searchQuery ? `No menu items matching "${searchQuery}"` : 'No active items in this category'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onOpenAddons={onOpenAddons} />
        ))}
      </div>
    </div>
  );
}
