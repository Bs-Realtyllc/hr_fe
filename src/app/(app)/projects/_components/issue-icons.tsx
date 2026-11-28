'use client';

import { AlertTriangle, ArrowUp, ArrowDown, Equal, Circle, Flag, BookOpen, CheckSquare, Bug, CornerDownRight, User } from 'lucide-react';
import type { EmployeeSummary } from '@/types';
import { IssuePriority, IssueStatus, IssueType } from './types';
import ChipDropdown, { ChipDropdownOption } from './ChipDropdown';

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// "none" uses an empty circle rather than a dash/minus glyph — at 12px a
// Minus icon is indistinguishable from a stray hyphen sitting in the UI.
const PRIORITY_ICON: Record<IssuePriority, typeof AlertTriangle> = {
  urgent: AlertTriangle,
  high: ArrowUp,
  medium: Equal,
  low: ArrowDown,
  none: Circle,
};

// Standalone color (e.g. a kanban column header, or the priority chip's own
// select text); when nested inside a badge, pass color="currentColor" instead.
export const PRIORITY_COLOR: Record<IssuePriority, string> = {
  urgent: 'var(--color-error)',
  high: 'var(--color-warning)',
  medium: 'var(--color-warning)',
  low: 'var(--color-info)',
  none: 'var(--color-text-muted)',
};

export function PriorityIcon({ priority, size = 12, color }: { priority: IssuePriority; size?: number; color?: string }) {
  const Icon = PRIORITY_ICON[priority];
  return <Icon size={size} style={{ color: color ?? PRIORITY_COLOR[priority], flexShrink: 0 }} />;
}

const TYPE_ICON: Record<IssueType, typeof Flag> = {
  epic: Flag,
  story: BookOpen,
  task: CheckSquare,
  bug: Bug,
  subtask: CornerDownRight,
};

export function TypeIcon({ type, size = 12 }: { type: IssueType; size?: number }) {
  const Icon = TYPE_ICON[type];
  return <Icon size={size} className="text-muted" style={{ flexShrink: 0 }} />;
}

const STATUS_COLOR: Record<IssueStatus, string> = {
  backlog: 'var(--color-text-muted)',
  todo: 'var(--color-info)',
  in_progress: 'var(--color-warning)',
  done: 'var(--color-success)',
  cancelled: 'var(--color-error)',
};

export function StatusDot({ status, size = 8 }: { status: IssueStatus; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block', width: size, height: size, borderRadius: '50%',
        background: STATUS_COLOR[status], flexShrink: 0,
      }}
    />
  );
}

// Fixed-size avatar as the dropdown's trigger face — unlike showing the name
// as text next to it, the visible face never changes width between a short
// name and a long one. Full name is a hover tooltip, same as Plane's cards.
export function AssigneeAvatar({
  assigneeId, assigneeName, employees, onChange, size = 22, disabled,
}: {
  assigneeId: number | null;
  assigneeName: string | null;
  employees: EmployeeSummary[];
  onChange: (id: number | null) => void;
  size?: number;
  disabled?: boolean;
}) {
  const options: ChipDropdownOption[] = [
    { value: '', label: 'Unassigned' },
    ...employees.map(e => ({ value: String(e.id), label: e.name })),
  ];
  return (
    <ChipDropdown
      value={assigneeId != null ? String(assigneeId) : ''}
      options={options}
      onChange={v => onChange(v ? Number(v) : null)}
      menuWidth={160}
      disabled={disabled}
      trigger={
        <span
          className="avatar avatar-sm"
          title={assigneeName ?? 'Unassigned'}
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {assigneeName ? initials(assigneeName) : <User size={size * 0.55} />}
        </span>
      }
    />
  );
}
