'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { Flash } from './useFlash';

// The company's Google Calendar connection (hr_be /google/*). One Google
// account for the whole app: every meeting is created on its calendar, so
// only admins manage it (Profile → Integrations).

interface GoogleStatus {
  connected: boolean;
  /** Google is pushing changes to us (needs GOOGLE_WEBHOOK_URL on the backend) */
  webhookActive: boolean;
}

export type GoogleCalendarAction = 'connect' | 'sync' | 'disconnect';

export function useGoogleCalendar(flash: Flash) {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<GoogleCalendarAction | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await api.get<GoogleStatus>('/google/status'));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  /** Sends the admin to Google's consent screen; Google returns them to /profile?tab=integrations. */
  const connect = async () => {
    setBusy('connect');
    try {
      const { url } = await api.get<{ url: string }>('/google/auth-url');
      window.location.href = url;
    } catch (err) {
      flash(errorMessage(err, 'Unable to start the Google connection.'), 'err');
      setBusy(null);
    }
  };

  /** Pulls events from Google Calendar into meetings (from 7 days ago on). */
  const sync = async () => {
    setBusy('sync');
    try {
      const { synced } = await api.post<{ synced: number }>('/google/sync', {});
      flash(`Synced ${synced} ${synced === 1 ? 'event' : 'events'} from Google Calendar.`);
    } catch (err) {
      flash(errorMessage(err, 'Unable to sync with Google Calendar.'), 'err');
      loadStatus(); // e.g. the token was revoked on Google's side
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    try {
      await api.delete('/google/disconnect');
      flash('Google Calendar disconnected.');
      await loadStatus();
    } catch (err) {
      flash(errorMessage(err, 'Unable to disconnect Google Calendar.'), 'err');
    } finally {
      setBusy(null);
    }
  };

  return { status, loadFailed, busy, loadStatus, connect, sync, disconnect };
}
