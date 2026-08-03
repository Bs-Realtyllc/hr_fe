'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PillTabs from '@/components/PillTabs';

interface Leave {
  id: number;
  employee_id: number;
  employee_name: string;
  designation: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_name?: string;
}

type DisplayStatus = 'unverified' | 'approved' | 'rejected' | 'expired';

function isExpired(leave: Leave): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(leave.end_date) < today;
}

function displayStatus(leave: Leave): DisplayStatus {
  if (leave.status === 'approved') return 'approved';
  if (leave.status === 'rejected') return 'rejected';
  return isExpired(leave) ? 'expired' : 'unverified';
}

const STATUS_META: Record<DisplayStatus, { label: string; color: string; bg: string; dot: string }> = {
  unverified: { label: 'Unverified', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  approved:   { label: 'Approved',   color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
  rejected:   { label: 'Rejected',   color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' },
  expired:    { label: 'Expired',    color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
};

interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;      // write-only — never returned by API
  smtp_from: string;
  default_to: string;
  default_cc: string;
  default_bcc: string;
}

const BLANK_SETTINGS: EmailSettings = {
  smtp_host: 'smtp.gmail.com', smtp_port: 587,
  smtp_user: '', smtp_pass: '', smtp_from: '',
  default_to: '', default_cc: '', default_bcc: '',
};

const LEAVE_COLORS: Record<string, string> = {
  sick: 'var(--color-warning)', bereavement: 'var(--color-error)',
  maternity: 'var(--color-accent)', paternity: 'var(--color-info)',
  // legacy types — no longer offered on new requests, kept so old records still render correctly
  casual: 'var(--color-info)', annual: 'var(--color-accent)',
};

function toDateInput(iso: string) {
  return iso ? iso.split('T')[0] : '';
}

export default function LeavesPage() {
  const { user } = useAuth();
  const isAdmin     = user?.role === 'admin';
  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const [leaves, setLeaves]                 = useState<Leave[]>([]);
  const [filter, setFilter]                 = useState('all');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saveStatus, setSaveStatus]         = useState('');

  // Edit-leave state
  const [editingLeave, setEditingLeave]   = useState<Leave | null>(null);
  const [editForm, setEditForm]           = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });

  // Email settings form
  const [emailForm, setEmailForm] = useState<EmailSettings>(BLANK_SETTINGS);

  // New-leave + recipient form
  const [form, setForm] = useState({
    leave_type: 'sick', start_date: '', end_date: '', reason: '',
    to: '', cc: '', bcc: '',
  });

  const load = () =>
    api.get<Leave[]>(`/leaves${filter !== 'all' ? `?status=${filter}` : ''}`).then(setLeaves).catch(() => {});

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    if (!user?.id) return;
    api.get<Omit<EmailSettings, 'smtp_pass'> | null>(`/email-settings/${user.id}`)
      .then(cfg => {
        if (cfg) {
          setEmailConfigured(true);
          setEmailForm(f => ({ ...f, ...cfg, smtp_pass: '' }));
          setForm(f => ({ ...f, to: cfg.default_to || '', cc: cfg.default_cc || '', bcc: cfg.default_bcc || '' }));
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const openLeaveModal = () => {
    setForm(f => ({ ...f, leave_type: 'sick', start_date: '', end_date: '', reason: '' }));
    setShowLeaveModal(true);
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { to, cc, bcc, ...leaveFields } = form;
    await api.post<{ id: number }>('/leaves', {
      ...leaveFields,
      employee_id: user?.id,
      ...(emailConfigured && to.trim() && {
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
      }),
    });
    setShowLeaveModal(false);
    load();
  };

  const openEditModal = (l: Leave) => {
    setEditingLeave(l);
    setEditForm({
      leave_type: l.leave_type,
      start_date: toDateInput(l.start_date),
      end_date:   toDateInput(l.end_date),
      reason:     l.reason || '',
    });
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave) return;
    await api.put(`/leaves/${editingLeave.id}`, editForm);
    setEditingLeave(null);
    load();
  };

  const cancelLeave = async (id: number) => {
    if (!confirm('Cancel this leave request?')) return;
    await api.delete(`/leaves/${id}`);
    load();
  };

  const saveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSettingsLoading(true);
    setSaveStatus('');
    try {
      await api.put(`/email-settings/${user.id}`, emailForm);
      setEmailConfigured(true);
      setForm(f => ({ ...f, to: emailForm.default_to, cc: emailForm.default_cc, bcc: emailForm.default_bcc }));
      setShowEmailSetup(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveStatus(`Error: ${msg}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  const approve = async (id: number) => { await api.put(`/leaves/${id}/approve`, {}); load(); };
  const reject  = async (id: number) => { await api.put(`/leaves/${id}/reject`,  {}); load(); };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Leave Requests</h1>
            <p>{isPrivileged ? 'Manage employee leave applications and balances' : 'Your leave applications'}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => { setSaveStatus(''); setShowEmailSetup(true); }}>
              <span
                className="icon-mask"
                style={{
                  WebkitMaskImage: `url(/icons/${emailConfigured ? 'check-circle.svg' : 'mail.svg'})`,
                  maskImage: `url(/icons/${emailConfigured ? 'check-circle.svg' : 'mail.svg'})`,
                }}
              />
              {emailConfigured ? 'Email Settings' : 'Setup Email'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={openLeaveModal}>
              <span
                className="icon-mask"
                style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
              />
              New Request
            </button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4">
        <PillTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all',      label: 'All' },
            { value: 'pending',  label: 'Unverified' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {leaves.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>No leave requests found</td></tr>
              )}
              {leaves.map(l => {
                const isOwn    = l.employee_id === user?.id;
                const ds       = displayStatus(l);
                const meta     = STATUS_META[ds];
                const expired  = ds === 'expired';

                // Actions only allowed while leave dates are still in the future
                const canApproveReject = l.status === 'pending' && !expired &&
                  (isAdmin || (user?.role === 'lead' && !isOwn));
                const canEditCancel = l.status === 'pending' && !expired && isOwn;

                return (
                  <tr key={l.id} style={{ opacity: expired ? 0.6 : 1 }}>
                    <td>
                      <div className="cell-title">{l.employee_name}</div>
                      <div className="cell-subtitle">{l.designation}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${LEAVE_COLORS[l.leave_type]}22`, color: LEAVE_COLORS[l.leave_type], fontWeight: 600, textTransform: 'capitalize' }}>
                        {l.leave_type}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm">{new Date(l.start_date).toLocaleDateString()}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>to {new Date(l.end_date).toLocaleDateString()}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}><div className="truncate text-sm">{l.reason || '—'}</div></td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: meta.bg, color: meta.color,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                        {meta.label}
                      </span>
                      {(ds === 'approved' || ds === 'rejected') && l.reviewer_name && (
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          by {l.reviewer_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {canApproveReject && (
                          <>
                            <button className="btn btn-sm btn-accent" onClick={() => approve(l.id)}>Approve</button>
                            <button className="btn btn-sm btn-danger" onClick={() => reject(l.id)}>Reject</button>
                          </>
                        )}
                        {canEditCancel && (
                          <>
                            <button className="btn btn-sm btn-ghost" onClick={() => openEditModal(l)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => cancelLeave(l.id)}>Cancel</button>
                          </>
                        )}
                        {expired && l.status === 'pending' && (
                          <span className="text-muted" style={{ fontSize: 11 }}>No actions available</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New Leave Request Modal ──────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Leave Request</h2>
              <button className="modal-close" onClick={() => setShowLeaveModal(false)}>×</button>
            </div>
            <form onSubmit={submitLeave}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-select" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                  <option value="sick">Sick</option>
                  <option value="bereavement">Bereavement</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
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

              {/* Email notification */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)' }}>
                    Email Notification
                  </span>
                  {!emailConfigured && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                      onClick={() => { setShowLeaveModal(false); setSaveStatus(''); setShowEmailSetup(true); }}>
                      Setup email first →
                    </button>
                  )}
                </div>
                {emailConfigured ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">To</label>
                      <input className="form-input" type="text" placeholder="manager@company.com"
                        value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">CC</label>
                        <input className="form-input" type="text" placeholder="hr@company.com"
                          value={form.cc} onChange={e => setForm({ ...form, cc: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">BCC</label>
                        <input className="form-input" type="text" placeholder="archive@company.com"
                          value={form.bcc} onChange={e => setForm({ ...form, bcc: e.target.value })} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted" style={{ fontSize: 13 }}>Configure your email settings once to enable notifications.</p>
                )}
              </div>

              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {emailConfigured && form.to.trim() ? 'Submit & Notify' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Leave Modal ─────────────────────────────────────────────── */}
      {editingLeave && (
        <div className="modal-overlay" onClick={() => setEditingLeave(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Leave Request</h2>
              <button className="modal-close" onClick={() => setEditingLeave(null)}>×</button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-select" value={editForm.leave_type} onChange={e => setEditForm({ ...editForm, leave_type: e.target.value })}>
                  <option value="sick">Sick</option>
                  <option value="bereavement">Bereavement</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-between" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingLeave(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Email Setup Modal ────────────────────────────────────────────── */}
      {showEmailSetup && (
        <div className="modal-overlay" onClick={() => setShowEmailSetup(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Email Settings</h2>
              <button className="modal-close" onClick={() => setShowEmailSetup(false)}>×</button>
            </div>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Set up once. Your credentials are saved securely in the database and used each time you send a leave notification.
            </p>
            <form onSubmit={saveEmailSettings}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                SMTP Configuration
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">SMTP Host</label>
                  <input className="form-input" type="text" placeholder="smtp.gmail.com"
                    value={emailForm.smtp_host} onChange={e => setEmailForm({ ...emailForm, smtp_host: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input className="form-input" type="number" placeholder="587"
                    value={emailForm.smtp_port} onChange={e => setEmailForm({ ...emailForm, smtp_port: +e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email / Username</label>
                <input className="form-input" type="email" placeholder="you@gmail.com"
                  value={emailForm.smtp_user} onChange={e => setEmailForm({ ...emailForm, smtp_user: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Password {emailConfigured && <span className="text-muted" style={{ fontWeight: 400 }}>(leave blank to keep existing)</span>}
                </label>
                <input className="form-input" type="password" placeholder={emailConfigured ? '••••••••' : 'App password'}
                  value={emailForm.smtp_pass}
                  onChange={e => setEmailForm({ ...emailForm, smtp_pass: e.target.value })}
                  required={!emailConfigured} />
              </div>
              <div className="form-group">
                <label className="form-label">Display Name (From)</label>
                <input className="form-input" type="text" placeholder="Your Name (optional)"
                  value={emailForm.smtp_from} onChange={e => setEmailForm({ ...emailForm, smtp_from: e.target.value })} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', margin: '16px 0 10px' }}>
                Default Recipients
              </div>
              <div className="form-group">
                <label className="form-label">Default To</label>
                <input className="form-input" type="text" placeholder="manager@company.com"
                  value={emailForm.default_to} onChange={e => setEmailForm({ ...emailForm, default_to: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Default CC</label>
                  <input className="form-input" type="text" placeholder="hr@company.com"
                    value={emailForm.default_cc} onChange={e => setEmailForm({ ...emailForm, default_cc: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Default BCC</label>
                  <input className="form-input" type="text" placeholder="archive@company.com"
                    value={emailForm.default_bcc} onChange={e => setEmailForm({ ...emailForm, default_bcc: e.target.value })} />
                </div>
              </div>

              {saveStatus && (
                <div style={{ fontSize: 13, marginBottom: 12, color: saveStatus.startsWith('Error') ? 'var(--color-error)' : 'var(--color-success)' }}>
                  {saveStatus}
                </div>
              )}
              <div className="flex gap-3 justify-between">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEmailSetup(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={settingsLoading}>
                  {settingsLoading ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
