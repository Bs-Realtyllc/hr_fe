'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PillTabs from '@/components/PillTabs';
import { showToast } from '@/lib/toast';

interface PayrollRow {
  id: number;
  name: string;
  designation: string;
  department: string;
  role: string;
  salary: number | null;
  pay_frequency: 'monthly' | 'biweekly' | 'weekly';
}

interface SummaryRow {
  id: number;
  name: string;
  designation: string;
  department: string;
  role: string;
  base_monthly: number;
  overtime_pay: number;
  leave_deduction: number;
  leave_bonus: number;
  net_pay: number;
}

interface TaxRow {
  id: number;
  name: string;
  designation: string;
  department: string;
  role: string;
  panNo: string | null;
  salary: number | null;
  pay_frequency: 'monthly' | 'biweekly' | 'weekly';
  amount: number;
  tax_amount: number;
  tax_perc: number;
  annual_salary: number;
  estimated_annual_tax: number;
  estimated_monthly_tax: number;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function toMonthly(salary: number | string, freq: string): number {
  const monthly = Number(salary) || 0;
  if (freq === 'biweekly') return (monthly * 26) / 12;
  if (freq === 'weekly') return (monthly * 52) / 12;
  return monthly;
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayrollPage() {
  const { user } = useAuth();
  const isAdmin      = user?.role === 'admin';
  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const [tab, setTab] = useState<'salaries' | 'taxes' | 'adjustments'>('salaries');

  /* ── Salaries state ──────────────────────────────────────────────────── */
  const [rows, setRows]         = useState<PayrollRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editId, setEditId]     = useState<number | null>(null);
  const [editSalary, setEditSalary] = useState('');
  const [editFreq, setEditFreq] = useState('monthly');
  const [resetId, setResetId]   = useState<number | null>(null);
  const [resetPw, setResetPw]   = useState('');
  const [resetMsg, setResetMsg] = useState('');

  /* ── Taxes state ─────────────────────────────────────────────────────── */
  const now = new Date();
  const [taxMonth, setTaxMonth] = useState(now.getMonth() + 1);
  const [taxYear, setTaxYear]   = useState(now.getFullYear());
  const [taxRows, setTaxRows]         = useState<TaxRow[]>([]);
  const [taxLoading, setTaxLoading]   = useState(false);
  const [taxEdit, setTaxEdit]         = useState<TaxRow | null>(null);
  const [taxForm, setTaxForm] = useState({ amount: '', tax_amount: '', tax_perc: '' });
  const [taxSaving, setTaxSaving] = useState(false);

  /* ── Overtime & Adjustments state ────────────────────────────────────── */
  const [summaryRows, setSummaryRows]   = useState<SummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded]   = useState(false);
  const [bonusRunning, setBonusRunning] = useState(false);
  const [bonusMsg, setBonusMsg]         = useState('');

  useEffect(() => {
    api.get<PayrollRow[]>('/payroll')
      .then(setRows)
      .catch(() => {showToast('error', "Failed to load payroll information")})
      .finally(() => setLoading(false));
  }, []);

  const loadTaxes = () => {
    setTaxLoading(true);
    api.get<TaxRow[]>(`/payroll/taxes?month=${taxMonth}&year=${taxYear}`)
      .then(setTaxRows)
      .catch(() => {showToast('error', "Failed to load tax information")})
      .finally(() => setTaxLoading(false));
  };

  useEffect(() => {
    if (tab === 'taxes') loadTaxes();
  }, [tab, taxMonth, taxYear]);

  const loadSummary = () => {
    setSummaryLoading(true);
    api.get<SummaryRow[]>('/payroll/summary')
      .then(setSummaryRows)
      .catch(() => {showToast('error', "Failed to load summary information")})
      .finally(() => { setSummaryLoading(false); setSummaryLoaded(true); });
  };

  useEffect(() => {
    if (tab === 'adjustments' && !summaryLoaded) loadSummary();
  }, [tab, summaryLoaded]);

