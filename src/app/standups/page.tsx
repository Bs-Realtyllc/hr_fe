"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";
import Button from "@/components/Button/Button";

interface Standup {
  id: number;
  employee_name: string;
  designation: string;
  profile_picture?: string;
  workedOn: string;
  completed: string;
  inProgress: string;
  nextUp: string;
  blockers: string;
  links: string;
  standup_date: string;
  created_at: string;
}

interface Employee {
  id: number;
  name: string;
  designation: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function StandupsPage() {
  const { user } = useAuth();
  const isPrivileged = ["admin", "lead"].includes(user?.role ?? "");

  const [standups, setStandups] = useState<Standup[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ yesterday: "", today: "", blockers: "" });

  useEffect(() => {
    if (isPrivileged) {
      api
        .get<Employee[]>("/employees")
        .then(setEmployees)
        .catch(() => { });
    }
  }, [isPrivileged]);

  const load = () => {
    const params = new URLSearchParams();
    if (selectedEmployee) params.set("employee_id", selectedEmployee);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const q = params.toString() ? `?${params.toString()}` : "";
    api
      .get<Standup[]>(`/standups${q}`)
      .then(setStandups)
      .catch(() => { });
  };

  useEffect(() => {
    load();
  }, [selectedEmployee, startDate, endDate]);

  const clearFilters = () => {
    setSelectedEmployee("");
    setStartDate("");
    setEndDate("");
  };

  const hasFilters = !!(selectedEmployee || startDate || endDate);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/standups", { ...form, employee_id: user?.id });
    setShowModal(false);
    setForm({ yesterday: "", today: "", blockers: "" });
    load();
  };

  const exportExcel = () => {
    const rows = standups.map((s) => ({
      Employee: s.employee_name,
      Designation: s.designation,
      Date: s.standup_date.split("T")[0],
      workedOn: s.workedOn,
      completed: s.completed,
      inProgress: s.inProgress,
      NextUp: s.nextUp,
      Links: s.links,
      Blockers: s.blockers || "",
      "Submitted At": new Date(s.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Standups");
    const suffix = startDate
      ? `_${startDate}${endDate ? `_to_${endDate}` : ""}`
      : `_${new Date().toISOString().split("T")[0]}`;
    XLSX.writeFile(wb, `standups${suffix}.xlsx`);
  };

  const grouped = standups.reduce(
    (acc, s) => {
      const d = s.standup_date.split("T")[0];
      if (!acc[d]) acc[d] = [];
      acc[d].push(s);
      return acc;
    },
    {} as Record<string, Standup[]>,
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Async Standups</h1>
            <p>Team daily updates — what we did, what's next, any blockers</p>
          </div>
          <div className="flex gap-2">

            <Button variant="secondary"
              size="small"
              onClick={exportExcel}
              disabled={standups.length === 0}
              leftIcon={<span
                className="icon-mask"
                style={{
                  height: 16, width: 16,
                  WebkitMaskImage: "url(/icons/download.svg)",
                  maskImage: "url(/icons/download.svg)",
                }}
              />}
            >Export Excel</Button>

            <Button variant="primary"
              size="small"
              onClick={() => setShowModal(true)}
              leftIcon={<span
                className="icon-mask"
                style={{
                  height: 16, width: 16,
                  WebkitMaskImage: "url(/icons/plus.svg)",
                  maskImage: "url(/icons/plus.svg)",
                }}
              />}
            >Export Excel</Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{ padding: "14px 20px" }}>
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          {isPrivileged && (
            <div className="flex items-center gap-2">
              <label
                className="form-label"
                style={{ margin: 0, whiteSpace: "nowrap" }}
              >
                Employee
              </label>
              <select
                className="form-select"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                style={{ width: 200 }}
              >
                <option value="">All employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label
              className="form-label"
              style={{ margin: 0, whiteSpace: "nowrap" }}
            >
              From
            </label>
            <input
              className="form-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: 160 }}
            />
          </div>

          <div className="flex items-center gap-2">
            <label
              className="form-label"
              style={{ margin: 0, whiteSpace: "nowrap" }}
            >
              To
            </label>
            <input
              className="form-input"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: 160 }}
            />
          </div>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}

          {hasFilters && (
            <span className="text-muted text-sm" style={{ marginLeft: "auto" }}>
              {standups.length} result{standups.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {Object.keys(grouped)
        .sort((a, b) => b.localeCompare(a))
        .map((d) => (
          <div key={d} className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                style={{
                  background: "var(--color-primary)",
                  color: "#fff",
                  borderRadius: "var(--radius-sm)",
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {fmtDate(d)}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--color-border)",
                }}
              />
              <span className="text-muted text-sm">
                {grouped[d].length} update{grouped[d].length !== 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {grouped[d].map((s) => (
                <div key={s.id} className="card" style={{ padding: 20 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="avatar">{initials(s.employee_name)}</div>
                    <div>
                      <div className="font-semibold">{s.employee_name}</div>
                      <div className="text-muted">{s.designation}</div>
                    </div>
                  </div>
                  <div className="flex flex-row justify-start gap-10">
                    <div className="flex flex-col gap-4">
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "var(--color-text-muted)",
                            marginBottom: 4,
                          }}
                        >
                          Worked On:
                        </div>
                        <div className="text-sm">{s.workedOn || "—"}</div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "var(--color-accent)",
                            marginBottom: 4,
                          }}
                        >
                          Completed
                        </div>
                        <div className="text-sm">{s.completed || "—"}</div>
                      </div>
                      {s.blockers && (
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              color: "var(--color-error)",
                              marginBottom: 4,
                            }}
                          >
                            Blockers
                          </div>
                          <div
                            className="text-sm"
                            style={{ color: "var(--color-error)" }}
                          >
                            {s.blockers}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mr-10 flex flex-col gap-8">
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "var(--color-text-muted)",
                            marginBottom: 4,
                          }}
                        >
                          In Progress:
                        </div>
                        <div className="text-sm">{s.inProgress || "—"}</div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "var(--color-text-muted)",
                            marginBottom: 4,
                          }}
                        >
                          Next UP:
                        </div>
                        <div className="text-sm">{s.nextUp || "—"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {standups.length === 0 && (
        <div className="empty-state card">
          <span
            className="icon-mask empty-state-icon"
            style={{
              WebkitMaskImage: "url(/icons/clipboard.svg)",
              maskImage: "url(/icons/clipboard.svg)",
            }}
          />
          <p>
            {hasFilters
              ? "No standups match the selected filters."
              : "No standups found. Be the first to post!"}
          </p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Post Daily Standup</h2>

              <Button variant="text"
                size="small"
                onClick={() => setShowModal(false)}

              >X</Button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">What did you do yesterday?</label>
                <textarea
                  className="form-textarea"
                  value={form.yesterday}
                  onChange={(e) =>
                    setForm({ ...form, yesterday: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">What are you doing today?</label>
                <textarea
                  className="form-textarea"
                  value={form.today}
                  onChange={(e) => setForm({ ...form, today: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Any blockers?</label>
                <textarea
                  className="form-textarea"
                  placeholder="Leave empty if none"
                  value={form.blockers}
                  onChange={(e) =>
                    setForm({ ...form, blockers: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 justify-between">

                <Button variant="text"
                  size="small"
                  onClick={() => setShowModal(false)}

                >Cancel</Button>

                <Button variant="primary"
                  type="submit"
                  size="small"
                >Post</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
