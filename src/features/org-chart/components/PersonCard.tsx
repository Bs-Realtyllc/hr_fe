'use client';
import { memo, useState } from 'react';
import type { OrgChartMember } from '../types';
import { initials, photoUrl, reportsLabel } from '../utils/person';

export interface PersonCardProps {
  member: OrgChartMember;
  directCount: number;
  totalCount: number;
  /** Highlights the signed-in user's own card. */
  isMe?: boolean;
}

/** One person on the org chart: photo or initials, name, title and report counts. */
function PersonCard({ member, directCount, totalCount, isMe = false }: PersonCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const src = photoFailed ? null : photoUrl(member.profile_picture);
  const reports = reportsLabel(directCount, totalCount);

  return (
    <article
      className={`org-card${isMe ? ' org-card--me' : ''}`}
      aria-label={[member.name, member.designation, reports].filter(Boolean).join(', ')}
    >
      <span className="org-card__avatar" aria-hidden="true">
        {src ? (
          // Plain <img>: photos come from the backend host, not next/image's
          // configured domains, and the app is statically exported.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" onError={() => setPhotoFailed(true)} />
        ) : (
          initials(member.name)
        )}
      </span>
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
        {reports && <span className="org-card__meta">{reports}</span>}
      </span>
    </article>
  );
}

export default memo(PersonCard);
