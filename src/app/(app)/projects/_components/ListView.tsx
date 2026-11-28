'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import type { EmployeeSummary } from '@/types';
import {
  Issue, GroupByField, bucketsFor, groupKeyFor,
  PRIORITY_LABEL, PRIORITY_OPTIONS, STATUS_LABEL, STATUS_OPTIONS, ProjectMember,
} from './types';
import { PriorityIcon, StatusDot, PRIORITY_COLOR, AssigneeAvatar } from './issue-icons';
import ChipDropdown from './ChipDropdown';

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'No date';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Same grouped data as KanbanView, rendered as flat row sections instead
// of columns — no separate fetch, no separate grouping logic.
export default function ListView({
  issues, groupBy, members, employees, canWrite, onCardClick, onQuickUpdate,
}: {
  issues: Issue[];
  groupBy: GroupByField;
  members: ProjectMember[];
  employees: EmployeeSummary[];
  canWrite: boolean;
  onCardClick: (issueId: number) => void;
  onQuickUpdate: (issueId: number, patch: Record<string, unknown>) => void;
}) {
  const buckets = bucketsFor(groupBy, members, issues);

  function stop(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {buckets.map((bucket) => {
        const rows = issues.filter((i) => groupKeyFor(i, groupBy) === bucket.key);
        if (rows.length === 0) return null;
        return (
          <div key={bucket.key}>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <span className="text-sm font-semibold">{bucket.label}</span>
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>{rows.length}</span>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {rows.map((issue, idx) => (
                <div
                  key={issue.id}
                  onClick={() => onCardClick(issue.id)}
                  className="flex items-center justify-between"
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderBottom: idx < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                    <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{issue.issue_key}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {issue.title}
                    </span>
                    {issue.labels.map((l) => (
                      <span key={l.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: `${l.color}22`, color: l.color, flexShrink: 0 }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                    <span onClick={stop} style={{ fontSize: 11 }} className="text-muted">
                      <ChipDropdown
                        value={issue.status}
                        options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABEL[s], icon: <StatusDot status={s} /> }))}
                        onChange={v => onQuickUpdate(issue.id, { status: v })}
                        trigger={<><StatusDot status={issue.status} />{STATUS_LABEL[issue.status]}</>}
                        disabled={!canWrite}
                      />
                    </span>
                    <span onClick={stop} style={{ fontSize: 11, color: PRIORITY_COLOR[issue.priority] }}>
                      <ChipDropdown
                        value={issue.priority}
                        options={PRIORITY_OPTIONS.map(p => ({ value: p, label: PRIORITY_LABEL[p], icon: <PriorityIcon priority={p} /> }))}
                        onChange={v => onQuickUpdate(issue.id, { priority: v })}
                        trigger={<><PriorityIcon priority={issue.priority} color="currentColor" />{PRIORITY_LABEL[issue.priority]}</>}
                        disabled={!canWrite}
                      />
                    </span>
                    <span onClick={stop}>
                      <AssigneeAvatar
                        assigneeId={issue.assignee_id}
                        assigneeName={issue.assignee_name}
                        employees={employees}
                        onChange={id => onQuickUpdate(issue.id, { assignee_id: id })}
                        disabled={!canWrite}
                      />
                    </span>
                    {issue.story_points != null && <span className="badge badge-accent">{issue.story_points} pt</span>}
                    {issue.due_date && (
                      <span className="flex items-center gap-1 text-muted" style={{ fontSize: 11 }}>
                        <Calendar size={11} />
                        {formatDate(issue.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {issues.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>No issues</p>}
    </div>
  );
}
