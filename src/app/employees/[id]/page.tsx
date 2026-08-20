'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface EmployeeProfileData {
  id: number;
  name: string;
  email: string;
  secondary_email?: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  discord_username?: string | null;
  emergency_contact?: string | null;
  emergency_contact_name?: string | null;
  dob?: string | null;
  gender?: string | null;
  bio?: string | null;
  address?: string | null;
  permanent_address?: string | null;
  education_level?: string | null;
  institution_name?: string | null;
  field_of_study?: string | null;
  graduation_date?: string | null;
  previous_experience?: string | null;
  areas_of_interest?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  profile_picture?: string | null;
  designation: string;
  department: string;
  manager_id?: number | null;
  manager_name?: string | null;
  start_date: string;
  timezone: string;
  work_hours: string;
  tech_stack: string[] | string | null;
  role: string;
  status?: string | null;
  is_active: boolean;
  salary?: string | number | null;
  pay_frequency?: string | null;
}

interface TaxProfile {
  id?: number;
  employee_id?: number;
  tax_id?: string | null;
  country?: string | null;
  filing_status?: string | null;
  tax_regime?: string | null;
  exemptions?: number | string | null;
  additional_withholding?: number | string | null;
  notes?: string | null;
  annual_salary?: number;
  taxable_income?: number;
  estimated_annual_tax?: number;
  estimated_monthly_tax?: number;
  effective_rate?: number;
  updated_at?: string;
}

interface CompensationRecord {
  id: number;
  employee_id: number;
  salary: number | string;
  pay_frequency: string;
  effective_from: string;
  effective_to?: string | null;
  change_reason?: string | null;
  changed_by?: number | null;
  changed_by_name?: string | null;
  created_at?: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  start_date?: string;
  expected_end_date?: string;
  assigned_role: string;
  milestones: { id: number; title: string; due_date: string; status: string }[];
  repo_url: string[];
  docs_url: string[];
}

interface Acknowledgement {
  id: number;
  policy_id: number;
  policy_title: string;
  signed_file_path: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
}

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace('/api', '');

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

