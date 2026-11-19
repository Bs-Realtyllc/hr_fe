'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

const STATUS_COLOR: Record<UserStatus, string> = { online: '#23a55a', away: '#f0b232', dnd: '#f23f43', offline: '#80848e' };
const STATUS_LABEL: Record<UserStatus, string> = { online: 'Online', away: 'Away', dnd: 'Do Not Disturb', offline: 'Offline' };
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', lead: 'Team Lead', employee: 'Employee', intern: 'Intern' };

export interface ProfileEmployee {
  id: string;
  name: string;
  designation?: string | null;
  department?: string | null;
  role?: string | null;
  email?: string | null;
  start_date?: string | null;
  discord_username?: string | null;
  github_url?: string | null;
}

interface ProfilePopoverProps {
  anchorLeft: number;
  anchorRight: number;
  anchorTop: number;
  anchorBottom: number;
  employee: ProfileEmployee;
  status: UserStatus;
  isSelf?: boolean;
  onClose: () => void;
  onMessage?: () => void;
}

function initials(n: string) { return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function avatarColor(seed: string) { return `hsl(${(seed.charCodeAt(0) * 37) % 360}, 45%, 35%)`; }
function fmtJoinDate(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ProfilePopover({ anchorLeft, anchorRight, anchorTop, anchorBottom, employee, status, isSelf, onClose, onMessage }: ProfilePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: anchorLeft, top: anchorTop });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();

    // Open to the right of the clicked element; flip to the left if there's no room.
    let left = anchorRight + margin;
    if (left + rect.width > window.innerWidth - margin) left = anchorLeft - rect.width - margin;
    if (left < margin) left = margin;

    let top = anchorTop;
    if (top + rect.height > window.innerHeight - margin) top = window.innerHeight - rect.height - margin;
    if (top < margin) top = margin;

    setPos({ left, top });
  }, [anchorLeft, anchorRight, anchorTop, anchorBottom]);

  useEffect(() => {
    function onMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const color = avatarColor(employee.name || '?');
  const hasLinks = Boolean(employee.github_url || employee.discord_username);

  return (
    <div ref={ref} className="inbox-profile-popover" style={{ left: pos.left, top: pos.top }}>
      <div className="inbox-profile-top">
        <div className="inbox-profile-avatar" style={{ background: color }}>
          {initials(employee.name || '?')}
          <span className="inbox-profile-status-dot" style={{ background: STATUS_COLOR[status] }} />
        </div>
        <div className="inbox-profile-id">
          <div className="inbox-profile-name">{employee.name}{isSelf ? <span className="inbox-profile-you"> (you)</span> : null}</div>
          <div className="inbox-profile-status-line">{STATUS_LABEL[status]}</div>
        </div>
      </div>

      {(employee.designation || employee.role) && (
        <div className="inbox-profile-badges">
          {employee.designation && <span className="inbox-profile-designation-badge">{employee.designation}</span>}
          {employee.role && <span className="inbox-profile-role-badge">{ROLE_LABEL[employee.role] ?? employee.role}</span>}
        </div>
      )}

      <div className="inbox-profile-divider" />

      <div className="inbox-profile-grid">
        {employee.department && (
          <div className="inbox-profile-field">
            <div className="inbox-profile-field-label">Department</div>
            <div className="inbox-profile-field-value">{employee.department}</div>
          </div>
        )}
        {employee.start_date && (
          <div className="inbox-profile-field">
            <div className="inbox-profile-field-label">Joined</div>
            <div className="inbox-profile-field-value">{fmtJoinDate(employee.start_date)}</div>
          </div>
        )}
      </div>

      {employee.email && (
        <div className="inbox-profile-field">
          <div className="inbox-profile-field-label">Email</div>
          <a className="inbox-profile-field-value link" href={`mailto:${employee.email}`}>{employee.email}</a>
        </div>
      )}

      {hasLinks && (
        <div className="inbox-profile-field">
          <div className="inbox-profile-field-label">Links</div>
          <div className="inbox-profile-field-value">
            {employee.github_url && <a href={employee.github_url} target="_blank" rel="noreferrer" className="link">GitHub</a>}
            {employee.github_url && employee.discord_username && ' · '}
            {employee.discord_username && <span>Discord: {employee.discord_username}</span>}
          </div>
        </div>
      )}

      {!isSelf && onMessage && (
        <button className="inbox-profile-message-btn" onClick={onMessage}>Message</button>
      )}
    </div>
  );
}
