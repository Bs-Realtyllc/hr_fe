'use client';

import { useEffect, useRef } from 'react';
import { cn, ui } from './ui';

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
  const menuH = actions.length * 34 + 12;
  // Flip left/up when it would overflow, then clamp so it never starts off-screen
  // (on a phone a long-press mid-screen can't fit the menu above or below).
  const margin = 8;
  const flippedLeft = x + menuW > window.innerWidth  ? x - menuW : x;
  const flippedTop  = y + menuH > window.innerHeight ? y - menuH : y;
  const left = Math.max(margin, Math.min(flippedLeft, window.innerWidth  - menuW - margin));
  const top  = Math.max(margin, Math.min(flippedTop,  window.innerHeight - menuH - margin));

  return (
    <div ref={ref} className={cn(ui.floating, 'fixed z-[1100] w-[200px]')} style={{ left, top }}>
      {actions.map((a, i) =>
        a.divider ? (
          <div key={`div-${i}`} className="mx-1 my-1 h-px bg-[#2e2f34]" />
        ) : (
          <button
            key={i}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-[3px] px-2 py-1.5 text-left text-sm font-medium transition-colors',
              a.danger ? 'text-[#f23f43] hover:bg-[#da373c] hover:text-white' : 'text-[#b5bac1] hover:bg-[#5865f2] hover:text-white',
              a.disabled && 'pointer-events-none opacity-50',
            )}
            onClick={() => { if (!a.disabled) { a.onClick(); onClose(); } }}
          >
            <span>{a.label}</span>
            <span className="w-5 text-center text-sm leading-none">{a.icon}</span>
          </button>
        )
      )}
    </div>
  );
}
