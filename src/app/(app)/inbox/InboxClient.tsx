'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { employeesApi } from '@/lib/queries/employees';
import { BACKEND_URL } from '@/config/env';
import type { Role } from '@/types';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { VoiceRoom } from './_components/VoiceRoom';
import { CreateChannelModal } from './_components/CreateChannelModal';
import { NewDmModal } from './_components/NewDmModal';
import { StatusSelector } from './_components/StatusSelector';
import { MessageContextMenu, type ContextAction } from './_components/MessageContextMenu';
import { ProfilePopover } from './_components/ProfilePopover';
import { ReplyPreview, type ReplyTarget } from './_components/ReplyPreview';
import { ForwardModal } from './_components/ForwardModal';
import { PinnedMessagesPanel } from './_components/PinnedMessagesPanel';
import { SavedMessagesPanel } from './_components/SavedMessagesPanel';
import { MentionAutocomplete, getMentionQuery, applyMention } from './_components/MentionAutocomplete';
import { NotificationToastStack, type ToastNotification } from './_components/NotificationToast';
import { AudioRecorder } from './_components/AudioRecorder';
import { Avatar, Icon, cn, initials, ui } from './_components/ui';

/* ─────────────────────────── Types ───────────────────────── */

type ChannelType = 'text' | 'voice' | 'announcement';
type UserStatus  = 'online' | 'away' | 'dnd' | 'offline';
type UserRole    = Role;
type MemberRole  = 'admin' | 'member' | 'readonly';

interface Category    { id: number; name: string; position: number; }
interface Channel     { id: string; type: ChannelType; name: string; category_id: number | null; description?: string; required_role?: UserRole; is_private?: boolean; member_role?: MemberRole | null; unread?: number; mentioned?: boolean; }
interface Member      { id: string; name: string; designation: string; status: UserStatus; }
interface Reaction    { emoji: string; users: string[]; }
interface ChatMessage { id: string; channelId: string; userId: string; userName: string; userDesignation: string; content: string; timestamp: Date; edited?: boolean; reactions: Reaction[]; isPinned?: boolean; isLocal?: boolean; isSending?: boolean; sendFailed?: boolean; replyToId?: string; replyToContent?: string; replyToAuthor?: string; }
interface DirectMessage { userId: string; userName: string; userDesignation: string; status: UserStatus; unread?: number; }
interface VoiceToken  { token: string; url: string; room: string; }

/* ─────────────────────────── Constants ───────────────────── */

const EMOJI_LIST = ['👍','❤️','😂','😮','😢','🎉','🔥','✅','👏','🙌','💪','🤔','👀','✨','🚀','💯','⭐','🌟','💡','🎯','📌','🔔','💬','📢'];
const ROLE_RANK: Record<UserRole, number>   = { admin: 4, lead: 3, employee: 2, intern: 1 };

/* ─────────────────────────── Helpers ─────────────────────── */

