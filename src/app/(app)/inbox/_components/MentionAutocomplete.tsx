'use client';

import { useEffect, useRef } from 'react';
import { avatarColor, initials } from './ui';

// A channel member that can be @-mentioned (string ids come from the inbox service).
interface MentionMember {
  id: string;
  name: string;
  designation?: string;
}

interface MentionAutocompleteProps {
  query: string;
  employees: MentionMember[];
  onSelect: (name: string) => void;
  onClose: () => void;
  anchorEl: HTMLTextAreaElement | null;
}

const SPECIAL = [
  { id: '__everyone', name: 'everyone', designation: 'Notify all channel members' },
  { id: '__here',     name: 'here',     designation: 'Notify online members only'  },
];

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

  if (all.length === 0) return null;

  /* Positioned above the composer */
  return (
    <div ref={ref} className="absolute inset-x-0 bottom-[calc(100%+8px)] z-30 max-h-[320px] overflow-y-auto rounded-lg bg-[#2b2d31] p-2 shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
      <div className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-[#b5bac1]">Members</div>
      {all.map(e => {
        const special = e.id.startsWith('__');
        return (
          <button
            key={e.id}
            className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left transition-colors hover:bg-[#35373c]"
            onMouseDown={ev => { ev.preventDefault(); onSelect(e.name); }}
          >
            <div
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ background: special ? '#5865f2' : avatarColor(e.name) }}
            >
              {special ? '@' : initials(e.name)}
            </div>
            <span className="truncate text-[15px] font-medium text-[#f2f3f5]">{special ? `@${e.name}` : e.name}</span>
            {e.designation && <span className="ml-auto truncate text-xs text-[#949ba4]">{e.designation}</span>}
          </button>
        );
      })}
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
