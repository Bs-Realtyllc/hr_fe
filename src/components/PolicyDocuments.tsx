'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import PdfThumbnail from './PdfThumbnail';

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace('/api', '');

interface Policy {
  id: number;
  type: string;
  category: string;
  title: string;
  file_path: string;
  version: number;
  uploaded_by_name: string | null;
  created_at: string;
  is_pinned: boolean | number;
}

interface Acknowledgement {
  id: number;
  policy_id: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
}

interface Submission {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  signed_file_path: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function isRecent(dateStr: string) {
  const ageMs = Date.now() - new Date(dateStr).getTime();
  return ageMs < 2 * 24 * 60 * 60 * 1000; // 2 days
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';
}

interface PolicyDocumentsProps {
  category?: string;
  heading: string;
  adminSubtitle: string;
  employeeSubtitle: string;
  emptyMessage: string;
  requiresSignature?: boolean;
}

export default function PolicyDocuments({
  category,
  heading,
  adminSubtitle,
  employeeSubtitle,
  emptyMessage,
  requiresSignature = true,
}: PolicyDocumentsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [previewFor, setPreviewFor] = useState<{ title: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pinningId, setPinningId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myAcks, setMyAcks] = useState<Acknowledgement[]>([]);
  const [signingId, setSigningId] = useState<number | null>(null);
  const [signTarget, setSignTarget] = useState<Policy | null>(null);
  const signInputRef = useRef<HTMLInputElement>(null);

  const [reviewFor, setReviewFor] = useState<Policy | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const ackFor = (policyId: number) => myAcks.find(a => a.policy_id === policyId);

  const loadMyAcks = () =>
    api.get<Acknowledgement[]>('/policies/acknowledgements/mine').then(setMyAcks).catch(() => {});

  useEffect(() => { if (requiresSignature && !isAdmin) loadMyAcks(); }, [requiresSignature, isAdmin]);

  const load = () =>
    api.get<Policy[]>(category ? `/policies?category=${category}` : '/policies')
      .then(setPolicies).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, [category]);

