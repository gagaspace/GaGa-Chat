import type {
  User,
  Chat,
  Message,
  TimelinePost,
  Story,
  CallRecord,
  StickerPack,
} from '@/types';
import { AI_ASSISTANT_ID, AI_ASSISTANT_PROFILE } from '@/lib/utils';

// ─────────────────────────────────────────────────────────
// CURRENT USER
// ─────────────────────────────────────────────────────────
export const CURRENT_USER: User = {
  id: 'me',
  name: 'You',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=00ff00',
  status: 'online',
  statusMessage: 'Available',
  phone: '+1 555 0100',
};

// ─────────────────────────────────────────────────────────
// MOCK USERS
// ─────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  CURRENT_USER,
  {
    id: 'u1',
    name: 'Alice Chen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice&backgroundColor=ffb6c1',
    status: 'online',
    statusMessage: '✨ Living my best life',
    phone: '+1 555 0101',
    isFavorite: true,
  },
  {
    id: 'u2',
    name: 'Brandon Park',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=brandon&backgroundColor=87ceeb',
    status: 'offline',
    statusMessage: 'Coffee & code ☕',
    phone: '+1 555 0102',
  },
  {
    id: 'u3',
    name: 'Catherine Liu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=catherine&backgroundColor=ffd700',
    status: 'online',
    statusMessage: 'On vacation 🏖️',
    phone: '+1 555 0103',
    isFavorite: true,
  },
  {
    id: 'u4',
    name: 'David Kim',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david&backgroundColor=98fb98',
    status: 'busy',
    statusMessage: 'In a meeting',
    phone: '+1 555 0104',
  },
  {
    id: 'u5',
    name: 'Emma Wilson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=dda0dd',
    status: 'online',
    statusMessage: 'Designer 🎨',
    phone: '+1 555 0105',
  },
  {
    id: 'u6',
    name: 'Frank Tanaka',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=frank&backgroundColor=f0e68c',
    status: 'offline',
    statusMessage: 'Last seen yesterday',
    phone: '+1 555 0106',
  },
  {
    id: 'u7',
    name: 'Grace Patel',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=grace&backgroundColor=ff69b4',
    status: 'online',
    statusMessage: 'Hiking weekends 🥾',
    phone: '+1 555 0107',
  },
  {
    id: 'u8',
    name: 'Henry Walker',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=henry&backgroundColor=20b2aa',
    status: 'online',
    statusMessage: '🎮 Gaming',
    phone: '+1 555 0108',
  },
];

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
const profileCache: Record<string, User> = {};

export const getUserById = (id: string): User | undefined => {
  // Check cache first
  if (profileCache[id]) return profileCache[id];

  // This is a synchronous function, so we can't fetch here.
  // In a real app, you'd use a hook like useProfile(id)
  // For now, return a placeholder and let the components fetch if needed
  return {
    id,
    name: 'Loading...',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    status: 'offline',
  };
};

export const cacheProfile = (user: User) => {
  profileCache[user.id] = user;
};

export const getChatName = (chat: Chat, currentUserId?: string): string => {
  if (chat.type === 'group') return chat.name || 'Group Chat';
  const otherId = chat.participants.find((p) => p !== (currentUserId || 'me'));
  if (otherId === AI_ASSISTANT_ID) return AI_ASSISTANT_PROFILE.name;
  const other = otherId ? getUserById(otherId) : undefined;
  return other?.name || 'Unknown';
};

