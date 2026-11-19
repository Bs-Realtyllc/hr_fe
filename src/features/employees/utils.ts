import type { Employee } from '@/types';

export function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const roleColors: Record<string, string> = {
  admin: "badge-error",
  lead: "badge-accent",
  employee: "badge-neutral",
};

export const UNASSIGNED_DEPARTMENT = "Unassigned";

export const DEPARTMENT_PRIORITY = [
  "founders",
  "founder",
  "leadership",
  "executive",
  "management",
  "managers",
];

export function departmentRank(department: string) {
  const idx = DEPARTMENT_PRIORITY.indexOf(department.toLowerCase());
  return idx === -1 ? DEPARTMENT_PRIORITY.length : idx;
}

export function groupByDepartment(list: Employee[]): [string, Employee[]][] {
  const groups: Record<string, Employee[]> = {};
  list.forEach((emp) => {
    const dept = emp.department?.trim() || UNASSIGNED_DEPARTMENT;
    (groups[dept] ??= []).push(emp);
  });
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === UNASSIGNED_DEPARTMENT) return 1;
    if (b === UNASSIGNED_DEPARTMENT) return -1;
    const rankDiff = departmentRank(a) - departmentRank(b);
    return rankDiff !== 0 ? rankDiff : a.localeCompare(b);
  });
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const statusBadge: Record<string, string> = {
  active: 'badge-success',
  archived: 'badge-neutral',
  on_hold: 'badge-warning',
};

export const msBadge: Record<string, string> = {
  completed: 'badge-success',
  in_progress: 'badge-info',
  pending: 'badge-neutral',
};

export const ackBadge: Record<string, string> = {
  approved: 'badge-success',
  rejected: 'badge-error',
  pending: 'badge-warning',
};
