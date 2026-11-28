'use client';

import { useState, useRef, useEffect } from 'react';
import { cn, ui } from './ui';

type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string; color: string; desc?: string }> = [
  { value: 'online',  label: 'Online',         color: '#23a55a' },
  { value: 'away',    label: 'Idle',           color: '#f0b232' },
  { value: 'dnd',     label: 'Do Not Disturb', color: '#f23f43', desc: 'You will not receive desktop notifications' },
  { value: 'offline', label: 'Invisible',      color: '#80848e', desc: 'You will appear offline' },
];

interface StatusSelectorProps {
  status: UserStatus;
  onChange: (status: UserStatus) => void;
}

export function StatusSelector({ status, onChange }: StatusSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        className={cn('flex size-8 items-center justify-center rounded transition-colors hover:bg-[#3d3e45]', open && 'bg-[#3d3e45]')}
        onClick={() => setOpen(p => !p)}
        title="Set status"
      >
        <span className="size-2.5 rounded-full" style={{ background: current.color }} />
      </button>

      {open && (
        <div className={cn(ui.floating, 'absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2')}>
          {STATUS_OPTIONS.map((opt, i) => (
            <div key={opt.value}>
              {i === 1 && <div className="mx-1 my-1 h-px bg-[#2e2f34]" />}
              <button
                className={cn(
                  'group flex w-full items-start gap-2.5 rounded px-2 py-1.5 text-left text-sm font-medium text-[#b5bac1] transition-colors hover:bg-[#5865f2] hover:text-white',
                  status === opt.value && 'text-[#f2f3f5]',
                )}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: opt.color }} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span>{opt.label}</span>
                  {opt.desc && <span className="text-xs font-normal text-[#949ba4] group-hover:text-white/80">{opt.desc}</span>}
                </span>
                {status === opt.value && <span className="text-xs">✓</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
