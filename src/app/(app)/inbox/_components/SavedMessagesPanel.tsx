'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Avatar, cn, ui } from './ui';

interface SavedMessage {
  id: string;
  content: string;
  author_name: string;
  channel_name?: string;
  created_at: string;
}

interface SavedMessagesPanelProps {
  onClose: () => void;
  onJumpTo?: (channelId: string, messageId: string) => void;
}

/* Fills the main chat pane when "Saved Messages" is selected in the sidebar. */
export function SavedMessagesPanel({ onClose, onJumpTo }: SavedMessagesPanelProps) {
  const [saved, setSaved]     = useState<SavedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SavedMessage[]>('/inbox/saved')
      .then(data => setSaved(data))
      .catch(() => setSaved([]))
      .finally(() => setLoading(false));
  }, []);

  async function unsave(msgId: string) {
    try {
      await api.delete(`/inbox/messages/${msgId}/save`);
      setSaved(prev => prev.filter(s => s.id !== msgId));
    } catch {}
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto', ui.scroll)}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wide text-[#b5bac1]">Saved — {saved.length}</div>
          <button className="text-xs font-medium text-[#00a8fc] hover:underline" onClick={onClose}>Close</button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-[#949ba4]">Loading…</div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex size-24 items-center justify-center rounded-full bg-[#2b2d31] text-5xl">🔖</div>
            <div className="text-base font-semibold text-[#f2f3f5]">No saved messages</div>
            <div className="mt-1 text-sm text-[#b5bac1]">Right-click a message and choose “Save Message” to keep it here.</div>
          </div>
        ) : saved.map(s => (
          <div key={s.id} className="group relative flex gap-3 rounded-md bg-[#2b2d31] p-3 transition-colors hover:bg-[#2e3035]">
            <Avatar name={s.author_name} size="size-10" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-[#f2f3f5]">{s.author_name}</span>
                {s.channel_name && <span className="text-xs text-[#949ba4]">in #{s.channel_name}</span>}
                <span className="text-xs text-[#949ba4]">
                  {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-[#dbdee1]">
                {s.content.slice(0, 200)}{s.content.length > 200 ? '…' : ''}
              </div>
            </div>
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
              {onJumpTo && (
                <button className="rounded bg-[#1e1f22] px-2 py-0.5 text-xs font-medium text-[#dbdee1] hover:bg-[#404249]" onClick={() => {}}>Jump</button>
              )}
              <button className="rounded bg-[#1e1f22] px-2 py-0.5 text-xs font-medium text-[#f23f43] hover:bg-[#da373c] hover:text-white" onClick={() => unsave(s.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
