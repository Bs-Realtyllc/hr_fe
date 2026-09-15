'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { BSRealtyButton } from '@bsrealtyllc/design-system';

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
}

interface Employee {
  id: number;
  name: string;
  designation: string;
}

interface ServiceDef {
  key: string;
  name: string;
  logoSrc: string;
  color: string;
}

const ALL_SERVICES: ServiceDef[] = [
  { key: 'drone', name: 'Drone CI', logoSrc: '/logos/drone.svg', color: '#1565C0' },
  { key: 'sonarqube', name: 'SonarQube', logoSrc: '/logos/sonar.svg', color: '#00897B' },
  { key: 'design', name: 'Design', logoSrc: '/logos/storybook.svg', color: '#FF4785' },
  { key: 'bsrealty', name: 'BS Realty', logoSrc: '/logos/bsrealty.png', color: '#1e3a5f' },
  { key: 'insurance', name: 'Insurance', logoSrc: '/logos/insurance.png', color: '#2563eb' },
  { key: 'gitgi', name: 'GITGI', logoSrc: '/logos/gitgi.svg', color: '#235e94' },
  { key: 'job-portal', name: 'Job Portal', logoSrc: '/logos/job-portal.svg', color: '#863bff' },
];

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
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
            <button
              type="button"
              className="btn btn-text btn-xs btn-danger"
              style={{ flexShrink: 0, padding: 8 }}
              onClick={() => remove(i)}
              title="Remove"
            >
              <span
                className="icon-mask"
                style={{ WebkitMaskImage: 'url(/icons/x.svg)', maskImage: 'url(/icons/x.svg)' }}
              />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
            background: 'transparent', color: 'var(--color-text-muted)',
            padding: '8px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <span
            className="icon-mask"
            style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)', width: 14, height: 14 }}
          />
          Add URL
        </button>
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

  const [projectServices, setProjectServices] = useState<string[]>([]);

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ employee_id: '', role: 'developer' });

  // Milestone add state
  const [showMsModal, setShowMsModal] = useState(false);
  const [msForm, setMsForm] = useState({ title: '', due_date: '', status: 'pending' });

  useEffect(() => {
    api.get<Project[]>('/projects').then(list => {
      setProjects(list);
      if (list.length > 0) selectProject(list[0]);
    }).catch(() => { });
    api.get<Employee[]>('/employees').then(setEmployees).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectProject = async (p: Project) => {
    setSelected(p);
    const [ms, as, svcs] = await Promise.all([
      api.get<Milestone[]>(`/projects/${p.id}/milestones`).catch(() => []),
      api.get<Assignment[]>(`/projects/${p.id}/assignments`).catch(() => []),
      api.get<string[]>(`/projects/${p.id}/services`).catch(() => []),
    ]);
    setMilestones(ms);
    setAssignments(as);
    setProjectServices(svcs);
  };

  const toggleService = async (serviceKey: string) => {
    if (!selected) return;
    const active = projectServices.includes(serviceKey);
    if (active) {
      await api.delete(`/projects/${selected.id}/services/${serviceKey}`).catch(() => { });
      setProjectServices(prev => prev.filter(k => k !== serviceKey));
    } else {
      await api.post(`/projects/${selected.id}/services`, { service_key: serviceKey }).catch(() => { });
      setProjectServices(prev => [...prev, serviceKey]);
    }
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
    api.get<Project[]>('/projects').then(setProjects).catch(() => { });
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
    await api.delete(`/projects/${selected.id}/assignments/${empId}`).catch(() => { });
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
    await api.put(`/projects/${selected.id}/milestones/${ms.id}`, { status }).catch(() => { });
    const updated = await api.get<Milestone[]>(`/projects/${selected.id}/milestones`).catch(() => []);
    setMilestones(updated);
  };

  const deleteProject = async (p: Project) => {
    if (!window.confirm(`Delete "${p.name}"? This removes its assignments, milestones, and services. This cannot be undone.`)) return;
    await api.delete(`/projects/${p.id}`).catch(() => { });
    const remaining = projects.filter(proj => proj.id !== p.id);
    setProjects(remaining);
    if (selected?.id === p.id) {
      if (remaining.length > 0) {
        selectProject(remaining[0]);
      } else {
        setSelected(null);
        setMilestones([]);
        setAssignments([]);
        setProjectServices([]);
      }
    }
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

            <BSRealtyButton
              label="+ New Project"
              variant="primary"
              size="small"
              showLeftIcon={false}
              showRightIcon={false}
              onClick={() => { setShowModal(true) }}
            />
          )}
        </div>
      </div>

      <div className={`projects-layout ${selected ? 'has-detail' : ''}`}>
        {/* Project list — hidden on mobile once a project is selected, see .projects-layout.has-detail in grid.css */}
        <div className="projects-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.length === 0 && (
            <div className="empty-state card">
              <span
                className="icon-mask empty-state-icon"
                style={{ WebkitMaskImage: 'url(/icons/folder.svg)', maskImage: 'url(/icons/folder.svg)' }}
              />
              <p>No projects yet</p>
            </div>
          )}
          {projects.map(p => {
            const pct = progressPct(p.start_date, p.expected_end_date);
            const isSelected = selected?.id === p.id;
            const progressColor = p.status === 'on_hold' ? 'var(--color-warning)'
              : p.status === 'archived' ? 'var(--color-text-muted)'
                : 'var(--color-accent)';
            return (
              <div
                key={p.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: 16,
                  background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  boxShadow: isSelected ? '0 0 0 1.5px var(--color-primary)' : 'var(--shadow-card)',
                  transition: 'background 0.15s, box-shadow 0.15s',
                }}
                onClick={() => selectProject(p)}
              >
                <div className="flex justify-between items-center mb-2" style={{ gap: 8 }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </h3>
                  <span className={`badge ${statusBadge[p.status]}`} style={{ flexShrink: 0 }}>{p.status.replace('_', ' ')}</span>
                </div>
                {p.description && (
                  <p className="text-sm text-muted" style={{
                    marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {p.description}
                  </p>
                )}
                {(p.start_date && p.expected_end_date) && (
                  <div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: progressColor }} />
                    </div>
                    <div className="flex justify-between text-muted" style={{ marginTop: 6, fontSize: 11 }}>
                      <span>{new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      <span style={{ fontWeight: 600 }}>{pct}%</span>
                      <span>{new Date(p.expected_end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Mobile-only: the list is hidden here (see .projects-layout.has-detail), so this is the way back */}
            <button
              type="button"
              className="btn btn-text btn-xs projects-back-btn"
              onClick={() => setSelected(null)}
            >
              <span
                className="icon-mask"
                style={{ WebkitMaskImage: 'url(/icons/chevron-left.svg)', maskImage: 'url(/icons/chevron-left.svg)' }}
              />
              Back to projects
            </button>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</h2>
                  <span className={`badge ${statusBadge[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
                </div>
                {selected.description && <p className="text-muted text-sm">{selected.description}</p>}
                {(() => {
                  const repos = Array.isArray(selected.repo_url) ? selected.repo_url : [];
                  const docs = Array.isArray(selected.docs_url) ? selected.docs_url : [];
                  return (repos.length > 0 || docs.length > 0) && (
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {repos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                          style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                          Repo {repos.length > 1 ? i + 1 : ''} ↗
                        </a>
                      ))}
                      {docs.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                          style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                          Docs {docs.length > 1 ? i + 1 : ''} ↗
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {isAdmin && (
                <button
                  className="btn btn-secondary btn-xs btn-danger"
                  style={{ flexShrink: 0 }}
                  onClick={() => deleteProject(selected)}
                >
                  Delete
                </button>
              )}
            </div>

            <div className="grid-2" style={{ gap: 16, alignItems: 'start' }}>
              {/* Team */}
              <div className="card">
                <div className="flex justify-between items-center mb-3">
                  <div className="card-title" style={{ marginBottom: 0 }}>Team</div>
                  {isAdmin && (
                    <button className="btn btn-primary btn-xs"
                      onClick={() => setShowAssignModal(true)}>+ Assign</button>
                  )}
                </div>
                {assignments.length === 0
                  ? <p className="text-muted text-sm">No assignments yet</p>
                  : assignments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 mb-3">
                      <div className="avatar avatar-sm">{initials(a.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                        <div className="text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.designation}</div>
                      </div>
                      <span className="badge badge-accent" style={{ flexShrink: 0 }}>{a.role.replace(/_/g, ' ')}</span>
                      {isAdmin && (
                        <button onClick={() => removeAssignment(a.employee_id)} style={{
                          background: 'none', border: 'none', color: 'var(--color-error)',
                          cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0,
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
                    <button className="btn btn-primary btn-xs"
                      onClick={() => setShowMsModal(true)}>+ Add</button>
                  )}
                </div>
                {milestones.length === 0
                  ? <p className="text-muted text-sm">No milestones defined</p>
                  : milestones.map(m => (
                    <div key={m.id} className="flex items-center gap-3 mb-3">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                        <div className="text-muted">{new Date(m.due_date).toLocaleDateString()}</div>
                      </div>
                      {isAdmin ? (
                        <select
                          value={m.status}
                          onChange={e => updateMsStatus(m, e.target.value)}
                          className="form-select"
                          style={{ width: 'auto', padding: '2px 8px', fontSize: 12, flexShrink: 0 }}
                        >
                          <option value="pending">pending</option>
                          <option value="in_progress">in progress</option>
                          <option value="completed">completed</option>
                        </select>
                      ) : (
                        <span className={`badge ${msStatus[m.status]}`} style={{ flexShrink: 0 }}>{m.status.replace('_', ' ')}</span>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Services */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Services</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {ALL_SERVICES.map(svc => {
                  const active = projectServices.includes(svc.key);
                  return (
                    <div
                      key={svc.key}
                      onClick={() => isAdmin && toggleService(svc.key)}
                      title={svc.name}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        cursor: isAdmin ? 'pointer' : 'default', width: 64,
                        opacity: active ? 1 : 0.35,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: active ? `${svc.color}18` : 'var(--color-bg)',
                        border: active ? `2px solid ${svc.color}` : '2px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 10,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}>
                        <img src={svc.logoSrc} alt={svc.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                        {svc.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isAdmin && (
                <p className="text-muted" style={{ fontSize: 11, marginTop: 12 }}>Click a service to toggle assignment</p>
              )}
            </div>
          </div>
        ) : null}
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
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <span
                    className="icon-mask"
                    style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
                  />
                  Create Project
                </button>
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
