'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PillTabs from '@/components/PillTabs';

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
  salary: number | null;
  pay_frequency: 'monthly' | 'biweekly' | 'weekly';
  tax_id: string | null;
  country: string;
  filing_status: 'single' | 'married' | 'head_of_household';
  tax_regime: 'old' | 'new';
  exemptions: number;
  additional_withholding: number;
  notes: string | null;
  annual_salary: number;
  taxable_income: number;
  estimated_annual_tax: number;
  estimated_monthly_tax: number;
  effective_rate: number;
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

const FILING_STATUS_LABEL: Record<string, string> = {
  single: 'Single',
  married: 'Married',
  head_of_household: 'Head of Household',
};

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
  const [taxRows, setTaxRows]         = useState<TaxRow[]>([]);
  const [taxLoading, setTaxLoading]   = useState(false);
  const [taxLoaded, setTaxLoaded]     = useState(false);
  const [taxEdit, setTaxEdit]         = useState<TaxRow | null>(null);
  const [taxForm, setTaxForm] = useState({
    tax_id: '', country: 'Nepal', filing_status: 'single', tax_regime: 'new',
    exemptions: '0', additional_withholding: '0', notes: '',
  });
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadTaxes = () => {
    setTaxLoading(true);
    api.get<TaxRow[]>('/payroll/taxes')
      .then(setTaxRows)
      .catch(() => {})
      .finally(() => { setTaxLoading(false); setTaxLoaded(true); });
  };

  useEffect(() => {
    if (tab === 'taxes' && !taxLoaded) loadTaxes();
  }, [tab, taxLoaded]);

  const loadSummary = () => {
    setSummaryLoading(true);
    api.get<SummaryRow[]>('/payroll/summary')
      .then(setSummaryRows)
      .catch(() => {})
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
    await api.put(`/payroll/${id}/salary`, { salary: parseFloat(editSalary) || null, pay_frequency: editFreq });
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, salary: parseFloat(editSalary) || null, pay_frequency: editFreq as PayrollRow['pay_frequency'] }
      : r));
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

  function openTaxEdit(row: TaxRow) {
    setTaxEdit(row);
    setTaxForm({
      tax_id: row.tax_id ?? '',
      country: row.country ?? 'Nepal',
      filing_status: row.filing_status ?? 'single',
      tax_regime: row.tax_regime ?? 'new',
      exemptions: String(row.exemptions ?? 0),
      additional_withholding: String(row.additional_withholding ?? 0),
      notes: row.notes ?? '',
    });
  }

  async function saveTaxProfile() {
    if (!taxEdit) return;
    setTaxSaving(true);
    try {
      await api.put(`/payroll/${taxEdit.id}/tax-profile`, {
        ...taxForm,
        exemptions: parseFloat(taxForm.exemptions) || 0,
        additional_withholding: parseFloat(taxForm.additional_withholding) || 0,
      });
      setTaxEdit(null);
      loadTaxes();
    } finally {
      setTaxSaving(false);
    }
  }

  const taxTotals = taxRows.reduce((acc, r) => {
    acc.annualTax += r.estimated_annual_tax;
    acc.annualSalary += r.annual_salary;
    acc.configured += r.tax_id ? 1 : 0;
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
              {rows.map(r => (
                <div key={r.id} className="row-card">
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
              Tax figures are a simplified <strong>estimate</strong> based on Nepal's individual income tax slabs, annual salary, and configured exemptions — for planning purposes only, not a substitute for a certified tax filing.
            </span>
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
                          <th>Tax ID</th>
                          <th>Filing Status</th>
                          <th>Regime</th>
                          <th>Annual Salary</th>
                          <th>Exemptions</th>
                          <th>Taxable Income</th>
                          <th>Est. Annual Tax</th>
                          <th>Eff. Rate</th>
                          {isAdmin && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {taxRows.map(r => (
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
                            <td style={{ fontSize: 13 }}>
                              {r.tax_id || <span style={{ color: 'var(--color-text-muted)' }}>Not set</span>}
                            </td>
                            <td style={{ fontSize: 13 }}>{FILING_STATUS_LABEL[r.filing_status]}</td>
                            <td><span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{r.tax_regime}</span></td>
                            <td style={{ fontSize: 13 }}>Rs. {r.annual_salary.toLocaleString()}</td>
                            <td style={{ fontSize: 13 }}>Rs. {Math.round(r.exemptions).toLocaleString()}</td>
                            <td style={{ fontSize: 13 }}>Rs. {r.taxable_income.toLocaleString()}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>Rs. {r.estimated_annual_tax.toLocaleString()}</div>
                              <div className="text-muted" style={{ fontSize: 11 }}>Rs. {r.estimated_monthly_tax.toLocaleString()}/mo</div>
                            </td>
                            <td>
                              <span className={`badge ${r.effective_rate >= 15 ? 'badge-warning' : r.effective_rate > 0 ? 'badge-info' : 'badge-neutral'}`}>
                                {r.effective_rate}%
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
                    {taxRows.map(r => (
                      <div key={r.id} className="row-card">
                        <div className="row-card-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar avatar-sm">{initials(r.name)}</div>
                            <div>
                              <div className="cell-title">{r.name}</div>
                              <div className="cell-subtitle">{r.designation}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700 }}>Rs. {r.estimated_annual_tax.toLocaleString()}</div>
                            <div className="row-card-meta">Rs. {r.estimated_monthly_tax.toLocaleString()}/mo</div>
                          </div>
                        </div>

                        <div className="row-card-line" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{r.tax_regime}</span>
                          <span className={`badge ${r.effective_rate >= 15 ? 'badge-warning' : r.effective_rate > 0 ? 'badge-info' : 'badge-neutral'}`}>
                            {r.effective_rate}%
                          </span>
                          <span className="text-muted text-sm">{FILING_STATUS_LABEL[r.filing_status]}</span>
                        </div>

                        <div className="row-card-line text-sm text-muted">
                          Tax ID: {r.tax_id || 'Not set'}
                        </div>
                        <div className="row-card-line text-sm text-muted">
                          Rs. {r.annual_salary.toLocaleString()} annual · Rs. {Math.round(r.exemptions).toLocaleString()} exempt · Rs. {r.taxable_income.toLocaleString()} taxable
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
                        <span className={`badge ${r.tax_regime === 'new' ? 'badge-accent' : 'badge-neutral'}`} style={{ marginLeft: 'auto', textTransform: 'capitalize' }}>
                          {r.tax_regime} regime
                        </span>
                      </div>

                      <div className="grid-3" style={{ marginBottom: 20 }}>
                        <div>
                          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Tax ID</div>
                          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{r.tax_id || '—'}</div>
                        </div>
                        <div>
                          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Filing Status</div>
                          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{FILING_STATUS_LABEL[r.filing_status]}</div>
                        </div>
                        <div>
                          <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Country</div>
                          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{r.country}</div>
                        </div>
                      </div>

                      <hr className="divider" />

                      <div className="grid-2" style={{ gap: 16 }}>
                        <div className="flex justify-between items-center">
                          <span className="text-muted">Annual Salary</span>
                          <span style={{ fontWeight: 600 }}>Rs. {r.annual_salary.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted">Exemptions</span>
                          <span style={{ fontWeight: 600 }}>-Rs. {Math.round(r.exemptions).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted">Taxable Income</span>
                          <span style={{ fontWeight: 600 }}>Rs. {r.taxable_income.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted">Effective Rate</span>
                          <span style={{ fontWeight: 600 }}>{r.effective_rate}%</span>
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
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>Per Month</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>Rs. {r.estimated_monthly_tax.toLocaleString()}</div>
                        </div>
                      </div>

                      {r.notes && (
                        <p className="text-muted text-sm" style={{ marginTop: 16, fontStyle: 'italic' }}>Note from admin: {r.notes}</p>
                      )}
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
                      {summaryRows.map(r => (
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
                  {summaryRows.map(r => (
                    <div key={r.id} className="row-card">
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
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tax ID</label>
                <input className="form-input" value={taxForm.tax_id}
                  onChange={e => setTaxForm({ ...taxForm, tax_id: e.target.value })} placeholder="e.g. TIN-000000000" />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" value={taxForm.country}
                  onChange={e => setTaxForm({ ...taxForm, country: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Filing Status</label>
                <select className="form-select" value={taxForm.filing_status}
                  onChange={e => setTaxForm({ ...taxForm, filing_status: e.target.value })}>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="head_of_household">Head of Household</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tax Regime</label>
                <select className="form-select" value={taxForm.tax_regime}
                  onChange={e => setTaxForm({ ...taxForm, tax_regime: e.target.value })}>
                  <option value="new">New</option>
                  <option value="old">Old</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Annual Exemptions</label>
                <input className="form-input" type="number" value={taxForm.exemptions}
                  onChange={e => setTaxForm({ ...taxForm, exemptions: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Additional Withholding</label>
                <input className="form-input" type="number" value={taxForm.additional_withholding}
                  onChange={e => setTaxForm({ ...taxForm, additional_withholding: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={taxForm.notes}
                onChange={e => setTaxForm({ ...taxForm, notes: e.target.value })} placeholder="Visible to the employee" />
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
