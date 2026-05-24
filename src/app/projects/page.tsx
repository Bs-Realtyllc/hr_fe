'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: number;
  name: string;
  description: string;
  repo_url: string[];
  docs_url: string[];
  status: 'active' | 'archived' | 'on_hold';
  start_date?: string;
  expected_end_date?: string;
}

interface Milestone {
  id: number;
  title: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface Assignment {
  id: number;
  employee_id: number;
  name: string;
  designation: string;
  role: string;
  timezone: string;
}

interface Employee {
  id: number;
  name: string;
  designation: string;
}

const statusBadge: Record<string, string> = {
  active: 'badge-success',
  archived: 'badge-neutral',
  on_hold: 'badge-warning',
};

const msStatus: Record<string, string> = {
  completed: 'badge-success',
  in_progress: 'badge-info',
  pending: 'badge-neutral',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function progressPct(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)));
}

function MultiUrlField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const add = () => onChange([...values, '']);
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="form-group">
      <div className="flex items-center justify-between">
        <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
        <button type="button" onClick={add} style={{
          background: 'var(--color-accent)', color: '#fff', border: 'none',
          borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: 16, lineHeight: '20px',
        }}>+</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {values.length === 0 && (
          <p className="text-muted text-sm">No URLs yet — click + to add</p>
        )}
        {values.map((v, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className="form-input"
              type="url"
              value={v}
              placeholder="https://..."
              onChange={e => update(i, e.target.value)}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button type="button" onClick={() => remove(i)} style={{
              background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-error)',
              borderRadius: 4, width: 28, height: 28, cursor: 'pointer', fontSize: 16, flexShrink: 0,
            }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'lead';

  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', status: 'active',
    repo_url: [] as string[], docs_url: [] as string[],
    start_date: '', expected_end_date: '',
  });

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ employee_id: '', role: 'developer' });

  // Milestone add state
  const [showMsModal, setShowMsModal] = useState(false);
  const [msForm, setMsForm] = useState({ title: '', due_date: '', status: 'pending' });

  useEffect(() => {
    api.get<Project[]>('/projects').then(setProjects).catch(() => {});
    api.get<Employee[]>('/employees').then(setEmployees).catch(() => {});
  }, []);

  const selectProject = async (p: Project) => {
    setSelected(p);
    const [ms, as] = await Promise.all([
      api.get<Milestone[]>(`/projects/${p.id}/milestones`).catch(() => []),
      api.get<Assignment[]>(`/projects/${p.id}/assignments`).catch(() => []),
    ]);
    setMilestones(ms);
    setAssignments(as);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      repo_url: form.repo_url.filter(Boolean),
      docs_url: form.docs_url.filter(Boolean),
    };
    await api.post('/projects', payload);
    setShowModal(false);
    setForm({ name: '', description: '', status: 'active', repo_url: [], docs_url: [], start_date: '', expected_end_date: '' });
    api.get<Project[]>('/projects').then(setProjects).catch(() => {});
  };

  const submitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    await api.post(`/projects/${selected.id}/assignments`, {
      employee_id: parseInt(assignForm.employee_id),
      role: assignForm.role,
    });
    setShowAssignModal(false);
    setAssignForm({ employee_id: '', role: 'developer' });
    const as = await api.get<Assignment[]>(`/projects/${selected.id}/assignments`).catch(() => []);
    setAssignments(as);
  };

  const removeAssignment = async (empId: number) => {
    if (!selected) return;
    await api.delete(`/projects/${selected.id}/assignments/${empId}`).catch(() => {});
    const as = await api.get<Assignment[]>(`/projects/${selected.id}/assignments`).catch(() => []);
    setAssignments(as);
  };

  const submitMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    await api.post(`/projects/${selected.id}/milestones`, msForm);
    setShowMsModal(false);
    setMsForm({ title: '', due_date: '', status: 'pending' });
    const ms = await api.get<Milestone[]>(`/projects/${selected.id}/milestones`).catch(() => []);
    setMilestones(ms);
  };

  const updateMsStatus = async (ms: Milestone, status: string) => {
    if (!selected) return;
    await api.put(`/projects/${selected.id}/milestones/${ms.id}`, { status }).catch(() => {});
    const updated = await api.get<Milestone[]>(`/projects/${selected.id}/milestones`).catch(() => []);
    setMilestones(updated);
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Projects</h1>
            <p>Assignments, milestones, and project timelines</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.length === 0 && (
            <div className="empty-state card">
              <div style={{ fontSize: 40 }}>📁</div>
              <p>No projects yet</p>
            </div>
          )}
          {projects.map(p => {
            const pct = progressPct(p.start_date, p.expected_end_date);
            const repos = Array.isArray(p.repo_url) ? p.repo_url : [];
            const docs = Array.isArray(p.docs_url) ? p.docs_url : [];
            return (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', border: selected?.id === p.id ? '2px solid var(--color-accent)' : '2px solid transparent' }}
                onClick={() => selectProject(p)}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</h3>
                  <span className={`badge ${statusBadge[p.status]}`}>{p.status}</span>
                </div>
                {p.description && <p className="text-sm text-muted" style={{ marginBottom: 12 }}>{p.description}</p>}
                {(p.start_date && p.expected_end_date) && (
                  <div>
                    <div className="flex justify-between text-muted text-sm" style={{ marginBottom: 6 }}>
                      <span>{new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      <span>{pct}%</span>
                      <span>{new Date(p.expected_end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {(repos.length > 0 || docs.length > 0) && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {repos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                        style={{ color: 'var(--color-accent)' }} onClick={e => e.stopPropagation()}>
                        Repo {repos.length > 1 ? i + 1 : ''} ↗
                      </a>
                    ))}
                    {docs.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                        style={{ color: 'var(--color-accent)' }} onClick={e => e.stopPropagation()}>
                        Docs {docs.length > 1 ? i + 1 : ''} ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Team */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <div className="card-title" style={{ marginBottom: 0 }}>Team — {selected.name}</div>
                {isAdmin && (
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setShowAssignModal(true)}>+ Assign</button>
                )}
              </div>
              {assignments.length === 0
                ? <p className="text-muted text-sm">No assignments yet</p>
                : assignments.map(a => (
                  <div key={a.id} className="flex items-center gap-3 mb-3">
                    <div className="avatar avatar-sm">{initials(a.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-sm">{a.name}</div>
                      <div className="text-muted">{a.designation}</div>
                    </div>
                    <span className="badge badge-accent">{a.role.replace(/_/g, ' ')}</span>
                    {isAdmin && (
                      <button onClick={() => removeAssignment(a.employee_id)} style={{
                        background: 'none', border: 'none', color: 'var(--color-error)',
                        cursor: 'pointer', fontSize: 16, padding: '0 4px',
                      }}>×</button>
                    )}
                  </div>
                ))
              }
            </div>

            {/* Milestones */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <div className="card-title" style={{ marginBottom: 0 }}>Milestones</div>
                {isAdmin && (
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setShowMsModal(true)}>+ Add</button>
                )}
              </div>
              {milestones.length === 0
                ? <p className="text-muted text-sm">No milestones defined</p>
                : milestones.map(m => (
                  <div key={m.id} className="flex items-center gap-3 mb-3">
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-sm">{m.title}</div>
                      <div className="text-muted">{new Date(m.due_date).toLocaleDateString()}</div>
                    </div>
                    {isAdmin ? (
                      <select
                        value={m.status}
                        onChange={e => updateMsStatus(m, e.target.value)}
                        className="form-select"
                        style={{ width: 'auto', padding: '2px 8px', fontSize: 12 }}
                      >
                        <option value="pending">pending</option>
                        <option value="in_progress">in progress</option>
                        <option value="completed">completed</option>
                      </select>
                    ) : (
                      <span className={`badge ${msStatus[m.status]}`}>{m.status.replace('_', ' ')}</span>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        ) : (
          <div className="empty-state card">
            <div style={{ fontSize: 40 }}>👈</div>
            <p>Select a project to view details</p>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <MultiUrlField label="Repo URLs" values={form.repo_url} onChange={v => setForm({ ...form, repo_url: v })} />
              <MultiUrlField label="Docs URLs" values={form.docs_url} onChange={v => setForm({ ...form, docs_url: v })} />
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expected End Date</label>
                  <input className="form-input" type="date" value={form.expected_end_date} onChange={e => setForm({ ...form, expected_end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign to {selected?.name}</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <form onSubmit={submitAssign}>
              <div className="form-group">
                <label className="form-label">Employee *</label>
                <select className="form-select" value={assignForm.employee_id}
                  onChange={e => setAssignForm({ ...assignForm, employee_id: e.target.value })} required>
                  <option value="">Select employee…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.designation}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-input" value={assignForm.role}
                  onChange={e => setAssignForm({ ...assignForm, role: e.target.value })}
                  placeholder="e.g. developer, tech lead, designer" />
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showMsModal && (
        <div className="modal-overlay" onClick={() => setShowMsModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Milestone</h2>
              <button className="modal-close" onClick={() => setShowMsModal(false)}>×</button>
            </div>
            <form onSubmit={submitMilestone}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={msForm.title}
                  onChange={e => setMsForm({ ...msForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={msForm.due_date}
                  onChange={e => setMsForm({ ...msForm, due_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={msForm.status}
                  onChange={e => setMsForm({ ...msForm, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowMsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Milestone</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
