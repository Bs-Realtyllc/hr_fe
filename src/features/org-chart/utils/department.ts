import type { OrgChartMember } from '../types';

export const UNASSIGNED_TEAM = 'Unassigned';
export const UNASSIGNED_KEY = 'none';

/** Same department ⇔ same key: by id, or by name for rows that only have a name. */
export function departmentKey(m: OrgChartMember): string {
  if (m.department_id != null) return `id:${m.department_id}`;
  if (m.department) return `name:${m.department.trim().toLowerCase()}`;
  return UNASSIGNED_KEY;
}

/** Display name for a department key's members. */
export function departmentName(m: OrgChartMember): string {
  if (departmentKey(m) === UNASSIGNED_KEY) return UNASSIGNED_TEAM;
  return m.department?.trim() || `Department ${m.department_id}`;
}

export const compareNames = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' });

/** Number of department dot colours (see .org-dept--N in org-chart.css). */
export const DEPARTMENT_COLORS = 4;

/** A stable colour slot for a department: the same department always gets the same dot. */
export function departmentColor(m: OrgChartMember): number {
  const key = departmentKey(m);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % DEPARTMENT_COLORS;
}

/** The department name to show on a person, or null when hidden or they have none. */
export function visibleDepartment(m: OrgChartMember, show: boolean): string | null {
  if (!show || departmentKey(m) === UNASSIGNED_KEY) return null;
  return m.department?.trim() || null;
}
