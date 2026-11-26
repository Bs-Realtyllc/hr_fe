'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { showToast } from '@/lib/toast';
import { getPosition, geolocationErrorMessage } from '@/lib/geolocation';

interface PauseType {
  pause: string;
  resume: string | null;
  reason: string;
  pauseDuration: number | null;
}

interface ClockRecord {
  employeeId: number;
  clockIn: string | null;
  totalPauseDuration: number | null;
  totalSecondsEarlierToday: number;
  status: 'idle' | 'paused' | 'running';
  pauses: PauseType[];
  // Ground truth for the "still working?" prompt the desktop tracker app
  // shows — null/null means no prompt is currently active. Comes straight
  // from GET /clock so this tab is correct even if it missed the socket
  // nudge below (closed tab, brief disconnect, etc).
  idlePromptStartedAt: string | null;
  idlePromptResponseSeconds: number | null;
}

interface ClockResponse {
  result: ClockRecord;
}

type ClockStatus = 'idle' | 'running' | 'paused';

function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatMinSec(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function diffSeconds(from: string, to: string | number): number {
  const toMs = typeof to === 'number' ? to : new Date(to).getTime();
  return Math.max(0, Math.floor((toMs - new Date(from).getTime()) / 1000));
}

const STATUS_BADGE: Record<ClockStatus, string> = {
  idle: 'badge badge-neutral',
  running: 'badge badge-info',
  paused: 'badge badge-warning',
};

const STATUS_LABEL: Record<ClockStatus, string> = {
  idle: 'Not clocked in',
  running: 'Working',
  paused: 'On a break',
};

function Icon({ name }: { name: string }) {
  return (
    <span
      className="icon-mask"
      style={{ WebkitMaskImage: `url(/icons/${name}.svg)`, maskImage: `url(/icons/${name}.svg)` }}
    />
  );
}

export default function LiveTracker() {
  const [status, setStatus] = useState<ClockStatus>('idle');
  const [baseSeconds, setBaseSeconds] = useState(0);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [idlePromptStartedAt, setIdlePromptStartedAt] = useState<string | null>(null);
  const [idlePromptResponseSeconds, setIdlePromptResponseSeconds] = useState<number | null>(null);
  const [idleRemainingSeconds, setIdleRemainingSeconds] = useState(0);
  const [idleConfirming, setIdleConfirming] = useState(false);
  const actionLoadingRef = useRef(false);

  async function load() {
    const { result } = await api.get<ClockResponse>('/clock');
    applyRecord(result);
  }

  useEffect(() => {
    load().catch(() => setStatus('idle')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    actionLoadingRef.current = actionLoading;
  }, [actionLoading]);

  // Keeps this tab in sync with a shift that changed state elsewhere (the
  // desktop app, or another browser tab) — without this, clocking out on
  // one device leaves every other open view stuck showing "Working"
  // indefinitely, since the only other fetch is the one on mount.
  useEffect(() => {
    const id = setInterval(() => {
      if (actionLoadingRef.current) return; // don't race a click already in flight
      load().catch(() => {}); // transient error — try again next tick
    }, 20000);
    return () => clearInterval(id);
  }, []);

  // Low-latency nudges — both only ever shortcuts to update sooner than the
  // next 20s poll above would. If this socket is down or a message is
  // missed, the regular poll still picks up the correct state straight
  // from GET /clock.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace(/\/api$/, '');
    const socket: Socket = io(wsUrl, { path: '/ws/inbox', auth: { token }, transports: ['websocket'] });
    socket.on('tracker:idle-sync', (payload: { idlePromptStartedAt: string | null; idlePromptResponseSeconds: number | null }) => {
      setIdlePromptStartedAt(payload.idlePromptStartedAt);
      setIdlePromptResponseSeconds(payload.idlePromptResponseSeconds);
    });
    // A resume/pause/clock-in/out happened — on this tab or elsewhere
    // (the desktop app, another browser tab) — re-fetch now instead of
    // waiting for the next poll tick.
    socket.on('clock:sync', () => {
      load().catch(() => {});
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // Countdown display only — the real deadline lives on the backend (the
  // desktop app's own local timer is what actually auto-pauses).
  useEffect(() => {
    if (!idlePromptStartedAt || idlePromptResponseSeconds == null) {
      setIdleRemainingSeconds(0);
      return;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(idlePromptStartedAt).getTime()) / 1000);
      setIdleRemainingSeconds(Math.max(0, idlePromptResponseSeconds - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [idlePromptStartedAt, idlePromptResponseSeconds]);

  function applyRecord(result: ClockRecord) {
    setStatus(result.status);
    setIdlePromptStartedAt(result.idlePromptStartedAt);
    setIdlePromptResponseSeconds(result.idlePromptResponseSeconds);
    const totalPause = result.totalPauseDuration ?? 0;
    const banked = result.totalSecondsEarlierToday ?? 0;

    if (result.status === 'paused' && result.clockIn) {
      const openPause = result.pauses.find((p) => !p.resume);
      const freezePoint = openPause ? openPause.pause : new Date().toISOString();
      setBaseSeconds(banked + diffSeconds(result.clockIn, freezePoint) - totalPause);
      setSegmentStart(null);
      return;
    }
    if (result.status === 'running' && result.clockIn) {
      const now = Date.now();
      setBaseSeconds(banked + diffSeconds(result.clockIn, now) - totalPause);
      setSegmentStart(now);
      return;
    }
    // idle — may still carry banked time from an earlier shift today
    setBaseSeconds(banked);
    setSegmentStart(null);
  }

  // Tick while running
  useEffect(() => {
    if (status !== 'running' || segmentStart === null) return;
    const tick = () =>
      setDisplaySeconds(baseSeconds + Math.floor((Date.now() - segmentStart) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, segmentStart, baseSeconds]);

  // Freeze display whenever not running
  useEffect(() => {
    if (status === 'paused' || status === 'idle') {
      setDisplaySeconds(baseSeconds);
    }
  }, [status, baseSeconds]);

  // Stay in sync with the header clock pill if that's what clocked in.
  useEffect(() => {
    const handler = (e: Event) => {
      const { clockInTime } = (e as CustomEvent).detail;
      setStatus('running');
      setSegmentStart(new Date(clockInTime).getTime());
    };
    window.addEventListener('clockIn', handler);
    return () => window.removeEventListener('clockIn', handler);
  }, []);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const pos = await getPosition();
      const { clockInTime } = await api.post<{ clockInTime: string }>('/clock/in', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setStatus('running');
      setSegmentStart(new Date(clockInTime).getTime());
      window.dispatchEvent(new CustomEvent('clockIn', { detail: { clockInTime } }));
      showToast('success', 'Clocked in!');
    } catch (err) {
      showToast('error', geolocationErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!pauseReason.trim()) {
      setReasonError('Please specify a reason for the pause.');
      return;
    }
    setReasonError('');
    setActionLoading(true);
    try {
      await api.post('/clock/pause', { reason: pauseReason });
      setPauseReason('');
      setStatus('paused');
      showToast('success', 'Break started');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not pause');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await api.post('/clock/resume', {});
      setSegmentStart(Date.now());
      setStatus('running');
      showToast('success', 'Welcome back');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not resume');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIdleConfirm = async () => {
    setIdleConfirming(true);
    try {
      await api.post('/clock/idle-confirm', {});
      // Optimistic — the server-side clear + nudge to other devices (the
      // desktop app) is in flight; the next poll reconciles regardless.
      setIdlePromptStartedAt(null);
      setIdlePromptResponseSeconds(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not confirm');
    } finally {
      setIdleConfirming(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const pos = await getPosition();
      await api.post('/clock/out', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      showToast('success', 'Clocked out!');
      // Re-fetch so banked time picks up the shift that just ended and
      // status drops back to idle — another shift can start later today.
      await load();
    } catch (err) {
      showToast('error', geolocationErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="card tracker-live-card tracker-live-skeleton" />;
  }

  return (
    <div className="card tracker-live-card">
      <div className="card-title">Today</div>
      <span className={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</span>

      <div className="tracker-live-row">
        <div className={`tracker-live-time tracker-live-time-${status}`}>{formatHMS(displaySeconds)}</div>

        <div className="tracker-live-actions">
          {status === 'idle' && (
            <button className="btn btn-primary" disabled={actionLoading} onClick={handleClockIn}>
              <Icon name="play-circle" />
              {actionLoading ? 'Clocking in…' : 'Clock In'}
            </button>
          )}

          {status === 'running' && (
            <>
              <input
                className="form-input tracker-pause-input"
                placeholder="Reason for pausing…"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
              />
              <button className="btn btn-ghost" disabled={actionLoading} onClick={handlePause}>
                <Icon name="pause-circle" />
                Pause
              </button>
              <button className="btn btn-primary" disabled={actionLoading} onClick={handleClockOut}>
                <Icon name="stop-circle" />
                {actionLoading ? 'Clocking out…' : 'Clock Out'}
              </button>
            </>
          )}

          {status === 'paused' && (
            <>
              <button className="btn btn-ghost" disabled={actionLoading} onClick={handleResume}>
                <Icon name="play-circle" />
                Resume
              </button>
              <button className="btn btn-primary" disabled={actionLoading} onClick={handleClockOut}>
                <Icon name="stop-circle" />
                {actionLoading ? 'Clocking out…' : 'Clock Out'}
              </button>
            </>
          )}
        </div>
      </div>

      {status === 'idle' && displaySeconds > 0 && (
        <div className="tracker-live-caption">Logged {formatHMS(displaySeconds)} earlier today. Clock in again to add another shift.</div>
      )}
      {reasonError && <div className="tracker-live-error">{reasonError}</div>}

      {status === 'running' && idlePromptStartedAt && (
        <div className="tracker-idle-banner">
          <div className="tracker-idle-banner-text">
            <span className="tracker-idle-banner-title">Still working?</span>
            <span className="tracker-live-caption">No activity has been detected for a while. Let us know you&apos;re still here.</span>
          </div>
          <div className="tracker-idle-banner-countdown">{formatMinSec(idleRemainingSeconds)}</div>
          <button className="btn btn-primary" disabled={idleConfirming} onClick={handleIdleConfirm}>
            {idleConfirming ? 'Confirming…' : "Yes, I'm here"}
          </button>
        </div>
      )}
    </div>
  );
}
