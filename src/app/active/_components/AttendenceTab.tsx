// app/(admin)/attendance/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface AttendanceRow {
  employeeId: number;
  name: string;
  email: string;
  phone: string | null;
  profilePicture: string | null;
  clockRecordId: number;
  clockDate: string;
  clockIn: string;
  clockOut: string | null;
  duration: string | null;
  pause: string | null;
  resume: string | null;
}

interface AttendanceResponse {
  data: AttendanceRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface EmployeeOption {
  id: number;
  name: string;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(duration: string | null): string {
  if (!duration) return "—";
  return duration.slice(0, 5); // HH:MM
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

const PAGE_SIZE = 20;

export default function AttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Load employee list once, for the filter dropdown
  useEffect(() => {
    api
      .get<EmployeeOption[]>("/employees")
      .then(setEmployees)
      .catch(() => {});
  }, []);
  console.log(employees)

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sortDir: "desc", // newest date first — today shows on page 1, older dates as page increases
        ...(employeeId ? { employeeId } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
      const res = await api.get<AttendanceResponse>(`/clock/attendance?${params}`);
      setRows(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err) {
      showToast("error", "Could not load attendance records");
    } finally {
      setLoading(false);
    }
  }, [page, employeeId, startDate, endDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [employeeId, startDate, endDate]);

  return (
    <div className="py-10">

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">All employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <span className="self-center text-sm text-slate-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />

        {(employeeId || startDate || endDate) && (
          <button
            onClick={() => {
              setEmployeeId("");
              setStartDate("");
              setEndDate("");
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Clock in</th>
                <th className="px-4 py-3">Clock out</th>
                <th className="px-4 py-3">Break</th>
                <th className="px-4 py-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full max-w-[100px] bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    No attendance records match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.clockRecordId} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold shrink-0">
                          {row.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 leading-tight">{row.name}</p>
                          <p className="text-xs text-slate-400 leading-tight">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.clockDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatTime(row.clockIn)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatTime(row.clockOut)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.pause ? (
                        <span className="text-amber-600">
                          {formatTime(row.pause)} – {row.resume ? formatTime(row.resume) : "…"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{formatDuration(row.duration)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-400">
          {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : ""}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}