  async function runYearEndBonus() {
    const year = new Date().getFullYear();
    if (!confirm(`Run the year-end leave bonus for ${year}? Employees with unused leave will receive a one-time payout at their daily rate. This only runs once per employee per year.`)) return;
    setBonusRunning(true);
    setBonusMsg('');
    try {
      const res = await api.post<{ year: number; processed: number; total_bonus: number }>('/payroll/year-end-bonus', { year });
      setBonusMsg(`Processed ${res.processed} employee(s) — Rs. ${res.total_bonus.toLocaleString()} total bonus paid out.`);
      loadSummary();
    } catch (err: unknown) {
      setBonusMsg(`Error: ${err instanceof Error ? err.message : 'Failed to run year-end bonus'}`);
    } finally {
      setBonusRunning(false);
    }
  }

  const summaryTotals = summaryRows.reduce((acc, r) => {
    acc.overtime += r.overtime_pay;
    acc.deduction += r.leave_deduction;
    acc.bonus += r.leave_bonus;
    acc.net += r.net_pay;
    return acc;
  }, { overtime: 0, deduction: 0, bonus: 0, net: 0 });

  const totalMonthly = rows.reduce((sum, r) => {
    if (!r.salary) return sum;
    return sum + toMonthly(r.salary, r.pay_frequency ?? 'monthly');
  }, 0);

  async function saveSalary(id: number) {
    try{
      await api.put(`/payroll/${id}/salary`, { salary: parseFloat(editSalary) || null, pay_frequency: editFreq });
      setRows(prev => prev.map(r => r.id === id
        ? { ...r, salary: parseFloat(editSalary) || null, pay_frequency: editFreq as PayrollRow['pay_frequency'] }
        : r));
      setEditId(null);
      showToast('success',"sucessfully updated salary")
    }catch(err){
      showToast('error','Failed to update salary')
    }
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

  function openTaxEdit(row: TaxRow) {
    setTaxEdit(row);
    setTaxForm({
      amount: String(row.amount ?? ''),
      tax_amount: String(row.tax_amount ?? ''),
      tax_perc: String(row.tax_perc ?? ''),
    });
  }

  async function saveTaxProfile() {
    if (!taxEdit) return;
    setTaxSaving(true);
    try {
      await api.put(`/payroll/${taxEdit.id}/tax-profile`, {
        month: taxMonth,
        year: taxYear,
        amount: taxForm.amount === '' ? null : parseFloat(taxForm.amount),
        tax_amount: taxForm.tax_amount === '' ? null : parseFloat(taxForm.tax_amount),
        tax_perc: taxForm.tax_perc === '' ? null : parseFloat(taxForm.tax_perc),
      });
      setTaxEdit(null);
      loadTaxes();
      showToast('success', "Tax profile updated sucessfully")
    }catch(err:any){
      //does not show error from backend -- "This employee has no panNo on file — set one before recording a tax profile"
      showToast('error', "Failed to update tax profile")
    }finally {
      setTaxSaving(false);
    }
  }

  const taxTotals = taxRows.reduce((acc, r) => {
    acc.annualTax += r.estimated_annual_tax;
    acc.annualSalary += r.annual_salary;
    acc.configured += r.panNo ? 1 : 0;
    return acc;
  }, { annualTax: 0, annualSalary: 0, configured: 0 });
  const avgEffectiveRate = taxTotals.annualSalary > 0
    ? Number(((taxTotals.annualTax / taxTotals.annualSalary) * 100).toFixed(1))
    : 0;

  if (loading) return <div className="page-header"><div><h1>{isPrivileged ? 'Payroll' : 'My Payroll'}</h1><p>Loading…</p></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isPrivileged ? 'Payroll & Taxes' : 'My Payroll & Taxes'}</h1>
          <p>{isPrivileged ? 'Manage employee salaries, tax profiles, and account access' : 'Your salary, pay details, and estimated tax breakdown'}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-4">
        <PillTabs
          value={tab}
          onChange={v => setTab(v as typeof tab)}
          options={[
            { value: 'salaries',    label: 'Salaries' },
            { value: 'taxes',       label: 'Taxes' },
            { value: 'adjustments', label: 'Overtime & Adjustments' },
          ]}
        />
      </div>

