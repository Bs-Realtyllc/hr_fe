'use client';
import { VscScreenFull, VscScreenNormal } from "react-icons/vsc";
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from './ui';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type VideoTrack,
} from 'livekit-client';

/* ── Types ─────────────────────────────────────────────────── */

export interface VoiceParticipant {
  identity: string;
  name: string;
  isMicMuted: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
  isScreenSharing?: boolean;
  audioLevel?: number; // 0-1 RMS level
  isCameraOn?: boolean;
  videoTrack?: VideoTrack; // camera track (not screen share)
  handRaisedAt?: number;   // ms timestamp the hand went up; undefined = lowered
  role?: string;           // from the server-signed LiveKit token metadata
}

/* Raise hand lives in a LiveKit participant attribute, so everyone — including
   people who join later — sees the same state without any backend storage. */
const HAND_ATTR = 'handRaised';
const HAND_TOPIC = 'hand';
const MODERATOR_ROLES = ['admin', 'lead'];

function handOf(p: { attributes?: Readonly<Record<string, string>> }) {
  const v = Number(p.attributes?.[HAND_ATTR] ?? '');
  return v > 0 ? v : undefined;
}
function roleOf(p: { metadata?: string }) {
  try { return p.metadata ? (JSON.parse(p.metadata).role as string | undefined) : undefined; } catch { return undefined; }
}

/* Short two-tone chime when someone raises their hand. */
function playHandChime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch { /* audio not available */ }
}

interface VoiceRoomProps {
  token: string;
  serverUrl: string;
  channelName: string;
  micMuted: boolean;
  deafened: boolean;
  onLeave: () => void;
  onMicMutedChange: (muted: boolean) => void;
  onDeafenedChange: (deafened: boolean) => void;
  onParticipantsChange?: (participants: VoiceParticipant[]) => void;
  /** Someone else raised their hand (also fires while the call view is hidden). */
  onHandRaised?: (name: string) => void;
  /** Shown when the local user's hand is lowered by a moderator. */
  onHandLoweredByOther?: (byName: string) => void;
}

/** Set to false if you want people to join with camera off. */
const START_WITH_CAMERA = false;

/* ── Web Audio VAD ─────────────────────────────────────────── */

/** Returns a cleanup fn. Calls onLevel(0-1) at ~30fps via AnalyserNode RMS. */
function startLocalVAD(
  onLevel: (level: number) => void,
): () => void {
  let ctx: AudioContext | null = null;
  let raf = 0;
  let stream: MediaStream | null = null;

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(s => {
      stream = s;
      ctx = new AudioContext();
      const source   = ctx.createMediaStreamSource(s);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      const buf = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        analyser.getByteFrequencyData(buf);
        // RMS over frequency bins → 0-1
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += (buf[i] / 255) ** 2;
        const rms = Math.sqrt(sum / buf.length);
        onLevel(Math.min(rms * 4, 1)); // amplify for visual sensitivity
        raf = requestAnimationFrame(tick);
      }
      tick();
    })
    .catch(() => onLevel(0));

  return () => {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach(t => t.stop());
    ctx?.close().catch(() => {});
  };
}

/* ── Camera video element ──────────────────────────────────── */

/** Attaches a LiveKit video track to a <video> and detaches on change/unmount. */
function ParticipantVideo({ track, mirror = false }: { track: VideoTrack; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  // muted: audio is played separately through the <audio> elements
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`h-full w-full object-cover ${mirror ? '-scale-x-100' : ''}`}
    />
  );
}

/* ── Component ─────────────────────────────────────────────── */

