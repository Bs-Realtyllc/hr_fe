'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces for Financial Data
interface EmployeeTaxRecord {
  id: string;
  name: string;
  department: string;
  designation: string;
  grossSalary: number;
  taxableIncome: number;
  tdsTax: number;
  providentFund: number;
  totalTax: number;
}

interface EmployeeSalaryRecord {
  id: string;
  name: string;
  designation: string;
  department: string;
  creditedToday: number;
  status: 'Credited Today' | 'Processing' | 'Scheduled';
  salaryTillDate: number; // YTD salary disbursed
  bankAccount: string;
  bankName: string;
  payoutDate: string;
}

interface OtherExpenseRecord {
  id: string;
  title: string;
  category: 'Software & Infrastructure' | 'Office & Equipment' | 'Legal & Admin' | 'Utilities & Misc';
  amount: number;
  date: string;
  vendor: string;
}

// Initial Mock Data
const INITIAL_TAX_RECORDS: EmployeeTaxRecord[] = [
  { id: 'EMP-101', name: 'Aarav Sharma', department: 'Engineering', designation: 'Senior Software Engineer', grossSalary: 120000, taxableIncome: 105000, tdsTax: 15750, providentFund: 6000, totalTax: 21750 },
  { id: 'EMP-102', name: 'Bhavna Patel', department: 'Design', designation: 'Lead Product Designer', grossSalary: 105000, taxableIncome: 92000, tdsTax: 12880, providentFund: 5250, totalTax: 18130 },
  { id: 'EMP-103', name: 'Chetan Verma', department: 'Product', designation: 'Technical Product Manager', grossSalary: 135000, taxableIncome: 118000, tdsTax: 18880, providentFund: 6750, totalTax: 25630 },
  { id: 'EMP-104', name: 'Divya Nair', department: 'HR & Ops', designation: 'HR Operations Lead', grossSalary: 95000, taxableIncome: 83000, tdsTax: 10790, providentFund: 4750, totalTax: 15540 },
  { id: 'EMP-105', name: 'Eshwar Rao', department: 'DevOps', designation: 'Infrastructure Specialist', grossSalary: 115000, taxableIncome: 100000, tdsTax: 15000, providentFund: 5750, totalTax: 20750 },
  { id: 'EMP-106', name: 'Farhan Ali', department: 'Engineering', designation: 'Frontend Developer', grossSalary: 88000, taxableIncome: 77000, tdsTax: 9240, providentFund: 4400, totalTax: 13640 },
];

const INITIAL_SALARY_RECORDS: EmployeeSalaryRecord[] = [
  { id: 'EMP-101', name: 'Aarav Sharma', designation: 'Senior Software Engineer', department: 'Engineering', creditedToday: 3225, status: 'Credited Today', salaryTillDate: 862000, bankAccount: '•••• 4821', bankName: 'Nabil Bank', payoutDate: '2026-08-21' },
  { id: 'EMP-102', name: 'Bhavna Patel', designation: 'Lead Product Designer', department: 'Design', creditedToday: 2825, status: 'Credited Today', salaryTillDate: 754000, bankAccount: '•••• 8912', bankName: 'NIC Asia Bank', payoutDate: '2026-08-21' },
  { id: 'EMP-103', name: 'Chetan Verma', designation: 'Technical Product Manager', department: 'Product', creditedToday: 3630, status: 'Credited Today', salaryTillDate: 968000, bankAccount: '•••• 3104', bankName: 'Global IME Bank', payoutDate: '2026-08-21' },
  { id: 'EMP-104', name: 'Divya Nair', designation: 'HR Operations Lead', department: 'HR & Ops', creditedToday: 2550, status: 'Credited Today', salaryTillDate: 681000, bankAccount: '•••• 7731', bankName: 'Standard Chartered', payoutDate: '2026-08-21' },
  { id: 'EMP-105', name: 'Eshwar Rao', designation: 'Infrastructure Specialist', department: 'DevOps', creditedToday: 3100, status: 'Processing', salaryTillDate: 824000, bankAccount: '•••• 9942', bankName: 'Sanima Bank', payoutDate: '2026-08-21' },
  { id: 'EMP-106', name: 'Farhan Ali', designation: 'Frontend Developer', department: 'Engineering', creditedToday: 2360, status: 'Credited Today', salaryTillDate: 630000, bankAccount: '•••• 1209', bankName: 'Everest Bank', payoutDate: '2026-08-21' },
];

