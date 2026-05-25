import { Check, CheckCheck, Play, Pause, FileText, Download } from 'lucide-react';
import { AI_ASSISTANT_ID, AI_ASSISTANT_NAME, AI_ASSISTANT_AVATAR, cn } from '@/lib/utils';
import type { Message } from '@/types';
import { getUserById } from '@/constants/mockData';
import { useState, useRef } from 'react';

interface MessageBubbleProps {
  message: Message & { showAvatar?: boolean; showSenderName?: boolean };
  isOwn: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  isGroup?: boolean;
  onLongPress?: () => void;
  onReact?: (emoji: string) => void;
}

const MessageBubble = ({
  message, isOwn, showAvatar, showSenderName, isGroup, onLongPress,
}: MessageBubbleProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAI = message.senderId === AI_ASSISTANT_ID;
  const sender = isAI ? { name: AI_ASSISTANT_NAME, avatar: AI_ASSISTANT_AVATAR } : getUserById(message.senderId);
  const time = message.timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const hasReactions = Object.keys(reactionGroups).length > 0;

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <img
            src={message.content}
            alt="Shared image"
            className="max-w-[220px] max-h-[280px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        );
      case 'sticker':
        return (
          <span className="sticker text-7xl select-none block py-1">
            {message.content}
          </span>
        );
      case 'file': {
        const [fileName, fileUrl] = message.content.split('|');
        return (
          <div className="flex items-center gap-3 py-2 px-1">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-white/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{fileName}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Document</p>
            </div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-white/40 hover:text-white/70 transition-colors"
              aria-label={`Download ${fileName}`}
              title={`Download ${fileName}`}
            >
              <Download size={18} />
            </a>
          </div>
        );
      }
      case 'voice':
        return (
          <div className="flex items-center gap-3 py-2 px-1">
            <audio
              ref={audioRef}
              src={message.content}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              title={isPlaying ? 'Pause audio' : 'Play audio'}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-white/30 transition-colors"
            >
              {isPlaying ? <Pause size={14} className="text-white fill-white" /> : <Play size={14} className="text-white fill-white ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="flex items-end gap-0.5 h-6">
                {Array.from({ length: 20 }).map((_, i) => {
                  const barProgress = (i / 20) * duration;
                  const isActive = isPlaying && currentTime > barProgress;
                  return (
                    <div
                      key={i}
                      className={cn('w-1 rounded-full transition-all', isActive ? 'bg-white' : 'bg-white/40')}
                      style={{ height: `${4 + (i % 4)}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-white/60 mt-0.5 block font-mono">
                {formatTime(isPlaying ? currentTime : duration)}
              </span>
            </div>
          </div>
        );
      default:
        return (
          <p
            className="text-[14px] leading-relaxed whitespace-pre-wrap break-words max-w-[240px]"
            style={{ color: isOwn ? '#002800' : '#ffffff' }}
          >
            {message.content}
          </p>
        );
    }
  };
  

  if (message.type === 'sticker') {
    return (
      <div className={cn('flex mb-2', isOwn ? 'justify-end' : 'justify-start')}>
        {!isOwn && (
          <div className="w-10 flex-shrink-0 flex items-end mr-1">
            {showAvatar && (
              <img src={sender?.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            )}
          </div>
        )}
        <div className="flex flex-col">
          {!isOwn && showSenderName && isGroup && (
            <span className="text-[11px] font-medium text-white/50 mb-1 ml-1">{sender?.name}</span>
          )}
          <button onContextMenu={e => { e.preventDefault(); onLongPress?.(); }} aria-label="Message options" title="Message options">
            {renderContent()}
          </button>
          {hasReactions && (
            <div className={cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
              {Object.entries(reactionGroups).map(([emoji, count]) => (
                <span key={emoji} className="text-xs bg-white/10 border border-white/10 rounded-full px-2 py-0.5">
                  {emoji} {count > 1 && count}
                </span>
              ))}
            </div>
          )}
          <span className={cn('text-[10px] text-white/30 mt-0.5', isOwn ? 'text-right' : 'text-left')}>
            {time}
          </span>
        </div>
        {isOwn && <div className="w-10 flex-shrink-0" />}
      </div>
    );
  }

  return (
    <div className={cn('flex mb-1.5 items-end gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar slot */}
      {!isOwn && (
        <div className="flex-shrink-0 w-8">
          {showAvatar && (
            <img src={sender?.avatar} alt={sender?.name} className="w-8 h-8 rounded-full object-cover" />
          )}
        </div>
      )}
      {isOwn && <div className="w-8 flex-shrink-0" />}

      {/* Bubble */}
      <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && showSenderName && isGroup && (
          <span className="text-[11px] font-semibold text-white/50 mb-1">{sender?.name}</span>
        )}

        <button
          className={cn(
            'px-4 py-2.5 text-left',
            message.type === 'image' ? 'p-1 bg-transparent shadow-none' : '',
            isOwn ? 'chat-bubble-sent' : 'chat-bubble-received',
          )}
          onContextMenu={e => { e.preventDefault(); onLongPress?.(); }}
          aria-label="Message options"
          title="Message options"
        >
          {renderContent()}
        </button>

        {/* Reactions */}
        {hasReactions && (
          <div className={cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <span
                key={emoji}
                className="text-xs bg-white/10 border border-white/10 rounded-full px-2 py-0.5 cursor-pointer hover:bg-white/15 transition-colors"
              >
                {emoji}{count > 1 ? ` ${count}` : ''}
              </span>
            ))}
          </div>
        )}

        {/* Time + Read */}
        <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-white/30">{time}</span>
          {isOwn && (
            message.read
              ? <CheckCheck size={12} className="text-cyan-300" />
              : <Check size={12} className="text-white/30" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