export function VoiceRoom({
  token,
  serverUrl,
  channelName,
  micMuted,
  deafened,
  onLeave,
  onMicMutedChange,
  onDeafenedChange,
  onParticipantsChange,
  onHandRaised,
  onHandLoweredByOther,
}: VoiceRoomProps) {
  // Room event handlers are registered once on mount; read callbacks through
  // refs so they always reach the parent's latest closures.
  const cbRef = useRef({ onParticipantsChange, onHandRaised, onHandLoweredByOther });
  cbRef.current = { onParticipantsChange, onHandRaised, onHandLoweredByOther };
  const roomRef        = useRef<Room | null>(null);
  const audioRefs      = useRef<Map<string, HTMLAudioElement>>(new Map());
  const screenVideoRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const permStatusRef  = useRef<PermissionStatus | null>(null);
  const vadCleanupRef  = useRef<(() => void) | null>(null);
  // Always mounted (visibility toggled by CSS, not conditional render) so this
  // node already exists in the DOM the moment a screen-share track arrives —
  // waiting for React to mount it off the `screenSharerName` state update is
  // one tick too late for the very first TrackSubscribed/LocalTrackPublished event.
  const screenshareContainerRef = useRef<HTMLDivElement | null>(null);
  const setScreenshareContainer = useCallback((el: HTMLDivElement | null) => {
    screenshareContainerRef.current = el;
    if (!el) return;
    screenVideoRef.current.forEach(v => {
      if (v.parentElement !== el) el.appendChild(v);
      v.play().catch(() => {});
    });
  }, []);

  const [participants, setParticipants]         = useState<VoiceParticipant[]>([]);
  const [connState, setConnState]               = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError]                       = useState<string | null>(null);
  const [screenSharing, setScreenSharing]       = useState(false);
  const [screenSharerName, setScreenSharerName] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked]         = useState(false);
  const [micDenied, setMicDenied]               = useState(false);
  const [cameraDenied, setCameraDenied]         = useState(false);
  const [localLevel, setLocalLevel]             = useState(0);  // 0-1 RMS
  const [screenShareFullScreen, setScreenShareFullScreen] = useState<boolean>(false)

  const localCameraOn = participants.find(p => p.isLocal)?.isCameraOn ?? false;

  /* ── Sync participants ──────────────────────────────────── */
  const syncParticipants = useCallback((room: Room, overrideLocalLevel?: number) => {
    const list: VoiceParticipant[] = [];
    const level = overrideLocalLevel ?? localLevel;

    const local = room.localParticipant;
    const localSpeaking = local.isSpeaking || (!local.isMicrophoneEnabled ? false : level > 0.08);
    list.push({
      identity: local.identity,
      name: local.name ?? local.identity,
      isMicMuted: !local.isMicrophoneEnabled,
      isSpeaking: localSpeaking,
      isLocal: true,
      isScreenSharing: local.isScreenShareEnabled,
      audioLevel: level,
      isCameraOn: local.isCameraEnabled,
      videoTrack: local.getTrackPublication(Track.Source.Camera)?.videoTrack,
      handRaisedAt: handOf(local),
      role: roleOf(local),
    });

    let sharerName: string | null = null;
    room.remoteParticipants.forEach((p: RemoteParticipant) => {
      if (p.isScreenShareEnabled) sharerName = p.name ?? p.identity;
      list.push({
        identity: p.identity,
        name: p.name ?? p.identity,
        isMicMuted: !p.isMicrophoneEnabled,
        isSpeaking: p.isSpeaking,
        isLocal: false,
        isScreenSharing: p.isScreenShareEnabled,
        audioLevel: p.isSpeaking ? 0.6 : 0,
        isCameraOn: p.isCameraEnabled,
        videoTrack: p.getTrackPublication(Track.Source.Camera)?.videoTrack,
        handRaisedAt: handOf(p),
        role: roleOf(p),
      });
    });
    if (local.isScreenShareEnabled) sharerName = local.name ?? local.identity;
    setScreenSharerName(sharerName);

    setParticipants(list);
    cbRef.current.onParticipantsChange?.(list);
  }, [localLevel]);

  /* ── Screen share video attach/detach (local + remote) ──── */
  function attachScreenShareVideo(track: Track, key: string) {
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // screen-share video carries no audio track of its own
    video.style.width = '100%';
    video.style.borderRadius = '8px';
    track.attach(video);
    video.play().catch(() => {});
    screenVideoRef.current.set(key, video);
    screenshareContainerRef.current?.appendChild(video);
  }

  function detachScreenShareVideo(key: string, track?: Track) {
    const video = screenVideoRef.current.get(key);
    if (!video) return;
    track?.detach(video);
    video.remove();
    screenVideoRef.current.delete(key);
  }

  /* ── Connect on mount ───────────────────────────────────── */
  useEffect(() => {
    let room: Room | undefined;
    // React StrictMode mounts → unmounts → mounts in dev. Without this flag the
    // first (discarded) mount would still finish connecting in the background
    // and leave a ghost participant in the LiveKit room.
    let cancelled = false;
    const audios  = audioRefs.current;
    const screens = screenVideoRef.current;

    async function connect() {
      /* ── Pre-flight: check mic permission ── */
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          permStatusRef.current = status;

          if (status.state === 'denied') {
            setMicDenied(true);
          }

          status.addEventListener('change', () => {
            if (status.state === 'denied') {
              setMicDenied(true);
              onMicMutedChange(true);
              roomRef.current?.localParticipant.setMicrophoneEnabled(false).catch(() => {});
              vadCleanupRef.current?.();
              vadCleanupRef.current = null;
            } else {
              setMicDenied(false);
            }
          });
        } catch {
          /* Browser doesn't support permissions API — proceed anyway */
        }
      }

      if (cancelled) return;
      try {
        const r = new Room({ adaptiveStream: true, dynacast: true });
        room = r;
        roomRef.current = r;

        r.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          setConnState(state);
        });

        r.on(RoomEvent.ParticipantConnected,    () => syncParticipants(r));
        r.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(r));
        r.on(RoomEvent.ActiveSpeakersChanged,   () => syncParticipants(r));
        r.on(RoomEvent.LocalTrackPublished,     (pub) => {
          if (pub.source === Track.Source.ScreenShare && pub.track) {
            attachScreenShareVideo(pub.track, 'local');
          }
          syncParticipants(r); // also picks up the local camera track
        });
        r.on(RoomEvent.LocalTrackUnpublished,   (pub) => {
          if (pub.source === Track.Source.ScreenShare) {
            detachScreenShareVideo('local');
          }
          syncParticipants(r);
        });
        r.on(RoomEvent.ParticipantAttributesChanged, (changed, participant) => {
          if (HAND_ATTR in changed && participant.identity !== r.localParticipant.identity && handOf(participant)) {
            playHandChime();
            cbRef.current.onHandRaised?.(participant.name ?? participant.identity);
          }
          syncParticipants(r);
        });
        r.on(RoomEvent.DataReceived, (payload, sender, _kind, topic) => {
          if (topic !== HAND_TOPIC || !sender) return;
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            // Only honour "lower hand" from moderators (role is server-signed).
            if (msg?.type === 'lower' && MODERATOR_ROLES.includes(roleOf(sender) ?? '') && handOf(r.localParticipant)) {
              r.localParticipant.setAttributes({ [HAND_ATTR]: '' }).then(() => syncParticipants(r)).catch(() => {});
              cbRef.current.onHandLoweredByOther?.(sender.name ?? sender.identity);
            }
          } catch { /* ignore malformed */ }
        });
        r.on(RoomEvent.TrackMuted,              () => syncParticipants(r));
        r.on(RoomEvent.TrackUnmuted,            () => syncParticipants(r));
        r.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioBlocked(!r.canPlaybackAudio);
        });

        r.on(RoomEvent.TrackSubscribed, (track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const audio = new Audio();
            audio.autoplay = true;
            audio.muted = deafened;
            track.attach(audio);
            audio.play().catch(() => setAudioBlocked(true));
            audioRefs.current.set(participant.identity, audio);
          } else if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
            attachScreenShareVideo(track, participant.identity);
          }
          // Camera video is rendered by <ParticipantVideo> from syncParticipants()
          syncParticipants(r);
        });

        r.on(RoomEvent.TrackUnsubscribed, (track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const audio = audioRefs.current.get(participant.identity);
            if (audio) { track.detach(audio); audio.pause(); audioRefs.current.delete(participant.identity); }
          } else if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
            detachScreenShareVideo(participant.identity, track);
          }
          syncParticipants(r);
        });

        await r.connect(serverUrl, token, { autoSubscribe: true });
        if (cancelled) { r.disconnect(); return; }

        /* Enable mic only if permission not denied */
        if (!micMuted && permStatusRef.current?.state !== 'denied') {
          try {
            await r.localParticipant.setMicrophoneEnabled(true);
          } catch (err: any) {
            const name = err?.name ?? '';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
              setMicDenied(true);
              onMicMutedChange(true);
            } else if (name === 'NotFoundError') {
              setError('No microphone found. Connect a mic and rejoin.');
            }
          }
        }

        /* Camera is independent of the mic: a missing/denied camera must not break voice */
        if (START_WITH_CAMERA) {
          try {
            await r.localParticipant.setCameraEnabled(true);
          } catch (err: any) {
            const name = err?.name ?? '';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
              setCameraDenied(true);
            }
            // NotFoundError etc.: just continue as audio-only
          }
        }

        syncParticipants(r);
        setAudioBlocked(!r.canPlaybackAudio);

        /* ── Start Web Audio API VAD for local participant ── */
        if (permStatusRef.current?.state !== 'denied') {
          vadCleanupRef.current = startLocalVAD(level => {
            setLocalLevel(level);
            // Also directly update the local participant entry for live ring
            if (roomRef.current) {
              setParticipants(prev => prev.map(p =>
                p.isLocal
                  ? { ...p, audioLevel: level, isSpeaking: p.isMicMuted ? false : level > 0.08 }
                  : p,
              ));
            }
          });
        }
      } catch (err: any) {
        if (cancelled) return;
        const name = err?.name ?? '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setMicDenied(true);
        } else if (name === 'NotFoundError') {
          setError('No microphone device found. Connect a mic and try again.');
        } else {
          setError(err?.message ?? 'Failed to connect to voice channel');
        }
      }
    }

    connect();

    const onPageHide = () => { room?.disconnect(); };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      // Leaving the channel, switching channels or navigating away from /inbox
      // all unmount this component — always hang up so nobody stays "in call".
      cancelled = true;
      window.removeEventListener('pagehide', onPageHide);
      permStatusRef.current = null;
      vadCleanupRef.current?.();
      vadCleanupRef.current = null;
      audios.forEach(audio => { audio.pause(); audio.srcObject = null; });
      audios.clear();
      screens.forEach(v => v.remove());
      screens.clear();
      room?.disconnect();
      roomRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Screen share toggle ────────────────────────────────── */
  async function toggleScreenShare() {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!screenSharing);
      setScreenSharing(p => !p);
      syncParticipants(room);
    } catch {
      /* User cancelled the picker or permission denied */
    }
  }

  /* ── Raise hand ─────────────────────────────────────────── */
  const localP      = participants.find(p => p.isLocal);
  const handRaised  = Boolean(localP?.handRaisedAt);
  const isModerator = MODERATOR_ROLES.includes(localP?.role ?? '');
  const raisedQueue = participants.filter(p => p.handRaisedAt).sort((a, b) => a.handRaisedAt! - b.handRaisedAt!);
  const [handsOpen, setHandsOpen] = useState(false);

  const syncRef = useRef(syncParticipants);
  syncRef.current = syncParticipants;
  const toggleHand = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const up = !handOf(room.localParticipant);
    try {
      await room.localParticipant.setAttributes({ [HAND_ATTR]: up ? String(Date.now()) : '' });
      syncRef.current(room);
    } catch { /* token without canUpdateOwnMetadata */ }
  }, []);

  async function lowerHandOf(identity: string) {
    const room = roomRef.current;
    if (!room) return;
    if (identity === room.localParticipant.identity) { await toggleHand(); return; }
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: 'lower' })),
      { reliable: true, topic: HAND_TOPIC, destinationIdentities: [identity] },
    ).catch(() => {});
  }

  /* Ctrl+Alt+H toggles your hand, like Google Meet */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'h') { e.preventDefault(); toggleHand(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleHand]);

  useEffect(() => { if (raisedQueue.length === 0) setHandsOpen(false); }, [raisedQueue.length]);

  /* ── Camera toggle ──────────────────────────────────────── */
  async function toggleCamera() {
    const room = roomRef.current;
    if (!room || cameraDenied) return;
    try {
      await room.localParticipant.setCameraEnabled(!localCameraOn);
      syncParticipants(room);
    } catch (err: any) {
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraDenied(true);
      }
    }
  }

  /* ── Sync mic state ─────────────────────────────────────── */
  useEffect(() => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.setMicrophoneEnabled(!micMuted).catch((err: any) => {
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMicDenied(true);
        onMicMutedChange(true);
      }
    });
    /* Start/stop VAD with mic mute */
    if (micMuted) {
      vadCleanupRef.current?.();
      vadCleanupRef.current = null;
      setLocalLevel(0);
    } else if (!vadCleanupRef.current && !micDenied) {
      vadCleanupRef.current = startLocalVAD(level => {
        setLocalLevel(level);
        setParticipants(prev => prev.map(p =>
          p.isLocal ? { ...p, audioLevel: level, isSpeaking: level > 0.08 } : p,
        ));
      });
    }
  }, [micMuted, onMicMutedChange, micDenied]);

  /* ── Full-screen share: Esc exits; exits automatically when sharing stops ── */
  useEffect(() => {
    if (!screenSharerName) setScreenShareFullScreen(false);
  }, [screenSharerName]);
  useEffect(() => {
    if (!screenShareFullScreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setScreenShareFullScreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [screenShareFullScreen]);

  /* ── Sync deafen state ──────────────────────────────────── */
  useEffect(() => {
    audioRefs.current.forEach(audio => { audio.muted = deafened; });
  }, [deafened]);

  /* ── Helpers ────────────────────────────────────────────── */
  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  /* ── Render ─────────────────────────────────────────────── */
  const ctrlBtn = 'flex size-12 items-center justify-center rounded-full transition-colors';
  const ctrlIdle = 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#404249]';
  const ctrlOff = 'bg-white text-[#f23f43] hover:bg-[#dbdee1]';
  const banner = 'mx-auto w-full max-w-[900px] rounded-md bg-[#f0b232]/15 px-4 py-2 text-center text-sm text-[#f0b232]';

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#111214] p-8 text-center text-[#dbdee1]">
        <div className="mb-3 text-4xl">⚠️</div>
        <div className="mb-2 text-lg font-semibold text-[#f2f3f5]">Could not connect to voice</div>
        <div className="mb-5 text-sm text-[#949ba4]">{error}</div>
        <button className="rounded-[3px] bg-[#da373c] px-5 py-2 text-sm font-medium text-white hover:bg-[#a12828]" onClick={onLeave}>Leave</button>
      </div>
    );
  }

  const isConnecting = connState === ConnectionState.Connecting || connState === ConnectionState.Reconnecting;
  const shareHeader = (fullScreen: boolean) => (
    <div className="flex shrink-0 items-center gap-2 bg-black/60 px-3.5 py-2 text-xs text-white/70">
      🖥️ {screenSharerName} is sharing their screen
      <button
        type="button"
        className="ml-auto flex h-7 items-center gap-1.5 rounded px-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        title={fullScreen ? 'Exit full screen (Esc)' : 'Full screen'}
        onClick={() => setScreenShareFullScreen(!fullScreen)}
      >
        {fullScreen ? <VscScreenNormal /> : <VscScreenFull />}
        <span>{fullScreen ? 'Exit full screen' : 'Full screen'}</span>
      </button>
    </div>
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-[#111214] p-6 text-[#dbdee1]">
      <div className="text-center">
        <div className="text-xl font-bold text-[#f2f3f5]">
          🔊 {channelName}
          {isConnecting && <span className="ml-2.5 text-xs font-normal text-[#949ba4]">Connecting…</span>}
        </div>
        <div className="mt-1 text-sm text-[#949ba4]">
          {participants.length === 0 ? 'No one else here yet' : `${participants.length} in channel`}
        </div>
      </div>

      {/* Mic permission denied banner */}
      {micDenied && (
        <div className={banner}>
          🎙️ Microphone access denied — you are in listen-only mode.{' '}
          <span
            className="cursor-pointer underline"
            onClick={() => {
              // Show browser permission instructions
              alert(
                'To allow microphone:\n• Chrome: click the 🔒 lock icon in the address bar → Microphone → Allow\n• Firefox: click the camera icon in the address bar → Allow\nThen leave and rejoin the channel.',
              );
            }}
          >
            How to allow mic
          </span>
        </div>
      )}

      {/* Camera permission denied banner */}
      {cameraDenied && (
        <div className={banner}>
          📷 Camera access denied — others can&apos;t see you. Allow it in your browser&apos;s
          address bar, then rejoin.
        </div>
      )}

      {/* Audio playback blocked by browser autoplay policy */}
      {audioBlocked && (
        <button
          className={`${banner} cursor-pointer hover:bg-[#f0b232]/25`}
          onClick={async () => {
            await roomRef.current?.startAudio();
            audioRefs.current.forEach((a) => a.play().catch(() => {}));
            setAudioBlocked(false);
          }}
        >
          🔇 Audio blocked by browser — click here to enable
        </button>
      )}

      {/* Screen share view — stays mounted (just hidden) so the container ref
          already exists in the DOM before any screen-share track arrives */}
      {/* The inline container is always mounted (hidden when unused) so it exists
          before the first screen-share track arrives. In full screen the videos
          move into a <body> portal that covers the whole page, app sidebar included. */}
      <div
        className="relative mx-auto flex w-full max-w-[900px] shrink-0 flex-col overflow-hidden rounded-lg bg-black"
        style={screenSharerName && !screenShareFullScreen ? undefined : { display: 'none' }}
      >
        {shareHeader(false)}
        <div
          ref={screenShareFullScreen ? undefined : setScreenshareContainer}
          className="flex aspect-video items-center justify-center [&_video]:size-full [&_video]:object-contain"
        />
      </div>
      {screenShareFullScreen && screenSharerName && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100000] flex flex-col bg-black">
          {shareHeader(true)}
          <div
            ref={setScreenshareContainer}
            className="flex min-h-0 flex-1 items-center justify-center [&_video]:size-full [&_video]:rounded-none! [&_video]:object-contain"
          />
        </div>,
        document.body,
      )}

      {/* Participants grid */}
      {participants.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {participants.map((p) => {
            const speaking = p.isSpeaking && !p.isMicMuted;
            const lvl = p.audioLevel ?? 0;
            const scalePct = Math.round(lvl * 100);
            const showVideo = !!p.isCameraOn && !!p.videoTrack;
            return (
              <div
                key={p.identity}
                className={`relative flex aspect-video w-60 max-w-full items-center justify-center overflow-hidden rounded-lg bg-[#2b2d31] ring-[3px] transition-shadow max-sm:w-full ${
                  speaking ? 'ring-[#23a55a]' : p.handRaisedAt ? 'ring-[#f0b232]' : 'ring-transparent'
                }`}
              >
                {showVideo ? (
                  /* Camera tile */
                  <div className="absolute inset-0 bg-black">
                    <ParticipantVideo track={p.videoTrack!} mirror={p.isLocal} />
                  </div>
                ) : (
                  /* Avatar fallback (camera off) with speaking glow */
                  <div
                    className="relative flex size-20 items-center justify-center rounded-full text-2xl font-semibold text-white transition-shadow"
                    style={{
                      background: `hsl(${(p.name.charCodeAt(0) * 37) % 360}, 45%, 42%)`,
                      /* Live border glow driven by audio level */
                      ...(speaking && p.isLocal
                        ? {
                            boxShadow: `0 0 0 ${2 + scalePct / 25}px rgba(35,165,90,${0.4 + lvl * 0.5}), 0 0 0 ${6 + scalePct / 12}px rgba(35,165,90,${0.1 + lvl * 0.15})`,
                          }
                        : speaking
                          ? { boxShadow: '0 0 0 3px #23a55a' }
                          : {}),
                    }}
                  >
                    {initials(p.name)}
                  </div>
                )}

                {/* Raised hand + queue position, top-left */}
                {p.handRaisedAt && (
                  <span className="absolute left-2 top-2 flex h-7 items-center gap-1 rounded-full bg-[#f0b232] px-2 text-sm font-bold text-[#111214] shadow" title="Hand raised">
                    <span className="animate-bounce [animation-iteration-count:2]">✋</span>
                    {raisedQueue.findIndex(q => q.identity === p.identity) + 1}
                  </span>
                )}

                {/* Status icons, top-right */}
                <div className="absolute right-2 top-2 flex gap-1">
                  {p.isScreenSharing && (
                    <span className="flex h-6 items-center rounded bg-[#f23f43] px-1.5 text-[10px] font-bold uppercase text-white" title="Sharing screen">Live</span>
                  )}
                  {p.isMicMuted && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-black/60 text-[#f23f43]" title="Muted">
                      <span className="size-3.5 bg-current mask-no-repeat mask-center mask-contain" style={{ WebkitMaskImage: 'url(/icons/mic-off.svg)', maskImage: 'url(/icons/mic-off.svg)' }} />
                    </span>
                  )}
                </div>

                {/* Name pill + level, bottom-left */}
                <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                  <span className="truncate">{p.name}{p.isLocal ? ' (you)' : ''}</span>
                  {speaking && (
                    <span className="inline-flex h-3 items-end gap-0.5" aria-hidden>
                      <span className="h-[40%] w-[3px] animate-pulse rounded-sm bg-[#23a55a]" />
                      <span className="h-full w-[3px] animate-pulse rounded-sm bg-[#23a55a] [animation-delay:180ms]" />
                      <span className="h-[60%] w-[3px] animate-pulse rounded-sm bg-[#23a55a] [animation-delay:360ms]" />
                    </span>
                  )}
                </div>

                {/* Audio level meter along the bottom edge */}
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-transparent">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.round(lvl * 100)}%`,
                      background: p.isMicMuted ? 'transparent' : speaking ? '#23a55a' : 'rgba(35,165,90,0.35)',
                      transition: 'width 60ms linear, background 200ms',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raised hands queue (Google Meet style) */}
      {raisedQueue.length > 0 && (
        <div className="absolute right-4 top-4 z-10 w-64 max-w-[calc(100%-32px)] overflow-hidden rounded-lg bg-[#2b2d31] shadow-[0_8px_16px_rgba(0,0,0,0.32)]">
          <button className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[#f2f3f5] hover:bg-[#35373c]" onClick={() => setHandsOpen(o => !o)}>
            <span>✋</span> Raised hands <span className="rounded-full bg-[#f0b232] px-1.5 text-xs font-bold text-[#111214]">{raisedQueue.length}</span>
            <span className={`ml-auto text-xs text-[#949ba4] transition-transform ${handsOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {handsOpen && (
            <div className="max-h-64 overflow-y-auto border-t border-[#1e1f22] p-1.5">
              {raisedQueue.map((p, i) => (
                <div key={p.identity} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-[#dbdee1] hover:bg-[#35373c]">
                  <span className="w-4 text-xs font-bold text-[#949ba4]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}{p.isLocal ? ' (you)' : ''}</span>
                  {(p.isLocal || isModerator) && (
                    <button className="rounded px-2 py-0.5 text-xs font-medium text-[#00a8fc] hover:bg-[#1e1f22]" onClick={() => lowerHandOf(p.identity)}>Lower</button>
                  )}
                </div>
              ))}
              {isModerator && raisedQueue.length > 1 && (
                <button className="mt-1 w-full rounded px-2 py-1.5 text-xs font-medium text-[#f23f43] hover:bg-[#1e1f22]" onClick={() => raisedQueue.forEach(p => lowerHandOf(p.identity))}>Lower all hands</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mt-auto flex flex-wrap items-center justify-center gap-3 pb-2">
        <button
          className={`${ctrlBtn} ${micMuted || micDenied ? ctrlOff : ctrlIdle} ${micDenied ? 'cursor-not-allowed opacity-50' : ''}`}
          title={micDenied ? 'Microphone access denied' : micMuted ? 'Unmute' : 'Mute'}
          onClick={() => !micDenied && onMicMutedChange(!micMuted)}
        >
          <Icon src={micMuted || micDenied ? '/icons/mic-off.svg' : '/icons/mic.svg'} />
        </button>
        <button
          className={`${ctrlBtn} ${deafened ? ctrlOff : ctrlIdle}`}
          title={deafened ? 'Undeafen' : 'Deafen'}
          onClick={() => onDeafenedChange(!deafened)}
        >
          <Icon src="/icons/headphones.svg" />
        </button>
        <button
          className={`${ctrlBtn} ${localCameraOn ? 'bg-white text-[#111214] hover:bg-[#dbdee1]' : ctrlIdle} ${cameraDenied ? 'cursor-not-allowed opacity-50' : ''}`}
          title={
            cameraDenied
              ? 'Camera access denied'
              : localCameraOn
                ? 'Turn camera off'
                : 'Turn camera on'
          }
          onClick={toggleCamera}
        >
          <Icon src={localCameraOn ? '/icons/video.svg' : '/icons/video-off.svg'} />
        </button>
        <button
          className={`${ctrlBtn} ${screenSharing ? 'bg-[#23a55a] text-white hover:bg-[#1a8747]' : ctrlIdle}`}
          title={screenSharing ? 'Stop sharing' : 'Share screen'}
          onClick={toggleScreenShare}
        >
          <Icon src="/icons/monitor.svg" />
        </button>
        <button
          className={`${ctrlBtn} text-xl leading-none ${handRaised ? 'bg-[#f0b232] hover:bg-[#d99a1a]' : ctrlIdle}`}
          title={handRaised ? 'Lower hand (Ctrl+Alt+H)' : 'Raise hand (Ctrl+Alt+H)'}
          aria-pressed={handRaised}
          onClick={toggleHand}
        >
          ✋
        </button>
        <button
          className={`${ctrlBtn} bg-[#da373c] text-white hover:bg-[#a12828]`}
          title="Leave voice channel"
          onClick={onLeave}
        >
          <Icon src="/icons/phone-off.svg" />
        </button>

        {/* Live local mic level indicator in controls bar */}
        {!micMuted && !micDenied && (
          <div className="ml-1 flex h-6 items-end gap-[3px]" title="Your mic level">
            {[0.15, 0.35, 0.55, 0.75, 0.9].map((thresh, i) => (
              <span
                key={i}
                className="w-1 rounded-sm"
                style={{
                  height: `${30 + i * 17}%`,
                  background:
                    localLevel >= thresh
                      ? localLevel > 0.7
                        ? '#f0b232'
                        : '#23a55a'
                      : 'rgba(255,255,255,0.15)',
                  transition: 'background 60ms',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
