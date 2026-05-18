'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Project {
  id: number;
  name: string;
  description: string;
  repo_url?: string;
  docs_url?: string;
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', repo_url: '', docs_url: '', start_date: '', expected_end_date: '' });

  useEffect(() => {
    api.get<Project[]>('/projects').then(setProjects).catch(() => {});
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
    await api.post('/projects', form);
    setShowModal(false);
    api.get<Project[]>('/projects').then(setProjects).catch(() => {});
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Projects</h1>
            <p>Assignments, milestones, and project timelines</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
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
                <div className="flex gap-3 mt-3">
                  {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-sm" style={{ color: 'var(--color-accent)' }} onClick={e => e.stopPropagation()}>Repo ↗</a>}
                  {p.docs_url && <a href={p.docs_url} target="_blank" rel="noreferrer" className="text-sm" style={{ color: 'var(--color-accent)' }} onClick={e => e.stopPropagation()}>Docs ↗</a>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-title">Team — {selected.name}</div>
              {assignments.length === 0
                ? <p className="text-muted text-sm">No assignments yet</p>
                : assignments.map(a => (
                  <div key={a.id} className="flex items-center gap-3 mb-3">
                    <div className="avatar avatar-sm">{initials(a.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-sm">{a.name}</div>
                      <div className="text-muted">{a.designation}</div>
                    </div>
                    <span className="badge badge-accent">{a.role.replace('_', ' ')}</span>
                  </div>
                ))
              }
            </div>

            <div className="card">
              <div className="card-title">Milestones</div>
              {milestones.length === 0
                ? <p className="text-muted text-sm">No milestones defined</p>
                : milestones.map(m => (
                  <div key={m.id} className="flex items-center gap-3 mb-3">
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-sm">{m.title}</div>
                      <div className="text-muted">{new Date(m.due_date).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge ${msStatus[m.status]}`}>{m.status.replace('_', ' ')}</span>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
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
                  <label className="form-label">Repo URL</label>
                  <input className="form-input" type="url" value={form.repo_url} onChange={e => setForm({ ...form, repo_url: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Docs URL</label>
                  <input className="form-input" type="url" value={form.docs_url} onChange={e => setForm({ ...form, docs_url: e.target.value })} />
                </div>
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
    </div>
  );
}
