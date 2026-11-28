'use client';

import { useState, useEffect, useRef } from 'react';
import type { EmployeeSummary as Employee } from '@/types';
import { Avatar, ModalShell, ui, cn } from './ui';


interface NewDmModalProps {
  employees: Employee[];
  onClose: () => void;
  onSelect: (employee: Employee) => void;
}

export function NewDmModal({ employees, onClose, onSelect }: NewDmModalProps) {
  const [query, setQuery]   = useState('');
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = query.trim()
    ? employees.filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        (e.designation ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : employees.slice(0, 20);

  return (
    <ModalShell title="Select Friends" subtitle="Start a direct message with a teammate." onClose={onClose}>
      <div className="px-4 pb-3">
        <input
          ref={inputRef}
          className={ui.input}
          type="text"
          placeholder="Type the name of a teammate"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className={cn('flex max-h-[320px] flex-col gap-0.5 overflow-y-auto px-2 pb-3', ui.scroll)}>
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-[#949ba4]">No employees found</div>
        ) : filtered.map(emp => (
          <button
            key={emp.id}
            className={ui.listItem}
            onClick={() => { onSelect(emp); onClose(); }}
          >
            <Avatar name={emp.name} size="size-8" text="text-xs" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-medium text-[#f2f3f5]">{emp.name}</span>
              {emp.designation && <span className="truncate text-xs text-[#949ba4]">{emp.designation}</span>}
            </div>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
