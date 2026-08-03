'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Goal {
  id: number;
  employee_id: number;
  employee_name: string;
  designation: string;
  department: string;
  title: string;
  description: string | null;
  category: 'individual' | 'team' | 'company';
  metric_unit: string;
  target_value: number | string;
  current_value: number | string;
  weight: number;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed' | 'missed';
  start_date: string | null;
  due_date: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface Employee {
  id: number;
  name: string;
  designation: string;
}

const STATUS_COLUMNS: { key: Goal['status']; label: string; color: string }[] = [
  { key: 'at_risk',     label: 'At Risk',     color: 'var(--color-error)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--color-info)' },
  { key: 'not_started', label: 'Not Started', color: 'var(--color-text-muted)' },
  { key: 'completed',   label: 'Completed',   color: 'var(--color-success)' },
  { key: 'missed',      label: 'Missed',      color: 'var(--color-warning)' },
];

const STATUS_BADGE: Record<string, string> = {
  not_started: 'badge-neutral',
  in_progress: 'badge-info',
  at_risk: 'badge-warning',
  completed: 'badge-success',
  missed: 'badge-error',
};

const CATEGORY_BADGE: Record<string, string> = {
  individual: 'badge-accent',
  team: 'badge-info',
  company: 'badge-neutral',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function num(v: number | string) {
  return typeof v === 'string' ? parseFloat(v) : v;
}

function progressPct(g: Goal) {
  const target = num(g.target_value);
  const current = num(g.current_value);
  if (!target) return 0;
  return Math.min(Math.max((current / target) * 100, 0), 100);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(g: Goal) {
  if (!g.due_date) return false;
  if (g.status === 'completed' || g.status === 'missed') return false;
  return new Date(g.due_date) < new Date(new Date().toDateString());
}

export default function GoalsPage() {
  const { user } = useAuth();
  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const [goals, setGoals]           = useState<Goal[]>([]);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    employee_id: '', title: '', description: '', category: 'individual',
    metric_unit: '%', target_value: '100', weight: '3', start_date: '', due_date: '',
  });

  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState('0');
  const [progressStatus, setProgressStatus] = useState('in_progress');

  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', category: 'individual', metric_unit: '%',
    target_value: '100', weight: '3', start_date: '', due_date: '',
  });

  useEffect(() => {
    if (isPrivileged) api.get<Employee[]>('/employees').then(setEmployees).catch(() => {});
  }, [isPrivileged]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (isPrivileged && employeeFilter) params.set('employee_id', employeeFilter);
    const q = params.toString() ? `?${params.toString()}` : '';
    api.get<Goal[]>(`/goals${q}`).then(setGoals).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [employeeFilter]);

  const columns = useMemo(() => {
    const map: Record<string, Goal[]> = {};
    STATUS_COLUMNS.forEach(c => { map[c.key] = []; });
    goals.forEach(g => { (map[g.status] ??= []).push(g); });
    return map;
  }, [goals]);

  const totals = useMemo(() => {
    const completed = goals.filter(g => g.status === 'completed').length;
    const atRisk = goals.filter(g => g.status === 'at_risk').length;
    const avgProgress = goals.length
      ? goals.reduce((s, g) => s + progressPct(g), 0) / goals.length
      : 0;
    return { total: goals.length, completed, atRisk, avgProgress: Math.round(avgProgress) };
  }, [goals]);

  function openCreate() {
    setCreateForm({
      employee_id: isPrivileged ? '' : String(user?.id ?? ''),
      title: '', description: '', category: 'individual',
      metric_unit: '%', target_value: '100', weight: '3', start_date: '', due_date: '',
    });
    setShowCreate(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/goals', {
      ...createForm,
      employee_id: createForm.employee_id ? parseInt(createForm.employee_id) : undefined,
      target_value: parseFloat(createForm.target_value) || 100,
      weight: parseInt(createForm.weight) || 3,
    });
    setShowCreate(false);
    load();
  }

  function openProgress(g: Goal) {
    setProgressGoal(g);
    setProgressValue(String(num(g.current_value)));
    setProgressStatus(g.status);
  }

  async function submitProgress() {
    if (!progressGoal) return;
    await api.put(`/goals/${progressGoal.id}/progress`, {
      current_value: parseFloat(progressValue) || 0,
      status: progressStatus,
    });
    setProgressGoal(null);
    load();
  }

  function openEdit(g: Goal) {
    setEditGoal(g);
    setEditForm({
      title: g.title, description: g.description ?? '', category: g.category,
      metric_unit: g.metric_unit, target_value: String(num(g.target_value)),
      weight: String(g.weight), start_date: g.start_date?.split('T')[0] ?? '', due_date: g.due_date?.split('T')[0] ?? '',
    });
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGoal) return;
    await api.put(`/goals/${editGoal.id}`, {
      ...editForm,
      target_value: parseFloat(editForm.target_value) || 100,
      weight: parseInt(editForm.weight) || 3,
    });
    setEditGoal(null);
    load();
  }

  async function removeGoal(id: number) {
    if (!confirm('Delete this goal?')) return;
    await api.delete(`/goals/${id}`);
    load();
  }

  const canManage = (g: Goal) => isPrivileged || g.employee_id === user?.id;

  if (loading) return <div className="page-header"><h1>Goals &amp; KPIs</h1><p>Loading…</p></div>;

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Goals &amp; KPIs</h1>
            <p>{isPrivileged ? 'Track individual, team, and company goals across the org' : 'Track your goals and key performance indicators'}</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <span
              className="icon-mask"
              style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
            />
            Add Goal
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div className="pill-group">
          <button type="button" className={`pill ${statusFilter === '' ? 'pill-active' : ''}`} onClick={() => setStatusFilter('')}>
            All ({totals.total})
          </button>
          {STATUS_COLUMNS.map(col => (
            <button
              key={col.key}
              type="button"
              className={`pill ${statusFilter === col.key ? 'pill-active' : ''}`}
              onClick={() => setStatusFilter(col.key)}
            >
              {col.label} ({columns[col.key].length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>
            Avg. progress: <strong style={{ color: 'var(--color-text-h3)' }}>{totals.avgProgress}%</strong>
          </span>
          {isPrivileged && (
            <div className="select-compact-wrap">
              <select className="select-compact" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
                <option value="">All employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <span
                className="icon-mask"
                style={{ WebkitMaskImage: 'url(/icons/chevron-down.svg)', maskImage: 'url(/icons/chevron-down.svg)' }}
              />
            </div>
          )}
          {employeeFilter && (
            <button className="btn btn-text btn-xs" onClick={() => setEmployeeFilter('')}>Clear</button>
          )}
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state card">
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/target.svg)', maskImage: 'url(/icons/target.svg)' }}
          />
          <p>No goals yet. Set one to start tracking progress.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {STATUS_COLUMNS.filter(col => !statusFilter || col.key === statusFilter).map(col => (
            <div key={col.key} style={{ flex: '0 0 280px', width: 280 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--color-text-h3)' }}>
                  {col.label}
                </span>
                <span className="badge badge-neutral">{columns[col.key].length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {columns[col.key].map(g => {
                  const pct = progressPct(g);
                  const overdue = isOverdue(g);
                  return (
                    <div key={g.id} className="card" style={{ padding: 16, borderLeft: `3px solid ${col.color}` }}>
                      <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
                        <span className={`badge ${CATEGORY_BADGE[g.category]}`}>{g.category}</span>
                        <div className="text-muted" style={{ fontSize: 11 }} title="Priority weight">
                          {'★'.repeat(g.weight)}{'☆'.repeat(Math.max(5 - g.weight, 0))}
                        </div>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{g.title}</div>
                      {g.description && <div className="text-muted text-sm" style={{ marginBottom: 8 }}>{g.description}</div>}

                      {isPrivileged && (
                        <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                          <div className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: 9 }}>{initials(g.employee_name)}</div>
                          <span className="text-muted text-sm">{g.employee_name}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center" style={{ marginBottom: 4, fontSize: 12 }}>
                        <span className="text-muted">Progress</span>
                        <span style={{ fontWeight: 600 }}>{num(g.current_value)} / {num(g.target_value)} {g.metric_unit}</span>
                      </div>
                      <div className="progress-bar" style={{ marginBottom: 10 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: col.color }} />
                      </div>

                      <div className="flex justify-between items-center">
                        {g.due_date ? (
                          <span className="text-muted" style={{ fontSize: 11, color: overdue ? 'var(--color-error)' : undefined, fontWeight: overdue ? 600 : undefined }}>
                            {overdue ? '⚠ Overdue ' : 'Due '}{fmtDate(g.due_date)}
                          </span>
                        ) : <span />}
                        {canManage(g) && (
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => openProgress(g)}>Update</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => openEdit(g)}>Edit</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', color: 'var(--color-error)' }} onClick={() => removeGoal(g.id)}>✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {columns[col.key].length === 0 && (
                  <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px 0' }}>—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Goal</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={submitCreate}>
              {isPrivileged && (
                <div className="form-group">
                  <label className="form-label">Employee</label>
                  <select className="form-select" value={createForm.employee_id}
                    onChange={e => setCreateForm({ ...createForm, employee_id: e.target.value })} required>
                    <option value="">Select employee…</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Improve API response time" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={2} value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={createForm.category}
                    onChange={e => setCreateForm({ ...createForm, category: e.target.value })}>
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                    <option value="company">Company</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Metric Unit</label>
                  <input className="form-input" value={createForm.metric_unit}
                    onChange={e => setCreateForm({ ...createForm, metric_unit: e.target.value })} placeholder="%, $, count…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Value</label>
                  <input className="form-input" type="number" value={createForm.target_value}
                    onChange={e => setCreateForm({ ...createForm, target_value: e.target.value })} />
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Priority (1-5)</label>
                  <input className="form-input" type="number" min={1} max={5} value={createForm.weight}
                    onChange={e => setCreateForm({ ...createForm, weight: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={createForm.start_date}
                    onChange={e => setCreateForm({ ...createForm, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={createForm.due_date}
                    onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress modal */}
      {progressGoal && (
        <div className="modal-overlay" onClick={() => setProgressGoal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Progress</h3>
              <button className="modal-close" onClick={() => setProgressGoal(null)}>×</button>
            </div>
            <div className="font-semibold mb-4">{progressGoal.title}</div>
            <div className="form-group">
              <label className="form-label">Current Value ({progressGoal.metric_unit}, target {num(progressGoal.target_value)})</label>
              <input className="form-input" type="number" value={progressValue} onChange={e => setProgressValue(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={progressStatus} onChange={e => setProgressStatus(e.target.value)}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="at_risk">At Risk</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
            </div>
            <div className="flex gap-3 justify-between mt-4">
              <button className="btn btn-ghost" onClick={() => setProgressGoal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitProgress}>Save Progress</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editGoal && (
        <div className="modal-overlay" onClick={() => setEditGoal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Goal</h2>
              <button className="modal-close" onClick={() => setEditGoal(null)}>×</button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={2} value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                    <option value="company">Company</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Metric Unit</label>
                  <input className="form-input" value={editForm.metric_unit}
                    onChange={e => setEditForm({ ...editForm, metric_unit: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Value</label>
                  <input className="form-input" type="number" value={editForm.target_value}
                    onChange={e => setEditForm({ ...editForm, target_value: e.target.value })} />
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Priority (1-5)</label>
                  <input className="form-input" type="number" min={1} max={5} value={editForm.weight}
                    onChange={e => setEditForm({ ...editForm, weight: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={editForm.start_date}
                    onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={editForm.due_date}
                    onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setEditGoal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
