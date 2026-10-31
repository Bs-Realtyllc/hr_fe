'use client';

import { useEffect, useRef, useState } from 'react';

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

  /* ── Permission error ── */
  if (permErr) {
    return (
      <div className="dm-audio-recorder">
        <span style={{ fontSize: 13, color: 'var(--color-error)' }}>
          🎙️ Microphone access denied. Allow it in browser settings.
        </span>
        <button className="dm-audio-cancel-btn" onClick={onCancel}>✕</button>
      </div>
    );
  }

  /* ── Preview phase ── */
  if (phase === 'preview' && audioUrl) {
    return (
      <div className="dm-audio-preview">
        <audio controls src={audioUrl} className="dm-audio-native" preload="metadata" />
        <span className="dm-audio-preview-dur">{fmt(durationRef.current)}</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button className="dm-audio-discard-btn" onClick={onCancel} title="Discard">
            <span style={{ WebkitMaskImage: 'url(/icons/trash-2.svg)', maskImage: 'url(/icons/trash-2.svg)', width: 16, height: 16, display: 'inline-block', background: 'currentColor', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskSize: 'contain', maskSize: 'contain' }} />
          </button>
          <button className="inbox-send-btn" title="Send voice message"
            onClick={() => { if (blobRef.current) onSend(blobRef.current, durationRef.current); }}>
            <span className="icon" style={{ WebkitMaskImage: 'url(/icons/send.svg)', maskImage: 'url(/icons/send.svg)' }} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Recording phase ── */
  return (
    <div className="dm-audio-recorder">
      <span className="dm-audio-rec-dot" />
      <span className="dm-audio-rec-time">{fmt(duration)}</span>
      <div className="dm-audio-waveform" aria-hidden>
        {bars.map((h, i) => (
          <span key={i} className="dm-audio-waveform-bar" style={{ height: h }} />
        ))}
      </div>
      {duration > 0 && (
        <button className="dm-audio-stop-btn" title="Stop recording" onClick={stopRecording}>
          <span className="dm-audio-stop-icon" />
        </button>
      )}
      <button className="dm-audio-cancel-btn" title="Cancel" onClick={() => { stopAll(); onCancel(); }}>✕</button>
    </div>
  );
}
