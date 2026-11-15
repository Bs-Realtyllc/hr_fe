'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { nepalTodayString, formatTimeNepal } from '@/lib/datetime';
import PillTabs from '@/components/PillTabs';
import Button from '@/components/Button/Button';
import { showToast } from '@/lib/toast';

type RequestType = 'planned' | 'worked';

interface OvertimeRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  designation: string;
  project_id: number | null;
  project_name: string | null;
  request_type: RequestType;
  session_count: number;
  sessions: OvertimeSessionDetail[];
  work_date: string;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_name?: string;
  approved_despite_mismatch: boolean;
  actual_hours: number | null;
  reconciled_at: string | null;
  reconciler_name?: string;
  hourly_rate: number | null;
  overtime_rate: number | null;
  amount: number | null;
  // Only ever meaningful for 'planned' requests past their date (a preview
  // of what reconciliation will find) — null for 'worked', since those are
  // always built directly from the exact sessions they claim and can't
  // mismatch by construction. Also null until company hours are configured.
  clocked_seconds: number | null;
  hours_mismatch: boolean | null;
  // True when that day's clock-out was guessed by the auto-close job rather
  // than actually reported — the comparison above is a best guess, not a
  // confirmed mismatch.
  clocked_seconds_estimated: boolean;
  // True for a 'planned' request that's approved, past its date, and
  // hasn't had its actual hours reconciled yet.
  needs_reconciliation: boolean;
}

// The exact clock session(s) a 'worked' request was built from, as returned
// alongside each overtime row — lets a reviewer see precisely which shift(s)
// a claim covers instead of just a count.
interface OvertimeSessionDetail {
  clock_id: number;
  clock_date: string;
  clock_in: string;
  clock_out: string | null;
  clock_out_estimated: boolean;
}

// One of the employee's own recorded clock sessions, as returned by
// /clock/attendance/me — the same shape the Tracker page itself renders.
interface ClockSession {
  clockId: number;
  clockDate: string;
  clockIn: string;
  clockOut: string | null;
  totalPauseDuration: number;
  totalClockInDuration: number;
}

