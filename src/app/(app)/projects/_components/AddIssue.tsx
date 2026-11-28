'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import type { EmployeeSummary } from '@/types';
import Button from '@/components/ui/Button/Button';
import {
  Issue, IssueLabel, IssueStatus, IssueType, Module,
  PRIORITY_LABEL, PRIORITY_OPTIONS, STATUS_LABEL, STATUS_OPTIONS, TYPE_LABEL, TYPE_OPTIONS, validParentCandidates,
} from './types';
import { PriorityIcon, StatusDot, TypeIcon, AssigneeAvatar } from './issue-icons';
import ChipDropdown from './ChipDropdown';

export default function AddIssue({
  projectId, employees, labels, modules, allIssues, onClose, onCreated,
}: {
  projectId: number;
  employees: EmployeeSummary[];
  labels: IssueLabel[];
  modules: Module[];
  allIssues: Issue[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IssueStatus>('backlog');
  const [priority, setPriority] = useState('none');
  const [type, setType] = useState<IssueType>('task');
  const [parentIssueId, setParentIssueId] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [moduleId, setModuleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentCandidates = validParentCandidates(allIssues, type);

  function toggleLabel(id: number) {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/projects/${projectId}/issues`, {
        title: title.trim(),
        description: description || null,
        status,
        priority,
        type,
        parent_issue_id: parentIssueId ? Number(parentIssueId) : null,
        assignee_id: assigneeId,
        module_id: moduleId ? Number(moduleId) : null,
        start_date: startDate || null,
        due_date: dueDate || null,
        label_ids: selectedLabels,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal" style={{ maxWidth: 480 }}>
      <div className="modal-header">
        <h2>New Issue</h2>
        <button className="modal-close" onClick={onClose}><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit}>
        {error && <p className="text-sm" style={{ color: 'var(--color-error)', marginBottom: 10 }}>{error}</p>}
        <div className="form-group">
          <input
            className="form-input"
            style={{ fontSize: 15, fontWeight: 500 }}
            placeholder="Issue title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Properties row — every field in one wrapping row of compact pills,
            matching Plane's issue-modal properties bar instead of a stack of
            full-width labeled fields. */}
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 14 }}>
          <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
            <ChipDropdown
              value={status}
              options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABEL[s], icon: <StatusDot status={s} /> }))}
              onChange={v => setStatus(v as IssueStatus)}
              trigger={<><StatusDot status={status} />{STATUS_LABEL[status]}</>}
            />
          </span>
          <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
            <ChipDropdown
              value={priority}
              options={PRIORITY_OPTIONS.map(p => ({ value: p, label: PRIORITY_LABEL[p], icon: <PriorityIcon priority={p} /> }))}
              onChange={setPriority}
              trigger={<><PriorityIcon priority={priority as Issue['priority']} color="currentColor" />{PRIORITY_LABEL[priority as Issue['priority']]}</>}
            />
          </span>
          <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
            <ChipDropdown
              value={type}
              options={TYPE_OPTIONS.map(t => ({ value: t, label: TYPE_LABEL[t], icon: <TypeIcon type={t} /> }))}
              onChange={v => { setType(v as IssueType); setParentIssueId(''); }}
              trigger={<><TypeIcon type={type} />{TYPE_LABEL[type]}</>}
            />
          </span>
          <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
            <span className="text-muted" style={{ fontSize: 11 }}>Parent</span>
            <ChipDropdown
              value={parentIssueId}
              disabled={parentCandidates.length === 0}
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
            <AssigneeAvatar assigneeId={assigneeId} assigneeName={null} employees={employees} onChange={setAssigneeId} />
            <span className="text-muted" style={{ fontSize: 11 }}>
              {assigneeId ? employees.find(e => e.id === assigneeId)?.name : 'Unassigned'}
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
              onChange={setModuleId}
              menuWidth={180}
              trigger={moduleId ? modules.find(m => String(m.id) === moduleId)?.name ?? 'None' : 'None'}
            />
          </span>
          <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
            <span className="text-muted" style={{ fontSize: 11 }}>Start</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ border: 'none', background: 'none', font: 'inherit', width: 100 }}
            />
          </span>
          <span className="pill" style={{ gap: 6, padding: '4px 10px' }}>
            <span className="text-muted" style={{ fontSize: 11 }}>Due</span>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
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
                    onClick={() => toggleLabel(l.id)}
                    style={{
                      cursor: 'pointer', fontSize: 11, padding: '3px 10px', borderRadius: 12,
                      background: active ? l.color : 'var(--color-bg)',
                      color: active ? '#fff' : 'var(--color-text-muted)',
                      border: `1px solid ${active ? l.color : 'var(--color-border)'}`,
                    }}
                  >
                    {l.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-between mt-4">
          <Button variant="text" size="small" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" size="small" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Issue'}
          </Button>
        </div>
      </form>
    </div>
  );
}
