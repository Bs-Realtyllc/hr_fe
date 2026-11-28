'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import type { EmployeeSummary } from '@/types';
import Button from '@/components/ui/Button/Button';
import LinksSection from './LinksSection';
import AttachmentsSection from './AttachmentsSection';
import {
  Issue, IssueActivityEntry, IssueLabel, IssueStatus, IssueType, Module,
  PRIORITY_LABEL, PRIORITY_OPTIONS, STATUS_LABEL, STATUS_OPTIONS, TYPE_LABEL, TYPE_OPTIONS, validParentCandidates,
} from './types';
import { PriorityIcon, StatusDot, TypeIcon, AssigneeAvatar } from './issue-icons';
import ChipDropdown from './ChipDropdown';

function describeActivity(a: IssueActivityEntry) {
  const actor = a.actor_name ?? 'Someone';
  if (a.verb === 'created') return `${actor} created this issue.`;
  if (a.verb === 'commented') return `${actor}: ${a.new_value}`;
  if (a.verb === 'linked') return `${actor} linked this issue (${a.field}) to #${a.new_value}.`;
  if (a.verb === 'attached') return `${actor} attached ${a.new_value}.`;
  if (a.verb === 'updated') {
    return `${actor} changed ${a.field} from "${a.old_value ?? 'none'}" to "${a.new_value ?? 'none'}".`;
  }
  return `${actor} updated this issue.`;
}

