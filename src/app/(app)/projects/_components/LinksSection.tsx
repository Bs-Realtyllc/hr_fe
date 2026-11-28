'use client';

import { useEffect, useState } from 'react';
import { Link2, X, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import Button from '@/components/ui/Button/Button';
import { Issue, IssueLink, IssueLinkType, LINK_TYPE_OPTIONS } from './types';

export default function LinksSection({
  projectId, issueId, allIssues,
}: {
  projectId: number;
  issueId: number;
  allIssues: Issue[];
}) {
  const [links, setLinks] = useState<IssueLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [linkType, setLinkType] = useState<IssueLinkType>('blocks');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const rows = await api.get<IssueLink[]>(`/projects/${projectId}/issues/${issueId}/links`);
      setLinks(rows);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [issueId]);

  async function handleAdd() {
    if (!targetId) return;
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/issues/${issueId}/links`, {
        linked_issue_id: Number(targetId),
        link_type: linkType,
      });
      setTargetId('');
      setShowAdd(false);
      await load();
    } catch (err) {
      showToast('error', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(linkId: number) {
    try {
      await api.delete(`/projects/${projectId}/issues/${issueId}/links/${linkId}`);
      await load();
    } catch (err) {
      showToast('error', (err as Error).message);
    }
  }

  const candidates = allIssues.filter((i) => i.id !== issueId);

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 14 }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
        <div className="card-title" style={{ marginBottom: 0, fontSize: 13 }}>Links</div>
        <Button variant="text" size="small" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={14} /> Add link
        </Button>
      </div>

      {showAdd && (
        <div className="flex gap-2" style={{ marginBottom: 10 }}>
          <select className="form-select" value={linkType} onChange={(e) => setLinkType(e.target.value as IssueLinkType)}>
            {LINK_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="form-select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">Select issue…</option>
            {candidates.map((i) => <option key={i.id} value={i.id}>{i.issue_key}: {i.title}</option>)}
          </select>
          <Button variant="secondary" size="small" onClick={handleAdd} disabled={!targetId || submitting}>Link</Button>
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-muted text-sm">No links yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between" style={{ fontSize: 13 }}>
              <span className="flex items-center gap-2">
                <Link2 size={13} className="text-muted" />
                <span className="text-muted">{l.label}</span>
                <strong>{l.other_issue_title}</strong>
                <span className="badge badge-neutral">{l.other_issue_status.replace('_', ' ')}</span>
              </span>
              <button
                onClick={() => handleRemove(l.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
