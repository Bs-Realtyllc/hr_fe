'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PillTabs from '@/components/PillTabs';

interface OvertimeRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  designation: string;
  project_id: number | null;
  project_name: string | null;
  work_date: string;
  hours: number;
  reason: string;
  approved_by_name: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_name?: string;
  hourly_rate: number | null;
  overtime_rate: number | null;
  amount: number | null;
}

interface ProjectOption {
  id: number;
  name: string;
}

const STATUS_META: Record<OvertimeRequest['status'], { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: 'Pending',  color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  approved: { label: 'Approved', color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' },
};

const BLANK_FORM = {
  project_id: '',
  work_date: '',
  hours: '',
  reason: '',
  approved_by_name: '',
};

export default function OvertimePage() {
  const { user } = useAuth();
  const isAdmin      = user?.role === 'admin';
  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const [requests, setRequests]       = useState<OvertimeRequest[]>([]);
  const [allRequests, setAllRequests] = useState<OvertimeRequest[]>([]);
  const [projects, setProjects]       = useState<ProjectOption[]>([]);
  const [filter, setFilter]           = useState('all');
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState(BLANK_FORM);
  const [error, setError]             = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm]   = useState(BLANK_FORM);

  const loadAll = () => api.get<OvertimeRequest[]>('/overtime').then(setAllRequests).catch(() => {});

  const load = () => {
    api.get<OvertimeRequest[]>(`/overtime${filter !== 'all' ? `?status=${filter}` : ''}`).then(setRequests).catch(() => {});
    loadAll();
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { api.get<ProjectOption[]>('/projects').then(setProjects).catch(() => {}); }, []);

  const openModal = () => {
    setForm(BLANK_FORM);
    setError('');
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/overtime', {
        employee_id: user?.id,
        project_id: form.project_id ? Number(form.project_id) : null,
        work_date: form.work_date,
        hours: Number(form.hours),
        reason: form.reason,
        approved_by_name: form.approved_by_name,
      });
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    }
  };

  const openEditModal = (o: OvertimeRequest) => {
    setEditingId(o.id);
    setEditForm({
      project_id: o.project_id ? String(o.project_id) : '',
      work_date: o.work_date.split('T')[0],
      hours: String(o.hours),
      reason: o.reason,
      approved_by_name: o.approved_by_name,
    });
    setError('');
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    try {
      await api.put(`/overtime/${editingId}`, {
        project_id: editForm.project_id ? Number(editForm.project_id) : null,
        work_date: editForm.work_date,
        hours: Number(editForm.hours),
        reason: editForm.reason,
        approved_by_name: editForm.approved_by_name,
      });
      setEditingId(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const cancelRequest = async (id: number) => {
    if (!confirm('Cancel this overtime request?')) return;
    await api.delete(`/overtime/${id}`);
    load();
  };

  const approve = async (id: number) => {
    try {
      await api.put(`/overtime/${id}/approve`, {});
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Approve failed');
    }
  };
  const reject = async (id: number) => { await api.put(`/overtime/${id}/reject`, {}); load(); };

  const pendingCount  = allRequests.filter(r => r.status === 'pending').length;
  const approvedCount = allRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;
  const approvedThisMonth = allRequests.filter(r => {
    if (r.status !== 'approved') return false;
    const d = new Date(r.work_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalHoursThisMonth = approvedThisMonth.reduce((s, r) => s + Number(r.hours), 0);
  const totalPayThisMonth   = approvedThisMonth.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Overtime Requests</h1>
            <p>{isPrivileged ? 'Review and approve employee overtime claims' : 'Log and track your overtime hours'}</p>
            <p className="text-muted" style={{ marginTop: 4 }}>
              <strong style={{ color: 'var(--color-text-body)' }}>This month:</strong> <strong style={{ color: 'var(--color-text-body)' }}>{totalHoursThisMonth}h</strong> approved
              {' · '}
              <strong style={{ color: 'var(--color-text-body)' }}>Rs. {Math.round(totalPayThisMonth).toLocaleString()}</strong> paid
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openModal}>
            <span
              className="icon-mask"
              style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
            />
            New Overtime Request
          </button>
        </div>
      </div>

      {/* Filter tabs — counts fold the old "Pending Requests" stat into here */}
      <div className="mb-4">
        <PillTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all',      label: `All (${allRequests.length})` },
            { value: 'pending',  label: `Pending (${pendingCount})` },
            { value: 'approved', label: `Approved (${approvedCount})` },
            { value: 'rejected', label: `Rejected (${rejectedCount})` },
          ]}
        />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>Project</th><th>Date</th><th>Hours</th>
                <th>Reason</th><th>Approved By</th><th>Status</th><th>Pay (150%)</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No overtime requests found</td></tr>
              )}
              {requests.map(o => {
                const isOwn = o.employee_id === user?.id;
                const meta  = STATUS_META[o.status];
                const canApproveReject = o.status === 'pending' && (isAdmin || (user?.role === 'lead' && !isOwn));
                const canEditCancel    = o.status === 'pending' && isOwn;

                return (
                  <tr key={o.id}>
                    <td>
                      <div className="cell-title">{o.employee_name}</div>
                      <div className="cell-subtitle">{o.designation}</div>
                    </td>
                    <td className="text-sm">{o.project_name || <span className="text-muted">General duties</span>}</td>
                    <td className="text-sm">{new Date(o.work_date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{o.hours}h</td>
                    <td style={{ maxWidth: 200 }}><div className="truncate text-sm">{o.reason}</div></td>
                    <td className="text-sm">{o.approved_by_name}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: meta.bg, color: meta.color,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                        {meta.label}
                      </span>
                      {o.status !== 'pending' && o.reviewer_name && (
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>by {o.reviewer_name}</div>
                      )}
                    </td>
                    <td>
                      {o.status === 'approved' && o.amount != null ? (
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>+ Rs. {Number(o.amount).toLocaleString()}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>Rs. {o.overtime_rate}/hr</div>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {canApproveReject && (
                          <>
                            <button className="btn btn-sm btn-accent" onClick={() => approve(o.id)}>Approve</button>
                            <button className="btn btn-sm btn-danger" onClick={() => reject(o.id)}>Reject</button>
                          </>
                        )}
                        {canEditCancel && (
                          <>
                            <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(o)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => cancelRequest(o.id)}>Cancel</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New Overtime Request Modal ───────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Overtime Request</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">General duties (no specific project)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date Worked</label>
                  <input className="form-input" type="date" value={form.work_date} onChange={e => setForm({ ...form, work_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hours</label>
                  <input className="form-input" type="number" step="0.5" min="0.5" max="16" placeholder="e.g. 3"
                    value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason — why was overtime needed?</label>
                <textarea className="form-textarea" placeholder="e.g. Production hotfix, client deadline, release prep…"
                  value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Approved By — who gave you approval for this overtime?</label>
                <input className="form-input" type="text" placeholder="Manager/lead's name"
                  value={form.approved_by_name} onChange={e => setForm({ ...form, approved_by_name: e.target.value })} required />
              </div>

              <div className="card" style={{ padding: '10px 14px', background: 'var(--color-primary-light)', marginBottom: 14 }}>
                <span className="text-sm" style={{ color: 'var(--color-primary)' }}>
                  Approved overtime is paid at <strong>150%</strong> of your hourly rate (monthly salary ÷ 26 days ÷ 8 hours).
                </span>
              </div>

              {error && <p style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Overtime Modal ──────────────────────────────────────────── */}
      {editingId !== null && (
        <div className="modal-overlay" onClick={() => setEditingId(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Overtime Request</h2>
              <button className="modal-close" onClick={() => setEditingId(null)}>×</button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={editForm.project_id} onChange={e => setEditForm({ ...editForm, project_id: e.target.value })}>
                  <option value="">General duties (no specific project)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date Worked</label>
                  <input className="form-input" type="date" value={editForm.work_date} onChange={e => setEditForm({ ...editForm, work_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hours</label>
                  <input className="form-input" type="number" step="0.5" min="0.5" max="16"
                    value={editForm.hours} onChange={e => setEditForm({ ...editForm, hours: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Approved By</label>
                <input className="form-input" type="text" value={editForm.approved_by_name} onChange={e => setEditForm({ ...editForm, approved_by_name: e.target.value })} required />
              </div>
              {error && <p style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
