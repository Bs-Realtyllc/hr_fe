'use client';
import { useEffect, useRef, useState } from 'react';

interface Option {
  id: number;
  name: string;
}

interface MultiSelectProps {
  options: Option[];
  value: number[];
  onChange: (ids: number[]) => void;
  /** Ids that can't be picked here (e.g. already chosen in another field). */
  excludeIds?: number[];
  placeholder?: string;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  excludeIds = [],
  placeholder = 'None',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const available = options.filter((o) => !excludeIds.includes(o.id));
  const selected = options.filter((o) => value.includes(o.id));

  const toggle = (id: number) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-left text-sm"
      >
        <span className={selected.length ? '' : 'text-[var(--color-text-muted)]'}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-[var(--color-border)] bg-white py-1 shadow-lg">
          {available.length === 0 && (
            <li className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No people available</li>
          )}
          {available.map((o) => (
            <li key={o.id}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-black/5">
                <input
                  type="checkbox"
                  checked={value.includes(o.id)}
                  onChange={() => toggle(o.id)}
                />
                {o.name}
              </label>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-0.5 text-xs"
            >
              {o.name}
              <button
                type="button"
                aria-label={`Remove ${o.name}`}
                onClick={() => toggle(o.id)}
                className="leading-none hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}