function mapApiChannel(ch: any): Channel {
  return { id: String(ch.id), type: ch.type, name: ch.name, category_id: ch.category_id ?? null, description: ch.description ?? undefined, required_role: ch.required_role ?? 'intern', is_private: Boolean(ch.is_private), member_role: ch.member_role ?? null };
}
function mapApiMessage(m: any): ChatMessage {
  return { id: String(m.id), channelId: String(m.channel_id), userId: String(m.employee_id), userName: m.author_name ?? 'Unknown', userDesignation: m.author_designation ?? '', content: m.content, timestamp: new Date(m.created_at), edited: Boolean(m.is_edited), isPinned: Boolean(m.is_pinned), reactions: (m.reactions ?? []).map((r: any) => ({ emoji: r.emoji, users: (r.users ?? []).map(String) })), replyToId: m.reply_to_id ? String(m.reply_to_id) : undefined, replyToContent: m.reply_to_content, replyToAuthor: m.reply_to_author };
}
function mapApiDm(m: any, dmCh: string): ChatMessage {
  return { id: String(m.id), channelId: dmCh, userId: String(m.from_employee_id), userName: m.author_name ?? 'Unknown', userDesignation: '', content: m.content, timestamp: new Date(m.created_at), edited: Boolean(m.is_edited), reactions: [] };
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', lead: 'Team Lead', employee: 'Employee', intern: 'Intern' };

function fmtTime(d: Date)    { return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
function fmtTs(d: Date) {
  const now = new Date(); const yd = new Date(now); yd.setDate(yd.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `Today at ${fmtTime(d)}`;
  if (d.toDateString() === yd.toDateString())  return `Yesterday at ${fmtTime(d)}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` at ${fmtTime(d)}`;
}
function dateDivLabel(d: Date) {
  const now = new Date(); const yd = new Date(now); yd.setDate(yd.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yd.toDateString())  return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function grouped(a: ChatMessage, b: ChatMessage) { return a.userId === b.userId && b.timestamp.getTime() - a.timestamp.getTime() < 5 * 60 * 1000; }


/* The audio URL's signed token expires after an hour. If playback is attempted after that
   (e.g. a tab left open), fetch a fresh token for the same object key and retry once before
   giving up — mirrors how Discord/CDN-style signed media URLs self-heal on expiry. */
function AudioMessage({ src: initialSrc, duration }: { src: string; duration: number }) {
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(false);
  const retriedRef = useRef(false);

  async function handleError() {
    if (retriedRef.current || !src.startsWith('http')) { setFailed(true); return; }
    retriedRef.current = true;
    try {
      const key = new URL(src).pathname.split('/').pop();
      const { url } = await api.get<{ url: string }>(`/inbox/audio/${key}/refresh-url`);
      setSrc(url);
    } catch {
      setFailed(true);
    }
  }

  const mins = Math.floor(duration / 60);
  const secs = String(duration % 60).padStart(2, '0');
  return (
    <div className="mt-1 flex w-fit max-w-full items-center gap-2.5 rounded-lg border border-[#1e1f22] bg-[#2b2d31] px-3 py-2">
      <span className="text-lg">🎙️</span>
      {failed
        ? <span className="text-sm text-[#949ba4]">Audio unavailable</span>
        : <audio controls src={src} onError={handleError} className="h-9 min-w-0 max-w-[300px] [color-scheme:dark]" preload="metadata" />}
      <span className="shrink-0 text-xs tabular-nums text-[#949ba4]">{mins}:{secs}</span>
    </div>
  );
}

function renderContent(content: string, me: string) {
  /* Audio message */
  if (content.startsWith('__audio__:')) {
    const rest     = content.slice('__audio__:'.length);
    const colonIdx = rest.indexOf(':');
    const duration = colonIdx !== -1 ? Number(rest.slice(0, colonIdx)) : 0;
    const rawSrc = colonIdx !== -1 ? rest.slice(colonIdx + 1) : rest;
    let audioSrc: string;
    if (rawSrc.startsWith('http')) {
      audioSrc = rawSrc; // backend audio proxy URL, carrying its own short-lived token, hydrated at read time
    } else if (rawSrc.startsWith('/uploads/')) {
      audioSrc = `${BACKEND_URL}${rawSrc}`; // legacy local disk
    } else {
      audioSrc = rawSrc; // object key — should be hydrated server-side before reaching here
    }
    return <AudioMessage src={audioSrc} duration={duration} />;
  }

  /* Normal text with @mentions */
  const parts: React.ReactNode[] = [];
  const re = /(@\w+)/g; let last = 0; let m: RegExpExecArray | null; let i = 0;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push(<span key={i++}>{content.slice(last, m.index)}</span>);
    const handle  = m[1].slice(1).toLowerCase();
    const self    = me.toLowerCase().split(' ').some(part => part === handle);
    const special = m[1] === '@everyone' || m[1] === '@here';
    parts.push(<span key={i++} className={`rounded-[3px] px-0.5 font-medium transition-colors ${self || special ? 'bg-[#5865f2]/30 text-[#c9cdfb] hover:bg-[#5865f2] hover:text-white' : 'bg-[#5865f2]/20 text-[#c9cdfb] hover:bg-[#5865f2]/60'}`}>{m[1]}</span>);
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(<span key={i++}>{content.slice(last)}</span>);
  return <>{parts}</>;
}

/* ─────────────────────────── Main ────────────────────────── */

export default function InboxClient() {
  const { user } = useAuth();

  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedDmId, setSelectedDmId]           = useState<string | null>(null);
  const [inputValue, setInputValue]               = useState('');
  const [showMembers, setShowMembers]             = useState(true);
  // Remember the member-list toggle between visits (per browser only).
  useEffect(() => { try { if (localStorage.getItem('inbox.showMembers') === '0') setShowMembers(false); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('inbox.showMembers', showMembers ? '1' : '0'); } catch {} }, [showMembers]);
  const [collapsedCats, setCollapsedCats]         = useState<Set<string>>(new Set());
  const [dmCollapsed, setDmCollapsed]             = useState(false);
  const [inVoiceChannel, setInVoiceChannel]       = useState<string | null>(null);
  const [micMuted, setMicMuted]                   = useState(false);
  const [deafened, setDeafened]                   = useState(false);
  const [editingId, setEditingId]                 = useState<string | null>(null);
  const [editValue, setEditValue]                 = useState('');
  const [typingUsers, setTypingUsers]             = useState<string[]>([]);
  const [vcOccupants, setVcOccupants]             = useState<Record<string, string[]>>({});
  const [callHands, setCallHands]                 = useState<string[]>([]); // names with a raised hand in *my* call
  const [loading, setLoading]                     = useState(true);
  const [socketConnected, setSocketConnected]     = useState(false);
  const [userStatus, setUserStatus]               = useState<UserStatus>('online');
  const [voiceToken, setVoiceToken]               = useState<VoiceToken | null>(null);
  const [preJoinChannelId, setPreJoinChannelId]   = useState<string | null>(null);
  const [showSearch, setShowSearch]               = useState(false);
  const [searchQuery, setSearchQuery]             = useState('');

  const [replyingTo, setReplyingTo]     = useState<ReplyTarget | null>(null);
  const [contextMenu, setContextMenu]   = useState<{ x: number; y: number; msg: ChatMessage } | null>(null);
  const [profileCard, setProfileCard]   = useState<{ anchorLeft: number; anchorRight: number; anchorTop: number; anchorBottom: number; employeeId: string; fallbackName?: string; fallbackDesignation?: string } | null>(null);
  const [forwardMsg, setForwardMsg]     = useState<ChatMessage | null>(null);
  const [showPins, setShowPins]         = useState(false);
  const [showSaved, setShowSaved]       = useState(false);
  // Phones (≤640px): the channel list is a full-screen panel opened from the chat header.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // ≤900px the members column is hidden; the 👥 button opens it as an overlay instead.
  const [narrow, setNarrow] = useState(false);
  const [membersOverlay, setMembersOverlay] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const update = () => { setNarrow(mq.matches); if (!mq.matches) setMembersOverlay(false); };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [toasts, setToasts]             = useState<ToastNotification[]>([]);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDm, setShowNewDm]                 = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const [categories, setCategories]         = useState<Category[]>([]);
  const [channels, setChannels]             = useState<Channel[]>([]);
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [members, setMembers]               = useState<Member[]>([]);
  const [allEmployees, setAllEmployees]     = useState<any[]>([]);
  const [dmConversations, setDmConversations] = useState<DirectMessage[]>([]);

  const msgEndRef           = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLTextAreaElement>(null);
  const typingTimer         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef           = useRef<Socket | null>(null);
  const selChIdRef          = useRef(selectedChannelId);
  const selDmIdRef          = useRef(selectedDmId);
  const prevChIdRef         = useRef<string | null>(null);
  const curUserNameRef      = useRef(user?.name ?? 'You');
  const myIdRef             = useRef(user?.id?.toString() ?? 'me');
  const inVoiceRef          = useRef<string | null>(null);

  useEffect(() => { selChIdRef.current    = selectedChannelId; }, [selectedChannelId]);
  useEffect(() => { selDmIdRef.current    = selectedDmId;      }, [selectedDmId]);
  useEffect(() => { curUserNameRef.current = user?.name ?? 'You'; }, [user?.name]);
  useEffect(() => { myIdRef.current       = user?.id?.toString() ?? 'me'; }, [user?.id]);
  useEffect(() => { inVoiceRef.current    = inVoiceChannel; }, [inVoiceChannel]);

  const myId   = user?.id?.toString() ?? 'me';
  const myName = user?.name ?? 'You';
  const myRole = (user?.role ?? 'employee') as UserRole;

  const selCh  = channels.find(c => c.id === selectedChannelId);
  const activeDm = selectedDmId ? dmConversations.find(d => d.userId === selectedDmId) : null;

  const visChs = channels.filter(ch =>
    ch.is_private ? ch.member_role != null : ROLE_RANK[(ch.required_role ?? 'intern')] <= ROLE_RANK[myRole]
  );

  function canPost(ch?: Channel) {
    if (!ch || ch.type === 'voice') return false;
    if (ch.member_role === 'readonly') return false;
    if (ch.type === 'announcement') return myRole === 'admin' || myRole === 'lead';
    return true;
  }

  const allMems: Member[] = [
    { id: myId, name: myName, designation: user?.role ?? 'employee', status: userStatus },
    ...members.filter(m => m.id !== myId),
  ];

  const employeesById = new Map(allEmployees.map((e: any) => [String(e.id), e]));
  const dmEmployee = activeDm ? employeesById.get(activeDm.userId) as any : null;
  function statusForId(id: string): UserStatus { return id === myId ? userStatus : members.find(m => m.id === id)?.status ?? 'offline'; }
  function openProfile(id: string, e: React.MouseEvent, fallbackName?: string, fallbackDesignation?: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setProfileCard({ anchorLeft: r.left, anchorRight: r.right, anchorTop: r.top, anchorBottom: r.bottom, employeeId: id, fallbackName, fallbackDesignation });
  }

  const paneMsgs = (selectedDmId
    ? messages.filter(m => m.channelId === `dm-${selectedDmId}`)
    : messages.filter(m => m.channelId === selectedChannelId)
  ).filter(m => !searchQuery.trim() || m.content.toLowerCase().includes(searchQuery.toLowerCase()));

  /* ─ Fetch categories ─ */
  useEffect(() => {
    api.get<Category[]>('/inbox/categories')
      .then(d => setCategories(d.sort((a, b) => a.position - b.position)))
      .catch(() => setCategories([{ id: 1, name: 'Channels', position: 0 }]));
  }, []);

  /* ─ Fetch channels ─ */
  useEffect(() => {
    api.get<any[]>('/inbox/channels').then(d => {
      const mapped = d.map(mapApiChannel);
      setChannels(mapped);
      const first = mapped.find(c => c.type !== 'voice' && !c.is_private && ROLE_RANK[(c.required_role ?? 'intern')] <= ROLE_RANK[myRole]);
      if (first) setSelectedChannelId(first.id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─ Fetch employees ─ */
  useEffect(() => {
    employeesApi.list<any>().then(d => {
      setAllEmployees(d);
      setMembers(d.map((e: any) => ({ id: String(e.id), name: e.name, designation: e.designation ?? '', status: 'offline' as UserStatus })));
    }).catch(() => {});
  }, []);

  /* ─ Fetch DM conversations ─ */
  useEffect(() => {
    api.get<any[]>('/inbox/dms').then(d => setDmConversations(d.map((x: any) => ({ userId: String(x.partner_id), userName: x.partner_name, userDesignation: x.partner_designation ?? '', status: 'offline' as UserStatus, unread: x.unread ? Number(x.unread) : undefined })))).catch(() => {});
  }, []);

  /* ─ Fetch channel messages ─ */
  useEffect(() => {
    if (!selectedChannelId) return;
    if (channels.find(c => c.id === selectedChannelId)?.type === 'voice') return;
    api.get<any[]>(`/inbox/channels/${selectedChannelId}/messages`).then(d => {
      setMessages(prev => [...prev.filter(m => m.channelId !== selectedChannelId), ...d.map(mapApiMessage)]);
      api.post(`/inbox/channels/${selectedChannelId}/read`, {}).catch(() => {});
      setChannels(prev => prev.map(c => c.id === selectedChannelId ? { ...c, unread: 0, mentioned: false } : c));
    }).catch(() => {});
  }, [selectedChannelId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─ Fetch DM messages ─ */
  useEffect(() => {
    if (!selectedDmId) return;
    const dmCh = `dm-${selectedDmId}`;
    api.get<any[]>(`/inbox/dms/${selectedDmId}/messages`).then(d => {
      setMessages(prev => [...prev.filter(m => m.channelId !== dmCh), ...d.map((m: any) => mapApiDm(m, dmCh))]);
      setDmConversations(prev => prev.map(dm => dm.userId === selectedDmId ? { ...dm, unread: undefined } : dm));
    }).catch(() => {});
  }, [selectedDmId]);

  /* ─ Socket.IO ─ */
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const wsUrl = BACKEND_URL;
    const socket = io(wsUrl, { path: '/ws/inbox', auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => socket.emit('ping'), 28000);
      // A dropped connection removes us from voice presence server-side; if the
      // LiveKit call is still up, announce ourselves again.
      if (inVoiceRef.current) socket.emit('voice:join', Number(inVoiceRef.current));
    });
    socket.on('disconnect', () => {
      setSocketConnected(false);
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    });

    socket.on('presence:snapshot', (snap: Record<string, string>) => {
      setMembers(prev => prev.map(m => ({ ...m, status: (snap[m.id] as UserStatus) ?? m.status })));
    });
    socket.on('message:new', (msg: any) => {
      if (!msg?.id || !msg?.channel_id) return;
      const mapped = mapApiMessage(msg);
      setMessages(prev => prev.find(m => m.id === mapped.id) ? prev : [...prev, mapped]);
      if (String(msg.channel_id) !== selChIdRef.current) {
        const hasMention = msg.content?.includes(`@${curUserNameRef.current.split(' ')[0]}`);
        setChannels(prev => prev.map(c => c.id === String(msg.channel_id) ? { ...c, unread: (c.unread ?? 0) + 1, mentioned: hasMention || c.mentioned } : c));
      }
    });
    socket.on('message:edited',  (d: { id: number; content: string }) => setMessages(prev => prev.map(m => m.id === String(d.id) ? { ...m, content: d.content, edited: true } : m)));
    socket.on('message:deleted', (d: { id: number }) => setMessages(prev => prev.filter(m => m.id !== String(d.id))));
    socket.on('message:pinned',  (d: { id: number; is_pinned: boolean }) => setMessages(prev => prev.map(m => m.id === String(d.id) ? { ...m, isPinned: d.is_pinned } : m)));
    socket.on('reaction:updated', (d: { message_id: number; reactions: Array<{ emoji: string; users: number[] }> }) => {
      setMessages(prev => prev.map(m => m.id === String(d.message_id) ? { ...m, reactions: d.reactions.map(r => ({ emoji: r.emoji, users: r.users.map(String) })) } : m));
    });
    socket.on('typing:update', (d: { channelId: string; users: string[] }) => {
      if (d.channelId === selChIdRef.current) setTypingUsers(d.users.filter(n => n !== curUserNameRef.current));
    });
    socket.on('presence:update', (d: { employee_id: number; status: UserStatus }) => {
      setMembers(prev => prev.map(m => m.id === String(d.employee_id) ? { ...m, status: d.status } : m));
      setDmConversations(prev => prev.map(dm => dm.userId === String(d.employee_id) ? { ...dm, status: d.status } : dm));
    });
    socket.on('dm:sent', (d: { id: number }) => {
      /* Replace the optimistic local message with the real server-confirmed one */
      setMessages(prev => {
        const localIdx = prev.findIndex(m => m.isLocal && m.channelId === `dm-${selDmIdRef.current}`);
        if (localIdx === -1) return prev;
        const updated = [...prev];
        updated[localIdx] = { ...updated[localIdx], id: String(d.id), isLocal: false };
        return updated;
      });
    });
    socket.on('dm:edited', (d: { id: number; content: string }) => {
      setMessages(prev => prev.map(m => m.id === String(d.id) ? { ...m, content: d.content, edited: true } : m));
    });
    socket.on('dm:deleted', (d: { id: number }) => {
      setMessages(prev => prev.filter(m => m.id !== String(d.id)));
    });
    socket.on('dm:new', (d: { id: number; from: number; from_name: string; to: number; content: string; created_at: string }) => {
      const isMine    = String(d.from) === myIdRef.current;
      // For own messages the partner is d.to; for received messages the partner is d.from
      const partnerId = isMine ? String(d.to) : String(d.from);
      const dmCh      = `dm-${partnerId}`;

      if (isMine) {
        // If this tab has a pending local (optimistic) message, dm:sent will handle it — skip here
        setMessages(prev => {
          if (prev.find(m => m.id === String(d.id))) return prev;
          if (prev.some(m => m.isLocal && m.channelId === dmCh)) return prev;
          // Another tab of ours sent this — add it if we're viewing the conversation
          if (selDmIdRef.current !== partnerId) return prev;
          return [...prev, { id: String(d.id), channelId: dmCh, userId: String(d.from), userName: d.from_name, userDesignation: '', content: d.content, timestamp: new Date(d.created_at ?? Date.now()), edited: false, reactions: [] }];
        });
        return;
      }

      if (selDmIdRef.current === partnerId) {
        setMessages(prev => prev.find(m => m.id === String(d.id)) ? prev : [...prev, { id: String(d.id), channelId: dmCh, userId: String(d.from), userName: d.from_name, userDesignation: '', content: d.content, timestamp: new Date(d.created_at ?? Date.now()), edited: false, reactions: [] }]);
      } else {
        setToasts(prev => [...prev, { id: `dm-${d.id}`, type: 'dm', title: d.from_name, body: d.content, dmUserId: partnerId }]);
        setDmConversations(prev => { const ex = prev.find(dm => dm.userId === partnerId); if (ex) return prev.map(dm => dm.userId === partnerId ? { ...dm, unread: (dm.unread ?? 0) + 1 } : dm); return [{ userId: String(d.from), userName: d.from_name, userDesignation: '', status: 'online' as UserStatus, unread: 1 }, ...prev]; });
      }
    });

    socket.on('channel:created',  (ch: any)           => setChannels(prev => [...prev, mapApiChannel(ch)]));
    socket.on('channel:updated',  (ch: any)           => setChannels(prev => prev.map(c => c.id === String(ch?.id) ? { ...c, ...mapApiChannel(ch) } : c)));
    socket.on('channel:deleted',  (d: { id: number }) => { setChannels(prev => prev.filter(c => c.id !== String(d.id))); if (selChIdRef.current === String(d.id)) setSelectedChannelId(''); });
    socket.on('category:created', (cat: any)          => setCategories(prev => [...prev, cat].sort((a, b) => a.position - b.position)));
    socket.on('category:updated', (cat: any)          => setCategories(prev => prev.map(c => c.id === cat.id ? cat : c)));
    socket.on('category:deleted', (d: { id: number }) => setCategories(prev => prev.filter(c => c.id !== d.id)));

    const onPageHide = () => { if (inVoiceRef.current) socket.emit('voice:leave', Number(inVoiceRef.current)); };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      // Navigating away from /inbox ends the call (VoiceRoom hangs up LiveKit on unmount).
      if (inVoiceRef.current) socket.emit('voice:leave', Number(inVoiceRef.current));
      socket.disconnect(); socketRef.current = null;
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      setSocketConnected(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─ Join/leave channel room ─ */
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !socketConnected) return;
    if (prevChIdRef.current) s.emit('leave-channel', prevChIdRef.current);
    if (selectedChannelId)   s.emit('join-channel',  selectedChannelId);
    prevChIdRef.current = selectedChannelId || null;
  }, [selectedChannelId, socketConnected]);

  /* ─ Voice presence listeners ─ */
  // Keyed on the voice-channel ids only: `channels` changes on every unread-count
  // bump, which used to refetch presence and clobber the live list mid-call.
  const voiceChannelIds = channels.filter(c => c.type === 'voice').map(c => c.id).join(',');
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !socketConnected || !voiceChannelIds) return;
    api.get<any[]>('/inbox/voice').then(d => {
      const g: Record<string, string[]> = {};
      for (const e of d) { const id = String(e.channel_id); if (!g[id]) g[id] = []; if (!g[id].includes(e.name)) g[id].push(e.name); }
      setVcOccupants(g);
    }).catch(() => {});
    const offs: Array<() => void> = [];
    for (const id of voiceChannelIds.split(',')) {
      const ev = `voice:presence:${id}`;
      const h = (occ: Array<{ employee_id: number; name: string }>) => setVcOccupants(prev => ({ ...prev, [id]: Array.from(new Set(occ.map(o => o.name))) }));
      s.on(ev, h); offs.push(() => s.off(ev, h));
    }
    return () => offs.forEach(fn => fn());
  }, [socketConnected, voiceChannelIds]);

  /* ─ Auto-scroll ─ */
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [paneMsgs.length]);

  /* ─ Navigation ─ */
  function selChannel(id: string) { setSelectedChannelId(id); setSelectedDmId(null); setChannels(prev => prev.map(c => c.id === id ? { ...c, unread: 0, mentioned: false } : c)); setReplyingTo(null); setShowPins(false); setShowSaved(false); setShowSearch(false); setSearchQuery(''); }
  function selDm(id: string, name?: string, des?: string) { setSelectedDmId(id); setSelectedChannelId(''); setReplyingTo(null); setShowPins(false); setShowSaved(false); setShowSearch(false); setSearchQuery(''); setDmConversations(prev => { const ex = prev.find(d => d.userId === id); if (ex) return prev.map(d => d.userId === id ? { ...d, unread: undefined } : d); return [{ userId: id, userName: name ?? id, userDesignation: des ?? '', status: 'offline', unread: undefined }, ...prev]; }); }

  function handleStatus(status: UserStatus) { setUserStatus(status); socketRef.current?.emit('presence:set', status); }

  /* ─ Send ─ */
  function sendMsg() {
    const text = inputValue.trim(); if (!text) return;
    if (selectedDmId) {
      socketRef.current?.emit('dm:send', { toUserId: Number(selectedDmId), content: text });
      setMessages(prev => [...prev, { id: `local-${Date.now()}`, channelId: `dm-${selectedDmId}`, userId: myId, userName: myName, userDesignation: user?.role ?? '', content: text, timestamp: new Date(), edited: false, reactions: [], isLocal: true }]);
    } else if (selectedChannelId) {
      socketRef.current?.emit('message:send', { channelId: Number(selectedChannelId), content: text, replyToId: replyingTo ? Number(replyingTo.id) : undefined });
    }
    setInputValue(''); setReplyingTo(null); setMentionQuery(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }

  async function sendAudioMsg(blob: Blob, duration: number) {
    if (!selectedDmId) return;
    setShowAudioRecorder(false);

    const blobUrl  = URL.createObjectURL(blob);
    const localId  = `local-${Date.now()}`;
    const dmCh     = `dm-${selectedDmId}`;

    // Show immediately using local blob URL so sender can play it right away
    setMessages(prev => [...prev, {
      id: localId, channelId: dmCh, userId: myId,
      userName: myName, userDesignation: user?.role ?? '',
      content: `__audio__:${duration}:${blobUrl}`,
      timestamp: new Date(), edited: false, reactions: [],
      isLocal: true, isSending: true,
    }]);

    try {
      const form = new FormData();
      form.append('audio', blob, `voice-${Date.now()}.webm`);
      const { key, presignedUrl } = await api.postForm<{ key: string; presignedUrl: string }>('/inbox/dms/audio', form);

      // Swap blob URL → presigned URL and clear sending state
      setMessages(prev => prev.map(m =>
        m.id === localId
          ? { ...m, content: `__audio__:${duration}:${presignedUrl}`, isSending: false }
          : m,
      ));
      URL.revokeObjectURL(blobUrl);

      // Emit to socket only after upload succeeds — recipients see it when it's ready
      socketRef.current?.emit('dm:send', { toUserId: Number(selectedDmId), content: `__audio__:${duration}:${key}` });
    } catch {
      // Mark failed so user knows to retry
      setMessages(prev => prev.map(m =>
        m.id === localId ? { ...m, isSending: false, sendFailed: true } : m,
      ));
      URL.revokeObjectURL(blobUrl);
    }
  }

  function handleKD(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    if (e.key === 'Escape') { setReplyingTo(null); setMentionQuery(null); }
  }

  function handleIC(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value);
    e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`;
    setMentionQuery(getMentionQuery(e.target));
    if (!selectedDmId && selectedChannelId) {
      socketRef.current?.emit('typing:start', selectedChannelId);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => socketRef.current?.emit('typing:stop', selectedChannelId), 2500);
    }
  }

  /* ─ Reactions ─ */
  function toggleReaction(msgId: string, emoji: string) {
    /* Reactions are channel-only; skip if we're in a DM */
    if (selectedDmId) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const ex = m.reactions.find(r => r.emoji === emoji);
      if (!ex) return { ...m, reactions: [...m.reactions, { emoji, users: [myId] }] };
      const u = ex.users.includes(myId) ? ex.users.filter(x => x !== myId) : [...ex.users, myId];
      if (u.length === 0) return { ...m, reactions: m.reactions.filter(r => r.emoji !== emoji) };
      return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, users: u } : r) };
    }));
    socketRef.current?.emit('reaction:toggle', { messageId: Number(msgId), emoji, channelId: Number(selectedChannelId) });
  }

  /* ─ Message actions ─ */
  function deleteMsg(id: string) {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selectedDmId) {
      socketRef.current?.emit('dm:delete', { messageId: Number(id) });
    } else {
      socketRef.current?.emit('message:delete', { messageId: Number(id), channelId: Number(selectedChannelId) });
    }
  }
  function startEdit(m: ChatMessage) { setEditingId(m.id); setEditValue(m.content); }
  function submitEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: trimmed, edited: true } : m));
    if (selectedDmId) {
      socketRef.current?.emit('dm:edit', { messageId: Number(id), content: trimmed });
    } else {
      socketRef.current?.emit('message:edit', { messageId: Number(id), content: trimmed, channelId: Number(selectedChannelId) });
    }
    setEditingId(null);
    setEditValue('');
  }

  async function pinMsg(msgId: string, pin: boolean) { try { await api.patch(`/inbox/messages/${msgId}/pin`, {}); setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: pin } : m)); } catch {} }
  async function saveMsg(msgId: string) { try { await api.post(`/inbox/messages/${msgId}/save`, {}); } catch {} }
  async function fwdMsg(msgId: string, tid: string, ttype: 'channel' | 'dm') { try { await api.post(`/inbox/messages/${msgId}/forward`, { targetId: Number(tid), targetType: ttype }); } catch {} }

  /* ─ Context menu ─ */
  function buildActions(msg: ChatMessage): ContextAction[] {
    const isOwn  = msg.userId === myId;
    const inDm   = Boolean(selectedDmId);
    const canPin = !inDm && (myRole === 'admin' || myRole === 'lead');
    return [
      { label: 'Reply',         icon: '↩️', onClick: () => setReplyingTo({ id: msg.id, userName: msg.userName, content: msg.content }) },
      { label: 'Forward',       icon: '↪️', onClick: () => setForwardMsg(msg) },
      ...(!inDm ? [{ label: 'Add Reaction', icon: '😊', onClick: () => toggleReaction(msg.id, '👍') }] : []),
      { label: 'Copy Text',     icon: '📋', onClick: () => navigator.clipboard.writeText(msg.content).catch(() => {}) },
      { label: 'Save Message',  icon: '🔖', onClick: () => saveMsg(msg.id) },
      ...(canPin || isOwn ? [{ label: '', icon: '', divider: true, onClick: () => {} }] : []),
      ...(canPin ? [{ label: msg.isPinned ? 'Unpin' : 'Pin Message', icon: '📌', onClick: () => pinMsg(msg.id, !msg.isPinned) }] : []),
      ...(isOwn  ? [{ label: 'Edit',   icon: '✏️', onClick: () => startEdit(msg) }] : []),
      ...((isOwn || myRole === 'admin') ? [{ label: '', icon: '', divider: true, onClick: () => {} }, { label: 'Delete', icon: '🗑️', danger: true, onClick: () => deleteMsg(msg.id) }] : []),
    ];
  }

  /* ─ Voice ─ */
  async function joinVoice(chId: string) {
    setPreJoinChannelId(chId);
  }

  async function confirmJoinVoice(chId: string) {
    setPreJoinChannelId(null);
    try {
      const d = await api.get<VoiceToken>(`/inbox/voice/${chId}/token`);
      setVoiceToken(d);
      setInVoiceChannel(chId);
      setVcOccupants(prev => {
        const next: Record<string, string[]> = {};
        for (const [id, names] of Object.entries(prev)) next[id] = names.filter(n => n !== myName);
        next[chId] = [...(next[chId] ?? []), myName];
        return next;
      });
      socketRef.current?.emit('voice:join', Number(chId));
      selChannel(chId);
    } catch {
      setVoiceToken(null);
    }
  }
  function leaveVoice() {
    if (!inVoiceChannel) return;
    socketRef.current?.emit('voice:leave', Number(inVoiceChannel));
    setVcOccupants(prev => ({ ...prev, [inVoiceChannel]: (prev[inVoiceChannel] ?? []).filter(n => n !== myName) }));
    setInVoiceChannel(null); setVoiceToken(null); setMicMuted(false); setDeafened(false); setCallHands([]);
  }

  function toggleCat(id: string) { setCollapsedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const chIcon = (t: ChannelType) => t === 'announcement' ? '/icons/bell.svg' : '/icons/hash.svg';

  if (loading) return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#313338]">
      <span className="size-8 animate-spin rounded-full border-[3px] border-[#5865f2] border-t-transparent" />
      <div className="text-sm text-[#949ba4]">Connecting to Inbox…</div>
    </div>
  );

  /* Shared class strings for the sidebar rows */
  const rowBase   = 'group relative mx-2 my-px flex min-w-0 cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-[15px] font-medium leading-5 transition-colors';
  const rowIdle   = 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]';
  const rowActive = 'bg-[#404249] text-white';
  const catHeader = 'group flex cursor-pointer select-none items-center gap-0.5 pb-1 pl-1.5 pr-3 pt-4 text-xs font-semibold uppercase tracking-wide text-[#949ba4] hover:text-[#dbdee1]';
  const addBtn    = 'ml-auto flex size-4 items-center justify-center text-lg leading-none text-[#949ba4] hover:text-[#dbdee1]';
  const panelBtn  = 'flex size-8 shrink-0 items-center justify-center rounded text-[#b5bac1] transition-colors hover:bg-[#3d3e45] hover:text-[#dbdee1]';
  const headerBtn = 'flex size-6 shrink-0 items-center justify-center text-[#b5bac1] transition-colors hover:text-[#dbdee1]';
  const headerShadow = 'shadow-[0_1px_0_rgba(4,4,5,0.2),0_1.5px_0_rgba(6,6,7,0.05),0_2px_0_rgba(4,4,5,0.05)]';
  const unreadPill = <span className="absolute -left-2 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white" />;
  const badge = 'ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#f23f43] px-1 text-[11px] font-bold leading-none text-white';

  const membersVisible = narrow ? membersOverlay : showMembers;
  const viewingCall = !showSaved && selCh?.type === 'voice' && inVoiceChannel === selCh.id && Boolean(voiceToken);

  /* ─── RENDER ─── */
  return (
    <div className="fixed inset-0 z-10 flex overflow-hidden bg-[#313338] font-[family-name:var(--font-family)] text-[#dbdee1]">

      {/* Toasts */}
      <NotificationToastStack notifications={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} onOpen={n => { if (n.dmUserId) selDm(n.dmUserId); else if (n.channelId) selChannel(n.channelId); }} />

      {/* Context menu */}
      {contextMenu && <MessageContextMenu x={contextMenu.x} y={contextMenu.y} actions={buildActions(contextMenu.msg)} onClose={() => setContextMenu(null)} />}
      {profileCard && (() => {
        const emp  = employeesById.get(profileCard.employeeId) as any;
        const name = emp?.name ?? profileCard.fallbackName ?? 'Unknown';
        const designation = emp?.designation ?? profileCard.fallbackDesignation ?? '';
        const isSelf = profileCard.employeeId === myId;
        return (
          <ProfilePopover
            anchorLeft={profileCard.anchorLeft} anchorRight={profileCard.anchorRight} anchorTop={profileCard.anchorTop} anchorBottom={profileCard.anchorBottom}
            employee={{ id: profileCard.employeeId, name, designation, department: emp?.department, role: emp?.role, email: emp?.email, start_date: emp?.start_date, discord_username: emp?.discord_username, github_url: emp?.github_url }}
            status={statusForId(profileCard.employeeId)}
            isSelf={isSelf}
            onClose={() => setProfileCard(null)}
            onMessage={isSelf ? undefined : () => { selDm(profileCard.employeeId, name, designation); setProfileCard(null); }}
          />
        );
      })()}

      {/* Modals */}
      {showCreateChannel && <CreateChannelModal categories={categories} onClose={() => setShowCreateChannel(false)} onCreate={d => api.post('/inbox/channels', d)} />}
      {showNewDm && <NewDmModal employees={allEmployees.filter((e: any) => String(e.id) !== myId)} onClose={() => setShowNewDm(false)} onSelect={(e: any) => selDm(String(e.id), e.name, e.designation)} />}
      {forwardMsg && <ForwardModal messageContent={forwardMsg.content} channels={channels} dmConversations={dmConversations} onForward={(tid, tt) => fwdMsg(forwardMsg.id, tid, tt)} onClose={() => setForwardMsg(null)} />}
      {preJoinChannelId && (
        <PreJoinModal
          channelName={channels.find(c => c.id === preJoinChannelId)?.name ?? 'Voice'}
          onJoin={() => confirmJoinVoice(preJoinChannelId)}
          onCancel={() => setPreJoinChannelId(null)}
        />
      )}

      {/* ── Sidebar ── */}
      {/* Picking any channel / DM / voice channel / Saved closes the phone panel. */}
      <div
        className={cn(
          'flex w-60 shrink-0 flex-col overflow-hidden bg-[#2b2d31] max-[900px]:w-[200px]',
          'max-sm:absolute max-sm:inset-0 max-sm:z-40 max-sm:w-auto',
          !mobileNavOpen && 'max-sm:hidden',
        )}
        onClick={e => {
          if ((e.target as HTMLElement).closest('[data-nav-item]')) setMobileNavOpen(false);
        }}
      >
        <div className={cn('relative z-[1] flex h-12 shrink-0 select-none items-center gap-2 px-4 text-base font-semibold text-[#f2f3f5] transition-colors hover:bg-[#35373c]', headerShadow)}>
          <span className="truncate">HR Platform</span>
          <span
            className={cn('size-2 shrink-0 rounded-full', socketConnected ? 'bg-[#23a55a]' : 'animate-pulse bg-[#80848e]')}
            title={socketConnected ? 'Connected' : 'Reconnecting…'}
          />
          <button type="button" className="ml-auto hidden size-8 items-center justify-center rounded text-[#b5bac1] hover:bg-[#404249] hover:text-white max-sm:flex" aria-label="Close channel list" onClick={() => setMobileNavOpen(false)}>
            <Icon src="/icons/x.svg" className="size-[18px]" />
          </button>
        </div>

        <div className={cn('min-h-0 flex-1 overflow-y-auto pb-4 pt-2', ui.scroll)}>
          {/* The app sidebar is hidden on /inbox — this is the way back */}
          <Link
            href="/"
            className="mx-2 mb-2 flex items-center gap-2 rounded-[4px] bg-[#1e1f22] px-2.5 py-2 text-sm font-medium text-[#dbdee1] transition-colors hover:bg-[#5865f2] hover:text-white"
          >
            <Icon src="/icons/arrow-left.svg" className="size-4" />
            Go back to Dashboard
          </Link>

          {/* Saved messages shortcut */}
          <div
            data-nav-item
            className={cn(rowBase, showSaved ? rowActive : rowIdle)}
            onClick={() => { setShowSaved(true); setShowPins(false); setSelectedChannelId(''); setSelectedDmId(null); }}
          >
            <Icon src="/icons/bookmark.svg" className="size-5 opacity-80" />
            <span className="min-w-0 flex-1 truncate">Saved Messages</span>
          </div>

          {categories.map(cat => {
            const catChs  = visChs.filter(c => c.category_id === cat.id);
            const isCol   = collapsedCats.has(String(cat.id));
            return (
              <div key={cat.id}>
                <div className={catHeader} onClick={() => toggleCat(String(cat.id))}>
                  <Icon src="/icons/chevron-down.svg" className={cn('size-3 transition-transform', isCol && '-rotate-90')} />
                  <span className="truncate">{cat.name}</span>
                  {myRole === 'admin' && <button className={addBtn} title="Create channel" onClick={e => { e.stopPropagation(); setShowCreateChannel(true); }}>+</button>}
                </div>
                {catChs.map(ch => {
                  const active = selectedChannelId === ch.id;
                  // Collapsed categories still show the selected / unread channels, like Discord.
                  if (isCol && !active && !ch.unread) return null;
                  if (ch.type === 'voice') {
                    const occ = Array.from(new Set(vcOccupants[ch.id] ?? []));
                    return (
                      <div key={ch.id}>
                        <div data-nav-item className={cn(rowBase, active ? rowActive : rowIdle)} onClick={() => selChannel(ch.id)}>
                          <Icon src="/icons/volume-2.svg" className="size-5 opacity-80" />
                          <span className="min-w-0 flex-1 truncate">{ch.name}</span>
                          {ch.is_private && <Icon src="/icons/lock.svg" className="size-3 opacity-70" />}
                          {inVoiceChannel !== ch.id && (
                            <button
                              className="ml-auto flex size-5 shrink-0 items-center justify-center rounded text-[#b5bac1] opacity-0 transition hover:text-[#23a55a] group-hover:opacity-100 pointer-coarse:opacity-100"
                              title="Join"
                              onClick={e => { e.stopPropagation(); joinVoice(ch.id); }}
                            >
                              <Icon src="/icons/phone.svg" className="size-4" />
                            </button>
                          )}
                        </div>
                        {occ.length > 0 && (
                          <div className="mb-1 ml-9 mr-2 flex flex-col">
                            {occ.map(n => (
                              <div key={n} className="flex items-center gap-2 rounded px-2 py-1 text-sm text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]">
                                <Avatar name={n} size="size-6" text="text-[10px]" />
                                <span className="truncate">{n}</span>
                                {inVoiceChannel === ch.id && callHands.includes(n) && <span className="ml-auto text-xs" title="Hand raised">✋</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const unread = Boolean(ch.unread) && !active;
                  return (
                    <div key={ch.id} data-nav-item className={cn(rowBase, active ? rowActive : unread ? 'text-[#f2f3f5] hover:bg-[#35373c]' : rowIdle, unread && 'font-semibold')} onClick={() => selChannel(ch.id)}>
                      {unread && unreadPill}
                      <Icon src={chIcon(ch.type)} className="size-5 opacity-80" />
                      <span className="min-w-0 flex-1 truncate">{ch.name}</span>
                      {ch.is_private && <Icon src="/icons/lock.svg" className="size-3 opacity-70" />}
                      {ch.member_role === 'readonly' && <Icon src="/icons/eye.svg" className="size-3.5 opacity-60" />}
                      {ch.mentioned && <span className={badge}>{ch.unread || '@'}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* DMs */}
          <div className={catHeader} onClick={() => setDmCollapsed(p => !p)}>
            <Icon src="/icons/chevron-down.svg" className={cn('size-3 transition-transform', dmCollapsed && '-rotate-90')} />
            <span>Direct Messages</span>
            <button className={addBtn} title="Create DM" onClick={e => { e.stopPropagation(); setShowNewDm(true); }}>+</button>
          </div>
          {!dmCollapsed && dmConversations.map(dm => {
            const active = selectedDmId === dm.userId;
            return (
              <div key={dm.userId} data-nav-item className={cn(rowBase, 'gap-3 py-[5px]', active ? rowActive : dm.unread ? 'text-[#f2f3f5] hover:bg-[#35373c]' : rowIdle)} onClick={() => selDm(dm.userId)}>
                {dm.unread && !active ? unreadPill : null}
                <Avatar name={dm.userName} size="size-8" text="text-xs" status={dm.status} dot="size-2.5 border-[3px]" ring={active ? 'border-[#404249]' : 'border-[#2b2d31] group-hover:border-[#35373c]'} />
                <span className="min-w-0 flex-1 truncate">{dm.userName}</span>
                {dm.unread ? <span className={badge}>{dm.unread}</span> : null}
              </div>
            );
          })}
        </div>

        {/* Voice connected strip */}
        {inVoiceChannel && (
          <div className="flex items-center gap-2 border-b border-[#2b2d31] bg-[#232428] px-2 py-2">
            <div className="min-w-0 flex-1 pl-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#23a55a]">
                <span className="size-2 rounded-full bg-[#23a55a]" />Voice Connected
              </div>
              <button className="block max-w-full truncate text-xs text-[#b5bac1] hover:underline" onClick={() => selChannel(inVoiceChannel)}>
                {channels.find(c => c.id === inVoiceChannel)?.name ?? 'Voice'}
                {callHands.length > 0 && <span className="ml-1.5 text-[#f0b232]">✋ {callHands.length}</span>}
              </button>
            </div>
            <button className={cn(panelBtn, 'hover:text-[#f23f43]')} title="Disconnect" onClick={leaveVoice}>
              <Icon src="/icons/phone-off.svg" />
            </button>
          </div>
        )}

        {/* User panel */}
        <div className="flex h-[52px] shrink-0 items-center gap-1 bg-[#232428] px-2">
          <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded py-1 pl-0.5 pr-2 transition-colors hover:bg-[#3d3e45]" title="View your profile" onClick={e => openProfile(myId, e, myName, user?.role)}>
            <Avatar name={myName} size="size-8" text="text-xs" status={userStatus} dot="size-2.5 border-[3px]" ring="border-[#232428]" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-[18px] text-[#f2f3f5]">{myName}</div>
              <div className="truncate text-xs capitalize leading-[13px] text-[#b5bac1]">{user?.role}</div>
            </div>
          </div>
          <StatusSelector status={userStatus} onChange={handleStatus} />
          <button className={cn(panelBtn, micMuted && 'text-[#f23f43] hover:text-[#f23f43]')} title={micMuted ? 'Unmute' : 'Mute'} onClick={() => setMicMuted(p => !p)}>
            <Icon src={micMuted ? '/icons/mic-off.svg' : '/icons/mic.svg'} />
          </button>
          <button className={cn(panelBtn, deafened && 'text-[#f23f43] hover:text-[#f23f43]')} title={deafened ? 'Undeafen' : 'Deafen'} onClick={() => setDeafened(p => !p)}>
            <Icon src="/icons/headphones.svg" />
          </button>
          <button className={cn(panelBtn, 'max-[900px]:hidden max-sm:flex')} title="User Settings">
            <Icon src="/icons/settings.svg" />
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-[#313338]">
        {/* Header */}
        <div className={cn('relative z-[2] flex h-12 shrink-0 items-center gap-2 px-4', headerShadow)}>
          <button type="button" className={cn(headerBtn, 'mr-1 hidden max-sm:flex')} title="Channels" aria-label="Open channel list" onClick={() => setMobileNavOpen(true)}>
            <Icon src="/icons/menu.svg" />
          </button>
          {activeDm ? (
            <>
              <Avatar name={activeDm.userName} size="size-6" text="text-[10px]" status={activeDm.status} dot="size-2 border-2" ring="border-[#313338]" onClick={e => openProfile(activeDm.userId, e, activeDm.userName, activeDm.userDesignation)} />
              <span className="cursor-pointer truncate text-base font-semibold text-[#f2f3f5] hover:underline" onClick={e => openProfile(activeDm.userId, e, activeDm.userName, activeDm.userDesignation)}>{activeDm.userName}</span>
              {activeDm.userDesignation && <><span className="mx-2 h-6 w-px shrink-0 bg-[#3f4147] max-md:hidden" /><span className="min-w-0 truncate text-sm text-[#949ba4] max-md:hidden">{activeDm.userDesignation}</span></>}
            </>
          ) : showSaved ? (
            <><Icon src="/icons/bookmark.svg" className="size-6 text-[#80848e]" /><span className="truncate text-base font-semibold text-[#f2f3f5]">Saved Messages</span></>
          ) : selCh ? (
            <>
              <Icon src={selCh.type === 'voice' ? '/icons/volume-2.svg' : chIcon(selCh.type)} className="size-6 text-[#80848e]" />
              <span className="truncate text-base font-semibold text-[#f2f3f5]">{selCh.name}</span>
              {selCh.description && <><span className="mx-2 h-6 w-px shrink-0 bg-[#3f4147] max-md:hidden" /><span className="min-w-0 truncate text-sm text-[#949ba4] max-md:hidden" title={selCh.description}>{selCh.description}</span></>}
            </>
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-4 pl-2">
            {!showSaved && selCh?.type !== 'voice' && (
              <>
                {selCh && !selectedDmId && (
                  <button className={cn(headerBtn, showPins && 'text-[#f2f3f5]')} title="Pinned Messages" onClick={() => { setShowPins(p => !p); setShowSaved(false); }}>
                    <span className={cn('text-base leading-none transition', !showPins && 'opacity-60 grayscale hover:opacity-100')}>📌</span>
                  </button>
                )}
              </>
            )}
            <button className={cn(headerBtn, membersVisible && 'text-[#f2f3f5]')} title={membersVisible ? 'Hide Member List' : 'Show Member List'} onClick={() => narrow ? setMembersOverlay(o => !o) : setShowMembers(p => !p)}>
              <Icon src="/icons/users.svg" />
            </button>
            {!showSaved && selCh?.type !== 'voice' && (
              <div className="relative max-sm:hidden">
                <input
                  className={cn('h-6 rounded bg-[#1e1f22] pl-2 pr-7 text-sm text-[#dbdee1] outline-none transition-[width] duration-200 placeholder:text-[#949ba4]', showSearch || searchQuery ? 'w-60' : 'w-36')}
                  placeholder="Search"
                  value={searchQuery}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setShowSearch(false)}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); (e.target as HTMLInputElement).blur(); } }}
                />
                {searchQuery
                  ? <button className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-[#b5bac1] hover:text-[#dbdee1]" onMouseDown={e => { e.preventDefault(); setSearchQuery(''); }} aria-label="Clear search">✕</button>
                  : <Icon src="/icons/search.svg" className="pointer-events-none absolute right-1.5 top-1/2 size-4 -translate-y-1/2 text-[#949ba4]" />}
              </div>
            )}
          </div>
        </div>

        {/* Pinned panel */}
        {showPins && selCh && selCh.type !== 'voice' && (
          <PinnedMessagesPanel channelId={selCh.id} channelName={selCh.name} canPin={myRole === 'admin' || myRole === 'lead'} onClose={() => setShowPins(false)} onJumpTo={msgId => { setShowPins(false); const el = document.getElementById(`msg-${msgId}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add(HIGHLIGHT_CLASS); setTimeout(() => el?.classList.remove(HIGHLIGHT_CLASS), 2000); }} />
        )}

        {/* Saved panel */}
        {showSaved && <SavedMessagesPanel onClose={() => setShowSaved(false)} />}

        {/* Active call — stays mounted while you browse other channels/DMs, so the
            call only ends via "Leave", leaving /inbox, or closing the tab. */}
        {inVoiceChannel && voiceToken && (
          <div className={viewingCall ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
            <VoiceRoom
              key={voiceToken.token}
              token={voiceToken.token}
              serverUrl={voiceToken.url}
              channelName={channels.find(c => c.id === inVoiceChannel)?.name ?? 'Voice'}
              micMuted={micMuted}
              deafened={deafened}
              onLeave={leaveVoice}
              onMicMutedChange={setMicMuted}
              onDeafenedChange={setDeafened}
              onParticipantsChange={ps => {
                setVcOccupants(prev => ({ ...prev, [inVoiceChannel]: Array.from(new Set(ps.map(p => p.name))) }));
                setCallHands(ps.filter(p => p.handRaisedAt).map(p => p.name));
              }}
              onHandRaised={name => setToasts(prev => [...prev, { id: `hand-${name}-${Date.now()}`, type: 'hand', title: name, body: 'raised their hand', channelId: inVoiceChannel }])}
              onHandLoweredByOther={by => setToasts(prev => [...prev, { id: `hand-lowered-${Date.now()}`, type: 'hand', title: by, body: 'lowered your hand', channelId: inVoiceChannel }])}
            />
          </div>
        )}

        {/* Voice channel you're not in → presence / join screen */}
        {!showSaved && selCh?.type === 'voice' ? (
          viewingCall ? null
            : <PresenceVoiceView channel={selCh} occupants={vcOccupants[selCh.id] ?? []} isInChannel={inVoiceChannel === selCh.id} micMuted={micMuted} deafened={deafened} onJoin={() => joinVoice(selCh.id)} onLeave={leaveVoice} onToggleMic={() => setMicMuted(p => !p)} onToggleDeafen={() => setDeafened(p => !p)} />
        ) : !showSaved ? (
          <>
            <div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-color:#1a1b1e_#2b2d31]')}>
              {/* Channel / DM welcome — sits at the top of history, pushed down when history is short */}
              <div className="mt-auto px-4 pb-4 pt-16">
                {activeDm ? (
                  <Avatar
                    name={activeDm.userName}
                    size="size-20"
                    text="text-3xl"
                    status={activeDm.status}
                    dot="size-4 border-[5px]"
                    ring="border-[#313338]"
                    onClick={e => openProfile(activeDm.userId, e, activeDm.userName, activeDm.userDesignation)}
                  />
                ) : (
                  <div className="flex size-[68px] items-center justify-center rounded-full bg-[#41434a]">
                    <Icon src={selCh ? chIcon(selCh.type) : '/icons/hash.svg'} className="size-10 text-white" />
                  </div>
                )}
                <h2 className="mb-2 mt-2 text-[32px] font-bold leading-10 text-[#f2f3f5] max-sm:text-2xl">
                  {activeDm ? activeDm.userName : selCh ? `Welcome to #${selCh.name}!` : 'Inbox'}
                </h2>
                {activeDm?.userDesignation && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xl font-medium text-[#dbdee1] max-sm:text-base">
                    {activeDm.userDesignation}
                    {dmEmployee?.role && <span className="rounded bg-[#5865f2]/20 px-1.5 py-0.5 text-xs font-semibold text-[#c9cdfb]">{ROLE_LABEL[dmEmployee.role] ?? dmEmployee.role}</span>}
                  </div>
                )}
                <p className="text-base text-[#b5bac1]">
                  {activeDm
                    ? <>This is the beginning of your direct message history with <strong className="font-semibold text-[#dbdee1]">{activeDm.userName}</strong>.</>
                    : selCh?.description ? selCh.description : selCh ? `This is the start of the #${selCh.name} channel.` : 'Start a conversation.'}
                </p>
              </div>

              <MessageList messages={paneMsgs} myId={myId} myName={myName} editingId={editingId} editValue={editValue}
                onEditChange={setEditValue} onEditSubmit={submitEdit} onEditCancel={() => setEditingId(null)}
                onReaction={toggleReaction} onDelete={deleteMsg} onStartEdit={startEdit}
                onCtxMenu={(msg, x, y) => setContextMenu({ msg, x, y })}
                onReply={msg => setReplyingTo({ id: msg.id, userName: msg.userName, content: msg.content })}
                onForward={msg => setForwardMsg(msg)}
                onOpenProfile={openProfile}
                inDm={Boolean(selectedDmId)}
                searching={Boolean(searchQuery.trim())}
              />
              <div ref={msgEndRef} />
            </div>

            <div className="shrink-0 px-4 max-sm:px-2">
              {selCh?.type === 'announcement' && !canPost(selCh) && <div className="rounded-lg bg-[#383a40] px-4 py-3 text-sm text-[#949ba4]">📢 Only admins and leads can post in this channel.</div>}
              {selCh?.member_role === 'readonly' && <div className="rounded-lg bg-[#383a40] px-4 py-3 text-sm text-[#949ba4]">👁 You have read-only access to this channel.</div>}

              {(canPost(selCh) || selectedDmId) && (
                showAudioRecorder && selectedDmId
                  ? <AudioRecorder
                      onSend={sendAudioMsg}
                      onCancel={() => setShowAudioRecorder(false)}
                    />
                  : <div className="relative">
                      {mentionQuery !== null && <MentionAutocomplete query={mentionQuery} employees={allMems} onSelect={name => { if (!inputRef.current) return; setInputValue(applyMention(inputRef.current, name)); setMentionQuery(null); inputRef.current.focus(); }} onClose={() => setMentionQuery(null)} anchorEl={inputRef.current} />}
                      {replyingTo && <ReplyPreview replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} />}
                      <div className={cn('flex items-start rounded-lg bg-[#383a40]', replyingTo && 'rounded-t-none')}>
                        <button className="ml-4 mr-3 mt-[11px] flex size-6 shrink-0 items-center justify-center rounded-full bg-[#b5bac1] text-[#383a40] transition-colors hover:bg-[#dbdee1] max-sm:ml-3" title="Upload a file">
                          <Icon src="/icons/plus.svg" className="size-4" />
                        </button>
                        <textarea ref={inputRef}
                          className={cn('max-h-[50vh] min-h-[44px] min-w-0 flex-1 resize-none overflow-y-auto border-none bg-transparent py-[11px] text-base leading-[22px] text-[#dbdee1] outline-none placeholder:text-[#6d6f78] focus:ring-0', ui.scroll)}
                          placeholder={activeDm ? `Message @${activeDm.userName}` : selCh ? `Message #${selCh.name}` : 'Send a message'}
                          value={inputValue} onChange={handleIC} onKeyDown={handleKD} rows={1}
                        />
                        <div className="flex shrink-0 items-center gap-1 py-2.5 pl-2 pr-3">
                          <button className="flex size-8 items-center justify-center rounded text-xl leading-none opacity-70 grayscale transition hover:scale-110 hover:opacity-100 hover:grayscale-0" title="Emoji">😊</button>
                          {selectedDmId && !inputValue.trim() && (
                            <button className="flex size-8 items-center justify-center rounded text-[#b5bac1] transition-colors hover:text-[#dbdee1]" title="Send voice message"
                              onClick={() => setShowAudioRecorder(true)}>
                              <Icon src="/icons/mic.svg" />
                            </button>
                          )}
                          {inputValue.trim() && (
                            <button className="flex size-8 items-center justify-center rounded text-[#b5bac1] transition-colors hover:text-[#5865f2]" title="Send" onClick={sendMsg}>
                              <Icon src="/icons/send.svg" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
              )}
            </div>

            {/* Typing indicator / hint — lives under the composer like Discord */}
            <div className="flex h-6 shrink-0 items-center gap-1 overflow-hidden px-4 text-xs text-[#dbdee1] max-sm:px-3">
              {typingUsers.length > 0 ? (
                <>
                  <span className="mr-1 inline-flex items-center gap-[3px]">
                    <span className="size-1.5 animate-bounce rounded-full bg-[#dbdee1]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-[#dbdee1] [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-[#dbdee1] [animation-delay:300ms]" />
                  </span>
                  <span className="truncate"><strong className="font-bold">{typingUsers.join(', ')}</strong>{typingUsers.length === 1 ? ' is' : ' are'} typing…</span>
                </>
              ) : (canPost(selCh) || selectedDmId) && !showAudioRecorder ? (
                <span className="truncate text-[#949ba4] max-sm:hidden">Enter to send · Shift+Enter for new line · @name to mention</span>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Members sidebar ── */}
      <div
        className={cn(
          'flex w-60 shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-[#2b2d31] px-2 pb-5 transition-[width,padding,opacity] duration-200',
          ui.scroll,
          !showMembers && 'min-[901px]:w-0 min-[901px]:px-0 min-[901px]:opacity-0 min-[901px]:pointer-events-none',
          membersOverlay
            ? 'max-[900px]:absolute max-[900px]:bottom-0 max-[900px]:right-0 max-[900px]:top-12 max-[900px]:z-[35] max-[900px]:w-[min(280px,100%)] max-[900px]:shadow-[-4px_0_16px_rgba(0,0,0,0.35)]'
            : 'max-[900px]:hidden',
        )}
      >
        <div className="w-56 shrink-0">
          <MembersPanel members={allMems} myId={myId} onOpenProfile={openProfile} />
        </div>
      </div>
    </div>
  );
}

/* Flash applied to a message when jumping to it from the pinned list. */
const HIGHLIGHT_CLASS = 'bg-[#5865f2]/20!';

/* ─────────────────── MessageList ─────────────────────────── */

interface MsgListProps {
  messages: ChatMessage[]; myId: string; myName: string;
  editingId: string | null; editValue: string;
  onEditChange: (v: string) => void; onEditSubmit: (id: string) => void; onEditCancel: () => void;
  onReaction: (id: string, e: string) => void; onDelete: (id: string) => void; onStartEdit: (m: ChatMessage) => void;
  onCtxMenu: (m: ChatMessage, x: number, y: number) => void;
  onReply: (m: ChatMessage) => void; onForward: (m: ChatMessage) => void;
  onOpenProfile: (id: string, e: React.MouseEvent, name?: string, designation?: string) => void;
  inDm?: boolean; searching?: boolean;
}

function mentionsMe(content: string, me: string) {
  if (/@(everyone|here)\b/.test(content)) return true;
  const parts = me.toLowerCase().split(' ');
  return (content.match(/@\w+/g) ?? []).some(h => parts.includes(h.slice(1).toLowerCase()));
}

function MessageList({ messages, myId, myName, editingId, editValue, onEditChange, onEditSubmit, onEditCancel, onReaction, onDelete, onStartEdit, onCtxMenu, onReply, onForward, onOpenProfile, inDm, searching }: MsgListProps) {
  // Touch long-press (500ms, finger held still) opens the same menu as right-click.
  // iOS Safari never fires `contextmenu`, and hover-only toolbars don't exist on touch.
  const pressRef = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const cancelPress = () => {
    if (pressRef.current) { clearTimeout(pressRef.current.timer); pressRef.current = null; }
  };
  useEffect(() => cancelPress, []);
  const startPress = (msg: ChatMessage, e: React.TouchEvent) => {
    cancelPress();
    if (e.touches.length !== 1) return;
    const { clientX: x, clientY: y } = e.touches[0];
    pressRef.current = { x, y, timer: setTimeout(() => { pressRef.current = null; onCtxMenu(msg, x, y); }, 500) };
  };
  const movePress = (e: React.TouchEvent) => {
    const p = pressRef.current;
    const t = e.touches[0];
    if (p && t && (Math.abs(t.clientX - p.x) > 10 || Math.abs(t.clientY - p.y) > 10)) cancelPress(); // scrolling
  };

  if (messages.length === 0) return (
    <div className="px-4 pb-6 text-sm text-[#949ba4]">{searching ? 'No messages match your search.' : 'No messages yet. Say hello! 👋'}</div>
  );

  type Item = { type: 'divider'; label: string } | { type: 'msg'; msg: ChatMessage; isFirst: boolean };
  const items: Item[] = [];
  let lastDate = '';
  messages.forEach((msg, i) => {
    const dk = msg.timestamp.toDateString();
    if (dk !== lastDate) { items.push({ type: 'divider', label: dateDivLabel(msg.timestamp) }); lastDate = dk; }
    const prev = messages[i - 1];
    items.push({ type: 'msg', msg, isFirst: !prev || !grouped(prev, msg) || prev.timestamp.toDateString() !== dk || Boolean(msg.replyToId) });
  });

  const toolBtn = 'flex size-8 items-center justify-center text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#dbdee1]';

  return (
    <div className="flex flex-col pb-6">
      {items.map((item, idx) => {
        if (item.type === 'divider') return (
          <div key={`d-${idx}`} className="mx-4 mb-0.5 mt-6 flex items-center" role="separator">
            <div className="h-px flex-1 bg-[#3f4147]" />
            <span className="px-1 text-xs font-semibold text-[#949ba4]">{item.label}</span>
            <div className="h-px flex-1 bg-[#3f4147]" />
          </div>
        );
        const { msg, isFirst } = item;
        const isOwn = msg.userId === myId;
        const isEd  = editingId === msg.id;
        const pinged = !isOwn && mentionsMe(msg.content, myName);
        return (
          <div key={msg.id} id={`msg-${msg.id}`}
            className={cn(
              'group relative py-0.5 pl-[72px] pr-12 transition-colors duration-500 max-sm:pl-[60px] max-sm:pr-4',
              'pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]',
              isFirst && 'mt-[17px]',
              isEd ? 'bg-[#2e3035]' : pinged ? 'bg-[#f0b232]/10 hover:bg-[#f0b232]/[0.08]' : 'hover:bg-[#2e3035]',
            )}
            onContextMenu={e => { e.preventDefault(); onCtxMenu(msg, e.clientX, e.clientY); }}
            onTouchStart={isEd ? undefined : e => startPress(msg, e)}
            onTouchMove={movePress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}>
            {pinged && <span className="absolute inset-y-0 left-0 w-0.5 bg-[#f0b232]" />}

            {/* Reply reference with Discord's curved spine */}
            {msg.replyToId && (
              <div className="relative mb-1 flex min-w-0 items-center gap-1 text-sm leading-[18px] before:absolute before:-left-9 before:top-1/2 before:h-[calc(50%+6px)] before:w-[30px] before:rounded-tl-md before:border-l-2 before:border-t-2 before:border-[#4e5058] max-sm:before:-left-[30px] max-sm:before:w-6">
                {msg.replyToAuthor && <Avatar name={msg.replyToAuthor} size="size-4" text="text-[7px]" />}
                {msg.replyToAuthor && <span className="shrink-0 font-medium text-[#f2f3f5] opacity-80">@{msg.replyToAuthor}</span>}
                <span className="min-w-0 truncate text-[#b5bac1]">{(msg.replyToContent ?? '').slice(0, 80)}</span>
              </div>
            )}

            <div className="relative">
              {isFirst
                ? <Avatar name={msg.userName} size="size-10" className="absolute -left-14 top-0.5 hover:shadow-[0_4px_4px_rgba(0,0,0,0.16)] max-sm:-left-12 max-sm:size-9" onClick={e => onOpenProfile(msg.userId, e, msg.userName, msg.userDesignation)} />
                : <span className="absolute -left-[72px] top-0.5 w-[64px] select-none pr-1 text-right text-[11px] leading-[22px] text-[#949ba4] opacity-0 group-hover:opacity-100 max-sm:hidden">{fmtTime(msg.timestamp)}</span>}

              {isFirst && (
                <div className="flex flex-wrap items-baseline gap-x-2 leading-[22px]">
                  <span className="cursor-pointer font-medium text-[#f2f3f5] hover:underline" onClick={e => onOpenProfile(msg.userId, e, msg.userName, msg.userDesignation)}>{msg.userName}</span>
                  {msg.userDesignation && <span className="self-center rounded bg-[#5865f2] px-1 text-[10px] font-semibold uppercase leading-4 text-white">{msg.userDesignation}</span>}
                  <span className="text-xs text-[#949ba4]">{fmtTs(msg.timestamp)}</span>
                  {msg.isPinned && <span className="text-xs" title="Pinned">📌</span>}
                  {msg.isSending && <span className="inline-flex items-center gap-1.5 text-xs text-[#949ba4]"><span className="size-1.5 animate-pulse rounded-full bg-[#5865f2]" />Uploading…</span>}
                  {!msg.isSending && msg.isLocal && !msg.sendFailed && <span className="text-xs text-[#949ba4]">Sending…</span>}
                  {msg.sendFailed && <span className="text-xs font-semibold text-[#f23f43]">⚠ Failed — retry</span>}
                </div>
              )}

              {isEd ? (
                <div className="my-1 flex flex-col gap-1">
                  <textarea
                    ref={el => { if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }}
                    value={editValue}
                    onChange={e => onEditChange(e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSubmit(msg.id); }
                      if (e.key === 'Escape') { e.preventDefault(); onEditCancel(); }
                    }}
                    className="w-full resize-none rounded-lg border-none bg-[#383a40] px-4 py-2.5 text-base leading-[22px] text-[#dbdee1] outline-none select-text focus:ring-0"
                    rows={2} />
                  <div className="text-xs text-[#dbdee1]">
                    escape to <button className="text-[#00a8fc] hover:underline" onClick={onEditCancel}>cancel</button> • enter to <button className="text-[#00a8fc] hover:underline" onClick={() => onEditSubmit(msg.id)}>save</button>
                  </div>
                </div>
              ) : (
                <div className={cn('whitespace-pre-wrap break-words text-base leading-[22px]', msg.isLocal || msg.isSending ? 'text-[#949ba4]' : 'text-[#dbdee1]')}>
                  {renderContent(msg.content, myName)}
                  {msg.edited && <span className="ml-1 select-none text-[10px] text-[#949ba4]">(edited)</span>}
                </div>
              )}

              {msg.reactions.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {msg.reactions.map(r => {
                    const mine = r.users.includes(myId);
                    return (
                      <button
                        key={r.emoji}
                        className={cn(
                          'flex h-6 items-center gap-1.5 rounded-lg border px-1.5 text-sm transition-colors',
                          mine ? 'border-[#5865f2] bg-[#5865f2]/15' : 'border-transparent bg-[#2b2d31] hover:border-[#4e5058]',
                        )}
                        onClick={() => onReaction(msg.id, r.emoji)}
                        title={`${r.users.length}`}
                      >
                        <span className="text-base leading-none">{r.emoji}</span>
                        <span className={cn('text-sm font-semibold', mine ? 'text-[#c9cdfb]' : 'text-[#b5bac1]')}>{r.users.length}</span>
                      </button>
                    );
                  })}
                  <EmojiPicker msgId={msg.id} onReaction={onReaction} />
                </div>
              )}
            </div>

            {!isEd && (
              <div className="absolute -top-4 right-4 z-[3] hidden items-center overflow-hidden rounded-md border border-[#26272b] bg-[#313338] shadow-[0_0_0_1px_rgba(4,4,5,0.15),0_4px_8px_rgba(0,0,0,0.2)] group-hover:flex">
                {!inDm && EMOJI_LIST.slice(0, 3).map(e => <button key={e} className={cn(toolBtn, 'text-base')} onClick={() => onReaction(msg.id, e)}>{e}</button>)}
                <button className={toolBtn} title="Reply" onClick={() => onReply(msg)}><Icon src="/icons/corner-up-left.svg" /></button>
                <button className={toolBtn} title="Forward" onClick={() => onForward(msg)}><Icon src="/icons/corner-up-right.svg" /></button>
                {isOwn && <button className={toolBtn} title="Edit" onClick={() => onStartEdit(msg)}><Icon src="/icons/edit.svg" /></button>}
                <button className={toolBtn} title="More" onClick={e => onCtxMenu(msg, e.clientX, e.clientY)}><Icon src="/icons/more-horizontal.svg" /></button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmojiPicker({ msgId, onReaction }: { msgId: string; onReaction: (id: string, e: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); } if (open) document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        className={cn('flex h-6 items-center rounded-lg bg-[#2b2d31] px-2 text-sm text-[#b5bac1] transition hover:text-[#dbdee1] group-hover:opacity-100 pointer-coarse:opacity-100', open ? 'opacity-100' : 'opacity-0')}
        onClick={() => setOpen(p => !p)}
        title="Add Reaction"
      >
        +😊
      </button>
      {open && (
        <div className="absolute bottom-[calc(100%+4px)] left-0 z-20 grid w-[232px] grid-cols-6 gap-0.5 rounded-lg bg-[#2b2d31] p-2 shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
          {EMOJI_LIST.map(e => <button key={e} className="rounded p-1 text-xl leading-none transition-colors hover:bg-[#404249]" onClick={() => { onReaction(msgId, e); setOpen(false); }}>{e}</button>)}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── PresenceVoiceView ───────────────────── */

function PresenceVoiceView({ channel, occupants, isInChannel, micMuted, deafened, onJoin, onLeave, onToggleMic, onToggleDeafen }: { channel: Channel; occupants: string[]; isInChannel: boolean; micMuted: boolean; deafened: boolean; onJoin: () => void; onLeave: () => void; onToggleMic: () => void; onToggleDeafen: () => void; }) {
  const ctrlBtn = 'flex size-12 items-center justify-center rounded-full transition-colors';
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto bg-[#111214] p-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-[#2b2d31] text-[#b5bac1]">
          <Icon src="/icons/volume-2.svg" className="size-10" />
        </div>
        <div className="text-2xl font-bold text-[#f2f3f5]">{channel.name}</div>
        <div className="mt-1 text-sm text-[#b5bac1]">{occupants.length === 0 ? 'No one is currently in voice' : `${occupants.length} in voice`}</div>
      </div>
      {occupants.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {occupants.map(n => (
            <div key={n} className="flex w-28 flex-col items-center gap-2 rounded-lg bg-[#2b2d31] p-3">
              <Avatar name={n} size="size-14" text="text-lg" />
              <span className="w-full truncate text-xs font-medium text-[#dbdee1]">{n}</span>
            </div>
          ))}
        </div>
      )}
      {!isInChannel ? (
        <button className="rounded-full bg-[#248046] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a6334]" onClick={onJoin}>Join Voice</button>
      ) : (
        <div className="flex items-center gap-3">
          <button className={cn(ctrlBtn, micMuted ? 'bg-white text-[#f23f43]' : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#404249]')} title={micMuted ? 'Unmute' : 'Mute'} onClick={onToggleMic}><Icon src={micMuted ? '/icons/mic-off.svg' : '/icons/mic.svg'} /></button>
          <button className={cn(ctrlBtn, deafened ? 'bg-white text-[#f23f43]' : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#404249]')} title="Deafen" onClick={onToggleDeafen}><Icon src="/icons/headphones.svg" /></button>
          <button className={cn(ctrlBtn, 'bg-[#da373c] text-white hover:bg-[#a12828]')} title="Leave" onClick={onLeave}><Icon src="/icons/phone-off.svg" /></button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── MembersPanel ───────────────────────── */

function MembersPanel({ members, myId, onOpenProfile }: { members: Member[]; myId: string; onOpenProfile: (id: string, e: React.MouseEvent, name?: string, designation?: string) => void }) {
  const online  = members.filter(m => m.status !== 'offline');
  const offline = members.filter(m => m.status === 'offline');
  const labels: Record<UserStatus, string> = { online: 'Online', away: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' };
  const sectionLabel = 'px-2 pb-1 pt-6 text-xs font-semibold uppercase tracking-wide text-[#949ba4]';

  const row = (m: Member, isOffline: boolean) => (
    <div
      key={m.id}
      className={cn('group flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 transition hover:bg-[#35373c]', isOffline && 'opacity-30 hover:opacity-100')}
      title={`${m.name} — ${labels[m.status]}`}
      onClick={e => onOpenProfile(m.id, e, m.name, m.designation)}
    >
      <Avatar name={m.name} size="size-8" text="text-xs" status={isOffline ? undefined : m.status} dot="size-2.5 border-[3px]" ring="border-[#2b2d31] group-hover:border-[#35373c]" />
      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium leading-5 text-[#949ba4] group-hover:text-[#dbdee1]">{m.name}{m.id === myId ? <span className="text-xs"> (you)</span> : null}</div>
        {m.designation && <div className="truncate text-xs leading-4 text-[#949ba4]">{m.designation}</div>}
      </div>
    </div>
  );

  return (
    <>
      <div className={sectionLabel}>Online — {online.length}</div>
      {online.map(m => row(m, false))}
      {offline.length > 0 && (
        <>
          <div className={sectionLabel}>Offline — {offline.length}</div>
          {offline.map(m => row(m, true))}
        </>
      )}
    </>
  );
}

/* ── PreJoinModal ─────────────────────────────────────────── */

function PreJoinModal({ channelName, onJoin, onCancel }: {
  channelName: string;
  onJoin: () => void;
  onCancel: () => void;
}) {
  const [micStatus, setMicStatus]   = useState<'idle' | 'granted' | 'denied' | 'checking'>('idle');
  const [micLevel, setMicLevel]     = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);

  async function requestMic() {
    setMicStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setMicStatus('granted');

      // Show live mic level so the user knows it's working
      const ctx      = new AudioContext();
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += (buf[i] / 255) ** 2;
        setMicLevel(Math.min(Math.sqrt(sum / buf.length) * 5, 1));
        rafRef.current = requestAnimationFrame(tick);
      }
      tick();
    } catch (err: any) {
      setMicStatus('denied');
    }
  }

  function cleanup() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  useEffect(() => () => cleanup(), []);

  function handleJoin() {
    cleanup(); // VoiceRoom will request its own stream
    onJoin();
  }

  const bars = 16;

  return (
    <div className={ui.overlay} onClick={onCancel}>
      <div className={cn(ui.modal, 'max-w-[420px]')} onClick={e => e.stopPropagation()}>
        <div className="flex flex-col gap-5 p-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-[#2b2d31] text-[#b5bac1]">
              <Icon src="/icons/volume-2.svg" className="size-8" />
            </div>
            <div className="text-xl font-bold text-[#f2f3f5]">Join {channelName}</div>
            <div className="mt-1 text-sm text-[#b5bac1]">Check your microphone before joining</div>
          </div>

          {/* Mic test section */}
          <div className="flex flex-col gap-3 rounded-lg bg-[#2b2d31] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-lg',
                micStatus === 'granted' ? 'border-[#23a55a] bg-[#23a55a]/15' : micStatus === 'denied' ? 'border-[#f23f43] bg-[#f23f43]/15' : 'border-[#4e5058] bg-white/5',
              )}>
                {micStatus === 'denied' ? '🚫' : '🎙️'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-sm font-semibold text-[#f2f3f5]">
                  {micStatus === 'idle'     && 'Microphone not tested'}
                  {micStatus === 'checking' && 'Requesting access…'}
                  {micStatus === 'granted'  && 'Microphone ready'}
                  {micStatus === 'denied'   && 'Microphone blocked'}
                </div>
                <div className="text-xs text-[#949ba4]">
                  {micStatus === 'idle'    && 'Click "Test mic" to allow access'}
                  {micStatus === 'checking'&& 'Allow microphone in the browser popup'}
                  {micStatus === 'granted' && 'Speak — the bar shows your level'}
                  {micStatus === 'denied'  && 'Click the 🔒 icon in the address bar → Allow'}
                </div>
              </div>
              {micStatus === 'idle' || micStatus === 'denied' ? (
                <button
                  onClick={requestMic}
                  className={cn('shrink-0 rounded-[3px] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors', micStatus === 'denied' ? 'bg-[#da373c] hover:bg-[#a12828]' : 'bg-[#5865f2] hover:bg-[#4752c4]')}
                >
                  {micStatus === 'denied' ? 'Retry' : 'Test mic'}
                </button>
              ) : null}
            </div>

            {/* Live mic level visualizer */}
            {micStatus === 'granted' && (
              <div className="flex h-7 items-end gap-0.5 px-0.5">
                {Array.from({ length: bars }, (_, i) => {
                  const thresh = (i + 1) / bars;
                  const active = micLevel >= thresh;
                  return (
                    <div
                      key={i}
                      className={cn('flex-1 rounded-sm transition-colors duration-75', active ? (micLevel > 0.8 ? 'bg-[#f0b232]' : 'bg-[#23a55a]') : 'bg-white/10')}
                      style={{ height: `${20 + (i / bars) * 80}%` }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Permissions note */}
          {micStatus === 'denied' && (
            <div className="rounded-md border border-[#f23f43]/30 bg-[#f23f43]/10 px-3.5 py-2.5 text-xs leading-relaxed text-[#fa777c]">
              <strong>To fix:</strong> click the 🔒 lock icon in your browser&apos;s address bar,
              find <em>Microphone</em>, set it to <em>Allow</em>, then reload the page.
            </div>
          )}
        </div>

        <div className={ui.modalFoot}>
          <button onClick={onCancel} className={ui.btnLink}>Cancel</button>
          <button onClick={handleJoin} className="rounded-[3px] bg-[#248046] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a6334]">
            {micStatus === 'denied' ? 'Join anyway (listen only)' : 'Join Voice'}
          </button>
        </div>
      </div>
    </div>
  );
}
