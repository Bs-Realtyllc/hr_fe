'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type LocalTrackPublication,
} from 'livekit-client';

/* ── Types ─────────────────────────────────────────────────── */

export interface VoiceParticipant {
  identity: string;
  name: string;
  isMicMuted: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
  isScreenSharing?: boolean;
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
  const roomRef       = useRef<Room | null>(null);
  const audioRefs     = useRef<Map<string, HTMLAudioElement>>(new Map());
  const screenVideoRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [participants, setParticipants]     = useState<VoiceParticipant[]>([]);
  const [connState, setConnState]           = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError]                   = useState<string | null>(null);
  const [screenSharing, setScreenSharing]   = useState(false);
  const [screenSharerName, setScreenSharerName] = useState<string | null>(null);

  /* ── Sync participants ──────────────────────────────────── */
  const syncParticipants = useCallback((room: Room) => {
    const list: VoiceParticipant[] = [];

    const local = room.localParticipant;
    list.push({
      identity: local.identity,
      name: local.name ?? local.identity,
      isMicMuted: !local.isMicrophoneEnabled,
      isSpeaking: local.isSpeaking,
      isLocal: true,
      isScreenSharing: local.isScreenShareEnabled,
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
      });
    });
    if (local.isScreenShareEnabled) sharerName = local.name ?? local.identity;
    setScreenSharerName(sharerName);

    setParticipants(list);
    onParticipantsChange?.(list);
  }, [onParticipantsChange]);

  /* ── Connect on mount ───────────────────────────────────── */
  useEffect(() => {
    let room: Room;

    async function connect() {
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

        room.on(RoomEvent.TrackSubscribed, (track, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const audio = new Audio();
            audio.autoplay = true;
            track.attach(audio);
            audioRefs.current.set(participant.identity, audio);
          } else if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.borderRadius = '8px';
            track.attach(video);
            screenVideoRef.current.set(participant.identity, video);
            /* Mount into DOM */
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
        await room.localParticipant.setMicrophoneEnabled(!micMuted);
        syncParticipants(room);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to connect to voice channel');
      }
    }

    connect();

    return () => {
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
    roomRef.current?.localParticipant.setMicrophoneEnabled(!micMuted).catch(() => {});
  }, [micMuted]);

  /* ── Sync deafen state (mute all remote audio) ──────────── */
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
          <button className="inbox-voice-ctrl-btn leave" onClick={onLeave} style={{ margin: '0 auto' }}>
            Leave
          </button>
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
            : `${participants.length} participant${participants.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Screen share view */}
      {screenSharerName && (
        <div className="inbox-screenshare-area">
          <div className="inbox-screenshare-label">🖥️ {screenSharerName} is sharing their screen</div>
          <div id="inbox-screenshare-container" className="inbox-screenshare-container" />
        </div>
      )}

      {participants.length > 0 && (
        <div className="inbox-voice-participants-grid">
          {participants.map(p => (
            <div key={p.identity} className="inbox-voice-participant">
              <div
                className={`inbox-voice-participant-avatar${p.isSpeaking && !p.isMicMuted ? ' speaking' : ''}${p.isMicMuted ? ' muted' : ''}`}
                style={{ background: `hsl(${(p.name.charCodeAt(0) * 37) % 360}, 45%, 35%)` }}
              >
                {initials(p.name)}
                {p.isMicMuted && <span className="inbox-voice-muted-badge" title="Muted" />}
                {p.isScreenSharing && <span className="inbox-voice-sharing-badge" title="Sharing screen">🖥️</span>}
              </div>
              <span className="inbox-voice-participant-name">
                {p.name}{p.isLocal ? ' (you)' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="inbox-voice-controls-bar">
        <button
          className={`inbox-voice-ctrl-btn${micMuted ? ' active-mute' : ''}`}
          title={micMuted ? 'Unmute' : 'Mute'}
          onClick={() => onMicMutedChange(!micMuted)}
        >
          <span className="icon" style={{ WebkitMaskImage: micMuted ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)', maskImage: micMuted ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)' }} />
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
      </div>
    </div>
  );
}
