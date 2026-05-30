'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface CalEvent {
  date: string;
  label: string;
  type: 'leave' | 'event' | 'milestone' | 'meeting' | 'birthday';
  sub?: string;
  meetLink?: string;
  meetingId?: number;
}

interface Meeting {
  id: number;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  attendees: string[] | null;
  meet_link: string | null;
  creator_name: string | null;
}

interface GoogleStatus {
  connected: boolean;
  webhookActive: boolean;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  leave:     { color: '#d97706', bg: '#fef3c7', icon: '🏖' },
  meeting:   { color: '#6366f1', bg: '#eef2ff', icon: '📹' },
  event:     { color: '#0ea5e9', bg: '#e0f2fe', icon: '✦'  },
  milestone: { color: '#ef4444', bg: '#fee2e2', icon: '🎯' },
  birthday:  { color: '#ec4899', bg: '#fdf2f8', icon: '🎂' },
};

function typeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.event;
}

// ── Schedule Meeting Modal ─────────────────────────────────────────────────
interface ScheduleModalProps {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}

function ScheduleModal({ defaultDate, onClose, onCreated }: ScheduleModalProps) {
  const [form, setForm] = useState({
    title: '', description: '', date: defaultDate,
    startTime: '10:00', endTime: '10:30', attendees: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.title || !form.date || !form.startTime || !form.endTime) {
      setError('Title, date, and times are required.'); return;
    }
    setLoading(true);
    try {
      await api.post('/google/meetings', {
        title: form.title,
        description: form.description,
        start_datetime: `${form.date}T${form.startTime}:00`,
        end_datetime:   `${form.date}T${form.endTime}:00`,
        attendees: form.attendees
          ? form.attendees.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      });
      onCreated();
    } catch {
      setError('Failed to create meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(2px)',
    }} onClick={onClose}>
      <div className="card" style={{ width: 460, maxWidth: '95vw', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>📅 Schedule Meeting</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Meeting title" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" style={{ resize: 'vertical', minHeight: 56 }}
              value={form.description} onChange={set('description')} placeholder="Optional agenda" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" value={form.date} onChange={set('date')} />
            </div>
            <div className="form-group">
              <label className="form-label">Start *</label>
              <input type="time" className="form-input" value={form.startTime} onChange={set('startTime')} />
            </div>
            <div className="form-group">
              <label className="form-label">End *</label>
              <input type="time" className="form-input" value={form.endTime} onChange={set('endTime')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Attendees <span className="text-muted" style={{ fontWeight: 400 }}>(comma-separated emails)</span></label>
            <input className="form-input" value={form.attendees} onChange={set('attendees')}
              placeholder="alice@co.com, bob@co.com" />
          </div>
          {error && <p style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today   = new Date();
  const user    = getUser();
  const isAdmin = user?.role === 'admin';
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing]     = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);

  useEffect(() => {
    api.get<GoogleStatus>('/google/status').then(setGoogleStatus).catch(() => null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected')) {
      window.history.replaceState({}, '', '/calendar');
      api.get<GoogleStatus>('/google/status').then(setGoogleStatus).catch(() => null);
      handleSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEvents = useCallback(() => {
    Promise.all([
      api.get<{ employee_name: string; start_date: string; end_date: string; leave_type: string }[]>('/leaves?status=approved').catch(() => []),
      api.get<{ event_date: string; title: string; event_type: string }[]>('/events').catch(() => []),
      api.get<Meeting[]>('/google/meetings').catch(() => []),
    ]).then(([leaves, evts, meetings]) => {
      const cal: CalEvent[] = [];

      for (const l of leaves) {
        const s = new Date(l.start_date), e = new Date(l.end_date);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          cal.push({ date: d.toISOString().split('T')[0], label: l.employee_name, type: 'leave', sub: l.leave_type });
        }
      }

      for (const ev of evts) {
        const type = ev.event_type === 'birthday' ? 'birthday' :
                     ev.event_type === 'milestone' ? 'milestone' : 'event';
        cal.push({ date: ev.event_date.split('T')[0], label: ev.title, type, sub: ev.event_type });
      }

      for (const m of meetings) {
        cal.push({
          date: m.start_datetime.split('T')[0],
          label: m.title,
          type: 'meeting',
          sub: m.creator_name ? `by ${m.creator_name}` : undefined,
          meetLink: m.meet_link ?? undefined,
          meetingId: m.id,
        });
      }

      setEvents(cal);
    });
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function handleSync() {
    setSyncing(true);
    try { await api.post('/google/sync', {}); loadEvents(); }
    catch { /* silent if not connected */ }
    finally { setSyncing(false); }
  }

  async function connectGoogle() {
    const data = await api.get<{ url: string }>('/google/auth-url');
    window.location.href = data.url;
  }

  async function disconnectGoogle() {
    if (!confirm('Disconnect the shared Google Calendar account?')) return;
    await api.delete('/google/disconnect');
    setGoogleStatus({ connected: false, webhookActive: false });
  }

  const prevMonth = () => month === 0  ? (setYear(y => y-1), setMonth(11))  : setMonth(m => m-1);
  const nextMonth = () => month === 11 ? (setYear(y => y+1), setMonth(0))   : setMonth(m => m+1);
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const eventsForDay = (day: number) => {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return events.filter(e => e.date === ds);
  };

  const selectedEvents = selected ? events.filter(e => e.date === selected) : [];

  const isWeekend = (dayIndex: number) => {
    // dayIndex = (firstDay + day - 1) % 7
    const dow = (firstDay + dayIndex) % 7;
    return dow === 0 || dow === 6;
  };

  return (
    <div>
      {showModal && selected && (
        <ScheduleModal
          defaultDate={selected}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadEvents(); }}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Company Calendar</h1>
            <p>Leaves, events, birthdays, and meetings all in one place</p>
          </div>

          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            {/* Month navigation */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 0,
              border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden',
            }}>
              <button onClick={prevMonth} style={{ padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-body)' }}>‹</button>
              <div style={{ padding: '7px 16px', fontWeight: 700, fontSize: 14, borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', minWidth: 160, textAlign: 'center' }}>
                {MONTHS[month]} {year}
              </div>
              <button onClick={nextMonth} style={{ padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-body)' }}>›</button>
            </div>

            <button className="btn btn-ghost btn-sm" onClick={goToday}>Today</button>

            {/* Google Calendar controls */}
            {googleStatus?.connected ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={handleSync} disabled={syncing}>
                  {syncing ? '⟳ Syncing…' : '⟳ Sync'}
                </button>
                {googleStatus.webhookActive && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
                    color: '#16a34a', background: '#f0fdf4',
                    border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px', fontWeight: 600,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                    Live sync
                  </span>
                )}
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={disconnectGoogle}>
                    Disconnect
                  </button>
                )}
              </>
            ) : isAdmin ? (
              <button className="btn btn-primary btn-sm" onClick={connectGoogle}>
                Connect Google Calendar
              </button>
            ) : null}

            <button className="btn btn-primary btn-sm"
              onClick={() => { if (!selected) setSelected(todayStr); setShowModal(true); }}>
              + Meeting
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar + Detail panel ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* Calendar grid */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Day-of-week header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--color-surface)' }}>
            {DAYS_SHORT.map((d, i) => (
              <div key={d} style={{
                padding: '10px 0', textAlign: 'center',
                fontSize: 11, fontWeight: 700,
                color: (i === 0 || i === 6) ? '#94a3b8' : 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.6px',
                borderBottom: '1px solid var(--color-border)',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              if (!day) {
                return (
                  <div key={`e-${i}`} style={{
                    minHeight: 96,
                    borderBottom: '1px solid var(--color-border)',
                    borderRight: '1px solid var(--color-border)',
                    background: '#fafafa',
                  }} />
                );
              }

              const dateStr   = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayEvents = eventsForDay(day);
              const isToday   = dateStr === todayStr;
              const isSel     = dateStr === selected;
              const weekend   = isWeekend(i);
              const visible   = dayEvents.slice(0, 3);
              const overflow  = dayEvents.length - visible.length;

              return (
                <div
                  key={day}
                  onClick={() => setSelected(isSel ? null : dateStr)}
                  style={{
                    minHeight: 96, padding: '8px 6px',
                    borderBottom: '1px solid var(--color-border)',
                    borderRight: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    background: isSel
                      ? 'var(--color-primary-light, #eef2ff)'
                      : isToday
                        ? '#fefce8'
                        : weekend
                          ? '#fafafa'
                          : 'transparent',
                    boxShadow: isSel ? 'inset 2px 0 0 var(--color-primary)' : undefined,
                    transition: 'background 0.12s',
                  }}
                >
                  {/* Day number */}
                  <div style={{ marginBottom: 5, display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: isToday ? 800 : 400,
                      background: isToday ? 'var(--color-primary)' : 'transparent',
                      color: isToday ? '#fff' : weekend ? '#94a3b8' : 'var(--color-text-body)',
                    }}>
                      {day}
                    </span>
                  </div>

                  {/* Event chips */}
                  {visible.map((ev, j) => {
                    const cfg = typeConfig(ev.type);
                    return (
                      <div key={j} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 10, fontWeight: 600,
                        background: cfg.bg,
                        color: cfg.color,
                        borderRadius: 4, padding: '2px 5px',
                        marginBottom: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        <span style={{ flexShrink: 0, fontSize: 9 }}>{cfg.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</span>
                      </div>
                    );
                  })}

                  {overflow > 0 && (
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: 'var(--color-primary)',
                      background: 'var(--color-primary-light, #eef2ff)',
                      borderRadius: 4, padding: '1px 5px', marginTop: 1,
                    }}>
                      +{overflow} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day detail panel ────────────────────────────────────────────── */}
        {selected && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Panel header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                {selected === todayStr && (
                  <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, marginTop: 2 }}>Today</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Meet</button>
                <button onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}>
                  ×
                </button>
              </div>
            </div>

            {/* Events list */}
            <div style={{ padding: 16 }}>
              {selectedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  <div style={{ fontSize: 13 }}>Nothing scheduled</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedEvents.map((ev, i) => {
                    const cfg = typeConfig(ev.type);
                    return (
                      <div key={i} style={{
                        borderRadius: 8,
                        background: cfg.bg,
                        border: `1px solid ${cfg.color}33`,
                        padding: '10px 12px',
                        borderLeft: `3px solid ${cfg.color}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: ev.sub || ev.meetLink ? 4 : 0 }}>
                          <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: cfg.color }}>{ev.label}</span>
                        </div>
                        {ev.sub && (
                          <div style={{ fontSize: 11, color: cfg.color, opacity: 0.8, textTransform: 'capitalize', paddingLeft: 21 }}>
                            {ev.sub.replace(/_/g, ' ')}
                          </div>
                        )}
                        {ev.meetLink && (
                          <a href={ev.meetLink} target="_blank" rel="noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: '#6366f1', fontWeight: 700,
                            marginTop: 6, paddingLeft: 21, textDecoration: 'none',
                          }}>
                            Join Google Meet ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <span key={type} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 600,
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.color}33`,
            borderRadius: 20, padding: '4px 10px',
          }}>
            {cfg.icon} {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}

        {googleStatus?.connected && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
            {googleStatus.webhookActive ? '🟢 Live sync active' : 'Google Calendar connected (manual sync)'}
          </span>
        )}
      </div>
    </div>
  );
}
