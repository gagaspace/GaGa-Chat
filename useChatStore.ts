import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { AI_ASSISTANT_ID, AI_ASSISTANT_AVATAR, AI_ASSISTANT_NAME } from '@/lib/utils';
import type { Chat, Message, User as AppUser, Reaction } from '@/types';

type ChatParticipantRow = { chat_id: string };

type SupabaseChatRow = {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar_url?: string;
  created_at: string;
  chat_participants: Array<{
    user_id: string;
    is_pinned: boolean;
    is_muted: boolean;
    profiles: {
      id: string;
      name: string;
      avatar_url?: string;
      status: string;
      status_message: string;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    type: Message['type'];
    sender_id: string;
    created_at: string;
    is_read: boolean;
    reactions?: Reaction[];
  }>;
};

type MessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  type: Message['type'];
  content: string;
  created_at: string;
  is_read: boolean;
  reactions?: Reaction[];
};

type TypingPresenceRow = {
  user_id: string;
  isTyping?: boolean;
};

interface ChatStore {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChat: Chat | null;
  typingUsers: Record<string, string[]>;
  typingChannels: Record<string, unknown>;
  loading: boolean;
  totalUnread: number;

  // Actions
  fetchChats: (userId: string) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  sendMessage: (chatId: string, senderId: string, content: string, type?: Message['type']) => Promise<void>;
  subscribeToChat: (chatId: string) => () => void;
  subscribeToAllChats: (userId: string) => () => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string, userId: string) => Promise<void>;
  createAIChat: (userId: string) => Promise<Chat>;
  deleteChat: (chatId: string) => Promise<void>;
  createGroupChat: (name: string, participantIds: string[]) => Promise<Chat>;
  pinChat: (chatId: string, userId: string, isPinned: boolean) => Promise<void>;
  muteChat: (chatId: string, userId: string, isMuted: boolean) => Promise<void>;
  addReaction: (chatId: string, messageId: string, emoji: string, userId: string) => Promise<void>;
  removeMessage: (chatId: string, messageId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  messages: {},
  activeChat: null,
  typingUsers: {},
  typingChannels: {},
  loading: false,
  totalUnread: 0,

  fetchChats: async (userId: string) => {
    set({ loading: true });
    const { data: participants, error: pError } = await supabase
      .from<ChatParticipantRow>('chat_participants')
      .select('chat_id')
      .eq('user_id', userId);

    if (pError) {
      console.error('Error fetching chat participants:', pError);
      set({ loading: false });
      return;
    }

    const chatIds = participants.map(p => p.chat_id);
    if (chatIds.length === 0) {
      set({ chats: [], totalUnread: 0, loading: false });
      return;
    }

    const { data: chats, error: cError } = await supabase
      .from<SupabaseChatRow>('chats')
      .select('*, chat_participants!inner(user_id, is_pinned, is_muted, profiles(*)), messages(id, content, type, sender_id, created_at, is_read, reactions)')
      .in('id', chatIds)
      .eq('chat_participants.user_id', userId)
      .order('created_at', { ascending: false });

    if (cError) {
      console.error('Error fetching chats:', cError);
    } else {
      let totalUnread = 0;
      const formattedChats: Chat[] = chats.map(chat => {
        const participantInfo = chat.chat_participants.find(p => p.user_id === userId);
        const participantIds = chat.chat_participants.map(p => p.user_id);

        // Get last message
        const sortedMsgs = (chat.messages || []).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMsgRaw = sortedMsgs[0];
        const lastMessage: Message | undefined = lastMsgRaw ? {
          id: lastMsgRaw.id,
          chatId: chat.id,
          senderId: lastMsgRaw.sender_id,
          content: lastMsgRaw.content,
          type: lastMsgRaw.type,
          timestamp: new Date(lastMsgRaw.created_at),
          read: lastMsgRaw.is_read,
          reactions: lastMsgRaw.reactions || []
        } : undefined;

        // Calculate unread
        const unreadCount = (chat.messages || []).filter(m =>
          !m.is_read && m.sender_id !== userId
        ).length;

        totalUnread += unreadCount;

        return {
          id: chat.id,
          type: chat.type,
          name: chat.name,
          avatar: chat.avatar_url,
          participants: participantIds,
          unreadCount: unreadCount,
          lastMessage,
          isPinned: participantInfo?.is_pinned || false,
          isMuted: participantInfo?.is_muted || false,
          createdAt: new Date(chat.created_at),
        };
      });
      set({ chats: formattedChats, totalUnread });
    }
    set({ loading: false });
  },

  fetchMessages: async (chatId: string) => {
    const { data: messages, error } = await supabase
      .from<MessageRow>('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      const formattedMsgs: Message[] = messages.map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        type: msg.type,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        read: msg.is_read,
        reactions: msg.reactions || [],
      }));
      set(state => ({
        messages: { ...state.messages, [chatId]: formattedMsgs }
      }));
    }
  },

  setActiveChat: (chat) => set({ activeChat: chat }),

  sendMessage: async (chatId, senderId, content, type = 'text') => {
    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content,
        type,
      });

    if (error) {
      console.error('Error sending message:', error);
    }
  },

  subscribeToChat: (chatId: string) => {
    type MessagePayload = {
      new: MessageRow;
      old?: { id: string };
    };

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const newMessage: Message = {
          id: payload.new.id,
          chatId: payload.new.chat_id,
          senderId: payload.new.sender_id,
          type: payload.new.type,
          content: payload.new.content,
          timestamp: new Date(payload.new.created_at),
          read: payload.new.is_read,
          reactions: payload.new.reactions || [],
        };
        set(state => {
          const currentMsgs = state.messages[chatId] || [];
          if (currentMsgs.find(m => m.id === newMessage.id)) return state;

          // Also update the chat list's last message and unread count
          const updatedChats = state.chats.map(c => {
            if (c.id === chatId) {
              return {
                ...c,
                lastMessage: newMessage,
              };
            }
            return c;
          });

          return {
            messages: { ...state.messages, [chatId]: [...currentMsgs, newMessage] },
            chats: updatedChats
          };
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        set(state => {
          const currentMsgs = state.messages[chatId] || [];
          const updatedMsgs = currentMsgs.map(m =>
            m.id === payload.new.id
              ? {
                ...m,
                content: payload.new.content,
                read: payload.new.is_read,
                reactions: payload.new.reactions || []
              }
              : m
          );
          return {
            messages: { ...state.messages, [chatId]: updatedMsgs }
          };
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
      }, (payload: MessagePayload) => {
        set(state => {
          const currentMsgs = state.messages[chatId] || [];
          const updatedMsgs = currentMsgs.filter(m => m.id !== payload.old.id);
          return {
            messages: { ...state.messages, [chatId]: updatedMsgs }
          };
        });
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState() as Record<string, TypingPresenceRow[]>;
        const typing: string[] = [];
        Object.values(presenceState).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.isTyping) typing.push(presence.user_id);
          });
        });
        set(state => ({
          typingUsers: { ...state.typingUsers, [chatId]: typing }
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  setTyping: (chatId, userId, isTyping) => {
    const channels = get().typingChannels as Record<string, ReturnType<typeof supabase.channel>>;
    let typingChannel = channels[chatId];

    if (!typingChannel) {
      typingChannel = supabase.channel(`typing:${chatId}`);
      typingChannel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = typingChannel.presenceState() as Record<string, TypingPresenceRow[]>;
          const typingUsers = Object.values(presenceState).flatMap((presences) =>
            presences.filter((presence) => presence.isTyping).map((presence) => presence.user_id)
          );

          set(state => ({
            typingUsers: {
              ...state.typingUsers,
              [chatId]: typingUsers,
            },
          }));
        })
        .subscribe(async status => {
          if (status === 'SUBSCRIBED' && isTyping) {
            await typingChannel.track({ user_id: userId, isTyping });
          }
        });

      channels[chatId] = typingChannel;
      set({ typingChannels: channels });
    } else {
      if (isTyping) {
        typingChannel.track({ user_id: userId, isTyping });
      } else if (typingChannel.untrack) {
        typingChannel.untrack();
      }
    }
  },

  markAsRead: async (chatId, userId) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    // Refresh chats to update unread counts
    const { fetchChats } = get();
    await fetchChats(userId);
  },

  subscribeToAllChats: (userId: string) => {
    type ChatNotificationPayload = {
      new: { chat_id: string; sender_id: string; content: string };
    };

    const channel = supabase
      .channel('public:messages_all')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload: ChatNotificationPayload) => {
        const { fetchChats, activeChat, chats } = get();
        const currentChatIds = chats.map(chat => chat.id);

        if (activeChat && payload.new.chat_id === activeChat.id) return;

        if (!currentChatIds.includes(payload.new.chat_id)) {
          await fetchChats(userId);
          return;
        }

        await fetchChats(userId);

        if (Notification.permission === 'granted') {
          const senderProfile = payload.new.sender_id === AI_ASSISTANT_ID
            ? { name: AI_ASSISTANT_NAME }
            : null;

          new Notification('New Message', {
            body: senderProfile ? `${senderProfile.name}: ${payload.new.content}` : payload.new.content,
            icon: '/logo.jpg',
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  createAIChat: async (userId: string) => {
    const { data: existingAssistants, error: assistantError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', AI_ASSISTANT_ID)
      .limit(1);

    if (assistantError) {
      console.error('Error checking AI assistant profile:', assistantError);
    }

    if (!existingAssistants || existingAssistants.length === 0) {
      await supabase.from('profiles').insert({
        id: AI_ASSISTANT_ID,
        name: AI_ASSISTANT_NAME,
        avatar_url: AI_ASSISTANT_AVATAR,
        status: 'online',
        status_message: 'AI Assistant',
      });
    }

    const { data: userChats, error: userChatsError } = await supabase
      .from<ChatParticipantRow>('chat_participants')
      .select('chat_id')
      .eq('user_id', userId);

    if (userChatsError) {
      console.error('Error looking for existing AI chat:', userChatsError);
    }

    const userChatIds = userChats?.map((participant) => participant.chat_id) ?? [];
    if (userChatIds.length > 0) {
      const { data: existingAiParticipants, error: existingAiError } = await supabase
        .from<ChatParticipantRow>('chat_participants')
        .select('chat_id')
        .eq('user_id', AI_ASSISTANT_ID)
        .in('chat_id', userChatIds)
        .limit(1);

      if (existingAiError) {
        console.error('Error checking for existing AI chat:', existingAiError);
      }

      if (existingAiParticipants && existingAiParticipants.length > 0) {
        const aiChatId = existingAiParticipants[0].chat_id;
        const { data: existingChat, error: existingChatError } = await supabase
          .from<SupabaseChatRow>('chats')
          .select('*')
          .eq('id', aiChatId)
          .single();

        if (!existingChatError && existingChat) {
          return {
            id: existingChat.id,
            type: existingChat.type,
            name: existingChat.name,
            avatar: existingChat.avatar_url,
            participants: [userId, AI_ASSISTANT_ID],
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
            createdAt: new Date(existingChat.created_at),
          };
        }
      }
    }

    const { data: chat, error: cError } = await supabase
      .from('chats')
      .insert({
        type: 'direct',
        name: AI_ASSISTANT_NAME,
        avatar_url: AI_ASSISTANT_AVATAR,
      })
      .select()
      .single();

    if (cError) throw cError;

    await supabase.from('chat_participants').insert([
      { chat_id: chat.id, user_id: userId },
      { chat_id: chat.id, user_id: AI_ASSISTANT_ID }
    ]);

    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      avatar: chat.avatar_url,
      participants: [userId, AI_ASSISTANT_ID],
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      createdAt: new Date(chat.created_at),
    };
  },

  deleteChat: async (chatId: string) => {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (error) {
      console.error('Error deleting chat:', error);
    } else {
      set(state => ({
        chats: state.chats.filter(c => c.id !== chatId),
        activeChat: state.activeChat?.id === chatId ? null : state.activeChat,
      }));
    }
  },

  createGroupChat: async (name: string, participantIds: string[]) => {
    const { data: chat, error: cError } = await supabase
      .from('chats')
      .insert({
        type: 'group',
        name,
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
      })
      .select()
      .single();

    if (cError) throw cError;

    const participants = participantIds.map(uid => ({
      chat_id: chat.id,
      user_id: uid,
    }));

    await supabase.from('chat_participants').insert(participants);

    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      avatar: chat.avatar_url,
      participants: participantIds,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      createdAt: new Date(chat.created_at),
    };
  },

  pinChat: async (chatId, userId, isPinned) => {
    await supabase
      .from('chat_participants')
      .update({ is_pinned: isPinned })
      .match({ chat_id: chatId, user_id: userId });

    set(state => ({
      chats: state.chats.map(c => c.id === chatId ? { ...c, isPinned } : c)
    }));
  },

  muteChat: async (chatId, userId, isMuted) => {
    await supabase
      .from('chat_participants')
      .update({ is_muted: isMuted })
      .match({ chat_id: chatId, user_id: userId });

    set(state => ({
      chats: state.chats.map(c => c.id === chatId ? { ...c, isMuted } : c)
    }));
  },

  addReaction: async (chatId, messageId, emoji, userId) => {
    const { messages } = get();
    const chatMessages = messages[chatId] || [];
    const message = chatMessages.find(m => m.id === messageId);
    if (!message) return;

    const currentReactions = message.reactions || [];
    const existingIndex = currentReactions.findIndex(r => r.userId === userId);

    let newReactions;
    if (existingIndex > -1) {
      if (currentReactions[existingIndex].emoji === emoji) {
        newReactions = currentReactions.filter(r => r.userId !== userId);
      } else {
        newReactions = [...currentReactions];
        newReactions[existingIndex] = { emoji, userId };
      }
    } else {
      newReactions = [...currentReactions, { emoji, userId }];
    }

    await supabase
      .from('messages')
      .update({ reactions: newReactions })
      .eq('id', messageId);
  },

  removeMessage: async (chatId, messageId) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
    }
  },
}));
