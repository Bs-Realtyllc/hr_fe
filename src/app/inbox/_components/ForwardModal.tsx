'use client';

import { useState, useRef, useEffect } from 'react';

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
    <div className="inbox-modal-overlay" onClick={onClose}>
      <div className="inbox-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="inbox-modal-header">
          <span className="inbox-modal-title">Forward Message</span>
          <button className="inbox-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="inbox-modal-body">
          <div className="inbox-forward-preview">
            <div className="inbox-forward-preview-label">Message preview</div>
            <div className="inbox-forward-preview-text">
              {messageContent.slice(0, 120)}{messageContent.length > 120 ? '…' : ''}
            </div>
          </div>
          <div className="inbox-modal-field">
            <div className="inbox-modal-name-wrap">
              <span className="inbox-modal-name-prefix" style={{ fontSize: 15 }}>🔍</span>
              <input
                ref={inputRef}
                className="inbox-modal-input"
                placeholder="Search channels or people…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="inbox-dm-search-list">
            {filtered.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No results</div>
            ) : filtered.map(t => (
              <button
                key={`${t.type}-${t.id}`}
                className="inbox-dm-search-item"
                onClick={() => forward(t)}
                disabled={loading === t.id}
              >
                <span style={{ fontSize: 16, width: 28, textAlign: 'center', flexShrink: 0 }}>{t.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                {loading === t.id && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>Sending…</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
