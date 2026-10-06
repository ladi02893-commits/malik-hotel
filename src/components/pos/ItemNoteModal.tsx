'use client';

import React, { useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import { CartItem } from '@/types';
import { X, MessageSquare, Plus } from 'lucide-react';

interface ItemNoteModalProps {
  item: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemNoteModal({ item, isOpen, onClose }: ItemNoteModalProps) {
  const { updateItemNote, quickNotes } = usePOS();
  const [noteText, setNoteText] = useState<string>('');

  useEffect(() => {
    if (item) {
      setNoteText(item.note || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    updateItemNote(item.id, noteText);
    onClose();
  };

  const handleChipClick = (chip: string) => {
    if (!noteText.trim()) {
      setNoteText(chip);
    } else if (!noteText.includes(chip)) {
      setNoteText(`${noteText}, ${chip}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-800" />
              <span>Kitchen Note: {item.name}</span>
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Quick chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Quick Kitchen Notes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickNotes.map((qn) => (
                <button
                  key={qn.id}
                  type="button"
                  onClick={() => handleChipClick(qn.text)}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 border border-slate-200 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-slate-400" />
                  <span>{qn.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom text */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Custom Instruction / Note
            </label>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Extra crispy, mirch kam, garma garam..."
              className="w-full px-3 py-2 text-xs text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setNoteText('');
              updateItemNote(item.id, '');
              onClose();
            }}
            className="text-xs text-red-600 hover:underline"
          >
            Clear Note
          </button>

          <div className="flex items-center gap-2">
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
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
