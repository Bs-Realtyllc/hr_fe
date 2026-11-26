'use client';
import { Search } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { OrgChartMember } from '../types';
import { initials } from '../utils/person';
import { searchMembers } from '../utils/search';

export interface OrgChartSearchProps {
  members: readonly OrgChartMember[];
  onSelect: (member: OrgChartMember) => void;
}

/**
 * "Find a person or title" box with a suggestion list. Follows the WAI-ARIA
 * combobox pattern: ↑/↓ move, Enter picks, Esc closes then clears.
 */
export default function OrgChartSearch({ members, onSelect }: OrgChartSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => searchMembers(members, query), [members, query]);
  const showList = open && query.trim().length > 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const pick = (m: OrgChartMember) => {
    setQuery(m.name);
    setOpen(false);
    onSelect(m);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        if (results.length) setActive((i) => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (results.length) setActive((i) => (i - 1 + results.length) % results.length);
        break;
      case 'Enter':
        if (showList && results[active]) {
          e.preventDefault();
          pick(results[active]);
        }
        break;
      case 'Escape':
        if (showList) setOpen(false);
        else setQuery('');
        break;
    }
  };

  return (
    <div className="org-search nodrag nopan nowheel">
      <Search className="org-search__icon" size={16} aria-hidden="true" />
      <input
        type="search"
        className="org-search__input"
        placeholder="Find a person or title"
        aria-label="Find a person or title"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? optionId(active) : undefined}
        value={query}
        maxLength={100}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul id={listId} role="listbox" className="org-search__list" aria-label="Matching people">
          {results.length === 0 ? (
            <li className="org-search__empty" role="presentation">
              No one matches “{query.trim()}”
            </li>
          ) : (
            results.map((m, i) => (
              <li
                key={m.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={`org-search__option${i === active ? ' is-active' : ''}`}
                // mousedown, not click: fires before the input's blur closes the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(m);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="org-card__avatar org-search__avatar" aria-hidden="true">
                  {initials(m.name)}
                </span>
                <span className="org-search__text">
                  <span className="org-search__name">{m.name}</span>
                  {m.designation && <span className="org-search__title">{m.designation}</span>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
