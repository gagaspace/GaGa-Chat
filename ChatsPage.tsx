import { useState, useEffect } from 'react';
import { Search, Edit, X, Users, MessageCircle, Bot, Check, ShieldCheck, Lock } from 'lucide-react';
import ChatListItem from '@/components/features/ChatListItem';
import StoryCircle from '@/components/features/StoryCircle';
import type { User, Chat } from '@/types';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logo.jpg';
import { useChatStore } from '@/hooks/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ChatsPageProps {
  chats: Chat[];
  onChatSelect: (chat: Chat) => void;
  onPin: (chatId: string) => void;
  onMute: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onCreateGroup: (name: string, participants: string[]) => Promise<Chat>;
}

const ChatsPage = ({ chats, onChatSelect, onPin, onMute, onDelete, onCreateGroup }: ChatsPageProps) => {
  const { user, fetchAllUsers } = useAuth();
  const { createAIChat } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (showNewGroup) {
      fetchAllUsers().then(setAllUsers);
    }
  }, [showNewGroup, fetchAllUsers]);

  const handleCreateAIChat = async () => {
    if (!user) return;
    try {
      const chat = await createAIChat(user.id);
      onChatSelect(chat);
      toast.success('AI Assistant ready!');
    } catch (error) {
      toast.error('Failed to start AI chat');
    }
  };

  const sortedChats = [...chats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const aTime = a.lastMessage?.timestamp?.getTime() || 0;
    const bTime = b.lastMessage?.timestamp?.getTime() || 0;
    return bTime - aTime;
  });

  const filteredChats = sortedChats.filter(chat => {
    if (!searchQuery) return true;
    const name = chat.type === 'group' ? chat.name : '';
    const q = searchQuery.toLowerCase();
    return name?.toLowerCase().includes(q) || chat.lastMessage?.content?.toLowerCase().includes(q);
  });

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || selectedParticipants.length === 0) return;
    const participants = selectedParticipants.includes(user.id)
      ? selectedParticipants
      : [...selectedParticipants, user.id];

    try {
      const newChat = await onCreateGroup(groupName.trim(), participants);
      onChatSelect(newChat);
      setShowNewGroup(false);
      setGroupName('');
      setSelectedParticipants([]);
    } catch (error) {
      toast.error('Failed to create group chat');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0b0b]">
      {/* Header with Gradient */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between gchat-header border-b border-green-200/30">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="GaGa Chat" className="w-10 h-10 rounded-full gchat-logo-glow object-cover" />
          <h1 className="text-green-900 text-xl font-bold">GaGa Chat</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateAIChat}
            aria-label="Start AI assistant chat"
            title="Start AI Assistant"
            className="p-2 text-green-600 hover:bg-green-400/10 rounded-full transition-colors"
          >
            <Bot size={22} />
          </button>
          <button
            onClick={() => setShowSearch(s => !s)}
            aria-label="Search chats"
            title="Search chats"
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setShowNewGroup(true)}
            aria-label="Create new group"
            title="New group"
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <Edit size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 pb-3 animate-slide-in">
          <div className="flex items-center bg-green-400/10 rounded-xl px-3 py-2.5 gap-2 border border-green-300/20">
            <Search size={15} className="text-green-600/40 flex-shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={14} className="text-green-600/40" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stories */}
      {!showSearch && (
        <StoryCircle />
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#0b0b0b]">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-green-400/30">
            <MessageCircle size={40} className="opacity-30 mb-2" />
            <p className="text-sm mt-2">No chats found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredChats.map(chat => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onClick={() => onChatSelect(chat)}
                onPin={() => onPin(chat.id)}
                onMute={() => onMute(chat.id)}
                onDelete={() => onDelete(chat.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Security Footer */}
      <div className="px-5 py-3 border-t border-green-300/20 bg-[#0b0b0b]/50 backdrop-blur-md flex items-center justify-center gap-2">
        <Lock size={12} className="text-green-600/50" />
        <p className="text-[10px] text-green-700/30 font-medium uppercase tracking-widest">Your personal messages are end-to-end encrypted</p>
      </div>

      {/* New Group Modal */}
      {showNewGroup && (
        <div className="fixed inset-0 z-50 bg-green-900/20 flex items-end animate-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowNewGroup(false); }}>
          <div className="bg-[#0f0f0f] border-t border-green-300/30 rounded-t-3xl w-full max-h-[85vh] flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-green-300/20">
              <h2 className="text-lg font-bold text-white">New Group</h2>
              <button onClick={() => setShowNewGroup(false)} aria-label="Close new group modal" title="Close">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 border-b border-green-300/20">
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full text-sm bg-green-300/10 border border-green-300/30 text-green-900 rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-green-700/30"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <p className="px-5 py-2 text-xs text-green-700/40 font-medium">SELECT MEMBERS</p>
              {allUsers.filter(u => u.id !== user?.id).map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedParticipants(prev =>
                    prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                  )}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-green-300/10 transition-colors"
                >
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-green-700/40">{user.statusMessage}</p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    selectedParticipants.includes(user.id)
                      ? 'bg-cyan-400 border-cyan-400'
                      : 'border-gray-300'
                  )}>
                    {selectedParticipants.includes(user.id) && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                </div>
              ))}
              {allUsers.length <= 1 && (
                <div className="flex flex-col items-center justify-center py-10 text-green-400/30">
                  <Users size={32} className="opacity-20 mb-2" />
                  <p className="text-xs">No other users to add</p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-green-300/20">
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedParticipants.length === 0}
                className="w-full gchat-btn py-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                Create Group ({selectedParticipants.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatsPage;
