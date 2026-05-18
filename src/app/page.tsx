'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface OutEmployee {
  name: string;
  designation: string;
  leave_type: string;
  start_date: string;
  end_date: string;
}

interface Standup {
  id: number;
  employee_name: string;
  today: string;
  blockers: string;
  standup_date: string;
}

interface Event {
  id: number;
  title: string;
  event_type: string;
  event_date: string;
  employee_name?: string;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function leaveTypeBadge(type: string) {
  const map: Record<string, string> = { casual: 'badge-info', sick: 'badge-warning', annual: 'badge-accent' };
  return map[type] || 'badge-neutral';
}

function eventIcon(type: string) {
  const map: Record<string, string> = { birthday: '🎂', anniversary: '🎉', team_event: '👥', milestone: '🏆' };
  return map[type] || '📅';
}

export default function DashboardPage() {
  const [outToday, setOutToday] = useState<OutEmployee[]>([]);
  const [outWeek, setOutWeek] = useState<OutEmployee[]>([]);
  const [standups, setStandups] = useState<Standup[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ employees: 0, projects: 0, pending: 0 });

  useEffect(() => {
    api.get<OutEmployee[]>('/leaves/out/today').then(setOutToday).catch(() => {});
    api.get<OutEmployee[]>('/leaves/out/week').then(setOutWeek).catch(() => {});
    api.get<Standup[]>('/standups/today').then(setStandups).catch(() => {});
    api.get<Event[]>('/events/upcoming').then(setEvents).catch(() => {});
    Promise.all([
      api.get<unknown[]>('/employees').catch(() => []),
      api.get<unknown[]>('/projects').catch(() => []),
      api.get<unknown[]>('/leaves?status=pending').catch(() => []),
    ]).then(([emps, projs, pending]) => {
      setStats({
        employees: (emps as unknown[]).length,
        projects: (projs as unknown[]).length,
        pending: (pending as unknown[]).length,
      });
    });
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>{today}</p>
      </div>

      {/* Stats row */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
          <div className="stat-card-label">Total Employees</div>
          <div className="stat-card-value">{stats.employees}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-accent)' }} />
          <div className="stat-card-label">Active Projects</div>
          <div className="stat-card-value">{stats.projects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-warning)' }} />
          <div className="stat-card-label">Pending Leaves</div>
          <div className="stat-card-value">{stats.pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-success)' }} />
          <div className="stat-card-label">Standups Today</div>
          <div className="stat-card-value">{standups.length}</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Who's out today */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Out Today</h2>
            <Link href="/leaves" className="text-sm" style={{ color: 'var(--color-accent)' }}>View all</Link>
          </div>
          {outToday.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>✓</div>
              <p>Everyone is in today</p>
            </div>
          ) : (
            outToday.map((e, i) => (
              <div key={i} className="flex items-center gap-3 mb-4">
                <div className="avatar avatar-sm">{initials(e.name)}</div>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold text-sm">{e.name}</div>
                  <div className="text-muted">{e.designation}</div>
                </div>
                <span className={`badge ${leaveTypeBadge(e.leave_type)}`}>{e.leave_type}</span>
              </div>
            ))
          )}
        </div>

        {/* Who's out this week */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Out This Week</h2>
          </div>
          {outWeek.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>🗓</div>
              <p>No absences scheduled this week</p>
            </div>
          ) : (
            outWeek.slice(0, 6).map((e, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="avatar avatar-sm">{initials(e.name)}</div>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold text-sm">{e.name}</div>
                  <div className="text-muted">
                    {new Date(e.start_date ?? e.end_date).toLocaleDateString()} – {new Date(e.end_date).toLocaleDateString()}
                  </div>
                </div>
                <span className={`badge ${leaveTypeBadge(e.leave_type)}`}>{e.leave_type}</span>
              </div>
            ))
          )}
        </div>

        {/* Today's standups */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Today's Standups</h2>
            <Link href="/standups" className="text-sm" style={{ color: 'var(--color-accent)' }}>Feed</Link>
          </div>
          {standups.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>📝</div>
              <p>No standups submitted yet today</p>
            </div>
          ) : (
            standups.slice(0, 4).map(s => (
              <div key={s.id} className="mb-4" style={{ borderLeft: '3px solid var(--color-primary-light)', paddingLeft: 12 }}>
                <div className="font-semibold text-sm">{s.employee_name}</div>
                <div className="text-muted" style={{ marginTop: 2 }}>{s.today}</div>
                {s.blockers && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-error)' }}>
                    ⚠ {s.blockers}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Upcoming events */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Upcoming Events</h2>
            <Link href="/culture" className="text-sm" style={{ color: 'var(--color-accent)' }}>All events</Link>
          </div>
          {events.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>🎊</div>
              <p>No upcoming events in the next 30 days</p>
            </div>
          ) : (
            events.slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-3 mb-3">
                <div style={{ fontSize: 22 }}>{eventIcon(e.event_type)}</div>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold text-sm">{e.title}</div>
                  {e.employee_name && <div className="text-muted">{e.employee_name}</div>}
                </div>
                <div className="text-muted text-sm">{new Date(e.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