  const filteredPolicies = policies.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!picked) return;

    const title = titleFromFilename(picked.name);
    setUploading(true);
    setError('');
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('type', slugify(title));
      fd.append('title', title);
      if (category) fd.append('category', category);
      fd.append('file', picked);
      const res = await fetch(`${BACKEND}/api/policies`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError('Upload failed. Please check the file and try again.');
    } finally {
      setUploading(false);
    }
  }

  function previewPolicy(p: Policy) {
    setPreviewFor({ title: p.title, url: `${BACKEND}/uploads/policies/${p.file_path}` });
  }

  function previewSubmission(sub: Submission, policyTitle: string) {
    setPreviewFor({
      title: `${sub.employee_name} — ${policyTitle}`,
      url: `${BACKEND}/uploads/policy-acks/${sub.signed_file_path}`,
    });
  }

  function startSigning(p: Policy) {
    setSignTarget(p);
    setError('');
    signInputRef.current?.click();
  }

  async function handleSignFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    const policy = signTarget;
    setSignTarget(null);
    if (!picked || !policy) return;

    setSigningId(policy.id);
    setError('');
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('file', picked);
      const res = await fetch(`${BACKEND}/api/policies/${policy.id}/acknowledgements`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error();
      await loadMyAcks();
    } catch {
      setError('Could not submit your signed copy. Please try again.');
    } finally {
      setSigningId(null);
    }
  }

  function openReview(p: Policy) {
    setReviewFor(p);
    setRejectingId(null);
    setRejectReason('');
    setSubmissionsLoading(true);
    api.get<Submission[]>(`/policies/${p.id}/acknowledgements`)
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setSubmissionsLoading(false));
  }

  async function approveSubmission(sub: Submission) {
    setReviewingId(sub.id);
    try {
      await api.put(`/policies/acknowledgements/${sub.id}/review`, { status: 'approved' });
      setSubmissions(subs => subs.map(s => s.id === sub.id ? { ...s, status: 'approved', rejection_reason: null } : s));
    } catch {
      setError('Could not approve this submission. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  async function rejectSubmission(sub: Submission) {
    if (!rejectReason.trim()) return;
    setReviewingId(sub.id);
    try {
      await api.put(`/policies/acknowledgements/${sub.id}/review`, {
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
      });
      setSubmissions(subs => subs.map(s => s.id === sub.id ? { ...s, status: 'rejected', rejection_reason: rejectReason.trim() } : s));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      setError('Could not reject this submission. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  async function togglePin(p: Policy) {
    const nextPinned = !p.is_pinned;
    setPinningId(p.id);
    try {
      await api.put(`/policies/${p.id}/pin`, { pinned: nextPinned });
      await load();
    } catch {
      setError('Could not update pin. Please try again.');
    } finally {
      setPinningId(null);
    }
  }

  async function handleDelete(p: Policy) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await api.delete(`/policies/${p.id}`);
      await load();
    } catch {
      setError('Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{heading}</h1>
        <p>{isAdmin ? adminSubtitle : employeeSubtitle}</p>
      </div>

      <div className="search-bar mb-4">
        <span
          className="icon-mask search-bar-icon"
          style={{ WebkitMaskImage: 'url(/icons/search.svg)', maskImage: 'url(/icons/search.svg)' }}
        />
        <input
          className="form-input"
          placeholder="Search by title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            {isAdmin ? 'Published documents' : 'Available documents'}
          </div>
          {isAdmin && (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setError(''); fileInputRef.current?.click(); }}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : '+ Upload document'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleFilePicked}
              />
            </>
          )}
        </div>

        <input
          ref={signInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleSignFilePicked}
        />

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        {loading ? (
          <p className="text-muted" style={{ fontSize: 13.5 }}>Loading…</p>
        ) : filteredPolicies.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13.5 }}>
            {policies.length === 0 ? emptyMessage : 'No documents match your search.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
            {filteredPolicies.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex', flexDirection: 'column',
                  border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => previewPolicy(p)}
                    style={{
                      width: '100%',
                      height: 150, background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: 0, overflow: 'hidden', display: 'block',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                    title="Preview"
                  >
                    <PdfThumbnail url={`${BACKEND}/uploads/policies/${p.file_path}`} />
                  </button>

                  {isRecent(p.created_at) && (
                    <span className="badge badge-accent" style={{ position: 'absolute', top: 10, right: 10 }}>
                      New
                    </span>
                  )}

                  {isAdmin ? (
                    <button
                      onClick={() => togglePin(p)}
                      disabled={pinningId === p.id}
                      title={p.is_pinned ? 'Unpin' : 'Pin to top'}
                      style={{
                        position: 'absolute', top: 8, left: 8,
                        width: 26, height: 26, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        background: p.is_pinned ? 'var(--color-primary)' : 'rgba(255,255,255,0.85)',
                        opacity: p.is_pinned ? 1 : 0.6,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                    >
                      📌
                    </button>
                  ) : p.is_pinned ? (
                    <span
                      title="Pinned"
                      style={{
                        position: 'absolute', top: 8, left: 8,
                        width: 26, height: 26, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, background: 'var(--color-primary)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                    >
                      📌
                    </span>
                  ) : null}
                </div>

                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.35 }}>{p.title}</div>
                  <div className="text-muted" style={{ fontSize: 11.5 }}>
                    v{p.version} · {fmtDate(p.created_at)}
                    {p.uploaded_by_name ? ` · ${p.uploaded_by_name}` : ''}
                  </div>

                  {requiresSignature && !isAdmin && (() => {
                    const ack = ackFor(p.id);
                    const badgeClass = !ack ? 'badge-neutral'
                      : ack.status === 'approved' ? 'badge-success'
                      : ack.status === 'rejected' ? 'badge-error'
                      : 'badge-warning';
                    const badgeLabel = !ack ? 'Not Signed'
                      : ack.status === 'approved' ? 'Approved'
                      : ack.status === 'rejected' ? 'Rejected'
                      : 'Pending Review';
                    return (
                      <div>
                        <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                        {ack?.status === 'rejected' && ack.rejection_reason && (
                          <div style={{ color: 'var(--color-error)', fontSize: 11.5, marginTop: 4 }}>
                            {ack.rejection_reason}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div
                    style={{ display: 'flex', gap: 4, marginTop: requiresSignature ? 0 : 'auto' }}
                  >
                    <button
                      className="btn btn-secondary btn-xs"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => previewPolicy(p)}
                    >
                      View
                    </button>
                    <a
                      href={`${BACKEND}/uploads/policies/${p.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-xs"
                      style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                    >
                      Download
                    </a>
                    {isAdmin && (
                      <button
                        className="btn btn-secondary btn-xs btn-danger"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? '…' : 'Delete'}
                      </button>
                    )}
                  </div>

                  {requiresSignature && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      {!isAdmin && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => startSigning(p)}
                          disabled={signingId === p.id}
                        >
                          {signingId === p.id
                            ? 'Uploading…'
                            : ackFor(p.id)
                              ? 'Re-upload Signed Copy'
                              : 'Sign & Upload'}
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => openReview(p)}
                        >
                          Submissions
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* ── Submissions review modal ────────────────────────────────────── */}
      {reviewFor && (
        <div className="modal-overlay" onClick={() => setReviewFor(null)}>
          <div
            className="modal"
            style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Submissions — {reviewFor.title}</h2>
              <button className="modal-close" onClick={() => setReviewFor(null)}>×</button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {submissionsLoading ? (
                <p className="text-muted" style={{ fontSize: 13.5 }}>Loading…</p>
              ) : submissions.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13.5 }}>No one has submitted a signed copy yet.</p>
              ) : (
                submissions.map(sub => {
                  const badgeClass = sub.status === 'approved' ? 'badge-success'
                    : sub.status === 'rejected' ? 'badge-error' : 'badge-warning';
                  const badgeLabel = sub.status === 'approved' ? 'Approved'
                    : sub.status === 'rejected' ? 'Rejected' : 'Pending Review';
                  return (
                    <div key={sub.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                        onClick={() => reviewFor && previewSubmission(sub, reviewFor.title)}
                        title="Preview signed copy"
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{sub.employee_name}</div>
                          <div className="text-muted" style={{ fontSize: 11.5 }}>
                            {sub.employee_email} · Submitted {fmtDate(sub.submitted_at)}
                          </div>
                        </div>
                        <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <a
                          href={`${BACKEND}/uploads/policy-acks/${sub.signed_file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ textDecoration: 'none' }}
                        >
                          Download
                        </a>
                        {sub.status !== 'approved' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => approveSubmission(sub)}
                            disabled={reviewingId === sub.id}
                          >
                            Approve
                          </button>
                        )}
                        {sub.status !== 'rejected' && rejectingId !== sub.id && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => { setRejectingId(sub.id); setRejectReason(''); }}
                            disabled={reviewingId === sub.id}
                          >
                            Reject
                          </button>
                        )}
                      </div>

                      {rejectingId === sub.id && (
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
                              onClick={() => rejectSubmission(sub)}
                              disabled={!rejectReason.trim() || reviewingId === sub.id}
                            >
                              {reviewingId === sub.id ? 'Rejecting…' : 'Confirm Reject'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setRejectingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {sub.status === 'rejected' && sub.rejection_reason && rejectingId !== sub.id && (
                        <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 8 }}>
                          Reason: {sub.rejection_reason}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