// Slide-over "peek" panel — one instance mounted by IssueBoard, driven by
// selectedIssueId, instead of every card owning its own modal. Opened once,
// its activity log is loaded lazily on open, same as before.
export default function IssueDetailPanel({
  projectId, issue, employees, labels, modules, allIssues, canWrite, onClose, onUpdated, onQuickUpdate,
}: {
  projectId: number;
  issue: Issue;
  employees: EmployeeSummary[];
  labels: IssueLabel[];
  modules: Module[];
  allIssues: Issue[];
  canWrite: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onQuickUpdate: (issueId: number, patch: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState(issue.status);
  const [priority, setPriority] = useState(issue.priority);
  const [type, setType] = useState(issue.type);
  const [parentIssueId, setParentIssueId] = useState(issue.parent_issue_id ? String(issue.parent_issue_id) : '');
  const [assigneeId, setAssigneeId] = useState(issue.assignee_id ? String(issue.assignee_id) : '');
  const [moduleId, setModuleId] = useState(issue.module_id ? String(issue.module_id) : '');
  const [dueDate, setDueDate] = useState(issue.due_date ?? '');
  const [startDate, setStartDate] = useState(issue.start_date ?? '');
  const [description, setDescription] = useState(issue.description ?? '');
  const [selectedLabels, setSelectedLabels] = useState<number[]>(issue.labels.map(l => l.id));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activity, setActivity] = useState<IssueActivityEntry[]>([]);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [activityLoading, setActivityLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const parent = issue.parent_issue_id ? allIssues.find(i => i.id === issue.parent_issue_id) : null;
  const children = allIssues.filter(i => i.parent_issue_id === issue.id);
  const parentCandidates = validParentCandidates(allIssues, type, issue.id);

  // Defensive fallback for an assignee who's no longer in the employees list
  // (e.g. a hard-deleted record) — without this the select can't find a
  // matching option for the stored assignee_id and silently falls back to
  // showing "Unassigned".
  const assigneeOptions = issue.assignee_id && issue.assignee_name
    && !employees.some(e => e.id === issue.assignee_id)
    ? [...employees, { id: issue.assignee_id, name: issue.assignee_name, designation: null }]
    : employees;

  function toggleLabel(id: number) {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  }

  async function loadActivity() {
    if (activityLoaded) return;
    try {
      const rows = await api.get<IssueActivityEntry[]>(`/projects/${projectId}/issues/${issue.id}/activity`);
      setActivity(rows);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoaded(true);
      setActivityLoading(false);
    }
  }

  // Load once, right when the panel opens for this issue.
  useEffect(() => { loadActivity(); }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await api.put(`/projects/${projectId}/issues/${issue.id}`, {
        type,
        parent_issue_id: parentIssueId ? Number(parentIssueId) : null,
        due_date: dueDate || null,
        start_date: startDate || null,
        description: description || null,
        label_ids: selectedLabels,
      });
      setActivityLoaded(false);
      onUpdated();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    setPostingComment(true);
    try {
      await api.post(`/projects/${projectId}/issues/${issue.id}/comments`, { body: comment.trim() });
      setComment('');
      setActivityLoaded(false);
      await loadActivity();
    } catch (err) {
      showToast('error', (err as Error).message);
    } finally {
      setPostingComment(false);
    }
  }

  const isDirty = type !== issue.type
    || parentIssueId !== (issue.parent_issue_id ? String(issue.parent_issue_id) : '')
    || dueDate !== (issue.due_date ?? '')
    || startDate !== (issue.start_date ?? '')
    || description !== (issue.description ?? '')
    || JSON.stringify([...selectedLabels].sort()) !== JSON.stringify([...issue.labels.map(l => l.id)].sort());

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <span className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>{issue.issue_key}</span>
            <h2>{issue.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="drawer-body">
          {parent && (
            <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
              Part of <strong>{parent.issue_key}</strong>: {parent.title}
            </p>
          )}
          {children.length > 0 && (
            <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
              {children.length} sub-issue{children.length > 1 ? 's' : ''}: {children.map(c => c.issue_key).join(', ')}
            </p>
          )}

          {saveError && <p className="text-sm" style={{ color: 'var(--color-error)', marginBottom: 10 }}>{saveError}</p>}

          {/* Properties row — one wrapping row of compact pills, matching
              Plane's issue properties bar instead of a stack of full-width
              labeled fields. Status/Priority/Assignee/Module still save
              instantly via onQuickUpdate; the rest still feed handleSave. */}
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 14 }}>
            <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
              <ChipDropdown
                value={status}
                options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABEL[s], icon: <StatusDot status={s} /> }))}
                onChange={v => {
                  const sv = v as IssueStatus;
                  setStatus(sv);
                  onQuickUpdate(issue.id, { status: sv });
                }}
                trigger={<><StatusDot status={status} />{STATUS_LABEL[status]}</>}
                disabled={!canWrite}
              />
            </span>
            <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
              <ChipDropdown
                value={priority}
                options={PRIORITY_OPTIONS.map(p => ({ value: p, label: PRIORITY_LABEL[p], icon: <PriorityIcon priority={p} /> }))}
                onChange={v => {
                  const pv = v as Issue['priority'];
                  setPriority(pv);
                  onQuickUpdate(issue.id, { priority: pv });
                }}
                trigger={<><PriorityIcon priority={priority} color="currentColor" />{PRIORITY_LABEL[priority]}</>}
                disabled={!canWrite}
              />
            </span>
            <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
              <ChipDropdown
                value={type}
                options={TYPE_OPTIONS.map(t => ({ value: t, label: TYPE_LABEL[t], icon: <TypeIcon type={t} /> }))}
                onChange={v => { setType(v as IssueType); setParentIssueId(''); }}
                trigger={<><TypeIcon type={type} />{TYPE_LABEL[type]}</>}
                disabled={!canWrite}
              />
            </span>
            <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
              <span className="text-muted" style={{ fontSize: 11 }}>Parent</span>
              <ChipDropdown
                value={parentIssueId}
                disabled={!canWrite || parentCandidates.length === 0}
                options={[
                  {
                    value: '', label: type === 'epic'
                      ? 'Epics have no parent'
                      : parentCandidates.length > 0
                        ? 'None'
                        : type === 'subtask'
                          ? 'No story/task/bug exists yet to attach this to'
                          : 'No epics exist yet, create one first',
                  },
                  ...parentCandidates.map(p => ({ value: String(p.id), label: `${p.issue_key}: ${p.title}` })),
                ]}
                onChange={setParentIssueId}
                menuWidth={220}
                trigger={parentIssueId ? parentCandidates.find(p => String(p.id) === parentIssueId)?.issue_key ?? 'None' : 'None'}
              />
            </span>
            <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
              <AssigneeAvatar
                assigneeId={assigneeId ? Number(assigneeId) : null}
                assigneeName={issue.assignee_name}
                employees={assigneeOptions}
                onChange={id => {
                  setAssigneeId(id ? String(id) : '');
                  onQuickUpdate(issue.id, { assignee_id: id });
                }}
                disabled={!canWrite}
              />
              <span className="text-muted" style={{ fontSize: 11 }}>
                {assigneeOptions.find(e => String(e.id) === assigneeId)?.name ?? 'Unassigned'}
              </span>
            </span>
            <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
              <span className="text-muted" style={{ fontSize: 11 }}>Module</span>
              <ChipDropdown
                value={moduleId}
                options={[
                  { value: '', label: modules.length === 0 ? 'No modules defined yet' : 'None' },
                  ...modules.map(m => ({ value: String(m.id), label: m.name })),
                ]}
                onChange={v => {
                  setModuleId(v);
                  onQuickUpdate(issue.id, { module_id: v ? Number(v) : null });
                }}
                menuWidth={180}
                trigger={moduleId ? modules.find(m => String(m.id) === moduleId)?.name ?? 'None' : 'None'}
                disabled={!canWrite}
              />
            </span>
            <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
              <span className="text-muted" style={{ fontSize: 11 }}>Start</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={!canWrite}
                style={{ border: 'none', background: 'none', font: 'inherit', width: 100 }}
              />
            </span>
            <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
              <span className="text-muted" style={{ fontSize: 11 }}>Due</span>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={!canWrite}
                style={{ border: 'none', background: 'none', font: 'inherit', width: 100 }}
              />
            </span>
          </div>

          {labels.length > 0 && (
            <div className="form-group">
              <label className="form-label">Labels</label>
              <div className="flex items-center gap-2 flex-wrap">
                {labels.map(l => {
                  const active = selectedLabels.includes(l.id);
                  return (
                    <span
                      key={l.id}
                      onClick={() => canWrite && toggleLabel(l.id)}
                      style={{
                        cursor: canWrite ? 'pointer' : 'default', fontSize: 11, padding: '3px 10px', borderRadius: 12,
                        background: active ? l.color : 'var(--color-bg)',
                        color: active ? '#fff' : 'var(--color-text-muted)',
                        border: `1px solid ${active ? l.color : 'var(--color-border)'}`,
                        opacity: canWrite ? 1 : 0.6,
                      }}
                    >
                      {l.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} disabled={!canWrite} />
          </div>

          <div className="flex gap-3 justify-between" style={{ marginBottom: 20 }}>
            <Button variant="text" size="small" onClick={onClose}>Close</Button>
            <Button variant="primary" size="small" onClick={handleSave} disabled={!canWrite || !isDirty || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>

          <LinksSection projectId={projectId} issueId={issue.id} allIssues={allIssues} />
          <AttachmentsSection projectId={projectId} issueId={issue.id} />

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 14 }}>
            <div className="card-title" style={{ marginBottom: 10, fontSize: 13 }}>Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 180, overflowY: 'auto' }}>
              {activityLoading && <p className="text-muted text-sm">Loading…</p>}
              {!activityLoading && activity.length === 0 && <p className="text-muted text-sm">No activity yet.</p>}
              {activity.map(a => (
                <p key={a.id} className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{describeActivity(a)}</p>
              ))}
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <input
                  className="form-input"
                  placeholder="Add a comment…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleComment(); }}
                />
                <Button variant="secondary" size="small" onClick={handleComment} disabled={postingComment || !comment.trim()}>
                  Post
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
