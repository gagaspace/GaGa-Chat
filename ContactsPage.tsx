import { useState, useEffect } from 'react';
import { Search, X, Star, UserPlus, MessageCircle, Phone, ChevronRight, Users, QrCode, Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import QRScannerPage from '@/pages/QRScannerPage';
import CallModal from '@/components/features/CallModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import logoSrc from '@/assets/logo.jpg';

interface ContactsPageProps {
  onStartChat: (userId: string) => void;
}

type SubView = null | 'addFriends' | 'qrScanner';

// ──────────────────────────────────────────────
// Add Friends Sub-page
// ──────────────────────────────────────────────
const AddFriendsPage = ({
  onBack,
  onShowQR,
  currentUser,
}: {
  onBack: () => void;
  onShowQR: () => void;
  currentUser: User | null;
}) => {
  const navigate = useNavigate();
  return (
  <div className="flex flex-col h-full bg-black">
    {/* Header */}
    <div className="px-4 pt-12 pb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" title="Back" className="text-white p-1">
          <ChevronRight size={22} className="rotate-180" />
        </button>
        <h1 className="text-white text-xl font-bold">Add friends</h1>
      </div>
      <button aria-label="Search" title="Search" className="p-2 text-white/50 hover:text-white transition-colors" onClick={onShowQR}>
        <Search size={20} />
      </button>
    </div>

    {/* Top Actions */}
    <div className="flex justify-around px-6 py-4 border-b border-white/10">
      {[
        {
          icon: <Plus size={26} className="text-white" />,
          label: 'Invite',
          action: async () => {
            const inviteUrl = `https://gaga-chats.firebaseapp.com/invite?id=${currentUser?.id.slice(0, 8)}`;
            if (navigator.share) {
              try {
                await navigator.share({
                  title: 'Join me on GaGa Chat!',
                  text: 'Hey! I am using GaGa Chat for secure and fast messaging. Join me here:',
                  url: inviteUrl,
                });
              } catch (error) {
                // User cancelled share or other non-critical error
              }
            } else {
              navigator.clipboard.writeText(inviteUrl);
              toast.success('Invite link copied to clipboard!');
            }
          }
        },
        { icon: <QrCode size={26} className="text-white" />, label: 'My QR code', action: onShowQR },
        { icon: <Search size={26} className="text-white" />, label: 'Search', action: onShowQR },
      ].map(item => (
        <button
          key={item.label}
          onClick={item.action}
          className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
          aria-label={item.label}
        >
          {item.icon}
          <span className="text-white/60 text-[13px]">{item.label}</span>
        </button>
      ))}
    </div>

    {/* Quick Actions */}
    <div className="divide-y divide-white/10">
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
        onClick={() => navigate('/more')}
        aria-label="Go to More settings"
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 gchat-btn">
          <UserPlus size={22} className="text-black" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white text-[15px] font-medium">Auto-add friends</p>
          <p className="text-white/40 text-[13px] mt-0.5">Manage friend settings under More.</p>
        </div>
        <span className="text-[13px] font-semibold text-white border border-white/30 px-4 py-1.5 rounded-full">
          Open
        </span>
      </button>

      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
        onClick={() => navigate('/chats')}
        aria-label="Create a group chat"
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 gchat-btn">
          <Users size={22} className="text-black" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white text-[15px] font-medium">Create a group</p>
          <p className="text-white/40 text-[13px] mt-0.5">Gather your friends in a group chat.</p>
        </div>
      </button>
    </div>

    {/* CTA */}
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
      <h3 className="text-white text-[18px] font-bold">Try inviting a friend today!</h3>
      <p className="text-white/40 text-[14px]">Invite your friends via email or text message.</p>
      <button
        onClick={async () => {
          const inviteUrl = `https://gaga-chats.firebaseapp.com/invite?id=${currentUser?.id.slice(0, 8)}`;
          if (navigator.share) {
            try {
              await navigator.share({
                title: 'Join me on GaGa Chat!',
                text: 'Join me on GaGa Chat and start messaging securely.',
                url: inviteUrl,
              });
            } catch (error) {
              // ignore cancel
            }
          } else {
            await navigator.clipboard.writeText(inviteUrl);
            toast.success('Invite link copied to clipboard!');
          }
        }}
        className="border border-white/30 text-white font-semibold px-8 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Invite a friend"
      >
        Invite a friend
      </button>
    </div>
  </div>
  );
};

// ──────────────────────────────────────────────
// User Row
// ──────────────────────────────────────────────
const UserRow = ({
  user, statusColors, onClick, onChat,
}: {
  user: User;
  statusColors: Record<string, string>;
  onClick: () => void;
  onChat: () => void;
}) => (
  <div
    className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
    onClick={onClick}
  >
    <div className="relative flex-shrink-0">
      <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
      <div className={cn('absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black', statusColors[user.status])} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <p className="font-medium text-[15px] text-white truncate">{user.name}</p>
        {user.isFavorite && <span className="text-amber-400 text-xs">⭐</span>}
      </div>
      <p className="text-[13px] text-white/40 truncate">{user.statusMessage}</p>
    </div>
    <button
      onClick={e => { e.stopPropagation(); onChat(); }}
      aria-label={`Message ${user.name}`}
      title={`Message ${user.name}`}
      className="p-2 text-white/30 hover:text-white/60 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
    >
      <MessageCircle size={18} />
    </button>
  </div>
);

// ──────────────────────────────────────────────
// Main ContactsPage
// ──────────────────────────────────────────────
const ContactsPage = ({ onStartChat }: ContactsPageProps) => {
  const navigate = useNavigate();
  const { fetchAllUsers, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<{ user: User; type: 'voice' | 'video' } | null>(null);

  const currentProfile = {
    avatar: currentUser?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || 'me'}`,
    name: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'You',
    statusMessage: 'Available',
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'online'>('all');
  const [subView, setSubView] = useState<SubView>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      const allUsers = await fetchAllUsers();
      setUsers((allUsers as User[]).filter(u => u.id !== currentUser?.id));
      setLoading(false);
    };
    loadUsers();

    // Subscribe to profile changes
    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllUsers, currentUser]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black h-full">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  if (subView === 'qrScanner') {
    return (
      <QRScannerPage
        onBack={() => setSubView('addFriends')}
        onAddFriend={(userId) => { onStartChat(userId); setSubView(null); }}
      />
    );
  }

  if (subView === 'addFriends') {
    return (
      <AddFriendsPage
        onBack={() => setSubView(null)}
        onShowQR={() => setSubView('qrScanner')}
        currentUser={currentUser}
      />
    );
  }

  const filtered = users.filter(u => {
    const matchesSearch = !searchQuery
      || u.name.toLowerCase().includes(searchQuery.toLowerCase())
      || u.statusMessage.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'favorites') return matchesSearch && u.isFavorite;
    if (activeFilter === 'online') return matchesSearch && u.status === 'online';
    return matchesSearch;
  });

  const favorites = filtered.filter(u => u.isFavorite);
  const others = filtered.filter(u => !u.isFavorite);

  const groupedByLetter: Record<string, User[]> = {};
  others.forEach(user => {
    const letter = user.name[0].toUpperCase();
    if (!groupedByLetter[letter]) groupedByLetter[letter] = [];
    groupedByLetter[letter].push(user);
  });

  const shareInvite = async () => {
    const inviteUrl = `https://gaga-chats.firebaseapp.com/invite?id=${currentUser?.id?.slice(0, 8) || 'guest'}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on GaGa Chat!',
          text: 'Hey! I am using GaGa Chat for secure and fast messaging. Join me here:',
          url: inviteUrl,
        });
      } catch (error) {
        // ignore cancelled share
      }
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard!');
    }
  };

  const statusColors: Record<string, string> = {
    online: 'bg-cyan-400',
    busy: 'bg-amber-400',
    offline: 'bg-gray-500',
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="GaGa Chat" className="w-10 h-10 rounded-full gchat-logo-glow object-cover" />
          <h1 className="text-white text-xl font-bold">Contacts</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label={showSearch ? 'Hide search' : 'Show search'}
            className={cn("p-2 transition-colors", showSearch ? "text-cyan-300" : "text-white/60 hover:text-white")}
            onClick={() => setShowSearch(s => !s)}
          >
            <Search size={20} />
          </button>
          <button
            aria-label="Add friend"
            className="p-2 text-white/60 hover:text-white transition-colors"
            onClick={() => setSubView('addFriends')}
          >
            <UserPlus size={22} />
          </button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="px-4 pb-3 animate-slide-in">
          <div className="flex items-center bg-white/10 rounded-xl px-3 py-2.5 gap-2">
            <Search size={15} className="text-white/40 flex-shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
            />
            {searchQuery && (
              <button aria-label="Clear search" onClick={() => setSearchQuery('')}>
                <X size={14} className="text-white/40" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex px-5 gap-1 pb-2">
        {([
          { id: 'all', label: 'All' },
          { id: 'favorites', label: '⭐ Favorites' },
          { id: 'online', label: '🟢 Online' },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              activeFilter === f.id
                ? 'bg-white/15 text-white'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* My Profile */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
        <div className="relative">
          <img src={currentProfile.avatar} alt="Me" className="w-12 h-12 rounded-full object-cover" />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-cyan-400 rounded-full border-2 border-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-[15px]">
            {currentProfile.name}{' '}
            <span className="text-white/40 font-normal text-[13px]">(You)</span>
          </p>
          <p className="text-[13px] text-white/40 truncate italic">{currentProfile.statusMessage}</p>
        </div>
        <button
          aria-label="Open More settings"
          className="text-white/30 hover:text-white/60 transition-colors"
          onClick={() => navigate('/more')}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Search size={24} className="text-white/20" />
            </div>
            <p className="text-white/60 font-medium">No contacts found</p>
            <p className="text-white/30 text-sm mt-1">
              Try searching for something else or add new friends.
            </p>
          </div>
        ) : (
          <>
            {/* Favorites */}
            {favorites.length > 0 && (
              <div className="mb-4">
                <div className="px-5 py-2 flex items-center gap-2">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Favorites</span>
                </div>
                {favorites.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    statusColors={statusColors}
                    onClick={() => setSelectedUser(user)}
                    onChat={() => onStartChat(user.id)}
                  />
                ))}
              </div>
            )}

            {/* Alphabetical */}
            {Object.keys(groupedByLetter).sort().map(letter => (
              <div key={letter} className="mb-2">
                <div className="px-5 py-2 bg-white/5 sticky top-0 z-10">
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{letter}</span>
                </div>
                {groupedByLetter[letter].map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    statusColors={statusColors}
                    onClick={() => setSelectedUser(user)}
                    onChat={() => onStartChat(user.id)}
                  />
                ))}
              </div>
            ))}
          </>
        )}
        <div className="h-6" />
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setSelectedUser(null); }}
        >
          <div className="bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl w-full animate-slide-in pb-8">
            {/* Cover — gradient */}
            <div
              className="h-28 relative rounded-t-3xl overflow-hidden bg-gradient-to-br from-cyan-500 via-cyan-400 to-cyan-500"
            >
              <button
                aria-label="Close user details"
                onClick={() => setSelectedUser(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/30 rounded-full text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center -mt-10 relative z-10 mb-3">
              <div className="relative">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-20 h-20 rounded-full border-4 border-[#1a1a1a] shadow-lg object-cover"
                />
                <div className={cn(
                  'absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#1a1a1a]',
                  statusColors[selectedUser.status]
                )} />
              </div>
            </div>

            <div className="text-center px-6 pb-4">
              <h3 className="text-xl font-bold text-white">{selectedUser.name}</h3>
              {selectedUser.isFavorite && <span className="text-amber-400 text-sm">⭐ Favorite</span>}
              <p className="text-sm text-white/40 mt-1 italic">"{selectedUser.statusMessage}"</p>
              <span className={cn(
                'inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-medium capitalize',
                selectedUser.status === 'online' ? 'bg-emerald-500/15 text-emerald-400'
                  : selectedUser.status === 'busy' ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-white/10 text-white/40'
              )}>
                {selectedUser.status}
              </span>
            </div>

            <div className="flex gap-3 px-6">
              <button
                onClick={() => { onStartChat(selectedUser.id); setSelectedUser(null); }}
                className="flex-1 flex items-center justify-center gap-2 gchat-btn py-3 rounded-2xl hover:opacity-90 transition-opacity"
              >
                <MessageCircle size={18} />
                <span className="font-semibold">Chat</span>
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-semibold py-3 rounded-2xl hover:bg-white/15 transition-colors"
                onClick={() => {
                  setActiveCall({ user: selectedUser, type: 'voice' });
                  setSelectedUser(null);
                }}
              >
                <Phone size={18} />
                Call
              </button>
            </div>
          </div>
        </div>
      )}
      {activeCall && (
        <CallModal
          user={activeCall.user}
          type={activeCall.type}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </div>
  );
};

export default ContactsPage;
