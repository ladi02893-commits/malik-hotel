'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Delete, ArrowLeft, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoute?: string | null;
  onSuccess?: () => void;
}

export function AdminPinModal({ isOpen, onClose, targetRoute, onSuccess }: AdminPinModalProps) {
  const { unlockAdmin } = useAuth();
  const router = useRouter();

  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShake, setIsShake] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsVerifying(false);
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMsg('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleSubmit = async (pinToVerify?: string) => {
    const code = pinToVerify || pin;
    if (!code || code.length < 4) {
      setErrorMsg('Please enter at least 4 digits');
      triggerShake();
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    const res = await unlockAdmin(code);
    setIsVerifying(false);

    if (res.success) {
      onSuccess?.();
      onClose();
      if (targetRoute) {
        router.push(targetRoute);
      }
    } else {
      setErrorMsg(res.error || 'Incorrect Admin PIN');
      triggerShake();
      setPin('');
      hiddenInputRef.current?.focus();
    }
  };

  const triggerShake = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  // Keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        setPin((prev) => {
          const next = prev + e.key;
          if (next.length === 4) {
            // Auto submit when 4 digits reached if desired, or let user press Enter
            setTimeout(() => handleSubmit(next), 50);
          }
          return next.slice(0, 6);
        });
        setErrorMsg('');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      {/* Hidden input to ensure soft keyboards or physical keyboards focus */}
      <input
        ref={hiddenInputRef}
        type="password"
        className="opacity-0 absolute pointer-events-none -top-10"
        value={pin}
        onChange={() => {}}
        autoFocus
      />

      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden transition-transform ${
          isShake ? 'animate-bounce' : ''
        }`}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-base font-bold tracking-tight">Admin Portal Locked</h2>
          <p className="text-xs text-slate-300 mt-1">Enter Manager / Admin PIN code to access</p>
        </div>

        {/* PIN Dots Display */}
        <div className="p-6 pb-2 text-center">
          <div className="flex justify-center items-center gap-3.5 mb-3">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-emerald-600 scale-125 shadow-sm'
                      : 'border-2 border-slate-300 bg-slate-100'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-red-600 font-medium py-1">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">Default PIN: 1234</p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={isVerifying}
                className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 font-mono font-bold text-lg text-slate-800 transition-all active:scale-95 shadow-2xs"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              disabled={isVerifying || pin.length === 0}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-500 transition-all active:scale-95 disabled:opacity-40"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isVerifying}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 font-mono font-bold text-lg text-slate-800 transition-all active:scale-95 shadow-2xs"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isVerifying || pin.length === 0}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 transition-all active:scale-95 disabled:opacity-40"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to POS</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isVerifying || pin.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isVerifying ? (
              <span>Verifying...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Unlock (Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
