import { Pin, Volume2, VolumeX } from 'lucide-react';
import { AI_ASSISTANT_PROFILE, cn } from '@/lib/utils';
import type { Chat } from '@/types';
import { getChatName, getChatAvatar, getUserById, formatTime } from '@/constants/mockData';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ChatListItemProps {
  chat: Chat;
  onClick: () => void;
  onPin?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
}

const ChatListItem = ({ chat, onClick, onPin, onMute, onDelete }: ChatListItemProps) => {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const chatName = getChatName(chat, user?.id);
  const chatAvatar = getChatAvatar(chat, user?.id);
  const otherParticipant = chat.type === 'direct' && user
    ? (() => {
      const otherId = chat.participants.find(p => p !== user.id) || '';
      if (otherId === AI_ASSISTANT_PROFILE.id) return AI_ASSISTANT_PROFILE;
      return getUserById(otherId);
    })()
    : null;

  const isOnline = otherParticipant?.status === 'online';
  const lastMsg = chat.lastMessage;
  const lastMsgSender = lastMsg
    ? (lastMsg.senderId === AI_ASSISTANT_PROFILE.id ? AI_ASSISTANT_PROFILE : getUserById(lastMsg.senderId))
    : null;

  const getMessagePreview = () => {
    if (!lastMsg) return 'No messages yet';
    if (lastMsg.type === 'image') return '📷 Photo';
    if (lastMsg.type === 'sticker') return `${lastMsg.content} Sticker`;
    if (lastMsg.type === 'voice') return '🎤 Voice message';
    if (lastMsg.type === 'video') return '📹 Video';
    if (lastMsg.type === 'file') return '📄 File';
    return lastMsg.content;
  };

  const senderPrefix = () => {
    if (!lastMsg || !user) return '';
    if (chat.type === 'group' && lastMsg.senderId !== user.id) {
      return `${lastMsgSender?.name?.split(' ')[0] || 'Unknown'}: `;
    }
    if (lastMsg.senderId === user.id) return 'You: ';
    return '';
  };

  return (
    <div className="relative" onContextMenu={e => { e.preventDefault(); setShowActions(!showActions); }}>
      <div
        onClick={() => { setShowActions(false); onClick(); }}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-150 bg-slate-950/90 hover:bg-slate-900/90 active:bg-slate-900/95"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img src={chatAvatar} alt={chatName} className="w-12 h-12 rounded-full object-cover bg-white/10" />
          {chat.type === 'direct' && (
            <div className={cn(
              'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-950',
              isOnline ? 'bg-cyan-400' : 'bg-slate-600'
            )} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[15px] font-semibold text-white truncate">{chatName}</span>
              {chat.isPinned && <Pin size={10} className="text-white/30 flex-shrink-0" />}
              {chat.isMuted && <VolumeX size={10} className="text-white/30 flex-shrink-0" />}
            </div>
            {lastMsg && (
              <span className={cn(
                'text-[12px] flex-shrink-0',
                chat.unreadCount > 0 ? 'text-cyan-300' : 'text-white/30'
              )}>
                {formatTime(lastMsg.timestamp)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              'text-[13px] truncate flex-1',
              chat.unreadCount > 0 ? 'text-white/70' : 'text-white/40'
            )}>
              {senderPrefix()}{getMessagePreview()}
            </p>
            {chat.unreadCount > 0 && !chat.isMuted && (
              <span className="min-w-[20px] h-5 bg-cyan-400 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
            {chat.unreadCount > 0 && chat.isMuted && (
              <span className="min-w-[20px] h-5 bg-slate-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Context Actions */}
      {showActions && (
        <div className="absolute right-4 top-12 bg-slate-950/95 rounded-2xl shadow-2xl border border-slate-700/70 z-10 overflow-hidden animate-scale-in">
          <button onClick={() => { onPin?.(); setShowActions(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-cyan-500/10 transition-colors">
            <Pin size={16} />
            {chat.isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => { onMute?.(); setShowActions(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-cyan-500/10 transition-colors border-t border-slate-700/70">
            {chat.isMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {chat.isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={() => { onDelete?.(); setShowActions(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-slate-700/70">
            Delete Chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatListItem;
