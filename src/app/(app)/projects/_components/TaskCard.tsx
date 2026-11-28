'use client';

import React from 'react';
import { Calendar, ListTree, Paperclip, Link2 } from 'lucide-react';
import type { EmployeeSummary } from '@/types';
import { Issue, PRIORITY_LABEL, PRIORITY_OPTIONS, STATUS_LABEL, STATUS_OPTIONS } from './types';
import { PriorityIcon, StatusDot, PRIORITY_COLOR, AssigneeAvatar } from './issue-icons';
import ChipDropdown from './ChipDropdown';

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'No date';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Card face only — clicking it opens the single shared IssueDetailPanel
// (owned by IssueBoard). The chip selects below stop propagation so picking
// a value doesn't also open that panel.
export default function TaskCard({
  issue, employees, canWrite, onClick, onQuickUpdate,
}: {
  issue: Issue;
  employees: EmployeeSummary[];
  canWrite: boolean;
  onClick: () => void;
  onQuickUpdate: (issueId: number, patch: Record<string, unknown>) => void;
}) {
  function stop(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <div className="card" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={onClick}>
      <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>{issue.issue_key}</span>
      <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, margin: '4px 0 8px' }}>{issue.title}</p>

      {/* Quick-edit row: the three fields people change constantly, kept in
          their own row so they stay grouped together even if they wrap,
          rather than interleaving with the read-only meta row below. */}
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <span onClick={stop} style={{ flexShrink: 0, fontSize: 11 }} className="text-muted">
          <ChipDropdown
            value={issue.status}
            options={STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABEL[s], icon: <StatusDot status={s} /> }))}
            onChange={v => onQuickUpdate(issue.id, { status: v })}
            trigger={<><StatusDot status={issue.status} />{STATUS_LABEL[issue.status]}</>}
            disabled={!canWrite}
          />
        </span>
        <span onClick={stop} style={{ flexShrink: 0, fontSize: 11, color: PRIORITY_COLOR[issue.priority] }}>
          <ChipDropdown
            value={issue.priority}
            options={PRIORITY_OPTIONS.map(p => ({ value: p, label: PRIORITY_LABEL[p], icon: <PriorityIcon priority={p} /> }))}
            onChange={v => onQuickUpdate(issue.id, { priority: v })}
            trigger={<><PriorityIcon priority={issue.priority} color="currentColor" />{PRIORITY_LABEL[issue.priority]}</>}
            disabled={!canWrite}
          />
        </span>
        <span style={{ marginLeft: 'auto' }} onClick={stop}>
          <AssigneeAvatar
            assigneeId={issue.assignee_id}
            assigneeName={issue.assignee_name}
            employees={employees}
            onChange={id => onQuickUpdate(issue.id, { assignee_id: id })}
            disabled={!canWrite}
          />
        </span>
      </div>

      {/* Read-only meta row — wraps independently of the quick-edit row above. */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 8 }}>
        {issue.story_points != null && <span className="badge badge-accent">{issue.story_points} pt</span>}
        {issue.due_date && (
          <span className="flex items-center gap-1 text-muted" style={{ fontSize: 11 }}>
            <Calendar size={11} />
            {formatDate(issue.due_date)}
          </span>
        )}
        {issue.sub_issues_count > 0 && (
          <span className="flex items-center gap-1 text-muted" style={{ fontSize: 11 }}>
            <ListTree size={11} />
            {issue.sub_issues_count}
          </span>
        )}
        {issue.attachment_count > 0 && (
          <span className="flex items-center gap-1 text-muted" style={{ fontSize: 11 }}>
            <Paperclip size={11} />
            {issue.attachment_count}
          </span>
        )}
        {issue.link_count > 0 && (
          <span className="flex items-center gap-1 text-muted" style={{ fontSize: 11 }}>
            <Link2 size={11} />
            {issue.link_count}
          </span>
        )}
      </div>

      {issue.labels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {issue.labels.map(l => (
            <span key={l.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: `${l.color}22`, color: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