function formatHoursMinutes(totalSeconds: number): string {
  // Rounding straight to minutes silently turns any real 1–59 second
  // session into a misleading "0m" — show seconds for anything that short
  // instead of discarding it.
  if (totalSeconds > 0 && totalSeconds < 60) return `${totalSeconds}s`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

// Claims are billed to the nearest half-hour (matches the form's own
// step="0.5") — the backend rejects a selection that rounds to 0 outright,
// so the UI needs to catch that before submit, not after.
function secondsToHalfHours(totalSeconds: number): number {
  return Math.round((totalSeconds / 3600) * 2) / 2;
}

function formatDay(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

interface ProjectOption {
  id: number;
  name: string;
}

const STATUS_META: Record<OvertimeRequest['status'], { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: 'Pending', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  approved: { label: 'Approved', color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' },
};

const TYPE_META: Record<RequestType, { label: string; color: string; bg: string }> = {
  planned: { label: 'Planned', color: '#1d4ed8', bg: '#eff6ff' },
  worked: { label: 'Worked', color: '#4b5563', bg: '#f3f4f6' },
};

const BLANK_PLANNED_FORM = {
  project_id: '',
  work_date: '',
  hours: '',
  reason: '',
};

const BLANK_EDIT_FORM = {
  project_id: '',
  work_date: '',
  hours: '',
  reason: '',
};

export default function OvertimePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';
  const today = nepalTodayString();

  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [allRequests, setAllRequests] = useState<OvertimeRequest[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('worked');
  const [projectId, setProjectId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 'planned' form fields (always manual — the work hasn't happened yet).
  const [plannedForm, setPlannedForm] = useState(BLANK_PLANNED_FORM);

  // 'worked' session picker — browse a date range, multi-select any of
  // your own recorded sessions across however many of those days.
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [availableSessions, setAvailableSessions] = useState<ClockSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedClockIds, setSelectedClockIds] = useState<Set<number>>(new Set());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT_FORM);

  const loadAll = () => api.get<OvertimeRequest[]>('/overtime').then(setAllRequests).catch(() => {showToast('error','Failed to load overtime')});

  const load = () => {
    api.get<OvertimeRequest[]>(`/overtime${filter !== 'all' ? `?status=${filter}` : ''}`).then(setRequests).catch(() => { });
    loadAll();
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { api.get<ProjectOption[]>('/projects').then(setProjects).catch(() => { }); }, []);

  // Load every session across the chosen range in one call, whenever either
  // end of the range changes.
  useEffect(() => {
    if (requestType !== 'worked' || !rangeStart || !rangeEnd) {
      setAvailableSessions([]);
      return;
    }
    setLoadingSessions(true);
    api.get<{ data: ClockSession[] }>(`/clock/attendance/me?startDate=${rangeStart}&endDate=${rangeEnd}&limit=100`)
      .then((res) => setAvailableSessions((res.data ?? []).filter((s) => s.totalClockInDuration > 0)))
      .catch(() => setAvailableSessions([]))
      .finally(() => setLoadingSessions(false));
  }, [rangeStart, rangeEnd, requestType]);

  const openModal = () => {
    setRequestType('worked');
    setProjectId('');
    setReason('');
    setPlannedForm(BLANK_PLANNED_FORM);
    setRangeStart('');
    setRangeEnd('');
    setAvailableSessions([]);
    setSelectedClockIds(new Set());
    setError('');
    setShowModal(true);
  };

  const toggleSession = (clockId: number) => {
    setSelectedClockIds((prev) => {
      const next = new Set(prev);
      if (next.has(clockId)) next.delete(clockId);
      else next.add(clockId);
      return next;
    });
  };

  // Group selected sessions by their own clock_date — a request covers one
  // day, so a selection spanning several days becomes one request per day.
  const selectedByDate = (() => {
    const groups = new Map<string, ClockSession[]>();
    for (const s of availableSessions) {
      if (!selectedClockIds.has(s.clockId)) continue;
      if (!groups.has(s.clockDate)) groups.set(s.clockDate, []);
      groups.get(s.clockDate)!.push(s);
    }
    return groups;
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (requestType === 'planned') {
      setSubmitting(true);
      try {
        await api.post('/overtime', {
          request_type: 'planned',
          project_id: projectId ? Number(projectId) : null,
          work_date: plannedForm.work_date,
          hours: Number(plannedForm.hours),
          reason,
        });
        setShowModal(false);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Submission failed');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 'worked' — one request per distinct date among the selected sessions.
    if (selectedByDate.size === 0) {
      setError('Select at least one clock session');
      return;
    }
    setSubmitting(true);
    let succeeded = 0;
    let firstError = '';
    for (const [, sessions] of selectedByDate) {
      try {
        await api.post('/overtime', {
          request_type: 'worked',
          project_id: projectId ? Number(projectId) : null,
          clock_ids: sessions.map((s) => s.clockId),
          reason,
        });
        succeeded++;
      } catch (err: unknown) {
        if (!firstError) firstError = err instanceof Error ? err.message : 'Submission failed';
      }
    }
    setSubmitting(false);

    if (succeeded > 0) {
      showToast('success', `Created ${succeeded} overtime request${succeeded > 1 ? 's' : ''}${firstError ? ` — ${selectedByDate.size - succeeded} failed` : ''}`);
      load();
    }
    if (firstError) {
      setError(succeeded > 0 ? `Some dates failed: ${firstError}` : firstError);
      if (succeeded === 0) return;
    }
    setShowModal(false);
  };

  const openEditModal = (o: OvertimeRequest) => {
    setEditingId(o.id);
    setEditForm({
      project_id: o.project_id ? String(o.project_id) : '',
      work_date: o.work_date.split('T')[0],
      hours: String(o.hours),
      reason: o.reason,
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
      });
      setEditingId(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const cancelRequest = async (id: number) => {
    if (!confirm('Cancel this overtime request?')) return;
    try {
      await api.delete(`/overtime/${id}`);
      load();
      showToast('success', 'Overtime request cancelled');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const approve = async (o: OvertimeRequest) => {
    try {
      await api.put(`/overtime/${o.id}/approve`, {});
      load();
      showToast('success', 'Overtime accepted');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Approve failed');
    }
  };
  const reject = async (id: number) => {
    try{
      await api.put(`/overtime/${id}/reject`, {});
      load();
      showToast('success','Overtime Rejected')
    }catch(err){
      showToast('error', err instanceof Error ? err.message : 'Reject failed')
    }
  };

  const reconcile = async (o: OvertimeRequest) => {
    if (!confirm(`Reconcile ${o.employee_name}'s planned overtime for ${o.work_date} against their actual clocked hours?`)) return;
    try {
      const res = await api.put<{ actual_hours: number; amount: number; clocked_seconds_estimated: boolean }>(`/overtime/${o.id}/reconcile`, {});
      load();
      const warning = res.clocked_seconds_estimated
        ? ' — note: that day\'s clock-out was auto-estimated, not actually reported, so this is a best guess'
        : '';
      showToast('success', `Reconciled: paid for ${res.actual_hours}h (planned ${o.hours}h)${warning}`);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Reconcile failed');
    }
  };

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;
  const approvedCount = allRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;
  const approvedThisMonth = allRequests.filter(r => {
    if (r.status !== 'approved') return false;
    const d = new Date(r.work_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalHoursThisMonth = approvedThisMonth.reduce((s, r) => s + Number(r.actual_hours ?? r.hours), 0);
  const totalPayThisMonth = approvedThisMonth.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const hasZeroRoundingDate = Array.from(selectedByDate.values()).some(
    (sessions) => secondsToHalfHours(sessions.reduce((sum, s) => sum + s.totalClockInDuration, 0)) === 0,
  );

  const canSubmit = requestType === 'planned'
    ? Boolean(plannedForm.work_date && plannedForm.hours && reason)
    : Boolean(selectedClockIds.size > 0 && reason && !hasZeroRoundingDate);

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

          {/* Admin doesn't clock in (no Tracker access), so there's no
              attendance data to verify a personal overtime claim against —
              admin reviews everyone else's requests instead of submitting
              their own. */}
          {!isAdmin && (
            <Button variant='primary' size='small' onClick={openModal} leftIcon={<span
              className="icon-mask"
              style={{ height: 16, width: 16, WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
            />}> New Overtime Request</Button>
          )}
        </div>
      </div>

      {/* Filter tabs — counts fold the old "Pending Requests" stat into here */}
      <div className="mb-4">
        <PillTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All (${allRequests.length})` },
            { value: 'pending', label: `Pending (${pendingCount})` },
            { value: 'approved', label: `Approved (${approvedCount})` },
            { value: 'rejected', label: `Rejected (${rejectedCount})` },
          ]}
        />
      </div>

      {requests.length === 0 ? (
        <div className="empty-state card">
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/clock.svg)', maskImage: 'url(/icons/clock.svg)' }}
          />
          <p>No overtime requests found</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Type</th><th>Project</th><th>Date</th><th>Hours</th>
                  <th>Reason</th><th>Status</th><th>Pay (150%)</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(o => {
                  const isOwn = o.employee_id === user?.id;
                  const meta = STATUS_META[o.status];
                  const typeMeta = TYPE_META[o.request_type];
                  const canApproveReject = o.status === 'pending' && isPrivileged && !isOwn;
                  // 'worked' requests are always derived from sessions, so
                  // there's nothing free-typed to edit — cancel & resubmit.
                  const canEdit = o.status === 'pending' && isOwn && o.request_type === 'planned';
                  const canCancel = o.status === 'pending' && isOwn;
                  const canReconcile = o.needs_reconciliation && isPrivileged && !isOwn;

                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="cell-title">{o.employee_name}</div>
                        <div className="cell-subtitle">{o.designation}</div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: typeMeta.bg, color: typeMeta.color,
                        }}>
                          {typeMeta.label}
                        </span>
                        {o.session_count > 0 && (
                          <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                            from {o.session_count} clocked session{o.session_count > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="text-sm">{o.project_name || <span className="text-muted">General duties</span>}</td>
                      <td className="text-sm">{new Date(o.work_date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {o.actual_hours != null ? `${o.actual_hours}h` : `${o.hours}h`}
                          {o.actual_hours != null && o.actual_hours !== o.hours && (
                            <span className="text-muted" style={{ fontWeight: 400, fontSize: 11 }}> (planned {o.hours}h)</span>
                          )}
                        </div>
                        {o.sessions.length > 0 && (
                          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {o.sessions.map(s => (
                              <div key={s.clock_id} style={{ fontSize: 12, color: 'var(--color-text-body)' }}>
                                {formatTimeNepal(s.clock_in)} – {s.clock_out ? formatTimeNepal(s.clock_out) : 'still clocked in'}
                                {s.clock_out_estimated && (
                                  <span
                                    title="This clock-out was auto-estimated by the system, not actually reported by the employee."
                                    className="text-muted"
                                    style={{ fontStyle: 'italic' }}
                                  > (estimated)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {o.clocked_seconds != null && (
                          <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                            Clocked: {formatHoursMinutes(o.clocked_seconds)}
                            {o.clocked_seconds_estimated ? (
                              <span title="That day's clock-out was auto-estimated, not actually reported — treat this comparison as a rough guess." style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}> (estimated)</span>
                            ) : o.hours_mismatch && (
                              <span style={{ color: 'var(--color-error)', fontWeight: 600 }}> ⚠ mismatch</span>
                            )}
                          </div>
                        )}
                        {o.approved_despite_mismatch && (
                          <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>Approved despite mismatch</div>
                        )}
                      </td>
                      <td style={{ maxWidth: 200 }}><div className="truncate text-sm">{o.reason}</div></td>
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
                        {o.reconciled_at && o.reconciler_name && (
                          <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>reconciled by {o.reconciler_name}</div>
                        )}
                      </td>
                      <td>
                        {o.status === 'approved' && o.amount != null ? (
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>+ Rs. {Number(o.amount).toLocaleString()}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>Rs. {o.overtime_rate}/hr</div>
                          </div>
                        ) : o.needs_reconciliation ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: '#fef3c7', color: '#b45309',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                            Pending reconciliation
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                          {canApproveReject && (
                            <>
                              <button className="btn btn-sm btn-accent" onClick={() => approve(o)}>Approve</button>
                              <button className="btn btn-sm btn-danger" onClick={() => reject(o.id)}>Reject</button>
                            </>
                          )}
                          {canReconcile && (
                            <button className="btn btn-sm btn-accent" onClick={() => reconcile(o)}>Reconcile</button>
                          )}
                          {canEdit && (
                            <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(o)}>Edit</button>
                          )}
                          {canCancel && (
                            <button className="btn btn-sm btn-danger" onClick={() => cancelRequest(o.id)}>Cancel</button>
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
      )}

      {/* ── New Overtime Request Modal ───────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Overtime Request</h2>

              <Button variant='text' size='small' onClick={() => setShowModal(false)}
              > X</Button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Request Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm ${requestType === 'planned' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRequestType('planned')}
                  >
                    Plan ahead
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${requestType === 'worked' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRequestType('worked')}
                  >
                    Log hours already worked
                  </button>
                </div>
                <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {requestType === 'planned'
                    ? 'Request approval before working overtime — you pick a date today or later. Pay is finalized once the date passes and your actual clocked hours are reconciled.'
                    : 'Pick the clock session(s) that were overtime — hours come directly from what you actually clocked. You can select sessions across several different days at once.'}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">General duties (no specific project)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {requestType === 'planned' ? (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Date Planned</label>
                    <input
                      className="form-input" type="date" value={plannedForm.work_date} min={today}
                      onChange={e => setPlannedForm({ ...plannedForm, work_date: e.target.value })} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Hours</label>
                    <input className="form-input" type="number" step="0.5" min="0.5" max="16" placeholder="e.g. 3"
                      value={plannedForm.hours} onChange={e => setPlannedForm({ ...plannedForm, hours: e.target.value })} required />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Date Range to Browse</label>
                  <div className="grid-2">
                    <input className="form-input" type="date" value={rangeStart} max={rangeEnd || today}
                      onChange={e => setRangeStart(e.target.value)} />
                    <input className="form-input" type="date" value={rangeEnd} min={rangeStart || undefined} max={today}
                      onChange={e => setRangeEnd(e.target.value)} />
                  </div>

                  {rangeStart && rangeEnd && (
                    <div style={{ marginTop: 10 }}>
                      {loadingSessions ? (
                        <p className="text-muted text-sm">Loading your clock sessions…</p>
                      ) : availableSessions.length === 0 ? (
                        <p className="text-muted text-sm">No clock sessions found in this range.</p>
                      ) : (
                        <>
                          <label className="form-label" style={{ marginBottom: 6 }}>Which session(s) were overtime?</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {availableSessions.map(s => (
                              <label
                                key={s.clockId}
                                className="card"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer',
                                  borderColor: selectedClockIds.has(s.clockId) ? 'var(--color-primary)' : undefined,
                                }}
                              >
                                <input
                                  type="checkbox" checked={selectedClockIds.has(s.clockId)}
                                  onChange={() => toggleSession(s.clockId)}
                                />
                                <div style={{ flex: 1 }}>
                                  <div className="text-sm" style={{ fontWeight: 600 }}>
                                    {formatDay(s.clockDate, today)} · {formatTimeNepal(s.clockIn)} – {s.clockOut ? formatTimeNepal(s.clockOut) : 'still running'}
                                  </div>
                                  {s.totalPauseDuration > 0 && (
                                    <div className="text-muted" style={{ fontSize: 11 }}>includes {formatHoursMinutes(s.totalPauseDuration)} of pauses</div>
                                  )}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{formatHoursMinutes(s.totalClockInDuration)}</div>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {selectedByDate.size > 0 && (
                    <div className="card" style={{ marginTop: 10, padding: '10px 12px', background: 'var(--color-bg)' }}>
                      <div className="text-sm" style={{ fontWeight: 600, marginBottom: 4 }}>
                        Will create {selectedByDate.size} request{selectedByDate.size > 1 ? 's' : ''}:
                      </div>
                      {Array.from(selectedByDate.entries()).map(([date, sessions]) => {
                        const totalSeconds = sessions.reduce((sum, s) => sum + s.totalClockInDuration, 0);
                        const roundsToZero = secondsToHalfHours(totalSeconds) === 0;
                        return (
                          <div key={date} className="text-sm" style={{ color: roundsToZero ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                            {formatDay(date, today)} — {sessions.length} session{sessions.length > 1 ? 's' : ''}, {formatHoursMinutes(totalSeconds)}
                            {roundsToZero && ' — too short to claim (rounds to 0h, billed to the nearest half-hour)'}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason — why was overtime needed?</label>
                <textarea className="form-textarea" placeholder="e.g. Production hotfix, client deadline, release prep…"
                  value={reason} onChange={e => setReason(e.target.value)} required />
              </div>

              <div className="card" style={{ padding: '10px 14px', background: 'var(--color-primary-light)', marginBottom: 14 }}>
                <span className="text-sm" style={{ color: 'var(--color-primary)' }}>
                  Approved overtime is paid at <strong>150%</strong> of your hourly rate (monthly salary ÷ 26 days ÷ 8 hours).
                </span>
              </div>

              {error && <p style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>

                <Button variant='text' size='small' onClick={() => setShowModal(false)}
                > Cancel</Button>
                <Button variant='primary' type='submit' size='small' disabled={!canSubmit || submitting}
                > {submitting ? 'Submitting…' : 'Submit Request'}</Button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Overtime Modal (planned requests only) ─────────────────── */}
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
                  <label className="form-label">Date Planned</label>
                  <input
                    className="form-input" type="date" value={editForm.work_date} min={today}
                    onChange={e => setEditForm({ ...editForm, work_date: e.target.value })} required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Hours</label>
                  <input className="form-input" type="number" step="0.5" min="0.5" max="16"
                    value={editForm.hours} onChange={e => setEditForm({ ...editForm, hours: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} required />
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
