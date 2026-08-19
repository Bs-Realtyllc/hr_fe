'use client';

import { useEffect, useState } from 'react';
import Popup from 'reactjs-popup';
// import 'reactjs-popup/dist/index.css';
//mail template
import { buildFillDetailsMailto } from '@/template/fillDetailsMailTemplate';
import { api } from '@/lib/api';

interface InactiveUser {
  id: number;
  name: string;
  dob: string | null;
  gender: string | null;
  address: string | null;
  education_level: string | null;
  institution_name: string | null;
  field_of_study: string | null;
  graduation_date: string | null;
  previous_experience: string | null;
  areas_of_interest: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  email: string;
  secondary_email: string | null;
  discord_username: string | null;
  profile_picture: string | null;
  designation: string | null;
  department: string | null;
  manager_id: number | null;
  start_date: string | null;
  role: string;
  status: string | null;
  manager_name: string | null;
}

type ActionState = 'idle' | 'loading';

const Page = () => {
  const [users, setUsers] = useState<InactiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionState, setActionState] = useState<Record<number, ActionState>>({});

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<InactiveUser[]>('/employees/onboarding');
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while loading users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDecision = async (
    id: number,
    decision: 'approve' | 'disapprove',
    { send_mail = false }: { send_mail?: boolean } = {}
  ) => {
    setActionState((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      const path =
        decision === 'approve'
          ? `/employees/${id}/approve`
          : `/employees/${id}/reject?send_mail=${send_mail}`;

      await api.put(path, {});

      // Remove the user from the list once actioned
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Something went wrong trying to ${decision} this user.`);
      setActionState((prev) => ({ ...prev, [id]: 'idle' }));
    }
  };

  const sendMail = (user: InactiveUser) => {
    const { subject, body, mailtoLink } = buildFillDetailsMailto({
      to: user.email,
      name: user.name,
      onboardUrl: 'https://portal.gitgi.com/onboard/intern',
    });
    // Redirect the browser to the email client
    window.open(mailtoLink, '_blank');
  };

  const formatDate = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
  };

  return (
    <div className="mx-auto  px-6 py-14">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">HR Review</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Inactive Users</h1>
        <p className="mt-2 text-slate-600">
          Review pending applications and approve or disapprove each one.
        </p>
      </header>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={fetchUsers} className="font-medium underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-slate-500">Loading…</div>
      ) : users.length === 0 ? (
        <div className="py-24 text-center text-slate-500">No inactive users to review.</div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const state = actionState[user.id] ?? 'idle';
            const isLoading = state === 'loading';

            return (
              <div
                key={user.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{user.name}</h2>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                      {user.role}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Popup
                      trigger={
                        <button
                          disabled={isLoading}
                          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Disapprove
                        </button>
                      }
                      modal
                      nested
                    >
                      {/* @ts-expect-error - reactjs-popup's render-prop child typing doesn't infer `close` cleanly */}
                      {(close) => (
                        <div className="w-[90vw] max-w-sm rounded-lg bg-white p-6 shadow-xl">
                          <h3 className="text-base font-semibold text-slate-900">
                            Disapprove {user.name}?
                          </h3>
                          <p className="mt-2 text-sm text-slate-600">
                            This will permanently delete {user.name}&apos;s data from the database.
                            This action cannot be undone.
                          </p>

                          <div className="mt-6 flex flex-col gap-2">
                            <button
                              onClick={() => {
                                close();
                                handleDecision(user.id, 'disapprove', { send_mail: true });
                              }}
                              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                            >
                              Delete and send mail
                            </button>
                            <button
                              onClick={() => {
                                close();
                                handleDecision(user.id, 'disapprove', { send_mail: false });
                              }}
                              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              Delete only
                            </button>
                            <button
                              onClick={() => close()}
                              className="mt-1 text-center text-sm text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </Popup>

                    <button
                      onClick={() => sendMail(user)}
                      disabled={isLoading}
                      className="rounded-md border border-green-300 px-4 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send mail
                    </button>
                    <button
                      onClick={() => handleDecision(user.id, 'approve')}
                      disabled={isLoading}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isLoading ? 'Processing…' : 'Approve'}
                    </button>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
                  <Detail label="Date of Birth" value={formatDate(user.dob)} />
                  <Detail label="Gender" value={user.gender} />
                  <Detail label="Education" value={user.education_level} />
                  <Detail label="Institution" value={user.institution_name} />
                  <Detail label="Field of Study" value={user.field_of_study} />
                  <Detail label="Graduation Date" value={formatDate(user.graduation_date)} />
                </dl>

                {(user.linkedin_url || user.github_url || user.portfolio_url) && (
                  <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-sm">
                    {user.linkedin_url && (
                      <a href={user.linkedin_url} target="_blank" rel="noreferrer" className="text-amber-700 hover:underline">
                        LinkedIn
                      </a>
                    )}
                    {user.github_url && (
                      <a href={user.github_url} target="_blank" rel="noreferrer" className="text-amber-700 hover:underline">
                        GitHub
                      </a>
                    )}
                    {user.portfolio_url && (
                      <a href={user.portfolio_url} target="_blank" rel="noreferrer" className="text-amber-700 hover:underline">
                        Portfolio
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default Page;