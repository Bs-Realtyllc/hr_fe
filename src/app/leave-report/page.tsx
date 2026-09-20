'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import Button from '@/components/Button/Button';

interface LeaveReportRow {
  employee_id: number;
  employee_name: string;
  total_leaves: number;
  taken_previous_month: number;
  taken_this_month: number;
  remaining_leaves: number;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const now = new Date();
const THIS_MONTH_LABEL = now.toLocaleDateString('en-US', { month: 'long' });
const PREV_MONTH_LABEL = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'long' });

export default function LeaveReportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  const [rows, setRows] = useState<LeaveReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    api.get<LeaveReportRow[]>('/leaves/report')
      .then(setRows)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.employee_name.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => ({
    allotted: rows.reduce((s, r) => s + r.total_leaves, 0),
    prevMonth: rows.reduce((s, r) => s + r.taken_previous_month, 0),
    thisMonth: rows.reduce((s, r) => s + r.taken_this_month, 0),
    lowBalance: rows.filter(r => r.remaining_leaves <= 2).length,
  }), [rows]);

  function remainingBadgeClass(remaining: number) {
    if (remaining <= 0) return 'badge-error';
    if (remaining <= 2) return 'badge-warning';
    return 'badge-success';
  }

  function exportExcel() {
    const data = filtered.map(r => ({
      Employee: r.employee_name,
      'Total Leaves': r.total_leaves,
      [`Taken (${PREV_MONTH_LABEL})`]: r.taken_previous_month,
      [`Taken (${THIS_MONTH_LABEL})`]: r.taken_this_month,
      'Remaining Leaves': r.remaining_leaves,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Report');
    XLSX.writeFile(wb, `leave_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  if (authLoading || (user && !isAdmin)) return null;

  if (loading) {
    return (
      <div className="page-header">
        <div>
          <h1>Leave Report</h1>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>Leave Report</h1>
          <p>Leave balances and monthly usage across all employees</p>
        </div>

        <Button className='outline' variant='text' size='small' onClick={exportExcel} disabled={!filtered.length} leftIcon={<span
          className="icon-mask"
          style={{ height: 16, width: 16, WebkitMaskImage: 'url(/icons/download.svg)', maskImage: 'url(/icons/download.svg)' }}
        />}>
          Export Excel
        </Button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
          <div className="stat-card-label">Employees</div>
          <div className="stat-card-value">{rows.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-accent)' }} />
          <div className="stat-card-label">Total Leaves Allotted</div>
          <div className="stat-card-value">{totals.allotted}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: '#92400E' }} />
          <div className="stat-card-label">Taken in {PREV_MONTH_LABEL}</div>
          <div className="stat-card-value">{totals.prevMonth}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-success)' }} />
          <div className="stat-card-label">Taken in {THIS_MONTH_LABEL}</div>
          <div className="stat-card-value">{totals.thisMonth}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-error)' }} />
          <div className="stat-card-label">Low Balance (≤ 2 days)</div>
          <div className="stat-card-value">{totals.lowBalance}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          style={{ maxWidth: 320 }}
          placeholder="Search employee…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Total Leaves</th>
              <th>Taken ({PREV_MONTH_LABEL})</th>
              <th>Taken ({THIS_MONTH_LABEL})</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.employee_id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar avatar-sm">{initials(r.employee_name)}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.employee_name}</div>
                  </div>
                </td>
                <td>{r.total_leaves}</td>
                <td>{r.taken_previous_month}</td>
                <td>{r.taken_this_month}</td>
                <td>
                  <span className={`badge ${remainingBadgeClass(r.remaining_leaves)}`}>
                    {r.remaining_leaves} left
                  </span>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
