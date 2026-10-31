'use client';

import { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { VoiceRoom } from './components/VoiceRoom';
import { CreateChannelModal } from './components/CreateChannelModal';
import { NewDmModal } from './components/NewDmModal';
import { StatusSelector } from './components/StatusSelector';
import { MessageContextMenu, type ContextAction } from './components/MessageContextMenu';
import { ReplyPreview, type ReplyTarget } from './components/ReplyPreview';
import { ForwardModal } from './components/ForwardModal';
import { PinnedMessagesPanel } from './components/PinnedMessagesPanel';
import { SavedMessagesPanel } from './components/SavedMessagesPanel';
import { MentionAutocomplete, getMentionQuery, applyMention } from './components/MentionAutocomplete';
import { NotificationToastStack, type ToastNotification } from './components/NotificationToast';
import { AudioRecorder } from './components/AudioRecorder';

/* ─────────────────────────── Types ───────────────────────── */

type ChannelType = 'text' | 'voice' | 'announcement';
type UserStatus  = 'online' | 'away' | 'dnd' | 'offline';
type UserRole    = 'admin' | 'lead' | 'employee' | 'intern';
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
const STATUS_COLOR: Record<UserStatus, string> = { online: '#23a55a', away: '#f0b232', dnd: '#f23f43', offline: '#80848e' };

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

function initials(n: string) { return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
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

const BACKEND_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace(/\/api$/, '');

function renderContent(content: string, me: string) {
  /* Audio message */
  if (content.startsWith('__audio__:')) {
    const rest     = content.slice('__audio__:'.length);
    const colonIdx = rest.indexOf(':');
    const duration = colonIdx !== -1 ? Number(rest.slice(0, colonIdx)) : 0;
    const rawSrc = colonIdx !== -1 ? rest.slice(colonIdx + 1) : rest;
    let audioSrc: string;
    if (rawSrc.startsWith('http')) {
      audioSrc = rawSrc; // presigned URL hydrated by backend at read time
    } else if (rawSrc.startsWith('/uploads/')) {
      audioSrc = `${BACKEND_BASE}${rawSrc}`; // legacy local disk
    } else {
      audioSrc = rawSrc; // object key — should be hydrated server-side before reaching here
    }
    const mins     = Math.floor(duration / 60);
    const secs     = String(duration % 60).padStart(2, '0');
    return (
      <div className="dm-audio-msg">
        <span className="dm-audio-msg-icon">🎙️</span>
        <audio controls src={audioSrc} className="dm-audio-native" preload="metadata" />
        <span className="dm-audio-msg-dur">{mins}:{secs}</span>
      </div>
    );
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
    parts.push(<span key={i++} className={`inbox-mention${self || special ? ' self' : ''}`}>{m[1]}</span>);
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
  const [collapsedCats, setCollapsedCats]         = useState<Set<string>>(new Set());
  const [dmCollapsed, setDmCollapsed]             = useState(false);
  const [inVoiceChannel, setInVoiceChannel]       = useState<string | null>(null);
  const [micMuted, setMicMuted]                   = useState(false);
  const [deafened, setDeafened]                   = useState(false);
  const [editingId, setEditingId]                 = useState<string | null>(null);
  const [editValue, setEditValue]                 = useState('');
  const [typingUsers, setTypingUsers]             = useState<string[]>([]);
  const [vcOccupants, setVcOccupants]             = useState<Record<string, string[]>>({});
  const [loading, setLoading]                     = useState(true);
  const [socketConnected, setSocketConnected]     = useState(false);
  const [userStatus, setUserStatus]               = useState<UserStatus>('online');
  const [voiceToken, setVoiceToken]               = useState<VoiceToken | null>(null);
  const [preJoinChannelId, setPreJoinChannelId]   = useState<string | null>(null);
  const [showSearch, setShowSearch]               = useState(false);
  const [searchQuery, setSearchQuery]             = useState('');

  const [replyingTo, setReplyingTo]     = useState<ReplyTarget | null>(null);
  const [contextMenu, setContextMenu]   = useState<{ x: number; y: number; msg: ChatMessage } | null>(null);
  const [forwardMsg, setForwardMsg]     = useState<ChatMessage | null>(null);
  const [showPins, setShowPins]         = useState(false);
  const [showSaved, setShowSaved]       = useState(false);
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

  useEffect(() => { selChIdRef.current    = selectedChannelId; }, [selectedChannelId]);
  useEffect(() => { selDmIdRef.current    = selectedDmId;      }, [selectedDmId]);
  useEffect(() => { curUserNameRef.current = user?.name ?? 'You'; }, [user?.name]);
  useEffect(() => { myIdRef.current       = user?.id?.toString() ?? 'me'; }, [user?.id]);

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
    api.get<any[]>('/employees').then(d => {
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
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace(/\/api$/, '');
    const socket = io(wsUrl, { path: '/ws/inbox', auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => socket.emit('ping'), 28000);
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

    return () => {
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
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !socketConnected || channels.length === 0) return;
    api.get<any[]>('/inbox/voice').then(d => {
      const g: Record<string, string[]> = {};
      for (const e of d) { const id = String(e.channel_id); if (!g[id]) g[id] = []; g[id].push(e.name); }
      setVcOccupants(g);
    }).catch(() => {});
    const offs: Array<() => void> = [];
    for (const vc of channels.filter(c => c.type === 'voice')) {
      const ev = `voice:presence:${vc.id}`;
      const h = (occ: Array<{ employee_id: number; name: string }>) => setVcOccupants(prev => ({ ...prev, [vc.id]: occ.map(o => o.name) }));
      s.on(ev, h); offs.push(() => s.off(ev, h));
    }
    return () => offs.forEach(fn => fn());
  }, [socketConnected, channels]);

  /* ─ Auto-scroll ─ */
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [paneMsgs.length]);

  /* ─ Navigation ─ */
  function selChannel(id: string) { setSelectedChannelId(id); setSelectedDmId(null); setChannels(prev => prev.map(c => c.id === id ? { ...c, unread: 0, mentioned: false } : c)); setReplyingTo(null); setVoiceToken(null); setShowPins(false); setShowSaved(false); setShowSearch(false); setSearchQuery(''); }
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
      const token = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:6002'}/api/inbox/dms/audio`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { key, presignedUrl } = await res.json() as { key: string; presignedUrl: string };

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
    try { const d = await api.get<VoiceToken>(`/inbox/voice/${chId}/token`); setVoiceToken(d); } catch { setVoiceToken(null); }
    setInVoiceChannel(chId); setVcOccupants(prev => ({ ...prev, [chId]: [...(prev[chId] ?? []), myName] }));
    socketRef.current?.emit('voice:join', Number(chId)); selChannel(chId);
  }
  function leaveVoice() {
    if (!inVoiceChannel) return;
    socketRef.current?.emit('voice:leave', Number(inVoiceChannel));
    setVcOccupants(prev => ({ ...prev, [inVoiceChannel]: (prev[inVoiceChannel] ?? []).filter(n => n !== myName) }));
    setInVoiceChannel(null); setVoiceToken(null); setMicMuted(false); setDeafened(false);
  }

  function toggleCat(id: string) { setCollapsedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const chIcon = (t: ChannelType) => t === 'announcement' ? '/icons/bell.svg' : '/icons/hash.svg';

  if (loading) return <div className="inbox-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Connecting to Inbox…</div></div>;

  /* ─── RENDER ─── */
  return (
    <div className="inbox-shell">

      {/* Toasts */}
      <NotificationToastStack notifications={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} onOpen={n => { if (n.dmUserId) selDm(n.dmUserId); else if (n.channelId) selChannel(n.channelId); }} />

      {/* Context menu */}
      {contextMenu && <MessageContextMenu x={contextMenu.x} y={contextMenu.y} actions={buildActions(contextMenu.msg)} onClose={() => setContextMenu(null)} />}

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
      <div className="inbox-channels">
        <div className="inbox-ws-header">
          <span>HR Platform</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: socketConnected ? '#23a55a' : '#80848e', flexShrink: 0 }} title={socketConnected ? 'Connected' : 'Reconnecting…'} />
        </div>

        {/* Saved messages shortcut */}
        <div className={`inbox-ch-item${showSaved ? ' active' : ''}`} style={{ margin: '4px 8px', borderRadius: 6 }}
          onClick={() => { setShowSaved(true); setShowPins(false); setSelectedChannelId(''); setSelectedDmId(null); }}>
          <span style={{ fontSize: 15, marginRight: 8, flexShrink: 0 }}>🔖</span>
          <span className="inbox-ch-item-name">Saved Messages</span>
        </div>

        <div className="inbox-channel-list">
          {categories.map(cat => {
            const catChs  = visChs.filter(c => c.category_id === cat.id);
            const isCol   = collapsedCats.has(String(cat.id));
            return (
              <div key={cat.id}>
                <div className="inbox-category-header" onClick={() => toggleCat(String(cat.id))}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: 'currentColor', WebkitMaskImage: 'url(/icons/chevron-down.svg)', maskImage: 'url(/icons/chevron-down.svg)', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain', transform: isCol ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }} />
                  <span>{cat.name}</span>
                  {myRole === 'admin' && <button className="inbox-cat-add-btn" title="Create channel" onClick={e => { e.stopPropagation(); setShowCreateChannel(true); }}>+</button>}
                </div>
                {!isCol && catChs.map(ch => {
                  if (ch.type === 'voice') {
                    const occ = vcOccupants[ch.id] ?? [];
                    return (
                      <div key={ch.id}>
                        <div className={`inbox-voice-ch-item${selectedChannelId === ch.id ? ' active' : ''}`} onClick={() => { if (inVoiceChannel !== ch.id) selChannel(ch.id); }}>
                          <span className="inbox-voice-ch-icon" />
                          <span className="inbox-ch-item-name">{ch.name}</span>
                          {ch.is_private && <span className="inbox-ch-lock" />}
                          {inVoiceChannel !== ch.id && <button className="inbox-footer-btn" style={{ marginLeft: 'auto' }} title="Join" onClick={e => { e.stopPropagation(); joinVoice(ch.id); }}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/phone.svg)', maskImage: 'url(/icons/phone.svg)' }} /></button>}
                        </div>
                        {occ.length > 0 && <div className="inbox-voice-participants-preview">{occ.map(n => (<div key={n} className="inbox-voice-preview-member"><div className="avatar-tiny">{initials(n)}</div><span>{n}</span></div>))}</div>}
                      </div>
                    );
                  }
                  return (
                    <div key={ch.id} className={`inbox-ch-item${selectedChannelId === ch.id ? ' active' : ''}${ch.unread ? ' has-unread' : ''}`} onClick={() => selChannel(ch.id)}>
                      <span className="inbox-ch-item-icon" style={{ WebkitMaskImage: `url(${chIcon(ch.type)})`, maskImage: `url(${chIcon(ch.type)})` }} />
                      <span className="inbox-ch-item-name">{ch.name}</span>
                      {ch.is_private && <span className="inbox-ch-lock" />}
                      {ch.member_role === 'readonly' && <span style={{ fontSize: 10, opacity: .6, marginLeft: 2 }}>👁</span>}
                      {ch.mentioned && <span className="inbox-ch-mention-dot" />}
                      {!ch.mentioned && ch.unread ? <span className="inbox-ch-unread-badge">{ch.unread}</span> : null}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* DMs */}
          <div className="inbox-dm-section-header" onClick={() => setDmCollapsed(p => !p)}>
            <span>Direct Messages</span>
            <button className="inbox-cat-add-btn" title="New DM" onClick={e => { e.stopPropagation(); setShowNewDm(true); }}>+</button>
          </div>
          {!dmCollapsed && dmConversations.map(dm => (
            <div key={dm.userId} className={`inbox-dm-item${selectedDmId === dm.userId ? ' active' : ''}`} onClick={() => selDm(dm.userId)}>
              <div className="inbox-dm-avatar-wrap">
                <div className="inbox-dm-avatar">{initials(dm.userName)}</div>
                <span className="inbox-dm-status" style={{ background: STATUS_COLOR[dm.status] }} />
              </div>
              <span className="inbox-dm-name">{dm.userName}</span>
              {dm.unread ? <span className="inbox-dm-unread">{dm.unread}</span> : null}
            </div>
          ))}
        </div>

        {/* In-voice strip */}
        {inVoiceChannel && (
          <div className="inbox-voice-footer">
            <div className="inbox-voice-footer-status"><span className="inbox-voice-footer-status-dot" />{channels.find(c => c.id === inVoiceChannel)?.name ?? 'Voice'}</div>
            <div className="inbox-voice-footer-controls">
              <button className={`inbox-footer-btn${micMuted ? ' muted' : ' active'}`} title={micMuted ? 'Unmute' : 'Mute'} onClick={() => setMicMuted(p => !p)}><span className="icon" style={{ WebkitMaskImage: micMuted ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)', maskImage: micMuted ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)' }} /></button>
              <button className={`inbox-footer-btn${deafened ? ' muted' : ''}`} title="Deafen" onClick={() => setDeafened(p => !p)}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/headphones.svg)', maskImage: 'url(/icons/headphones.svg)' }} /></button>
              <button className="inbox-footer-btn muted" title="Leave" onClick={leaveVoice}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/phone-off.svg)', maskImage: 'url(/icons/phone-off.svg)' }} /></button>
            </div>
          </div>
        )}

        {/* User footer */}
        <div className="inbox-user-footer">
          <div className="inbox-user-footer-avatar" style={{ position: 'relative' }}>
            {initials(myName)}
            <span className="inbox-user-footer-status-dot" style={{ background: STATUS_COLOR[userStatus] }} />
          </div>
          <div className="inbox-user-footer-info">
            <div className="inbox-user-footer-name">{myName}</div>
            <div className="inbox-user-footer-role">{user?.role}</div>
          </div>
          <StatusSelector status={userStatus} onChange={handleStatus} />
          <button className={`inbox-footer-btn${micMuted ? ' muted' : ''}`} title={micMuted ? 'Unmute' : 'Mute'} onClick={() => setMicMuted(p => !p)}><span className="icon" style={{ WebkitMaskImage: micMuted ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)', maskImage: micMuted ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)' }} /></button>
          <button className={`inbox-footer-btn${deafened ? ' muted' : ''}`} title="Deafen" onClick={() => setDeafened(p => !p)}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/headphones.svg)', maskImage: 'url(/icons/headphones.svg)' }} /></button>
          <button className="inbox-footer-btn" title="Settings"><span className="icon" style={{ WebkitMaskImage: 'url(/icons/settings.svg)', maskImage: 'url(/icons/settings.svg)' }} /></button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="inbox-main">
        {/* Header */}
        <div className="inbox-ch-header">
          {activeDm ? (
            <><div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 }}>{initials(activeDm.userName)}</div><span className="inbox-ch-header-name">{activeDm.userName}</span><span className="inbox-ch-header-divider" /><span className="inbox-ch-header-desc">{activeDm.userDesignation}</span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[activeDm.status], marginLeft: 6, flexShrink: 0 }} /></>
          ) : showSaved ? (
            <><span style={{ fontSize: 18 }}>🔖</span><span className="inbox-ch-header-name" style={{ marginLeft: 8 }}>Saved Messages</span></>
          ) : selCh ? (
            <><span className="inbox-ch-header-icon" style={{ WebkitMaskImage: `url(${chIcon(selCh.type)})`, maskImage: `url(${chIcon(selCh.type)})` }} /><span className="inbox-ch-header-name">{selCh.name}</span>{selCh.description && <><span className="inbox-ch-header-divider" /><span className="inbox-ch-header-desc">{selCh.description}</span></>}</>
          ) : null}

          <div className="inbox-ch-header-actions">
            {!showSaved && selCh?.type !== 'voice' && (
              <>
                {showSearch
                  ? <input autoFocus className="inbox-search-input" placeholder="Search messages…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }} />
                  : <button className="inbox-ch-header-btn" title="Search" onClick={() => setShowSearch(true)}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/search.svg)', maskImage: 'url(/icons/search.svg)' }} /></button>
                }
                {selCh && !selectedDmId && <button className={`inbox-ch-header-btn${showPins ? ' active' : ''}`} title="Pinned" onClick={() => { setShowPins(p => !p); setShowSaved(false); }}>📌</button>}
              </>
            )}
            <button className={`inbox-ch-header-btn${showMembers ? ' active' : ''}`} title="Members" onClick={() => setShowMembers(p => !p)}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/users.svg)', maskImage: 'url(/icons/users.svg)' }} /></button>
          </div>
        </div>

        {/* Pinned panel */}
        {showPins && selCh && selCh.type !== 'voice' && (
          <PinnedMessagesPanel channelId={selCh.id} channelName={selCh.name} canPin={myRole === 'admin' || myRole === 'lead'} onClose={() => setShowPins(false)} onJumpTo={msgId => { setShowPins(false); const el = document.getElementById(`msg-${msgId}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add('inbox-msg-highlight'); setTimeout(() => el?.classList.remove('inbox-msg-highlight'), 2000); }} />
        )}

        {/* Saved panel */}
        {showSaved && <SavedMessagesPanel onClose={() => setShowSaved(false)} />}

        {/* Voice */}
        {!showSaved && selCh?.type === 'voice' ? (
          inVoiceChannel === selCh.id && voiceToken
            ? <VoiceRoom key={voiceToken.token} token={voiceToken.token} serverUrl={voiceToken.url} channelName={selCh.name} micMuted={micMuted} deafened={deafened} onLeave={leaveVoice} onMicMutedChange={setMicMuted} onDeafenedChange={setDeafened} onParticipantsChange={ps => setVcOccupants(prev => ({ ...prev, [selCh.id]: ps.map(p => p.name) }))} />
            : <PresenceVoiceView channel={selCh} occupants={vcOccupants[selCh.id] ?? []} isInChannel={inVoiceChannel === selCh.id} micMuted={micMuted} deafened={deafened} onJoin={() => joinVoice(selCh.id)} onLeave={leaveVoice} onToggleMic={() => setMicMuted(p => !p)} onToggleDeafen={() => setDeafened(p => !p)} />
        ) : !showSaved ? (
          <>
            <div className="inbox-messages-wrap">
              <div className="inbox-channel-welcome">
                <div className="inbox-channel-welcome-icon">
                  {activeDm ? <span style={{ fontSize: 28 }}>💬</span> : <span style={{ display: 'block', width: 28, height: 28, background: 'var(--color-primary)', WebkitMaskImage: `url(${selCh ? chIcon(selCh.type) : '/icons/hash.svg'})`, maskImage: `url(${selCh ? chIcon(selCh.type) : '/icons/hash.svg'})`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain' }} />}
                </div>
                <h2>{activeDm ? activeDm.userName : selCh ? `# ${selCh.name}` : 'Inbox'}</h2>
                <p>{activeDm ? `Beginning of your DMs with ${activeDm.userName}.` : selCh?.description ? selCh.description : 'Start a conversation.'}</p>
              </div>

              <MessageList messages={paneMsgs} myId={myId} myName={myName} editingId={editingId} editValue={editValue}
                onEditChange={setEditValue} onEditSubmit={submitEdit} onEditCancel={() => setEditingId(null)}
                onReaction={toggleReaction} onDelete={deleteMsg} onStartEdit={startEdit}
                onCtxMenu={(msg, x, y) => setContextMenu({ msg, x, y })}
                onReply={msg => setReplyingTo({ id: msg.id, userName: msg.userName, content: msg.content })}
                onForward={msg => setForwardMsg(msg)}
              />
              <div ref={msgEndRef} />
            </div>

            <div className="inbox-typing-indicator">
              {typingUsers.length > 0 && (<><span className="inbox-typing-dots"><span /><span /><span /></span><strong>{typingUsers.join(', ')}</strong>{typingUsers.length === 1 ? ' is' : ' are'} typing…</>)}
            </div>

            <div className="inbox-input-area">
              {replyingTo && <ReplyPreview replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} />}
              {selCh?.type === 'announcement' && !canPost(selCh) && <div className="inbox-readonly-banner">📢 Only admins and leads can post here.</div>}
              {selCh?.member_role === 'readonly' && <div className="inbox-readonly-banner">👁 You have read-only access to this channel.</div>}

              {(canPost(selCh) || selectedDmId) && (
                showAudioRecorder && selectedDmId
                  ? <AudioRecorder
                      onSend={sendAudioMsg}
                      onCancel={() => setShowAudioRecorder(false)}
                    />
                  : <div className="inbox-input-wrap" style={{ position: 'relative' }}>
                      {mentionQuery !== null && <MentionAutocomplete query={mentionQuery} employees={allMems} onSelect={name => { if (!inputRef.current) return; setInputValue(applyMention(inputRef.current, name)); setMentionQuery(null); inputRef.current.focus(); }} onClose={() => setMentionQuery(null)} anchorEl={inputRef.current} />}
                      <button className="inbox-input-attach-btn" title="Attach file"><span className="icon" /></button>
                      <textarea ref={inputRef} className="inbox-input-field"
                        placeholder={activeDm ? `Message ${activeDm.userName}` : selCh ? `Message #${selCh.name}` : 'Send a message'}
                        value={inputValue} onChange={handleIC} onKeyDown={handleKD} rows={1}
                      />
                      <div className="inbox-input-right">
                        <button className="inbox-input-emoji-btn" title="Emoji">😊</button>
                        {selectedDmId && !inputValue.trim() && (
                          <button className="inbox-input-voice-btn" title="Send voice message"
                            onClick={() => setShowAudioRecorder(true)}>
                            <span className="icon" style={{ WebkitMaskImage: 'url(/icons/mic.svg)', maskImage: 'url(/icons/mic.svg)' }} />
                          </button>
                        )}
                        <button className="inbox-send-btn" title="Send" disabled={!inputValue.trim()} onClick={sendMsg}><span className="icon" /></button>
                      </div>
                    </div>
              )}
              {(canPost(selCh) || selectedDmId) && !showAudioRecorder && <div className="inbox-input-hint">Enter to send · Shift+Enter for new line · @name to mention</div>}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Members sidebar ── */}
      <div className={`inbox-members${showMembers ? '' : ' hidden'}`}>
        <div className="inbox-members-title">Members — {allMems.length}</div>
        <div className="inbox-members-list">
          <MembersPanel members={allMems} myId={myId} statusColor={STATUS_COLOR} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── MessageList ─────────────────────────── */

interface MsgListProps {
  messages: ChatMessage[]; myId: string; myName: string;
  editingId: string | null; editValue: string;
  onEditChange: (v: string) => void; onEditSubmit: (id: string) => void; onEditCancel: () => void;
  onReaction: (id: string, e: string) => void; onDelete: (id: string) => void; onStartEdit: (m: ChatMessage) => void;
  onCtxMenu: (m: ChatMessage, x: number, y: number) => void;
  onReply: (m: ChatMessage) => void; onForward: (m: ChatMessage) => void;
}

function MessageList({ messages, myId, myName, editingId, editValue, onEditChange, onEditSubmit, onEditCancel, onReaction, onDelete, onStartEdit, onCtxMenu, onReply, onForward }: MsgListProps) {
  if (messages.length === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>No messages yet. Say hello! 👋</div>
  );

  type Item = { type: 'divider'; label: string } | { type: 'msg'; msg: ChatMessage; isFirst: boolean };
  const items: Item[] = [];
  let lastDate = '';
  messages.forEach((msg, i) => {
    const dk = msg.timestamp.toDateString();
    if (dk !== lastDate) { items.push({ type: 'divider', label: dateDivLabel(msg.timestamp) }); lastDate = dk; }
    const prev = messages[i - 1];
    items.push({ type: 'msg', msg, isFirst: !prev || !grouped(prev, msg) || prev.timestamp.toDateString() !== dk });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
      {items.map((item, idx) => {
        if (item.type === 'divider') return (
          <div key={`d-${idx}`} className="inbox-date-divider">
            <div className="inbox-date-divider-line" /><span className="inbox-date-divider-label">{item.label}</span><div className="inbox-date-divider-line" />
          </div>
        );
        const { msg, isFirst } = item;
        const isOwn = msg.userId === myId;
        const isEd  = editingId === msg.id;
        return (
          <div key={msg.id} id={`msg-${msg.id}`}
            className={`inbox-msg-group${isFirst ? ' first-in-group' : ''}${msg.isPinned ? ' pinned' : ''}${msg.isLocal ? ' local-msg' : ''}`}
            onContextMenu={e => { e.preventDefault(); onCtxMenu(msg, e.clientX, e.clientY); }}>
            <div className="inbox-msg-avatar-col">
              {isFirst ? <div className="inbox-msg-avatar">{initials(msg.userName)}</div> : <span className="inbox-msg-time-compact">{fmtTime(msg.timestamp)}</span>}
            </div>
            <div className="inbox-msg-body">
              {isFirst && (
                <div className="inbox-msg-header">
                  <span className="inbox-msg-author">{msg.userName}</span>
                  {msg.userDesignation && <span className="inbox-msg-role-badge">{msg.userDesignation}</span>}
                  <span className="inbox-msg-timestamp">{fmtTs(msg.timestamp)}</span>
                  {msg.isPinned && <span style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 600 }}>📌</span>}
                  {msg.isSending && <span className="inbox-msg-sending-badge"><span className="inbox-msg-sending-dot" />Uploading…</span>}
                  {!msg.isSending && msg.isLocal && !msg.sendFailed && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Sending…</span>}
                  {msg.sendFailed && <span style={{ fontSize: 11, color: 'var(--color-error)', fontWeight: 600 }}>⚠ Failed — retry</span>}
                </div>
              )}
              {msg.replyToId && (
                <div className="inbox-reply-thread">
                  <div className="inbox-reply-thread-bar" />
                  {msg.replyToAuthor && <span className="inbox-reply-thread-author">{msg.replyToAuthor}</span>}
                  <span className="inbox-reply-thread-content">{(msg.replyToContent ?? '').slice(0, 80)}</span>
                </div>
              )}
              {isEd ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <textarea
                    ref={el => { if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }}
                    value={editValue}
                    onChange={e => onEditChange(e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSubmit(msg.id); }
                      if (e.key === 'Escape') { e.preventDefault(); onEditCancel(); }
                    }}
                    style={{ width: '100%', border: '1.5px solid var(--color-primary)', borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', background: 'var(--color-bg)', color: 'var(--color-text-body)' }} rows={2} />
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Enter to save · Esc to cancel</div>
                </div>
              ) : (
                <div className={`inbox-msg-content${msg.edited ? ' edited' : ''}`}>{renderContent(msg.content, myName)}</div>
              )}
              {msg.reactions.length > 0 && (
                <div className="inbox-msg-reactions">
                  {msg.reactions.map(r => (
                    <button key={r.emoji} className={`inbox-reaction${r.users.includes(myId) ? ' mine' : ''}`} onClick={() => onReaction(msg.id, r.emoji)} title={`${r.users.length}`}>
                      <span>{r.emoji}</span><span className="inbox-reaction-count">{r.users.length}</span>
                    </button>
                  ))}
                  <EmojiPicker msgId={msg.id} onReaction={onReaction} />
                </div>
              )}
            </div>
            {!isEd && (
              <div className="inbox-msg-toolbar">
                {EMOJI_LIST.slice(0, 3).map(e => <button key={e} className="inbox-msg-toolbar-btn" onClick={() => onReaction(msg.id, e)} style={{ fontSize: 14 }}>{e}</button>)}
                <button className="inbox-msg-toolbar-btn" title="Reply" onClick={() => onReply(msg)}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/corner-up-left.svg)', maskImage: 'url(/icons/corner-up-left.svg)' }} /></button>
                <button className="inbox-msg-toolbar-btn" title="Forward" onClick={() => onForward(msg)}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/corner-up-right.svg)', maskImage: 'url(/icons/corner-up-right.svg)' }} /></button>
                {isOwn && <button className="inbox-msg-toolbar-btn" title="Edit" onClick={() => onStartEdit(msg)}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/edit.svg)', maskImage: 'url(/icons/edit.svg)' }} /></button>}
                <button className="inbox-msg-toolbar-btn" title="More" onClick={e => onCtxMenu(msg, e.clientX, e.clientY)}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/more-horizontal.svg)', maskImage: 'url(/icons/more-horizontal.svg)' }} /></button>
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
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="inbox-add-reaction-btn" onClick={() => setOpen(p => !p)} title="Add reaction">+</button>
      {open && <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.1)', padding: 6, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, zIndex: 20, width: 180 }}>
        {EMOJI_LIST.map(e => <button key={e} className="inbox-emoji-btn" style={{ fontSize: 18, padding: 4 }} onClick={() => { onReaction(msgId, e); setOpen(false); }}>{e}</button>)}
      </div>}
    </div>
  );
}

/* ─────────────────── PresenceVoiceView ───────────────────── */

function PresenceVoiceView({ channel, occupants, isInChannel, micMuted, deafened, onJoin, onLeave, onToggleMic, onToggleDeafen }: { channel: Channel; occupants: string[]; isInChannel: boolean; micMuted: boolean; deafened: boolean; onJoin: () => void; onLeave: () => void; onToggleMic: () => void; onToggleDeafen: () => void; }) {
  return (
    <div className="inbox-voice-view">
      <div className="inbox-voice-view-header">
        <div className="inbox-voice-view-title">🔊 {channel.name}</div>
        <div className="inbox-voice-view-sub">{occupants.length === 0 ? 'No one here yet' : `${occupants.length} in channel`}</div>
      </div>
      {occupants.length > 0 && <div className="inbox-voice-participants-grid">{occupants.map(n => (<div key={n} className="inbox-voice-participant"><div className="inbox-voice-participant-avatar" style={{ background: `hsl(${(n.charCodeAt(0) * 37) % 360}, 45%, 35%)` }}>{initials(n)}</div><span className="inbox-voice-participant-name">{n}</span></div>))}</div>}
      {!isInChannel ? (
        <button className="inbox-voice-join-btn" onClick={onJoin}>Join Voice Channel</button>
      ) : (
        <div className="inbox-voice-controls-bar">
          <button className={`inbox-voice-ctrl-btn${micMuted ? ' active-mute' : ''}`} title={micMuted ? 'Unmute' : 'Mute'} onClick={onToggleMic}><span className="icon" style={{ WebkitMaskImage: micMuted ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)', maskImage: micMuted ? 'url(/icons/mic-off.svg)' : 'url(/icons/mic.svg)' }} /></button>
          <button className={`inbox-voice-ctrl-btn${deafened ? ' active-mute' : ''}`} title="Deafen" onClick={onToggleDeafen}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/headphones.svg)', maskImage: 'url(/icons/headphones.svg)' }} /></button>
          <button className="inbox-voice-ctrl-btn leave" title="Leave" onClick={onLeave}><span className="icon" style={{ WebkitMaskImage: 'url(/icons/phone-off.svg)', maskImage: 'url(/icons/phone-off.svg)' }} /></button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── MembersPanel ───────────────────────── */

function MembersPanel({ members, myId, statusColor }: { members: Member[]; myId: string; statusColor: Record<UserStatus, string> }) {
  const online  = members.filter(m => m.status !== 'offline');
  const offline = members.filter(m => m.status === 'offline');
  const labels: Record<UserStatus, string> = { online: 'Online', away: 'Away', dnd: 'Do Not Disturb', offline: 'Offline' };
  return (
    <>
      <div className="inbox-members-section-label">Online — {online.length}</div>
      {online.map(m => (
        <div key={m.id} className="inbox-member-row" title={`${m.name} — ${labels[m.status]}`}>
          <div className="inbox-member-avatar-wrap"><div className="inbox-member-av">{initials(m.name)}</div><span className="inbox-member-status-dot" style={{ background: statusColor[m.status] }} /></div>
          <div className="inbox-member-info"><div className="inbox-member-name">{m.name}{m.id === myId ? ' (you)' : ''}</div><div className="inbox-member-designation">{m.designation}</div></div>
        </div>
      ))}
      {offline.length > 0 && (
        <>
          <div className="inbox-members-section-label" style={{ marginTop: 8 }}>Offline — {offline.length}</div>
          {offline.map(m => (
            <div key={m.id} className="inbox-member-row offline-member" title={`${m.name} — Offline`}>
              <div className="inbox-member-avatar-wrap"><div className="inbox-member-av">{initials(m.name)}</div><span className="inbox-member-status-dot" style={{ background: statusColor[m.status] }} /></div>
              <div className="inbox-member-info"><div className="inbox-member-name">{m.name}</div><div className="inbox-member-designation">{m.designation}</div></div>
            </div>
          ))}
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
    <div className="inbox-modal-backdrop" onClick={onCancel}>
      <div className="inbox-modal-box" style={{ maxWidth: 400, gap: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔊</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Join #{channelName}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Check your microphone before joining
          </div>
        </div>

        {/* Mic test section */}
        <div style={{
          background: 'var(--color-sidebar)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: micStatus === 'granted' ? 'rgba(45,206,137,0.15)' : micStatus === 'denied' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
              border: `1.5px solid ${micStatus === 'granted' ? '#2dce89' : micStatus === 'denied' ? '#ef4444' : 'var(--color-border)'}`,
            }}>
              {micStatus === 'denied' ? '🚫' : '🎙️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {micStatus === 'idle'     && 'Microphone not tested'}
                {micStatus === 'checking' && 'Requesting access…'}
                {micStatus === 'granted'  && 'Microphone ready'}
                {micStatus === 'denied'   && 'Microphone blocked'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {micStatus === 'idle'    && 'Click "Test mic" to allow access'}
                {micStatus === 'checking'&& 'Allow microphone in the browser popup'}
                {micStatus === 'granted' && 'Speak — the bar shows your level'}
                {micStatus === 'denied'  && 'Click the 🔒 icon in the address bar → Allow'}
              </div>
            </div>
            {micStatus === 'idle' || micStatus === 'denied' ? (
              <button
                onClick={requestMic}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: micStatus === 'denied' ? '#ef4444' : 'var(--color-primary)',
                  color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0,
                }}
              >
                {micStatus === 'denied' ? 'Retry' : 'Test mic'}
              </button>
            ) : null}
          </div>

          {/* Live mic level visualizer */}
          {micStatus === 'granted' && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, padding: '0 2px' }}>
              {Array.from({ length: bars }, (_, i) => {
                const thresh = (i + 1) / bars;
                const active = micLevel >= thresh;
                return (
                  <div key={i} style={{
                    flex: 1,
                    height: `${20 + (i / bars) * 80}%`,
                    borderRadius: 2,
                    background: active
                      ? (micLevel > 0.8 ? '#f59e0b' : micLevel > 0.5 ? '#2dce89' : '#2dce89')
                      : 'rgba(255,255,255,0.1)',
                    transition: 'background 60ms',
                  }} />
                );
              })}
            </div>
          )}
        </div>

        {/* Permissions note */}
        {micStatus === 'denied' && (
          <div style={{
            fontSize: 12, color: 'rgba(239,68,68,0.9)',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '10px 14px', lineHeight: 1.5,
          }}>
            <strong>To fix:</strong> click the 🔒 lock icon in your browser's address bar,
            find <em>Microphone</em>, set it to <em>Allow</em>, then reload the page.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-text-body)', fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
              background: 'var(--color-primary)', color: '#fff',
              fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}
          >
            {micStatus === 'denied' ? 'Join anyway (listen only)' : 'Join Voice Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}
