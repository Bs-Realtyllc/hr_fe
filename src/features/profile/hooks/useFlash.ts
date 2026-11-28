'use client';
import { useEffect, useRef, useState } from 'react';

/** The page's toast-style status message (green = ok, red = err), auto-cleared after 3.5s. */
export function useFlash() {
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  // Keep the flash timer so a new message isn't cleared early by an old timer.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(text: string, type: 'ok' | 'err' = 'ok') {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setMsg(text); setMsgType(type);
    flashTimer.current = setTimeout(() => setMsg(''), 3500);
  }

  function clearFlash() {
    setMsg('');
  }

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  return {
    msg,
    msgType,
    flash,
    clearFlash,
  };
}

export type Flash = ReturnType<typeof useFlash>['flash'];
