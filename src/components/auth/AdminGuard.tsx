'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminPinModal } from '@/components/auth/AdminPinModal';
import { Lock, ShieldAlert, ArrowLeft } from 'lucide-react';

const ADMIN_ROUTES = [
  '/dashboard',
  '/daily-summary',
  '/purchases',
  '/vendors',
  '/products',
  '/categories',
  '/orders',
  '/refunds',
  '/register',
  '/reports',
  '/settings',
];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdminUnlocked, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdminRoute = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If page is still mounting or loading auth session
  if (!mounted || isLoading) {
    if (isAdminRoute && !isAdminUnlocked) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-100/50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Checking authorization...</p>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  // If on an Admin route and Admin is locked
  if (isAdminRoute && !isAdminUnlocked) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-100/60 select-none">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">Admin Section Locked</h2>
            <p className="text-xs text-slate-500 mt-1">
              Yeh section admin PIN se protected hai. Sirf authorized manager / owner access kar sakta hai.
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 text-left">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Products, categories, reports, settings aur billing records PIN ke baghair access nahi kiye jaa sakte.</span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => router.push('/pos')}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to POS</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Enter Admin PIN
            </button>
          </div>
        </div>

        <AdminPinModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          targetRoute={pathname}
          onSuccess={() => {
            setIsModalOpen(false);
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
