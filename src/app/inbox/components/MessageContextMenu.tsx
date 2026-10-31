'use client';

import { useEffect, useRef } from 'react';

export interface ContextAction {
  label: string;
  icon: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick: () => void;
}

interface MessageContextMenuProps {
  x: number;
  y: number;
  actions: ContextAction[];
  onClose: () => void;
}

export function MessageContextMenu({ x, y, actions, onClose }: MessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

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

  /* Keep menu inside viewport */
  const menuW = 200;
  const menuH = actions.length * 36 + 8;
  const left  = x + menuW  > window.innerWidth  ? x - menuW  : x;
  const top   = y + menuH  > window.innerHeight ? y - menuH  : y;

  return (
    <div
      ref={ref}
      className="inbox-context-menu"
      style={{ left, top }}
    >
      {actions.map((a, i) =>
        a.divider ? (
          <div key={`div-${i}`} className="inbox-context-menu-divider" />
        ) : (
          <button
            key={i}
            className={`inbox-context-menu-item${a.danger ? ' danger' : ''}${a.disabled ? ' disabled' : ''}`}
            onClick={() => { if (!a.disabled) { a.onClick(); onClose(); } }}
          >
            <span className="inbox-context-menu-icon">{a.icon}</span>
            {a.label}
          </button>
        )
      )}
    </div>
  );
}
