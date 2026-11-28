'use client';
import Link from 'next/link';
import { Check, Link2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { OrgNode, OrgTree } from '../types';
import { visibleDepartment } from '../utils/department';
import PersonAvatar from './PersonAvatar';
import PersonFooter from './PersonFooter';

const STATUS_LABELS: Record<string, string> = {
  on_leave: 'On leave',
  probation: 'Probation',
  offboarding: 'Leaving',
};

export interface OrgPersonPanelProps {
  tree: OrgTree;
  person: OrgNode;
  currentUserId: number | null;
  /** Where "View full profile" goes, or null to hide it (no access). */
  profileHref: string | null;
  /** Open another person (manager or report) in the panel. */
  onSelect: (employeeId: number) => void;
  onClose: () => void;
  /** Absolute link that opens the chart on this person; omit to hide "Copy link". */
  shareUrl?: string;
}

/**
 * Side panel with one person's place in the org: title, department, who they
 * report to and who reports to them. Built only from org-chart data, so it is
 * safe to show to every role. Non-modal: the chart stays usable beside it.
 */
export default function OrgPersonPanel({
  tree,
  person,
  currentUserId,
  profileHref,
  onSelect,
  onClose,
  shareUrl,
}: OrgPersonPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { member, children, totalCount } = person;
  const manager = person.managerId != null ? tree.byId.get(person.managerId) : undefined;
  const isMe = member.id === currentUserId;
  const status = STATUS_LABELS[member.status];

  const headingRef = useRef<HTMLHeadingElement>(null);

  // ── Copy link ──
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => setCopyState('idle'), [member.id]);
  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
    } catch {
      // Clipboard blocked (insecure origin, permissions): say so, don't fail silently.
      setCopyState('failed');
    }
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), 2000);
  };

  // Focus moves into the panel when it opens and goes back when it closes.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  // Switching to another person (manager/report link): announce the new name
  // by moving focus to it, since the clicked link is gone.
  const firstPerson = useRef(member.id);
  useEffect(() => {
    if (member.id !== firstPerson.current) headingRef.current?.focus();
  }, [member.id]);

  return (
    <aside
      className="org-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="org-panel__header">
        <PersonAvatar member={member} className="org-card__avatar org-panel__avatar" />
        <div className="org-panel__heading">
          <h2 id={titleId} className="org-panel__name" ref={headingRef} tabIndex={-1}>
            {member.name}
            {isMe && <span className="org-card__me">You</span>}
          </h2>
          {member.designation && <p className="org-panel__title">{member.designation}</p>}
          <PersonFooter
            member={member}
            department={visibleDepartment(member, true)}
            reports={null}
          />
          {status && <span className="org-panel__status">{status}</span>}
        </div>
        <button
          ref={closeRef}
          type="button"
          className="org-panel__close"
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="org-panel__body">
        <section aria-labelledby={`${titleId}-manager`}>
          <h3 id={`${titleId}-manager`} className="org-panel__section">
            Reports to
          </h3>
          {manager ? (
            <PersonLink node={manager} onSelect={onSelect} />
          ) : (
            <p className="org-panel__empty">No reporting manager</p>
          )}
        </section>

        <section aria-labelledby={`${titleId}-reports`}>
          <h3 id={`${titleId}-reports`} className="org-panel__section">
            Direct reports{children.length > 0 && ` (${children.length})`}
          </h3>
          {children.length ? (
            <ul className="org-panel__list">
              {children.map((c) => (
                <li key={c.member.id}>
                  <PersonLink node={c} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="org-panel__empty">No direct reports</p>
          )}
          {totalCount > children.length && (
            <p className="org-panel__note">{totalCount} people in their team in total</p>
          )}
        </section>
      </div>

      {(profileHref || shareUrl) && (
        <div className="org-panel__footer">
          {shareUrl && (
            <button type="button" className="org-panel__copy" onClick={copyLink}>
              {copyState === 'copied' ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Link2 size={16} aria-hidden="true" />
              )}
              {copyState === 'copied'
                ? 'Copied'
                : copyState === 'failed'
                  ? "Couldn't copy"
                  : 'Copy link'}
            </button>
          )}
          {profileHref && (
            <Link href={profileHref} className="org-panel__profile">
              {isMe ? 'Open my profile' : 'View full profile'}
            </Link>
          )}
          <span className="org-sr-only" role="status" aria-live="polite">
            {copyState === 'copied'
              ? 'Link copied'
              : copyState === 'failed'
                ? 'Could not copy the link'
                : ''}
          </span>
        </div>
      )}
    </aside>
  );
}

function PersonLink({ node, onSelect }: { node: OrgNode; onSelect: (employeeId: number) => void }) {
  const { member } = node;
  return (
    <button type="button" className="org-panel__person" onClick={() => onSelect(member.id)}>
      <PersonAvatar member={member} className="org-card__avatar org-outline__avatar" />
      <span className="org-outline__text">
        <span className="org-outline__name">{member.name}</span>
        {member.designation && <span className="org-card__meta">{member.designation}</span>}
      </span>
    </button>
  );
}
