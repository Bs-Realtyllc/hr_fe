'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { LoginHistory } from '../components/security/LoginHistoryModal';
import type { Flash } from './useFlash';

export function useLoginHistory(flash: Flash) {
  // Login history (Login Sessions -> Manage)
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  // Admins can switch between their own sessions and the company-wide list.
  const [loginHistoryView, setLoginHistoryView] = useState<'own' | 'all'>('own');

  async function fetchLoginHistory(view: 'own' | 'all') {
    // Clear rows from the previous load so stale data isn't shown while loading.
    setLoginHistory([]);
    setLoginHistoryView(view);
    setLoginHistoryLoading(true);

    const endpoint = view === 'all'
      ? '/auth/admin/login-history'
      : '/auth/login-history';

    try {
      const data = await api.get<{ entries: LoginHistory[] }>(endpoint);
      setLoginHistory(data.entries ?? []);
    } catch {
      flash('Unable to load login history.', 'err');
    } finally {
      setLoginHistoryLoading(false);
    }
  }

  function openLoginHistory() {
    setShowLoginHistory(true);
    // Always default to the user's own sessions, even for admins.
    fetchLoginHistory('own');
  }

  return {
    showLoginHistory,
    setShowLoginHistory,
    loginHistory,
    loginHistoryLoading,
    loginHistoryView,
    fetchLoginHistory,
    openLoginHistory,
  };
}

export type LoginHistoryState = ReturnType<typeof useLoginHistory>;