export const getChatAvatar = (chat: Chat, currentUserId?: string): string => {
  if (chat.type === 'group') {
    return (
      chat.avatar ||
      'https://api.dicebear.com/7.x/identicon/svg?seed=' + encodeURIComponent(chat.id)
    );
  }
  const otherId = chat.participants.find((p) => p !== (currentUserId || 'me'));
  if (otherId === AI_ASSISTANT_ID) return AI_ASSISTANT_PROFILE.avatar;
  const other = otherId ? getUserById(otherId) : undefined;
  return other?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=unknown';
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDay < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────
// MOCK CHATS & MESSAGES
// ─────────────────────────────────────────────────────────
const now = Date.now();

export const MOCK_CHATS: Chat[] = [
  {
    id: 'c1',
    type: 'direct',
    participants: ['me', 'u1'],
    unreadCount: 2,
    isPinned: true,
    isMuted: false,
    createdAt: new Date(now - 86400000 * 7),
  },
  {
    id: 'c2',
    type: 'direct',
    participants: ['me', 'u2'],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(now - 86400000 * 5),
  },
  {
    id: 'c3',
    type: 'group',
    name: 'Design Team 🎨',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=designteam',
    participants: ['me', 'u1', 'u3', 'u5'],
    unreadCount: 5,
    isPinned: true,
    isMuted: false,
    createdAt: new Date(now - 86400000 * 14),
  },
  {
    id: 'c4',
    type: 'direct',
    participants: ['me', 'u3'],
    unreadCount: 0,
    isPinned: false,
    isMuted: true,
    createdAt: new Date(now - 86400000 * 3),
  },
  {
    id: 'c5',
    type: 'direct',
    participants: ['me', 'u4'],
    unreadCount: 1,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(now - 86400000 * 2),
  },
  {
    id: 'c6',
    type: 'group',
    name: 'Weekend Plans 🏖️',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=weekend',
    participants: ['me', 'u2', 'u4', 'u7', 'u8'],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(now - 86400000 * 10),
  },
  {
    id: 'c7',
    type: 'direct',
    participants: ['me', 'u5'],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(now - 86400000 * 1),
  },
  {
    id: 'c8',
    type: 'direct',
    participants: ['me', 'u7'],
    unreadCount: 3,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(now - 86400000 * 4),
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    {
      id: 'm1-1',
      chatId: 'c1',
      senderId: 'u1',
      type: 'text',
      content: 'Hey! How are you doing?',
      timestamp: new Date(now - 3600000 * 3),
      read: true,
    },
    {
      id: 'm1-2',
      chatId: 'c1',
      senderId: 'me',
      type: 'text',
      content: 'Great! Just finished a project 🎉',
      timestamp: new Date(now - 3600000 * 2.8),
      read: true,
    },
    {
      id: 'm1-3',
      chatId: 'c1',
      senderId: 'u1',
      type: 'text',
      content: 'Wanna grab coffee later?',
      timestamp: new Date(now - 60000 * 30),
      read: false,
    },
    {
      id: 'm1-4',
      chatId: 'c1',
      senderId: 'u1',
      type: 'text',
      content: 'There\'s a new place downtown ☕',
      timestamp: new Date(now - 60000 * 25),
      read: false,
    },
  ],
  c2: [
    {
      id: 'm2-1',
      chatId: 'c2',
      senderId: 'u2',
      type: 'text',
      content: 'Did you see the latest update?',
      timestamp: new Date(now - 86400000 * 1),
      read: true,
    },
    {
      id: 'm2-2',
      chatId: 'c2',
      senderId: 'me',
      type: 'text',
      content: 'Yes! Looks amazing 🚀',
      timestamp: new Date(now - 86400000 * 1 + 60000 * 5),
      read: true,
    },
  ],
  c3: [
    {
      id: 'm3-1',
      chatId: 'c3',
      senderId: 'u3',
      type: 'text',
      content: 'Team, the mockups are ready for review',
      timestamp: new Date(now - 3600000 * 5),
      read: true,
    },
    {
      id: 'm3-2',
      chatId: 'c3',
      senderId: 'u5',
      type: 'text',
      content: 'On it! Looking now.',
      timestamp: new Date(now - 3600000 * 4),
      read: true,
    },
    {
      id: 'm3-3',
      chatId: 'c3',
      senderId: 'u1',
      type: 'sticker',
      content: '🎨',
      timestamp: new Date(now - 3600000 * 3),
      read: false,
    },
    {
      id: 'm3-4',
      chatId: 'c3',
      senderId: 'u3',
      type: 'text',
      content: 'Love the new color palette!',
      timestamp: new Date(now - 60000 * 45),
      read: false,
    },
  ],
  c4: [
    {
      id: 'm4-1',
      chatId: 'c4',
      senderId: 'u3',
      type: 'text',
      content: 'Sending postcards from the beach 🌊',
      timestamp: new Date(now - 86400000 * 2),
      read: true,
    },
  ],
  c5: [
    {
      id: 'm5-1',
      chatId: 'c5',
      senderId: 'u4',
      type: 'text',
      content: 'Got a sec to chat?',
      timestamp: new Date(now - 60000 * 10),
      read: false,
    },
  ],
  c6: [
    {
      id: 'm6-1',
      chatId: 'c6',
      senderId: 'u7',
      type: 'text',
      content: 'Who\'s in for hiking Saturday?',
      timestamp: new Date(now - 86400000 * 1),
      read: true,
    },
    {
      id: 'm6-2',
      chatId: 'c6',
      senderId: 'u8',
      type: 'text',
      content: 'Me! What time?',
      timestamp: new Date(now - 86400000 * 1 + 60000 * 30),
      read: true,
    },
  ],
  c7: [
    {
      id: 'm7-1',
      chatId: 'c7',
      senderId: 'u5',
      type: 'text',
      content: 'Check out my new design!',
      timestamp: new Date(now - 3600000 * 8),
      read: true,
    },
  ],
  c8: [
    {
      id: 'm8-1',
      chatId: 'c8',
      senderId: 'u7',
      type: 'text',
      content: 'Hey friend!',
      timestamp: new Date(now - 60000 * 90),
      read: false,
    },
    {
      id: 'm8-2',
      chatId: 'c8',
      senderId: 'u7',
      type: 'text',
      content: 'How was your week?',
      timestamp: new Date(now - 60000 * 89),
      read: false,
    },
    {
      id: 'm8-3',
      chatId: 'c8',
      senderId: 'u7',
      type: 'text',
      content: 'Let\'s catch up soon!',
      timestamp: new Date(now - 60000 * 60),
      read: false,
    },
  ],
};

// Attach lastMessage to chats
MOCK_CHATS.forEach((c) => {
  const msgs = MOCK_MESSAGES[c.id];
  if (msgs && msgs.length) c.lastMessage = msgs[msgs.length - 1];
});

// ─────────────────────────────────────────────────────────
// MOCK TIMELINE POSTS
// ─────────────────────────────────────────────────────────
export const MOCK_TIMELINE_POSTS: TimelinePost[] = [
  {
    id: 'p1',
    userId: 'u1',
    content: 'Beautiful sunrise this morning! 🌅 Starting the day right.',
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    ],
    likes: ['me', 'u3', 'u5'],
    comments: [
      {
        id: 'cmt1',
        userId: 'u3',
        content: 'Stunning view! 😍',
        timestamp: new Date(now - 3600000 * 1),
        likes: ['u1'],
      },
    ],
    timestamp: new Date(now - 3600000 * 2),
    visibility: 'friends',
  },
  {
    id: 'p2',
    userId: 'u3',
    content: 'Vacation mode: ON 🏖️☀️',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800',
    ],
    likes: ['me', 'u1', 'u4', 'u5', 'u7'],
    comments: [],
    timestamp: new Date(now - 3600000 * 6),
    visibility: 'public',
  },
  {
    id: 'p3',
    userId: 'u5',
    content: 'New design landed today! Months of iteration finally paid off. 🎨✨',
    images: [
      'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800',
    ],
    likes: ['me', 'u1', 'u3'],
    comments: [
      {
        id: 'cmt2',
        userId: 'u1',
        content: 'This is incredible work!',
        timestamp: new Date(now - 3600000 * 10),
        likes: [],
      },
      {
        id: 'cmt3',
        userId: 'me',
        content: 'Love the typography 🔥',
        timestamp: new Date(now - 3600000 * 9),
        likes: ['u5'],
      },
    ],
    timestamp: new Date(now - 3600000 * 12),
    visibility: 'public',
  },
  {
    id: 'p4',
    userId: 'u7',
    content: 'Hit the trail this weekend with great company 🥾🌲',
    images: [
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
    ],
    likes: ['u8', 'me'],
    comments: [],
    timestamp: new Date(now - 86400000 * 1),
    visibility: 'friends',
  },
  {
    id: 'p5',
    userId: 'u8',
    content: 'Late night gaming session 🎮 GG team!',
    likes: ['u7'],
    comments: [],
    timestamp: new Date(now - 86400000 * 2),
    visibility: 'public',
  },
];

