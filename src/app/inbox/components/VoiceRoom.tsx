'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type RemoteTrackPublication,
  type RemoteParticipant,
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
}

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
}: VoiceRoomProps) {
  const roomRef        = useRef<Room | null>(null);
  const audioRefs      = useRef<Map<string, HTMLAudioElement>>(new Map());
  const screenVideoRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const permStatusRef  = useRef<PermissionStatus | null>(null);
  const vadCleanupRef  = useRef<(() => void) | null>(null);

  const [participants, setParticipants]         = useState<VoiceParticipant[]>([]);
  const [connState, setConnState]               = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError]                       = useState<string | null>(null);
  const [screenSharing, setScreenSharing]       = useState(false);
  const [screenSharerName, setScreenSharerName] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked]         = useState(false);
  const [micDenied, setMicDenied]               = useState(false);
  const [localLevel, setLocalLevel]             = useState(0);  // 0-1 RMS

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
      });
    });
    if (local.isScreenShareEnabled) sharerName = local.name ?? local.identity;
    setScreenSharerName(sharerName);

    setParticipants(list);
    onParticipantsChange?.(list);
  }, [onParticipantsChange, localLevel]);

  /* ── Connect on mount ───────────────────────────────────── */
  useEffect(() => {
    let room: Room;

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

      try {
        room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          setConnState(state);
        });

        room.on(RoomEvent.ParticipantConnected,    () => syncParticipants(room));
        room.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(room));
        room.on(RoomEvent.ActiveSpeakersChanged,   () => syncParticipants(room));
        room.on(RoomEvent.LocalTrackPublished,     () => syncParticipants(room));
        room.on(RoomEvent.LocalTrackUnpublished,   () => syncParticipants(room));
        room.on(RoomEvent.TrackMuted,              () => syncParticipants(room));
        room.on(RoomEvent.TrackUnmuted,            () => syncParticipants(room));
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioBlocked(!room.canPlaybackAudio);
        });

        room.on(RoomEvent.TrackSubscribed, (track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const audio = new Audio();
            audio.autoplay = true;
            audio.muted = deafened;
            track.attach(audio);
            audio.play().catch(() => setAudioBlocked(true));
            audioRefs.current.set(participant.identity, audio);
          } else if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.borderRadius = '8px';
            track.attach(video);
            screenVideoRef.current.set(participant.identity, video);
            const container = document.getElementById('inbox-screenshare-container');
            if (container) container.appendChild(video);
          }
          syncParticipants(room);
        });

        room.on(RoomEvent.TrackUnsubscribed, (track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const audio = audioRefs.current.get(participant.identity);
            if (audio) { track.detach(audio); audio.pause(); audioRefs.current.delete(participant.identity); }
          } else if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
            const video = screenVideoRef.current.get(participant.identity);
            if (video) { track.detach(video); video.remove(); screenVideoRef.current.delete(participant.identity); }
          }
          syncParticipants(room);
        });

        await room.connect(serverUrl, token, { autoSubscribe: true });

        /* Enable mic only if permission not denied */
        if (!micMuted && permStatusRef.current?.state !== 'denied') {
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
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

        syncParticipants(room);
        setAudioBlocked(!room.canPlaybackAudio);

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

    return () => {
      permStatusRef.current = null;
      vadCleanupRef.current?.();
      vadCleanupRef.current = null;
      audioRefs.current.forEach(audio => { audio.pause(); audio.src = ''; });
      audioRefs.current.clear();
      screenVideoRef.current.forEach(v => v.remove());
      screenVideoRef.current.clear();
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

  /* ── Sync deafen state ──────────────────────────────────── */
  useEffect(() => {
    audioRefs.current.forEach(audio => { audio.muted = deafened; });
  }, [deafened]);

  /* ── Helpers ────────────────────────────────────────────── */
  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  /* ── Render ─────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="inbox-voice-view" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Could not connect to voice</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>{error}</div>
          <button className="inbox-voice-ctrl-btn leave" onClick={onLeave} style={{ margin: '0 auto' }}>Leave</button>
        </div>
      </div>
    );
  }

  const isConnecting = connState === ConnectionState.Connecting || connState === ConnectionState.Reconnecting;

  return (
    <div className="inbox-voice-view">
      <div className="inbox-voice-view-header">
        <div className="inbox-voice-view-title">
          🔊 {channelName}
          {isConnecting && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 10 }}>
              Connecting…
            </span>
          )}
        </div>
        <div className="inbox-voice-view-sub">
          {participants.length === 0
            ? 'No one else here yet'
            : `${participants.length} in channel`}
        </div>
      </div>

      {/* Mic permission denied banner */}
      {micDenied && (
        <div className="inbox-audio-blocked" style={{ cursor: 'default' }}>
          🎙️ Microphone access denied — you are in listen-only mode.{' '}
          <span
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => {
              // Show browser permission instructions
              alert('To allow microphone:\n• Chrome: click the 🔒 lock icon in the address bar → Microphone → Allow\n• Firefox: click the camera icon in the address bar → Allow\nThen leave and rejoin the channel.');
            }}
          >
            How to allow mic
          </span>
        </div>
      )}

      {/* Audio playback blocked by browser autoplay policy */}
      {audioBlocked && (
        <button
          className="inbox-audio-blocked"
          onClick={async () => {
            await roomRef.current?.startAudio();
            audioRefs.current.forEach(a => a.play().catch(() => {}));
            setAudioBlocked(false);
          }}
        >
          🔇 Audio blocked by browser — click here to enable
        </button>
      )}

      {/* Screen share view */}
      {screenSharerName && (
        <div className="inbox-screenshare-area">
          <div className="inbox-screenshare-label">🖥️ {screenSharerName} is sharing their screen</div>
          <div id="inbox-screenshare-container" className="inbox-screenshare-container" />
        </div>
      )}

      {/* Participants grid */}
      {participants.length > 0 && (
        <div className="inbox-voice-participants-grid">
          {participants.map(p => {
            const speaking = p.isSpeaking && !p.isMicMuted;
            const lvl      = p.audioLevel ?? 0;
            const scalePct = Math.round(lvl * 100);
            return (
              <div key={p.identity} className="inbox-voice-participant">
                {/* Avatar with speaking ring */}
                <div
                  className={`inbox-voice-participant-avatar${speaking ? ' speaking' : ''}${p.isMicMuted ? ' muted' : ''}`}
                  style={{
                    background: `hsl(${(p.name.charCodeAt(0) * 37) % 360}, 45%, 35%)`,
                    /* Live border glow driven by audio level */
                    ...(speaking && p.isLocal ? {
                      boxShadow: `0 0 0 ${2 + scalePct / 25}px rgba(45,206,137,${0.4 + lvl * 0.5}), 0 0 0 ${6 + scalePct / 12}px rgba(45,206,137,${0.1 + lvl * 0.15})`,
                    } : {}),
                  }}
                >
                  {initials(p.name)}
                  {p.isMicMuted && <span className="inbox-voice-muted-badge" title="Muted" />}
                  {p.isScreenSharing && <span className="inbox-voice-sharing-badge" title="Sharing screen">🖥️</span>}
                </div>

                {/* Audio level meter — thin bar below avatar */}
                <div className="inbox-voice-level-bar-track">
                  <div
                    className="inbox-voice-level-bar-fill"
                    style={{
                      width: `${Math.round(lvl * 100)}%`,
                      background: p.isMicMuted ? 'var(--color-border)' : speaking ? '#2dce89' : 'rgba(45,206,137,0.3)',
                      transition: 'width 60ms linear, background 200ms',
                    }}
                  />
                </div>

                <span className="inbox-voice-participant-name">
                  {p.name}{p.isLocal ? ' (you)' : ''}
                  {speaking && (
                    <span className="inbox-voice-wave" aria-hidden>
                      <span /><span /><span />
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="inbox-voice-controls-bar">
        <button
          className={`inbox-voice-ctrl-btn${micMuted ? ' active-mute' : ''}${micDenied ? ' disabled' : ''}`}
          title={micDenied ? 'Microphone access denied' : micMuted ? 'Unmute' : 'Mute'}
          onClick={() => !micDenied && onMicMutedChange(!micMuted)}
        >
          <span className="icon" style={{
            WebkitMaskImage: micMuted || micDenied ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)',
            maskImage: micMuted || micDenied ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)',
          }} />
        </button>
        <button
          className={`inbox-voice-ctrl-btn${deafened ? ' active-mute' : ''}`}
          title={deafened ? 'Undeafen' : 'Deafen'}
          onClick={() => onDeafenedChange(!deafened)}
        >
          <span className="icon" style={{ WebkitMaskImage: 'url(/icons/headphones.svg)', maskImage: 'url(/icons/headphones.svg)' }} />
        </button>
        <button
          className={`inbox-voice-ctrl-btn${screenSharing ? ' active-share' : ''}`}
          title={screenSharing ? 'Stop sharing' : 'Share screen'}
          onClick={toggleScreenShare}
        >
          <span className="icon" style={{ WebkitMaskImage: 'url(/icons/monitor.svg)', maskImage: 'url(/icons/monitor.svg)' }} />
        </button>
        <button className="inbox-voice-ctrl-btn leave" title="Leave voice channel" onClick={onLeave}>
          <span className="icon" style={{ WebkitMaskImage: 'url(/icons/phone-off.svg)', maskImage: 'url(/icons/phone-off.svg)' }} />
        </button>

        {/* Live local mic level indicator in controls bar */}
        {!micMuted && !micDenied && (
          <div className="inbox-voice-local-level" title="Your mic level">
            {[0.15, 0.35, 0.55, 0.75, 0.90].map((thresh, i) => (
              <span
                key={i}
                className="inbox-voice-local-level-bar"
                style={{
                  background: localLevel >= thresh
                    ? localLevel > 0.7 ? '#f59e0b' : '#2dce89'
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
