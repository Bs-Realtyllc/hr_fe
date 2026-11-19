'use client';

import { useState, useRef, useEffect } from 'react';

type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string; color: string }> = [
  { value: 'online',  label: 'Online',          color: '#23a55a' },
  { value: 'away',    label: 'Away',             color: '#f0b232' },
  { value: 'dnd',     label: 'Do Not Disturb',   color: '#f23f43' },
  { value: 'offline', label: 'Invisible',         color: '#80848e' },
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="inbox-status-trigger"
        onClick={() => setOpen(p => !p)}
        title="Set status"
      >
        <span className="inbox-status-dot-btn" style={{ background: current.color }} />
      </button>

      {open && (
        <div className="inbox-status-menu">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`inbox-status-option${status === opt.value ? ' active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span className="inbox-status-dot-btn" style={{ background: opt.color }} />
              <span>{opt.label}</span>
              {status === opt.value && <span style={{ marginLeft: 'auto', opacity: 0.7 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
