'use client';
import { useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/lib/toast';

interface Employee {
  id: number;
  name: string;
  email: string;
  designation: string;
  department: string;
  manager_id?: number;
  manager_name?: string;
  start_date: string;
  role: string;
  status: string;
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

const BACKEND = process.env.NEXT_PUBLIC_API_URL!.replace('/api', '');

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const roleColors: Record<string, string> = {
  admin: 'badge-error',
  lead: 'badge-accent',
  employee: 'badge-neutral',
};

const statusBadge: Record<string, string> = {
  active: 'badge-success',
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

export default function EmployeeProfileClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [employee, setEmployee] = useState<Employee | null>(null);
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
      api.get<Employee>(`/employees/${id}`),
      api.get<Project[]>(`/projects/by-employee/${id}`).catch(() => []),
    ])
      .then(([emp, proj]) => { setEmployee(emp); setProjects(proj); })
      .catch(() => {showToast('error', 'Failed to load employee data')})
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!employee) return <p className="text-muted">Employee not found.</p>;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => router.push('/employees')}>
        ← Back to Team Directory
      </button>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="avatar avatar-lg">{initials(employee.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2">
              <div className="font-semibold" style={{ fontSize: 18 }}>{employee.name}</div>
              <span className={`badge ${roleColors[employee.role]}`}>{employee.role}</span>
            </div>
            <div className="text-muted">{employee.designation}{employee.department ? ` · ${employee.department}` : ''}</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <div className="flex gap-2 items-center">
            <span className="text-muted" style={{ width: 90, flexShrink: 0 }}>Email</span>
            <span className="text-sm">{employee.email}</span>
          </div>
          {employee.manager_name && (
            <div className="flex gap-2 items-center">
              <span className="text-muted" style={{ width: 90, flexShrink: 0 }}>Reports to</span>
              <span className="text-sm">{employee.manager_name}</span>
            </div>
          )}
          {employee.start_date && (
            <div className="flex gap-2 items-center">
              <span className="text-muted" style={{ width: 90, flexShrink: 0 }}>Since</span>
              <span className="text-sm">{fmtDate(employee.start_date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Documents (admin only) ──────────────────────────────────────── */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>Signed Documents</div>

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

      {/* ── Projects ─────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Projects</div>

        {projects.length === 0 && (
          <p className="text-muted text-sm">Not assigned to any projects yet.</p>
        )}

        {projects.map(p => {
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
        })}
      </div>

      {/* ── PDF preview modal ───────────────────────────────────────────── */}
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
