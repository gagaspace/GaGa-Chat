import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, Eye, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Story, User as AppUser } from '@/types';

interface StoryCircleProps {
  onViewStory?: (userId: string) => void;
  onAddStory?: () => void;
}

const StoryCircle = () => {
  const { user, fetchAllUsers } = useAuth();
  const [usersWithStories, setUsersWithStories] = useState<AppUser[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryUser, setActiveStoryUser] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStories = useCallback(async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('*, profiles(*)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stories:', error);
      return;
    }

    interface StoryRow {
      id: string;
      user_id: string;
      media_url: string;
      media_type: string;
      created_at: string;
      viewers?: string[];
      expires_at: string;
    }

    const formattedStories: Story[] = data.map((s: StoryRow) => ({
      id: s.id,
      userId: s.user_id,
      mediaUrl: s.media_url,
      mediaType: s.media_type as 'image' | 'video',
      timestamp: new Date(s.created_at),
      viewers: s.viewers || [],
      expiresAt: new Date(s.expires_at),
    }));

    setStories(formattedStories);

    // Get unique user IDs who have stories
    const userIds = Array.from(new Set(formattedStories.map(s => s.userId)));
    const allUsers = await fetchAllUsers();
    const storyUsers = allUsers.filter(u => userIds.includes(u.id) && u.id !== user?.id);
    setUsersWithStories(storyUsers);
  }, [fetchAllUsers, user]);

  useEffect(() => {
    fetchStories();

    const channel = supabase
      .channel('public:stories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => fetchStories())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStories]);

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const url = await uploadFile('stories', file);
      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: url,
        media_type: file.type.startsWith('video') ? 'video' : 'image',
      });

      if (error) throw error;
      toast.success('Story added!');
      fetchStories();
    } catch (err) {
      console.error('Story upload failed:', err);
      toast.error('Failed to add story');
    } finally {
      setIsUploading(false);
    }
  };

  const userHasStory = stories.some(s => s.userId === user?.id);

  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide bg-slate-950/90 border-b border-slate-800/70 shadow-sm">
      {/* My Story */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div
          className={cn(
            "relative cursor-pointer transition-transform active:scale-95",
            userHasStory && "story-ring"
          )}
          onClick={() => userHasStory ? setActiveStoryUser(user?.id || null) : fileInputRef.current?.click()}
        >
          <img
            src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'me'}`}
            alt="My Story"
            className={cn(
              "w-14 h-14 rounded-full object-cover border-2",
              userHasStory ? "border-black" : "border-white/20"
            )}
          />
          {!userHasStory && (
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center border-2 border-slate-950">
              {isUploading ? (
                <Loader2 size={10} className="text-white animate-spin" />
              ) : (
                <Plus size={12} className="text-white" strokeWidth={3} />
              )}
            </div>
          )}
          <label
            className="sr-only"
            htmlFor="story-file-input"
            title="Add a new story"
          >
            Add a new story
          </label>
          <input
            id="story-file-input"
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            onChange={handleAddStory}
          />
        </div>
        <span className="text-[10px] text-white/50 font-medium truncate w-14 text-center">My Story</span>
      </div>

      {/* Friends' Stories */}
      {usersWithStories.map(u => (
        <div
          key={u.id}
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer transition-transform active:scale-95"
          onClick={() => setActiveStoryUser(u.id)}
        >
          <div className="story-ring">
            <img
              src={u.avatar}
              alt={u.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-slate-950"
            />
          </div>
          <span className="text-[10px] text-white/50 font-medium truncate w-14 text-center">
            {u.name.split(' ')[0]}
          </span>
        </div>
      ))}

      {/* Story Viewer Overlay */}
      {activeStoryUser && (
        <StoryViewer
          userId={activeStoryUser}
          stories={stories.filter(s => s.userId === activeStoryUser)}
          onClose={() => setActiveStoryUser(null)}
        />
      )}
    </div>
  );
};

const StoryViewer = ({ userId, stories, onClose }: { userId: string, stories: Story[], onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyToText] = useState('');
  const currentStory = stories[currentIndex];
  const { fetchAllUsers, user: currentUser } = useAuth();
  const [author, setAuthor] = useState<AppUser | null>(null);
  const [viewers, setViewers] = useState<AppUser[]>([]);

  const isMyStory = userId === currentUser?.id;

  useEffect(() => {
    const currentStoryViewers = currentStory.viewers || [];
    fetchAllUsers().then(users => {
      const found = users.find(u => u.id === userId);
      if (found) setAuthor(found as AppUser);

      if (currentStoryViewers.length > 0) {
        setViewers(users.filter(u => currentStoryViewers.includes(u.id)) as AppUser[]);
      }
    });
  }, [userId, currentStory.viewers, fetchAllUsers]);

  // Mark as seen
  useEffect(() => {
    const markAsSeen = async () => {
      if (!currentUser || isMyStory || currentStory.viewers?.includes(currentUser.id)) return;

      const newViewers = [...(currentStory.viewers || []), currentUser.id];
      await supabase
        .from('stories')
        .update({ viewers: newViewers })
        .eq('id', currentStory.id);
    };
    markAsSeen();
  }, [currentStory.id, currentStory.viewers, currentUser, isMyStory]);

  useEffect(() => {
    if (showViewers) return; // Pause when viewing list
    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(prevIdx => prevIdx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, stories.length, onClose, showViewers]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in">
      {/* Progress Bars */}
      <div className="absolute top-12 left-0 right-0 flex gap-1 px-2 z-10">
        {stories.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-50 linear"
              style={{ width: i === currentIndex ? `${progress}%` : i < currentIndex ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-16 left-0 right-0 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img src={author?.avatar} alt="" className="w-10 h-10 rounded-full border border-white/20" />
          <div>
            <p className="text-white font-bold text-sm">{author?.name}</p>
            <p className="text-white/50 text-xs">
              {new Date(currentStory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-white/70 hover:text-white" aria-label="Close story viewer" title="Close">
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative group">
        {currentStory.mediaType === 'video' ? (
          <video
            src={currentStory.mediaUrl}
            autoPlay
            muted
            className="max-h-full w-full object-contain"
            onEnded={handleNext}
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt=""
            className="max-h-full w-full object-contain"
          />
        )}

        {/* Navigation Areas */}
        {!showViewers && (
          <div className="absolute inset-0 flex">
            <div className="flex-1 cursor-pointer" onClick={handlePrev} />
            <div className="flex-1 cursor-pointer" onClick={handleNext} />
          </div>
        )}

        {/* Controls */}
        <button
          onClick={handlePrev}
          aria-label="Previous story"
          title="Previous story"
          className={cn(
            "absolute left-4 p-2 bg-black/20 rounded-full text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100",
            currentIndex === 0 && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft size={32} />
        </button>
        <button
          onClick={handleNext}
          aria-label="Next story"
          title="Next story"
          className="absolute right-4 p-2 bg-black/20 rounded-full text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
        >
          <ChevronRight size={32} />
        </button>

        {/* Bottom Actions */}
        <div className="absolute bottom-8 left-0 right-0 px-6 flex items-center gap-4">
          {isMyStory ? (
            <button
              onClick={() => setShowViewers(true)}
              aria-label="View viewers"
              title="View viewers"
              className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/70 text-cyan-200 hover:text-white transition-colors"
            >
              <Eye size={18} />
              <span className="text-sm font-bold">{viewers.length}</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-3">
              <input
                value={replyText}
                onChange={e => setReplyToText(e.target.value)}
                placeholder="Send a reply..."
                className="flex-1 bg-slate-900/70 backdrop-blur-md border border-slate-700/70 rounded-full px-5 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-cyan-400 transition-colors"
                onClick={e => e.stopPropagation()}
              />
              <button
                onClick={() => {
                  if (replyText.trim()) {
                    toast.success('Reply sent!');
                    setReplyToText('');
                  }
                }}
                aria-label="Send reply"
                title="Send reply"
                className="w-11 h-11 gchat-btn rounded-full flex items-center justify-center flex-shrink-0"
              >
                <Heart size={20} className="text-black" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Viewers List Drawer */}
      {showViewers && (
        <div className="absolute inset-x-0 bottom-0 z-50 bg-slate-950 rounded-t-3xl border-t border-slate-800/70 animate-slide-in max-h-[60vh] flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
            <h4 className="text-white font-bold">Viewers ({viewers.length})</h4>
            <button onClick={() => setShowViewers(false)} className="p-1 text-white/50 hover:text-white" aria-label="Close viewers list" title="Close">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {viewers.map(v => (
              <div key={v.id} className="flex items-center gap-3">
                <img src={v.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{v.name}</p>
                  <p className="text-[11px] text-white/40">Just now</p>
                </div>
                <MessageCircle size={18} className="text-white/20" />
              </div>
            ))}
            {viewers.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-white/20">
                <Eye size={40} className="mb-3 opacity-20" />
                <p className="text-sm">No viewers yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryCircle;