const INITIAL_OTHER_EXPENSES: OtherExpenseRecord[] = [
  { id: 'EXP-001', title: 'AWS Cloud Infrastructure', category: 'Software & Infrastructure', amount: 48500, date: '2026-08-18', vendor: 'Amazon Web Services' },
  { id: 'EXP-002', title: 'GitHub Enterprise & Copilot Suite', category: 'Software & Infrastructure', amount: 16200, date: '2026-08-15', vendor: 'GitHub Inc.' },
  { id: 'EXP-003', title: 'Ergonomic Chairs & Dual Monitors', category: 'Office & Equipment', amount: 34000, date: '2026-08-10', vendor: 'TechFurnishers Ltd.' },
  { id: 'EXP-004', title: 'High-Speed Optical Fiber Internet', category: 'Utilities & Misc', amount: 8500, date: '2026-08-05', vendor: 'WorldLink Fiber' },
  { id: 'EXP-005', title: 'Annual HR Compliance & Audit Retainer', category: 'Legal & Admin', amount: 25000, date: '2026-08-02', vendor: 'Apex Legal Partners' },
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatCurrency(amount: number) {
  return `Rs. ${Math.round(amount).toLocaleString()}`;
}

export default function FinancialReportPage() {
  const { user } = useAuth();

  // Access Control: Strictly Admin Only
  const isAdmin = user?.role === 'admin';

  // Filters & State
  const [selectedDate, setSelectedDate] = useState('2026-08-21');
  const [period, setPeriod] = useState<'today' | 'monthly' | 'ytd'>('monthly');
  const [searchTerm, setSearchTerm] = useState('');

  // Expenses State
  const [otherExpenses, setOtherExpenses] = useState<OtherExpenseRecord[]>(INITIAL_OTHER_EXPENSES);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<{
    title: string;
    category: OtherExpenseRecord['category'];
    amount: string;
    vendor: string;
  }>({
    title: '',
    category: 'Software & Infrastructure',
    amount: '',
    vendor: '',
  });

  // Payslip Modal State
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<EmployeeSalaryRecord | null>(null);

  // Filtered Tax & Salary Records based on Search
  const filteredTaxRecords = useMemo(() => {
    return INITIAL_TAX_RECORDS.filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredSalaryRecords = useMemo(() => {
    return INITIAL_SALARY_RECORDS.filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Dynamic Totals Calculation
  const totals = useMemo(() => {
    const totalGrossSalary = INITIAL_TAX_RECORDS.reduce((sum, r) => sum + r.grossSalary, 0);
    const totalTdsTax = INITIAL_TAX_RECORDS.reduce((sum, r) => sum + r.tdsTax, 0);
    const totalPF = INITIAL_TAX_RECORDS.reduce((sum, r) => sum + r.providentFund, 0);
    const totalTaxLiability = INITIAL_TAX_RECORDS.reduce((sum, r) => sum + r.totalTax, 0);

    const creditedTodayTotal = INITIAL_SALARY_RECORDS.reduce((sum, r) => sum + r.creditedToday, 0);
    const totalSalaryTillDate = INITIAL_SALARY_RECORDS.reduce((sum, r) => sum + r.salaryTillDate, 0);

    const totalOtherExpenses = otherExpenses.reduce((sum, r) => sum + r.amount, 0);

    // Overall Company Expense
    const overallCompanyExpense = (period === 'ytd' ? totalSalaryTillDate : totalGrossSalary) + totalOtherExpenses;

    return {
      totalGrossSalary,
      totalTdsTax,
      totalPF,
      totalTaxLiability,
      creditedTodayTotal,
      totalSalaryTillDate,
      totalOtherExpenses,
      overallCompanyExpense,
    };
  }, [otherExpenses, period]);

  // Handler for adding a new expense entry
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;

    const created: OtherExpenseRecord = {
      id: `EXP-00${otherExpenses.length + 1}`,
      title: newExpense.title,
      category: newExpense.category,
      amount: parseFloat(newExpense.amount) || 0,
      date: selectedDate,
      vendor: newExpense.vendor || 'Internal Vendor',
    };

    setOtherExpenses([created, ...otherExpenses]);
    setNewExpense({ title: '', category: 'Software & Infrastructure', amount: '', vendor: '' });
    setIsAddExpenseModalOpen(false);
  };

  // Render Access Denied for Non-Admin Users
  if (!isAdmin) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 40, boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-error-light, #fee2e2)',
            color: 'var(--color-error, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 28
          }}>
            🔒
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-heading)' }}>
            Admin Access Required
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
            The Finance & Overall Company Expense Report contains confidential payroll, tax, and company disbursement data. Access is restricted exclusively to Company Administrators.
          </p>
          <Link href="/" className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header Section */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Company Financial & Expense Report</h1>
            <span className="badge badge-primary" style={{ fontSize: 11, letterSpacing: '0.5px' }}>ADMIN EXCLUSIVE</span>
          </div>
          <p>Complete breakdown of company overall expenses, employee income tax, today&apos;s payslip disbursements, and operational costs.</p>
        </div>
      </div>

      {/* Top Controls & Filter Bar (Matching Sketch Header) */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Date Picker (Sketch: Date: ---) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>Date:</label>
            <input
              type="date"
              className="form-input"
              style={{ padding: '6px 10px', fontSize: 13, width: 'auto' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Period Toggle */}
          <div style={{ display: 'flex', background: 'var(--color-bg-secondary, #f1f5f9)', borderRadius: 6, padding: 3 }}>
            <button
              onClick={() => setPeriod('today')}
              className={`btn btn-sm ${period === 'today' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`btn btn-sm ${period === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod('ytd')}
              className={`btn btn-sm ${period === 'ytd' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              YTD (Year-To-Date)
            </button>
          </div>
        </div>

        {/* Search & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search employee or dept..."
            style={{ width: 220, padding: '6px 12px', fontSize: 13 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => alert(`Exporting Financial Summary report for ${selectedDate}...`)}
          >
            <span className="icon" style={{ WebkitMaskImage: 'url(/icons/download.svg)', maskImage: 'url(/icons/download.svg)', width: 14, height: 14 }} />
            Export CSV
          </button>
        </div>
      </div>

      {/* 1. Total Company Expense Overview (Sketch Section 1) */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🏢</span> Total Company Expense Overview
        </h2>
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--color-primary, #3b82f6)' }}>
            <div className="stat-card-label">Total Company Expense</div>
            <div className="stat-card-value" style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(totals.overallCompanyExpense)}</div>
            <div className="text-muted text-sm" style={{ marginTop: 4 }}>Includes Payroll, Taxes & Operating</div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid var(--color-success, #10b981)' }}>
            <div className="stat-card-label">Money Disbursed Today</div>
            <div className="stat-card-value" style={{ color: 'var(--color-success, #10b981)', fontSize: 24, fontWeight: 800 }}>{formatCurrency(totals.creditedTodayTotal)}</div>
            <div className="text-muted text-sm" style={{ marginTop: 4 }}>Credited into employee accounts today</div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid var(--color-warning, #f59e0b)' }}>
            <div className="stat-card-label">Total Tax Liability (TDS + PF)</div>
            <div className="stat-card-value" style={{ color: 'var(--color-warning, #f59e0b)', fontSize: 24, fontWeight: 800 }}>{formatCurrency(totals.totalTaxLiability)}</div>
            <div className="text-muted text-sm" style={{ marginTop: 4 }}>Employee Income Tax withheld</div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div className="stat-card-label">Other Operational Expenses</div>
            <div className="stat-card-value" style={{ color: '#8b5cf6', fontSize: 24, fontWeight: 800 }}>{formatCurrency(totals.totalOtherExpenses)}</div>
            <div className="text-muted text-sm" style={{ marginTop: 4 }}>Subscriptions, Hardware & Services</div>
          </div>
        </div>
      </div>

      {/* 2. Tax Expense Breakdown Table (Sketch Section 2) */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <span>🧾</span> Tax Expense Breakdown (Income Tax & TDS)
            </h2>
            <span className="text-muted text-sm">Tax calculations based on active employee brackets & withholding rates</span>
          </div>
          <span className="badge badge-neutral">Total Employee Tax: {formatCurrency(totals.totalTaxLiability)}</span>
        </div>

        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary, #f8fafc)' }}>
                <th>Employee</th>
                <th>Department</th>
                <th>Gross Salary</th>
                <th>Taxable Income</th>
                <th>Income Tax (TDS)</th>
                <th>Provident Fund</th>
                <th>Total Tax Deduction</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxRecords.map((r) => (
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
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: 12 }}>{r.department}</span>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(r.grossSalary)}</td>
                  <td style={{ fontSize: 13 }}>{formatCurrency(r.taxableIncome)}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-warning, #f59e0b)', fontWeight: 600 }}>
                    {formatCurrency(r.tdsTax)}
                  </td>
                  <td style={{ fontSize: 13, color: '#6366f1' }}>{formatCurrency(r.providentFund)}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-error, #ef4444)' }}>
                      {formatCurrency(r.totalTax)}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTaxRecords.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
                    No matching tax records found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-secondary, #f8fafc)' }}>
                <td colSpan={2} style={{ fontWeight: 700 }}>Total Company Tax Summary</td>
                <td style={{ fontWeight: 700 }}>{formatCurrency(totals.totalGrossSalary)}</td>
                <td style={{ fontWeight: 700 }}>—</td>
                <td style={{ fontWeight: 700, color: 'var(--color-warning, #f59e0b)' }}>{formatCurrency(totals.totalTdsTax)}</td>
                <td style={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(totals.totalPF)}</td>
                <td style={{ fontWeight: 800, color: 'var(--color-error, #ef4444)', fontSize: 15 }}>
                  {formatCurrency(totals.totalTaxLiability)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. Salary Till Date & Payslip Disbursements Table (Sketch Section 3) */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <span>💸</span> Salary Disbursed & Payslip Tracker
            </h2>
            <span className="text-muted text-sm">Direct bank account disbursements and cumulative salary till date</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-success" style={{ padding: '6px 12px' }}>
              Credited Today: {formatCurrency(totals.creditedTodayTotal)}
            </span>
            <span className="badge badge-primary" style={{ padding: '6px 12px' }}>
              Salary YTD: {formatCurrency(totals.totalSalaryTillDate)}
            </span>
          </div>
        </div>

        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary, #f8fafc)' }}>
                <th>Employee</th>
                <th>Bank Account</th>
                <th>Credited Today ({selectedDate})</th>
                <th>Status</th>
                <th>Salary Till Date (YTD)</th>
                <th>Payslip</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalaryRecords.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar avatar-sm" style={{ background: 'var(--color-primary-light, #e0f2fe)', color: 'var(--color-primary, #0284c7)' }}>
                        {initials(r.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.bankName}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.bankAccount}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-success, #10b981)' }}>
                      + {formatCurrency(r.creditedToday)}
                    </div>
                  </td>
                  <td>
                    {r.status === 'Credited Today' ? (
                      <span className="badge badge-success" style={{ fontSize: 11 }}>Credited Today</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: 11 }}>Processing</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {formatCurrency(r.salaryTillDate)}
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12 }}
                      onClick={() => setSelectedPayslipEmp(r)}
                    >
                      📄 View Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-secondary, #f8fafc)' }}>
                <td colSpan={2} style={{ fontWeight: 700 }}>Total Disbursement Summary</td>
                <td style={{ fontWeight: 800, color: 'var(--color-success, #10b981)', fontSize: 15 }}>
                  + {formatCurrency(totals.creditedTodayTotal)}
                </td>
                <td>—</td>
                <td colSpan={2} style={{ fontWeight: 800, fontSize: 15 }}>
                  {formatCurrency(totals.totalSalaryTillDate)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Other Expenses Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <span>📦</span> Other Company Expenses & Subscriptions
            </h2>
            <span className="text-muted text-sm">Operational overheads, software licenses, and equipment purchases</span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsAddExpenseModalOpen(true)}
          >
            + Add Expense
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary, #f8fafc)' }}>
                <th>Expense Item</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {otherExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: 600, fontSize: 14 }}>{exp.title}</td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>{exp.category}</span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{exp.vendor}</td>
                  <td style={{ fontSize: 13 }}>{exp.date}</td>
                  <td style={{ fontWeight: 700, fontSize: 14, color: '#8b5cf6' }}>
                    {formatCurrency(exp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-secondary, #f8fafc)' }}>
                <td colSpan={4} style={{ fontWeight: 700 }}>Total Other Operational Expenses</td>
                <td style={{ fontWeight: 800, color: '#8b5cf6', fontSize: 15 }}>
                  {formatCurrency(totals.totalOtherExpenses)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payslip Modal Preview */}
      {selectedPayslipEmp && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Payslip Disbursement Slip
              </h3>
              <button
                onClick={() => setSelectedPayslipEmp(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-muted text-sm">Employee Name:</span>
                <span style={{ fontWeight: 600 }}>{selectedPayslipEmp.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-muted text-sm">Designation & Dept:</span>
                <span style={{ fontWeight: 500 }}>{selectedPayslipEmp.designation} ({selectedPayslipEmp.department})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-muted text-sm">Bank Deposit Account:</span>
                <span style={{ fontWeight: 600 }}>{selectedPayslipEmp.bankName} ({selectedPayslipEmp.bankAccount})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-muted text-sm">Payout Date:</span>
                <span style={{ fontWeight: 500 }}>{selectedPayslipEmp.payoutDate}</span>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--color-bg-secondary, #f8fafc)', padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Daily/Cycle Earnings Credited:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success, #10b981)' }}>
                  + {formatCurrency(selectedPayslipEmp.creditedToday)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: 8, marginTop: 8 }}>
                <span style={{ fontWeight: 700 }}>Total Disbursed Till Date:</span>
                <span style={{ fontWeight: 800, fontSize: 16 }}>
                  {formatCurrency(selectedPayslipEmp.salaryTillDate)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setSelectedPayslipEmp(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { alert('Downloading payslip PDF...'); setSelectedPayslipEmp(null); }}>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Add Operational Expense</h3>
            <form onSubmit={handleAddExpense}>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Expense Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. AWS Servers / Office Furniture"
                  required
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Category</label>
                <select
                  className="form-select"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as OtherExpenseRecord['category'] })}
                >
                  <option value="Software & Infrastructure">Software & Infrastructure</option>
                  <option value="Office & Equipment">Office & Equipment</option>
                  <option value="Legal & Admin">Legal & Admin</option>
                  <option value="Utilities & Misc">Utilities & Misc</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Vendor / Provider</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Amazon Web Services / Local Vendor"
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Amount (Rs.)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 15000"
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAddExpenseModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

