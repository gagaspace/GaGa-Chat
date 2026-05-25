import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import {
  X, Heart, MessageCircle, Share2, Globe, Lock, Users2, MoreHorizontal, Send, Camera, Image, Loader2,
  Plus, ChevronUp
} from 'lucide-react';
import TimelinePostCard from '@/components/features/TimelinePostCard';
import { cacheProfile } from '@/constants/mockData';
import type { TimelinePost, User } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { uploadFile } from '@/lib/storage';
import logoSrc from '@/assets/logo.jpg';

type Visibility = 'public' | 'friends' | 'private';

const VisibilityOptions: { value: Visibility; label: string; icon: ReactNode }[] = [
  { value: 'public', label: 'Public', icon: <Globe size={14} /> },
  { value: 'friends', label: 'Friends only', icon: <Users2 size={14} /> },
  { value: 'private', label: 'Only me', icon: <Lock size={14} /> },
];

const TimelinePage = () => {
  const { user, fetchAllUsers } = useAuth();
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const currentProfile = {
    avatar: user?.id ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}` : 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
    name: user?.user_metadata?.full_name || user?.user_metadata?.display_name || 'You',
    statusMessage: 'Available',
  };
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine'>('all');
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(*), post_likes(*), post_comments(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      interface PostRow {
        id: string;
        user_id: string;
        content: string;
        images?: string[];
        post_likes: { user_id: string }[];
        post_comments: { id: string; user_id: string; content: string; created_at: string }[];
        created_at: string;
        visibility: Visibility;
        profiles?: { id: string; name: string; avatar_url: string; status?: string; status_message?: string };
      }

// Cache profiles
      data.forEach((p: PostRow) => {
        if (p.profiles) {
          const rawStatus = p.profiles.status;
          const status =
            rawStatus === 'online' || rawStatus === 'offline' || rawStatus === 'busy'
              ? rawStatus
              : 'offline';

          cacheProfile({
            id: p.profiles.id,
            name: p.profiles.name,
            avatar: p.profiles.avatar_url,
            status,
            statusMessage: p.profiles.status_message,
          });
        }
      });

      const formattedPosts: TimelinePost[] = data.map((p: PostRow) => ({
        id: p.id,
        userId: p.user_id,
        content: p.content,
        images: p.images,
        likes: p.post_likes.map(l => l.user_id),
        comments: p.post_comments.map(c => ({
          id: c.id,
          userId: c.user_id,
          content: c.content,
          timestamp: new Date(c.created_at),
          likes: [],
        })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        timestamp: new Date(p.created_at),
        visibility: p.visibility,
      }));
      setPosts(formattedPosts);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchPosts();
    const allUsers = await fetchAllUsers();
    setProfiles(allUsers);
    if (user) {
      const me = allUsers.find(u => u.id === user.id);
      setMyProfile(me);
    }
    setLoading(false);
  }, [fetchAllUsers, fetchPosts, user]);

  const fetchPostsThrottledRef = useRef<number | null>(null);
  const fetchPostsQueuedRef = useRef(false);

  const scheduleFetchPosts = useCallback(() => {
    if (!user) return;
    if (fetchPostsThrottledRef.current) {
      fetchPostsQueuedRef.current = true;
      return;
    }

    fetchPostsQueuedRef.current = false;
    fetchPostsThrottledRef.current = window.setTimeout(async () => {
      fetchPostsThrottledRef.current = null;
      try {
        await fetchPosts();
      } finally {
        if (fetchPostsQueuedRef.current) scheduleFetchPosts();
      }
    }, 400);
  }, [fetchPosts, user]);

  useEffect(() => {
    let isMounted = true;
    loadData().catch(() => undefined);

    const safeHandleScroll = () => {
      if (!isMounted) return;
      if (scrollContainerRef.current) {
        setShowScrollTop(scrollContainerRef.current.scrollTop > 400);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', safeHandleScroll);
    }

    // Subscribe to timeline changes
    const channel = supabase
      .channel('public:timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => scheduleFetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => scheduleFetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => scheduleFetchPosts())
      .subscribe();

    return () => {
      isMounted = false;
      if (container) {
        container.removeEventListener('scroll', safeHandleScroll);
      }
      supabase.removeChannel(channel);
      if (fetchPostsThrottledRef.current) {
        window.clearTimeout(fetchPostsThrottledRef.current);
        fetchPostsThrottledRef.current = null;
      }
      fetchPostsQueuedRef.current = false;
    };
  }, [loadData, scheduleFetchPosts]);




  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    const isLiked = posts.find(p => p.id === postId)?.likes.includes(user.id);

    if (isLiked) {
      await supabase.from('post_likes').delete().match({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
    fetchPosts();
  };

  const handleComment = async (postId: string, content: string) => {
    if (!user) return;
    await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content,
    });
    fetchPosts();
  };

  const handleNewPost = async () => {
    if (!newContent.trim() && selectedFiles.length === 0) return;
    if (!user) return;

    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of selectedFiles) {
        try {
          const url = await uploadFile('posts', file);
          imageUrls.push(url);
        } catch (err) {
          console.error('Upload failed:', err);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newContent.trim(),
        images: imageUrls,
        visibility,
      });

      if (error) throw error;

      setNewContent('');
      setSelectedFiles([]);
      setShowNewPost(false);
      toast.success('Post shared!');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to post');
    } finally {
      setUploading(false);
    }
  };

  const visiblePosts = posts.filter(p =>
    activeFilter === 'mine' ? p.userId === user?.id : true
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-subtle-green h-full">
        <Loader2 className="w-8 h-8 text-green-400/30 animate-spin" />
      </div>
    );
  }

  return (
<div className="flex flex-col h-full bg-[#0b0b0b]">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between gchat-header border-b border-green-200/30">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="GaGa Chat" className="w-10 h-10 rounded-full gchat-logo-glow object-cover" />
          <h1 className="text-white text-xl font-bold">Timeline</h1>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          aria-label="Create new post"
          title="Create new post"
          className="p-2 text-green-700/60 hover:text-green-700 transition-colors"
        >
          <Camera size={22} />
        </button>
      </div>

      {/* Profile Banner */}
<div className="bg-[#0f0f0f] border-b border-green-200/30">
        {/* Cover */}
        <div className="h-24 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 opacity-60"
          />
            <div
              className="absolute inset-0 opacity-20 bg-cover bg-center timeline-profile-cover"
              style={{ backgroundImage: `url(${myProfile?.avatar || currentProfile.avatar})` }}
            />
        </div>

        {/* Avatar + Post button */}
        <div className="px-4 pb-3">
          <div className="flex items-end justify-between -mt-8">
            <div className="story-ring">
              <img
                src={myProfile?.avatar || currentProfile.avatar}
                alt="Me"
                className="w-16 h-16 rounded-full border-3 border-black shadow-lg object-cover"
              />
            </div>
            <button
              onClick={() => setShowNewPost(true)}
              className="mb-1 flex items-center gap-2 gchat-btn text-xs font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              Post
            </button>
          </div>
          <div className="mt-2">
            <p className="font-bold text-white">{myProfile?.name || 'Loading...'}</p>
            <p className="text-sm text-green-700/40 italic">{myProfile?.statusMessage || 'Available'}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex border-t border-green-200/30">
          {[
            { label: 'Posts', value: posts.filter(p => p.userId === user?.id).length },
            { label: 'Friends', value: profiles.length - 1 },
            { label: 'Likes', value: posts.reduce((sum, p) => sum + (p.userId === user?.id ? p.likes.length : 0), 0) },
          ].map(stat => (
            <div
              key={stat.label}
              className="flex-1 flex flex-col items-center py-2.5 border-r border-green-200/30 last:border-0 cursor-pointer hover:bg-green-300/10 transition-colors"
            >
              <span className="text-base font-bold text-white">{stat.value >= 0 ? stat.value : 0}</span>
              <span className="text-xs text-green-700/40">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
<div className="flex px-5 py-2 gap-1 border-b border-green-200/30 bg-[#0b0b0b]">
        {[
          { id: 'all', label: 'All posts' },
          { id: 'mine', label: 'My posts' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as 'all' | 'mine')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              activeFilter === f.id ? 'bg-green-300/20 text-green-700' : 'text-green-700/40 hover:text-green-700/60'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts */}
<div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide bg-[#0b0b0b] relative">
        {visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-green-400/30">
            <Camera size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No posts yet</p>
            <p className="text-sm mt-1">Share your first moment!</p>
            <button
              onClick={() => setShowNewPost(true)}
              className="mt-4 gchat-btn px-6 py-2.5 rounded-full text-sm font-semibold"
            >
              Create Post
            </button>
          </div>
        ) : (
          <div className="pb-20">
            {visiblePosts.map(post => (
              <TimelinePostCard
                key={post.id}
                post={post}
                onLike={() => handleLike(post.id)}
                onComment={(content) => handleComment(post.id, content)}
              />
            ))}
          </div>
        )}
        <div className="h-6" />

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 w-12 h-12 bg-cyan-400 rounded-full flex items-center justify-center text-black shadow-lg shadow-cyan-400/20 animate-bounce active:scale-95 transition-transform z-50"
          >
            <ChevronUp size={24} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div
          className="fixed inset-0 z-50 bg-black/70 animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setShowNewPost(false); }}
        >
          <div className="bg-[#111] h-full flex flex-col animate-slide-in">
<div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <button
                onClick={() => setShowNewPost(false)}
                aria-label="Close new post modal"
                title="Close new post modal"
                type="button"
              >
                <X size={22} className="text-white/60" />
              </button>
              <h3 className="font-bold text-white">New Post</h3>
              <button
                onClick={handleNewPost}
                disabled={(!newContent.trim() && selectedFiles.length === 0) || uploading}
                className={cn(
                  "text-sm font-semibold transition-colors flex items-center gap-2",
                  (newContent.trim() || selectedFiles.length > 0) && !uploading
                    ? "text-green-600"
                    : "text-green-300/20 disabled:text-green-300/20"
                )}
              >
                {uploading && <Loader2 size={14} className="animate-spin" />}
                Share
              </button>
            </div>

<div className="flex items-start gap-3 px-4 py-4">
                <img src={myProfile?.avatar || currentProfile.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1">
                <p className="font-semibold text-sm text-white mb-1">{myProfile?.name || currentProfile.name}</p>

                <label
                  htmlFor="timeline-new-post-content"
                  className="sr-only"
                >
                  Post content
                </label>
                <textarea
                  id="timeline-new-post-content"
                  autoFocus
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full text-sm text-white outline-none resize-none min-h-[140px] placeholder-white/30 bg-transparent leading-relaxed"
                />

                {/* Image Previews */}
                {selectedFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {selectedFiles.map((file, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-green-300/20">
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
<button
                          onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                          aria-label="Remove selected image"
                          title="Remove selected image"
                          type="button"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {selectedFiles.length < 9 && (
                      <label className="aspect-square rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                        <Plus size={20} className="text-white/40" />
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const files = Array.from(e.target.files || []);
                            setSelectedFiles(prev => [...prev, ...files].slice(0, 9));
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Attachment options */}
            <div className="border-t border-white/10 px-4 py-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors cursor-pointer">
                  <Image size={20} className="text-cyan-300" /> Photo
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setSelectedFiles(prev => [...prev, ...files].slice(0, 9));
                    }}
                  />
                </label>
                <button
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={20} className="text-blue-400" /> Camera
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setSelectedFiles(prev => [...prev, ...files].slice(0, 9));
                  }}
                />
              </div>
            </div>

            {/* Visibility */}
            <div className="px-4 py-3 border-t border-white/10">
              <p className="text-xs text-white/30 mb-2 font-medium">POST VISIBILITY</p>
              <div className="flex gap-2">
                {VisibilityOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setVisibility(opt.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      visibility === opt.value
                        ? 'gchat-btn'
                        : 'bg-white/10 text-white/60 hover:bg-white/15'
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
