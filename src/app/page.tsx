'use client';
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import KpiCard from '@/components/KpiCard';
import ClockInPopup from '@/components/ClockInPopup'; 
//redux
import { useAppDispatch, useAppSelector } from '@/store/hook';

//icon
// import { RxHamburgerMenu } from "react-icons/rx";
// import { toggleSidebar } from '@/store/sidebarSlice';
// import { toast } from 'react-toastify';
import { showToast } from '@/lib/toast';
import Clock from '@/components/clock';

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

/* ─────────────────────────────── TeamSummary ───────────────────────────── */
// Mirrors the reference "Jobs Summary" card: a radial gauge for the headline
// total plus a 4-stat status breakdown, sized to fill the row alongside the
// 4 KpiCards above instead of leaving a gap.

function TeamSummary({ stats }: { stats: DashboardStats | null }) {
  const total = stats?.total_active ?? 0;
  const present = stats?.present_today ?? 0;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const gaugeData = [{ value: pct, fill: 'var(--color-primary)' }];

  return (
    <div
      className="card kpi-grid-wide"
      style={{
        padding: 20,
        background: 'var(--color-primary-light)',
        border: '1px solid var(--color-primary-light)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="font-semibold" style={{ fontSize: 15, marginBottom: 4 }}>Team Summary</div>

      <div style={{ position: 'relative', height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={gaugeData}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={200}
            endAngle={-20}
            barSize={10}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'var(--color-surface)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', inset: 0, top: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{total}</span>
          <span className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Total Employees</span>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 10, columnGap: 8,
        marginTop: 4,
      }}>
        <div className="flex items-center gap-2">
          <span style={{ width: 3, height: 22, borderRadius: 2, background: 'var(--color-primary)', flexShrink: 0 }} />
          <span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{String(present).padStart(2, '0')}</span>
            <span className="text-muted" style={{ fontSize: 12 }}> Present</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 3, height: 22, borderRadius: 2, background: 'var(--color-warning)', flexShrink: 0 }} />
          <span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{String(stats?.on_leave_today ?? 0).padStart(2, '0')}</span>
            <span className="text-muted" style={{ fontSize: 12 }}> On Leave</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 3, height: 22, borderRadius: 2, background: 'var(--color-success)', flexShrink: 0 }} />
          <span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{String(stats?.new_hires_month ?? 0).padStart(2, '0')}</span>
            <span className="text-muted" style={{ fontSize: 12 }}> New Hires</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 3, height: 22, borderRadius: 2, background: 'var(--gray-normal)', flexShrink: 0 }} />
          <span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{String(stats?.pending_leaves ?? 0).padStart(2, '0')}</span>
            <span className="text-muted" style={{ fontSize: 12 }}> Pending Leaves</span>
          </span>
        </div>
      </div>
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

interface RecentEmployee {
  id: number;
  name: string;
  email: string;
  designation: string;
  department: string;
  start_date: string;
  status: string;
}

