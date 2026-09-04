'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface FinancialReportRow {
  id: number;
  name: string;
  designation: string;
  department: string;
  role: string;
  base_salary: number;
  overtime_pay: number;
  deducted_amount: number;
  tax_amount: number;
  total_payable: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function FinancialReportPage() {
  const { user } = useAuth();
  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const yearOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const [rows, setRows]     = useState<FinancialReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ year: number; month: number; report: FinancialReportRow[] }>(`/payroll/financial-report?year=${year}&month=${month}`)
      .then(res => setRows(res.report))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  const totals = rows.reduce((acc, r) => {
    acc.base += r.base_salary;
    acc.overtime += r.overtime_pay;
    acc.deducted += r.deducted_amount;
    acc.tax += r.tax_amount;
    acc.payable += r.total_payable;
    return acc;
  }, { base: 0, overtime: 0, deducted: 0, tax: 0, payable: 0 });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isPrivileged ? 'Financial Report' : 'My Financial Report'}</h1>
          <p>{isPrivileged ? 'Base salary, overtime, deductions, and tax — the final payable amount per employee' : 'Your base salary, overtime, deductions, and tax breakdown'}</p>
        </div>
      </div>

      <div className="flex justify-between items-center" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-2">
          <select className="form-select" style={{ padding: '6px 10px', fontSize: 13, width: 'auto' }}
            value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-select" style={{ padding: '6px 10px', fontSize: 13, width: 'auto' }}
            value={year} onChange={e => setYear(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <span className="badge badge-neutral" style={{ fontSize: 11 }}>
          Total Payable = Base Salary + Overtime Pay − Deducted Amount − Tax Amount
        </span>
      </div>

      <div className="card" style={{ padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <span className="text-muted text-sm">
          This is a monthly report — overtime pay and deductions reflect what was approved for {MONTHS[month - 1]} {year}.
          Year-end leave bonuses are a separate one-time payout and aren't included here — see the Overtime & Adjustments tab.
        </span>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading financial report…</div>
      ) : (
        <>
          {isPrivileged && (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
                <div className="stat-card-label">Total Base Salary</div>
                <div className="stat-card-value">Rs. {Math.round(totals.base).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-dot" style={{ background: 'var(--color-success)' }} />
                <div className="stat-card-label">Total Overtime Pay</div>
                <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>Rs. {Math.round(totals.overtime).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-dot" style={{ background: 'var(--color-error)' }} />
                <div className="stat-card-label">Total Deducted</div>
                <div className="stat-card-value" style={{ color: 'var(--color-error)' }}>Rs. {Math.round(totals.deducted).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-dot" style={{ background: 'var(--color-warning)' }} />
                <div className="stat-card-label">Total Tax</div>
                <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>Rs. {Math.round(totals.tax).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-dot" style={{ background: 'var(--color-accent)' }} />
                <div className="stat-card-label">Total Payable</div>
                <div className="stat-card-value">Rs. {Math.round(totals.payable).toLocaleString()}</div>
              </div>
            </div>
          )}

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Base Salary</th>
                  <th>Overtime Pay</th>
                  <th>Deducted Amount</th>
                  <th>Tax Amount</th>
                  <th>Total Payable</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
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
                    <td style={{ fontSize: 13 }}>Rs. {r.base_salary.toLocaleString()}</td>
                    <td>
                      {r.overtime_pay > 0 ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>+ Rs. {r.overtime_pay.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      {r.deducted_amount > 0 ? (
                        <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>- Rs. {r.deducted_amount.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>- Rs. {r.tax_amount.toLocaleString()}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>Rs. {r.total_payable.toLocaleString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {isPrivileged && rows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                    <td style={{ fontWeight: 700 }}>Total</td>
                    <td style={{ fontWeight: 700 }}>Rs. {Math.round(totals.base).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>+ Rs. {Math.round(totals.overtime).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-error)' }}>- Rs. {Math.round(totals.deducted).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-warning)' }}>- Rs. {Math.round(totals.tax).toLocaleString()}</td>
                    <td style={{ fontWeight: 800, fontSize: 15 }}>Rs. {Math.round(totals.payable).toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {rows.length === 0 && (
            <div className="empty-state card">
              <span
                className="icon-mask empty-state-icon"
                style={{ WebkitMaskImage: 'url(/icons/bar-chart.svg)', maskImage: 'url(/icons/bar-chart.svg)' }}
              />
              <p>No financial report data available yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
