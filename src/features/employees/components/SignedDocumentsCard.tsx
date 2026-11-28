'use client';
import { BACKEND_URL } from '@/config/env';
import Button from '@/components/ui/Button/Button';
import type { Employee } from '@/types';
import type { AcknowledgementsState } from '../hooks/useAcknowledgements';
import { ackBadge, fmtDate } from '../utils';

export type PdfPreview = { title: string; url: string };

/** Admin-only list of the employee's signed policy documents, with approve/reject. */
export default function SignedDocumentsCard({ employee, ackState, setPreviewFor }: { employee: Employee; ackState: AcknowledgementsState; setPreviewFor: (p: PdfPreview) => void }) {
  const { acks, acksLoading, reviewingId, rejectingId, setRejectingId, rejectReason, setRejectReason, ackError, approve, reject } = ackState;
  return (
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
                  url: `${BACKEND_URL}/uploads/policy-acks/${ack.signed_file_path}`,
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
                  href={`${BACKEND_URL}/uploads/policy-acks/${ack.signed_file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  Download
                </a>
                {ack.status !== 'approved' && (
                  <Button
                    onClick={() => approve(ack)}
                    variant='text'
                    size='small'
                    disabled={reviewingId === ack.id}>
                    Approve
                  </Button>
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
  );
}
