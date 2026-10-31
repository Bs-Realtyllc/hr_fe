'use client';

import { useState, useEffect, useRef } from 'react';

interface Employee {
  id: number;
  name: string;
  designation?: string;
  status?: string;
}

interface NewDmModalProps {
  employees: Employee[];
  onClose: () => void;
  onSelect: (employee: Employee) => void;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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
    <div className="inbox-modal-overlay" onClick={onClose}>
      <div className="inbox-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="inbox-modal-header">
          <span className="inbox-modal-title">Open Direct Message</span>
          <button className="inbox-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="inbox-modal-body">
          <div className="inbox-modal-field">
            <div className="inbox-modal-name-wrap">
              <span className="inbox-modal-name-prefix" style={{ fontSize: 15 }}>🔍</span>
              <input
                ref={inputRef}
                className="inbox-modal-input"
                type="text"
                placeholder="Search employees…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="inbox-dm-search-list">
            {filtered.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No employees found
              </div>
            ) : filtered.map(emp => (
              <button
                key={emp.id}
                className="inbox-dm-search-item"
                onClick={() => { onSelect(emp); onClose(); }}
              >
                <div className="inbox-member-av" style={{ flexShrink: 0 }}>
                  {initials(emp.name)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</span>
                  {emp.designation && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{emp.designation}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
