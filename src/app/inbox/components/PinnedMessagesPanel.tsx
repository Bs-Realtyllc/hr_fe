'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

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
    <div className="inbox-side-panel">
      <div className="inbox-side-panel-header">
        <span>📌 Pinned Messages</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>#{channelName}</span>
        <button className="inbox-modal-close" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
      </div>

      <div className="inbox-side-panel-body">
        {loading ? (
          <div className="inbox-side-panel-empty">Loading…</div>
        ) : pins.length === 0 ? (
          <div className="inbox-side-panel-empty">
            <div style={{ fontSize: 32, marginBottom: 8 }}>📌</div>
            <div>No pinned messages yet.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Pin important messages to find them here.</div>
          </div>
        ) : pins.map(p => (
          <div key={p.id} className="inbox-pinned-item">
            <div className="inbox-pinned-item-header">
              <strong>{p.author_name}</strong>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="inbox-pinned-item-content">
              {p.content.slice(0, 200)}{p.content.length > 200 ? '…' : ''}
            </div>
            <div className="inbox-pinned-item-actions">
              {onJumpTo && (
                <button className="inbox-pinned-btn" onClick={() => onJumpTo(p.id)}>Jump to</button>
              )}
              {canPin && (
                <button className="inbox-pinned-btn danger" onClick={() => unpin(p.id)}>Unpin</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
