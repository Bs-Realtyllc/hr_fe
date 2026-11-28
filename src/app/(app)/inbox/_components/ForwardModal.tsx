'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, ModalShell, ui, cn } from './ui';

interface ForwardTarget {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  icon?: string;
}

interface ForwardModalProps {
  messageContent: string;
  channels: Array<{ id: string; name: string; type: string }>;
  dmConversations: Array<{ userId: string; userName: string }>;
  onForward: (targetId: string, targetType: 'channel' | 'dm') => Promise<void>;
  onClose: () => void;
}

export function ForwardModal({ messageContent, channels, dmConversations, onForward, onClose }: ForwardModalProps) {
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const targets: ForwardTarget[] = [
    ...channels
      .filter(c => c.type !== 'voice')
      .map(c => ({ id: c.id, name: `#${c.name}`, type: 'channel' as const, icon: c.type === 'announcement' ? '📢' : '#' })),
    ...dmConversations.map(d => ({ id: d.userId, name: d.userName, type: 'dm' as const, icon: '👤' })),
  ];

  const filtered = query.trim()
    ? targets.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
    : targets;

  async function forward(t: ForwardTarget) {
    setLoading(t.id);
    try {
      await onForward(t.id, t.type);
      onClose();
    } finally {
      setLoading(null);
    }
  }

  return (
    <ModalShell title="Forward To" subtitle="Select where you want to share this message." onClose={onClose}>
      <div className="px-4 pb-3">
        <input
          ref={inputRef}
          className={ui.input}
          placeholder="Search"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className={cn('flex max-h-[280px] flex-col gap-0.5 overflow-y-auto px-2 pb-3', ui.scroll)}>
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-[#949ba4]">No results</div>
        ) : filtered.map(t => (
          <button
            key={`${t.type}-${t.id}`}
            className={ui.listItem}
            onClick={() => forward(t)}
            disabled={loading === t.id}
          >
            {t.type === 'dm'
              ? <Avatar name={t.name} size="size-8" text="text-xs" />
              : <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1e1f22] text-base text-[#b5bac1]">{t.icon}</span>}
            <span className="truncate text-[15px] font-medium text-[#f2f3f5]">{t.name}</span>
            {loading === t.id && <span className="ml-auto text-xs text-[#949ba4]">Sending…</span>}
          </button>
        ))}
      </div>
      <div className="border-t border-[#3f4147] px-4 py-3">
        <div className="border-l-4 border-[#4e5058] pl-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">Message preview</div>
          <div className="mt-1 break-words text-sm text-[#dbdee1]">
            {messageContent.slice(0, 120)}{messageContent.length > 120 ? '…' : ''}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
