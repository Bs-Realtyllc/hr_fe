'use client';
import { memo } from 'react';
import type { OrgChartMember } from '../types';
import { visibleDepartment } from '../utils/department';
import { reportsLabel } from '../utils/person';
import PersonAvatar from './PersonAvatar';
import PersonFooter from './PersonFooter';

export interface PersonCardProps {
  member: OrgChartMember;
  directCount: number;
  totalCount: number;
  /** Highlights the signed-in user's own card. */
  isMe?: boolean;
  /** Briefly emphasised after search or "Find me". */
  highlighted?: boolean;
  /** Show "● Department" on the card (off in the Teams view, where the box above says it). */
  showDepartment?: boolean;
  /** Makes the card a button that opens this person's details. */
  onOpen?: () => void;
  /** This person's details are open. */
  selected?: boolean;
}

/** One person on the org chart: photo or initials, name, title and report counts. */
function PersonCard({
  member,
  directCount,
  totalCount,
  isMe = false,
  highlighted = false,
  showDepartment = true,
  onOpen,
  selected = false,
}: PersonCardProps) {
  const reports = reportsLabel(directCount, totalCount);
  const department = visibleDepartment(member, showDepartment);

  const className = [
    'org-card',
    isMe && 'org-card--me',
    highlighted && 'org-card--highlight',
    selected && 'org-card--selected',
    onOpen && 'org-card--button nodrag nopan',
  ]
    .filter(Boolean)
    .join(' ');
  const label = [member.name, member.designation, department, reports].filter(Boolean).join(', ');
  const Tag = onOpen ? 'button' : 'article';

  return (
    <Tag
      className={className}
      aria-label={label}
      {...(onOpen
        ? {
            type: 'button' as const,
            onClick: onOpen,
            'aria-haspopup': 'dialog' as const,
            'aria-expanded': selected,
          }
        : {})}
    >
      <PersonAvatar member={member} />
      <span className="org-card__body">
        <span className="org-card__name" title={member.name}>
          {member.name}
          {isMe && <span className="org-card__me">You</span>}
        </span>
        {member.designation && (
          <span className="org-card__meta" title={member.designation}>
            {member.designation}
          </span>
        )}
        <PersonFooter member={member} department={department} reports={reports} />
      </span>
    </Tag>
  );
}

export default memo(PersonCard);