function fmtDate(d: string | null | undefined) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(val: string | number | null | undefined) {
  if (val === null || val === undefined || val === '') return 'N/A';
  const num = Number(val);
  return isNaN(num) ? 'N/A' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const roleColors: Record<string, string> = {
  admin: 'badge-error',
  lead: 'badge-accent',
  employee: 'badge-neutral',
};

const statusBadge: Record<string, string> = {
  active: 'badge-success',
  onboarding: 'badge-warning',
  on_leave: 'badge-info',
  terminated: 'badge-error',
  archived: 'badge-neutral',
  on_hold: 'badge-warning',
};

const msBadge: Record<string, string> = {
  completed: 'badge-success',
  in_progress: 'badge-info',
  pending: 'badge-neutral',
};

const ackBadge: Record<string, string> = {
  approved: 'badge-success',
  rejected: 'badge-error',
  pending: 'badge-warning',
};

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSelf = user?.id === Number(id);
  const canViewFinancials = isAdmin || user?.role === 'lead' || isSelf;

  const [activeTab, setActiveTab] = useState<'profile' | 'tax' | 'compensation' | 'projects'>('profile');
  const [employee, setEmployee] = useState<EmployeeProfileData | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [compensationHistory, setCompensationHistory] = useState<CompensationRecord[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [acks, setAcks] = useState<Acknowledgement[]>([]);
  const [acksLoading, setAcksLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [ackError, setAckError] = useState('');
  const [previewFor, setPreviewFor] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<EmployeeProfileData>(`/employees/${id}`),
      api.get<Project[]>(`/projects/by-employee/${id}`).catch(() => []),
    ])
      .then(([emp, proj]) => {
        setEmployee(emp);
        setProjects(proj);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!canViewFinancials || !id) return;
    setTaxLoading(true);
    api.get<TaxProfile>(`/employees/${id}/tax-profile`)
      .then(setTaxProfile)
      .catch(() => setTaxProfile(null))
      .finally(() => setTaxLoading(false));

    setCompLoading(true);
    api.get<CompensationRecord[]>(`/employees/${id}/compensation-history`)
      .then(setCompensationHistory)
      .catch(() => setCompensationHistory([]))
      .finally(() => setCompLoading(false));
  }, [id, canViewFinancials]);

  useEffect(() => {
    if (!isAdmin) return;
    setAcksLoading(true);
    api.get<Acknowledgement[]>(`/employees/${id}/acknowledgements`)
      .then(setAcks)
      .catch(() => setAcks([]))
      .finally(() => setAcksLoading(false));
  }, [id, isAdmin]);

  async function approve(ack: Acknowledgement) {
    setReviewingId(ack.id);
    try {
      await api.put(`/policies/acknowledgements/${ack.id}/review`, { status: 'approved' });
      setAcks(prev => prev.map(a => a.id === ack.id ? { ...a, status: 'approved', rejection_reason: null } : a));
    } catch {
      setAckError('Could not approve this submission. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  async function reject(ack: Acknowledgement) {
    if (!rejectReason.trim()) return;
    setReviewingId(ack.id);
    try {
      await api.put(`/policies/acknowledgements/${ack.id}/review`, {
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
      });
      setAcks(prev => prev.map(a => a.id === ack.id ? { ...a, status: 'rejected', rejection_reason: rejectReason.trim() } : a));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      setAckError('Could not reject this submission. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) return <div className="p-4 text-muted">Loading employee profile…</div>;
  if (!employee) return <div className="p-4 text-muted">Employee not found.</div>;

  const tech = parseTech(employee.tech_stack);

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => router.push('/employees')}>
        ← Back to Team Directory
      </button>

      {/* Top Banner Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex items-center gap-4">
          <div className="avatar avatar-lg" style={{ width: 64, height: 64, fontSize: 22 }}>
            {initials(employee.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>{employee.name}</h1>
              <span className={`badge ${roleColors[employee.role]}`}>{employee.role}</span>
              {employee.status && (
                <span className={`badge ${statusBadge[employee.status] || 'badge-neutral'}`}>
                  {employee.status}
                </span>
              )}
              {isSelf && <span className="badge badge-info">You</span>}
            </div>
            <div className="text-muted" style={{ fontSize: 14, marginTop: 2 }}>
              {employee.designation}{employee.department ? ` · ${employee.department}` : ''}
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ marginTop: 8, color: 'var(--color-text-muted)' }}>
              <span>✉ {employee.email}</span>
              {employee.phone && <span>📞 {employee.phone}</span>}
              {employee.manager_name && <span>👤 Reports to <strong>{employee.manager_name}</strong></span>}
            </div>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
          <button
            className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Employee Profile
          </button>
          {canViewFinancials && (
            <>
              <button
                className={`btn btn-sm ${activeTab === 'tax' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('tax')}
              >
                🧾 Tax Profile
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'compensation' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('compensation')}
              >
                💵 Compensation History
              </button>
            </>
          )}
          <button
            className={`btn btn-sm ${activeTab === 'projects' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('projects')}
          >
            📂 Projects & Documents ({projects.length})
          </button>
        </div>
      </div>

      {/* ── TAB 1: EMPLOYEE PROFILE ──────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Bio & Overview */}
          {employee.bio && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>About / Bio</div>
              <p style={{ margin: 0, color: 'var(--color-text-body)', lineHeight: 1.6 }}>{employee.bio}</p>
            </div>
          )}

          {/* Personal & Contact Details */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Personal & Contact Information</div>
            <div className="grid-2" style={{ gap: 16 }}>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Primary Email</span>
                <span className="font-semibold">{employee.email}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Secondary Email</span>
                <span>{employee.secondary_email || '—'}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Phone Number</span>
                <span>{employee.phone || '—'}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Alt Phone</span>
                <span>{employee.alt_phone || '—'}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Discord Username</span>
                <span>{employee.discord_username ? `@${employee.discord_username}` : '—'}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Gender</span>
                <span style={{ textTransform: 'capitalize' }}>{employee.gender || '—'}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Date of Birth</span>
                <span>{fmtDate(employee.dob)}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Work Schedule</span>
                <span>{employee.work_hours} <span style={{ color: 'var(--color-accent)' }}>({employee.timezone})</span></span>
              </div>
            </div>
          </div>

          {/* Emergency Contact & Address */}
          <div className="grid-2" style={{ gap: 20 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Emergency Contact</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Contact Name</span>
                  <span className="font-semibold">{employee.emergency_contact_name || '—'}</span>
                </div>
                <div>
                  <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Contact Phone/Details</span>
                  <span>{employee.emergency_contact || '—'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Address Information</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Current Address</span>
                  <span>{employee.address || '—'}</span>
                </div>
                <div>
                  <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Permanent Address</span>
                  <span>{employee.permanent_address || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Education & Experience */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Education & Background</div>
            <div className="grid-2" style={{ gap: 16 }}>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Education Level</span>
                <span>{employee.education_level || '—'}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Institution Name</span>
                <span>{employee.institution_name || '—'}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Field of Study</span>
                <span>{employee.field_of_study || '—'}</span>
              </div>
              <div>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Graduation Date</span>
                <span>{fmtDate(employee.graduation_date)}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Previous Experience</span>
                <p style={{ margin: 0, color: 'var(--color-text-body)' }}>{employee.previous_experience || '—'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Areas of Interest</span>
                <p style={{ margin: 0, color: 'var(--color-text-body)' }}>{employee.areas_of_interest || '—'}</p>
              </div>
            </div>
          </div>

          {/* Skills & Links */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Skills & Social Profiles</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tech.length > 0 && (
                <div>
                  <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 6 }}>Tech Stack</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tech.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
              )}
              <div className="flex gap-4 text-sm" style={{ flexWrap: 'wrap' }}>
                {employee.linkedin_url && (
                  <a href={employee.linkedin_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
                    🔗 LinkedIn ↗
                  </a>
                )}
                {employee.github_url && (
                  <a href={employee.github_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
                    🔗 GitHub ↗
                  </a>
                )}
                {employee.portfolio_url && (
                  <a href={employee.portfolio_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
                    🔗 Portfolio ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TAX PROFILE ──────────────────────────────────────────── */}
      {activeTab === 'tax' && canViewFinancials && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {taxLoading ? (
            <div className="card"><p className="text-muted text-sm">Loading tax profile details…</p></div>
          ) : !taxProfile ? (
            <div className="card">
              <div className="card-title">Tax Profile</div>
              <p className="text-muted text-sm" style={{ marginTop: 8 }}>No tax profile recorded for this employee yet.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 12 }}>Tax Identification</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Tax ID / PAN</span>
                      <span className="font-semibold" style={{ fontSize: 16 }}>{taxProfile.tax_id || 'Not Specified'}</span>
                    </div>
                    <div>
                      <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Tax Jurisdiction Country</span>
                      <span>{taxProfile.country || 'Nepal'}</span>
                    </div>
                    <div>
                      <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Filing Status</span>
                      <span style={{ textTransform: 'capitalize' }}>{taxProfile.filing_status || 'single'}</span>
                    </div>
                    <div>
                      <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Tax Regime</span>
                      <span className="badge badge-accent" style={{ textTransform: 'uppercase' }}>
                        {taxProfile.tax_regime || 'new'} Regime
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title" style={{ marginBottom: 12 }}>Allowances & Withholdings</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Exemptions</span>
                      <span className="font-semibold">{fmtMoney(taxProfile.exemptions)}</span>
                    </div>
                    <div>
                      <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Additional Monthly Withholding</span>
                      <span className="font-semibold">{fmtMoney(taxProfile.additional_withholding)}</span>
                    </div>
                    {taxProfile.notes && (
                      <div>
                        <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 2 }}>Tax Profile Notes</span>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-body)' }}>{taxProfile.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax Estimates */}
              <div className="card">
                <div className="card-title" style={{ marginBottom: 14 }}>Tax Calculation & Breakdown</div>
                <div className="grid-2" style={{ gap: 16 }}>
                  <div style={{ background: 'var(--color-bg)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span className="text-muted text-sm">Estimated Annual Salary</span>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{fmtMoney(taxProfile.annual_salary)}</div>
                  </div>
                  <div style={{ background: 'var(--color-bg)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span className="text-muted text-sm">Taxable Income</span>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{fmtMoney(taxProfile.taxable_income)}</div>
                  </div>
                  <div style={{ background: 'var(--color-bg)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span className="text-muted text-sm">Estimated Annual Tax</span>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: 'var(--color-error)' }}>
                      {fmtMoney(taxProfile.estimated_annual_tax)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-bg)', padding: 14, borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <span className="text-muted text-sm">Estimated Monthly Withholding</span>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: 'var(--color-accent)' }}>
                      {fmtMoney(taxProfile.estimated_monthly_tax)}
                    </div>
                  </div>
                </div>
                {taxProfile.effective_rate !== undefined && (
                  <div style={{ marginTop: 14, fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Effective Tax Rate: <strong>{taxProfile.effective_rate}%</strong>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB 3: COMPENSATION HISTORY ─────────────────────────────────── */}
      {activeTab === 'compensation' && canViewFinancials && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Current Salary Summary Header */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)', border: '1px solid var(--color-border)' }}>
            <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="text-muted text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Compensation</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>
                  {fmtMoney(employee.salary)} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {employee.pay_frequency || 'monthly'}</span>
                </div>
              </div>
              <span className="badge badge-accent" style={{ padding: '6px 12px', fontSize: 13 }}>
                Pay Frequency: {employee.pay_frequency || 'Monthly'}
              </span>
            </div>
          </div>

          {/* History Timeline Table */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Compensation Revision History</div>
            {compLoading ? (
              <p className="text-muted text-sm">Loading compensation history…</p>
            ) : compensationHistory.length === 0 ? (
              <p className="text-muted text-sm">No historical compensation entries recorded.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Effective Dates</th>
                      <th style={{ padding: '10px 12px' }}>Salary Amount</th>
                      <th style={{ padding: '10px 12px' }}>Frequency</th>
                      <th style={{ padding: '10px 12px' }}>Reason / Notes</th>
                      <th style={{ padding: '10px 12px' }}>Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compensationHistory.map((row, idx) => {
                      const isCurrent = !row.effective_to;
                      return (
                        <tr key={row.id || idx} style={{ borderBottom: '1px solid var(--color-border)', fontSize: 13.5 }}>
                          <td style={{ padding: '12px 12px' }}>
                            <div className="font-semibold">
                              {fmtDate(row.effective_from)} → {row.effective_to ? fmtDate(row.effective_to) : 'Present'}
                            </div>
                            {isCurrent && <span className="badge badge-success" style={{ fontSize: 10, marginTop: 2 }}>Current</span>}
                          </td>
                          <td style={{ padding: '12px 12px', fontWeight: 600, color: 'var(--color-accent)' }}>
                            {fmtMoney(row.salary)}
                          </td>
                          <td style={{ padding: '12px 12px', textTransform: 'capitalize' }}>
                            {row.pay_frequency}
                          </td>
                          <td style={{ padding: '12px 12px', color: 'var(--color-text-body)' }}>
                            {row.change_reason || '—'}
                          </td>
                          <td style={{ padding: '12px 12px', color: 'var(--color-text-muted)' }}>
                            {row.changed_by_name || 'System'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: PROJECTS & DOCUMENTS ─────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Projects */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Assigned Projects</div>

            {projects.length === 0 ? (
              <p className="text-muted text-sm">Not assigned to any projects yet.</p>
            ) : (
              projects.map(p => {
                const repos = Array.isArray(p.repo_url) ? p.repo_url : [];
                const docs = Array.isArray(p.docs_url) ? p.docs_url : [];
                const pending = p.milestones.filter(m => m.status !== 'completed').length;
                const total = p.milestones.length;
                return (
                  <div key={p.id} style={{
                    background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', padding: 16, marginBottom: 12,
                  }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        {p.description && <div className="text-muted text-sm">{p.description}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className={`badge ${statusBadge[p.status]}`}>{p.status}</span>
                        <span className="badge badge-accent">{p.assigned_role.replace(/_/g, ' ')}</span>
                      </div>
                    </div>

                    <div className="flex gap-4 text-sm" style={{ marginBottom: p.milestones.length > 0 ? 12 : 0 }}>
                      {p.start_date && (
                        <span className="text-muted">
                          Start: <strong>{fmtDate(p.start_date)}</strong>
                        </span>
                      )}
                      {p.expected_end_date && (
                        <span className="text-muted">
                          Deadline: <strong style={{ color: new Date(p.expected_end_date) < new Date() && p.status !== 'archived' ? 'var(--color-error)' : 'inherit' }}>
                            {fmtDate(p.expected_end_date)}
                          </strong>
                        </span>
                      )}
                      {total > 0 && (
                        <span className="text-muted">
                          Milestones: <strong>{total - pending}/{total} done</strong>
                        </span>
                      )}
                    </div>

                    {(repos.length > 0 || docs.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: p.milestones.length > 0 ? 10 : 0 }}>
                        {repos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                            style={{ color: 'var(--color-accent)' }}>Repo {repos.length > 1 ? i + 1 : ''} ↗</a>
                        ))}
                        {docs.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                            style={{ color: 'var(--color-accent)' }}>Docs {docs.length > 1 ? i + 1 : ''} ↗</a>
                        ))}
                      </div>
                    )}

                    {p.milestones.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {p.milestones.map(m => (
                          <div key={m.id} className="flex items-center gap-3">
                            <span className={`badge ${msBadge[m.status]}`} style={{ fontSize: 11 }}>{m.status.replace('_', ' ')}</span>
                            <span className="text-sm">{m.title}</span>
                            <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>
                              {fmtDate(m.due_date)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Documents (admin only) */}
          {isAdmin && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Signed Policy Documents</div>

              {ackError && <p style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>{ackError}</p>}

              {acksLoading ? (
                <p className="text-muted text-sm">Loading…</p>
              ) : acks.length === 0 ? (
                <p className="text-muted text-sm">No documents submitted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {acks.map(ack => (
                    <div key={ack.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                        onClick={() => setPreviewFor({
                          title: `${employee.name} — ${ack.policy_title}`,
                          url: `${BACKEND}/uploads/policy-acks/${ack.signed_file_path}`,
                        })}
                        title="Preview signed copy"
                      >
                        <div style={{ flex: 1 }}>
                          <div className="font-semibold text-sm">{ack.policy_title}</div>
                          <div className="text-muted" style={{ fontSize: 11.5 }}>Submitted {fmtDate(ack.submitted_at)}</div>
                        </div>
                        <span className={`badge ${ackBadge[ack.status]}`}>{ack.status}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <a
                          href={`${BACKEND}/uploads/policy-acks/${ack.signed_file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ textDecoration: 'none' }}
                        >
                          Download
                        </a>
                        {ack.status !== 'approved' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => approve(ack)}
                            disabled={reviewingId === ack.id}
                          >
                            Approve
                          </button>
                        )}
                        {ack.status !== 'rejected' && rejectingId !== ack.id && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => { setRejectingId(ack.id); setRejectReason(''); }}
                            disabled={reviewingId === ack.id}
                          >
                            Reject
                          </button>
                        )}
                      </div>

                      {rejectingId === ack.id && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <textarea
                            className="form-input"
                            placeholder="Reason for rejection (sent to the employee by email)"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={2}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => reject(ack)}
                              disabled={!rejectReason.trim() || reviewingId === ack.id}
                            >
                              {reviewingId === ack.id ? 'Rejecting…' : 'Confirm Reject'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setRejectingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {ack.status === 'rejected' && ack.rejection_reason && rejectingId !== ack.id && (
                        <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 8 }}>
                          Reason: {ack.rejection_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF preview modal */}
      {previewFor && (
        <div className="modal-overlay" onClick={() => setPreviewFor(null)}>
          <div
            className="modal"
            style={{
              maxWidth: 860,
              width: '100%',
              height: 'min(720px, calc(100vh - 96px))',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '18px 24px', marginBottom: 0, borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 16 }}>{previewFor.title}</h2>
              <button className="modal-close" onClick={() => setPreviewFor(null)}>×</button>
            </div>
            <iframe
              src={`${previewFor.url}#toolbar=0&navpanes=0`}
              title={previewFor.title}
              style={{ flex: 1, width: '100%', border: 'none', background: 'var(--color-bg)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
