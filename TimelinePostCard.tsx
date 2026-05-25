import { useMemo, useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelinePost, User } from '@/types';
import { formatTime } from '@/constants/mockData';

const avatarFallback = (id: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;

import { useAuth } from '@/hooks/useAuth';

interface TimelinePostCardProps {
  post: TimelinePost;
  profiles?: Record<string, User>;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
}

const TimelinePostCard = ({ post, profiles, onLike, onComment }: TimelinePostCardProps) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [showAllImages, setShowAllImages] = useState(false);

  const author = useMemo(() => {
    return profiles?.[post.userId] ?? null;
  }, [profiles, post.userId]);

  const isLiked = user ? post.likes.includes(user.id) : false;

  const handleComment = () => {
    if (!commentInput.trim()) return;
    onComment(post.id, commentInput.trim());
    setCommentInput('');
  };

  const myAvatar = user
    ? avatarFallback(user.id)
    : 'https://api.dicebear.com/7.x/avataaars/svg?seed=me';

  return (
    <div className="bg-slate-950/95 border-b border-slate-800/70 rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="story-ring">
                <img
                  src={author?.avatar || avatarFallback(post.userId)}
                  alt={author?.name || 'Author'}
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-950"
                />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[14px] text-white">{author?.name}</p>
          <p className="text-[11px] text-white/40">{formatTime(post.timestamp)}</p>
        </div>
        <button className="p-1 text-white/30 hover:text-white/60 transition-colors" aria-label="Post options" title="Post options">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-[14px] text-white/90 leading-relaxed">{post.content}</p>
      )}

      {/* Images */}
      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className={cn('px-4 pb-3', post.images.length > 1 ? 'grid grid-cols-2 gap-1' : '')}>
          {post.images.slice(0, showAllImages ? post.images.length : 2).map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              className={cn(
                'w-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity',
                post.images!.length === 1 ? 'max-h-72' : 'h-40'
              )}
            />
          ))}
          {!showAllImages && post.images.length > 2 && (
            <div className="relative h-40 rounded-xl overflow-hidden cursor-pointer" onClick={() => setShowAllImages(true)}>
              <img src={post.images[2]} alt="" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{post.images.length - 2}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
        <div className="flex items-center gap-1 text-xs text-white/30">
          {post.likes.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="bg-cyan-400 text-slate-950 rounded-full w-4 h-4 flex items-center justify-center text-[9px]">♥</span>
              {post.likes.length}
            </span>
          )}
        </div>
        <button onClick={() => setShowComments(!showComments)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
          {post.comments.length > 0 ? `${post.comments.length} comments` : ''}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center border-t border-white/10">
        <button
          onClick={() => onLike(post.id)}
          className={cn(
            'flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium transition-colors',
            isLiked ? 'text-cyan-400' : 'text-white/40 hover:text-cyan-400'
          )}
        >
          <Heart size={17} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-cyan-400' : 'text-white/40 group-hover:text-cyan-400'} />
          Like
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-white/40 hover:text-cyan-300 transition-colors"
        >
          <MessageCircle size={17} />
          Comment
        </button>
        <button
          onClick={async () => {
            try {
              const url = `${window.location.origin}/timeline`;
              await navigator.clipboard?.writeText(url);
              // soft no-op toast avoidance here; parent handles toasts
            } catch {
              // ignore
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-white/40 hover:text-cyan-300 transition-colors"
          aria-label="Share"
          title="Share"
        >
          <Share2 size={17} />
          Share
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-white/10 animate-fade-in">
          {post.comments.map(comment => {
            const commentAuthor = profiles?.[comment.userId] ?? null;
            return (
              <div key={comment.id} className="flex gap-3 px-4 py-2.5">
                <img src={commentAuthor?.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
                <div className="flex-1 bg-slate-900/70 rounded-xl px-3 py-2 border border-slate-700/60">
                  <p className="text-[12px] font-semibold text-white/80">{commentAuthor?.name}</p>
                  <p className="text-[13px] text-white/70 mt-0.5">{comment.content}</p>
                </div>
              </div>
            );
          })}

          {/* Add Comment */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
            <img src={myAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 flex items-center bg-white/10 rounded-full px-3 py-2 gap-2 border border-white/10">
              <input
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent text-[13px] outline-none text-white placeholder-white/30"
              />
              <button onClick={handleComment} disabled={!commentInput.trim()} className="text-cyan-300 disabled:text-white/20 transition-colors" aria-label="Send comment" title="Send comment">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinePostCard;
