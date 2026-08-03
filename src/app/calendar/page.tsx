'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface CalEvent {
  date: string;
  label: string;
  type: 'meeting' | 'holiday';
  sub?: string;
  time?: string;
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

interface Holiday {
  id: number;
  name: string;
  message: string | null;
  holiday_date: string;
  year: number;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}

// ── Icons ────────────────────────────────────────────────────────────────────
interface IconProps { size?: number; color: string }

function MeetingIcon({ size = 14, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10.5L22 7v10l-6-3.5" />
    </svg>
  );
}

function HolidayIcon({ size = 14, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </svg>
  );
}

const TYPE_CONFIG: Record<'meeting' | 'holiday', { color: string; bg: string; Icon: (p: IconProps) => JSX.Element; label: string }> = {
  meeting: { color: 'var(--color-primary)', bg: 'var(--color-primary-light)', Icon: MeetingIcon, label: 'Meeting' },
  holiday: { color: 'var(--color-primary)', bg: 'var(--color-primary-light)', Icon: HolidayIcon, label: 'Holiday' },
};

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
            <MeetingIcon size={18} color="var(--color-primary)" /> Schedule Meeting
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Meeting title" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea"
              value={form.description} onChange={set('description')} placeholder="Optional agenda" />
          </div>
          <div className="grid-3">
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
          {error && <p className="form-error-text" style={{ marginBottom: 'var(--space-12)' }}>{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Holiday List Modal ───────────────────────────────────────────────────────
interface HolidayListModalProps {
  holidays: Holiday[];
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function HolidayListModal({ holidays, isAdmin, onClose, onChanged }: HolidayListModalProps) {
  const [form, setForm]     = useState({ name: '', holiday_date: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const todayStart = new Date(new Date().toDateString());
  const sorted = [...holidays].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  const upcoming = sorted.filter(h => new Date(h.holiday_date) >= todayStart);
  const past     = sorted.filter(h => new Date(h.holiday_date) < todayStart);

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.holiday_date) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/holidays', form);
      setForm({ name: '', holiday_date: '', message: '' });
      onChanged();
    } catch {
      setError('Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  const removeHoliday = async (id: number) => {
    if (!confirm('Remove this holiday?')) return;
    await api.delete(`/holidays/${id}`);
    onChanged();
  };

  const renderCard = (h: Holiday, isPast: boolean) => (
    <div key={h.id} style={{
      borderRadius: 10,
      border: '1px solid var(--color-border)',
      borderLeft: `3px solid ${TYPE_CONFIG.holiday.color}`,
      padding: '12px 14px',
      opacity: isPast ? 0.6 : 1,
      background: isPast ? 'var(--color-bg)' : 'var(--color-surface)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14 }}>
          <span className="icon-mask" style={{
            width: 14, height: 14, backgroundColor: 'var(--color-text-h1)',
            WebkitMaskImage: 'url(/icons/gift.svg)', maskImage: 'url(/icons/gift.svg)',
          }} />
          {h.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            {new Date(h.holiday_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          {isAdmin && (
            <button className="btn btn-sm btn-danger" onClick={() => removeHoliday(h.id)}>Remove</button>
          )}
        </div>
      </div>
      {h.message && (
        <p style={{ fontSize: 13, color: 'var(--color-text-body)', marginTop: 6, lineHeight: 1.5 }}>{h.message}</p>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '88vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 22px', margin: 0, borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
              <span className="icon-mask" style={{
                width: 16, height: 16, backgroundColor: 'var(--color-primary)',
                WebkitMaskImage: 'url(/icons/gift.svg)', maskImage: 'url(/icons/gift.svg)',
              }} />
              Company Holidays
            </h2>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{holidays.length} fixed paid holidays this year</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: 18, overflowY: 'auto' }}>
          {isAdmin && (
            <form onSubmit={addHoliday} style={{ marginBottom: 18, background: 'var(--color-bg)', padding: 14, borderRadius: 10 }}>
              <div className="grid-2" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Holiday Name</label>
                  <input className="form-input" placeholder="e.g. Dashain" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={form.holiday_date}
                    onChange={e => setForm({ ...form, holiday_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Message <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" placeholder="e.g. Wishing you a joyful celebration! 🎉" value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>
              {error && <p className="form-error-text">{error}</p>}
              <div className="flex justify-end" style={{ marginTop: 10 }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  <span className="icon-mask" style={{
                    WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)',
                  }} />
                  {saving ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          )}

          {holidays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <span className="icon-mask" style={{
                  width: 22, height: 22, backgroundColor: 'var(--color-primary)',
                  WebkitMaskImage: 'url(/icons/gift.svg)', maskImage: 'url(/icons/gift.svg)',
                }} />
              </div>
              <p className="text-muted" style={{ fontSize: 13 }}>
                No holidays have been added yet{isAdmin ? ' — add the official list above.' : '.'}
              </p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    Upcoming
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: past.length ? 20 : 0 }}>
                    {upcoming.map(h => renderCard(h, false))}
                  </div>
                </>
              )}
              {past.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    Past
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {past.map(h => renderCard(h, true))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
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
  const [showHolidays, setShowHolidays] = useState(false);
  const [holidays, setHolidays]   = useState<Holiday[]>([]);
  const [syncing, setSyncing]     = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [hoverIdx, setHoverIdx]   = useState<number | null>(null);

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
      api.get<Meeting[]>('/google/meetings').catch(() => []),
      api.get<Holiday[]>('/holidays').catch(() => []),
    ]).then(([meetings, holidayList]) => {
      const cal: CalEvent[] = [];
      setHolidays(holidayList);

      for (const m of meetings) {
        cal.push({
          date: m.start_datetime.split('T')[0],
          label: m.title,
          type: 'meeting',
          sub: m.creator_name ? `by ${m.creator_name}` : undefined,
          time: new Date(m.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          meetLink: m.meet_link ?? undefined,
          meetingId: m.id,
        });
      }

      for (const h of holidayList) {
        cal.push({ date: h.holiday_date.split('T')[0], label: h.name, type: 'holiday', sub: 'Public Holiday' });
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

  const { y: prevY, m: prevM } = addMonths(year, month, -1);
  const { y: nextY, m: nextM } = addMonths(year, month, 1);
  const prevMonthDays = getDaysInMonth(prevY, prevM);

  interface CalCell { day: number; y: number; m: number; inMonth: boolean }

  const leading: CalCell[] = Array.from({ length: firstDay }, (_, i) => ({
    day: prevMonthDays - firstDay + 1 + i, y: prevY, m: prevM, inMonth: false,
  }));
  const current: CalCell[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1, y: year, m: month, inMonth: true,
  }));
  const trailingCount = (7 - (leading.length + current.length) % 7) % 7;
  const trailing: CalCell[] = Array.from({ length: trailingCount }, (_, i) => ({
    day: i + 1, y: nextY, m: nextM, inMonth: false,
  }));
  const cells: CalCell[] = [...leading, ...current, ...trailing];

  const dateStrOf = (c: CalCell) => `${c.y}-${String(c.m+1).padStart(2,'0')}-${String(c.day).padStart(2,'0')}`;

  const eventsForDay = (day: number) => {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return events.filter(e => e.date === ds);
  };

  // Upcoming (meetings + holidays), soonest first
  const upcomingList = [...events]
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date))
    .slice(0, 6);

  // This week (Sun–Sat containing today), independent of the navigated month above
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  return (
    <div>
      {showModal && selected && (
        <ScheduleModal
          defaultDate={selected}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadEvents(); }}
        />
      )}

      {showHolidays && (
        <HolidayListModal holidays={holidays} isAdmin={isAdmin} onClose={() => setShowHolidays(false)} onChanged={loadEvents} />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex justify-between" style={{ flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>Calendar</h1>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10,
              padding: '6px 14px', borderRadius: 20,
              background: 'var(--color-primary-light)', color: 'var(--color-primary)',
              fontWeight: 700, fontSize: 13,
            }}>
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
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

            <button className="btn btn-secondary btn-sm" onClick={goToday}>Today</button>

            {/* Google Calendar controls */}
            {googleStatus?.connected ? (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
                  {syncing ? '⟳ Syncing…' : '⟳ Sync'}
                </button>
                {googleStatus.webhookActive && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14,
                    height: 40, boxSizing: 'border-box',
                    color: 'var(--color-primary)', background: 'var(--color-primary-light)',
                    border: '2px solid var(--color-primary-light)', borderRadius: 'var(--radius-full)', padding: '0 14px', fontWeight: 600,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} />
                    Live sync
                  </span>
                )}
                {isAdmin && (
                  <button className="btn btn-secondary btn-sm btn-danger" onClick={disconnectGoogle}>
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

      {/* ── Calendar grid ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Day-of-week header */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          {DAYS_FULL.map(d => (
            <div key={d} style={{
              textAlign: 'center', padding: '12px 0', fontSize: 14, fontWeight: 500,
              color: 'var(--color-text-body)',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((c, i) => {
            const dateStr    = dateStrOf(c);
            const dayEvents  = c.inMonth ? eventsForDay(c.day) : [];
            const isToday    = c.inMonth && dateStr === todayStr;
            const isSel      = c.inMonth && dateStr === selected;
            const visible    = dayEvents.slice(0, 2);
            const overflow   = dayEvents.length - visible.length;
            const isHover    = hoverIdx === i;
            const isLastCol  = i % 7 === 6;

            const handleCellClick = () => {
              if (!c.inMonth) return;
              if (dateStr >= todayStr && dayEvents.length === 0) {
                setSelected(dateStr);
                setShowModal(true);
                return;
              }
              setSelected(isSel ? null : dateStr);
            };

            return (
              <div
                key={i}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onClick={handleCellClick}
                style={{
                  position: 'relative',
                  minHeight: 150, minWidth: 0, padding: '15px 15px',
                  cursor: c.inMonth ? 'pointer' : 'default',
                  borderBottom: '1px solid var(--color-border)',
                  borderRight: isLastCol ? 'none' : '1px solid var(--color-border)',
                  background: (c.inMonth && isHover)
                    ? 'var(--color-primary-light)'
                    : c.inMonth ? 'var(--color-surface)' : 'var(--color-bg)',
                  transition: 'background 0.12s',
                }}
              >
                {/* Day number */}
                <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'flex-end' }}>
                  {isToday ? (
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                      background: 'var(--color-primary)', color: 'var(--soft-white-light)',
                    }}>
                      {String(c.day).padStart(2, '0')}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: c.inMonth ? 'var(--color-text-h1)' : 'var(--gray-normal)' }}>
                      {String(c.day).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Event chips */}
                {visible.map((ev, j) => {
                  const cfg = TYPE_CONFIG[ev.type];
                  return (
                    <div key={j} style={{
                      background: cfg.bg,
                      borderLeft: `2px solid ${cfg.color}`,
                      borderRadius: 3, padding: '4px 7px',
                      marginBottom: 6,
                      overflow: 'hidden',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-dark)', lineHeight: 1.4 }}>
                        {ev.time || ev.sub || cfg.label}
                      </div>
                      <div style={{
                        fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-h1)', lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.label}
                      </div>
                    </div>
                  );
                })}

                {overflow > 0 && (
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--color-primary)',
                    background: 'var(--color-primary-light)',
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

      {googleStatus?.connected && (
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>
          {googleStatus.webhookActive ? '🟢 Live sync active' : 'Google Calendar connected (manual sync)'}
        </div>
      )}

      {/* ── Below calendar: Upcoming / This Week (left) + Holidays (right) ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upcoming */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-title">Upcoming</div>
            {upcomingList.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                }}>
                  <span className="icon-mask" style={{
                    width: 22, height: 22, backgroundColor: 'var(--color-primary)',
                    WebkitMaskImage: 'url(/icons/calendar.svg)', maskImage: 'url(/icons/calendar.svg)',
                  }} />
                </div>
                <p className="text-muted" style={{ fontSize: 13 }}>Nothing scheduled.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcomingList.map((ev, i) => {
                  const cfg = TYPE_CONFIG[ev.type];
                  const Icon = cfg.Icon;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, background: cfg.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon size={16} color={cfg.color} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.label}
                        </div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {ev.time && ` · ${ev.time}`}
                        </div>
                      </div>
                      {ev.meetLink && (
                        <a href={ev.meetLink} target="_blank" rel="noreferrer" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 12, color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', flexShrink: 0,
                        }}>
                          Join
                          <span className="icon-mask" style={{
                            width: 12, height: 12, backgroundColor: 'var(--color-primary)',
                            WebkitMaskImage: 'url(/icons/external-link.svg)', maskImage: 'url(/icons/external-link.svg)',
                          }} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Holidays teaser — moved here from the header, bottom-right of the calendar */}
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <span className="icon-mask" style={{
              width: 22, height: 22, backgroundColor: 'var(--color-primary)',
              WebkitMaskImage: 'url(/icons/gift.svg)', maskImage: 'url(/icons/gift.svg)',
            }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Company Holidays</div>
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
            {holidays.length} fixed paid holidays this year
          </p>
          <button className="btn btn-primary" onClick={() => setShowHolidays(true)}>
            View full list of holidays
          </button>
        </div>
      </div>
    </div>
  );
}
