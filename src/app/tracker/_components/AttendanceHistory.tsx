import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatTimeNepal, nepalTodayString } from "@/lib/datetime";
import LocationLink from "@/components/LocationLink";
import DiaryModal from "@/components/profile/DiaryModal";
import { useAuth } from "@/contexts/AuthContext";
import MaskIcon from "@/components/ui/MaskIcon";

interface PauseRecord {
  pause: string;
  resume: string | null;
  reason: string | null;
  pauseSource: 'manual' | 'idle_auto';
  pauseDuration: number | null;
}

interface AttendanceRecord {
  clockId: number;
  clockIn: string;
  clockOut: string | null;
  clockOutEstimated: boolean;
  clockDate: string;
  pauses: PauseRecord[];
  totalPauseDuration: number;
  totalClockInDuration: number;
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

interface DateGroup {
  date: string;
  shifts: AttendanceRecord[];
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatDay(clockDate: string) {
  if (clockDate === nepalTodayString()) return "Today";
  return new Date(`${clockDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Records already come back ordered by clock-in, so shifts for the same
// day are adjacent — this just folds them under one date group instead of
// repeating the date label once per shift.
function groupByDate(records: AttendanceRecord[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const r of records) {
    const last = groups[groups.length - 1];
    if (last && last.date === r.clockDate) {
      last.shifts.push(r);
    } else {
      groups.push({ date: r.clockDate, shifts: [r] });
    }
  }
  return groups;
}

const PAGE_SIZE = 20;

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [diaryTarget, setDiaryTarget] = useState<{ date: string; clockId: number } | null>(null);
  // A shift with several idle-auto-pauses can list a dozen entries — collapsed
  // to a one-line summary by default, expandable per-row on demand instead of
  // every row paying for the worst case.
  const [expandedPauses, setExpandedPauses] = useState<Set<number>>(new Set());
  const togglePauses = (clockId: number) => {
    setExpandedPauses((prev) => {
      const next = new Set(prev);
      if (next.has(clockId)) next.delete(clockId); else next.add(clockId);
      return next;
    });
  };

  // silent=true is for background refreshes (the poll/socket nudge below) —
  // this table previously only ever fetched once on mount, so a pause/resume
  // happening anywhere (this device, the desktop app) never showed up here
  // until a full page reload. Toggling the loading flag on every one of
  // those would flash "Loading…" over the whole table every time, so only
  // user-driven fetches (mount, filter/page changes) show it.
  const fetchAttendance = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    try {
      const res: any = await api.get(`/clock/attendance/me?${params}`);
      setRecords(res.data);
      setPagination(res.pagination);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [startDate, endDate, page]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Fallback poll — same role as LiveTracker's: if the socket below is down
  // or a nudge gets missed, this still catches up within 20s instead of
  // never, short of a manual reload.
  useEffect(() => {
    const id = setInterval(() => {
      fetchAttendance(true).catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, [fetchAttendance]);

  // Instant nudge — the same clock:sync event LiveTracker listens for, so a
  // pause/resume/clock-in/out shows up here within milliseconds instead of
  // waiting for the poll above.
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
    setPage(1);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const groups = groupByDate(records);

  return (
    <div className="tracker-history">
      <div className="card">
        <div className="card-title">History</div>
        <div className="tracker-history-filters">
          <div className="form-group tracker-filter-field">
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
          <div className="form-group tracker-filter-field">
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

      {loading && <div className="card tracker-history-empty">Loading…</div>}

      {!loading && records.length === 0 && (
        <div className="card tracker-history-empty">No attendance records match these filters.</div>
      )}

      {!loading && groups.map((group) => {
        const dateTotal = group.shifts.reduce((sum, s) => sum + s.totalClockInDuration, 0);
        return (
          <div key={group.date} className="card tracker-day-block">
            <div className="tracker-day-block-header">
              <span className="tracker-table-date-label">{formatDay(group.date)}</span>
              <span className="tracker-table-total-cell">Total: {formatDuration(dateTotal)}</span>
            </div>

            <div className="table-wrap">
              <table className="tracker-day-table">
                <thead>
                  <tr>
                    <th className="tracker-clockin-header">Clock In</th>
                    <th className="tracker-clockout-header">Clock Out</th>
                    <th className="tracker-pause-header">Pauses</th>
                    <th className="tracker-source-header">Source</th>
                    <th className="tracker-table-total-header">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {group.shifts.map((shift) => (
                    <tr key={shift.clockId}>
                      <td>
                        {shift.pauses.length > 2 && (
                          <button
                            type="button"
                            className={`tracker-pause-expand-btn${expandedPauses.has(shift.clockId) ? ' tracker-pause-expand-btn-open' : ''}`}
                            onClick={() => togglePauses(shift.clockId)}
                            title={expandedPauses.has(shift.clockId) ? 'Hide pause history' : 'Show full pause history'}
                          >
                            <MaskIcon src="/icons/chevron-right.svg" size={14} />
                          </button>
                        )}
                        {formatTimeNepal(shift.clockIn)}
                        <LocationLink lat={shift.clockInLat} lng={shift.clockInLng} label="clock-in" />
                      </td>
                      <td>
                        {shift.clockOut ? formatTimeNepal(shift.clockOut) : "still running"}
                        {shift.clockOutEstimated && (
                          <span
                            title="This clock-out was auto-estimated by the system, not actually reported by you."
                            className="tracker-table-muted"
                            style={{ fontStyle: "italic", marginLeft: 4 }}
                          >
                            (estimated)
                          </span>
                        )}
                        <LocationLink lat={shift.clockOutLat} lng={shift.clockOutLng} label="clock-out" />
                      </td>
                      <td>
                        {shift.pauses.length === 0 ? (
                          <span className="tracker-table-muted">—</span>
                        ) : shift.pauses.length > 2 && !expandedPauses.has(shift.clockId) ? (
                          <span className="tracker-table-muted">
                            {shift.pauses.length} pauses · {formatDuration(shift.totalPauseDuration)} total
                          </span>
                        ) : (
                          <div className="tracker-pause-list">
                            {shift.pauses.map((p, pi) => (
                              <div key={pi} className="tracker-pause-chip">
                                <span className="tracker-pause-chip-reason">{p.reason ?? "Pause"}</span>
                                {p.pauseSource === 'idle_auto' && (
                                  <span className="badge badge-warning" style={{ marginLeft: 4 }} title="Triggered by idle detection, not typed in by you.">
                                    Auto
                                  </span>
                                )}
                                <span className="tracker-table-muted">
                                  {" · "}{formatTimeNepal(p.pause)} – {p.resume ? formatTimeNepal(p.resume) : shift.clockOut ? formatTimeNepal(shift.clockOut) : "ongoing"}
                                  {" · "}{p.pauseDuration != null ? formatDuration(p.pauseDuration) : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {shift.source === 'desktop' ? (
                          <button
                            type="button"
                            className="badge badge-accent"
                            style={{ cursor: 'pointer', border: 'none' }}
                            onClick={() => setDiaryTarget({ date: shift.clockDate, clockId: shift.clockId })}
                            title="View your screenshots and activity for this shift"
                          >
                            Desktop
                          </button>
                        ) : (
                          <span className="badge badge-neutral">Web</span>
                        )}
                      </td>
                      <td className="tracker-table-total-cell">{formatDuration(shift.totalClockInDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {!loading && records.length > 0 && (
        <div className="card tracker-history-pagination">
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

      {diaryTarget && (
        <DiaryModal
          employeeName={user?.name ?? "Me"}
          clockId={diaryTarget.clockId}
          date={diaryTarget.date}
          onClose={() => setDiaryTarget(null)}
        />
      )}
    </div>
  );
}
