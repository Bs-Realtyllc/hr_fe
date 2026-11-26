'use client';
import { Building2, Users } from 'lucide-react';
import { memo } from 'react';

export interface GroupCardProps {
  variant: 'company' | 'team';
  name: string;
  /** Second line, e.g. "3 people". */
  summary: string;
}

/** A company or department box in the Teams view. */
function GroupCard({ variant, name, summary }: GroupCardProps) {
  const Icon = variant === 'company' ? Building2 : Users;
  return (
    <article className={`org-card org-card--${variant}`} aria-label={`${name}, ${summary}`}>
      <span className="org-card__avatar org-card__avatar--icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="org-card__body">
        <span className="org-card__name" title={name}>
          {name}
        </span>
        <span className="org-card__meta">{summary}</span>
      </span>
    </article>
  );
}

export default memo(GroupCard);
