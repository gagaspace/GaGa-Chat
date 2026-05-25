import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '@/components/layout/BottomNav';
import ChatsPage from './ChatsPage';
import ChatRoomPage from './ChatRoomPage';
import ContactsPage from './ContactsPage';
import TimelinePage from './TimelinePage';
import CallsPage from './CallsPage';
import MorePage from './MorePage';
import CallModal from '@/components/features/CallModal';
import { useChatStore } from '@/hooks/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Chat, User } from '@/types';
import { Phone, Video, X, Check } from 'lucide-react';

type Tab = 'chats' | 'contacts' | 'timeline' | 'calls' | 'more';

interface IncomingCallPayload {
  caller: {
    id: string;
    name: string;
    avatar: string;
  };
  type: 'voice' | 'video';
}

const Index = ({ initialTab = 'chats' }: { initialTab?: Tab }) => {
  const [currentTab, setCurrentTab] = useState<Tab>(initialTab);
  const [activeChatRoom, setActiveChatRoom] = useState<Chat | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [activeCall, setActiveCall] = useState<{ user: User; type: 'voice' | 'video' } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  const location = useLocation();

  useEffect(() => {
    const p = location.pathname.split('/')[1];
    const tabs: Tab[] = ['chats', 'contacts', 'timeline', 'calls', 'more'];
    if (tabs.includes(p as Tab)) {
      setCurrentTab(p as Tab);
    } else if (location.pathname === '/') {
      setCurrentTab(initialTab);
    }
  }, [location.pathname, initialTab]);

  const handleTabChange = (tab: Tab) => {
    setCurrentTab(tab);
    navigate(`/${tab}`);
  };

  const {
    chats,
    messages,
    fetchChats,
    fetchMessages,
    sendMessage,
    markAsRead,
    totalUnread,
    setActiveChat,
    subscribeToAllChats,
    pinChat,
    muteChat,
    deleteChat,
    createGroupChat,
    addReaction,
  } = useChatStore();

  useEffect(() => {
    if (user) {
      fetchChats(user.id);
      const unsubscribe = subscribeToAllChats(user.id);

      // Listen for incoming calls
      const callChannel = supabase.channel(`call:${user.id}`);
      callChannel
        .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
          setIncomingCall(payload);
          // Play a ringtone logic could go here
        })
        .subscribe();

      return () => {
        unsubscribe();
        supabase.removeChannel(callChannel);
      };
    }
  }, [user, fetchChats, subscribeToAllChats]);

  const handleChatSelect = (chat: Chat) => {
    setActiveChatRoom(chat);
    setActiveChat(chat);
    if (user) {
      markAsRead(chat.id, user.id);
    }
  };

  const handleBackFromChat = () => {
    setActiveChatRoom(null);
    setActiveChat(null);
  };

  const { removeMessage } = useChatStore();

  const handleStartChatFromContacts = async (userId: string) => {
    const existingChat = chats.find(c =>
      c.type === 'direct' && c.participants.includes(userId) && user && c.participants.includes(user.id)
    );
    if (existingChat) {
      setActiveChatRoom(existingChat);
      setActiveChat(existingChat);
      handleTabChange('chats');
    } else if (user) {
      try {
        const { data: chat, error } = await supabase
          .from('chats')
          .insert({ type: 'direct' })
          .select()
          .single();

        if (error) throw error;

        await supabase.from('chat_participants').insert([
          { chat_id: chat.id, user_id: user.id },
          { chat_id: chat.id, user_id: userId }
        ]);

        const newChat: Chat = {
          id: chat.id,
          type: 'direct',
          participants: [user.id, userId],
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          createdAt: new Date(chat.created_at),
        };

        setActiveChatRoom(newChat);
        setActiveChat(newChat);
        handleTabChange('chats');
        fetchChats(user.id);
      } catch (error) {
        toast.error('Failed to start chat');
      }
    }
  };

  const handleAcceptCall = () => {
    if (incomingCall) {
      setActiveCall({
        user: {
          id: incomingCall.caller.id,
          name: incomingCall.caller.name,
          avatar: incomingCall.caller.avatar,
          status: 'online',
          statusMessage: 'In a call',
        },
        type: incomingCall.type,
      });
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = () => {
    setIncomingCall(null);
    // You could also broadcast a 'call-declined' event back to the caller
  };

  return (
    <div className="flex justify-center items-stretch min-h-screen bg-[#0b0b0b]">
      <div className="relative w-full max-w-md bg-[#0f0f0f] flex flex-col min-h-screen shadow-2xl overflow-hidden">
        {/* Incoming Call Overlay */}
        {incomingCall && (
          <div className="fixed inset-x-0 top-12 mx-4 z-[110] bg-gradient-white-green-light border border-green-200 rounded-2xl p-4 shadow-2xl animate-slide-in">
            <div className="flex items-center gap-4">
                <img
                  src={incomingCall.caller.avatar}
                  alt=""
                  className="w-12 h-12 rounded-full border-2 border-green-500"
                />
              <div className="flex-1">
                <p className="text-green-900 font-bold text-sm">{incomingCall.caller.name}</p>
                <p className="text-green-700/70 text-xs flex items-center gap-1">
                  {incomingCall.type === 'video' ? <Video size={12} /> : <Phone size={12} />}
                  Incoming {incomingCall.type} call...
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeclineCall}
                  aria-label="Decline call"
                  title="Decline call"
                  className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
                >
                  <X size={20} />
                </button>
                <button
                  onClick={handleAcceptCall}
                  aria-label="Accept call"
                  title="Accept call"
                  className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
                >
                  <Check size={20} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Call Modal */}
        {activeCall && (
          <CallModal
            user={activeCall.user}
            type={activeCall.type}
            onEnd={() => setActiveCall(null)}
          />
        )}

        {/* Main Content */}
        <div className={activeChatRoom ? 'h-screen overflow-hidden' : 'flex-1 overflow-hidden pb-[60px]'}>
          <AnimatePresence mode="wait">
            {activeChatRoom ? (
              <motion.div
                key="chat-room"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="h-full"
              >
                <ChatRoomPage
                  chat={activeChatRoom}
                  messages={messages[activeChatRoom.id] || []}
                  onBack={handleBackFromChat}
                  onSend={sendMessage}
                  onReact={(chatId, msgId, emoji, userId) => addReaction(chatId, msgId, emoji, userId)}
                  onMarkRead={markAsRead}
                  onDeleteMessage={removeMessage}
                  onMuteChat={(chatId, isMuted) => user && muteChat(chatId, user.id, isMuted)}
                />
              </motion.div>
            ) : (
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-hidden"
              >
                {currentTab === 'chats' && (
                  <ChatsPage
                    chats={chats}
                    onChatSelect={handleChatSelect}
                    onPin={(chatId) => user && pinChat(chatId, user.id, !chats.find(c => c.id === chatId)?.isPinned)}
                    onMute={(chatId) => user && muteChat(chatId, user.id, !chats.find(c => c.id === chatId)?.isMuted)}
                    onDelete={deleteChat}
                    onCreateGroup={createGroupChat}
                  />
                )}
                {currentTab === 'contacts' && (
                  <ContactsPage onStartChat={handleStartChatFromContacts} />
                )}
                {currentTab === 'timeline' && <TimelinePage />}
                {currentTab === 'calls' && <CallsPage />}
                {currentTab === 'more' && <MorePage />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation — hidden inside chat room */}
        {!activeChatRoom && (
          <BottomNav
            activeTab={currentTab}
            onTabChange={handleTabChange}
            unreadCount={totalUnread}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
