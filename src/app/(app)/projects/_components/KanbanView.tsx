'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { EmployeeSummary } from '@/types';
import TaskCard from './TaskCard';
import { PriorityIcon, TypeIcon, StatusDot } from './issue-icons';
import {
  Issue, GroupByField, GroupBucket, IssuePriority, IssueStatus, IssueType,
  bucketsFor, groupKeyFor, DRAGGABLE_GROUP_FIELDS, ProjectMember,
} from './types';

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// Each column carries an icon matching whatever it's grouped by, mirroring
// Plane's kanban headers — a status dot, priority icon, type icon, or (for
// assignee grouping) the member's own avatar initials.
function BucketIcon({ groupBy, bucket }: { groupBy: GroupByField; bucket: GroupBucket }) {
  if (groupBy === 'status') return <StatusDot status={bucket.key as IssueStatus} />;
  if (groupBy === 'priority') return <PriorityIcon priority={bucket.key as IssuePriority} />;
  if (groupBy === 'type') return <TypeIcon type={bucket.key as IssueType} />;
  if (groupBy === 'assignee' && bucket.key !== 'unassigned') {
    return <span className="avatar avatar-sm" style={{ width: 18, height: 18, fontSize: 9, flexShrink: 0 }}>{initials(bucket.label)}</span>;
  }
  return null;
}

export default function KanbanView({
  issues, groupBy, members, employees, canWrite, onCardClick, onDragEnd, onQuickUpdate,
}: {
  issues: Issue[];
  groupBy: GroupByField;
  members: ProjectMember[];
  employees: EmployeeSummary[];
  canWrite: boolean;
  onCardClick: (issueId: number) => void;
  onDragEnd: (issueId: number, bucketKey: string, newIndex: number) => void;
  onQuickUpdate: (issueId: number, patch: Record<string, unknown>) => void;
}) {
  const buckets = bucketsFor(groupBy, members, issues);
  const draggable = DRAGGABLE_GROUP_FIELDS.includes(groupBy) && canWrite;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapsed(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    onDragEnd(Number(result.draggableId), destination.droppableId, destination.index);
  }

  const columns = buckets.map((bucket) => ({
    bucket,
    colIssues: issues.filter((i) => groupKeyFor(i, groupBy) === bucket.key),
  }));

  const content = (
    <div className="flex gap-3" style={{ overflowX: 'auto', paddingBottom: 8 }}>
      {columns.map(({ bucket, colIssues }) => {
        if (collapsed.has(bucket.key)) {
          return (
            <button
              key={bucket.key}
              type="button"
              onClick={() => toggleCollapsed(bucket.key)}
              className="flex items-center gap-2"
              style={{
                flex: '0 0 auto', flexDirection: 'column', width: 32, paddingTop: 10,
                background: 'none', border: 'none', borderRight: '1px solid var(--color-border)',
                cursor: 'pointer', color: 'inherit',
              }}
            >
              <BucketIcon groupBy={groupBy} bucket={bucket} />
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>{colIssues.length}</span>
              <span className="text-sm font-semibold" style={{ writingMode: 'vertical-rl', marginTop: 4 }}>{bucket.label}</span>
            </button>
          );
        }

        // Status-only nicety: group a column's cards under their epic, same
        // as the previous board — kept as a detail of this one grouping,
        // not a general second dimension.
        const epicIds = groupBy === 'status'
          ? new Set(
              colIssues
                .map((i) => i.parent_issue_id)
                .filter((id): id is number => id != null)
                .filter((id) => issues.find((p) => p.id === id)?.type === 'epic'),
            )
          : new Set<number>();
        const grouped = [...epicIds].map((epicId) => ({
          epic: issues.find((i) => i.id === epicId)!,
          children: colIssues.filter((i) => i.parent_issue_id === epicId),
        }));
        const ungrouped = colIssues.filter((i) => !i.parent_issue_id || !epicIds.has(i.parent_issue_id));
        let runningIndex = 0;

        return (
          <div key={bucket.key} style={{ flex: '1 0 280px', minWidth: 280 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => toggleCollapsed(bucket.key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
                title="Collapse column"
              >
                <ChevronDown size={14} />
              </button>
              <BucketIcon groupBy={groupBy} bucket={bucket} />
              <span className="text-sm font-semibold">{bucket.label}</span>
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>{colIssues.length}</span>
            </div>

            {!draggable ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped.map(({ epic, children }) => (
                  <div key={epic.id}>
                    <p className="text-muted" style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{epic.issue_key} {epic.title}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                      {children.map((issue) => <TaskCard key={issue.id} issue={issue} employees={employees} canWrite={canWrite} onClick={() => onCardClick(issue.id)} onQuickUpdate={onQuickUpdate} />)}
                    </div>
                  </div>
                ))}
                {ungrouped.map((issue) => <TaskCard key={issue.id} issue={issue} employees={employees} canWrite={canWrite} onClick={() => onCardClick(issue.id)} onQuickUpdate={onQuickUpdate} />)}
                {colIssues.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>No issues</p>}
              </div>
            ) : (
              <Droppable droppableId={bucket.key}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
                    {grouped.map(({ epic, children }) => (
                      <div key={epic.id}>
                        <p className="text-muted" style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{epic.issue_key} {epic.title}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                          {children.map((issue) => {
                            const idx = runningIndex++;
                            return (
                              <Draggable key={issue.id} draggableId={String(issue.id)} index={idx}>
                                {(dragProvided) => (
                                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                                    <TaskCard issue={issue} employees={employees} canWrite={canWrite} onClick={() => onCardClick(issue.id)} onQuickUpdate={onQuickUpdate} />
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {ungrouped.map((issue) => {
                      const idx = runningIndex++;
                      return (
                        <Draggable key={issue.id} draggableId={String(issue.id)} index={idx}>
                          {(dragProvided) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                              <TaskCard issue={issue} employees={employees} canWrite={canWrite} onClick={() => onCardClick(issue.id)} onQuickUpdate={onQuickUpdate} />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {colIssues.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>No issues</p>}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!draggable) return content;
  return <DragDropContext onDragEnd={handleDragEnd}>{content}</DragDropContext>;
}
