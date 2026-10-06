'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { POSProvider } from '@/context/POSContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toasts } from '@/components/ui/Toasts';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { AdminPinModal } from '@/components/auth/AdminPinModal';

import { ReceiptModal } from '@/components/pos/ReceiptModal';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAdminModalOpen, setIsAdminModalOpen, pendingAdminRoute } = useAuth();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans antialiased">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <AdminGuard>{children}</AdminGuard>
        </main>
      </div>
      <Toasts />
      <ReceiptModal />

      {/* Global Admin PIN Modal triggered by sidebar or header */}
      <AdminPinModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        targetRoute={pendingAdminRoute}
      />
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <POSProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </POSProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
