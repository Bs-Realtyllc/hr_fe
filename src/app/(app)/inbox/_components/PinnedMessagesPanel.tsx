'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Avatar, cn, ui } from './ui';

interface PinnedMessage {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  pinned_by?: string;
}

interface PinnedMessagesPanelProps {
  channelId: string;
  channelName: string;
  canPin: boolean;
  onClose: () => void;
  onJumpTo?: (messageId: string) => void;
}

export function PinnedMessagesPanel({ channelId, channelName, canPin, onClose, onJumpTo }: PinnedMessagesPanelProps) {
  const [pins, setPins]       = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PinnedMessage[]>(`/inbox/channels/${channelId}/pins`)
      .then(data => setPins(data))
      .catch(() => setPins([]))
      .finally(() => setLoading(false));
  }, [channelId]);

  async function unpin(msgId: string) {
    try {
      await api.delete(`/inbox/messages/${msgId}/pin`);
      setPins(prev => prev.filter(p => p.id !== msgId));
    } catch {}
  }

  return (
    <div className="absolute right-2 top-[52px] z-30 flex max-h-[min(640px,calc(100%-64px))] w-[420px] max-w-[calc(100%-16px)] flex-col overflow-hidden rounded-lg bg-[#2b2d31] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
      <div className="flex h-12 shrink-0 items-center gap-2 bg-[#1e1f22] px-4">
        <span className="text-base font-semibold text-[#f2f3f5]">Pinned Messages</span>
        <span className="truncate text-xs text-[#949ba4]">#{channelName}</span>
        <button className={cn(ui.closeBtn, 'ml-auto')} onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className={cn('flex flex-col gap-2 overflow-y-auto p-3', ui.scroll)}>
        {loading ? (
          <div className="py-10 text-center text-sm text-[#949ba4]">Loading…</div>
        ) : pins.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-[#1e1f22] text-4xl">📌</div>
            <div className="text-base font-semibold text-[#f2f3f5]">This channel doesn&apos;t have any pinned messages… yet.</div>
            <div className="mt-1 text-sm text-[#b5bac1]">Pin important messages to find them here.</div>
          </div>
        ) : pins.map(p => (
          <div key={p.id} className="group relative flex gap-3 rounded-md border border-[#1e1f22] bg-[#313338] p-3">
            <Avatar name={p.author_name} size="size-10" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate font-medium text-[#f2f3f5]">{p.author_name}</span>
                <span className="text-xs text-[#949ba4]">
                  {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-[#dbdee1]">
                {p.content.slice(0, 200)}{p.content.length > 200 ? '…' : ''}
              </div>
            </div>
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
              {onJumpTo && (
                <button className="rounded bg-[#1e1f22] px-2 py-0.5 text-xs font-medium text-[#dbdee1] hover:bg-[#404249]" onClick={() => onJumpTo(p.id)}>Jump</button>
              )}
              {canPin && (
                <button className="rounded bg-[#1e1f22] px-2 py-0.5 text-xs font-medium text-[#f23f43] hover:bg-[#da373c] hover:text-white" onClick={() => unpin(p.id)} title="Unpin">✕</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
