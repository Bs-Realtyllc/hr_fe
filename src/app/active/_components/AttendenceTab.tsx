import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatTimeNepal } from "@/lib/datetime";
import LocationLink from "@/components/LocationLink";
import DiaryModal from "@/components/profile/DiaryModal";
import MaskIcon from "@/components/ui/MaskIcon";

interface Employee {
  id: number;
  name: string;
}

interface PauseRecord {
  pause: string;
  resume: string | null;
  reason: string | null;
  pauseSource: 'manual' | 'idle_auto';
  pauseDuration: number | null;
}

interface AttendanceRecord {
  employeeId: number;
  name: string;
  clockId: number;
  clockIn: string;
  clockOut: string | null;
  clockOutEstimated: boolean;
  clockDate: string;
  pauses: PauseRecord[];
  totalPauseDuration: number;
  totalClockInDuration: number;
  isLate: boolean;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
  source: 'web' | 'desktop';
}


interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatDate(clockDate: string) {
  return new Date(`${clockDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const PAGE_SIZE = 20;

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [diaryTarget, setDiaryTarget] = useState<{ employeeId: number; name: string; date: string; clockId: number } | null>(null);
  // Same collapse-by-default treatment as the employee's own tracker history —
  // a shift with several idle-auto-pauses can list a dozen entries otherwise.
  const [expandedPauses, setExpandedPauses] = useState<Set<number>>(new Set());
  const togglePauses = (clockId: number) => {
    setExpandedPauses((prev) => {
      const next = new Set(prev);
      if (next.has(clockId)) next.delete(clockId); else next.add(clockId);
      return next;
    });
  };

  const fetchEmployee = async () => {
    api.get(`/employees/names`).then((res: any) => setEmployees(res));
  };
  useEffect(() => {
    fetchEmployee();
  }, []);

  // silent=true for the background poll below — this view can show any
  // employee's attendance, not just the viewer's own, so there's no single
  // per-user socket room to listen on the way the employee's own tracker
  // page can; a plain poll is the honest fallback here. Not toggling the
  // loading flag on it avoids flashing "Loading…" over the table every
  // cycle for a refresh nobody asked for.
  const fetchAttendance = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams();
    if (employeeId) params.set("employeeId", employeeId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    try {
      const res: any = await api.get(`/clock/attendance?${params}`);
      setRecords(res.data);
      setPagination(res.pagination);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [employeeId, startDate, endDate, page]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Fallback poll in case the socket below is down or misses a nudge —
  // same cadence as ActiveTab's own roster poll.
  useEffect(() => {
    const id = setInterval(() => {
      fetchAttendance(true).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [fetchAttendance]);

  // Admins/leads join a shared 'role:admin-lead' room on connect (see
  // inboxSocket.ts) specifically so a broadcast like this one reaches
  // "anyone watching the team," not just the employee whose shift changed.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace(/\/api$/, '');
    const socket: Socket = io(wsUrl, { path: '/ws/inbox', auth: { token }, transports: ['websocket'] });
    socket.on('clock:sync', () => {
      fetchAttendance(true).catch(() => {});
    });
    return () => {
      socket.disconnect();
    };
  }, [fetchAttendance]);

  const updateFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1); // any filter change resets to page 1
  };

  const clearFilters = () => {
    setEmployeeId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="attendance-page">
      <div className="card">
        <div className="card-title">Employee attendance</div>
        <div className="attendance-filters">
          <div className="form-group attendance-filter-field">
            <label className="form-label" htmlFor="employee-filter">Employee</label>
            <select
              id="employee-filter"
              className="form-select"
              value={employeeId}
              onChange={(e) => updateFilter(setEmployeeId)(e.target.value)}
            >
              <option value="">All employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group attendance-filter-field">
            <label className="form-label" htmlFor="start-date">Start date</label>
            <input
              id="start-date"
              type="date"
              className="form-input"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => updateFilter(setStartDate)(e.target.value)}
            />
          </div>

          <div className="form-group attendance-filter-field">
            <label className="form-label" htmlFor="end-date">End date</label>
            <input
              id="end-date"
              type="date"
              className="form-input"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => updateFilter(setEndDate)(e.target.value)}
            />
          </div>

          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th className="attendance-clockin-header">Clock In</th>
              <th className="attendance-clockout-header">Clock Out</th>
              <th className="attendance-pause-header">Pauses</th>
              <th className="attendance-source-header">Source</th>
              <th className="attendance-total-header">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="attendance-empty">Loading…</td></tr>
            )}

            {!loading && records.length === 0 && (
              <tr><td colSpan={7} className="attendance-empty">No attendance records match these filters.</td></tr>
            )}

            {!loading && records.map((r) => (
              <tr key={r.clockId}>
                <td className="attendance-name-cell">{r.name}</td>
                <td>{formatDate(r.clockDate)}</td>
                <td>
                  {r.pauses.length > 2 && (
                    <button
                      type="button"
                      className={`attendance-pause-expand-btn${expandedPauses.has(r.clockId) ? ' attendance-pause-expand-btn-open' : ''}`}
                      onClick={() => togglePauses(r.clockId)}
                      title={expandedPauses.has(r.clockId) ? 'Hide pause history' : 'Show full pause history'}
                    >
                      <MaskIcon src="/icons/chevron-right.svg" size={14} />
                    </button>
                  )}
                  {formatTimeNepal(r.clockIn)}
                  {r.isLate && <span className="badge badge-error attendance-late-badge">Late</span>}
                  <LocationLink lat={r.clockInLat} lng={r.clockInLng} label="clock-in" />
                </td>
                <td>
                  {r.clockOut ? formatTimeNepal(r.clockOut) : "still running"}
                  {r.clockOutEstimated && (
                    <span
                      title="This clock-out was auto-estimated by the system, not actually reported by the employee."
                      className="attendance-muted"
                      style={{ fontStyle: "italic", marginLeft: 4 }}
                    >
                      (estimated)
                    </span>
                  )}
                  <LocationLink lat={r.clockOutLat} lng={r.clockOutLng} label="clock-out" />
                </td>
                <td>
                  {r.pauses.length === 0 ? (
                    <span className="attendance-muted">—</span>
                  ) : r.pauses.length > 2 && !expandedPauses.has(r.clockId) ? (
                    <span className="attendance-muted">
                      {r.pauses.length} pauses · {formatDuration(r.totalPauseDuration)} total
                    </span>
                  ) : (
                    <div className="attendance-pause-list">
                      {r.pauses.map((p, pi) => (
                        <div key={pi} className="attendance-pause-chip">
                          <span className="attendance-pause-chip-reason">{p.reason ?? "Pause"}</span>
                          {p.pauseSource === 'idle_auto' && (
                            <span className="badge badge-warning" style={{ marginLeft: 4 }} title="Triggered by idle detection, not typed in by the employee.">
                              Auto
                            </span>
                          )}
                          <span className="attendance-muted">
                            {" · "}{formatTimeNepal(p.pause)} – {p.resume ? formatTimeNepal(p.resume) : r.clockOut ? formatTimeNepal(r.clockOut) : "ongoing"}
                            {" · "}{p.pauseDuration != null ? formatDuration(p.pauseDuration) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  {r.source === 'desktop' ? (
                    <button
                      type="button"
                      className="badge badge-accent"
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => setDiaryTarget({ employeeId: r.employeeId, name: r.name, date: r.clockDate, clockId: r.clockId })}
                      title="View screenshots and activity for this shift"
                    >
                      Desktop
                    </button>
                  ) : (
                    <span className="badge badge-neutral">Web</span>
                  )}
                </td>
                <td className="attendance-total-cell">{formatDuration(r.totalClockInDuration)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && records.length > 0 && (
          <div className="attendance-pagination">
            <span>{pagination.total} record{pagination.total === 1 ? "" : "s"}</span>
            {pagination.totalPages > 1 && (
              <div className="flex gap-2">
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {diaryTarget && (
        <DiaryModal
          employeeId={diaryTarget.employeeId}
          employeeName={diaryTarget.name}
          clockId={diaryTarget.clockId}
          date={diaryTarget.date}
          onClose={() => setDiaryTarget(null)}
        />
      )}
    </div>
  );
}
