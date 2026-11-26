'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { NotificationPreference } from '../types';
import type { Flash } from './useFlash';

export function useNotificationPreferences(flash: Flash) {
  // Notification preferences (Security + Email sections) — the backend
  // already returns only the types relevant to the caller's role, so the UI
  // renders whatever comes back instead of a hardcoded per-role list.
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference[]>([]);
  const [notificationPreferencesLoaded, setNotificationPreferencesLoaded] = useState(false);
  const [savingNotificationType, setSavingNotificationType] = useState<string | null>(null);

  const loadNotificationPreferences = async () => {
    try {
      const prefs = await api.get<NotificationPreference[]>('/notifications/preferences');
      setNotificationPreferences(prefs);
    } catch {
      /* leave the list empty if preferences can't be loaded */
    } finally {
      setNotificationPreferencesLoaded(true);
    }
  };

  async function toggleNotificationPreference(type: string) {
    const current = notificationPreferences.find((p) => p.type === type);
    if (!current) return;
    const next = !current.enabled;
    setNotificationPreferences((prev) => prev.map((p) => (p.type === type ? { ...p, enabled: next } : p)));
    setSavingNotificationType(type);
    try {
      await api.put('/notifications/preferences', { preferences: [{ type, enabled: next }] });
    } catch {
      setNotificationPreferences((prev) => prev.map((p) => (p.type === type ? { ...p, enabled: !next } : p)));
      flash('Unable to update notification preference.', 'err');
    } finally {
      setSavingNotificationType(null);
    }
  }

  useEffect(() => {
    loadNotificationPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notificationPreferences,
    notificationPreferencesLoaded,
    savingNotificationType,
    toggleNotificationPreference,
  };
}

export type NotificationPreferencesState = ReturnType<typeof useNotificationPreferences>;
