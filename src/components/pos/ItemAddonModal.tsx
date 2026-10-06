'use client';

import React, { useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import { CartItem, Product, SelectedAddon } from '@/types';
import { formatMoney } from '@/lib/money';
import { X, Sparkles, Check } from 'lucide-react';

interface ItemAddonModalProps {
  item: CartItem | null;
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemAddonModal({ item, product, isOpen, onClose }: ItemAddonModalProps) {
  const { products, updateItemAddons, addToCart } = usePOS();

  // Find product model
  const activeProduct = product || (item ? products.find((p) => p.id === item.product_id) : null);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  useEffect(() => {
    if (item) {
      setSelectedAddons(item.addons || []);
    } else {
      setSelectedAddons([]);
    }
  }, [item, isOpen]);

  if (!isOpen || !activeProduct) return null;

  const addonGroups = activeProduct.addon_groups || [];

  const handleToggleAddon = (addon: { id: string; name: string; price: number }) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.addon_id === addon.id);
      if (exists) {
        return prev.filter((a) => a.addon_id !== addon.id);
      } else {
        return [
          ...prev,
          {
            addon_id: addon.id,
            name: addon.name,
            price: addon.price,
            quantity: 1,
          },
        ];
      }
    });
  };

  const handleSave = () => {
    if (item) {
      updateItemAddons(item.id, selectedAddons);
    } else if (activeProduct) {
      addToCart(activeProduct, selectedAddons);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Extras: {activeProduct.name}</span>
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Addon Groups & Items */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {addonGroups.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No extras configured for this item.</p>
          ) : (
            addonGroups.map((group) => (
              <div key={group.id} className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {group.name}
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {group.addons?.map((addon) => {
                    const isSelected = selectedAddons.some((a) => a.addon_id === addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => handleToggleAddon(addon)}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs">{addon.name}</span>
                        </div>
                        <span className="text-xs font-mono font-medium text-emerald-800">
                          +{formatMoney(addon.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-colors"
          >
            Save Extras
          </button>
        </div>
      </div>
    </div>
  );
}