// ─────────────────────────────────────────────────────────
// MOCK STORIES
// ─────────────────────────────────────────────────────────
export const MOCK_STORIES: Story[] = [
  {
    id: 's1',
    userId: 'u1',
    mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    mediaType: 'image',
    timestamp: new Date(now - 3600000 * 2),
    viewers: ['me'],
    expiresAt: new Date(now + 3600000 * 22),
  },
  {
    id: 's2',
    userId: 'u3',
    mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    mediaType: 'image',
    timestamp: new Date(now - 3600000 * 5),
    viewers: [],
    expiresAt: new Date(now + 3600000 * 19),
  },
  {
    id: 's3',
    userId: 'u5',
    mediaUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=400',
    mediaType: 'image',
    timestamp: new Date(now - 3600000 * 8),
    viewers: ['me', 'u1'],
    expiresAt: new Date(now + 3600000 * 16),
  },
  {
    id: 's4',
    userId: 'u7',
    mediaUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
    mediaType: 'image',
    timestamp: new Date(now - 3600000 * 12),
    viewers: [],
    expiresAt: new Date(now + 3600000 * 12),
  },
];

// ─────────────────────────────────────────────────────────
// MOCK CALL RECORDS
// ─────────────────────────────────────────────────────────
export const MOCK_CALL_RECORDS: CallRecord[] = [
  {
    id: 'call1',
    type: 'video',
    direction: 'outgoing',
    userId: 'u1',
    duration: 845,
    timestamp: new Date(now - 3600000 * 4),
  },
  {
    id: 'call2',
    type: 'voice',
    direction: 'incoming',
    userId: 'u3',
    duration: 320,
    timestamp: new Date(now - 86400000 * 1),
  },
  {
    id: 'call3',
    type: 'voice',
    direction: 'missed',
    userId: 'u4',
    timestamp: new Date(now - 86400000 * 1 - 3600000 * 3),
  },
  {
    id: 'call4',
    type: 'video',
    direction: 'incoming',
    userId: 'u5',
    duration: 1240,
    timestamp: new Date(now - 86400000 * 2),
  },
  {
    id: 'call5',
    type: 'voice',
    direction: 'outgoing',
    userId: 'u7',
    duration: 95,
    timestamp: new Date(now - 86400000 * 3),
  },
  {
    id: 'call6',
    type: 'video',
    direction: 'missed',
    userId: 'u2',
    timestamp: new Date(now - 86400000 * 4),
  },
  {
    id: 'call7',
    type: 'voice',
    direction: 'outgoing',
    userId: 'u1',
    duration: 600,
    timestamp: new Date(now - 86400000 * 5),
  },
];

