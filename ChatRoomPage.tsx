import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Video, MoreVertical, Image, Smile, Mic, Send, X, ChevronLeft,
  Reply, Copy, Trash2, Loader2, Search, Plus, Lock
} from 'lucide-react';
import MessageBubble from '@/components/features/MessageBubble';
import StickerPicker from '@/components/features/StickerPicker';
import TypingIndicator from '@/components/features/TypingIndicator';
import CallModal from '@/components/features/CallModal';
import type { Chat, Message, User } from '@/types';
import { AI_ASSISTANT_ID, AI_ASSISTANT_PROFILE, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/hooks/useChatStore';
import { uploadFile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import { getAIResponse } from '@/lib/gemini';

interface ChatRoomPageProps {
  chat: Chat;
  messages: Message[];
  onBack: () => void;
  onSend: (chatId: string, senderId: string, content: string, type?: Message['type']) => void;
  onReact: (chatId: string, messageId: string, emoji: string, userId: string) => void;
  onMarkRead: (chatId: string, userId: string) => void;
  onDeleteMessage?: (chatId: string, messageId: string) => void;
  onMuteChat?: (chatId: string, isMuted: boolean) => void;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

const ChatRoomPage = ({ chat, messages, onBack, onSend, onReact, onMarkRead, onDeleteMessage, onMuteChat }: ChatRoomPageProps) => {
  const { user } = useAuth();
  const { fetchMessages, subscribeToChat, setTyping, typingUsers } = useChatStore();
  const [input, setInput] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; message?: string } | null>(null);
  const [showProfile, setShowProfile] = useState<User | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(chat.isMuted || false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const [participantProfiles, setParticipantProfiles] = useState<Record<string, User>>({});

  const otherUserId = chat.type === 'direct' && user
    ? chat.participants.find(p => p !== user.id) || null
    : null;

  const participantIds = useMemo(() => chat.participants.filter((pid) => pid !== AI_ASSISTANT_ID), [chat.participants]);
  const participantIdsKey = participantIds.join(',');
  const otherUser = otherUserId
    ? (participantProfiles[otherUserId] as User | undefined) ?? (otherUserId === AI_ASSISTANT_ID ? AI_ASSISTANT_PROFILE : null)
    : null;

  const chatName = chat.type === 'group'
    ? chat.name || 'Group Chat'
    : otherUser?.name || 'Chat';
  const chatAvatar = chat.type === 'group'
    ? chat.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(chat.id)}`
    : otherUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId || 'unknown'}`;

  const isAIChat = chat.participants.includes(AI_ASSISTANT_ID);
  const activeTypingUsers = typingUsers[chat.id] || [];
  const isSomeoneTyping = activeTypingUsers.filter(uid => uid !== user?.id).length > 0 || isAIResponding;

  useEffect(() => {
    const ids = participantIds;
    if (ids.length === 0) {
      setParticipantProfiles({});
      return;
    }

    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);
      if (data && !error) {
        const profileMap = data.reduce<Record<string, User>>((acc, profile) => {
          acc[profile.id] = {
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
            status: profile.status || 'offline',
            statusMessage: profile.status_message || '',
          };
          return acc;
        }, {});
        setParticipantProfiles(profileMap);
      }
    };

    const profileChannel = supabase.channel(`chat-profiles:${chat.id}`);
    ids.forEach((id) => {
      profileChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${id}` }, (payload) => {
        if (payload.new) {
          setParticipantProfiles((prev) => ({
            ...prev,
            [payload.new.id]: {
              id: payload.new.id,
              name: payload.new.name,
              avatar: payload.new.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.id}`,
              status: payload.new.status || 'offline',
              statusMessage: payload.new.status_message || '',
            },
          }));
        }
      });
    });

    profileChannel.subscribe();
    loadProfiles();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [chat.id, participantIdsKey, participantIds]);

  useEffect(() => {
    setNotificationsMuted(chat.isMuted || false);
  }, [chat.isMuted]);

  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => { if (interval) window.clearInterval(interval); };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        setIsUploading(true);
        try {
          const url = await uploadFile('chats', file);
          onSend(chat.id, user!.id, url, 'voice');
        } catch (err) {
          toast.error('Failed to send voice message');
        } finally {
          setIsUploading(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (user) {
      onMarkRead(chat.id, user.id);
      fetchMessages(chat.id);
      const unsubscribe = subscribeToChat(chat.id);
      return () => {
        if (typingTimeoutRef.current) {
          window.clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        setTyping(chat.id, user.id, false);
        unsubscribe();
      };
    }
  }, [chat.id, user, fetchMessages, subscribeToChat, onMarkRead, setTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAIResponding]);

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (user) {
      setTyping(chat.id, user.id, false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim();
    onSend(chat.id, user.id, content, 'text');
    stopTyping();
    setInput('');
    setShowStickers(false);
    setReplyTo(null);
    inputRef.current?.focus();

    if (isAIChat) {
      setIsAIResponding(true);
      setTyping(chat.id, AI_ASSISTANT_ID, true);

      const history = messages.slice(-10).map(m => ({
        role: (m.senderId === user.id ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.content }],
      }));

      const aiResponse = await getAIResponse(content, history);
      onSend(chat.id, AI_ASSISTANT_ID, aiResponse, 'text');
      setIsAIResponding(false);
      setTyping(chat.id, AI_ASSISTANT_ID, false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const url = await uploadFile('chats', file);
      const isImage = file.type.startsWith('image/');
      const content = isImage ? url : `${file.name}|${url}`;
      onSend(chat.id, user.id, content, isImage ? 'image' : 'file');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReact = (msgId: string, emoji: string) => {
    if (!user) return;
    onReact(chat.id, msgId, emoji, user.id);
    setShowReactions(null);
    setSelectedMsg(null);
  };

  const handleDelete = (msgId: string) => {
    if (confirm('Delete this message for everyone?')) {
      onDeleteMessage?.(chat.id, msgId);
      setSelectedMsg(null);
      toast.success('Message deleted');
    }
  };

  const handleStickerSelect = (sticker: string) => {
    if (!user) return;
    onSend(chat.id, user.id, sticker, 'sticker');
    setShowStickers(false);
  };

  const handleMuteToggle = () => {
    const nextState = !notificationsMuted;
    setNotificationsMuted(nextState);
    if (onMuteChat) onMuteChat(chat.id, nextState);
    toast.success(nextState ? 'Notifications muted' : 'Notifications unmuted');
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const popularEmojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '🙏', '🔥', '✨', '❤️', '🎉', '😢', '😡', '👋', '🙌', '💯', '🚀', '🌈', '🍕'];

  const groupMessages = (msgs: Message[]) =>
    msgs.map((msg, i) => {
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      return {
        ...msg,
        showAvatar: Boolean(!next || next.senderId !== msg.senderId),
        showSenderName: Boolean(!prev || prev.senderId !== msg.senderId),
      };
    });

  const filteredMessages = messages.filter(m =>
    m.type === 'text' && m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = groupMessages(searchQuery ? filteredMessages : messages);

  const shouldShowDate = (msg: Message, prev?: Message) =>
    !prev || msg.timestamp.toDateString() !== prev.timestamp.toDateString();

  const getSubtitle = () => {
    if (chat.type === 'group') return `${chat.participants.length} members`;
    return otherUser?.status === 'online' ? 'Online' : (otherUser?.statusMessage || '');
  };

  return (
    <div className="flex flex-col h-full bg-[#111] relative">
      {/* Header */}
      <div className="gchat-header flex flex-col sticky top-0 z-40">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} className="p-1.5 text-white/70 hover:bg-white/10 rounded-full transition-colors -ml-1" aria-label="Back" title="Back">
            <ChevronLeft size={24} />
          </button>
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setShowProfile(otherUser)}>
            <img src={chatAvatar} alt={chatName} className="w-9 h-9 rounded-full object-cover bg-white/20" />
            {otherUser?.status === 'online' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-cyan-400 rounded-full border-2 border-transparent" />
            )}
          </div>
          <div className="flex-1 cursor-pointer min-w-0" onClick={() => setShowProfile(otherUser)}>
            <p className="text-white font-bold text-[15px] leading-tight truncate">{chatName}</p>
            <p className="text-white/60 text-[11px] truncate">{getSubtitle()}</p>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setShowSearch(s => !s)}
              aria-label="Toggle message search"
              title="Search messages"
              className={cn("p-2 transition-colors", showSearch ? "text-cyan-300" : "text-white/70 hover:bg-white/10 rounded-full")}
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setCallType('voice')}
              aria-label="Start voice call"
              title="Voice call"
              className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={() => setCallType('video')}
              aria-label="Start video call"
              title="Video call"
              className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors"
            >
              <Video size={20} />
            </button>
            <button
              onClick={() => setShowInfo(true)}
              aria-label="Open chat info"
              title="Chat info"
              className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar Inline */}
        {showSearch && (
          <div className="px-4 pb-3 animate-fade-in bg-inherit">
            <div className="flex items-center bg-black/5 rounded-xl px-3 py-2 gap-2">
              <Search size={15} className="text-white/40" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder-white/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} aria-label="Clear search" title="Clear search">
                  <X size={14} className="text-white/40" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide"
        style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #111 100%)' }}
        onClick={() => { setSelectedMsg(null); setShowReactions(null); }}
      >
        {grouped.map((msg, i) => (
          <div key={msg.id}>
            {shouldShowDate(msg, grouped[i - 1]) && (
              <div className="flex justify-center my-3">
                <span className="bg-white/10 text-white/60 text-[11px] px-3 py-1 rounded-full">
                  {msg.timestamp.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}

            {/* Long-press message action overlay */}
            <div
              className="relative group"
              onContextMenu={e => {
                e.preventDefault();
                setSelectedMsg(msg);
                setShowReactions(msg.id);
              }}
            >
              {/* Quick reactions popup */}
              {showReactions === msg.id && (
                <div
                  className={cn(
                    'absolute z-20 flex gap-1 bg-[#2a2a2a] border border-white/10 rounded-full px-2 py-1.5 shadow-xl animate-scale-in',
                    msg.senderId === user?.id ? 'right-0' : 'left-8'
                  )
                  }
                  style={{ bottom: '100%', marginBottom: 4 }}
                  onClick={e => e.stopPropagation()}
                >
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(msg.id, emoji)}
                      aria-label={`React with ${emoji}`}
                      title={`React with ${emoji}`}
                      className="text-2xl hover:scale-125 transition-transform active:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Action bar (reply, copy) */}
              {selectedMsg?.id === msg.id && showReactions !== msg.id && (
                <div
                  className={cn(
                    'absolute z-20 flex gap-1 bg-[#2a2a2a] border border-white/10 rounded-xl px-1 py-1 shadow-xl animate-scale-in',
                    msg.senderId === user?.id ? 'right-0' : 'left-8'
                  )}
                  style={{ bottom: '100%', marginBottom: 4 }}
                  onClick={e => e.stopPropagation()}
                >
                  <ActionBtn icon={<Reply size={16} />} label="Reply" onClick={() => { setReplyTo(msg); setSelectedMsg(null); inputRef.current?.focus(); }} />
                  <ActionBtn icon={<Copy size={16} />} label="Copy" onClick={() => { navigator.clipboard?.writeText(msg.content); toast.success('Copied!'); setSelectedMsg(null); }} />
                  {msg.senderId === user?.id && (
                    <ActionBtn icon={<Trash2 size={16} />} label="Delete" danger onClick={() => handleDelete(msg.id)} />
                  )}
                </div>
              )}

              <MessageBubble
                message={msg}
                isOwn={msg.senderId === user?.id}
                showAvatar={msg.showAvatar}
                showSenderName={msg.showSenderName}
                isGroup={chat.type === 'group'}
                onLongPress={() => { setSelectedMsg(msg); setShowReactions(msg.id); }}
                onReact={(emoji) => handleReact(msg.id, emoji)}
              />
            </div>
          </div>
        ))}

        {isSomeoneTyping && (
          <div className="flex items-end gap-2 mb-4">
            {otherUser && <img src={otherUser.avatar} alt="" className="w-8 h-8 rounded-full" />}
            <TypingIndicator name={isAIResponding ? 'GaGa AI' : (otherUser?.name || 'Someone')} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticker Picker */}
      {showStickers && (
        <StickerPicker
          onSelect={(s) => { onSend(chat.id, user!.id, s, 'sticker'); setShowStickers(false); }}
          onClose={() => setShowStickers(false)}
        />
      )}

      {/* Reply Preview */}
      {replyTo && (
          <div className="bg-[#1a1a1a] border-t border-white/10 px-4 py-2 flex items-center gap-3">
          <div className="flex-1 border-l-2 border-cyan-400 pl-3">
            <p className="text-[11px] text-cyan-300 font-semibold mb-0.5">
              {replyTo.senderId === user?.id ? 'You' : participantProfiles[replyTo.senderId]?.name || 'Someone'}
            </p>
            <p className="text-[12px] text-white/50 truncate">
              {replyTo.type === 'sticker' ? `${replyTo.content} Sticker` : replyTo.content}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white/60" aria-label="Cancel reply" title="Cancel reply">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="bg-[#1a1a1a] border-t border-white/10 px-2 py-2 relative">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setShowEmojis(!showEmojis); setShowStickers(false); setReplyTo(null); }}
              className={cn(
                'p-2.5 rounded-full transition-colors flex-shrink-0',
                showEmojis ? 'text-cyan-300' : 'text-white/50 hover:bg-white/10'
              )}
            >
              <Smile size={22} />
            </button>
            <button
              onClick={() => { setShowStickers(!showStickers); setShowEmojis(false); setReplyTo(null); }}
              className={cn(
                'p-2.5 rounded-full transition-colors flex-shrink-0',
                showStickers ? 'text-cyan-300' : 'text-white/50 hover:bg-white/10'
              )}
            >
              <Image size={22} />
            </button>
          </div>

          {/* Emoji Picker Popover */}
          <AnimatePresence>
            {showEmojis && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-4 mb-4 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 shadow-2xl grid grid-cols-5 gap-2 z-50 w-64"
              >
                {popularEmojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    aria-label={`Insert emoji ${emoji}`}
                    title={`Insert emoji ${emoji}`}
                    className="text-2xl hover:bg-white/5 rounded-lg p-1.5 transition-colors active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex items-end bg-white/10 rounded-2xl px-3 py-2 gap-2 min-h-[42px]">
            <label className="sr-only" htmlFor="chat-input">
              Message input
            </label>
            <input
              id="chat-input"
              ref={inputRef}
              value={input}

              onChange={e => {
                const value = e.target.value;
                setInput(value);
                if (!user) return;
                if (typingTimeoutRef.current) {
                  window.clearTimeout(typingTimeoutRef.current);
                }

                if (value.trim()) {
                  setTyping(chat.id, user.id, true);
                  typingTimeoutRef.current = window.setTimeout(() => {
                    setTyping(chat.id, user.id, false);
                    typingTimeoutRef.current = null;
                  }, 1200);
                } else {
                  setTyping(chat.id, user.id, false);
                }
              }}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Aa"
              className="flex-1 bg-transparent text-sm outline-none text-white placeholder-white/30"
            />
            <label
              aria-label="Attach file"
              title="Attach file"
              className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 cursor-pointer"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
              <input
                type="file"
                aria-label="Attach file input"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {input.trim() ? (
            <button
              onClick={handleSend}
              aria-label="Send message"
              title="Send message"
              className="w-10 h-10 gchat-btn rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity active:scale-95 shadow-sm"
            >
              <Send size={18} className="text-black ml-0.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {isRecording && (
                <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-500 text-xs font-mono">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              <button
                className={cn(
                  "p-2.5 rounded-full transition-all flex-shrink-0",
                  isRecording ? "bg-red-500 text-white scale-125" : "text-white/50 hover:bg-white/10"
                )}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
                title={isRecording ? 'Stop recording' : 'Hold to record voice message'}
              >
                <Mic size={22} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Call Modal */}
      {callType && otherUser && (
        <CallModal user={otherUser} type={callType} onEnd={() => setCallType(null)} />
      )}

      {/* User Profile View Modal */}
      <AnimatePresence>
        {showProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/80" onClick={() => setShowProfile(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#1a1a1a] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="h-32 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-cyan-300 opacity-20" />
            <button
              onClick={() => setShowProfile(null)}
              className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white/70 hover:text-white"
              aria-label="Close profile"
              title="Close profile"
            >
              <X size={20} />
            </button>
              </div>

              <div className="px-6 pb-8 flex flex-col items-center -mt-16 relative z-10">
                <div className="relative group">
                  <img
                    src={showProfile.avatar}
                    alt={showProfile.name}
                    className="w-32 h-32 rounded-full border-4 border-[#1a1a1a] shadow-xl object-cover bg-black"
                  />
                  <div className={cn(
                    "absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-[#1a1a1a]",
                    showProfile.status === 'online' ? 'bg-cyan-400' : 'bg-white/20'
                  )} />
                </div>

                <h3 className="mt-4 text-2xl font-bold text-white">{showProfile.name}</h3>
                <p className="text-white/40 text-sm mt-1">GaGa ID: {showProfile.id.slice(0, 8)}</p>

                {showProfile.statusMessage && (
                  <div className="mt-6 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                    <p className="text-white/70 text-sm italic leading-relaxed">"{showProfile.statusMessage}"</p>
                  </div>
                )}

                <div className="mt-8 flex gap-3 w-full">
                  <button
                    onClick={() => { setCallType('voice'); setShowProfile(null); }}
                    className="flex-1 flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Phone size={20} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">Voice</span>
                  </button>
                  <button
                    onClick={() => { setCallType('video'); setShowProfile(null); }}
                    className="flex-1 flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-300">
                      <Video size={20} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">Video</span>
                  </button>
                  <button
                    onClick={() => { setShowInfo(true); setShowProfile(null); }}
                    className="flex-1 flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <MoreVertical size={20} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">More</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Info Panel */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setShowInfo(false); }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#1a1a1a] border-l border-white/10 shadow-2xl flex flex-col animate-scale-in">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <h3 className="font-bold text-white">Chat Info</h3>
              <button
                onClick={() => setShowInfo(false)}
                aria-label="Close chat info"
                title="Close chat info"
              >
                <X size="20" className="text-white/50" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="flex flex-col items-center py-6 bg-black/30 border-b border-white/10">
                <div className="relative">
                  <img
                    src={chatAvatar}
                    alt={chatName}
                    className="w-20 h-20 rounded-full mb-3 border-4 border-[#1a1a1a] shadow-md object-cover"
                  />
                  {otherUser?.status === 'online' && (
                    <div className="absolute bottom-4 right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-[#1a1a1a]" />
                  )}
                </div>
                <h4 className="font-bold text-white text-lg">{chatName}</h4>
                {otherUser && <p className="text-sm text-white/50 mt-1 italic text-center px-4 line-clamp-2">"{otherUser.statusMessage}"</p>}
                  <div className="flex items-center gap-1.5 mt-3 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <Lock size={10} className="text-cyan-300" />
                    <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest">End-to-End Encrypted</span>
                </div>
              </div>

              {/* Media Gallery Preview */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-xs font-bold text-white/40 uppercase tracking-wider">Shared Media</h5>
                  <button className="text-[11px] text-cyan-300 font-semibold" onClick={() => {
                    if (messages.filter(m => m.type === 'image').length > 0) {
                      setShowGallery(true);
                    } else {
                      setInfoModal({ title: 'Shared Media', message: 'No shared images yet' });
                    }
                  }}>See all</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {messages
                    .filter(m => m.type === 'image')
                    .slice(-6)
                    .map(m => (
                      <div key={m.id} className="aspect-square rounded-lg overflow-hidden border border-white/5 bg-black/20">
                        <img src={m.content} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" />
                      </div>
                    ))
                  }
                  {messages.filter(m => m.type === 'image').length === 0 && (
                    <div className="col-span-3 py-4 flex flex-col items-center justify-center bg-white/5 rounded-xl border border-dashed border-white/10">
                      <Image size={24} className="text-white/20 mb-2" />
                      <p className="text-[11px] text-white/30">No media shared yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Participants */}
              {chat.type === 'group' && (
                <div className="p-4 border-b border-white/10">
                  <h5 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Participants ({chat.participants.length})</h5>
                  <div className="space-y-3">
                    {chat.participants.map(pid => {
                      const p = pid === AI_ASSISTANT_ID
                        ? AI_ASSISTANT_PROFILE
                        : participantProfiles[pid] || {
                          id: pid,
                          name: pid === user?.id ? 'You' : 'Unknown',
                          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pid}`,
                          status: 'offline',
                          statusMessage: 'Available',
                        };
                      return (
                        <div key={pid} className="flex items-center gap-3">
                          <div className="relative">
                            <img src={p.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                            {p.status === 'online' && (
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-[#1a1a1a]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{p.name}</p>
                            <p className="text-[11px] text-white/40 truncate">{pid === user?.id ? 'You' : p.statusMessage || 'Available'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settings / Danger Zone */}
              <div className="p-4 space-y-2">
                <button
                  onClick={handleMuteToggle}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl text-sm text-white/80 hover:bg-white/10 transition-colors"
                >
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Phone size={16} />
                      </div>
                      <span>Mute Notifications</span>
                    </div>
                    <span className="text-[11px] text-white/50">
                      {notificationsMuted ? 'Muted' : 'Unmuted'}
                    </span>
                  </div>
                  <div className={cn(
                    'w-10 h-5 rounded-full relative transition-colors',
                    notificationsMuted ? 'bg-cyan-400/30' : 'bg-white/10'
                  )}>
                    <div className={cn(
                      'absolute top-1 w-3 h-3 rounded-full transition-all',
                      notificationsMuted ? 'right-1 bg-white' : 'left-1 bg-white/40'
                    )} />
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all messages?')) {
                      toast.success('Chat cleared locally');
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl text-sm text-white/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                    <Trash2 size={16} />
                  </div>
                  <span>Clear Chat</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-black/20">
              <p className="text-[10px] text-center text-white/20 uppercase tracking-[0.2em] font-bold">GaGa Chat v1.0.0</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal (for placeholders) */}
      {infoModal && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setInfoModal(null)}>
          <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 animate-scale-in">
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-white mb-3">{infoModal.title}</h2>
              {infoModal.message && <p className="text-white/60 text-sm mb-6">{infoModal.message}</p>}
              <button onClick={() => setInfoModal(null)} className="w-full py-3 rounded-xl gchat-btn text-black font-bold">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionBtn = ({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs hover:bg-white/10 transition-colors min-w-[52px]',
      danger ? 'text-red-400' : 'text-white/70'
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default ChatRoomPage;
