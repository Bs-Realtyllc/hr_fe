'use client';

import { useEffect, useRef } from 'react';

interface Employee {
  id: string;
  name: string;
  designation?: string;
}

interface MentionAutocompleteProps {
  query: string;
  employees: Employee[];
  onSelect: (name: string) => void;
  onClose: () => void;
  anchorEl: HTMLTextAreaElement | null;
}

const SPECIAL = [
  { id: '__everyone', name: 'everyone', designation: 'Notify all channel members' },
  { id: '__here',     name: 'here',     designation: 'Notify online members only'  },
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function MentionAutocomplete({ query, employees, onSelect, onClose, anchorEl }: MentionAutocompleteProps) {
  const ref  = useRef<HTMLDivElement>(null);
  const lq   = query.toLowerCase();

  const specials = SPECIAL.filter(s => s.name.startsWith(lq));
  const matches  = employees
    .filter(e => e.name.toLowerCase().includes(lq))
    .slice(0, 8);

  const all = [...specials, ...matches];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) && e.target !== anchorEl) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorEl]);

  /* Position above the textarea */
  const style: React.CSSProperties = { position: 'absolute', bottom: '100%', left: 0, right: 0 };

  if (all.length === 0) return null;

  return (
    <div ref={ref} className="inbox-mention-list" style={style}>
      <div className="inbox-mention-list-header">Mentions</div>
      {all.map(e => (
        <button
          key={e.id}
          className="inbox-mention-list-item"
          onMouseDown={ev => { ev.preventDefault(); onSelect(e.name); }}
        >
          <div className="inbox-mention-av">
            {e.id.startsWith('__') ? (e.name === 'everyone' ? '👥' : '🟢') : initials(e.name)}
          </div>
          <div className="inbox-mention-info">
            <span className="inbox-mention-name">@{e.name}</span>
            {e.designation && <span className="inbox-mention-desc">{e.designation}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Utility: parse current @-query from textarea ──────────── */
export function getMentionQuery(el: HTMLTextAreaElement): string | null {
  const val    = el.value;
  const cursor = el.selectionStart ?? val.length;
  const before = val.slice(0, cursor);
  const match  = before.match(/@(\w*)$/);
  return match ? match[1] : null;
}

/* ── Utility: replace current @-query with chosen name ─────── */
export function applyMention(el: HTMLTextAreaElement, name: string): string {
  const val    = el.value;
  const cursor = el.selectionStart ?? val.length;
  const before = val.slice(0, cursor).replace(/@(\w*)$/, `@${name} `);
  return before + val.slice(cursor);
}
