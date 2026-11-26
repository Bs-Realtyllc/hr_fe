'use client';
import { useEffect, useState } from 'react';
import { employeesApi } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/usePermissions';
import type { EmployeeName } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PillTabs from '@/components/ui/PillTabs';
import Button from '@/components/ui/Button/Button';
import MultiSelect from '@/components/ui/MultiSelect';
import { showToast } from '@/lib/toast';

interface Leave {
  id: number;
  employee_id: number;
  employee_name: string;
  designation: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_name?: string;
}

type DisplayStatus = 'unverified' | 'approved' | 'rejected' | 'expired';

function isExpired(leave: Leave): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(leave.end_date) < today;
}

function displayStatus(leave: Leave): DisplayStatus {
  if (leave.status === 'approved') return 'approved';
  if (leave.status === 'rejected') return 'rejected';
  return isExpired(leave) ? 'expired' : 'unverified';
}

const STATUS_META: Record<DisplayStatus, { label: string; color: string; bg: string; dot: string }> = {
  unverified: { label: 'Unverified', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  approved: { label: 'Approved', color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' },
  expired: { label: 'Expired', color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
};

type EmployeeData = EmployeeName;

interface LeaveForm {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  notify: number[];
}

const BLANK_FORM: LeaveForm = {
  leave_type: 'sick', start_date: '', end_date: '', reason: '',
  notify: [],
};

function todayDateInput() {
  return new Date().toISOString().split('T')[0];
}

const LEAVE_COLORS: Record<string, string> = {
  sick: 'var(--color-warning)', bereavement: 'var(--color-error)',
  maternity: 'var(--color-accent)', paternity: 'var(--color-info)',
  // legacy types — no longer offered on new requests, kept so old records still render correctly
  casual: 'var(--color-info)', annual: 'var(--color-accent)',
};

function toDateInput(iso: string) {
  return iso ? iso.split('T')[0] : '';
}

export default function LeavesPage() {
  const { user } = useAuth();
  const { isAdmin, isPrivileged, canApprove } = usePermissions();

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [filter, setFilter] = useState('all');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [employeeNames, setEmployeeNames] = useState<EmployeeData[]>([]);

  // Edit-leave state
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [editForm, setEditForm] = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
  const [editSpan, setEditSpan] = useState<'single' | 'range'>('single');

  // New-leave + notify-recipients form
  const [form, setForm] = useState<LeaveForm>(BLANK_FORM);
  const [span, setSpan] = useState<'single' | 'range'>('single');

  // Employees can't backdate a request; admins can (e.g. recording leave agreed verbally).
  const minDate = isAdmin ? undefined : todayDateInput();

  useEffect(() => {
    employeesApi.names<EmployeeData>()
      .then(setEmployeeNames)
      .catch(() => { showToast('error', 'Failed to load employee names'); });
  }, []);

  // const adminEmployee = employeeNames.filter((emp) => emp.role === 'admin');

  const load = () =>
    api.get<Leave[]>(`/leaves${filter !== 'all' ? `?status=${filter}` : ''}`)
      .then(setLeaves)
      .catch(() => { showToast('error', 'Failed to load leaves'); });

  useEffect(() => { load(); }, [filter]);

  const openLeaveModal = () => {
    setForm(BLANK_FORM);
    setSpan('single');
    setShowLeaveModal(true);
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { notify, ...leaveFields } = form;
      await api.post<{ id: number }>('/leaves', {
        ...leaveFields, employee_id: user?.id, notify: notify.length ? notify : undefined,
      });
      setShowLeaveModal(false);
      load();
      showToast('success', 'Leave request added successfully');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add leave request');
    }
  };

  const openEditModal = (l: Leave) => {
    setEditingLeave(l);
    const start_date = toDateInput(l.start_date);
    const end_date = toDateInput(l.end_date);
    setEditForm({ leave_type: l.leave_type, start_date, end_date, reason: l.reason || '' });
    setEditSpan(start_date === end_date ? 'single' : 'range');
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave) return;
    try {
      await api.put(`/leaves/${editingLeave.id}`, editForm);
      setEditingLeave(null);
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update leave request');
    }
  };

  const cancelLeave = async (id: number) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await api.delete(`/leaves/${id}`);
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to cancel leave request');
    }
  };

  const approve = async (id: number) => {
    try {
      await api.put(`/leaves/${id}/approve`, {});
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to approve leave request');
    }
  };

  const reject = async (id: number) => {
    try {
      await api.put(`/leaves/${id}/reject`, {});
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reject leave request');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Leave Requests</h1>
            <p>{isPrivileged ? 'Manage employee leave applications and balances' : 'Your leave applications'}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="small"
              onClick={openLeaveModal}
              leftIcon={
                <span
                  className="icon-mask"
                  style={{ height: 16, width: 16, WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
                />}
            >
              New Request
            </Button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4">
        <PillTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Unverified' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {leaves.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No leave requests found</td></tr>
              )}
              {leaves.map(l => {
                const isOwn = l.employee_id === user?.id;
                const ds = displayStatus(l);
                const meta = STATUS_META[ds];
                const expired = ds === 'expired';

                // Actions only allowed while leave dates are still in the future
                const canApproveReject = l.status === 'pending' && !expired &&
                  canApprove(l.employee_id);
                const canEditCancel = l.status === 'pending' && !expired && isOwn;

                return (
                  <tr key={l.id} style={{ opacity: expired ? 0.6 : 1 }}>
                    <td>
                      <div className="cell-title">{l.employee_name}</div>
                      <div className="cell-subtitle">{l.designation}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${LEAVE_COLORS[l.leave_type]}22`, color: LEAVE_COLORS[l.leave_type], fontWeight: 600, textTransform: 'capitalize' }}>
                        {l.leave_type}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm">{new Date(l.start_date).toLocaleDateString()}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>to {new Date(l.end_date).toLocaleDateString()}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}><div className="truncate text-sm">{l.reason || '—'}</div></td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: meta.bg, color: meta.color,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                        {meta.label}
                      </span>
                      {(ds === 'approved' || ds === 'rejected') && l.reviewer_name && (
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          by {l.reviewer_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {canApproveReject && (
                          <>
                            <button className="btn btn-sm btn-accent" onClick={() => approve(l.id)}>Approve</button>
                            <button className="btn btn-sm btn-danger" onClick={() => reject(l.id)}>Reject</button>
                          </>
                        )}
                        {canEditCancel && (
                          <>
                            <button className="btn btn-sm btn-ghost" onClick={() => openEditModal(l)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => cancelLeave(l.id)}>Cancel</button>
                          </>
                        )}
                        {expired && l.status === 'pending' && (
                          <span className="text-muted" style={{ fontSize: 11 }}>No actions available</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile replacement for the table above — same data, card-per-row (see .row-cards in table.css) */}
        <div className="row-cards">
          {leaves.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No leave requests found</div>
          )}
          {leaves.map(l => {
            const isOwn = l.employee_id === user?.id;
            const ds = displayStatus(l);
            const meta = STATUS_META[ds];
            const expired = ds === 'expired';

            const canApproveReject = l.status === 'pending' && !expired &&
              canApprove(l.employee_id);
            const canEditCancel = l.status === 'pending' && !expired && isOwn;

            return (
              <div key={l.id} className="row-card" style={{ opacity: expired ? 0.6 : 1 }}>
                <div className="row-card-top">
                  <div>
                    <div className="cell-title">{l.employee_name}</div>
                    <div className="cell-subtitle">{l.designation}</div>
                  </div>
                  {/* Same range as the table's Dates column; one date for a single-day leave. */}
                  <div className="row-card-meta">
                    {new Date(l.start_date).toLocaleDateString()}
                    {l.end_date && l.end_date !== l.start_date && (
                      <> – {new Date(l.end_date).toLocaleDateString()}</>
                    )}
                  </div>
                </div>

                <div className="row-card-line">
                  <span className="badge" style={{ background: `${LEAVE_COLORS[l.leave_type]}22`, color: LEAVE_COLORS[l.leave_type], fontWeight: 600, textTransform: 'capitalize' }}>
                    {l.leave_type}
                  </span>
                </div>

                {l.reason && (
                  // Up to 3 lines: no hover on touch screens to reveal a one-line truncation.
                  <div className="row-card-line line-clamp-3 break-words text-sm text-muted">{l.reason}</div>
                )}

                <div className="row-card-line" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: meta.bg, color: meta.color,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                  {meta.label}
                  {(ds === 'approved' || ds === 'rejected') && l.reviewer_name && ` · by ${l.reviewer_name}`}
                </div>

                {(canApproveReject || canEditCancel || (expired && l.status === 'pending')) && (
                  <div className="row-card-actions">
                    {canApproveReject && (
                      <>
                        <button className="btn btn-sm btn-accent" onClick={() => approve(l.id)}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => reject(l.id)}>Reject</button>
                      </>
                    )}
                    {canEditCancel && (
                      <>
                        <button className="btn btn-sm btn-ghost" onClick={() => openEditModal(l)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => cancelLeave(l.id)}>Cancel</button>
                      </>
                    )}
                    {expired && l.status === 'pending' && (
                      <span className="text-muted" style={{ fontSize: 11 }}>No actions available</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── New Leave Request Modal ──────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Leave Request</h2>
              <button className="modal-close" onClick={() => setShowLeaveModal(false)}>×</button>
            </div>
            <form onSubmit={submitLeave}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-select" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                  <option value="sick">Sick</option>
                  <option value="bereavement">Bereavement</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <PillTabs
                  value={span}
                  onChange={(v) => {
                    setSpan(v as 'single' | 'range');
                    if (v === 'single') setForm((f) => ({ ...f, end_date: f.start_date }));
                  }}
                  options={[
                    { value: 'single', label: 'Single Day' },
                    { value: 'range', label: 'Date Range' },
                  ]}
                />
              </div>
              {span === 'single' ? (
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    className="form-input" type="date" min={minDate} value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value, end_date: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date" min={minDate} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date" min={form.start_date || minDate} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>

              {/* Notify people */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 4 }}>
                <div className="form-group">
                  <label className="form-label">Notify people (optional)</label>
                  <MultiSelect
                    options={employeeNames}
                    value={form.notify}
                    onChange={(notify) => setForm({ ...form, notify })}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>
                <Button variant="text" size="small" onClick={() => setShowLeaveModal(false)}>
                  Cancel
                </Button>

                <Button variant="primary" size="small" type="submit">
                  {form.notify.length ? 'Submit & Notify' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Leave Modal ─────────────────────────────────────────────── */}
      {editingLeave && (
        <div className="modal-overlay" onClick={() => setEditingLeave(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Leave Request</h2>
              <Button variant="text" size="small" onClick={() => setEditingLeave(null)}>
                X
              </Button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-select" value={editForm.leave_type} onChange={e => setEditForm({ ...editForm, leave_type: e.target.value })}>
                  <option value="sick">Sick</option>
                  <option value="bereavement">Bereavement</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <PillTabs
                  value={editSpan}
                  onChange={(v) => {
                    setEditSpan(v as 'single' | 'range');
                    if (v === 'single') setEditForm((f) => ({ ...f, end_date: f.start_date }));
                  }}
                  options={[
                    { value: 'single', label: 'Single Day' },
                    { value: 'range', label: 'Date Range' },
                  ]}
                />
              </div>
              {editSpan === 'single' ? (
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    className="form-input" type="date" min={minDate} value={editForm.start_date}
                    onChange={e => setEditForm({ ...editForm, start_date: e.target.value, end_date: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date" min={minDate} value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date" min={editForm.start_date || minDate} value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} required />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>
                <Button variant="text" size="small" onClick={() => setEditingLeave(null)}>Cancel</Button>
                <Button variant="primary" type="submit" size="small">Save Change</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}