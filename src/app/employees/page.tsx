'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  department: string;
  manager_name?: string;
  start_date: string;
  timezone: string;
  work_hours: string;
  tech_stack: string[] | string | null;
  role: string;
  is_active: boolean;
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  start_date?: string;
  expected_end_date?: string;
  assigned_role: string;
  milestones: { id: number; title: string; due_date: string; status: string }[];
  repo_url: string[];
  docs_url: string[];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function parseTech(ts: string[] | string | null | undefined): string[] {
  if (!ts) return [];
  if (Array.isArray(ts)) return ts;
  try {
    const parsed = JSON.parse(ts as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

const roleColors: Record<string, string> = {
  admin: 'badge-error',
  lead: 'badge-accent',
  employee: 'badge-neutral',
};

const statusBadge: Record<string, string> = {
  active: 'badge-success',
  archived: 'badge-neutral',
  on_hold: 'badge-warning',
};

const msBadge: Record<string, string> = {
  completed: 'badge-success',
  in_progress: 'badge-info',
  pending: 'badge-neutral',
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'lead';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', designation: '', department: '',
    manager_id: '', start_date: '', timezone: 'UTC', work_hours: '9 AM - 5 PM',
    tech_stack: '', role: 'employee',
  });

  useEffect(() => {
    api.get<Employee[]>('/employees').then(setEmployees).catch(() => {});
  }, []);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.designation?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const selectEmployee = async (emp: Employee) => {
    if (selected?.id === emp.id) {
      setSelected(null);
      setProjects([]);
      return;
    }
    setSelected(emp);
    setLoadingProjects(true);
    const data = await api.get<Project[]>(`/projects/by-employee/${emp.id}`).catch(() => []);
    setProjects(data);
    setLoadingProjects(false);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    await api.post('/employees', {
      ...form,
      tech_stack: form.tech_stack.split(',').map(s => s.trim()).filter(Boolean),
      manager_id: form.manager_id ? parseInt(form.manager_id) : null,
    });
    setShowModal(false);
    api.get<Employee[]>('/employees').then(setEmployees).catch(() => {});
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Employee Directory</h1>
            <p>Profiles, tech stacks, availability, and contact info</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Employee</button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <input
          className="form-input"
          placeholder="Search by name, role, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', border: 'none', boxShadow: 'none', padding: '6px 0', fontSize: 14 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map(emp => {
          const tech = parseTech(emp.tech_stack);
          const isSelected = selected?.id === emp.id;
          return (
            <div
              key={emp.id}
              className="card"
              style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent' }}
              onClick={() => selectEmployee(emp)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="avatar avatar-lg">{initials(emp.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-semibold" style={{ fontSize: 15 }}>{emp.name}</div>
                  <div className="text-muted">{emp.designation}</div>
                  <span className={`badge ${roleColors[emp.role]}`} style={{ marginTop: 4 }}>{emp.role}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="flex gap-2 items-center">
                  <span className="text-muted" style={{ width: 80, flexShrink: 0 }}>Email</span>
                  <span className="text-sm truncate">{emp.email}</span>
                </div>
                {emp.department && (
                  <div className="flex gap-2 items-center">
                    <span className="text-muted" style={{ width: 80, flexShrink: 0 }}>Dept.</span>
                    <span className="text-sm">{emp.department}</span>
                  </div>
                )}
                {emp.manager_name && (
                  <div className="flex gap-2 items-center">
                    <span className="text-muted" style={{ width: 80, flexShrink: 0 }}>Reports to</span>
                    <span className="text-sm">{emp.manager_name}</span>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <span className="text-muted" style={{ width: 80, flexShrink: 0 }}>Hours</span>
                  <span className="text-sm">{emp.work_hours} <span style={{ color: 'var(--color-accent)' }}>({emp.timezone})</span></span>
                </div>
                {emp.start_date && (
                  <div className="flex gap-2 items-center">
                    <span className="text-muted" style={{ width: 80, flexShrink: 0 }}>Since</span>
                    <span className="text-sm">{new Date(emp.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                  </div>
                )}
              </div>

              {tech.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {tech.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state card" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 40 }}>👤</div>
          <p>{search ? 'No employees match your search' : 'No employees yet'}</p>
        </div>
      )}

      {/* Project history panel */}
      {selected && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="avatar avatar-sm">{initials(selected.name)}</div>
            <div>
              <div className="font-semibold">{selected.name}'s Projects</div>
              <div className="text-muted text-sm">{selected.designation}</div>
            </div>
            <button onClick={() => { setSelected(null); setProjects([]); }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-muted)' }}>×</button>
          </div>

          {loadingProjects && <p className="text-muted text-sm">Loading projects…</p>}

          {!loadingProjects && projects.length === 0 && (
            <p className="text-muted text-sm">Not assigned to any projects yet.</p>
          )}

          {!loadingProjects && projects.map(p => {
            const repos = Array.isArray(p.repo_url) ? p.repo_url : [];
            const docs = Array.isArray(p.docs_url) ? p.docs_url : [];
            const pending = p.milestones.filter(m => m.status !== 'completed').length;
            const total = p.milestones.length;
            return (
              <div key={p.id} style={{
                background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', padding: 16, marginBottom: 12,
              }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    {p.description && <div className="text-muted text-sm">{p.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${statusBadge[p.status]}`}>{p.status}</span>
                    <span className="badge badge-accent">{p.assigned_role.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <div className="flex gap-4 text-sm" style={{ marginBottom: p.milestones.length > 0 ? 12 : 0 }}>
                  {p.start_date && (
                    <span className="text-muted">
                      Start: <strong>{new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </span>
                  )}
                  {p.expected_end_date && (
                    <span className="text-muted">
                      Deadline: <strong style={{ color: new Date(p.expected_end_date) < new Date() && p.status !== 'archived' ? 'var(--color-error)' : 'inherit' }}>
                        {new Date(p.expected_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </strong>
                    </span>
                  )}
                  {total > 0 && (
                    <span className="text-muted">
                      Milestones: <strong>{total - pending}/{total} done</strong>
                    </span>
                  )}
                </div>

                {(repos.length > 0 || docs.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: p.milestones.length > 0 ? 10 : 0 }}>
                    {repos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                        style={{ color: 'var(--color-accent)' }}>Repo {repos.length > 1 ? i + 1 : ''} ↗</a>
                    ))}
                    {docs.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                        style={{ color: 'var(--color-accent)' }}>Docs {docs.length > 1 ? i + 1 : ''} ↗</a>
                    ))}
                  </div>
                )}

                {p.milestones.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {p.milestones.map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className={`badge ${msBadge[m.status]}`} style={{ fontSize: 11 }}>{m.status.replace('_', ' ')}</span>
                        <span className="text-sm">{m.title}</span>
                        <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>
                          {new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Employee</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input className="form-input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <input className="form-input" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} placeholder="e.g. GMT+5:30" />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Hours</label>
                  <input className="form-input" value={form.work_hours} onChange={e => setForm({ ...form, work_hours: e.target.value })} placeholder="9 AM - 5 PM" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="employee">Employee</option>
                    <option value="lead">Lead</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Manager ID</label>
                  <input className="form-input" type="number" value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tech Stack (comma-separated)</label>
                <input className="form-input" value={form.tech_stack} onChange={e => setForm({ ...form, tech_stack: e.target.value })} placeholder="React, Node.js, Go, PostgreSQL" />
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
