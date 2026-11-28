export interface IssueLabel {
  id: number;
  name: string;
  color: string;
}

export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type IssueType = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type IssueLinkType = 'blocks' | 'relates_to' | 'duplicates';

export interface Issue {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  parent_issue_id: number | null;
  story_points: number | null;
  sequence_number: number;
  issue_key: string;
  assignee_id: number | null;
  assignee_name: string | null;
  module_id: number | null;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  labels: IssueLabel[];
  sub_issues_count: number;
  attachment_count: number;
  link_count: number;
}

export interface IssueActivityEntry {
  id: number;
  issue_id: number;
  actor_id: number | null;
  actor_name: string | null;
  verb: 'created' | 'updated' | 'commented' | 'linked' | 'attached';
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface IssueLink {
  id: number;
  link_type: IssueLinkType;
  label: string;
  other_issue_id: number;
  other_issue_title: string;
  other_issue_status: IssueStatus;
  created_at: string;
}

export interface IssueAttachment {
  id: number;
  issue_id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

// Permission tier, not a job-function label — admin can manage this project's
// team/modules without a global HR admin; viewer cannot write issues. Named
// admin/member rather than lead/contributor: this app's global employee role
// already has a 'lead' value with real company-wide power (leave approval,
// payroll, performance reviews), so a project-scoped tier can't reuse that
// word without implying it too. Matches how Jira/Plane name project-level
// tiers (never "Lead" — that's reserved for Module.lead_id, a single-owner
// field, not a permission tier).
export type ProjectRole = 'admin' | 'member' | 'viewer';
export const ROLE_OPTIONS: ProjectRole[] = ['admin', 'member', 'viewer'];
export const ROLE_LABEL: Record<ProjectRole, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export interface ProjectMember {
  id: number;
  employee_id: number;
  name: string;
  designation: string;
  role: ProjectRole;
}

// Replaces the old Milestone — a module has real ownership (lead) and its
// own subset of the team (ModuleMember below), not just a label with a
// deadline.
export type ModuleStatus = 'backlog' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
export const MODULE_STATUS_OPTIONS: ModuleStatus[] = ['backlog', 'planned', 'in_progress', 'completed', 'cancelled'];
export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface Module {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  target_date: string;
  status: ModuleStatus;
  lead_id: number | null;
  lead_name: string | null;
}

export interface ModuleMember {
  id: number;
  employee_id: number;
  name: string;
  designation: string | null;
}

export const PRIORITY_OPTIONS: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none'];
export const TYPE_OPTIONS: IssueType[] = ['epic', 'story', 'task', 'bug', 'subtask'];
export const STATUS_OPTIONS: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled'];
export const LINK_TYPE_OPTIONS: { value: IssueLinkType; label: string }[] = [
  { value: 'blocks', label: 'Blocks' },
  { value: 'relates_to', label: 'Relates to' },
  { value: 'duplicates', label: 'Duplicates' },
];

// Mirrors assertValidHierarchy in issue.service.ts — only offer a parent
// candidate the backend would actually accept for the given type.
export function validParentCandidates(issues: Issue[], type: IssueType, excludeId?: number): Issue[] {
  if (type === 'epic') return [];
  const pool = issues.filter((i) => i.id !== excludeId);
  if (type === 'subtask') return pool.filter((i) => ['story', 'task', 'bug'].includes(i.type));
  return pool.filter((i) => i.type === 'epic');
}

// Priority/status are fixed system enums, not user data — map them onto the
// existing semantic badge classes instead of hardcoding colors per value.
export const PRIORITY_BADGE_CLASS: Record<IssuePriority, string> = {
  urgent: 'badge-error',
  high: 'badge-warning',
  medium: 'badge-warning',
  low: 'badge-info',
  none: 'badge-neutral',
};

// Display labels for the fixed enums — the raw values (urgent, in_progress,
// subtask) are lowercase/snake_case identifiers, not user-facing text.
export const PRIORITY_LABEL: Record<IssuePriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};
export const TYPE_LABEL: Record<IssueType, string> = {
  epic: 'Epic',
  story: 'Story',
  task: 'Task',
  bug: 'Bug',
  subtask: 'Subtask',
};
export const STATUS_LABEL: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

// --- Generalized grouping (board columns / list sections) ---
// Label is deliberately excluded here — an issue can carry several labels,
// so "which single column does it belong to" has no clean answer. Grouping
// stays limited to single-valued fields.
export type GroupByField = 'status' | 'priority' | 'assignee' | 'type';
export type ViewMode = 'board' | 'list';

export const GROUP_BY_OPTIONS: { value: GroupByField; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'type', label: 'Type' },
];

