'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Leave {
  id: number;
  employee_name: string;
  designation: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_name?: string;
  reviewed_at?: string;
}

interface Balance {
  leave_type: string;
  total: number;
  taken: number;
  remaining: number;
}

const statusBadge: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-error',
};

const leaveColors: Record<string, string> = {
  casual: 'var(--color-info)',
  sick: 'var(--color-warning)',
  annual: 'var(--color-accent)',
};

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: '', leave_type: 'casual', start_date: '', end_date: '', reason: '' });

  const load = () =>
    api.get<Leave[]>(`/leaves${filter !== 'all' ? `?status=${filter}` : ''}`).then(setLeaves).catch(() => {});

  useEffect(() => { load(); }, [filter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/leaves', form);
    setShowModal(false);
    load();
  };

  const approve = async (id: number) => {
    await api.put(`/leaves/${id}/approve`, { reviewed_by: 1 });
    load();
  };

  const reject = async (id: number) => {
    await api.put(`/leaves/${id}/reject`, { reviewed_by: 1 });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Leave Requests</h1>
            <p>Manage employee leave applications and balances</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Request</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="btn btn-sm"
            style={{
              background: filter === s ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filter === s ? '#fff' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No leave requests found</td></tr>
              )}
              {leaves.map(l => (
                <tr key={l.id}>
                  <td>
                    <div className="font-semibold">{l.employee_name}</div>
                    <div className="text-muted">{l.designation}</div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${leaveColors[l.leave_type]}22`, color: leaveColors[l.leave_type], fontWeight: 600 }}>
                      {l.leave_type}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm">{new Date(l.start_date).toLocaleDateString()}</div>
                    <div className="text-muted">to {new Date(l.end_date).toLocaleDateString()}</div>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <div className="truncate text-sm">{l.reason || '—'}</div>
                  </td>
                  <td><span className={`badge ${statusBadge[l.status]}`}>{l.status}</span></td>
                  <td>
                    {l.status === 'pending' && (
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-accent" onClick={() => approve(l.id)}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => reject(l.id)}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Leave Request</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input className="form-input" type="number" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-select" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                  <option value="casual">Casual</option>
                  <option value="sick">Sick</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-between">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
