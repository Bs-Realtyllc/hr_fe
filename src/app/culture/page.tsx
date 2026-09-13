'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface CultureEvent {
  id: number;
  title: string;
  event_type: 'birthday' | 'anniversary' | 'team_event' | 'milestone';
  event_date: string;
  description?: string;
  employee_name?: string;
}

interface Employee { id: number; name: string; designation: string; }

// ── Icons ────────────────────────────────────────────────────────────────────
interface IconProps { size?: number; color: string }

function CakeIcon({ size = 14, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="9" rx="2" />
      <path d="M3 15h18" />
      <path d="M12 11V6" />
      <circle cx="12" cy="4" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}

function AwardIcon({ size = 14, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5" />
    </svg>
  );
}

function UsersIcon({ size = 14, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14c2.5.3 4.5 2.3 4.5 6" />
    </svg>
  );
}

function FlagIcon({ size = 14, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </svg>
  );
}

const TYPE_CONFIG: Record<CultureEvent['event_type'], { color: string; bg: string; Icon: (p: IconProps) => JSX.Element; label: string }> = {
  birthday:    { color: '#db2777', bg: '#fdf2f8', Icon: CakeIcon,  label: 'Birthday' },
  anniversary: { color: '#7c3aed', bg: '#f5f3ff', Icon: AwardIcon, label: 'Anniversary' },
  team_event:  { color: '#0ea5e9', bg: '#e0f2fe', Icon: UsersIcon, label: 'Team Event' },
  milestone:   { color: '#d97706', bg: '#fef3c7', Icon: FlagIcon,  label: 'Milestone' },
};

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function relativeLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// The display window is always the Sun–Sat week containing today, except on
// Saturday itself it rolls forward to next week — i.e. every Saturday the
// widget starts showing "the coming week"'s events instead of the outgoing one.
function getDisplayWeek(today: Date) {
  const daysSinceSaturday = (today.getDay() + 1) % 7;
  const lastSaturday = new Date(today);
  lastSaturday.setDate(today.getDate() - daysSinceSaturday);
  const weekStart = new Date(lastSaturday);
  weekStart.setDate(lastSaturday.getDate() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { weekStart, weekEnd };
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Full Events List Modal ──────────────────────────────────────────────────
interface FullEventsModalProps {
  events: CultureEvent[];
  onClose: () => void;
}

function FullEventsModal({ events, onClose }: FullEventsModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>All Events</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">
          {events.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>No events yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Event</th><th>Type</th><th>Employee</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {events.map(e => {
                    const isPast = e.event_date.split('T')[0] < todayStr;
                    const cfg = TYPE_CONFIG[e.event_type];
                    const Icon = cfg.Icon;
                    return (
                      <tr key={e.id} style={{ opacity: isPast ? 0.5 : 1 }}>
                        <td style={{ fontWeight: 600 }}>{e.title}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px',
                            background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px',
                          }}>
                            <Icon size={11} color={cfg.color} /> {cfg.label}
                          </span>
                        </td>
                        <td className="text-muted">{e.employee_name || '—'}</td>
                        <td className="text-muted" style={{ fontSize: 13 }}>
                          {new Date(e.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {isPast && <span style={{ marginLeft: 6, fontSize: 11 }}>(past)</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CulturePage() {
  const [events, setEvents] = useState<CultureEvent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ title: '', event_type: 'team_event', event_date: '', description: '', employee_id: '' });

  const { user } = useAuth();
  const isPrivileged = user?.role === "admin" || user?.role === "lead";
  console.log(user)

  const load = () => api.get<CultureEvent[]>('/events').then(setEvents).catch(() => {});

  useEffect(() => {
    load();
    api.get<Employee[]>('/employees').then(setEmployees).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/events', { ...form, employee_id: form.employee_id || null });
    setShowModal(false);
    load();
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { weekStart, weekEnd } = getDisplayWeek(today);

  const weekEvents = events
    .filter(e => {
      const d = new Date(e.event_date); d.setHours(0, 0, 0, 0);
      return d >= weekStart && d <= weekEnd;
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const sortedAll = [...events].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Culture & Events</h1>
            <p>Birthdays, anniversaries, and team milestones</p>
          </div>
          {
          isPrivileged &&
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <span
              className="icon-mask"
              style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
            />
            Add Event
          </button>
          }
        </div>
      </div>

      {showAll && <FullEventsModal events={sortedAll} onClose={() => setShowAll(false)} />}

      {/* This Week */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>This Week</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{fmtShort(weekStart)} – {fmtShort(weekEnd)}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(true)}>View Full Events List</button>
        </div>

        {weekEvents.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 24px' }}>
            <span
              className="icon-mask empty-state-icon"
              style={{ WebkitMaskImage: 'url(/icons/calendar.svg)', maskImage: 'url(/icons/calendar.svg)' }}
            />
            <p>No events this week.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {weekEvents.map(e => {
              const cfg = TYPE_CONFIG[e.event_type];
              const Icon = cfg.Icon;
              const days = daysUntil(e.event_date);
              const isPast = days < 0;
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: isPast ? 0.55 : 1 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: cfg.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.title}
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {e.employee_name ? `${e.employee_name} · ` : ''}
                      {new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg,
                    borderRadius: 20, padding: '4px 10px', flexShrink: 0,
                  }}>
                    {relativeLabel(days)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Event</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <select className="form-select" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}>
                    <option value="birthday">Birthday</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="team_event">Team Event</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Employee (optional)</label>
                <select className="form-select" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                  <option value="">None</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.designation}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