// ─────────────────────────────────────────────────────────
// MOCK STICKER PACKS
// ─────────────────────────────────────────────────────────
const stickerEmojis = ['😀', '😂', '🥰', '😎', '🤔', '😴', '🥳', '😭', '🤯', '🔥', '💯', '✨', '🎉', '💖', '👍', '👏', '🙌', '🤝', '💪', '🚀', '⭐', '🌟', '💎', '🎁', '🍕', '☕', '🌈', '🦄', '🐱', '🐶', '🌸', '🌺'];

export const MOCK_STICKER_PACKS: StickerPack[] = [
  {
    id: 'pack1',
    name: 'Classic Emojis',
    author: 'GaGa Chat',
    previewUrl: '😀',
    price: 0,
    isPurchased: true,
    stickers: stickerEmojis.slice(0, 16).map((e, i) => ({
      id: `s1-${i}`,
      packId: 'pack1',
      packName: 'Classic Emojis',
      url: e,
      emoji: e,
    })),
  },
  {
    id: 'pack2',
    name: 'Celebration',
    author: 'GaGa Chat',
    previewUrl: '🎉',
    price: 0,
    isPurchased: true,
    stickers: ['🎉', '🎊', '🥳', '🎂', '🎁', '🎈', '🍾', '🥂', '✨', '🌟', '💫', '⭐', '🎆', '🎇', '🎀', '🪅'].map((e, i) => ({
      id: `s2-${i}`,
      packId: 'pack2',
      packName: 'Celebration',
      url: e,
      emoji: e,
    })),
  },
  {
    id: 'pack3',
    name: 'Animals',
    author: 'GaGa Chat',
    previewUrl: '🐱',
    price: 0,
    isPurchased: true,
    stickers: ['🐱', '🐶', '🐰', '🐻', '🐼', '🦊', '🦁', '🐯', '🐨', '🐮', '🐷', '🐸', '🐵', '🐔', '🦄', '🐝'].map((e, i) => ({
      id: `s3-${i}`,
      packId: 'pack3',
      packName: 'Animals',
      url: e,
      emoji: e,
    })),
  },
];
