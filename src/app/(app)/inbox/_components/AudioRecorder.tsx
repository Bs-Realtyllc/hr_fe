'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';

interface AudioRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

const MAX_DURATION = 120; // seconds

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
  const [phase, setPhase]       = useState<'recording' | 'preview'>('recording');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [bars, setBars]         = useState<number[]>(Array(28).fill(2));
  const [permErr, setPermErr]   = useState(false);

  const blobRef = useRef<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef           = useRef<number | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const durationRef      = useRef(0);

  useEffect(() => {
    startRecording();
    return stopAll;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx      = new AudioContext();
      audioCtxRef.current = ctx;
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr       = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setPhase('preview');
        stopAll();
      };

      mr.start(100);

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(d => {
          if (d + 1 >= MAX_DURATION) { stopRecording(); }
          return d + 1;
        });
      }, 1000);

      function drawBars() {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        setBars(Array.from({ length: 28 }, (_, i) => {
          const v = data[Math.floor(i * data.length / 28)] / 255;
          return Math.max(3, v * 36);
        }));
        rafRef.current = requestAnimationFrame(drawBars);
      }
      drawBars();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPermErr(true);
      } else {
        onCancel();
      }
    }
  }

  function stopAll() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    if (timerRef.current)  clearInterval(timerRef.current);
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  const wrap = 'flex min-h-[52px] items-center gap-3 rounded-lg bg-[#383a40] px-4 py-2';
  const iconBtn = 'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors';

  /* ── Permission error ── */
  if (permErr) {
    return (
      <div className={wrap}>
        <span className="flex-1 text-sm text-[#fa777c]">
          🎙️ Microphone access denied. Allow it in browser settings.
        </span>
        <button className={`${iconBtn} text-[#b5bac1] hover:bg-[#4e5058] hover:text-white`} onClick={onCancel} title="Close">✕</button>
      </div>
    );
  }

  /* ── Preview phase ── */
  if (phase === 'preview' && audioUrl) {
    return (
      <div className={wrap}>
        <audio controls src={audioUrl} className="h-9 min-w-0 max-w-[320px] flex-1 [color-scheme:dark]" preload="metadata" />
        <span className="shrink-0 text-xs tabular-nums text-[#949ba4]">{fmt(durationRef.current)}</span>
        <div className="ml-auto flex gap-1.5">
          <button className={`${iconBtn} text-[#b5bac1] hover:bg-[#da373c] hover:text-white`} onClick={onCancel} title="Discard">
            <Icon src="/icons/trash-2.svg" className="size-4" />
          </button>
          <button className={`${iconBtn} bg-[#5865f2] text-white hover:bg-[#4752c4]`} title="Send voice message"
            onClick={() => { if (blobRef.current) onSend(blobRef.current, durationRef.current); }}>
            <Icon src="/icons/send.svg" className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ── Recording phase ── */
  return (
    <div className={wrap}>
      <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-[#f23f43]" />
      <span className="shrink-0 text-sm font-semibold tabular-nums text-[#f2f3f5]">{fmt(duration)}</span>
      <div className="flex h-9 min-w-0 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
        {bars.map((h, i) => (
          <span key={i} className="w-[3px] shrink-0 rounded-full bg-[#5865f2] transition-[height] duration-75" style={{ height: h }} />
        ))}
      </div>
      {duration > 0 && (
        <button className={`${iconBtn} bg-[#f23f43] text-white hover:bg-[#da373c]`} title="Stop recording" onClick={stopRecording}>
          <span className="size-2.5 rounded-[2px] bg-white" />
        </button>
      )}
      <button className={`${iconBtn} text-[#b5bac1] hover:bg-[#4e5058] hover:text-white`} title="Cancel" onClick={() => { stopAll(); onCancel(); }}>✕</button>
    </div>
  );
}
