'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface ChipDropdownOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

// Same idiom as this app's other dropdowns (inbox/_components/ProfilePopover.tsx,
// StatusSelector.tsx): a trigger button + a fixed-position menu with coordinates
// computed from getBoundingClientRect, flipping to stay on-screen near an edge —
// no portal. Measuring and flipping happens in useLayoutEffect so it's resolved
// before paint, the same flicker-avoidance guarantee ProfilePopover relies on.
export default function ChipDropdown({
  value, options, onChange, trigger, disabled, menuWidth,
}: {
  value: string;
  options: ChipDropdownOption[];
  onChange: (value: string) => void;
  trigger: React.ReactNode;
  disabled?: boolean;
  menuWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
        disabled={disabled}
        onClick={e => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={menuRef}
          className="chip-dropdown-menu"
          style={{ position: 'fixed', left: pos.left, top: pos.top, minWidth: menuWidth }}
          onClick={e => e.stopPropagation()}
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              className={`chip-dropdown-item ${o.value === value ? 'active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
