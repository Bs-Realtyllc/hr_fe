'use client';
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import KpiCard from '@/components/KpiCard';

/* ─────────────────────────────── helpers ──────────────────────────────── */

const WEEKLY_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfL7_liDkuSYL2unDM-h1UTUp7-pJprekDP5-ILeo1GSa63dA/viewform';

// Sunday from 10:00 AM onward — the internal "Work updates ppt" reminder takes over this window.
function isPptReminderTime(d = new Date()) {
  return d.getDay() === 0 && d.getHours() >= 10;
}

function isWeeklyFormDay(d = new Date()) {
  if (isPptReminderTime(d)) return false;
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6;
}

function getDismissKey() {
  return `weekly_form_dismissed_${new Date().toISOString().split('T')[0]}`;
}

function getPptDismissKey() {
  return `ppt_update_dismissed_${new Date().toISOString().split('T')[0]}`;
}

function fmt(n: number) {
  return n?.toLocaleString('en-US') ?? '—';
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function leaveTypeDot(type: string) {
  const map: Record<string, string> = { casual: 'status-dot-info', sick: 'status-dot-warning', annual: 'status-dot-accent' };
  return map[type] || 'status-dot-neutral';
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
          <span className="text-muted" style={{ fontSize: 12, fontWeight: 500 }}>
            Peak {peak}
          </span>
        )}
      </div>
      <div className="text-muted text-sm" style={{ marginBottom: 16 }}>{subtitle}</div>

      {allZero ? (
        <div className="empty-state" style={{ minHeight: 110 }}>
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/trending-down.svg)', maskImage: 'url(/icons/trending-down.svg)' }}
          />
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
    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{day}, {mon} {dt}</div>
      <div className="text-muted" style={{ fontSize: 12 }}>{yr} · Week {Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)}</div>

      {isWeeklyFormDay(d) && (
        <a
          href={WEEKLY_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm no-underline"
        >
          <span className="icon-mask" style={{ WebkitMaskImage: 'url(/icons/clipboard.svg)', maskImage: 'url(/icons/clipboard.svg)' }} />
          Fill Weekly Update Form
        </a>
      )}

      {isPptReminderTime(d) && (
        <Link
          href="/weekly-reports"
          className="btn btn-primary btn-sm no-underline"
        >
          <span className="icon-mask" style={{ WebkitMaskImage: 'url(/icons/bar-chart-2.svg)', maskImage: 'url(/icons/bar-chart-2.svg)' }} />
          Work updates ppt
        </Link>
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
  pending_overtime: number;
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
  overtime_pay: number;
  leave_deduction: number;
  leave_bonus: number;
  net_pay: number;
  adjustments: { title: string; type: string; amount: number }[];
}

/* ─────────────────────────────── page ─────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats]                   = useState<DashboardStats | null>(null);
  const [payroll, setPayroll]               = useState<PayrollSummary | null>(null);
  const [outToday, setOutToday]             = useState<OutEmployee[]>([]);
  const [outWeek, setOutWeek]               = useState<OutEmployee[]>([]);
  const [standups, setStandups]             = useState<Standup[]>([]);
  const [events, setEvents]                 = useState<Event[]>([]);
  const [standupTrend, setStandupTrend]     = useState<TrendPoint[]>([]);
  const [leaveTrend, setLeaveTrend]         = useState<TrendPoint[]>([]);
  const [showWeeklyPopup, setShowWeeklyPopup] = useState(false);
  const [showPptPopup, setShowPptPopup]       = useState(false);

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
    if (isPptReminderTime() && !localStorage.getItem(getPptDismissKey())) {
      setShowPptPopup(true);
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

  const dismissPptPopup = () => {
    localStorage.setItem(getPptDismissKey(), '1');
    setShowPptPopup(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* Weekly form popup */}
      {showWeeklyPopup && (
        <div className="modal-overlay" onClick={dismissWeeklyPopup}>
          <div className="modal" style={{ maxWidth: 440, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={dismissWeeklyPopup} style={{ position: 'absolute', top: 12, right: 16 }}>×</button>
            <span
              className="icon-mask modal-icon"
              style={{ WebkitMaskImage: 'url(/icons/clipboard.svg)', maskImage: 'url(/icons/clipboard.svg)' }}
            />
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

      {/* Work updates ppt popup */}
      {showPptPopup && (
        <div className="modal-overlay" onClick={dismissPptPopup}>
          <div className="modal" style={{ maxWidth: 440, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={dismissPptPopup} style={{ position: 'absolute', top: 12, right: 16 }}>×</button>
            <span
              className="icon-mask modal-icon"
              style={{ WebkitMaskImage: 'url(/icons/bar-chart-2.svg)', maskImage: 'url(/icons/bar-chart-2.svg)' }}
            />
            <h2 style={{ marginBottom: 8 }}>Work updates ppt</h2>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
              It's Sunday — please submit this week's work update (PPT or PDF) so the team stays aligned.
            </p>
            <div className="flex gap-3 justify-center">
              <button className="btn btn-ghost" onClick={dismissPptPopup}>Remind me later</button>
              <button
                className="btn btn-primary"
                onClick={() => { dismissPptPopup(); router.push('/weekly-reports'); }}
              >
                Submit Now
              </button>
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
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>Net Pay (est.)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)' }}>৳{fmt(payroll.net_pay)}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>৳{fmt(payroll.daily_rate)}/day</div>
                </div>
              </>
            ) : (
              <div className="text-muted" style={{ fontSize: 13 }}>Salary not configured. Contact admin.</div>
            )}

            {isAbsentToday && (
              <span className="badge badge-warning" style={{ alignSelf: 'center' }}>You are on leave today</span>
            )}

            <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-border)', flexShrink: 0 }} />

            <DateWidget />
          </div>

          {/* Overtime pay / leave deduction / year-end bonus line items */}
          {payroll?.salary && payroll.adjustments.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payroll.adjustments.map((a, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{a.title}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: a.amount >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {a.amount >= 0 ? '+' : '-'}৳{fmt(Math.abs(a.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Headcount stats */}
      <div className="kpi-grid">
        <KpiCard label="Total Employees" value={stats?.total_active ?? '—'} />
        <KpiCard label="Present Today" value={stats?.present_today ?? '—'} />
        <KpiCard label="On Leave Today" value={stats?.on_leave_today ?? '—'} />
        <KpiCard label="Pending Leaves" value={stats?.pending_leaves ?? '—'} />
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
            <Link href="/leaves" className="card-link">See all</Link>
          </div>
          {outToday.length === 0 ? (
            <div className="empty-state">
              <span
                className="icon-mask empty-state-icon empty-state-icon-success"
                style={{ WebkitMaskImage: 'url(/icons/check-circle.svg)', maskImage: 'url(/icons/check-circle.svg)' }}
              />
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
                <span className={`status-dot ${leaveTypeDot(e.leave_type)}`}>{e.leave_type}</span>
              </div>
            ))
          )}
        </div>

        {/* Out this week */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Out This Week</h2>
            <Link href="/leaves" className="card-link">See all</Link>
          </div>
          {outWeek.length === 0 ? (
            <div className="empty-state">
              <span
                className="icon-mask empty-state-icon"
                style={{ WebkitMaskImage: 'url(/icons/calendar.svg)', maskImage: 'url(/icons/calendar.svg)' }}
              />
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
                <span className={`status-dot ${leaveTypeDot(e.leave_type)}`}>{e.leave_type}</span>
              </div>
            ))
          )}
        </div>

        {/* Today's standups */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Today's Standups</h2>
            <Link href="/standups" className="card-link">See all</Link>
          </div>
          {standups.length === 0 ? (
            <div className="empty-state">
              <span
                className="icon-mask empty-state-icon"
                style={{ WebkitMaskImage: 'url(/icons/edit-3.svg)', maskImage: 'url(/icons/edit-3.svg)' }}
              />
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
            <Link href="/culture" className="card-link">See all</Link>
          </div>
          {events.length === 0 ? (
            <div className="empty-state">
              <span
                className="icon-mask empty-state-icon"
                style={{ WebkitMaskImage: 'url(/icons/gift.svg)', maskImage: 'url(/icons/gift.svg)' }}
              />
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
