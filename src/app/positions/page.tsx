'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button/Button';
import { showToast } from '@/lib/toast';

interface Position {
  id: number;
  title: string;
  short_name: string | null;
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
  short_name: '',
  rank: '',
  department_id: '',
  reports_to_position_id: '',
};

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
      short_name: p.short_name ?? '',
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
      short_name: form.short_name || undefined,
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

  if (!isAdmin) {
    return <p className="text-muted">You don't have access to this page.</p>;
  }

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
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Departments</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {departments.map((d) => (
            <div key={d.id} className="card" style={{ padding: 12 }}>
              <div className="cell-title">{d.name}</div>
              {editingHeadFor === d.id ? (
                <div className="flex gap-2 items-center" style={{ marginTop: 6 }}>
                  <select className="form-select" value={headDraft} onChange={(e) => setHeadDraft(e.target.value)}>
                    <option value="">No head</option>
                    {positions.filter((p) => p.department_id === d.id).map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  <button className="btn btn-sm btn-accent" onClick={() => saveHead(d.id)}>Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditingHeadFor(null)}>Cancel</button>
                </div>
              ) : (
                <div className="flex gap-2 items-center" style={{ marginTop: 6 }}>
                  <span className="text-sm text-muted">
                    {d.head_employee_name ? `${d.head_employee_name} (${d.head_position_title})` : 'No head'}
                  </span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => { setEditingHeadFor(d.id); setHeadDraft(d.head_position_id ? String(d.head_position_id) : ''); }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Department</th><th>Rank</th><th>Reports To</th><th>Incumbent</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No positions yet</td></tr>
              )}
              {positions.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-title">{p.title}</div>
                    {p.short_name && <div className="cell-subtitle">{p.short_name}</div>}
                  </td>
                  <td>{p.department_name}</td>
                  <td>{p.rank ?? '—'}</td>
                  <td>{p.reports_to_title ?? <span className="text-muted">Top of org</span>}</td>
                  <td>
                    {p.incumbent_name
                      ? p.incumbent_name
                      : <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>Vacant</span>}
                  </td>
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
                  <label className="form-label">Short Name</label>
                  <input className="form-input" value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rank</label>
                  <input className="form-input" type="number" min={1} value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="1 = highest" />
                </div>
              </div>
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
                <label className="form-label">Reports To</label>
                <select className="form-select" value={form.reports_to_position_id} onChange={(e) => setForm({ ...form, reports_to_position_id: e.target.value })}>
                  <option value="">No one (top of the org)</option>
                  {positions.filter((p) => p.id !== editingId).map((p) => (
                    <option key={p.id} value={p.id}>{p.title} ({p.department_name})</option>
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
    </div>
  );
}
