'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface PayrollRow {
  id: number;
  name: string;
  designation: string;
  department: string;
  role: string;
  salary: number | null;
  pay_frequency: 'monthly' | 'biweekly' | 'weekly';
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function toMonthly(salary: number, freq: string): number {
  if (freq === 'biweekly') return (salary * 26) / 12;
  if (freq === 'weekly') return salary * 52 / 12;
  return salary;
}

export default function PayrollPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editSalary, setEditSalary] = useState('');
  const [editFreq, setEditFreq] = useState('monthly');
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin') { router.replace('/'); return; }
    api.get<PayrollRow[]>('/payroll')
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  const totalMonthly = rows.reduce((sum, r) => {
    if (!r.salary) return sum;
    return sum + toMonthly(r.salary, r.pay_frequency ?? 'monthly');
  }, 0);

  async function saveSalary(id: number) {
    await api.put(`/payroll/${id}/salary`, { salary: parseFloat(editSalary) || null, pay_frequency: editFreq });
    setRows(prev => prev.map(r => r.id === id ? { ...r, salary: parseFloat(editSalary) || null, pay_frequency: editFreq as PayrollRow['pay_frequency'] } : r));
    setEditId(null);
  }

  async function doResetPassword(id: number) {
    try {
      await api.put(`/payroll/${id}/reset-password`, { password: resetPw });
      setResetMsg('Password reset successfully');
      setResetPw('');
    } catch {
      setResetMsg('Failed — password must be at least 6 characters');
    }
  }

  if (loading) return <div className="page-header"><h1>Payroll</h1><p>Loading…</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Payroll</h1>
        <p>Manage employee salaries and account access</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
          <div className="stat-card-label">Total Employees</div>
          <div className="stat-card-value">{rows.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-success)' }} />
          <div className="stat-card-label">Est. Monthly Total</div>
          <div className="stat-card-value">${Math.round(totalMonthly).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-accent)' }} />
          <div className="stat-card-label">Salaries Configured</div>
          <div className="stat-card-value">{rows.filter(r => r.salary).length} / {rows.length}</div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Role</th>
              <th>Pay Frequency</th>
              <th>Monthly Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar avatar-sm">{initials(r.name)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.designation}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{r.department || '—'}</td>
                <td>
                  <span className={`badge ${r.role === 'admin' ? 'badge-error' : r.role === 'lead' ? 'badge-accent' : 'badge-neutral'}`}>
                    {r.role}
                  </span>
                </td>
                <td>
                  {editId === r.id ? (
                    <select
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: 13 }}
                      value={editFreq}
                      onChange={e => setEditFreq(e.target.value)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{r.pay_frequency ?? 'monthly'}</span>
                  )}
                </td>
                <td>
                  {editId === r.id ? (
                    <input
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: 13, width: 120 }}
                      type="number"
                      value={editSalary}
                      onChange={e => setEditSalary(e.target.value)}
                      placeholder="0.00"
                    />
                  ) : r.salary ? (
                    <span style={{ fontWeight: 600 }}>${r.salary.toLocaleString()}</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Not set</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {editId === r.id ? (
                      <>
                        <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => saveSalary(r.id)}>Save</button>
                        <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setEditId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => { setEditId(r.id); setEditSalary(r.salary?.toString() ?? ''); setEditFreq(r.pay_frequency ?? 'monthly'); }}
                      >
                        Edit Salary
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => { setResetId(r.id); setResetMsg(''); setResetPw(''); }}
                    >
                      Reset PW
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset password inline panel */}
      {resetId !== null && (
        <div className="modal-overlay" onClick={() => setResetId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button className="modal-close" onClick={() => setResetId(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-input"
                type="password"
                value={resetPw}
                onChange={e => setResetPw(e.target.value)}
                placeholder="Min. 6 characters"
              />
            </div>
            {resetMsg && (
              <p style={{ fontSize: 13, color: resetMsg.includes('success') ? 'var(--color-success)' : 'var(--color-error)', marginBottom: 12 }}>
                {resetMsg}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={() => doResetPassword(resetId)}>Reset Password</button>
              <button className="btn btn-secondary" onClick={() => setResetId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
