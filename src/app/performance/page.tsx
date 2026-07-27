'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Review {
  id: number;
  employee_id: number;
  employee_name: string;
  designation: string;
  department: string;
  reviewer_id: number | null;
  reviewer_name: string | null;
  review_period: string;
  overall_rating: number | string | null;
  category_ratings: string | Record<string, number> | null;
  strengths: string | null;
  improvements: string | null;
  manager_comments: string | null;
  employee_comments: string | null;
  status: 'draft' | 'submitted' | 'acknowledged';
  submitted_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

interface Employee { id: number; name: string; designation: string; }
interface TrendPoint { review_period: string; overall_rating: number | string; }

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical Skills',
  communication: 'Communication',
  teamwork: 'Teamwork',
  ownership: 'Ownership',
  problem_solving: 'Problem Solving',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-neutral',
  submitted: 'badge-warning',
  acknowledged: 'badge-success',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function num(v: number | string | null): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'string' ? parseFloat(v) : v;
}

function parseCategoryRatings(v: string | Record<string, number> | null): Record<string, number> {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try {
    const parsed = JSON.parse(v);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch { return {}; }
}

function stars(rating: number) {
  const rounded = Math.round(rating);
  return '★'.repeat(rounded) + '☆'.repeat(Math.max(5 - rounded, 0));
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const EMPTY_CATEGORY_FORM = { technical: '3', communication: '3', teamwork: '3', ownership: '3', problem_solving: '3' };

export default function PerformancePage() {
  const { user } = useAuth();
  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const [reviews, setReviews]       = useState<Review[]>([]);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const [trend, setTrend]           = useState<TrendPoint[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    employee_id: '', review_period: '', overall_rating: '4',
    category_ratings: { ...EMPTY_CATEGORY_FORM },
    strengths: '', improvements: '', manager_comments: '',
  });

  const [ackReview, setAckReview] = useState<Review | null>(null);
  const [ackComments, setAckComments] = useState('');

  useEffect(() => {
    if (isPrivileged) api.get<Employee[]>('/employees').then(setEmployees).catch(() => {});
  }, [isPrivileged]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (isPrivileged && employeeFilter) params.set('employee_id', employeeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const q = params.toString() ? `?${params.toString()}` : '';
    api.get<Review[]>(`/performance${q}`).then(setReviews).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [employeeFilter, statusFilter]);

  const trendEmployeeId = isPrivileged ? employeeFilter : user?.id;
  useEffect(() => {
    if (!trendEmployeeId) { setTrend([]); return; }
    api.get<TrendPoint[]>(`/performance/trend/${trendEmployeeId}`).then(setTrend).catch(() => setTrend([]));
  }, [trendEmployeeId]);

  const avgRating = useMemo(() => {
    const rated = reviews.filter(r => r.overall_rating !== null);
    if (!rated.length) return 0;
    return Number((rated.reduce((s, r) => s + num(r.overall_rating), 0) / rated.length).toFixed(1));
  }, [reviews]);

  function openCreate() {
    setCreateForm({
      employee_id: '', review_period: '', overall_rating: '4',
      category_ratings: { ...EMPTY_CATEGORY_FORM },
      strengths: '', improvements: '', manager_comments: '',
    });
    setShowCreate(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/performance', {
        employee_id: parseInt(createForm.employee_id),
        review_period: createForm.review_period,
        overall_rating: parseFloat(createForm.overall_rating) || null,
        category_ratings: Object.fromEntries(
          Object.entries(createForm.category_ratings).map(([k, v]) => [k, parseInt(v as string) || 0])
        ),
        strengths: createForm.strengths,
        improvements: createForm.improvements,
        manager_comments: createForm.manager_comments,
      });
      setShowCreate(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create review');
    }
  }

  async function submitReview(id: number) {
    if (!confirm('Submit this review to the employee? It will no longer be editable.')) return;
    await api.put(`/performance/${id}/submit`, {});
    load();
  }

  async function deleteReview(id: number) {
    if (!confirm('Delete this draft review?')) return;
    await api.delete(`/performance/${id}`);
    load();
  }

  function openAck(r: Review) {
    setAckReview(r);
    setAckComments('');
  }

  async function submitAck() {
    if (!ackReview) return;
    await api.put(`/performance/${ackReview.id}/acknowledge`, { employee_comments: ackComments });
    setAckReview(null);
    load();
  }

  if (loading) return <div className="page-header"><h1>Performance</h1><p>Loading…</p></div>;

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Performance Reviews</h1>
            <p>{isPrivileged ? 'Run review cycles and track ratings across the team' : 'Your performance review history and ratings'}</p>
          </div>
          {isPrivileged && <button className="btn btn-primary" onClick={openCreate}>+ New Review</button>}
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-primary)' }} />
          <div className="stat-card-label">Total Reviews</div>
          <div className="stat-card-value">{reviews.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-warning)' }} />
          <div className="stat-card-label">Awaiting Acknowledgement</div>
          <div className="stat-card-value">{reviews.filter(r => r.status === 'submitted').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-dot" style={{ background: 'var(--color-success)' }} />
          <div className="stat-card-label">Avg. Overall Rating</div>
          <div className="stat-card-value">{avgRating || '—'} <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>/ 5</span></div>
        </div>
      </div>

      <div className="card mb-4" style={{ padding: '14px 20px' }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          {isPrivileged && (
            <div className="flex items-center gap-2">
              <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Employee</label>
              <select className="form-select" style={{ width: 200 }} value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
                <option value="">All employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Status</label>
            <select className="form-select" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
          </div>
          {(employeeFilter || statusFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setEmployeeFilter(''); setStatusFilter(''); }}>Clear filters</button>
          )}
        </div>
      </div>

      {trendEmployeeId && trend.length > 0 && (
        <div className="card mb-4" style={{ padding: 20 }}>
          <div className="font-semibold mb-1" style={{ fontSize: 15 }}>Rating Trend</div>
          <div className="text-muted text-sm" style={{ marginBottom: 16 }}>Overall rating across submitted review periods</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend.map(t => ({ ...t, overall_rating: num(t.overall_rating) }))} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="review_period" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => [value, 'Rating']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
              />
              <Line type="monotone" dataKey="overall_rating" stroke="var(--color-primary)" strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: 40 }}>📊</div>
          <p>{isPrivileged ? 'No reviews created yet.' : 'No performance reviews yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map(r => {
            const categories = parseCategoryRatings(r.category_ratings);
            return (
              <div key={r.id} className="card" style={{ padding: 20 }}>
                <div className="flex justify-between items-start mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <div className="flex items-center gap-3">
                    <div className="avatar">{initials(r.employee_name)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ fontSize: 15 }}>{isPrivileged ? r.employee_name : `Review Period ${r.review_period}`}</span>
                        <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                      </div>
                      <div className="text-muted text-sm">
                        {isPrivileged ? `${r.designation} · Period ${r.review_period}` : r.designation}
                        {r.reviewer_name && ` · Reviewed by ${r.reviewer_name}`}
                      </div>
                    </div>
                  </div>
                  {r.overall_rating !== null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, color: 'var(--color-warning)', lineHeight: 1 }}>{stars(num(r.overall_rating))}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{num(r.overall_rating).toFixed(1)} / 5</div>
                    </div>
                  )}
                </div>

                {Object.keys(categories).length > 0 && (
                  <div className="grid-2" style={{ gap: 10, marginBottom: 16 }}>
                    {Object.entries(categories).map(([key, val]) => (
                      <div key={key}>
                        <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 3 }}>
                          <span className="text-muted">{CATEGORY_LABELS[key] || key}</span>
                          <span style={{ fontWeight: 600 }}>{val} / 5</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${(Number(val) / 5) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gap: 12 }}>
                  {r.strengths && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-success)', marginBottom: 4 }}>Strengths</div>
                      <div className="text-sm">{r.strengths}</div>
                    </div>
                  )}
                  {r.improvements && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-warning)', marginBottom: 4 }}>Areas to Improve</div>
                      <div className="text-sm">{r.improvements}</div>
                    </div>
                  )}
                  {r.manager_comments && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: 4 }}>Manager Comments</div>
                      <div className="text-sm">{r.manager_comments}</div>
                    </div>
                  )}
                  {r.employee_comments && (
                    <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-accent)', marginBottom: 4 }}>Employee Response</div>
                      <div className="text-sm">{r.employee_comments}</div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <span className="text-muted text-sm">
                    {r.status === 'draft' && 'Not yet submitted'}
                    {r.status === 'submitted' && r.submitted_at && `Submitted ${fmtDateTime(r.submitted_at)}`}
                    {r.status === 'acknowledged' && r.acknowledged_at && `Acknowledged ${fmtDateTime(r.acknowledged_at)}`}
                  </span>
                  <div className="flex gap-2">
                    {isPrivileged && r.status === 'draft' && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => submitReview(r.id)}>Submit to Employee</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={() => deleteReview(r.id)}>Delete</button>
                      </>
                    )}
                    {!isPrivileged && r.status === 'submitted' && r.employee_id === user?.id && (
                      <button className="btn btn-primary btn-sm" onClick={() => openAck(r)}>Acknowledge</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Performance Review</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={submitCreate}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Employee *</label>
                  <select className="form-select" value={createForm.employee_id}
                    onChange={e => setCreateForm({ ...createForm, employee_id: e.target.value })} required>
                    <option value="">Select employee…</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Review Period *</label>
                  <input className="form-input" value={createForm.review_period}
                    onChange={e => setCreateForm({ ...createForm, review_period: e.target.value })}
                    placeholder="e.g. 2026-H1" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Overall Rating (1–5)</label>
                <input className="form-input" type="number" min={1} max={5} step={0.5}
                  value={createForm.overall_rating}
                  onChange={e => setCreateForm({ ...createForm, overall_rating: e.target.value })} />
              </div>

              <div className="form-label" style={{ marginBottom: 8 }}>Category Ratings (1–5)</div>
              <div className="grid-2" style={{ marginBottom: 4 }}>
                {Object.entries(createForm.category_ratings).map(([key, val]) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{CATEGORY_LABELS[key] || key}</label>
                    <input className="form-input" type="number" min={1} max={5} value={val as string}
                      onChange={e => setCreateForm({
                        ...createForm,
                        category_ratings: { ...createForm.category_ratings, [key]: e.target.value },
                      })} />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Strengths</label>
                <textarea className="form-textarea" rows={2} value={createForm.strengths}
                  onChange={e => setCreateForm({ ...createForm, strengths: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Areas to Improve</label>
                <textarea className="form-textarea" rows={2} value={createForm.improvements}
                  onChange={e => setCreateForm({ ...createForm, improvements: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Manager Comments</label>
                <textarea className="form-textarea" rows={2} value={createForm.manager_comments}
                  onChange={e => setCreateForm({ ...createForm, manager_comments: e.target.value })} />
              </div>

              <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
                Saved as a draft — nothing is visible to the employee until you submit it.
              </p>
              <div className="flex gap-3 justify-between">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acknowledge modal */}
      {ackReview && (
        <div className="modal-overlay" onClick={() => setAckReview(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Acknowledge Review</h3>
              <button className="modal-close" onClick={() => setAckReview(null)}>×</button>
            </div>
            <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
              Confirm you've read this review for period {ackReview.review_period}. You may optionally add your own comments.
            </p>
            <div className="form-group">
              <label className="form-label">Your Comments (optional)</label>
              <textarea className="form-textarea" rows={3} value={ackComments} onChange={e => setAckComments(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-between mt-4">
              <button className="btn btn-ghost" onClick={() => setAckReview(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitAck}>Acknowledge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