/* ─────────────────────────────── page ─────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [outToday, setOutToday] = useState<OutEmployee[]>([]);
  const [standups, setStandups] = useState<Standup[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
  const [standupTrend, setStandupTrend] = useState<TrendPoint[]>([]);
  const [leaveTrend, setLeaveTrend] = useState<TrendPoint[]>([]);
  const [showWeeklyPopup, setShowWeeklyPopup] = useState(false);
  const [showPptPopup, setShowPptPopup] = useState(false);

useEffect(() => {
  api.get<DashboardStats>('/dashboard/stats')
    .then(setStats)
    .catch((err) => showToast('error','Could not load dashboard stats'));

  api.get<OutEmployee[]>('/leaves/out/today')
    .then(setOutToday)
    .catch((err) => showToast('error','Could not load today\'s leave list'));

  api.get<Standup[]>('/standups/today')
    .then(setStandups)
    .catch((err) => showToast('error','Could not load standups'));

  api.get<RecentEmployee[]>('/employees')
    .then(list => setRecentEmployees(
      [...list]
        .filter(e => e.status !== 'terminated')
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        .slice(0, 6)
    ))
    .catch((err) => showToast('error','Could not load recent employees'));

  api.get<TrendPoint[]>('/dashboard/standup-trend')
    .then(d => setStandupTrend(fillDays(d, 30)))
    .catch((err) => showToast('error','Could not load standup trend'));

  api.get<TrendPoint[]>('/dashboard/leave-trend')
    .then(d => setLeaveTrend(fillDays(d, 30)))
    .catch((err) => showToast('error','Could not load leave trend'));

  if (isWeeklyFormDay() && !localStorage.getItem(getDismissKey())) {
    setShowWeeklyPopup(true);
  }
  if (isPptReminderTime() && !localStorage.getItem(getPptDismissKey())) {
    setShowPptPopup(true);
  }
}, []);

  const dismissWeeklyPopup = () => {
    localStorage.setItem(getDismissKey(), '1');
    setShowWeeklyPopup(false);
  };

  const dismissPptPopup = () => {
    localStorage.setItem(getPptDismissKey(), '1');
    setShowPptPopup(false);
  };

  return (
    <>
      <ClockInPopup />

      <div>
        <div
          className="page-header flex justify-between items-center"
          style={{ marginBottom: 0 }}
        >
          <h1>Dashboard</h1>
          <div className="flex items-center gap-2">
            <Clock />
            <button className="topbar-icon-btn" title="Notifications">
              <span
                className="icon-mask"
                style={{
                  WebkitMaskImage: "url(/icons/bell.svg)",
                  maskImage: "url(/icons/bell.svg)",
                }}
              />
              <span className="topbar-icon-btn-dot" />
            </button>
            <button className="topbar-icon-btn" title="Toggle theme">
              <span
                className="icon-mask"
                style={{
                  WebkitMaskImage: "url(/icons/moon.svg)",
                  maskImage: "url(/icons/moon.svg)",
                }}
              />
            </button>
            {user && (
              <div className="avatar" title={user.name}>
                {initials(user.name)}
              </div>
            )}
          </div>
        </div>
        <hr className="page-header-divider" />

        {/* Weekly form popup */}
        {showWeeklyPopup && (
          <div className="modal-overlay" onClick={dismissWeeklyPopup}>
            <div
              className="modal"
              style={{ maxWidth: 440, textAlign: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={dismissWeeklyPopup}
                style={{ position: "absolute", top: 12, right: 16 }}
              >
                ×
              </button>
              <span
                className="icon-mask modal-icon"
                style={{
                  WebkitMaskImage: "url(/icons/clipboard.svg)",
                  maskImage: "url(/icons/clipboard.svg)",
                }}
              />
              <h2 style={{ marginBottom: 8 }}>Weekly Update Due</h2>
              <p
                className="text-muted"
                style={{ fontSize: 14, marginBottom: 24 }}
              >
                It's the end of the week! Please take a moment to fill in your
                weekly update form so the team stays aligned.
              </p>
              <div className="flex gap-3 justify-center">
                <button className="btn btn-ghost" onClick={dismissWeeklyPopup}>
                  Remind me later
                </button>
                <a
                  href={WEEKLY_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  onClick={dismissWeeklyPopup}
                >
                  Fill Form Now
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Work updates ppt popup */}
        {showPptPopup && (
          <div className="modal-overlay" onClick={dismissPptPopup}>
            <div
              className="modal"
              style={{ maxWidth: 440, textAlign: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={dismissPptPopup}
                style={{ position: "absolute", top: 12, right: 16 }}
              >
                ×
              </button>
              <span
                className="icon-mask modal-icon"
                style={{
                  WebkitMaskImage: "url(/icons/bar-chart-2.svg)",
                  maskImage: "url(/icons/bar-chart-2.svg)",
                }}
              />
              <h2 style={{ marginBottom: 8 }}>Work updates ppt</h2>
              <p
                className="text-muted"
                style={{ fontSize: 14, marginBottom: 24 }}
              >
                It's Sunday — please submit this week's work update (PPT or PDF)
                so the team stays aligned.
              </p>
              <div className="flex gap-3 justify-center">
                <button className="btn btn-ghost" onClick={dismissPptPopup}>
                  Remind me later
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    dismissPptPopup();
                    router.push("/weekly-reports");
                  }}
                >
                  Submit Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Headcount stats */}
        <div className="kpi-grid">
          <KpiCard label="Total Employees" value={stats?.total_active ?? "—"} />
          <KpiCard label="Present Today" value={stats?.present_today ?? "—"} />
          <KpiCard
            label="On Leave Today"
            value={stats?.on_leave_today ?? "—"}
          />
          <KpiCard
            label="Pending Leaves"
            value={stats?.pending_leaves ?? "—"}
          />
          {/* TeamSummary temporarily disabled — revisit gauge/breakdown styling */}
          {/* <TeamSummary stats={stats} /> */}
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
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                Absent Today
              </h2>
              <Link href="/leaves" className="card-link">
                See all
              </Link>
            </div>
            {outToday.length === 0 ? (
              <div className="empty-state">
                <span
                  className="icon-mask empty-state-icon empty-state-icon-success"
                  style={{
                    WebkitMaskImage: "url(/icons/check-circle.svg)",
                    maskImage: "url(/icons/check-circle.svg)",
                  }}
                />
                <p>Everyone is in today</p>
              </div>
            ) : (
              outToday.map((e, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <div className="avatar avatar-sm">{initials(e.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="font-semibold text-sm">
                      {e.name}{" "}
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        is absent today
                      </span>
                    </div>
                    <div className="text-muted">{e.designation}</div>
                  </div>
                  <span className={`status-dot ${leaveTypeDot(e.leave_type)}`}>
                    {e.leave_type}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Today's standups */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                Today's Standups
              </h2>
              <Link href="/standups" className="card-link">
                See all
              </Link>
            </div>
            {standups.length === 0 ? (
              <div className="empty-state">
                <span
                  className="icon-mask empty-state-icon"
                  style={{
                    WebkitMaskImage: "url(/icons/edit-3.svg)",
                    maskImage: "url(/icons/edit-3.svg)",
                  }}
                />
                <p>No standups submitted yet today</p>
              </div>
            ) : (
              standups.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="mb-4"
                  style={{
                    borderLeft: "3px solid var(--color-primary-light)",
                    paddingLeft: 12,
                  }}
                >
                  <div className="font-semibold text-sm">{s.employee_name}</div>
                  <div className="text-muted" style={{ marginTop: 2 }}>
                    {s.today}
                  </div>
                  {s.blockers && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "var(--color-error)",
                      }}
                    >
                      ⚠ {s.blockers}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently joined — compact table, full width */}
        <div
          className="card"
          style={{ marginTop: 16, padding: 0, overflow: "hidden" }}
        >
          <div
            className="flex justify-between items-center"
            style={{ padding: "20px 24px 0" }}
          >
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              Team Directory
            </h2>
            <Link href="/employees" className="card-link">
              See all
            </Link>
          </div>

          {recentEmployees.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 24px 32px" }}>
              <span
                className="icon-mask empty-state-icon"
                style={{
                  WebkitMaskImage: "url(/icons/user-plus.svg)",
                  maskImage: "url(/icons/user-plus.svg)",
                }}
              />
              <p>No recent hires to show</p>
            </div>
          ) : (
            <>
              <div className="table-wrap" style={{ padding: "16px 24px 24px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEmployees.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar avatar-sm">
                              {initials(e.name)}
                            </div>
                            <div>
                              <div className="cell-title">{e.name}</div>
                              <div className="cell-subtitle">{e.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{e.designation}</td>
                        <td>{e.department}</td>
                        <td>
                          {new Date(e.start_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="row-cards" style={{ padding: "16px 24px 24px" }}>
                {recentEmployees.map((e) => (
                  <div key={e.id} className="row-card">
                    <div className="row-card-top">
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm">
                          {initials(e.name)}
                        </div>
                        <div>
                          <div className="cell-title">{e.name}</div>
                          <div className="cell-subtitle">
                            {e.designation} · {e.department}
                          </div>
                        </div>
                      </div>
                      <span className="row-card-meta">
                        {new Date(e.start_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
