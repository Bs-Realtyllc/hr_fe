import { useEffect, useState, useCallback, Fragment } from "react";
import {api} from "@/lib/api"; // adjust to your actual api client import

interface Employee {
  id: number;
  name: string;
}

interface PauseRecord {
  pause: string;
  resume: string | null;
  reason: string | null;
  pauseDuration: number | null;
}

interface AttendanceRecord {
  employeeId: number;
  name: string;
  email: string;
  address: string | null;
  profilePicture: string | null;
  phone: string | null;
  clockId: number;
  clockIn: string;
  clockOut: string | null;
  clockDate: string;
  pauses: PauseRecord[];
  totalPauseDuration: number;
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

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
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
  const [expandedClockId, setExpandedClockId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmployee = async()=>{
    api.get(`/employees/names`).then((res: any) => setEmployees(res));
  }
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
      const res:any = await api.get(`/clock/attendance?${params}`);
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
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Employee attendance</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm mb-1" htmlFor="employee-filter">
            Employee
          </label>
          <select
            id="employee-filter"
            className="border rounded px-2 py-1"
            value={employeeId}
            onChange={(e) => updateFilter(setEmployeeId)(e.target.value)}
          >
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1" htmlFor="start-date">
            Start date
          </label>
          <input
            id="start-date"
            type="date"
            className="border rounded px-2 py-1"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => updateFilter(setStartDate)(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1" htmlFor="end-date">
            End date
          </label>
          <input
            id="end-date"
            type="date"
            className="border rounded px-2 py-1"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => updateFilter(setEndDate)(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="border rounded px-3 py-1 text-sm"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2">Employee</th>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Clock in</th>
              <th className="text-left px-3 py-2">Clock out</th>
              <th className="text-left px-3 py-2">Total pause</th>
              <th className="text-left px-3 py-2">Pauses</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  No attendance records match these filters.
                </td>
              </tr>
            )}

            {!loading &&
              records.map((r) => (
                <Fragment key={r.clockId}>
                  <tr className="border-t">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.clockDate}</td>
                    <td className="px-3 py-2">{formatTime(r.clockIn)}</td>
                    <td className="px-3 py-2">{formatTime(r.clockOut)}</td>
                    <td className="px-3 py-2">
                      {formatDuration(r.totalPauseDuration)}
                    </td>
                    <td className="px-3 py-2">
                      {r.pauses.length > 0 ? (
                        <button
                          type="button"
                          className="text-blue-600 underline"
                          onClick={() =>
                            setExpandedClockId(
                              expandedClockId === r.clockId
                                ? null
                                : r.clockId,
                            )
                          }
                        >
                          {expandedClockId === r.clockId
                            ? "Hide"
                            : `View (${r.pauses.length})`}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>

                  {expandedClockId === r.clockId && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-3 py-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="text-left py-1">Pause</th>
                              <th className="text-left py-1">Resume</th>
                              <th className="text-left py-1">Reason</th>
                              <th className="text-left py-1">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.pauses.map((p, i) => (
                              <tr key={i}>
                                <td className="py-1">{formatTime(p.pause)}</td>
                                <td className="py-1">
                                  {formatTime(p.resume)}
                                </td>
                                <td className="py-1">{p.reason ?? "—"}</td>
                                <td className="py-1">
                                  {p.pauseDuration != null
                                    ? formatDuration(p.pauseDuration)
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>
          Page {pagination.page} of {pagination.totalPages} (
          {pagination.total} records)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="border rounded px-3 py-1 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="border rounded px-3 py-1 disabled:opacity-50"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}