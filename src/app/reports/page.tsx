'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import { flip, shift } from '@floating-ui/dom';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { BSRealtyButton } from '@bsrealtyllc/design-system';

const BASE = process.env.NEXT_PUBLIC_API_URL;

interface Report {
  id: number;
  employee_id: number;
  employee_name: string;
  designation: string;
  department: string;
  title: string;
  month: number;
  year: number;
  file_name: string;
  file_size: number;
  notes: string;
  submitted_at: string;
}

interface MonthGroup {
  key: string;
  label: string;
  year: number;
  month: number;
  reports: Report[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ReportRange {
  from: Date | null;
  to: Date | null;
}

const emptyRange: ReportRange = { from: null, to: null };

function fmtRangeDate(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fileIcon(name: string) {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { icon: '📄', color: '#ef4444', bg: '#fef2f2' };
  if (ext === 'pptx' || ext === 'ppt') return { icon: '📊', color: '#f59e0b', bg: '#fffbeb' };
  return { icon: '📝', color: '#6366f1', bg: '#eef2ff' };
}

function fmtSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function download(id: number) {
  const token = getToken();
  fetch(`${BASE}/reports/${id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
    });
}

// ── Report card (shared between both views) ───────────────────────────────

function ReportCard({
  report, showEmployee, canDelete, onDelete,
}: {
  report: Report;
  showEmployee: boolean;
  canDelete: boolean;
  onDelete: (id: number) => void;
}) {
  const { icon, color, bg } = fileIcon(report.file_name);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      borderRadius: 10,
      border: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      flexWrap: 'wrap',
    }}>
      {/* File type icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Title + file info */}
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{report.title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color }}>{report.file_name}</span>
          {report.file_size > 0 && <span>· {fmtSize(report.file_size)}</span>}
          <span>· {fmtDate(report.submitted_at)}</span>
        </div>
        {report.notes && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>
            {report.notes}
          </div>
        )}
      </div>

      {/* Employee meta — shown in admin/lead view */}
      {showEmployee && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{report.employee_name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{report.designation}</div>
          {report.department && (
            <div style={{
              display: 'inline-block', marginTop: 3,
              fontSize: 11, fontWeight: 600,
              background: '#f1f5f9', color: '#475569',
              borderRadius: 20, padding: '1px 8px',
            }}>
              {report.department}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => download(report.id)}
          title="Download file"
        >
          <span
            className="icon-mask"
            style={{ WebkitMaskImage: 'url(/icons/download.svg)', maskImage: 'url(/icons/download.svg)' }}
          />
          Download
        </button>
        {canDelete && (
          <button
            className="btn btn-sm btn-danger"
            onClick={() => onDelete(report.id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shared From/To month-range filter ─────────────────────────────────────

function RangeFilter({
  range, setRange, now,
}: {
  range: ReportRange;
  setRange: (v: ReportRange) => void;
  now: Date;
}) {
  const hasRange = !!(range.from || range.to);

  // Default label shows the current month's range even before the user picks anything,
  // matching a real "from date - to date" display rather than a vague "All Time" placeholder.
  const displayFrom = range.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const displayTo = range.to ?? now;
  const label = `${fmtRangeDate(displayFrom)} - ${fmtRangeDate(displayTo)}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <DatePicker
        selectsRange
        monthsShown={2}
        startDate={range.from}
        endDate={range.to}
        maxDate={now}
        onChange={(dates) => {
          const [from, to] = dates as [Date | null, Date | null];
          setRange({ from, to });
        }}
        customInput={
          <button type="button" className="btn btn-ghost btn-sm" style={{ minWidth: 220, justifyContent: 'flex-start' }}>
            <span
              className="icon-mask"
              style={{
                width: 16, height: 16,
                WebkitMaskImage: 'url(/icons/calendar.svg)', maskImage: 'url(/icons/calendar.svg)',
              }}
            />
            {label}
          </button>

        }
        isClearable={false}
        popperPlacement="bottom-start"
        popperModifiers={[shift({ padding: 16 }), flip()]}
        popperContainer={({ children }) => createPortal(children, document.body)}
      />

      {hasRange && (
        <button className="btn btn-ghost btn-sm" onClick={() => setRange(emptyRange)}>Clear</button>
      )}
    </div>
  );
}

// ── Admin / Lead view — grouped by month ──────────────────────────────────

function AdminView({
  reports, range, setRange, onDelete, now,
}: {
  reports: Report[];
  range: ReportRange;
  setRange: (v: ReportRange) => void;
  onDelete: (id: number) => void;
  now: Date;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const groups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, MonthGroup>();
    for (const r of reports) {
      const key = `${r.year}-${r.month}`;
      if (!map.has(key)) {
        map.set(key, {
          key, label: `${MONTHS[r.month - 1]} ${r.year}`,
          year: r.year, month: r.month, reports: [],
        });
      }
      map.get(key)!.reports.push(r);
    }
    return Array.from(map.values()).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    );
  }, [reports]);

  // Default: expand current month only
  const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const [expanded, setExpanded] = useState<Set<string>>(new Set([currentKey]));

  // Re-default when data arrives
  useEffect(() => {
    if (groups.length > 0 && expanded.size === 0) {
      setExpanded(new Set([groups[0].key]));
    }
  }, [groups]);

  function toggle(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div>
      {/* Date range filter + summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <RangeFilter range={range} setRange={setRange} now={now} />
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          {reports.length} report{reports.length !== 1 ? 's' : ''} across {groups.length} month{groups.length !== 1 ? 's' : ''}
        </span>
      </div>

      {groups.length === 0 && (
        <div className="empty-state card">
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/inbox.svg)', maskImage: 'url(/icons/inbox.svg)' }}
          />
          <p>No reports found for the selected period.</p>
        </div>
      )}

      {/* Month accordion groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(group => {
          const isOpen = expanded.has(group.key);
          const isCurrentMonth = group.key === currentKey;

          return (
            <div key={group.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Group header */}
              <button
                onClick={() => toggle(group.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px',
                  background: isOpen ? 'var(--color-primary-light, #eef2ff)' : 'var(--color-surface)',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: isOpen ? '1px solid var(--color-border)' : 'none',
                  transition: 'background 0.15s',
                }}
              >
                <span
                  className="icon-mask"
                  style={{
                    width: 18, height: 18,
                    WebkitMaskImage: 'url(/icons/calendar.svg)', maskImage: 'url(/icons/calendar.svg)',
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{group.label}</span>

                {isCurrentMonth && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: 'var(--color-primary)', color: '#fff',
                    borderRadius: 20, padding: '2px 9px',
                  }}>
                    Current
                  </span>
                )}

                <span style={{
                  fontSize: 12, fontWeight: 600,
                  background: '#f1f5f9', color: '#64748b',
                  borderRadius: 20, padding: '2px 10px',
                }}>
                  {group.reports.length} report{group.reports.length !== 1 ? 's' : ''}
                </span>

                <span style={{ color: 'var(--color-text-muted)', fontSize: 14, marginLeft: 4 }}>
                  {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {/* Reports in this month */}
              {isOpen && (
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.reports.map(r => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      showEmployee
                      canDelete={isAdmin}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Employee view — own reports grouped by year ───────────────────────────

function EmployeeView({
  reports, range, setRange, onDelete, now,
}: {
  reports: Report[];
  range: ReportRange;
  setRange: (v: ReportRange) => void;
  onDelete: (id: number) => void;
  now: Date;
}) {
  // Group by year
  const byYear = useMemo(() => {
    const map = new Map<number, Report[]>();
    for (const r of reports) {
      if (!map.has(r.year)) map.set(r.year, []);
      map.get(r.year)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [reports]);

  return (
    <div>
      {/* Date range filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <RangeFilter range={range} setRange={setRange} now={now} />
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          {reports.length} submission{reports.length !== 1 ? 's' : ''} total
        </span>
      </div>

      {reports.length === 0 && (
        <div className="empty-state card">
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/folder.svg)', maskImage: 'url(/icons/folder.svg)' }}
          />
          <p>You haven't submitted any reports yet.</p>
        </div>
      )}

      {byYear.map(([year, yearReports]) => (
        <div key={year} style={{ marginBottom: 28 }}>
          {/* Year divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
          }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{year}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {yearReports.length} report{yearReports.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {yearReports.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                {/* Month label sidebar */}
                <div style={{
                  width: 76, flexShrink: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: '10px 0 0 10px',
                  background: 'var(--color-primary-light, #eef2ff)',
                  padding: '10px 4px',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {MONTHS[r.month - 1].slice(0, 3)}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                    {r.month}
                  </span>
                </div>

                {/* Card body */}
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  border: '1px solid var(--color-border)',
                  borderLeft: 'none',
                  borderRadius: '0 10px 10px 0',
                  background: 'var(--color-surface)',
                  flexWrap: 'wrap',
                }}>
                  {/* File icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: fileIcon(r.file_name).bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {fileIcon(r.file_name).icon}
                  </div>

                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: fileIcon(r.file_name).color }}>{r.file_name}</span>
                      {r.file_size > 0 && <span>· {fmtSize(r.file_size)}</span>}
                      <span>· {fmtDate(r.submitted_at)}</span>
                    </div>
                    {r.notes && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3, fontStyle: 'italic' }}>
                        {r.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => download(r.id)}>
                      <span
                        className="icon-mask"
                        style={{ WebkitMaskImage: 'url(/icons/download.svg)', maskImage: 'url(/icons/download.svg)' }}
                      />
                      Download
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => onDelete(r.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const now = new Date();

  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<ReportRange>(emptyRange);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const [form, setForm] = useState({
    title: '', month: String(now.getMonth() + 1),
    year: String(now.getFullYear()), notes: '',
    file: null as File | null,
  });

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (range.from) {
      params.set('fromYear', String(range.from.getFullYear()));
      params.set('fromMonth', String(range.from.getMonth() + 1));
    }
    if (range.to) {
      params.set('toYear', String(range.to.getFullYear()));
      params.set('toMonth', String(range.to.getMonth() + 1));
    }
    const token = getToken();
    fetch(`${BASE}/reports?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => {
        if (r.status === 401) { window.location.href = '/login'; return []; }
        return r.json();
      })
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [range.from, range.to]);

  const openModal = () => {
    setForm({ title: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), notes: '', file: null });
    if (fileRef.current) fileRef.current.value = '';
    setSubmitMsg('');
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file) { setSubmitMsg('Please select a file.'); return; }
    setSubmitting(true); setSubmitMsg('');

    const fd = new FormData();
    fd.append('file', form.file);
    fd.append('employee_id', String(user?.id));
    fd.append('title', form.title);
    fd.append('month', form.month);
    fd.append('year', form.year);
    fd.append('notes', form.notes);

    try {
      const token = getToken();
      const res = await fetch(`${BASE}/reports`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setSubmitMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this report?')) return;
    await api.delete(`/reports/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Monthly Reports</h1>
            <p>
              {isPrivileged
                ? 'All team submissions organized by month'
                : 'Your submitted reports and presentations'}
            </p>
          </div>

          <BSRealtyButton
            label='+ Submit Report'
            variant="primary"
            size="small"
            showLeftIcon={false}
            showRightIcon={false}
            onClick={() => { openModal() }}
          />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading…
        </div>
      ) : isPrivileged ? (
        <AdminView
          reports={reports}
          range={range}
          setRange={setRange}
          onDelete={handleDelete}
          now={now}
        />
      ) : (
        <EmployeeView
          reports={reports}
          range={range}
          setRange={setRange}
          onDelete={handleDelete}
          now={now}
        />
      )}

      {/* ── Submit Report Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Monthly Report</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Report Title</label>
                <input className="form-input" type="text"
                  placeholder="e.g. May 2026 Engineering Update"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <select className="form-select" value={form.month}
                    onChange={e => setForm({ ...form, month: e.target.value })}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-select" value={form.year}
                    onChange={e => setForm({ ...form, year: e.target.value })}>
                    {Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  File <span className="text-muted" style={{ fontWeight: 400 }}>(.pdf, .pptx, .docx — max 20 MB)</span>
                </label>
                <input ref={fileRef} className="form-input" type="file"
                  accept=".pdf,.pptx,.ppt,.docx,.doc"
                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                  onChange={e => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                  required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Notes <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea className="form-textarea" rows={3}
                  placeholder="Brief summary or agenda points…"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              {submitMsg && (
                <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--color-error)' }}>
                  {submitMsg}
                </div>
              )}
              <div className="flex gap-3 justify-between">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Uploading…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
