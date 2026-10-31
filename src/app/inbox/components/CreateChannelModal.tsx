'use client';

import { useState, useRef, useEffect } from 'react';

interface Category {
  id: number;
  name: string;
  position: number;
}

interface CreateChannelModalProps {
  categories: Category[];
  onClose: () => void;
  onCreate: (data: {
    name: string;
    type: 'text' | 'voice' | 'announcement';
    description: string;
    required_role: 'admin' | 'lead' | 'employee' | 'intern';
    category_id?: number;
    is_private?: boolean;
  }) => Promise<void>;
}

const ROLE_OPTIONS = [
  { value: 'intern',   label: 'Everyone (including interns)' },
  { value: 'employee', label: 'Employees & above' },
  { value: 'lead',     label: 'Leads & admins only' },
  { value: 'admin',    label: 'Admins only' },
] as const;

export function CreateChannelModal({ categories, onClose, onCreate }: CreateChannelModalProps) {
  const [name, setName]               = useState('');
  const [type, setType]               = useState<'text' | 'voice' | 'announcement'>('text');
  const [description, setDescription] = useState('');
  const [requiredRole, setRequiredRole] = useState<'admin' | 'lead' | 'employee' | 'intern'>('intern');
  const [categoryId, setCategoryId]   = useState<number | undefined>(categories[0]?.id);
  const [isPrivate, setIsPrivate]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const inputRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (categories.length > 0 && !categoryId) setCategoryId(categories[0].id); }, [categories]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function slugify(v: string) {
    return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(name).trim();
    if (!slug) { setError('Channel name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      await onCreate({
        name: slug,
        type,
        description,
        required_role: requiredRole,
        category_id: categoryId,
        is_private: isPrivate,
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  }

  const typeIcon = { text: '#', voice: '🔊', announcement: '📢' };

  return (
    <div className="inbox-modal-overlay" onClick={onClose}>
      <div className="inbox-modal" onClick={e => e.stopPropagation()}>
        <div className="inbox-modal-header">
          <span className="inbox-modal-title">Create Channel</span>
          <button className="inbox-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="inbox-modal-body">
          {/* Type selector */}
          <div className="inbox-modal-field">
            <label className="inbox-modal-label">Channel Type</label>
            <div className="inbox-type-grid">
              {(['text', 'voice', 'announcement'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`inbox-type-card${type === t ? ' selected' : ''}`}
                  onClick={() => setType(t)}
                >
                  <span className="inbox-type-card-icon">{typeIcon[t]}</span>
                  <span className="inbox-type-card-label">
                    {t === 'text' ? 'Text Channel' : t === 'voice' ? 'Voice Channel' : 'Announcement'}
                  </span>
                  <span className="inbox-type-card-desc">
                    {t === 'text'
                      ? 'Post messages, share files'
                      : t === 'voice'
                      ? 'Hang out with voice & video'
                      : 'Post important company updates (admin/lead only)'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div className="inbox-modal-field">
              <label className="inbox-modal-label">Category</label>
              <select
                className="inbox-modal-select"
                value={categoryId ?? ''}
                onChange={e => setCategoryId(Number(e.target.value))}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div className="inbox-modal-field">
            <label className="inbox-modal-label">Channel Name</label>
            <div className="inbox-modal-name-wrap">
              <span className="inbox-modal-name-prefix">
                {type === 'voice' ? '🔊' : type === 'announcement' ? '📢' : '#'}
              </span>
              <input
                ref={inputRef}
                className="inbox-modal-input"
                type="text"
                placeholder="e.g. design-feedback"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            {name && (
              <div className="inbox-modal-hint">
                Will be created as: <strong>{slugify(name) || '…'}</strong>
              </div>
            )}
          </div>

          {/* Description */}
          {type !== 'voice' && (
            <div className="inbox-modal-field">
              <label className="inbox-modal-label">Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <input
                className="inbox-modal-input"
                type="text"
                placeholder="What is this channel about?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>
          )}

          {/* Access */}
          <div className="inbox-modal-field">
            <label className="inbox-modal-label">Who can access?</label>
            <select
              className="inbox-modal-select"
              value={requiredRole}
              onChange={e => setRequiredRole(e.target.value as typeof requiredRole)}
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Private channel toggle */}
          <div className="inbox-modal-field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="inbox-modal-label" style={{ marginBottom: 2 }}>Private Channel</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Only invited members can see and join
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 99,
                background: isPrivate ? 'var(--color-primary)' : 'var(--color-border)',
                cursor: 'pointer', transition: 'background 0.2s',
              }}>
                <span style={{
                  position: 'absolute', top: 3, left: isPrivate ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </span>
            </label>
          </div>

          {error && <div className="inbox-modal-error">{error}</div>}

          <div className="inbox-modal-footer">
            <button type="button" className="inbox-modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="inbox-modal-btn-primary" disabled={loading || !name.trim()}>
              {loading ? 'Creating…' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
