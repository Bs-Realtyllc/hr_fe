import { useEffect, useState, useCallback } from "react";
import { employeesApi } from '@/lib/queries/employees';
import type { EmployeeName as Employee } from '@/types';
import { api } from "@/lib/api";
import { formatTimeNepal } from "@/lib/datetime";
import LocationLink from "@/components/ui/LocationLink";


interface PauseRecord {
  pause: string;
  resume: string | null;
  reason: string | null;
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

// Shared by the desktop table and the small-screen cards.
function ClockIn({ r }: { r: AttendanceRecord }) {
  return (
    <>
      {formatTimeNepal(r.clockIn)}
      {r.isLate && <span className="badge badge-error attendance-late-badge">Late</span>}
      <LocationLink lat={r.clockInLat} lng={r.clockInLng} label="clock-in" />
    </>
  );
}

function ClockOut({ r }: { r: AttendanceRecord }) {
  return (
    <>
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
    </>
  );
}

function Pauses({ r }: { r: AttendanceRecord }) {
  if (r.pauses.length === 0) return <span className="attendance-muted">—</span>;
  return (
    <div className="attendance-pause-list">
      {r.pauses.map((p, pi) => (
        <div key={pi} className="attendance-pause-chip">
          <span className="attendance-pause-chip-reason">{p.reason ?? "Pause"}</span>
          <span className="attendance-muted">
            {" · "}{formatTimeNepal(p.pause)} – {p.resume ? formatTimeNepal(p.resume) : "ongoing"}
            {" · "}{p.pauseDuration != null ? formatDuration(p.pauseDuration) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

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

  const fetchEmployee = async () => {
    employeesApi.names().then((res: any) => setEmployees(res));
  };
  useEffect(() => {
    fetchEmployee();
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [employeeId, startDate, endDate, page]);

  useEffect(() => {
    fetchAttendance();
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

      <div className="card">
        <div className="table-wrap">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Pauses</th>
              <th className="attendance-total-header">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="attendance-empty">Loading…</td></tr>
            )}

            {!loading && records.length === 0 && (
              <tr><td colSpan={6} className="attendance-empty">No attendance records match these filters.</td></tr>
            )}

            {!loading && records.map((r) => (
              <tr key={r.clockId}>
                <td className="attendance-name-cell">{r.name}</td>
                <td>{formatDate(r.clockDate)}</td>
                <td><ClockIn r={r} /></td>
                <td><ClockOut r={r} /></td>
                <td><Pauses r={r} /></td>
                <td className="attendance-total-cell">{formatDuration(r.totalClockInDuration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Small-screen replacement for the table above (see .row-cards in table.css). */}
        <div className="row-cards">
          {loading && <div className="attendance-empty">Loading…</div>}
          {!loading && records.length === 0 && (
            <div className="attendance-empty">No attendance records match these filters.</div>
          )}
          {!loading && records.map((r) => (
            <div key={r.clockId} className="row-card attendance-card">
              <div className="row-card-top">
                <div className="attendance-name-cell">{r.name}</div>
                <div className="row-card-meta">{formatDate(r.clockDate)}</div>
              </div>
              <dl className="attendance-card-fields">
                <dt>In</dt>
                <dd><ClockIn r={r} /></dd>
                <dt>Out</dt>
                <dd><ClockOut r={r} /></dd>
                <dt>Pauses</dt>
                <dd><Pauses r={r} /></dd>
                <dt>Total</dt>
                <dd className="attendance-total-cell">{formatDuration(r.totalClockInDuration)}</dd>
              </dl>
            </div>
          ))}
        </div>

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
    </div>
  );
}
