'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Filter, X } from 'lucide-react';
import {
  IssueFilters as Filters, IssueLabel, Module, ProjectMember,
  STATUS_OPTIONS, STATUS_LABEL, PRIORITY_OPTIONS, PRIORITY_LABEL, TYPE_OPTIONS, TYPE_LABEL,
  filterCount, EMPTY_FILTERS,
} from './types';
import { StatusDot, PriorityIcon, TypeIcon } from './issue-icons';

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="text-muted" style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</p>
      <div className="flex items-center gap-1 flex-wrap">{children}</div>
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pill ${active ? 'pill-active' : ''}`}
      style={{ gap: 5, padding: '3px 9px', fontSize: 12 }}
    >
      {children}
    </button>
  );
}

// Same no-portal, fixed-position idiom as ChipDropdown — a wider panel with
// several sections instead of one flat option list, since narrowing the
// board by several fields at once is the point (unlike ChipDropdown, which
// only ever sets one field on one issue).
export default function IssueFilters({
  filters, onChange, members, labels, modules,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  members: ProjectMember[];
  labels: IssueLabel[];
  modules: Module[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = filterCount(filters);

  useLayoutEffect(() => {
    if (!open) return;
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;
    const margin = 8;
    const triggerRect = triggerEl.getBoundingClientRect();
    const menuRect = menuEl.getBoundingClientRect();

    let left = triggerRect.left;
    if (left + menuRect.width > window.innerWidth - margin) left = window.innerWidth - menuRect.width - margin;
    if (left < margin) left = margin;

    let top = triggerRect.bottom + 4;
    if (top + menuRect.height > window.innerHeight - margin) top = triggerRect.top - menuRect.height - 4;
    if (top < margin) top = margin;

    setPos({ left, top });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="chip-trigger"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 12, fontWeight: 500 }}
      >
        <Filter size={13} />
        Filter
        {active > 0 && <span className="badge badge-accent" style={{ fontSize: 10, padding: '1px 6px' }}>{active}</span>}
      </button>
      {open && (
        <div
          ref={menuRef}
          className="chip-dropdown-menu"
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: 280, padding: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Section label="Status">
            {STATUS_OPTIONS.map((s) => (
              <Toggle key={s} active={filters.status.includes(s)} onClick={() => onChange({ ...filters, status: toggle(filters.status, s) })}>
                <StatusDot status={s} />{STATUS_LABEL[s]}
              </Toggle>
            ))}
          </Section>
          <Section label="Priority">
            {PRIORITY_OPTIONS.map((p) => (
              <Toggle key={p} active={filters.priority.includes(p)} onClick={() => onChange({ ...filters, priority: toggle(filters.priority, p) })}>
                <PriorityIcon priority={p} color="currentColor" />{PRIORITY_LABEL[p]}
              </Toggle>
            ))}
          </Section>
          <Section label="Type">
            {TYPE_OPTIONS.map((t) => (
              <Toggle key={t} active={filters.type.includes(t)} onClick={() => onChange({ ...filters, type: toggle(filters.type, t) })}>
                <TypeIcon type={t} />{TYPE_LABEL[t]}
              </Toggle>
            ))}
          </Section>
          {members.length > 0 && (
            <Section label="Assignee">
              {members.map((m) => (
                <Toggle
                  key={m.employee_id}
                  active={filters.assignee.includes(String(m.employee_id))}
                  onClick={() => onChange({ ...filters, assignee: toggle(filters.assignee, String(m.employee_id)) })}
                >
                  {m.name}
                </Toggle>
              ))}
              <Toggle active={filters.assignee.includes('unassigned')} onClick={() => onChange({ ...filters, assignee: toggle(filters.assignee, 'unassigned') })}>
                Unassigned
              </Toggle>
            </Section>
          )}
          {labels.length > 0 && (
            <Section label="Label">
              {labels.map((l) => (
                <Toggle key={l.id} active={filters.label.includes(l.id)} onClick={() => onChange({ ...filters, label: toggle(filters.label, l.id) })}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                  {l.name}
                </Toggle>
              ))}
            </Section>
          )}
          {modules.length > 0 && (
            <Section label="Module">
              {modules.map((m) => (
                <Toggle key={m.id} active={filters.module.includes(m.id)} onClick={() => onChange({ ...filters, module: toggle(filters.module, m.id) })}>
                  {m.name}
                </Toggle>
              ))}
            </Section>
          )}
          {active > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="flex items-center gap-1 text-sm"
              style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
            >
              <X size={13} /> Clear all filters
            </button>
          )}
        </div>
      )}
    </>
  );
}
