'use client';
import { useState } from 'react';
import type { OrgChartMember } from '../types';
import { initials, photoUrl } from '../utils/person';

/** Profile photo, or initials when there is none or it fails to load. Decorative. */
export default function PersonAvatar({
  member,
  className = 'org-card__avatar',
}: {
  member: OrgChartMember;
  className?: string;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const src = photoFailed ? null : photoUrl(member.profile_picture);
  return (
    <span className={className} aria-hidden="true">
      {src ? (
        // Plain <img>: photos come from the backend host, not next/image's
        // configured domains, and the app is statically exported.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" onError={() => setPhotoFailed(true)} />
      ) : (
        initials(member.name)
      )}
    </span>
  );
}