      {tab === 'salaries' && (
        <>
          {isPrivileged && (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
                <div className="stat-card-label">Total Employees</div>
                <div className="stat-card-value">{rows.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-dot" style={{ background: 'var(--color-success)' }} />
                <div className="stat-card-label">Est. Monthly Total</div>
                <div className="stat-card-value">Rs. {Math.round(totalMonthly).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-dot" style={{ background: 'var(--color-accent)' }} />
                <div className="stat-card-label">Salaries Configured</div>
                <div className="stat-card-value">{rows.filter(r => r.salary).length} / {rows.length}</div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Pay Frequency</th>
                    <th>Monthly Salary</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r,index) => (
                    <tr key={index}>
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
                          <select className="form-input" style={{ padding: '4px 8px', fontSize: 13 }}
                            value={editFreq} onChange={e => setEditFreq(e.target.value)}>
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
                          <input className="form-input" style={{ padding: '4px 8px', fontSize: 13, width: 120 }}
                            type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)} placeholder="0.00" />
                        ) : r.salary ? (
                          <span style={{ fontWeight: 600 }}>Rs. {r.salary.toLocaleString()}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Not set</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {editId === r.id ? (
                              <>
                                <button className="btn btn-primary btn-xs" onClick={() => saveSalary(r.id)}>Save</button>
                                <button className="btn btn-secondary btn-xs" onClick={() => setEditId(null)}>Cancel</button>
                              </>
                            ) : (
                              <button className="btn btn-secondary btn-xs"
                                onClick={() => { setEditId(r.id); setEditSalary(r.salary?.toString() ?? ''); setEditFreq(r.pay_frequency ?? 'monthly'); }}>
                                Edit Salary
                              </button>
                            )}
                            <button className="btn btn-secondary btn-xs"
                              onClick={() => { setResetId(r.id); setResetMsg(''); setResetPw(''); }}>
                              Reset PW
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile replacement for the table above — same data, card-per-row */}
            <div className="row-cards">
              {rows.map((r,index) => (
                <div key={index} className="row-card">
                  <div className="row-card-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar avatar-sm">{initials(r.name)}</div>
                      <div>
                        <div className="cell-title">{r.name}</div>
                        <div className="cell-subtitle">{r.designation}</div>
                      </div>
                    </div>
                    {editId !== r.id && (
                      r.salary ? (
                        <div style={{ fontWeight: 600 }}>Rs. {r.salary.toLocaleString()}</div>
                      ) : (
                        <div className="row-card-meta">Not set</div>
                      )
                    )}
                  </div>

                  <div className="row-card-line" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="text-muted text-sm">{r.department || '—'}</span>
                    <span className={`badge ${r.role === 'admin' ? 'badge-error' : r.role === 'lead' ? 'badge-accent' : 'badge-neutral'}`}>
                      {r.role}
                    </span>
                  </div>

                  {editId === r.id ? (
                    <div className="row-card-line" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <select className="form-input" style={{ padding: '4px 8px', fontSize: 13, flex: 1 }}
                        value={editFreq} onChange={e => setEditFreq(e.target.value)}>
                        <option value="monthly">Monthly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                      <input className="form-input" style={{ padding: '4px 8px', fontSize: 13, flex: 1 }}
                        type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)} placeholder="0.00" />
                    </div>
                  ) : (
                    <div className="row-card-line text-sm" style={{ textTransform: 'capitalize' }}>
                      {r.pay_frequency ?? 'monthly'}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="row-card-actions">
                      {editId === r.id ? (
                        <>
                          <button className="btn btn-primary btn-xs" onClick={() => saveSalary(r.id)}>Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setEditId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn btn-secondary btn-xs"
                          onClick={() => { setEditId(r.id); setEditSalary(r.salary?.toString() ?? ''); setEditFreq(r.pay_frequency ?? 'monthly'); }}>
                          Edit Salary
                        </button>
                      )}
                      <button className="btn btn-secondary btn-xs"
                        onClick={() => { setResetId(r.id); setResetMsg(''); setResetPw(''); }}>
                        Reset PW
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'taxes' && (
        <>
          <div className="card" style={{ marginBottom: 20, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>ℹ️</span>
            <span className="text-muted text-sm">
              Tax figures are a simplified <strong>estimate</strong> based on Nepal's individual income tax slabs and annual salary — for planning purposes only, not a substitute for a certified tax filing.
            </span>
          </div>

          <div className="flex gap-2 items-center" style={{ marginBottom: 20 }}>
            <select className="form-select" style={{ width: 160 }} value={taxMonth} onChange={e => setTaxMonth(Number(e.target.value))}>
              {MONTH_LABELS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className="form-select" style={{ width: 110 }} value={taxYear} onChange={e => setTaxYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {taxLoading ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading tax data…</div>
          ) : (
            <>
              {isPrivileged && (
                <div className="stat-grid" style={{ marginBottom: 24 }}>
                  <div className="stat-card">
                    <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
                    <div className="stat-card-label">Est. Annual Tax (Org)</div>
                    <div className="stat-card-value">Rs. {Math.round(taxTotals.annualTax).toLocaleString()}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-dot" style={{ background: 'var(--color-warning)' }} />
                    <div className="stat-card-label">Avg. Effective Rate</div>
                    <div className="stat-card-value">{avgEffectiveRate}%</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-dot" style={{ background: 'var(--color-accent)' }} />
                    <div className="stat-card-label">Tax Profiles Configured</div>
                    <div className="stat-card-value">{taxTotals.configured} / {taxRows.length}</div>
                  </div>
                </div>
              )}

              {isPrivileged ? (
                <div className="card">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>PAN No</th>
                          <th>Annual Salary</th>
                          <th>Monthly Amount</th>
                          <th>Monthly Tax</th>
                          <th>Tax %</th>
                          {isAdmin && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {taxRows.map((r, index) => (
                          <tr key={index}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="avatar avatar-sm">{initials(r.name)}</div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.designation}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: 13 }}>
                              {r.panNo || <span style={{ color: 'var(--color-text-muted)' }}>Not set</span>}
                            </td>
                            <td style={{ fontSize: 13 }}>Rs. {r.annual_salary.toLocaleString()}</td>
                            <td style={{ fontSize: 13 }}>Rs. {Math.round(r.amount).toLocaleString()}</td>
                            <td style={{ fontWeight: 700 }}>Rs. {Math.round(r.tax_amount).toLocaleString()}</td>
                            <td>
                              <span className={`badge ${r.tax_perc >= 15 ? 'badge-warning' : r.tax_perc > 0 ? 'badge-info' : 'badge-neutral'}`}>
                                {r.tax_perc}%
                              </span>
                            </td>
                            {isAdmin && (
                              <td>
                                <button className="btn btn-secondary btn-xs" onClick={() => openTaxEdit(r)}>
                                  Edit
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile replacement for the table above — same data, card-per-row */}
                  <div className="row-cards">
                    {taxRows.map((r, index) => (
                      <div key={index} className="row-card">
                        <div className="row-card-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar avatar-sm">{initials(r.name)}</div>
                            <div>
                              <div className="cell-title">{r.name}</div>
                              <div className="cell-subtitle">{r.designation}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700 }}>Rs. {Math.round(r.tax_amount).toLocaleString()}</div>
                            <div className="row-card-meta">tax this month</div>
                          </div>
                        </div>

                        <div className="row-card-line" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`badge ${r.tax_perc >= 15 ? 'badge-warning' : r.tax_perc > 0 ? 'badge-info' : 'badge-neutral'}`}>
                            {r.tax_perc}%
                          </span>
                        </div>

                        <div className="row-card-line text-sm text-muted">
                          PAN No: {r.panNo || 'Not set'}
                        </div>
                        <div className="row-card-line text-sm text-muted">
                          Rs. {r.annual_salary.toLocaleString()} annual · Rs. {Math.round(r.amount).toLocaleString()} this month
                        </div>

                        {isAdmin && (
                          <div className="row-card-actions">
                            <button className="btn btn-secondary btn-xs" onClick={() => openTaxEdit(r)}>
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                taxRows.length > 0 && (() => {
                  const r = taxRows[0];
                  return (
                    <div className="card" style={{ padding: 24 }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="avatar avatar-lg">{initials(r.name)}</div>
                        <div>
                          <div className="font-semibold" style={{ fontSize: 16 }}>{r.name}</div>
                          <div className="text-muted">{r.designation}</div>
                        </div>
                      </div>

                      <div className="grid-2" style={{ marginBottom: 20, gap: 16 }}>
                        <div>
                          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>PAN No</div>
                          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{r.panNo || '—'}</div>
                        </div>
                        <div>
                          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Annual Salary</div>
                          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Rs. {r.annual_salary.toLocaleString()}</div>
                        </div>
                      </div>

                      <hr className="divider" />

                      <div className="grid-2" style={{ gap: 16 }}>
                        <div className="flex justify-between items-center">
                          <span className="text-muted">Amount This Month</span>
                          <span style={{ fontWeight: 600 }}>Rs. {Math.round(r.amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted">Effective Rate</span>
                          <span style={{ fontWeight: 600 }}>{r.tax_perc}%</span>
                        </div>
                      </div>

                      <div style={{
                        marginTop: 20, padding: 16, borderRadius: 'var(--radius-md)',
                        background: 'var(--color-primary-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>Estimated Annual Tax</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>Rs. {r.estimated_annual_tax.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>This Month</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>Rs. {Math.round(r.tax_amount).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {taxRows.length === 0 && (
                <div className="empty-state card">
                  <div style={{ fontSize: 40 }}>🧾</div>
                  <p>No tax data available yet.</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'adjustments' && (
        <>
          <div className="card" style={{ marginBottom: 20, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>ℹ️</span>
            <span className="text-muted text-sm">
              Overtime pay = hourly rate (salary ÷ 26 days ÷ 8 hrs) × <strong>150%</strong> × approved hours.
              Leave deductions apply when approved leave exceeds the remaining balance, at the daily rate (salary ÷ 26 days).
              Year-end bonuses pay out unused leave at the same daily rate.
            </span>
          </div>

          {summaryLoading ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading payroll adjustments…</div>
          ) : (
            <>
              <div className="stat-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                  <div className="stat-card-dot" style={{ background: 'var(--color-success)' }} />
                  <div className="stat-card-label">Overtime Pay (this month)</div>
                  <div className="stat-card-value">Rs. {Math.round(summaryTotals.overtime).toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-dot" style={{ background: 'var(--color-error)' }} />
                  <div className="stat-card-label">Leave Deductions (this month)</div>
                  <div className="stat-card-value">Rs. {Math.round(Math.abs(summaryTotals.deduction)).toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-dot" style={{ background: 'var(--color-accent)' }} />
                  <div className="stat-card-label">Year-End Bonus Paid</div>
                  <div className="stat-card-value">Rs. {Math.round(summaryTotals.bonus).toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
                  <div className="stat-card-label">Net Payroll (this month)</div>
                  <div className="stat-card-value">Rs. {Math.round(summaryTotals.net).toLocaleString()}</div>
                </div>
              </div>

              {isAdmin && (
                <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Year-End Leave Bonus</div>
                    <div className="text-muted text-sm">Pays out each employee's unused leave balance at their daily rate. Safe to run more than once — already-paid employees are skipped.</div>
                  </div>
                  <button className="btn btn-primary" disabled={bonusRunning} onClick={runYearEndBonus}>
                    {bonusRunning ? 'Running…' : `Run Year-End Bonus (${new Date().getFullYear()})`}
                  </button>
                </div>
              )}
              {bonusMsg && (
                <p className="text-sm" style={{ marginBottom: 16, color: bonusMsg.startsWith('Error') ? 'var(--color-error)' : 'var(--color-success)' }}>
                  {bonusMsg}
                </p>
              )}

              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Base Monthly</th>
                        <th>Overtime Pay</th>
                        <th>Leave Deduction</th>
                        <th>Year-End Bonus</th>
                        <th>Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((r, index) => (
                        <tr key={index}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="avatar avatar-sm">{initials(r.name)}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.designation}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>Rs. {r.base_monthly.toLocaleString()}</td>
                          <td>
                            {r.overtime_pay > 0 ? (
                              <span className="badge badge-success">+ Rs. {r.overtime_pay.toLocaleString()}</span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: 13 }}>—</span>
                            )}
                          </td>
                          <td>
                            {r.leave_deduction < 0 ? (
                              <span className="badge badge-error">- Rs. {Math.abs(r.leave_deduction).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: 13 }}>—</span>
                            )}
                          </td>
                          <td>
                            {r.leave_bonus > 0 ? (
                              <span className="badge badge-accent">+ Rs. {r.leave_bonus.toLocaleString()}</span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: 13 }}>—</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700 }}>Rs. {r.net_pay.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile replacement for the table above — same data, card-per-row */}
                <div className="row-cards">
                  {summaryRows.map((r, index) => (
                    <div key={index} className="row-card">
                      <div className="row-card-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar avatar-sm">{initials(r.name)}</div>
                          <div>
                            <div className="cell-title">{r.name}</div>
                            <div className="cell-subtitle">{r.designation}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700 }}>Rs. {r.net_pay.toLocaleString()}</div>
                      </div>

                      <div className="row-card-line text-sm text-muted">
                        Base Rs. {r.base_monthly.toLocaleString()}
                      </div>

                      <div className="row-card-line" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {r.overtime_pay > 0 && (
                          <span className="badge badge-success">+ Rs. {r.overtime_pay.toLocaleString()} OT</span>
                        )}
                        {r.leave_deduction < 0 && (
                          <span className="badge badge-error">- Rs. {Math.abs(r.leave_deduction).toLocaleString()} leave</span>
                        )}
                        {r.leave_bonus > 0 && (
                          <span className="badge badge-accent">+ Rs. {r.leave_bonus.toLocaleString()} bonus</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {summaryRows.length === 0 && (
                <div className="empty-state card">
                  <div style={{ fontSize: 40 }}>💵</div>
                  <p>No payroll data available yet.</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {resetId !== null && (
        <div className="modal-overlay" onClick={() => setResetId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button className="modal-close" onClick={() => setResetId(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={resetPw}
                onChange={e => setResetPw(e.target.value)} placeholder="Min. 6 characters" />
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

      {taxEdit && (
        <div className="modal-overlay" onClick={() => setTaxEdit(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Tax Profile</h2>
              <button className="modal-close" onClick={() => setTaxEdit(null)}>×</button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar avatar-sm">{initials(taxEdit.name)}</div>
              <div>
                <div className="font-semibold">{taxEdit.name}</div>
                <div className="text-muted text-sm">{taxEdit.designation}</div>
              </div>
            </div>
            <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
              Editing {MONTH_LABELS[taxMonth - 1]} {taxYear}. Leave a field blank to auto-compute it from salary.
            </p>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Amount (monthly pay)</label>
                <input className="form-input" type="number" value={taxForm.amount}
                  onChange={e => setTaxForm({ ...taxForm, amount: e.target.value })} placeholder="Auto-computed" />
              </div>
              <div className="form-group">
                <label className="form-label">Tax Amount</label>
                <input className="form-input" type="number" value={taxForm.tax_amount}
                  onChange={e => setTaxForm({ ...taxForm, tax_amount: e.target.value })} placeholder="Auto-computed" />
              </div>
              <div className="form-group">
                <label className="form-label">Tax %</label>
                <input className="form-input" type="number" value={taxForm.tax_perc}
                  onChange={e => setTaxForm({ ...taxForm, tax_perc: e.target.value })} placeholder="Auto-computed" />
              </div>
            </div>
            <div className="flex gap-3 justify-between mt-4">
              <button type="button" className="btn btn-ghost" onClick={() => setTaxEdit(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={taxSaving} onClick={saveTaxProfile}>
                {taxSaving ? 'Saving…' : 'Save Tax Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
