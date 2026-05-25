-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT DEFAULT 'offline',
    status_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT, -- Only for groups
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat participants table
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'sticker', 'voice', 'video', 'file')),
    is_read BOOLEAN DEFAULT FALSE,
    reactions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create posts (Timeline) table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Create post comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create call records table
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('voice', 'video')) NOT NULL,
    status TEXT CHECK (status IN ('missed', 'completed', 'declined', 'cancelled')) NOT NULL,
    duration INTEGER DEFAULT 0, -- In seconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    viewers UUID[] DEFAULT '{}',
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Chats Policies
CREATE POLICY "Users can view chats they participate in" ON public.chats
    FOR SELECT USING (EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = id AND user_id = auth.uid()));

-- Chat Participants Policies
CREATE POLICY "Users can view participants of their chats" ON public.chat_participants
    FOR SELECT USING (EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.chat_id = chat_id AND cp.user_id = auth.uid()));

-- Messages Policies
CREATE POLICY "Users can view messages in their chats" ON public.messages
    FOR SELECT USING (EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = chat_id AND user_id = auth.uid()));
CREATE POLICY "Users can send messages to their chats" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = chat_id AND user_id = auth.uid()));

-- Posts Policies
CREATE POLICY "Public posts are viewable by everyone" ON public.posts FOR SELECT USING (visibility = 'public');
CREATE POLICY "Users can view their own private posts" ON public.posts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Calls Policies
CREATE POLICY "Users can view their own calls" ON public.calls
    FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can record calls" ON public.calls
    FOR INSERT WITH CHECK (auth.uid() = caller_id);

-- Stories Policies
CREATE POLICY "Stories are viewable by everyone" ON public.stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Users can create their own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
