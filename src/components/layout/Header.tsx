'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { formatTime, formatDate } from '@/lib/dates';
import {
  User,
  LogOut,
  CheckCircle,
  AlertCircle,
  CircleDot,
  Lock,
  Unlock,
  Calculator,
} from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected, activeRegister, setIsRegisterOpenModalOpen } = usePOS();
  const { user, profiles, switchUser, isAdminUnlocked, lockAdmin, setIsAdminModalOpen, setPendingAdminRoute } = useAuth();
  const { businessSettings } = useSettings();

  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-13 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20 no-print flex-shrink-0">
      {/* Left: Business Title & Clock */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
          <h1 className="font-bold text-slate-900 text-sm tracking-tight">
            {businessSettings.business_name || 'Malik Tasty Nashta Point'}
          </h1>
        </div>

        <div className="hidden md:flex items-center text-xs text-slate-500 gap-1.5 border-l border-slate-200 pl-3">
          {mounted && currentTime ? (
            <>
              <span suppressHydrationWarning>{formatDate(currentTime)}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono font-medium text-slate-700" suppressHydrationWarning>
                {formatTime(currentTime)}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Right: POS Shortcut, Admin Mode, Register Status, Connection, User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Quick jump to POS if on any other page */}
        {pathname !== '/pos' && (
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>POS Billing</span>
          </Link>
        )}

        {/* Admin Mode Indicator & Lock Button */}
        {isAdminUnlocked ? (
          <button
            type="button"
            onClick={() => {
              lockAdmin();
              if (pathname !== '/pos' && pathname !== '/held-orders') {
                router.push('/pos');
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition-colors"
            title="Admin mode active. Click to lock."
          >
            <Unlock className="w-3 h-3 text-purple-600" />
            <span className="hidden sm:inline">Admin Mode</span>
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold border border-red-200">
              Lock 🔒
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPendingAdminRoute('/dashboard');
              setIsAdminModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-200 transition-colors"
            title="Click to unlock Admin Portal"
          >
            <Lock className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">Admin: Locked</span>
            <span className="text-[10px] bg-amber-100 text-amber-900 px-1 rounded font-bold border border-amber-200">
              PIN
            </span>
          </button>
        )}

        {/* Register Indicator */}
        <div className="flex items-center gap-1.5">
          {activeRegister ? (
            <button
              onClick={() => {}}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold"
            >
              <CircleDot className="w-3 h-3 text-emerald-600 animate-pulse" />
              <span>Register: OPEN</span>
            </button>
          ) : (
            <button
              onClick={() => setIsRegisterOpenModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Register: CLOSED (Click to Open)</span>
            </button>
          )}
        </div>

        {/* Backend Connection Status */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 px-2 py-1 rounded bg-slate-50 border border-slate-200">
          {isConnected ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">InsForge: Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="font-medium text-red-600">InsForge: Problem</span>
            </>
          )}
        </div>

        {/* User Profile & Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800 transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
              <User className="w-3 h-3" />
            </div>
            <span>{user?.display_name || user?.full_name || 'Admin'}</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {user?.role || 'admin'}
            </span>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg border border-slate-200 shadow-md py-1 z-30">
              <div className="px-3 py-1.5 border-b border-slate-100 text-xs">
                <p className="font-semibold text-slate-800">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
              </div>

              <div className="py-1">
                <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Active Cashier
                </p>
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchUser(p.id, p.pin_code);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      p.id === user?.id ? 'font-semibold text-emerald-800 bg-emerald-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{p.display_name || p.full_name}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{p.role}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => setShowUserDropdown(false)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Close Menu</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
