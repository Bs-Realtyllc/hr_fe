'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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

  async function load() {
    const { result } = await api.get<ClockResponse>('/clock');
    applyRecord(result);
  }

  useEffect(() => {
    load().catch(() => setStatus('idle')).finally(() => setLoading(false));
  }, []);

  function applyRecord(result: ClockRecord) {
    setStatus(result.status);
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
      <div className={`tracker-live-time tracker-live-time-${status}`}>{formatHMS(displaySeconds)}</div>
      {status === 'idle' && displaySeconds > 0 && (
        <div className="tracker-live-caption">Logged {formatHMS(displaySeconds)} earlier today — clock in again to add another shift.</div>
      )}

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

      {reasonError && <div className="tracker-live-error">{reasonError}</div>}
    </div>
  );
}
