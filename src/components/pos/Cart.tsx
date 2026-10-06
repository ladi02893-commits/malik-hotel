'use client';

import React from 'react';
import { usePOS } from '@/context/POSContext';
import { formatMoney } from '@/lib/money';
import { Minus, Plus, Trash2, MessageSquare, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { CartItem } from '@/types';

interface CartProps {
  onOpenItemNote: (item: CartItem) => void;
  onOpenItemAddons: (item: CartItem) => void;
}

export function Cart({ onOpenItemNote, onOpenItemAddons }: CartProps) {
  const {
    cart,
    selectedCartItemId,
    setSelectedCartItemId,
    updateQuantity,
    removeFromCart,
    customerName,
    setCustomerName,
  } = usePOS();

  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editQtyValue, setEditQtyValue] = React.useState<string>('');

  const handleCommitEditQty = (itemId: string) => {
    const parsed = parseFloat(editQtyValue);
    if (!isNaN(parsed) && parsed > 0) {
      updateQuantity(itemId, Number(parsed.toFixed(2)));
    }
    setEditingItemId(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Top: Customer input bar */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer Name / Token (Optional)..."
          className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {customerName && (
          <button
            onClick={() => setCustomerName('')}
            className="text-[10px] text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 select-none space-y-2">
            <p className="text-xs font-semibold text-slate-700">Order is empty</p>
            <p className="text-[11px] text-slate-400 max-w-[220px]">
              Search or click menu items to add to bill
            </p>

            {/* Quick Keyboard Workflow Guide */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-left text-[11px] space-y-1.5 w-full">
              <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                Keyboard Shortcuts:
              </p>
              <div className="flex items-center justify-between text-slate-600">
                <span>Search Item:</span>
                <kbd className="font-mono text-[10px] bg-white border border-slate-300 px-1 rounded shadow-2xs">F2 / Type</kbd>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Select & Qty:</span>
                <kbd className="font-mono text-[10px] bg-white border border-slate-300 px-1 rounded shadow-2xs">Enter</kbd>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Delete Item:</span>
                <kbd className="font-mono text-[10px] bg-white border border-slate-300 px-1 rounded shadow-2xs">Delete</kbd>
              </div>
              <div className="flex items-center justify-between text-emerald-800 font-medium">
                <span>Print Bill:</span>
                <kbd className="font-mono text-[10px] bg-emerald-100 border border-emerald-300 text-emerald-900 px-1 rounded shadow-2xs">Shift + Enter</kbd>
              </div>
            </div>
          </div>
        ) : (
          cart.map((item) => {
            const isSelected = selectedCartItemId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedCartItemId(item.id)}
                className={`py-2 px-2.5 rounded-lg transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-50/50 border-emerald-600/70 ring-1 ring-emerald-600/20 shadow-2xs'
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                {/* Item Header: Name & Line Total */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-xs text-slate-900 leading-tight">
                        {item.name}
                      </h4>
                      {isSelected && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Active (Del to remove)</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {formatMoney(item.unit_price)} × {item.quantity}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-xs text-slate-900 font-mono">
                      {formatMoney(item.line_total)}
                    </span>
                  </div>
                </div>

                {/* Addons List if any */}
                {item.addons && item.addons.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {item.addons.map((a) => (
                      <div
                        key={a.addon_id}
                        className="text-[10px] text-emerald-800 flex items-center justify-between pl-2 border-l border-emerald-300"
                      >
                        <span>+ {a.name}</span>
                        <span className="font-mono">+{formatMoney(a.price * a.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Note if any */}
                {item.note && (
                  <div className="mt-1 text-[11px] text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 inline-flex items-center gap-1">
                    <MessageSquare className="w-2.5 h-2.5 text-amber-700" />
                    <span>Note: {item.note}</span>
                  </div>
                )}

                {/* Item Actions & Stepper */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                  {/* Modifiers Buttons (Note, Extras) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenItemNote(item);
                      }}
                      className="p-1 rounded text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 border border-slate-200"
                      title="Add item kitchen note"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{item.note ? 'Edit Note' : 'Note'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenItemAddons(item);
                      }}
                      className="p-1 rounded text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 border border-slate-200"
                      title="Add extras"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Extras</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors ml-1"
                      title="Remove item (Delete)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Stepper − 2 + */}
                  <div className="flex items-center border border-slate-300 rounded overflow-hidden shadow-2xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        let newQ = item.quantity;
                        if (item.quantity > 1) {
                          newQ = item.quantity % 1 !== 0 ? Math.floor(item.quantity) : item.quantity - 1;
                        } else if (item.quantity === 1) {
                          newQ = 0.5;
                        } else if (item.quantity === 0.5) {
                          newQ = 0.25;
                        } else {
                          removeFromCart(item.id);
                          return;
                        }
                        updateQuantity(item.id, newQ);
                      }}
                      className="w-6 h-6 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
                      title="Decrease quantity (-)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    {editingItemId === item.id ? (
                      <input
                        type="number"
                        step="0.25"
                        min="0.1"
                        autoFocus
                        value={editQtyValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditQtyValue(e.target.value)}
                        onBlur={() => handleCommitEditQty(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommitEditQty(item.id);
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                        className="w-12 text-center font-mono text-xs font-bold text-slate-900 bg-emerald-50 focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItemId(item.id);
                          setEditQtyValue(String(item.quantity));
                        }}
                        className="w-9 text-center font-mono text-xs font-semibold text-slate-900 bg-white hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer select-none"
                        title="Click to type quantity directly"
                      >
                        {item.quantity}
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        let newQ = item.quantity;
                        if (item.quantity < 0.5) {
                          newQ = 0.5;
                        } else if (item.quantity < 1) {
                          newQ = 1;
                        } else {
                          newQ = item.quantity % 1 !== 0 ? Math.ceil(item.quantity) : item.quantity + 1;
                        }
                        updateQuantity(item.id, newQ);
                      }}
                      className="w-6 h-6 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
                      title="Increase quantity (+)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
