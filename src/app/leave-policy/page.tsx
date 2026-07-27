'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ProfileAck {
  leave_policy_accepted: boolean | number;
  leave_policy_accepted_at: string | null;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

const LEAVE_TYPES = [
  {
    label: 'Sick Leave',
    icon: '🤒',
    points: [
      '12 paid sick leaves per year (1 per month)',
      'Unused sick leave carries forward without limit',
      'Prior notice is required wherever possible',
    ],
  },
  {
    label: 'Bereavement Leave',
    icon: '🕊️',
    points: ['3 paid days for the death of an immediate family member'],
  },
  {
    label: 'Maternity Leave',
    icon: '👶',
    points: ['2 months paid maternity leave'],
  },
  {
    label: 'Paternity Leave',
    icon: '👨‍👧',
    points: ['1 month paid paternity leave'],
  },
];

const HIGHLIGHTS = [
  { icon: '🎌', label: '18 Fixed Holidays', sub: 'Nepali calendar' },
  { icon: '📧', label: 'Approval by Email Only', sub: 'No WhatsApp / Discord DMs' },
  { icon: '⚠️', label: '3+ Days Unapproved', sub: 'May trigger disciplinary action' },
  { icon: '💰', label: '20 Days Accumulated', sub: '= 1 month salary payout' },
];

