'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button/Button';
import { showToast } from '@/lib/toast';

interface Position {
  id: number;
  title: string;
  rank: number | null;
  department_id: number;
  department_name: string;
  reports_to_position_id: number | null;
  reports_to_title: string | null;
  incumbent_id: number | null;
  incumbent_name: string | null;
  is_active: boolean;
}

interface Department {
  id: number;
  name: string;
  head_position_id: number | null;
  head_position_title: string | null;
  head_employee_id: number | null;
  head_employee_name: string | null;
}

const BLANK_FORM = {
  title: '',
  rank: '',
  department_id: '',
  reports_to_position_id: '',
};

// Same department as the one currently selected sorts first (by rank), since
// that's almost always where the right "reports to" seat lives; everything
// else follows, grouped by department name so related seats stay together.
function sortReportsToOptions(positions: Position[], selectedDepartmentId: string) {
  const deptId = selectedDepartmentId ? Number(selectedDepartmentId) : null;
  return [...positions].sort((a, b) => {
    const aMatch = a.department_id === deptId;
    const bMatch = b.department_id === deptId;
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    if (a.department_name !== b.department_name) return a.department_name.localeCompare(b.department_name);
    const rankDiff = (a.rank ?? 999) - (b.rank ?? 999);
    return rankDiff !== 0 ? rankDiff : a.title.localeCompare(b.title);
  });
}

function reportsToLabel(p: Position) {
  const who = p.incumbent_name ?? 'Vacant';
  return `${p.title} — ${p.department_name} (${who})`;
}

export default function PositionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingHeadFor, setEditingHeadFor] = useState<number | null>(null);
  const [headDraft, setHeadDraft] = useState('');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');

  const load = () => {
    api.get<Position[]>('/positions').then(setPositions).catch(() => showToast('error', 'Failed to load positions'));
    api.get<Department[]>('/departments').then(setDepartments).catch(() => showToast('error', 'Failed to load departments'));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(BLANK_FORM);
    setShowModal(true);
  };

  const openEdit = (p: Position) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      rank: p.rank ? String(p.rank) : '',
      department_id: String(p.department_id),
      reports_to_position_id: p.reports_to_position_id ? String(p.reports_to_position_id) : '',
    });
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      title: form.title,
      rank: form.rank ? parseInt(form.rank) : undefined,
      department_id: parseInt(form.department_id),
      reports_to_position_id: form.reports_to_position_id ? parseInt(form.reports_to_position_id) : undefined,
    };
    try {
      if (editingId) {
        await api.put(`/positions/${editingId}`, body);
        showToast('success', 'Position updated');
      } else {
        await api.post('/positions', body);
        showToast('success', 'Position created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save position');
    }
  };

  const deactivate = async (p: Position) => {
    if (!confirm(`Deactivate "${p.title}"?`)) return;
    try {
      await api.delete(`/positions/${p.id}`);
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to deactivate position');
    }
  };

  const saveHead = async (departmentId: number) => {
    try {
      await api.put(`/departments/${departmentId}/head`, { position_id: headDraft ? parseInt(headDraft) : null });
      setEditingHeadFor(null);
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to set department head');
    }
  };

  const createDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/departments', { name: deptName });
      showToast('success', 'Department created');
      setShowDeptModal(false);
      setDeptName('');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create department');
    }
  };

  if (!isAdmin) {
    return <p className="text-muted">You don't have access to this page.</p>;
  }

  const reportsToOptions = sortReportsToOptions(
    positions.filter((p) => p.id !== editingId),
    form.department_id,
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Positions</h1>
            <p>Org seats — independent of who currently fills them.</p>
          </div>
          <Button variant="primary" size="small" onClick={openCreate}>New Position</Button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Departments</h2>
          <Button variant="text" size="small" onClick={() => setShowDeptModal(true)}>New Department</Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>S.N.</th><th>Department</th><th>Head</th><th>Positions</th><th>Filled</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No departments yet</td></tr>
              )}
              {departments.map((d, i) => {
                const deptPositions = positions.filter((p) => p.department_id === d.id);
                const filledCount = deptPositions.filter((p) => p.incumbent_name).length;
                return (
                  <tr key={d.id}>
                    <td>{i + 1}</td>
                    <td><div className="cell-title">{d.name}</div></td>
                    <td>
                      {editingHeadFor === d.id ? (
                        <div className="flex gap-2 items-center">
                          <select
                            className="form-select"
                            value={headDraft}
                            onChange={(e) => setHeadDraft(e.target.value)}
                            aria-label={`Choose head position for ${d.name}`}
                          >
                            <option value="">— No head —</option>
                            {deptPositions.map((p) => (
                              <option key={p.id} value={p.id}>{p.title}{p.incumbent_name ? ` (${p.incumbent_name})` : ' (Vacant)'}</option>
                            ))}
                          </select>
                          <button className="btn btn-sm btn-accent" onClick={() => saveHead(d.id)}>Save</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => setEditingHeadFor(null)}>Cancel</button>
                        </div>
                      ) : (
                        <span className="text-sm">
                          {d.head_employee_name
                            ? `${d.head_employee_name} (${d.head_position_title})`
                            : <span className="text-muted">No head</span>}
                        </span>
                      )}
                    </td>
                    <td>{deptPositions.length}</td>
                    <td>{filledCount}</td>
                    <td><span className="badge badge-accent">Active</span></td>
                    <td>
                      {editingHeadFor !== d.id && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => { setEditingHeadFor(d.id); setHeadDraft(d.head_position_id ? String(d.head_position_id) : ''); }}
                        >
                          {d.head_employee_name ? 'Change Head' : 'Set Head'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Department</th><th>Rank</th><th>Reports To</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No positions yet</td></tr>
              )}
              {positions.map((p) => (
                <tr key={p.id}>
                  <td><div className="cell-title">{p.title}</div></td>
                  <td>{p.department_name}</td>
                  <td>{p.rank ?? '—'}</td>
                  <td>{p.reports_to_title ?? <span className="text-muted">Top of org</span>}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deactivate(p)}>Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Position' : 'New Position'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} required>
                    <option value="">Select a department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rank</label>
                  <input className="form-input" type="number" min={1} value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="1 = highest" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reports To</label>
                <select className="form-select" value={form.reports_to_position_id} onChange={(e) => setForm({ ...form, reports_to_position_id: e.target.value })}>
                  <option value="">No one (top of the org)</option>
                  {reportsToOptions.map((p) => (
                    <option key={p.id} value={p.id}>{reportsToLabel(p)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>
                <Button variant="text" size="small" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" size="small" type="submit">{editingId ? 'Save Changes' : 'Create Position'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Department</h2>
              <button className="modal-close" onClick={() => setShowDeptModal(false)}>×</button>
            </div>
            <form onSubmit={createDepartment}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={deptName} onChange={(e) => setDeptName(e.target.value)} required autoFocus />
              </div>
              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>
                <Button variant="text" size="small" onClick={() => setShowDeptModal(false)}>Cancel</Button>
                <Button variant="primary" size="small" type="submit">Create Department</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
