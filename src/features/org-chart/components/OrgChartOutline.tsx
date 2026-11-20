'use client';
import {
  Building2,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  LocateFixed,
  Users,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import type { OrgTree, RevealRequest } from '../types';
import {
  ancestorIds,
  defaultCollapsed,
  orgToGroupedItems,
  parentMap,
  personId,
} from '../utils/chartItems';
import { visibleDepartment } from '../utils/department';
import { allParentIds, visibleRows, type OutlineRow } from '../utils/outline';
import { reportsLabel } from '../utils/person';
import OrgChartSearch from './OrgChartSearch';
import PersonAvatar from './PersonAvatar';
import PersonFooter from './PersonFooter';

const HIGHLIGHT_MS = 2500;

export interface OrgChartOutlineProps {
  tree: OrgTree;
  companyName: string;
  currentUserId: number | null;
  /** Collapsed item ids; null = not touched yet, use the default. Kept by the parent so it survives view switches. */
  collapsed: Set<string> | null;
  onCollapsedChange: (next: Set<string>) => void;
  /** Click or Enter on a person row calls this. */
  onOpenPerson?: (employeeId: number) => void;
  /** Employee whose details are open (their row is marked). */
  selectedEmployeeId?: number | null;
  /** Reveal a row when this changes (e.g. picked in the details panel). */
  revealRequest?: RevealRequest | null;
}

/**
 * The People tree as an indented list. Implements the WAI-ARIA tree view
 * pattern: one tab stop (roving tabindex); ↑/↓ move, → opens or goes to the
 * first child, ← closes or goes to the parent, Home/End, Enter/Space toggle.
 */
export default function OrgChartOutline({
  tree,
  companyName,
  currentUserId,
  collapsed: userCollapsed,
  onCollapsedChange,
  onOpenPerson,
  selectedEmployeeId = null,
  revealRequest = null,
}: OrgChartOutlineProps) {
  const items = useMemo(() => orgToGroupedItems(tree, companyName), [tree, companyName]);
  const parents = useMemo(() => parentMap(items), [items]);
  const fallback = useMemo(() => defaultCollapsed(items), [items]);
  const collapsed = userCollapsed ?? fallback;
  const rows = useMemo(() => visibleRows(items, collapsed), [items, collapsed]);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const activeId =
    focusedId && rows.some((r) => r.item.id === focusedId) ? focusedId : (rows[0]?.item.id ?? null);

  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const pendingFocus = useRef<{ id: string; scroll: boolean; focus: boolean } | null>(null);

  // Move DOM focus after the rows for it exist (e.g. after expanding ancestors).
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const el = rowRefs.current.get(pending.id);
    if (!el) return;
    pendingFocus.current = null;
    if (pending.focus) el.focus({ preventScroll: true });
    if (pending.scroll) el.scrollIntoView?.({ block: 'center' });
    else el.scrollIntoView?.({ block: 'nearest' });
  }, [rows, activeId]);

  const moveTo = useCallback((id: string, scroll = false, focus = true) => {
    setFocusedId(id);
    pendingFocus.current = { id, scroll, focus };
  }, []);

  const setOpen = useCallback(
    (id: string, open: boolean) => {
      const next = new Set(collapsed);
      if (open) next.delete(id);
      else next.add(id);
      onCollapsedChange(next);
    },
    [collapsed, onCollapsedChange],
  );

  // ── Search / Find me ──
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const reveal = useCallback(
    (id: string, focus = true) => {
      if (!parents.has(id)) return;
      const hiddenBy = ancestorIds(parents, id).filter((a) => collapsed.has(a));
      if (hiddenBy.length) {
        const next = new Set(collapsed);
        for (const a of hiddenBy) next.delete(a);
        onCollapsedChange(next);
      }
      moveTo(id, true, focus);
      setHighlightedId(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    },
    [parents, collapsed, onCollapsedChange, moveTo],
  );

  // Reveal on request without taking focus away from where the user is.
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  useEffect(() => {
    if (revealRequest) revealRef.current(revealRequest.id, false);
  }, [revealRequest]);

  const members = useMemo(() => [...tree.byId.values()].map((n) => n.member), [tree]);
  const meId = currentUserId != null ? personId(currentUserId) : null;
  const canFindMe = meId != null && parents.has(meId);

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>, row: OutlineRow, index: number) => {
    const id = row.item.id;
    switch (e.key) {
      case 'ArrowDown':
        if (rows[index + 1]) moveTo(rows[index + 1].item.id);
        break;
      case 'ArrowUp':
        if (rows[index - 1]) moveTo(rows[index - 1].item.id);
        break;
      case 'ArrowRight':
        if (row.hasChildren && !row.expanded) setOpen(id, true);
        else if (row.expanded && rows[index + 1]) moveTo(rows[index + 1].item.id);
        break;
      case 'ArrowLeft':
        if (row.expanded) setOpen(id, false);
        else if (row.parentId) moveTo(row.parentId);
        break;
      case 'Home':
        if (rows[0]) moveTo(rows[0].item.id);
        break;
      case 'End':
        if (rows.length) moveTo(rows[rows.length - 1].item.id);
        break;
      case 'Enter':
        // Enter opens a person's details; on a group box it toggles.
        if (row.item.type === 'person' && onOpenPerson) onOpenPerson(row.item.data.member.id);
        else if (row.hasChildren) setOpen(id, !row.expanded);
        break;
      case ' ':
        if (row.hasChildren) setOpen(id, !row.expanded);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const rootIds = new Set(items.map((i) => i.id));

  return (
    <div className="org-outline">
      <div className="org-outline__toolbar">
        <OrgChartSearch members={members} onSelect={(m) => reveal(personId(m.id))} />
        <div className="org-outline__actions">
          <button
            type="button"
            className="org-findme"
            title="Expand all"
            onClick={() => onCollapsedChange(new Set())}
          >
            <ChevronsUpDown size={16} aria-hidden="true" />
            <span className="org-btn-label">Expand all</span>
          </button>
          <button
            type="button"
            className="org-findme"
            title="Collapse all"
            onClick={() =>
              onCollapsedChange(new Set([...allParentIds(items)].filter((id) => !rootIds.has(id))))
            }
          >
            <ChevronsDownUp size={16} aria-hidden="true" />
            <span className="org-btn-label">Collapse all</span>
          </button>
          {canFindMe && (
            <button
              type="button"
              className="org-findme"
              title="Find me"
              onClick={() => reveal(meId)}
            >
              <LocateFixed size={16} aria-hidden="true" />
              <span className="org-btn-label">Find me</span>
            </button>
          )}
        </div>
      </div>

      <ul role="tree" aria-label="Org chart outline" className="org-outline__tree">
        {rows.map((row, index) => {
          const { item } = row;
          const isPerson = item.type === 'person';
          const isMe = isPerson && item.data.member.id === currentUserId;
          const label = isPerson
            ? [
                item.data.member.name,
                item.data.member.designation,
                visibleDepartment(item.data.member, true),
                reportsLabel(item.data.directCount, item.data.totalCount),
              ]
                .filter(Boolean)
                .join(', ')
            : `${item.data.name}, ${item.data.summary}`;
          return (
            <li
              key={item.id}
              ref={(el) => {
                if (el) rowRefs.current.set(item.id, el);
                else rowRefs.current.delete(item.id);
              }}
              role="treeitem"
              aria-level={row.level}
              aria-posinset={row.posInSet}
              aria-setsize={row.setSize}
              aria-expanded={row.hasChildren ? row.expanded : undefined}
              aria-selected={item.id === activeId}
              aria-label={label}
              aria-haspopup={isPerson && onOpenPerson ? 'dialog' : undefined}
              tabIndex={item.id === activeId ? 0 : -1}
              className={[
                'org-outline__row',
                isMe && 'is-me',
                isPerson && onOpenPerson && 'is-clickable',
                isPerson && item.data.member.id === selectedEmployeeId && 'is-selected',
                highlightedId === item.id && 'is-highlight',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ '--level': row.level - 1 } as CSSProperties}
              onKeyDown={(e) => onKeyDown(e, row, index)}
              onClick={() => {
                setFocusedId(item.id);
                if (isPerson && onOpenPerson) onOpenPerson(item.data.member.id);
              }}
              onFocus={() => setFocusedId(item.id)}
            >
              <span
                className={`org-outline__chevron${row.expanded ? ' is-open' : ''}`}
                aria-hidden="true"
                onClick={(e) => {
                  if (!row.hasChildren) return;
                  e.stopPropagation();
                  setFocusedId(item.id);
                  setOpen(item.id, !row.expanded);
                }}
              >
                {row.hasChildren && <ChevronRight size={16} />}
              </span>
              {isPerson ? (
                <>
                  <PersonAvatar
                    member={item.data.member}
                    className="org-card__avatar org-outline__avatar"
                  />
                  <span className="org-outline__text">
                    <span className="org-outline__name">
                      {item.data.member.name}
                      {isMe && <span className="org-card__me">You</span>}
                      {item.data.member.designation && (
                        <span className="org-outline__title">{item.data.member.designation}</span>
                      )}
                    </span>
                    <PersonFooter
                      member={item.data.member}
                      department={visibleDepartment(item.data.member, true)}
                      reports={reportsLabel(item.data.directCount, item.data.totalCount)}
                    />
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="org-card__avatar org-card__avatar--icon org-outline__avatar"
                    aria-hidden="true"
                  >
                    {item.data.variant === 'company' ? (
                      <Building2 size={16} />
                    ) : (
                      <Users size={16} />
                    )}
                  </span>
                  <span className="org-outline__text">
                    <span className="org-outline__name">{item.data.name}</span>
                    <span className="org-card__meta">{item.data.summary}</span>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
