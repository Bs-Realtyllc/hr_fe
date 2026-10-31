'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

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
    <div className="inbox-side-panel">
      <div className="inbox-side-panel-header">
        <span>🔖 Saved Messages</span>
        <button className="inbox-modal-close" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
      </div>
      <div className="inbox-side-panel-body">
        {loading ? (
          <div className="inbox-side-panel-empty">Loading…</div>
        ) : saved.length === 0 ? (
          <div className="inbox-side-panel-empty">
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔖</div>
            <div>No saved messages.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Save messages to reference them later.</div>
          </div>
        ) : saved.map(s => (
          <div key={s.id} className="inbox-pinned-item">
            <div className="inbox-pinned-item-header">
              <strong>{s.author_name}</strong>
              {s.channel_name && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>#{s.channel_name}</span>}
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="inbox-pinned-item-content">
              {s.content.slice(0, 200)}{s.content.length > 200 ? '…' : ''}
            </div>
            <div className="inbox-pinned-item-actions">
              {onJumpTo && (
                <button className="inbox-pinned-btn" onClick={() => {}}>Go to message</button>
              )}
              <button className="inbox-pinned-btn danger" onClick={() => unsave(s.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
