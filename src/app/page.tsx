'use client';
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

/* ─────────────────────────────── helpers ──────────────────────────────── */

const WEEKLY_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfL7_liDkuSYL2unDM-h1UTUp7-pJprekDP5-ILeo1GSa63dA/viewform';

function isWeeklyFormDay(d = new Date()) {
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6;
}

function getDismissKey() {
  return `weekly_form_dismissed_${new Date().toISOString().split('T')[0]}`;
}

function fmt(n: number) {
  return n?.toLocaleString('en-US') ?? '—';
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

/** Fill every day in the last `days` days with 0 if missing from API data */
function fillDays(raw: { date: string; count: number }[], days: number) {
  const map = new Map(raw.map(d => [d.date.split('T')[0], Number(d.count)]));
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - (days - 1 - i));
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return { date: key, count: map.get(key) ?? 0 };
  });
}

function fmtTick(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTooltipLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

/* ─────────────────────────────── TrendChart ───────────────────────────── */

interface TrendPoint { date: string; count: number; }

function TrendChart({ data, color, title, subtitle, emptyLabel }: {
  data: TrendPoint[];
  color: string;
  title: string;
  subtitle: string;
  emptyLabel: string;
}) {
  const allZero = data.every(d => d.count === 0);
  const peak = Math.max(...data.map(d => d.count));

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* header */}
      <div className="flex justify-between items-start mb-1">
        <div className="font-semibold" style={{ fontSize: 15 }}>{title}</div>
        {!allZero && (
          <span className="badge" style={{
            background: color + '18',
            color,
            border: `1px solid ${color}40`,
            fontSize: 11,
            fontWeight: 600,
          }}>
            Peak: {peak}
          </span>
        )}
      </div>
      <div className="text-muted text-sm" style={{ marginBottom: 16 }}>{subtitle}</div>

      {allZero ? (
        <div className="empty-state" style={{ minHeight: 110 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📉</div>
          <p>{emptyLabel}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickFormatter={fmtTick}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [value, 'Count']}
              labelFormatter={(label) => fmtTooltipLabel(String(label))}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
              itemStyle={{ color }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ─────────────────────────────── DateWidget ───────────────────────────── */

function DateWidget() {
  const d   = new Date();
  const day = d.toLocaleDateString('en-US', { weekday: 'long' });
  const dt  = d.toLocaleDateString('en-US', { day: 'numeric' });
  const mon = d.toLocaleDateString('en-US', { month: 'long' });
  const yr  = d.getFullYear();

  return (
    <div className="card" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, color: 'var(--color-primary)' }}>{dt}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{day}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>{mon} {yr}</div>
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 24 }}>
        <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Week</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          {Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)}
        </div>
      </div>

      {isWeeklyFormDay(d) && (
        <a
          href={WEEKLY_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--color-warning, #f59e0b)',
            color: '#fff',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '10px 18px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18 }}>📋</span>
          Fill Weekly Update Form
        </a>
      )}
    </div>
  );
}

/* ─────────────────────────────── interfaces ────────────────────────────── */

interface DashboardStats {
  total_active: number;
  on_leave_today: number;
  present_today: number;
  new_hires_month: number;
  pending_leaves: number;
  standups_today: number;
  active_projects: number;
}

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

interface PayrollSummary {
  name: string;
  designation: string;
  department: string;
  salary: number;
  pay_frequency: string;
  start_date: string;
  working_days_this_month: number;
  leave_days_this_month: number;
  present_days: number;
  daily_rate: number;
  expected_pay: number;
}

/* ─────────────────────────────── page ─────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats, setStats]                   = useState<DashboardStats | null>(null);
  const [payroll, setPayroll]               = useState<PayrollSummary | null>(null);
  const [outToday, setOutToday]             = useState<OutEmployee[]>([]);
  const [outWeek, setOutWeek]               = useState<OutEmployee[]>([]);
  const [standups, setStandups]             = useState<Standup[]>([]);
  const [events, setEvents]                 = useState<Event[]>([]);
  const [standupTrend, setStandupTrend]     = useState<TrendPoint[]>([]);
  const [leaveTrend, setLeaveTrend]         = useState<TrendPoint[]>([]);
  const [showWeeklyPopup, setShowWeeklyPopup] = useState(false);

  useEffect(() => {
    api.get<DashboardStats>('/dashboard/stats').then(setStats).catch(() => {});
    api.get<OutEmployee[]>('/leaves/out/today').then(setOutToday).catch(() => {});
    api.get<OutEmployee[]>('/leaves/out/week').then(setOutWeek).catch(() => {});
    api.get<Standup[]>('/standups/today').then(setStandups).catch(() => {});
    api.get<Event[]>('/events/upcoming').then(setEvents).catch(() => {});
    api.get<TrendPoint[]>('/dashboard/standup-trend')
      .then(d => setStandupTrend(fillDays(d, 30))).catch(() => {});
    api.get<TrendPoint[]>('/dashboard/leave-trend')
      .then(d => setLeaveTrend(fillDays(d, 30))).catch(() => {});

    if (isWeeklyFormDay() && !localStorage.getItem(getDismissKey())) {
      setShowWeeklyPopup(true);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      api.get<PayrollSummary>(`/employees/${user.id}/payroll-summary`).then(setPayroll).catch(() => {});
    }
  }, [user?.id]);

  const monthName    = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isAbsentToday = outToday.some(o => o.name === user?.name);

  const dismissWeeklyPopup = () => {
    localStorage.setItem(getDismissKey(), '1');
    setShowWeeklyPopup(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* Date widget */}
      <div className="mb-4"><DateWidget /></div>

      {/* Weekly form popup */}
      {showWeeklyPopup && (
        <div className="modal-overlay" onClick={dismissWeeklyPopup}>
          <div className="modal" style={{ maxWidth: 440, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={dismissWeeklyPopup} style={{ position: 'absolute', top: 12, right: 16 }}>×</button>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <h2 style={{ marginBottom: 8 }}>Weekly Update Due</h2>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
              It's the end of the week! Please take a moment to fill in your weekly update form so the team stays aligned.
            </p>
            <div className="flex gap-3 justify-center">
              <button className="btn btn-ghost" onClick={dismissWeeklyPopup}>Remind me later</button>
              <a href={WEEKLY_FORM_URL} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary" onClick={dismissWeeklyPopup}>
                Fill Form Now
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Employee profile + payroll */}
      {user && (
        <div className="card mb-4" style={{ padding: 24 }}>
          <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="flex items-center gap-4" style={{ flex: '1 1 260px' }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 20, flexShrink: 0 }}>
                {initials(user.name)}
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: 17 }}>{user.name}</div>
                <div className="text-muted">{payroll?.designation || user.designation}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{payroll?.department}{payroll?.start_date && ` · Joined ${new Date(payroll.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}</div>
              </div>
            </div>

            <div style={{ width: 1, height: 56, background: 'var(--color-border)', flexShrink: 0 }} />

            {payroll?.salary ? (
              <>
                <div style={{ flex: '1 1 120px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>Base Salary</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>৳{fmt(payroll.salary)}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{payroll.pay_frequency}</div>
                </div>
                <div style={{ flex: '1 1 120px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>Work Days</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{payroll.present_days}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)' }}>/{payroll.working_days_this_month}</span></div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{monthName}</div>
                </div>
                <div style={{ flex: '1 1 120px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>Leave Taken</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: payroll.leave_days_this_month > 0 ? 'var(--color-warning)' : undefined }}>
                    {payroll.leave_days_this_month} day{payroll.leave_days_this_month !== 1 ? 's' : ''}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11 }}>this month</div>
                </div>
                <div style={{ flex: '1 1 140px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>Expected Pay</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)' }}>৳{fmt(payroll.expected_pay)}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>৳{fmt(payroll.daily_rate)}/day</div>
                </div>
              </>
            ) : (
              <div className="text-muted" style={{ fontSize: 13 }}>Salary not configured. Contact admin.</div>
            )}

            {isAbsentToday && (
              <span className="badge badge-warning" style={{ alignSelf: 'center' }}>You are on leave today</span>
            )}
          </div>
        </div>
      )}

      {/* Headcount stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
          <div className="stat-card-label">Total Employees</div>
          <div className="stat-card-value">{stats?.total_active ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-success)' }} />
          <div className="stat-card-label">Present Today</div>
          <div className="stat-card-value">{stats?.present_today ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-warning)' }} />
          <div className="stat-card-label">On Leave Today</div>
          <div className="stat-card-value">{stats?.on_leave_today ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-accent)' }} />
          <div className="stat-card-label">New Hires (30d)</div>
          <div className="stat-card-value">{stats?.new_hires_month ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-error)' }} />
          <div className="stat-card-label">Pending Leaves</div>
          <div className="stat-card-value">{stats?.pending_leaves ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-info)' }} />
          <div className="stat-card-label">Active Projects</div>
          <div className="stat-card-value">{stats?.active_projects ?? '—'}</div>
        </div>
      </div>

      {/* Activity trend charts */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <TrendChart
          data={standupTrend}
          color="var(--color-primary)"
          title="Standup Consistency"
          subtitle="Daily standups submitted · last 30 days"
          emptyLabel="No standups posted in the last 30 days"
        />
        <TrendChart
          data={leaveTrend}
          color="var(--color-warning)"
          title="Leave Requests"
          subtitle="Leave requests submitted · last 30 days"
          emptyLabel="No leave requests in the last 30 days"
        />
      </div>

      <div className="grid-2">
        {/* Absent today */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Absent Today</h2>
            <Link href="/leaves" className="text-sm" style={{ color: 'var(--color-accent)' }}>View all</Link>
          </div>
          {outToday.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>✓</div>
              <p>Everyone is in today</p>
            </div>
          ) : (
            outToday.map((e, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="avatar avatar-sm">{initials(e.name)}</div>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold text-sm">{e.name} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>is absent today</span></div>
                  <div className="text-muted">{e.designation}</div>
                </div>
                <span className={`badge ${leaveTypeBadge(e.leave_type)}`}>{e.leave_type}</span>
              </div>
            ))
          )}
        </div>

        {/* Out this week */}
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
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-error)' }}>⚠ {s.blockers}</div>
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
                <div className="text-muted text-sm">
                  {new Date(e.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
