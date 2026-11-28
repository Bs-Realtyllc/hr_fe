'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Tag, X, LayoutGrid, List as ListIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import type { EmployeeSummary } from '@/types';
import Button from '@/components/ui/Button/Button';
import PillTabs from '@/components/ui/PillTabs';
import KanbanView from './KanbanView';
import ListView from './ListView';
import IssueDetailPanel from './IssueDetailPanel';
import AddIssue from './AddIssue';
import {
  Issue, IssueLabel, Module, ProjectMember, GroupByField, ViewMode,
  GROUP_BY_OPTIONS, patchForBucket,
} from './types';

export default function IssueBoard({
  projectId, members, modules, isAdmin, employees, canWrite,
}: {
  projectId: number;
  members: ProjectMember[];
  modules: Module[];
  isAdmin: boolean;
  employees: EmployeeSummary[];
  canWrite: boolean;
}) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [labels, setLabels] = useState<IssueLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#6b7280' });

  const [groupBy, setGroupBy] = useState<GroupByField>('status');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [iss, lbl] = await Promise.all([
        api.get<Issue[]>(`/projects/${projectId}/issues`),
        api.get<IssueLabel[]>(`/projects/${projectId}/labels`),
      ]);
      setIssues(iss);
      setLabels(lbl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function addLabel(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.name.trim()) return;
    try {
      await api.post(`/projects/${projectId}/labels`, newLabel);
      setNewLabel({ name: '', color: '#6b7280' });
      const lbl = await api.get<IssueLabel[]>(`/projects/${projectId}/labels`);
      setLabels(lbl);
    } catch (err) {
      showToast('error', (err as Error).message);
    }
  }

  async function removeLabel(id: number) {
    try {
      await api.delete(`/projects/${projectId}/labels/${id}`);
      setLabels(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      showToast('error', (err as Error).message);
    }
  }

  // Shared by drag-and-drop and every inline chip select — a single field
  // (or, for drag, field + sort_order) saved immediately, no edit form.
  // Guarded here too, not just by disabling the controls that call it — the
  // same backend rule (issue.service.ts's assertCanWrite) rejects a viewer
  // either way, this just avoids a round-trip to find that out.
  async function quickUpdate(issueId: number, patch: Record<string, unknown>) {
    if (!canWrite) return;
    const prevIssues = issues;
    if ('assignee_id' in patch) {
      const emp = employees.find(e => String(e.id) === String(patch.assignee_id));
      (patch as any).assignee_name = emp?.name ?? null;
    }
    setIssues(prev => prev.map(i => (i.id === issueId ? { ...i, ...patch } as Issue : i)));
    try {
      await api.put(`/projects/${projectId}/issues/${issueId}`, patch);
    } catch (err) {
      setIssues(prevIssues);
      showToast('error', (err as Error).message);
    }
  }

  async function handleDragEnd(issueId: number, bucketKey: string, newIndex: number) {
    await quickUpdate(issueId, { ...patchForBucket(groupBy, bucketKey), sort_order: newIndex });
  }

  const selectedIssue = selectedIssueId ? issues.find(i => i.id === selectedIssueId) ?? null : null;

  if (loading) return <p className="text-muted text-sm">Loading issues…</p>;
  if (error) return <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
        <div className="flex items-center gap-3">
          <p className="text-muted text-sm">{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</p>
          <PillTabs
            options={GROUP_BY_OPTIONS.map(o => ({ value: o.value, label: `Group by ${o.label}` }))}
            value={groupBy}
            onChange={v => setGroupBy(v as GroupByField)}
          />
          <PillTabs
            options={[
              { value: 'board', label: 'Board', icon: <LayoutGrid size={14} /> },
              { value: 'list', label: 'List', icon: <ListIcon size={14} /> },
            ]}
            value={viewMode}
            onChange={v => setViewMode(v as ViewMode)}
          />
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" size="xs" onClick={() => setShowLabelModal(true)} leftIcon={<Tag size={14} />}>
              Labels
            </Button>
          )}
          {canWrite && (
            <Button variant="primary" size="xs" onClick={() => setShowAddModal(true)} leftIcon={<Plus size={14} />}>
              Add Issue
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'board' ? (
        <KanbanView
          issues={issues}
          groupBy={groupBy}
          members={members}
          employees={employees}
          canWrite={canWrite}
          onCardClick={setSelectedIssueId}
          onDragEnd={handleDragEnd}
          onQuickUpdate={quickUpdate}
        />
      ) : (
        <ListView
          issues={issues}
          groupBy={groupBy}
          members={members}
          employees={employees}
          canWrite={canWrite}
          onCardClick={setSelectedIssueId}
          onQuickUpdate={quickUpdate}
        />
      )}

      {selectedIssue && (
        <IssueDetailPanel
          key={selectedIssue.id}
          projectId={projectId}
          issue={selectedIssue}
          employees={employees}
          labels={labels}
          modules={modules}
          allIssues={issues}
          canWrite={canWrite}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={load}
          onQuickUpdate={quickUpdate}
        />
      )}

      {showAddModal && canWrite && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div onClick={e => e.stopPropagation()}>
            <AddIssue projectId={projectId} employees={employees} labels={labels} modules={modules} allIssues={issues} onClose={() => setShowAddModal(false)} onCreated={load} />
          </div>
        </div>
      )}

      {showLabelModal && (
        <div className="modal-overlay" onClick={() => setShowLabelModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Labels</h2>
              <button className="modal-close" onClick={() => setShowLabelModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {labels.length === 0 && <p className="text-muted text-sm">No labels yet</p>}
              {labels.map(l => (
                <div key={l.id} className="flex items-center justify-between">
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: `${l.color}22`, color: l.color }}>
                    {l.name}
                  </span>
                  <button onClick={() => removeLabel(l.id)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
            <form onSubmit={addLabel} className="flex gap-2 items-end">
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">New label</label>
                <input className="form-input" value={newLabel.name} onChange={e => setNewLabel({ ...newLabel, name: e.target.value })} placeholder="e.g. bug" />
              </div>
              <input
                type="color"
                value={newLabel.color}
                onChange={e => setNewLabel({ ...newLabel, color: e.target.value })}
                style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer' }}
              />
              <Button type="submit" variant="primary" size="small">Add</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
