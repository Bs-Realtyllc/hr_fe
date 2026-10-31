'use client';

import { useEffect, useRef, useState } from 'react';

export interface ToastNotification {
  id: string;
  type: 'dm' | 'mention' | 'channel';
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

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function ToastItem({ n, onDismiss, onOpen }: { n: ToastNotification; onDismiss: () => void; onOpen: () => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => { setExiting(true); setTimeout(onDismiss, 300); }, AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  function dismiss() { setExiting(true); setTimeout(onDismiss, 280); }

  const icon = n.type === 'dm' ? '💬' : n.type === 'mention' ? '🔔' : '#';

  return (
    <div
      className={`inbox-toast${exiting ? ' exiting' : ''}`}
      onClick={() => { onOpen(); dismiss(); }}
    >
      <div className="inbox-toast-avatar">
        {n.avatar ? (
          <img src={n.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          initials(n.title)
        )}
        <span className="inbox-toast-type-badge">{icon}</span>
      </div>
      <div className="inbox-toast-content">
        <div className="inbox-toast-title">{n.title}</div>
        <div className="inbox-toast-body">
          {n.body.slice(0, 80)}{n.body.length > 80 ? '…' : ''}
        </div>
      </div>
      <button
        className="inbox-toast-close"
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
    <div className="inbox-toast-stack">
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
