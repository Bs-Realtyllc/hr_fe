'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface CalEvent {
  date: string;
  label: string;
  type: 'leave' | 'event' | 'milestone' | 'meeting';
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
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const typeColor: Record<string, string> = {
  leave:    'var(--color-warning)',
  event:    'var(--color-accent)',
  milestone:'var(--color-error)',
  meeting:  '#6366f1',
};

// ── Schedule Meeting Modal ─────────────────────────────────────────────────

interface ScheduleModalProps {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}

function ScheduleModal({ defaultDate, onClose, onCreated }: ScheduleModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: defaultDate,
    startTime: '10:00',
    endTime: '10:30',
    attendees: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.title || !form.date || !form.startTime || !form.endTime) {
      setError('Title, date, and times are required.');
      return;
    }
    setLoading(true);
    try {
      const start = `${form.date}T${form.startTime}:00`;
      const end   = `${form.date}T${form.endTime}:00`;
      const attendees = form.attendees
        ? form.attendees.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      await api.post('/google/meetings', { title: form.title, description: form.description, start_datetime: start, end_datetime: end, attendees });
      onCreated();
    } catch {
      setError('Failed to create meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div className="card" style={{ width: 460, maxWidth: '95vw', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="card-title" style={{ marginBottom: 20 }}>Schedule Meeting</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Meeting title" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" style={{ resize: 'vertical', minHeight: 60 }} value={form.description} onChange={set('description')} placeholder="Optional agenda" />
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
            <label className="form-label">Attendee emails (comma-separated)</label>
            <input className="form-input" value={form.attendees} onChange={set('attendees')} placeholder="alice@company.com, bob@company.com" />
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
  const today     = new Date();
  const user      = getUser();
  const isAdmin   = user?.role === 'admin';

  const [year, setYear]           = useState(today.getFullYear());
  const [month, setMonth]         = useState(today.getMonth());
  const [events, setEvents]       = useState<CalEvent[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing]     = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);

  // Check Google Calendar connection status
  useEffect(() => {
    api.get<GoogleStatus>('/google/status').then(setGoogleStatus).catch(() => null);
  }, []);

  // Handle redirect back from Google OAuth
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
    const calEvents: CalEvent[] = [];
    Promise.all([
      api.get<{ employee_name: string; start_date: string; end_date: string; leave_type: string }[]>('/leaves?status=approved').catch(() => []),
      api.get<{ event_date: string; title: string; event_type: string }[]>('/events').catch(() => []),
      api.get<Meeting[]>('/google/meetings').catch(() => []),
    ]).then(([leaves, evts, meetings]) => {
      for (const l of leaves) {
        const s = new Date(l.start_date), e = new Date(l.end_date);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          calEvents.push({ date: d.toISOString().split('T')[0], label: l.employee_name, type: 'leave', sub: l.leave_type });
        }
      }
      for (const ev of evts) {
        calEvents.push({ date: ev.event_date.split('T')[0], label: ev.title, type: 'event', sub: ev.event_type });
      }
      for (const m of meetings) {
        calEvents.push({
          date: m.start_datetime.split('T')[0],
          label: m.title,
          type: 'meeting',
          sub: m.creator_name ? `by ${m.creator_name}` : undefined,
          meetLink: m.meet_link ?? undefined,
          meetingId: m.id,
        });
      }
      setEvents(calEvents);
    });
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.post('/google/sync', {});
      loadEvents();
    } catch {
      // Silently ignore if not connected
    } finally {
      setSyncing(false);
    }
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

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayStr = today.toISOString().split('T')[0];

  const eventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const selectedDateEvents = selected ? events.filter(e => e.date === selected) : [];

  return (
    <div>
      {showModal && selected && (
        <ScheduleModal
          defaultDate={selected}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadEvents(); }}
        />
      )}

      <div className="page-header">
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Company Calendar</h1>
            <p>Leaves, events, milestones, and meetings</p>
          </div>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            {/* Month navigation */}
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>← Prev</button>
            <span style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Next →</button>

            {/* Google Calendar controls */}
            {googleStatus?.connected ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={handleSync} disabled={syncing}
                  title="Pull latest events from Google Calendar">
                  {syncing ? 'Syncing…' : '↻ Sync'}
                </button>
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}
                    onClick={disconnectGoogle}>
                    Disconnect Google
                  </button>
                )}
              </>
            ) : isAdmin ? (
              <button className="btn btn-primary btn-sm" onClick={connectGoogle}>
                Connect Google Calendar
              </button>
            ) : null}

            {/* Schedule meeting — available to everyone */}
            <button className="btn btn-primary btn-sm"
              onClick={() => { if (!selected) setSelected(todayStr); setShowModal(true); }}>
              + Schedule Meeting
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* Calendar grid */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} style={{ minHeight: 90, borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }} />;
              const dateStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsForDay(day);
              const isToday   = dateStr === todayStr;
              const isSel     = dateStr === selected;
              return (
                <div key={day} onClick={() => setSelected(isSel ? null : dateStr)} style={{
                  minHeight: 90, padding: '8px',
                  borderBottom: '1px solid var(--color-border)',
                  borderRight: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  background: isSel ? 'var(--color-primary-light)' : isToday ? '#F0FFF4' : 'transparent',
                  transition: 'background 0.1s',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: isToday ? 700 : 400,
                    background: isToday ? 'var(--color-primary)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--color-text-body)',
                    marginBottom: 4,
                  }}>{day}</div>
                  {dayEvents.slice(0, 2).map((ev, j) => (
                    <div key={j} style={{
                      fontSize: 10, fontWeight: 500,
                      background: typeColor[ev.type] + '22',
                      color: typeColor[ev.type],
                      borderRadius: 3, padding: '1px 5px',
                      marginBottom: 2, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{ev.type === 'meeting' ? '📹 ' : ''}{ev.label}</div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>+{dayEvents.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        {selected && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>
                {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Meet</button>
            </div>
            {selectedDateEvents.length === 0
              ? <p className="text-muted text-sm">No events on this day</p>
              : selectedDateEvents.map((ev, i) => (
                <div key={i} className="mb-3" style={{ borderLeft: `3px solid ${typeColor[ev.type]}`, paddingLeft: 10 }}>
                  <div className="font-semibold text-sm">{ev.label}</div>
                  {ev.sub && <div className="text-muted" style={{ fontSize: 11, textTransform: 'capitalize' }}>{ev.sub.replace('_', ' ')}</div>}
                  {ev.meetLink && (
                    <a href={ev.meetLink} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, color: '#6366f1', fontWeight: 600,
                      marginTop: 4, textDecoration: 'none',
                    }}>
                      Join Meet ↗
                    </a>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4" style={{ flexWrap: 'wrap' }}>
        {Object.entries(typeColor).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span className="text-sm text-muted" style={{ textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
        {googleStatus?.connected && (
          <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
            Google Calendar {googleStatus.webhookActive ? '(live sync)' : '(manual sync)'}
          </span>
        )}
      </div>
    </div>
  );
}
