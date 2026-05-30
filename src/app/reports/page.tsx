'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const BASE = process.env.NEXT_PUBLIC_API_URL;

interface Report {
  id: number;
  employee_name: string;
  designation: string;
  title: string;
  month: number;
  year: number;
  file_name: string;
  file_size: number;
  notes: string;
  submitted_at: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf')  return '📄';
  if (ext === 'pptx' || ext === 'ppt') return '📊';
  return '📝';
}

function fmtSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hr_token');
}

export default function ReportsPage() {
  const { user } = useAuth();
  const fileRef  = useRef<HTMLInputElement>(null);

  const now = new Date();
  const [reports, setReports]     = useState<Report[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear,  setFilterYear]  = useState('');

  const [form, setForm] = useState({
    title:  '',
    month:  String(now.getMonth() + 1),
    year:   String(now.getFullYear()),
    notes:  '',
    file:   null as File | null,
  });

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterMonth) params.set('month', filterMonth);
    if (filterYear)  params.set('year',  filterYear);
    const token = getToken();
    fetch(`${BASE}/reports?${params}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json()).then(setReports).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterMonth, filterYear]);

  const openModal = () => {
    setForm({ title: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), notes: '', file: null });
    if (fileRef.current) fileRef.current.value = '';
    setSubmitMsg('');
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file) return setSubmitMsg('Please select a file.');
    setSubmitting(true);
    setSubmitMsg('');

    const fd = new FormData();
    fd.append('file',        form.file);
    fd.append('employee_id', String(user?.id));
    fd.append('title',       form.title);
    fd.append('month',       form.month);
    fd.append('year',        form.year);
    fd.append('notes',       form.notes);

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

  const download = (id: number) => {
    const token = getToken();
    const a = document.createElement('a');
    a.href = `${BASE}/reports/${id}/download`;
    if (token) {
      // fetch blob and trigger download
      fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob()).then(blob => {
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
        });
    } else {
      a.click();
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this report?')) return;
    const token = getToken();
    await fetch(`${BASE}/reports/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Monthly Reports</h1>
            <p>Submit and manage your monthly meeting reports and presentations</p>
          </div>
          <button className="btn btn-primary" onClick={openModal}>+ Submit Report</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 160 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-select" style={{ width: 120 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {(filterMonth || filterYear) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterMonth(''); setFilterYear(''); }}>Clear</button>
        )}
      </div>

      {/* Report list */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: 40 }}>📁</div>
          <p>No reports submitted yet. Be the first to share!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(r => (
            <div key={r.id} className="card" style={{ padding: 20 }}>
              <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
                {/* File icon + name */}
                <div style={{ fontSize: 32, flexShrink: 0 }}>{fileIcon(r.file_name)}</div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div className="font-semibold" style={{ marginBottom: 2 }}>{r.title}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {r.file_name} {r.file_size ? `· ${fmtSize(r.file_size)}` : ''}
                  </div>
                  {r.notes && <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>{r.notes}</div>}
                </div>
                {/* Meta */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="font-semibold text-sm">{r.employee_name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{r.designation}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className="badge" style={{ background: 'var(--color-primary-light, #e0e7ff)', color: 'var(--color-primary)', fontWeight: 600, fontSize: 11 }}>
                      {MONTHS[r.month - 1]} {r.year}
                    </span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {new Date(r.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2" style={{ flexShrink: 0 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => download(r.id)}>Download</button>
                  {(user?.role === 'admin' || user?.id === undefined) && (
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
                <input className="form-input" type="text" placeholder="e.g. May 2026 Engineering Update"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <select className="form-select" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-select" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}>
                    {Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">File <span className="text-muted" style={{ fontWeight: 400 }}>(.pdf, .pptx, .docx — max 20 MB)</span></label>
                <input ref={fileRef} className="form-input" type="file"
                  accept=".pdf,.pptx,.ppt,.docx,.doc"
                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                  onChange={e => setForm({ ...form, file: e.target.files?.[0] ?? null })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Notes <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <textarea className="form-textarea" rows={3} placeholder="Brief summary or agenda points…"
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              {submitMsg && (
                <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--color-error)' }}>{submitMsg}</div>
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
