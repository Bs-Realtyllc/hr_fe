'use client';

import { useState, useRef, useEffect } from 'react';
import type { Role } from '@/types';
import { ModalShell, ui, cn } from './ui';

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
    required_role: Role;
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
  const [requiredRole, setRequiredRole] = useState<Role>('intern');
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
  const categoryName = categories.find(c => c.id === categoryId)?.name;

  return (
    <ModalShell title="Create Channel" subtitle={categoryName ? `in ${categoryName}` : undefined} onClose={onClose} maxW="max-w-[460px]">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <div className={cn(ui.modalBody, ui.scroll)}>
          {/* Type selector */}
          <div>
            <label className={ui.label}>Channel Type</label>
            <div className="flex flex-col gap-2">
              {(['text', 'voice', 'announcement'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    'flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-left transition-colors',
                    type === t ? 'bg-[#404249]' : 'bg-[#2b2d31] hover:bg-[#35373c]',
                  )}
                  onClick={() => setType(t)}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center text-xl text-[#b5bac1]">{typeIcon[t]}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-medium text-[#f2f3f5]">
                      {t === 'text' ? 'Text' : t === 'voice' ? 'Voice' : 'Announcement'}
                    </span>
                    <span className="text-sm text-[#b5bac1]">
                      {t === 'text'
                        ? 'Send messages, images, GIFs, emoji, opinions, and puns'
                        : t === 'voice'
                        ? 'Hang out together with voice, video, and screen share'
                        : 'Post important company updates (admin/lead only)'}
                    </span>
                  </span>
                  <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2', type === t ? 'border-[#f2f3f5]' : 'border-[#b5bac1]')}>
                    {type === t && <span className="size-2.5 rounded-full bg-[#f2f3f5]" />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className={ui.label}>Category</label>
              <select
                className={cn(ui.input, 'cursor-pointer')}
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
          <div>
            <label className={ui.label}>Channel Name</label>
            <div className="flex items-center gap-1.5 rounded-[3px] bg-[#1e1f22] pl-2.5">
              <span className="text-lg text-[#b5bac1]">
                {type === 'voice' ? '🔊' : type === 'announcement' ? '📢' : '#'}
              </span>
              <input
                ref={inputRef}
                className={cn(ui.input, 'pl-1')}
                type="text"
                placeholder="new-channel"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            {name && (
              <div className={ui.hint}>
                Will be created as: <strong className="text-[#dbdee1]">{slugify(name) || '…'}</strong>
              </div>
            )}
          </div>

          {/* Description */}
          {type !== 'voice' && (
            <div>
              <label className={ui.label}>Description <span className="normal-case opacity-60">(optional)</span></label>
              <input
                className={ui.input}
                type="text"
                placeholder="What is this channel about?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>
          )}

          {/* Access */}
          <div>
            <label className={ui.label}>Who can access?</label>
            <select
              className={cn(ui.input, 'cursor-pointer')}
              value={requiredRole}
              onChange={e => setRequiredRole(e.target.value as typeof requiredRole)}
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Private channel toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-base font-medium text-[#f2f3f5]">🔒 Private Channel</div>
              <div className="mt-0.5 text-sm text-[#b5bac1]">Only selected members and roles will be able to view this channel.</div>
            </div>
            <label className="relative inline-block h-6 w-10 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-[#80848e] transition-colors peer-checked:bg-[#23a55a]" />
              <span className="absolute left-[3px] top-[3px] size-[18px] rounded-full bg-white transition-transform peer-checked:translate-x-4" />
            </label>
          </div>

          {error && <div className="text-sm text-[#fa777c]">{error}</div>}
        </div>

        <div className={ui.modalFoot}>
          <button type="button" className={ui.btnLink} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={loading || !name.trim()}>
            {loading ? 'Creating…' : 'Create Channel'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
