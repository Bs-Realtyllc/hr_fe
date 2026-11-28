'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { avatarColor, initials } from './ui';

type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

const STATUS_COLOR: Record<UserStatus, string> = { online: '#23a55a', away: '#f0b232', dnd: '#f23f43', offline: '#80848e' };
const STATUS_LABEL: Record<UserStatus, string> = { online: 'Online', away: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' };
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
  const label = 'mb-1 text-xs font-bold uppercase tracking-wide text-[#f2f3f5]';
  const value = 'text-sm text-[#dbdee1] break-words';
  const link  = 'text-[#00a8fc] hover:underline';

  return (
    <div
      ref={ref}
      className="fixed z-[1200] w-[300px] max-w-[calc(100vw-16px)] overflow-hidden rounded-lg bg-[#232428] text-[#dbdee1] shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-opacity duration-100 starting:opacity-0"
      style={{ left: pos.left, top: pos.top }}
    >
      {/* Banner */}
      <div className="h-[60px]" style={{ background: color }} />

      {/* Avatar overlapping the banner */}
      <div className="relative px-4">
        <div
          className="absolute -top-10 flex size-20 items-center justify-center rounded-full border-[6px] border-[#232428] text-2xl font-semibold text-white"
          style={{ background: color }}
        >
          {initials(employee.name || '?')}
          <span
            className="absolute bottom-0 right-0 size-4 rounded-full border-[4px] border-[#232428] box-content"
            style={{ background: STATUS_COLOR[status] }}
            title={STATUS_LABEL[status]}
          />
        </div>
      </div>

      <div className="px-4 pb-4 pt-12">
        <div className="text-xl font-bold leading-tight text-[#f2f3f5]">
          {employee.name}{isSelf ? <span className="text-sm font-normal text-[#949ba4]"> (you)</span> : null}
        </div>
        <div className="mt-0.5 text-sm text-[#b5bac1]">{STATUS_LABEL[status]}</div>

        <div className="mt-3 flex flex-col gap-3 rounded-lg bg-[#111214] p-3">
          {(employee.designation || employee.role) && (
            <div>
              <div className={label}>Roles</div>
              <div className="flex flex-wrap gap-1">
                {employee.designation && (
                  <span className="inline-flex items-center gap-1.5 rounded bg-[#2b2d31] px-2 py-0.5 text-xs font-medium text-[#dbdee1]">
                    <span className="size-2.5 rounded-full bg-[#5865f2]" />{employee.designation}
                  </span>
                )}
                {employee.role && (
                  <span className="inline-flex items-center gap-1.5 rounded bg-[#2b2d31] px-2 py-0.5 text-xs font-medium text-[#dbdee1]">
                    <span className="size-2.5 rounded-full bg-[#23a55a]" />{ROLE_LABEL[employee.role] ?? employee.role}
                  </span>
                )}
              </div>
            </div>
          )}

          {(employee.department || employee.start_date) && (
            <div className="grid grid-cols-2 gap-3">
              {employee.department && (
                <div>
                  <div className={label}>Department</div>
                  <div className={value}>{employee.department}</div>
                </div>
              )}
              {employee.start_date && (
                <div>
                  <div className={label}>Member Since</div>
                  <div className={value}>{fmtJoinDate(employee.start_date)}</div>
                </div>
              )}
            </div>
          )}

          {employee.email && (
            <div>
              <div className={label}>Email</div>
              <a className={`${value} ${link}`} href={`mailto:${employee.email}`}>{employee.email}</a>
            </div>
          )}

          {hasLinks && (
            <div>
              <div className={label}>Links</div>
              <div className={value}>
                {employee.github_url && <a href={employee.github_url} target="_blank" rel="noreferrer" className={link}>GitHub</a>}
                {employee.github_url && employee.discord_username && ' · '}
                {employee.discord_username && <span>Discord: {employee.discord_username}</span>}
              </div>
            </div>
          )}
        </div>

        {!isSelf && onMessage && (
          <button
            className="mt-3 w-full rounded-[3px] bg-[#5865f2] py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752c4]"
            onClick={onMessage}
          >
            Message
          </button>
        )}
      </div>
    </div>
  );
}
