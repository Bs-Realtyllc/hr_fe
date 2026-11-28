'use client';

/*
 * Shared Tailwind primitives for the Discord-style inbox.
 *
 * Palette (Discord dark):
 *   #1e1f22  tertiary bg (inputs, deepest surfaces)
 *   #232428  user panel
 *   #2b2d31  secondary bg (channel list, members list, modal footers)
 *   #313338  primary bg (chat, modals)
 *   #383a40  chat composer
 *   #404249  selected item
 *   #111214  floating surfaces (menus, popovers, tooltips)
 *   #f2f3f5 header text · #dbdee1 normal text · #b5bac1 interactive · #949ba4 muted
 *   #5865f2  brand (blurple) · #23a55a green · #f0b232 yellow · #f23f43 red
 */

import type { ReactNode } from 'react';

export type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

export const STATUS_COLOR: Record<UserStatus, string> = { online: '#23a55a', away: '#f0b232', dnd: '#f23f43', offline: '#80848e' };

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function initials(n: string) {
  return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function avatarColor(seed: string) {
  return `hsl(${((seed || '?').charCodeAt(0) * 37) % 360}, 45%, 42%)`;
}

/** Mask-based SVG icon tinted with the current text colour. */
export function Icon({ src, className = 'size-5' }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 bg-current mask-no-repeat mask-center mask-contain', className)}
      style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }}
    />
  );
}

/** Round avatar with initials, optional presence dot cut out of the parent surface. */
export function Avatar({
  name, size = 'size-10', text = 'text-sm', status, dot = 'size-3.5 border-[3px]', ring = 'border-[#2b2d31]', className, onClick, title,
}: {
  name: string; size?: string; text?: string; status?: UserStatus; dot?: string; ring?: string; className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; title?: string;
}) {
  return (
    <div
      className={cn('relative flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white', size, text, onClick && 'cursor-pointer', className)}
      style={{ background: avatarColor(name) }}
      onClick={onClick}
      title={title}
    >
      {initials(name)}
      {status && (
        <span
          className={cn('absolute -bottom-0.5 -right-0.5 box-content rounded-full', dot, ring)}
          style={{ background: STATUS_COLOR[status] }}
        />
      )}
    </div>
  );
}

/* ── Shared class strings ──────────────────────────────────── */

export const ui = {
  overlay:   'fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 transition-opacity duration-150 starting:opacity-0',
  modal:     'flex max-h-[calc(100vh-32px)] w-full flex-col overflow-hidden rounded-lg bg-[#313338] text-[#dbdee1] shadow-2xl transition-[opacity,scale] duration-150 starting:scale-95 starting:opacity-0',
  modalHead: 'flex items-start justify-between gap-3 px-4 pb-3 pt-5',
  modalTitle:'text-xl font-bold text-[#f2f3f5]',
  modalBody: 'flex flex-col gap-5 overflow-y-auto px-4 pb-4',
  modalFoot: 'flex items-center justify-end gap-2 bg-[#2b2d31] px-4 py-4',
  closeBtn:  'flex size-8 shrink-0 items-center justify-center rounded text-lg leading-none text-[#b5bac1] transition-colors hover:text-[#dbdee1]',
  label:     'mb-2 block text-xs font-bold uppercase tracking-wide text-[#b5bac1]',
  input:     'w-full rounded-[3px] border-none bg-[#1e1f22] px-2.5 py-2.5 text-[15px] text-[#dbdee1] outline-none placeholder:text-[#87898c] focus:ring-0',
  hint:      'mt-2 text-xs text-[#949ba4]',
  btnPrimary:'rounded-[3px] bg-[#5865f2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-50',
  btnLink:   'rounded-[3px] px-4 py-2 text-sm font-medium text-white hover:underline',
  btnDanger: 'rounded-[3px] bg-[#da373c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#a12828]',
  listItem:  'flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-[#dbdee1] transition-colors hover:bg-[#4e5058]/30 disabled:opacity-60',
  floating:  'rounded-lg bg-[#111214] p-1.5 text-[#dbdee1] shadow-[0_8px_16px_rgba(0,0,0,0.24)]',
  scroll:    '[scrollbar-color:#1a1b1e_transparent] [scrollbar-width:thin]',
} as const;

export function ModalShell({ title, subtitle, onClose, children, maxW = 'max-w-[440px]' }: {
  title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; maxW?: string;
}) {
  return (
    <div className={ui.overlay} onClick={onClose}>
      <div className={cn(ui.modal, maxW)} onClick={e => e.stopPropagation()}>
        <div className={ui.modalHead}>
          <div>
            <div className={ui.modalTitle}>{title}</div>
            {subtitle && <div className="mt-1 text-sm text-[#b5bac1]">{subtitle}</div>}
          </div>
          <button type="button" className={ui.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
