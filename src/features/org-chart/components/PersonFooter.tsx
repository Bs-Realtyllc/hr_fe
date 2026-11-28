'use client';
import type { OrgChartMember } from '../types';
import { departmentColor } from '../utils/department';

/** "● IT · 2 direct · 3 total": either part may be missing. Renders nothing when both are. */
export default function PersonFooter({
  member,
  department,
  reports,
}: {
  member: OrgChartMember;
  department: string | null;
  reports: string | null;
}) {
  if (!department && !reports) return null;
  return (
    <span className="org-card__meta org-card__footer">
      {department && (
        <span className="org-card__dept" title={department}>
          <span
            className={`org-dept-dot org-dept--${departmentColor(member)}`}
            aria-hidden="true"
          />
          <span className="org-card__dept-name">{department}</span>
        </span>
      )}
      {department && reports && <span aria-hidden="true">·</span>}
      {reports && <span className="org-card__reports">{reports}</span>}
    </span>
  );
}
