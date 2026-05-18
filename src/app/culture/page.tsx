'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface CultureEvent {
  id: number;
  title: string;
  event_type: 'birthday' | 'anniversary' | 'team_event' | 'milestone';
  event_date: string;
  description?: string;
  employee_name?: string;
}

const typeIcon: Record<string, string> = {
  birthday: '🎂',
  anniversary: '🎉',
  team_event: '👥',
  milestone: '🏆',
};

const typeBadge: Record<string, string> = {
  birthday: 'badge-warning',
  anniversary: 'badge-accent',
  team_event: 'badge-info',
  milestone: 'badge-success',
};

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export default function CulturePage() {
  const [events, setEvents] = useState<CultureEvent[]>([]);
  const [upcoming, setUpcoming] = useState<CultureEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', event_type: 'team_event', event_date: '', description: '', employee_id: '' });

  useEffect(() => {
    api.get<CultureEvent[]>('/events').then(setEvents).catch(() => {});
    api.get<CultureEvent[]>('/events/upcoming').then(setUpcoming).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/events', { ...form, employee_id: form.employee_id || null });
    setShowModal(false);
    api.get<CultureEvent[]>('/events').then(setEvents).catch(() => {});
    api.get<CultureEvent[]>('/events/upcoming').then(setUpcoming).catch(() => {});
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Culture & Events</h1>
            <p>Birthdays, anniversaries, and team milestones</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Event</button>
        </div>
      </div>

      {/* Upcoming widget */}
      {upcoming.length > 0 && (
        <div className="card mb-4" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', color: '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, opacity: 0.85 }}>COMING UP IN THE NEXT 30 DAYS</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {upcoming.map(e => {
              const days = daysUntil(e.event_date);
              return (
                <div key={e.id} style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  minWidth: 160,
                  flex: '1 1 160px',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{typeIcon[e.event_type]}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
                  {e.employee_name && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{e.employee_name}</div>}
                  <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
                    {days === 0 ? '🎊 Today!' : `In ${days} day${days !== 1 ? 's' : ''}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All events */}
      <div className="card">
        <div className="card-title">All Events</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Type</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No events yet</td></tr>
              )}
              {events.map(e => (
                <tr key={e.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span>{typeIcon[e.event_type]}</span>
                      <span className="font-semibold">{e.title}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${typeBadge[e.event_type]}`}>{e.event_type.replace('_', ' ')}</span></td>
                  <td className="text-muted">{e.employee_name || '—'}</td>
                  <td>{new Date(e.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="text-muted text-sm">{e.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                <label className="form-label">Employee ID (optional)</label>
                <input className="form-input" type="number" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} />
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
