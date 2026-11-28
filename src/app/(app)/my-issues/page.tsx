'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import { StatusDot, PriorityIcon, PRIORITY_COLOR } from '../projects/_components/issue-icons';
import { IssueStatus, IssuePriority, STATUS_LABEL, PRIORITY_LABEL } from '../projects/_components/types';

// Deliberately a local, minimal shape rather than importing the full Issue
// interface from the Projects feature's _components/types.ts — this page
// isn't part of that feature, same reason features/employees keeps its own
// Project type instead of sharing the Projects page's. StatusDot/PriorityIcon
// are the exception: reused as-is (not re-declared) so a status/priority
// looks pixel-identical to how it looks on the board people already know.
interface MyIssue {
  id: number;
  project_id: number;
  project_name: string;
  issue_key: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  due_date: string | null;
  labels: { id: number; name: string; color: string }[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// A stable color per project, the same way label colors are picked — there's
// no color field on a project, so this is what makes several projects'
// issues visually distinguishable at a glance in one shared list.
const PROJECT_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];
function projectColor(projectId: number) {
  return PROJECT_COLORS[projectId % PROJECT_COLORS.length];
}

// Grouping by status/board doesn't make sense once you're looking across
// every project you're on — "what's the state of this" matters less than
// "what do I actually need to deal with", so this groups by due date instead.
type Bucket = 'overdue' | 'today' | 'upcoming' | 'later';
const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming (next 7 days)', later: 'Later',
};

function bucketFor(dueDate: string | null): Bucket {
  if (!dueDate) return 'later';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (daysDiff < 0) return 'overdue';
  if (daysDiff === 0) return 'today';
  if (daysDiff <= 7) return 'upcoming';
  return 'later';
}

function IssueCard({ issue, onOpen }: { issue: MyIssue; onOpen: () => void }) {
  const color = projectColor(issue.project_id);
  const overdue = bucketFor(issue.due_date) === 'overdue';
  return (
    <div
      onClick={onOpen}
      className="card"
      style={{
        padding: 14,
        cursor: 'pointer',
        borderLeft: overdue ? '3px solid var(--color-error)' : undefined,
      }}
    >
      <div className="flex justify-between items-start" style={{ gap: 12, marginBottom: 8 }}>
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{issue.issue_key}</span>
          <h3 style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {issue.title}
          </h3>
        </div>
        <span
          title={issue.project_name}
          style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, flexShrink: 0,
            background: `${color}18`, color,
            maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {issue.project_name}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 11 }}>
        <span className="flex items-center gap-1 text-muted">
          <StatusDot status={issue.status} />{STATUS_LABEL[issue.status]}
        </span>
        <span className="flex items-center gap-1" style={{ color: PRIORITY_COLOR[issue.priority] }}>
          <PriorityIcon priority={issue.priority} color="currentColor" />{PRIORITY_LABEL[issue.priority]}
        </span>
        {issue.due_date && (
          <span className="flex items-center gap-1" style={{ color: overdue ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
            <Calendar size={11} />{formatDate(issue.due_date)}
          </span>
        )}
        {issue.labels.map((l) => (
          <span key={l.id} style={{ padding: '1px 8px', borderRadius: 10, background: `${l.color}22`, color: l.color }}>
            {l.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MyIssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<MyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MyIssue[]>('/issues/mine')
      .then(setIssues)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const buckets: Bucket[] = ['overdue', 'today', 'upcoming', 'later'];
  const grouped = buckets.map((b) => ({ bucket: b, rows: issues.filter((i) => bucketFor(i.due_date) === b) }));
  const projectCount = new Set(issues.map((i) => i.project_id)).size;

  return (
    <div>
      <PageHeader title="My Issues" discription="Everything assigned to you, across every project" />

      {loading && <p className="text-muted text-sm">Loading…</p>}
      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

      {!loading && !error && issues.length === 0 && (
        <div className="empty-state card">
          <p>Nothing assigned to you right now.</p>
        </div>
      )}

      {!loading && !error && issues.length > 0 && (
        <>
          <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
            {issues.length} open {issues.length === 1 ? 'issue' : 'issues'} across {projectCount} {projectCount === 1 ? 'project' : 'projects'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {grouped.map(({ bucket, rows }) => {
              if (rows.length === 0) return null;
              return (
                <div key={bucket}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                    <span className="text-sm font-semibold" style={{ color: bucket === 'overdue' ? 'var(--color-error)' : undefined }}>
                      {BUCKET_LABEL[bucket]}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>{rows.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rows.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        onOpen={() => router.push(`/projects?projectId=${issue.project_id}&issueId=${issue.id}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