// Every field above maps cleanly onto one request field, so dragging a card
// to a different bucket is always meaningful here — unlike label grouping,
// which this list intentionally never includes.
export const DRAGGABLE_GROUP_FIELDS: GroupByField[] = ['status', 'priority', 'assignee', 'type'];

export interface GroupBucket {
  key: string;
  label: string;
}

const STATUS_BUCKETS: GroupBucket[] = STATUS_OPTIONS.map((s) => ({ key: s, label: STATUS_LABEL[s] }));
const PRIORITY_BUCKETS: GroupBucket[] = PRIORITY_OPTIONS.map((p) => ({ key: p, label: PRIORITY_LABEL[p] }));
const TYPE_BUCKETS: GroupBucket[] = TYPE_OPTIONS.map((t) => ({ key: t, label: TYPE_LABEL[t] }));

export function groupKeyFor(issue: Issue, field: GroupByField): string {
  switch (field) {
    case 'status': return issue.status;
    case 'priority': return issue.priority;
    case 'type': return issue.type;
    case 'assignee': return issue.assignee_id != null ? String(issue.assignee_id) : 'unassigned';
    default: return 'unassigned';
  }
}

// Status/priority/type have a fixed bucket list (so an empty column still
// shows); assignee buckets are derived from the project's actual members,
// since there's no fixed roster of who could be assigned. An issue's
// assignee doesn't have to be a current project member (assertAssigneeValid
// in issue.service.ts only checks the employee exists) — issues imported
// from Plane commonly carry one. Without a bucket for them, those issues
// would silently vanish from the board when grouped by assignee, so any
// assignee_id missing from members gets its own bucket from the issue data.
export function bucketsFor(field: GroupByField, members: ProjectMember[], issues: Issue[] = []): GroupBucket[] {
  switch (field) {
    case 'status': return STATUS_BUCKETS;
    case 'priority': return PRIORITY_BUCKETS;
    case 'type': return TYPE_BUCKETS;
    case 'assignee': {
      const memberIds = new Set(members.map((m) => m.employee_id));
      const extra = new Map<number, string>();
      for (const i of issues) {
        if (i.assignee_id != null && !memberIds.has(i.assignee_id) && i.assignee_name) {
          extra.set(i.assignee_id, i.assignee_name);
        }
      }
      return [
        ...members.map((m) => ({ key: String(m.employee_id), label: m.name })),
        ...[...extra].map(([id, name]) => ({ key: String(id), label: name })),
        { key: 'unassigned', label: 'Unassigned' },
      ];
    }
    default: return [];
  }
}

// What dropping a card onto this bucket should patch, for the given
// group-by field.
export function patchForBucket(field: GroupByField, bucketKey: string): Record<string, unknown> {
  switch (field) {
    case 'status': return { status: bucketKey };
    case 'priority': return { priority: bucketKey };
    case 'type': return { type: bucketKey };
    case 'assignee': return { assignee_id: bucketKey === 'unassigned' ? null : Number(bucketKey) };
    default: return {};
  }
}

// --- Filtering (narrows which issues reach the board/list, unlike
// grouping above, which only decides how the full set is bucketed) ---

export interface IssueFilters {
  status: IssueStatus[];
  priority: IssuePriority[];
  type: IssueType[];
  /** Employee id as a string, or 'unassigned'. */
  assignee: string[];
  label: number[];
  module: number[];
}

export const EMPTY_FILTERS: IssueFilters = { status: [], priority: [], type: [], assignee: [], label: [], module: [] };

export function filterCount(f: IssueFilters): number {
  return f.status.length + f.priority.length + f.type.length + f.assignee.length + f.label.length + f.module.length;
}

export function applyFilters(issues: Issue[], f: IssueFilters): Issue[] {
  if (filterCount(f) === 0) return issues;
  return issues.filter((i) => {
    if (f.status.length && !f.status.includes(i.status)) return false;
    if (f.priority.length && !f.priority.includes(i.priority)) return false;
    if (f.type.length && !f.type.includes(i.type)) return false;
    if (f.assignee.length) {
      const key = i.assignee_id != null ? String(i.assignee_id) : 'unassigned';
      if (!f.assignee.includes(key)) return false;
    }
    if (f.label.length && !i.labels.some((l) => f.label.includes(l.id))) return false;
    if (f.module.length && (i.module_id == null || !f.module.includes(i.module_id))) return false;
    return true;
  });
}
