'use client';

import { useEffect, useRef, useState } from 'react';
import { avatarColor, cn, initials } from './ui';

export interface ToastNotification {
  id: string;
  type: 'dm' | 'mention' | 'channel' | 'hand';
  title: string;
  body: string;
  avatar?: string;
  channelId?: string;
  dmUserId?: string;
}

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
  onOpen: (n: ToastNotification) => void;
}

const AUTO_DISMISS_MS = 5000;

function ToastItem({ n, onDismiss, onOpen }: { n: ToastNotification; onDismiss: () => void; onOpen: () => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => { setExiting(true); setTimeout(onDismiss, 300); }, AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  function dismiss() { setExiting(true); setTimeout(onDismiss, 280); }

  const icon = n.type === 'dm' ? '💬' : n.type === 'mention' ? '🔔' : n.type === 'hand' ? '✋' : '#';

  return (
    <div
      className={cn(
        'group flex w-[340px] max-w-[calc(100vw-32px)] cursor-pointer items-start gap-3 rounded-lg bg-[#111214] p-3 shadow-[0_8px_16px_rgba(0,0,0,0.32)] transition-[opacity,translate] duration-300 starting:translate-x-8 starting:opacity-0',
        exiting && 'translate-x-8 opacity-0',
      )}
      onClick={() => { onOpen(); dismiss(); }}
    >
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: avatarColor(n.title) }}>
        {n.avatar ? (
          <img src={n.avatar} alt="" className="size-full rounded-full object-cover" />
        ) : (
          initials(n.title)
        )}
        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-[#111214] bg-[#5865f2] text-[10px]">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[#f2f3f5]">{n.title}</div>
        <div className="mt-0.5 line-clamp-2 break-words text-sm text-[#b5bac1]">
          {n.body.slice(0, 80)}{n.body.length > 80 ? '…' : ''}
        </div>
      </div>
      <button
        className="flex size-6 shrink-0 items-center justify-center rounded text-xs text-[#949ba4] opacity-0 transition hover:bg-[#2b2d31] hover:text-[#dbdee1] group-hover:opacity-100"
        onClick={e => { e.stopPropagation(); dismiss(); }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function NotificationToastStack({ notifications, onDismiss, onOpen }: NotificationToastProps) {
  if (notifications.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-sm:bottom-4 max-sm:right-4">
      {notifications.slice(-4).map(n => (
        <ToastItem
          key={n.id}
          n={n}
          onDismiss={() => onDismiss(n.id)}
          onOpen={() => onOpen(n)}
        />
      ))}
    </div>
  );
}

/* ── Web Push registration helper (call once after socket connects) ─── */
export async function registerWebPush(vapidPublicKey: string, onToken: (sub: PushSubscription) => void) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const existing = await reg.pushManager.getSubscription();
    if (existing) { onToken(existing); return; }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    onToken(sub);
  } catch {
    /* Permissions denied or not supported — silently skip */
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
