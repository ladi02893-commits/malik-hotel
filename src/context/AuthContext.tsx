'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { hasPermission } from '@/lib/permissions';

interface AuthContextType {
  user: UserProfile | null;
  currentUser: UserProfile | null;
  profiles: UserProfile[];
  role: UserRole;
  isLoading: boolean;
  isAdminUnlocked: boolean;
  isAdminModalOpen: boolean;
  pendingAdminRoute: string | null;
  setIsAdminModalOpen: (open: boolean) => void;
  setPendingAdminRoute: (route: string | null) => void;
  unlockAdmin: (pinCode: string) => Promise<{ success: boolean; error?: string }>;
  lockAdmin: () => void;
  updateAdminPin: (pinCode: string) => Promise<{ success: boolean; error?: string }>;
  can: (permission: string) => boolean;
  switchUser: (profileId: string, pinCode?: string) => Promise<{ success: boolean; error?: string }>;
  verifySupervisorPin: (pinCode: string) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [pendingAdminRoute, setPendingAdminRoute] = useState<string | null>(null);

  const refreshAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error('Failed to load auth session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
    if (typeof window !== 'undefined') {
      const unlocked = sessionStorage.getItem('pos_admin_unlocked') === 'true';
      setIsAdminUnlocked(unlocked);
    }
  }, []);

  const unlockAdmin = async (pinCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', pin_code: pinCode }),
      });
      const data = await res.json();
      if (data.success && data.verified) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pos_admin_unlocked', 'true');
        }
        setIsAdminUnlocked(true);
        setIsAdminModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Incorrect Admin PIN' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification failed' };
    }
  };

  const lockAdmin = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pos_admin_unlocked');
    }
    setIsAdminUnlocked(false);
  };

  const updateAdminPin = async (newPin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_admin_pin', pin_code: newPin }),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update PIN' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update PIN' };
    }
  };

  const can = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const switchUser = async (profileId: string, pinCode?: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_user', profile_id: profileId, pin_code: pinCode }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to switch user' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const verifySupervisorPin = async (pinCode: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', pin_code: pinCode }),
      });
      const data = await res.json();
      return Boolean(data.success && data.verified);
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user,
        profiles,
        role: user?.role || 'cashier',
        isLoading,
        isAdminUnlocked,
        isAdminModalOpen,
        pendingAdminRoute,
        setIsAdminModalOpen,
        setPendingAdminRoute,
        unlockAdmin,
        lockAdmin,
        updateAdminPin,
        can,
        switchUser,
        verifySupervisorPin,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