export default function LeavePolicyPage() {
  const [showPolicy, setShowPolicy] = useState(false);

  const [profile, setProfile]     = useState<ProfileAck | null>(null);
  const [agree, setAgree]         = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [ackError, setAckError]   = useState('');

  const loadProfile = () =>
    api.get<ProfileAck>('/profile').then(setProfile).catch(() => {});

  useEffect(() => { loadProfile(); }, []);

  const confirmAcceptance = async () => {
    if (!agree) return;
    setAccepting(true);
    setAckError('');
    try {
      await api.put('/profile/accept-leave-policy', {});
      await loadProfile();
    } catch {
      setAckError('Failed to save your confirmation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const accepted = !!profile?.leave_policy_accepted;

  return (
    <div>
      {/* ── Professional landing header ─────────────────────────────────── */}
      <div className="card" style={{
        marginBottom: 20, padding: '36px 32px',
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover, var(--color-primary)) 100%)',
        color: '#fff',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.85, marginBottom: 8 }}>
          Official Company Policy
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Leave &amp; Holiday Policy</h1>
        <p style={{ fontSize: 14.5, opacity: 0.92, maxWidth: 560, lineHeight: 1.6 }}>
          This policy is strictly enforced. Please review it carefully, plan your work and leave accordingly,
          and confirm that you understand it below.
        </p>
        <button
          className="btn"
          style={{ marginTop: 20, background: '#fff', color: 'var(--color-primary)', fontWeight: 700 }}
          onClick={() => setShowPolicy(true)}
        >
          📖 View Full Policy
        </button>
      </div>

      {/* ── Highlight tiles ──────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {HIGHLIGHTS.map(h => (
          <div className="stat-card" key={h.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 26 }}>{h.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{h.label}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{h.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Acceptance / consent card ───────────────────────────────────── */}
      <div className="card" style={{
        border: `1px solid ${accepted ? 'var(--color-success, #22c55e)' : 'var(--color-border)'}`,
        background: accepted ? 'rgba(34,197,94,0.06)' : 'var(--color-surface)',
      }}>
        {accepted ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>You've confirmed this policy</div>
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                Accepted on {profile?.leave_policy_accepted_at ? fmtDate(profile.leave_policy_accepted_at) : '—'}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowPolicy(true)}>
              Read again
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Confirm you've read the policy</div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--color-text-body)', cursor: 'pointer', lineHeight: 1.6 }}>
              <input
                type="checkbox"
                checked={agree}
                onChange={e => setAgree(e.target.checked)}
                style={{ width: 17, height: 17, marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
              />
              <span>
                I hereby confirm that I have read the Leave &amp; Holiday Policy in full and promise to follow it.
              </span>
            </label>
            {ackError && <p style={{ color: 'var(--color-error)', fontSize: 13, marginTop: 10 }}>{ackError}</p>}
            <button
              className="btn btn-primary"
              style={{ marginTop: 14 }}
              disabled={!agree || accepting}
              onClick={confirmAcceptance}
            >
              {accepting ? 'Saving…' : 'Confirm'}
            </button>
          </>
        )}
      </div>

      {/* ── Full policy modal ───────────────────────────────────────────── */}
      {showPolicy && (
        <div className="modal-overlay" onClick={() => setShowPolicy(false)}>
          <div className="modal" style={{ maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '20px 28px', marginBottom: 0, borderBottom: '1px solid var(--color-border)' }}>
              <h2>Leave &amp; Holiday Policy</h2>
              <button className="modal-close" onClick={() => setShowPolicy(false)}>×</button>
            </div>

            <div style={{ padding: 28, overflowY: 'auto' }}>
              {/* Fixed Holidays — summary only, full list lives on the Calendar page */}
              <div style={{ marginBottom: 28 }}>
                <div className="card-title">Fixed Holidays</div>
                <p style={{ fontSize: 14, color: 'var(--color-text-body)', marginBottom: 12 }}>
                  We observe <strong>18 fixed paid holidays</strong> per year, as per the Nepali calendar.
                </p>
                <Link href="/calendar" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                  🎌 View full holiday list on the Calendar page →
                </Link>
              </div>

              {/* Paid Leave Types */}
              <div className="grid-2" style={{ marginBottom: 28, gap: 14 }}>
                {LEAVE_TYPES.map(t => (
                  <div key={t.label} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</span>
                    </div>
                    <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6 }}>
                      {t.points.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="grid-2" style={{ marginBottom: 20, alignItems: 'start', gap: 14 }}>
                <div>
                  <div className="card-title">Leave Approval Rules (Mandatory)</div>
                  <ul style={{ paddingLeft: 18, fontSize: 13.5, color: 'var(--color-text-body)', lineHeight: 1.8 }}>
                    <li>All paid leaves must be approved <strong>in advance</strong>.</li>
                    <li>Leave requests must be sent via email using the officially shared leave email format.</li>
                    <li>Requests sent in any other format (WhatsApp, Discord DM, informal text) will <strong>not</strong> be considered valid.</li>
                    <li>Any leave taken without approval is treated as an <strong>unapproved absence</strong>.</li>
                  </ul>
                </div>

                <div>
                  <div className="card-title">Unapproved Absence Policy</div>
                  <p style={{ fontSize: 13.5, color: 'var(--color-text-body)', marginBottom: 10 }}>
                    More than 3 days of unapproved absence may result in:
                  </p>
                  <ul style={{ paddingLeft: 18, fontSize: 13.5, color: 'var(--color-text-body)', lineHeight: 1.8 }}>
                    <li>Unpaid probation, or</li>
                    <li>Termination of employment, as per the company decision.</li>
                  </ul>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
                    Attendance and absences are officially tracked in the Discord attendance channel.
                  </p>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 20, alignItems: 'start', gap: 14 }}>
                <div>
                  <div className="card-title">Accumulated Leave Benefit</div>
                  <p style={{ fontSize: 13.5, color: 'var(--color-text-body)' }}>
                    <strong>20 accumulated leave days = 1 month of base salary payout.</strong>
                  </p>
                </div>

                <div>
                  <div className="card-title">Leave Abuse Policy</div>
                  <p style={{ fontSize: 13.5, color: 'var(--color-text-body)', marginBottom: 10 }}>
                    To ensure fairness and discipline, the following may lead to conversion of paid leave to unpaid,
                    leave restrictions, or disciplinary action as per company policy:
                  </p>
                  <ul style={{ paddingLeft: 18, fontSize: 13.5, color: 'var(--color-text-body)', lineHeight: 1.8 }}>
                    <li>Repeated last-minute leave requests</li>
                    <li>Pattern-based absences</li>
                    <li>Misuse of sick leave</li>
                  </ul>
                </div>
              </div>

              <div style={{ background: 'var(--color-bg)', borderRadius: 10, padding: 16 }}>
                <div className="card-title">Important Notes</div>
                <ul style={{ paddingLeft: 18, fontSize: 13.5, color: 'var(--color-text-body)', lineHeight: 1.8 }}>
                  <li>Employees must check Discord daily for updates and notices.</li>
                  <li>Discord attendance and records will be treated as official.</li>
                  <li>Non-compliance with leave and attendance policies will directly affect employment status and benefits.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
