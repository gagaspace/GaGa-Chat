export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  statusMessage: string;
  phone?: string;
  isBlocked?: boolean;
  isFavorite?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: 'text' | 'image' | 'sticker' | 'voice' | 'video' | 'file' | 'location';
  content: string;
  timestamp: Date;
  read: boolean;
  reactions?: Reaction[];
  replyTo?: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  createdAt: Date;
}

export interface TimelinePost {
  id: string;
  userId: string;
  content: string;
  images?: string[];
  likes: string[];
  comments: Comment[];
  timestamp: Date;
  visibility: 'public' | 'friends' | 'private';
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  likes: string[];
}

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  timestamp: Date;
  viewers: string[];
  expiresAt: Date;
}

export interface CallRecord {
  id: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  userId: string;
  duration?: number;
  timestamp: Date;
}

export interface Contact {
  userId: string;
  addedAt: Date;
  nickname?: string;
}

export interface Sticker {
  id: string;
  packId: string;
  packName: string;
  url: string;
  emoji: string;
}

export interface StickerPack {
  id: string;
  name: string;
  author: string;
  previewUrl: string;
  stickers: Sticker[];
  price: number;
  isPurchased: boolean;
}
