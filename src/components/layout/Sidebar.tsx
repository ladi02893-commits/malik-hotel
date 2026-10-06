'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Calculator,
  Receipt,
  Clock,
  RotateCcw,
  Landmark,
  UtensilsCrossed,
  Tags,
  BarChart3,
  Settings,
  Lock,
  Unlock,
  Shield,
  Truck,
  Users,
  BadgeDollarSign,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { heldOrdersCount } = usePOS();
  const { isAdminUnlocked, lockAdmin, setIsAdminModalOpen, setPendingAdminRoute } = useAuth();

  const counterNav = [
    { label: 'POS Billing', href: '/pos', icon: Calculator, badge: null },
    { label: 'Hold Orders', href: '/held-orders', icon: Clock, badge: heldOrdersCount > 0 ? heldOrdersCount : null },
  ];

  const adminNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Daily Hisaab', href: '/daily-summary', icon: BadgeDollarSign },
    { label: 'Maal Entry (Purchases)', href: '/purchases', icon: Truck },
    { label: 'Vendors (Khata)', href: '/vendors', icon: Users },
    { label: 'Products', href: '/products', icon: UtensilsCrossed },
    { label: 'Categories', href: '/categories', icon: Tags },
    { label: 'Orders History', href: '/orders', icon: Receipt },
    { label: 'Refunds', href: '/refunds', icon: RotateCcw },
    { label: 'Cash Register', href: '/register', icon: Landmark },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleAdminNavClick = (e: React.MouseEvent, href: string) => {
    if (!isAdminUnlocked) {
      e.preventDefault();
      setPendingAdminRoute(href);
      setIsAdminModalOpen(true);
    }
  };

  const handleLockAdmin = () => {
    lockAdmin();
    if (pathname !== '/pos' && pathname !== '/held-orders') {
      router.push('/pos');
    }
  };

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col justify-between py-3 z-10 flex-shrink-0 no-print select-none overflow-y-auto">
      <div className="space-y-4 px-2">
        {/* ================= 1. COUNTER BILLING (Always Unlocked) ================= */}
        <div>
          <div className="px-3 py-1 mb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Counter POS</p>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
              Active
            </span>
          </div>

          <div className="space-y-1">
            {counterNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-emerald-700'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white text-emerald-900' : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ================= 2. ADMIN PORTAL (PIN Protected) ================= */}
        <div className="pt-2 border-t border-slate-100">
          <div className="px-3 py-1 mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-slate-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin Portal</p>
            </div>

            {isAdminUnlocked ? (
              <button
                type="button"
                onClick={handleLockAdmin}
                title="Click to lock admin mode"
                className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold px-1.5 py-0.5 rounded transition-colors"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Lock</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPendingAdminRoute('/dashboard');
                  setIsAdminModalOpen(true);
                }}
                title="Enter PIN to unlock"
                className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold px-1.5 py-0.5 rounded transition-colors"
              >
                <Lock className="w-2.5 h-2.5 text-amber-600" />
                <span>PIN</span>
              </button>
            )}
          </div>

          {/* Admin Unlocked Banner */}
          {isAdminUnlocked && (
            <div className="mx-2 mb-2 p-1.5 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
              <span className="font-semibold flex items-center gap-1">
                <Unlock className="w-3 h-3 text-emerald-700" />
                Admin Unlocked
              </span>
            </div>
          )}

          <div className="space-y-1">
            {adminNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleAdminNavClick(e, item.href)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {!isAdminUnlocked && (
                    <Lock className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400">
        <p className="font-medium text-slate-600">Malik Tasty Nashta Point</p>
        <p className="text-[10px]">Vehari Road, Hasilpur</p>
      </div>
    </aside>
  );
}
