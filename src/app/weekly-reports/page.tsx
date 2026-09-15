'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
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
  week_start_date: string;
  file_name: string;
  file_size: number;
  notes: string;
  submitted_at: string;
}

interface WeekGroup {
  key: string;
  label: string;
  weekStartDate: string;
  reports: Report[];
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

// Monday of the week containing `d` — must match the backend's getWeekStartDate() exactly,
// since that's what decides which folder/DB row a submission lands in.
function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// The API serializes SQL DATE columns as full ISO datetimes (e.g. "2026-07-20T00:00:00.000Z"),
// so any code keying/parsing off week_start_date must strip the time part first.
function dateOnly(iso: string) {
  return iso.slice(0, 10);
}

function weekLabel(weekStartIso: string) {
  const [y, m, d] = dateOnly(weekStartIso).split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `Week of ${startStr} – ${endStr}`;
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function download(id: number) {
  const token = getToken();
  fetch(`${BASE}/weekly-reports/${id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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
  report, showEmployee, canDelete, onDelete, onPreview,
}: {
  report: Report;
  showEmployee: boolean;
  canDelete: boolean;
  onDelete: (id: number) => void;
  onPreview: (report: Report) => void;
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
          onClick={() => onPreview(report)}
          title="Preview file"
        >
          <span
            className="icon-mask"
            style={{ WebkitMaskImage: 'url(/icons/eye.svg)', maskImage: 'url(/icons/eye.svg)' }}
          />
          Preview
        </button>
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

// ── Admin / Lead view — grouped by week ────────────────────────────────────

function AdminView({
  reports, onDelete, onPreview, currentWeekKey,
}: {
  reports: Report[];
  onDelete: (id: number) => void;
  onPreview: (report: Report) => void;
  currentWeekKey: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const groups = useMemo<WeekGroup[]>(() => {
    const map = new Map<string, WeekGroup>();
    for (const r of reports) {
      const key = dateOnly(r.week_start_date);
      if (!map.has(key)) {
        map.set(key, { key, label: weekLabel(key), weekStartDate: key, reports: [] });
      }
      map.get(key)!.reports.push(r);
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [reports]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set([currentWeekKey]));

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
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          {reports.length} submission{reports.length !== 1 ? 's' : ''} across {groups.length} week{groups.length !== 1 ? 's' : ''}
        </span>
      </div>

      {groups.length === 0 && (
        <div className="empty-state card">
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/inbox.svg)', maskImage: 'url(/icons/inbox.svg)' }}
          />
          <p>No weekly updates found yet.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(group => {
          const isOpen = expanded.has(group.key);
          const isCurrentWeek = group.key === currentWeekKey;

          return (
            <div key={group.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                    WebkitMaskImage: 'url(/icons/folder.svg)', maskImage: 'url(/icons/folder.svg)',
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{group.label}</span>

                {isCurrentWeek && (
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
                  {group.reports.length} submission{group.reports.length !== 1 ? 's' : ''}
                </span>

                <span style={{ color: 'var(--color-text-muted)', fontSize: 14, marginLeft: 4 }}>
                  {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.reports.map(r => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      showEmployee
                      canDelete={isAdmin}
                      onDelete={onDelete}
                      onPreview={onPreview}
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

// ── Employee view — own submissions grouped by year ────────────────────────

function EmployeeView({
  reports, onDelete, onPreview,
}: {
  reports: Report[];
  onDelete: (id: number) => void;
  onPreview: (report: Report) => void;
}) {
  const byYear = useMemo(() => {
    const map = new Map<number, Report[]>();
    for (const r of reports) {
      const year = Number(r.week_start_date.slice(0, 4));
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [reports]);

  return (
    <div>
      {reports.length === 0 && (
        <div className="empty-state card">
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/folder.svg)', maskImage: 'url(/icons/folder.svg)' }}
          />
          <p>You haven't submitted any weekly updates yet.</p>
        </div>
      )}

      {byYear.map(([year, yearReports]) => (
        <div key={year} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{year}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {yearReports.length} submission{yearReports.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {yearReports.map(r => {
              const [, m, d] = dateOnly(r.week_start_date).split('-');
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                  <div style={{
                    width: 76, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    borderRadius: '10px 0 0 10px',
                    background: 'var(--color-primary-light, #eef2ff)',
                    padding: '10px 4px',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Week of
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)' }}>
                      {m}/{d}
                    </span>
                  </div>

                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    border: '1px solid var(--color-border)',
                    borderLeft: 'none',
                    borderRadius: '0 10px 10px 0',
                    background: 'var(--color-surface)',
                    flexWrap: 'wrap',
                  }}>
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
                      <button className="btn btn-sm btn-ghost" onClick={() => onPreview(r)}>
                        <span
                          className="icon-mask"
                          style={{ WebkitMaskImage: 'url(/icons/eye.svg)', maskImage: 'url(/icons/eye.svg)' }}
                        />
                        Preview
                      </button>
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
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function WeeklyReportsPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const currentWeekStart = mondayOf(now);
  const currentWeekKey = isoDate(currentWeekStart);

  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const [form, setForm] = useState({
    title: '', notes: '',
    file: null as File | null,
  });

  const load = () => {
    setLoading(true);
    const token = getToken();
    fetch(`${BASE}/weekly-reports`, {
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

  useEffect(() => { load(); }, []);

  const openModal = () => {
    setForm({ title: '', notes: '', file: null });
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
    fd.append('notes', form.notes);

    try {
      const token = getToken();
      const res = await fetch(`${BASE}/weekly-reports`, {
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
    if (!confirm('Delete this weekly update?')) return;
    await api.delete(`/weekly-reports/${id}`);
    load();
  };

  const openPreview = (report: Report) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewReport(report);
    setPreviewUrl(null);
    setPreviewError(false);

    const ext = report.file_name?.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') return; // PPT/PPTX have no in-browser renderer — modal shows a download prompt instead

    setPreviewLoading(true);
    const token = getToken();
    fetch(`${BASE}/weekly-reports/${report.id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then(blob => setPreviewUrl(URL.createObjectURL(blob)))
      .catch(() => setPreviewError(true))
      .finally(() => setPreviewLoading(false));
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewReport(null);
    setPreviewUrl(null);
    setPreviewError(false);
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Weekly Reports</h1>
            <p>
              {isPrivileged
                ? 'Team work updates (PPT/PDF), organized one folder per week'
                : 'Your weekly work update submissions'}
            </p>
          </div>

          <BSRealtyButton
            label={`+ Submit This Week's Update`}
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
        <AdminView reports={reports} onDelete={handleDelete} onPreview={openPreview} currentWeekKey={currentWeekKey} />
      ) : (
        <EmployeeView reports={reports} onDelete={handleDelete} onPreview={openPreview} />
      )}

      {/* ── Submit Weekly Update Modal ──────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Weekly Update</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Reporting Week</label>
                <div style={{
                  fontSize: 13, fontWeight: 600, padding: '9px 12px',
                  borderRadius: 8, background: 'var(--color-primary-light, #eef2ff)',
                  color: 'var(--color-primary)',
                }}>
                  {weekLabel(currentWeekKey)}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" type="text"
                  placeholder="e.g. Engineering Weekly Update"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  File <span className="text-muted" style={{ fontWeight: 400 }}>(.pdf, .ppt, .pptx — max 20 MB)</span>
                </label>
                <input ref={fileRef} className="form-input" type="file"
                  accept=".pdf,.ppt,.pptx"
                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                  onChange={e => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                  required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Notes <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea className="form-textarea" rows={3}
                  placeholder="Brief summary or highlights…"
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
                  {submitting ? 'Uploading…' : 'Submit Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Preview Modal ────────────────────────────────────────────────── */}
      {previewReport && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal" style={{ maxWidth: 860, width: '90vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16 }}>{previewReport.title}</h2>
              <button className="modal-close" onClick={closePreview}>×</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '-8px 0 12px' }}>
              {previewReport.file_name}
            </div>

            {previewReport.file_name?.split('.').pop()?.toLowerCase() === 'pdf' ? (
              previewLoading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Loading preview…
                </div>
              ) : previewError ? (
                <div className="empty-state">
                  <span
                    className="icon-mask empty-state-icon"
                    style={{ WebkitMaskImage: 'url(/icons/alert-triangle.svg)', maskImage: 'url(/icons/alert-triangle.svg)' }}
                  />
                  <p>Couldn't load the preview.</p>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={previewReport.file_name}
                  style={{ width: '100%', height: '72vh', border: '1px solid var(--color-border)', borderRadius: 8 }}
                />
              ) : null
            ) : (
              <div className="empty-state">
                <span
                  className="icon-mask empty-state-icon"
                  style={{ WebkitMaskImage: 'url(/icons/file-text.svg)', maskImage: 'url(/icons/file-text.svg)' }}
                />
                <p style={{ marginBottom: 16 }}>Inline preview isn't available for PowerPoint files.</p>
                <button className="btn btn-primary" onClick={() => download(previewReport.id)}>
                  <span
                    className="icon-mask"
                    style={{ WebkitMaskImage: 'url(/icons/download.svg)', maskImage: 'url(/icons/download.svg)' }}
                  />
                  Download to view
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
