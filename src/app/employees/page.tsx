'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  department: string;
  manager_id?: number;
  manager_name?: string;
  start_date: string;
  timezone: string;
  work_hours: string;
  tech_stack: string[] | string | null;
  role: string;
  is_active: boolean;
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

const UNASSIGNED_DEPARTMENT = 'Unassigned';

const DEPARTMENT_PRIORITY = [
  'founders', 'founder', 'leadership', 'executive', 'management', 'managers',
];

function departmentRank(department: string) {
  const idx = DEPARTMENT_PRIORITY.indexOf(department.toLowerCase());
  return idx === -1 ? DEPARTMENT_PRIORITY.length : idx;
}

function groupByDepartment(list: Employee[]): [string, Employee[]][] {
  const groups: Record<string, Employee[]> = {};
  list.forEach(emp => {
    const dept = emp.department?.trim() || UNASSIGNED_DEPARTMENT;
    (groups[dept] ??= []).push(emp);
  });
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === UNASSIGNED_DEPARTMENT) return 1;
    if (b === UNASSIGNED_DEPARTMENT) return -1;
    const rankDiff = departmentRank(a) - departmentRank(b);
    return rankDiff !== 0 ? rankDiff : a.localeCompare(b);
  });
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin' || user?.role === 'lead';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [myTeamOnly, setMyTeamOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', designation: '', department: '',
    manager_id: '', start_date: '', timezone: 'UTC', work_hours: '9 AM - 5 PM',
    tech_stack: '', role: 'employee',
  });

  useEffect(() => {
    api.get<Employee[]>('/employees').then(setEmployees).catch(() => {});
  }, []);

  const searched = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.designation?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = myTeamOnly && user
    ? searched.filter(e => e.id === user.id || e.manager_id === user.id)
    : searched;

  const sections = groupByDepartment(filtered);
  const departmentCount = new Set(filtered.map(e => e.department?.trim() || UNASSIGNED_DEPARTMENT)).size;

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
            <h1>Team Directory</h1>
            <p>
              {filtered.length} {filtered.length === 1 ? 'person' : 'people'} across {departmentCount} {departmentCount === 1 ? 'department' : 'departments'}
              {' — '}managers, founders, and every team from engineering to marketing and operations
            </p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <span
                className="icon-mask"
                style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
              />
              Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="search-bar" style={{ flex: 1 }}>
          <span
            className="icon-mask search-bar-icon"
            style={{ WebkitMaskImage: 'url(/icons/search.svg)', maskImage: 'url(/icons/search.svg)' }}
          />
          <input
            className="form-input"
            placeholder="Search by name, role, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`btn btn-sm ${myTeamOnly ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flexShrink: 0 }}
          onClick={() => setMyTeamOnly(v => !v)}
          title="Show only yourself and your direct reports"
        >
          <span
            className="icon-mask"
            style={{
              WebkitMaskImage: `url(/icons/${myTeamOnly ? 'check.svg' : 'users.svg'})`,
              maskImage: `url(/icons/${myTeamOnly ? 'check.svg' : 'users.svg'})`,
            }}
          />
          My Team
        </button>
      </div>

      {sections.map(([department, members]) => (
        <div key={department} style={{ marginBottom: 28 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-h2)', letterSpacing: '-0.2px' }}>
              {department}
            </h2>
            <span className="badge badge-accent">{members.length}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {members.map(emp => {
              const tech = parseTech(emp.tech_stack);
              const isMe = emp.id === user?.id;
              return (
                <div
                  key={emp.id}
                  className="card"
                  style={{ cursor: 'pointer', border: '2px solid transparent' }}
                  onClick={() => router.push(`/employees/${emp.id}`)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="avatar avatar-lg">{initials(emp.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold" style={{ fontSize: 15 }}>{emp.name}</div>
                        {isMe && <span className="badge badge-info">You</span>}
                      </div>
                      <div className="text-muted">{emp.designation}</div>
                      <span className={`badge ${roleColors[emp.role]}`} style={{ marginTop: 4 }}>{emp.role}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="flex gap-2 items-center">
                      <span className="text-muted" style={{ width: 80, flexShrink: 0 }}>Email</span>
                      <span className="text-sm truncate">{emp.email}</span>
                    </div>
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

                  <div style={{
                    marginTop: 14,
                    paddingTop: 10,
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                  }}>
                    <span>View Profile, Tax & Compensation</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="empty-state card" style={{ marginTop: 16 }}>
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/users.svg)', maskImage: 'url(/icons/users.svg)' }}
          />

          <p>
            {myTeamOnly
              ? 'No one reports to you yet'
              : search
                ? 'No employees match your search'
                : 'No employees yet'}
          </p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600, maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
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
                  <label className="form-label">Manager</label>
                  <select className="form-select" value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })}>
                    <option value="">No manager</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tech Stack (comma-separated)</label>
                <input className="form-input" value={form.tech_stack} onChange={e => setForm({ ...form, tech_stack: e.target.value })} placeholder="React, Node.js, Go, PostgreSQL" />
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
