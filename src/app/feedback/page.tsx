'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PillTabs from '@/components/PillTabs';

interface FeedbackNote {
  id: number;
  from_employee_id: number;
  from_name: string;
  from_designation: string;
  to_employee_id: number;
  to_name: string;
  to_designation: string;
  feedback_type: 'praise' | 'constructive' | 'peer' | 'manager';
  visibility: 'public' | 'private';
  message: string;
  project_id: number | null;
  project_name: string | null;
  created_at: string;
}

interface Employee { id: number; name: string; designation: string; }

interface FeedbackSummaryRow {
  employee_id: number;
  employee_name: string;
  total_received: number;
  praise_count: number;
  constructive_count: number;
}

const TYPE_BADGE: Record<string, string> = {
  praise: 'badge-success',
  constructive: 'badge-warning',
  peer: 'badge-info',
  manager: 'badge-accent',
};

const TYPE_ICON: Record<string, string> = {
  praise: '🌟',
  constructive: '🧭',
  peer: '🤝',
  manager: '📋',
};

const TYPE_LABEL: Record<string, string> = {
  praise: 'Praise',
  constructive: 'Constructive',
  peer: 'Peer',
  manager: 'Manager',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const isPrivileged = user?.role === 'admin' || user?.role === 'lead';

  const [scope, setScope]         = useState<'public' | 'received' | 'sent'>('public');
  const [notes, setNotes]         = useState<FeedbackNote[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary]     = useState<FeedbackSummaryRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    to_employee_id: '', feedback_type: 'praise', visibility: 'public', message: '',
  });

  useEffect(() => {
    api.get<Employee[]>('/employees').then(setEmployees).catch(() => {});
    if (isPrivileged) api.get<FeedbackSummaryRow[]>('/feedback/summary').then(setSummary).catch(() => {});
  }, [isPrivileged]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('scope', scope);
    if (typeFilter) params.set('type', typeFilter);
    api.get<FeedbackNote[]>(`/feedback?${params.toString()}`).then(setNotes).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [scope, typeFilter]);

  function openCreate() {
    setForm({ to_employee_id: '', feedback_type: 'praise', visibility: 'public', message: '' });
    setShowCreate(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/feedback', { ...form, to_employee_id: parseInt(form.to_employee_id) });
      setShowCreate(false);
      load();
      if (isPrivileged) api.get<FeedbackSummaryRow[]>('/feedback/summary').then(setSummary).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send feedback');
    }
  }

  async function removeNote(id: number) {
    if (!confirm('Delete this feedback note?')) return;
    await api.delete(`/feedback/${id}`);
    load();
  }

  const canDelete = (n: FeedbackNote) => isPrivileged || n.from_employee_id === user?.id;
  const topPraised = [...summary].sort((a, b) => b.total_received - a.total_received).slice(0, 5);
  const maxReceived = Math.max(...topPraised.map(s => s.total_received), 1);

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Feedback</h1>
            <p>Peer recognition, manager notes, and constructive feedback across the team</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <span
              className="icon-mask"
              style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
            />
            Give Feedback
          </button>
        </div>
      </div>

      {isPrivileged && topPraised.length > 0 && (
        <div className="card mb-4" style={{ padding: 20 }}>
          <div className="font-semibold mb-1" style={{ fontSize: 15 }}>Recognition Leaderboard</div>
          <div className="text-muted text-sm" style={{ marginBottom: 16 }}>Most feedback received, all time</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topPraised.map(s => (
              <div key={s.employee_id} className="flex items-center gap-3">
                <div className="avatar avatar-sm">{initials(s.employee_name)}</div>
                <div style={{ width: 140, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{s.employee_name}</div>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div className="progress-fill" style={{ width: `${(s.total_received / maxReceived) * 100}%`, background: 'var(--color-accent)' }} />
                </div>
                <div style={{ width: 36, textAlign: 'right', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s.total_received}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <PillTabs
          value={scope}
          onChange={v => setScope(v as typeof scope)}
          options={[
            { value: 'public',   label: 'Recognition Feed' },
            { value: 'received', label: 'Received' },
            { value: 'sent',     label: 'Sent' },
          ]}
        />

        <div className="select-compact-wrap">
          <select className="select-compact" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="praise">Praise</option>
            <option value="constructive">Constructive</option>
            <option value="peer">Peer</option>
            <option value="manager">Manager</option>
          </select>
          <span
            className="icon-mask"
            style={{ WebkitMaskImage: 'url(/icons/chevron-down.svg)', maskImage: 'url(/icons/chevron-down.svg)' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
      ) : notes.length === 0 ? (
        <div className="empty-state card">
          <span
            className="icon-mask empty-state-icon"
            style={{ WebkitMaskImage: 'url(/icons/message-circle.svg)', maskImage: 'url(/icons/message-circle.svg)' }}
          />
          <p>
            {scope === 'public' && 'No public recognition posted yet. Be the first to give someone a shout-out!'}
            {scope === 'received' && 'No feedback received yet.'}
            {scope === 'sent' && "You haven't given any feedback yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map(n => (
            <div key={n.id} className="card" style={{ padding: 18 }}>
              <div className="flex justify-between items-start" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">{initials(n.from_name)}</div>
                  <div>
                    <div style={{ fontSize: 13.5 }}>
                      <span className="font-semibold">{n.from_name}</span>
                      <span className="text-muted"> → </span>
                      <span className="font-semibold">{n.to_name}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {n.from_designation} → {n.to_designation}{n.project_name && ` · ${n.project_name}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${TYPE_BADGE[n.feedback_type]}`}>{TYPE_ICON[n.feedback_type]} {TYPE_LABEL[n.feedback_type]}</span>
                  {n.visibility === 'private' && <span className="badge badge-neutral">🔒 Private</span>}
                </div>
              </div>

              <p className="text-sm" style={{ marginBottom: 10, lineHeight: 1.6 }}>{n.message}</p>

              <div className="flex justify-between items-center">
                <span className="text-muted text-sm">{fmtDate(n.created_at)}</span>
                {canDelete(n) && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={() => removeNote(n.id)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Give feedback modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Give Feedback</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={submitCreate}>
              <div className="form-group">
                <label className="form-label">To *</label>
                <select className="form-select" value={form.to_employee_id}
                  onChange={e => setForm({ ...form, to_employee_id: e.target.value })} required>
                  <option value="">Select a colleague…</option>
                  {employees.filter(e => e.id !== user?.id).map(e => (
                    <option key={e.id} value={e.id}>{e.name} — {e.designation}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.feedback_type}
                  onChange={e => setForm({ ...form, feedback_type: e.target.value })}>
                  <option value="praise">Praise</option>
                  <option value="constructive">Constructive</option>
                  <option value="peer">Peer</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Visibility</label>
                <select className="form-select" value={form.visibility}
                  onChange={e => setForm({ ...form, visibility: e.target.value })}>
                  <option value="public">Public — visible on the recognition feed</option>
                  <option value="private">Private — only visible to both of you</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" rows={4} value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Be specific — what did they do, and what was the impact?" required />
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <span
                    className="icon-mask"
                    style={{ WebkitMaskImage: 'url(/icons/send.svg)', maskImage: 'url(/icons/send.svg)' }}
                  />
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
