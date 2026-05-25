import { useEffect, useState, useCallback } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User as AppUser } from '@/types';

import { cacheProfile } from '@/constants/mockData';

export interface UseAuthReturn {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  fetchAllUsers: () => Promise<AppUser[]>;
}

export const useAuth = (): UseAuthReturn => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAllUsers = async (): Promise<AppUser[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    const users = data.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar_url,
      status: p.status,
      statusMessage: p.status_message,
    })) as AppUser[];

    // Cache them
    users.forEach(cacheProfile);

    return users;
  };

  useEffect(() => {
    let mounted = true;
    let currentPresenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let currentUserId: string | null = null;

    const handleBeforeUnload = async () => {
      if (!currentUserId) return;
      await supabase.from('profiles').update({ status: 'offline' }).eq('id', currentUserId);
    };

    const handleSession = async (sessionData: Session | null) => {
      if (!mounted) return;
      setSession(sessionData);
      currentUserId = sessionData?.user?.id ?? null;

      if (sessionData?.user) {
        await syncProfile(sessionData.user);
        if (currentPresenceChannel) {
          supabase.removeChannel(currentPresenceChannel);
        }
        currentPresenceChannel = trackPresence(sessionData.user.id);
      }

      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession);
    });

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      listener.subscription.unsubscribe();
      if (currentPresenceChannel) {
        supabase.removeChannel(currentPresenceChannel);
      }
    };
  }, []);

  const trackPresence = (userId: string) => {
    const channel = supabase.channel('online-users');
    channel
      .on('presence', { event: 'sync' }, () => {
        // Keep presence channel active for live online status tracking.
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            isTyping: false,
          });
        }
      });

    return channel;
  };

  const syncProfile = async (user: SupabaseUser) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0];
      const newProfile = {
        id: user.id,
        name: displayName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        status: 'online',
        status_message: 'Available',
      };
      await supabase.from('profiles').insert(newProfile);
      cacheProfile({
        id: newProfile.id,
        name: newProfile.name,
        avatar: newProfile.avatar_url,
        status: 'online',
        statusMessage: newProfile.status_message,
      });
    } else {
      await supabase.from('profiles').update({ status: 'online' }).eq('id', user.id);
      cacheProfile({
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar_url,
        status: 'online',
        statusMessage: profile.status_message,
      });
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName, full_name: displayName } : undefined,
      }
    });
    return {
      error: error?.message ?? null,
      needsConfirmation: Boolean(data?.user && !data.session),
    };
  }, []);

  const signOut = useCallback(async () => {
    if (session?.user) {
      await supabase.from('profiles').update({ status: 'offline' }).eq('id', session.user.id);
    }
    await supabase.auth.signOut();
  }, [session]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    fetchAllUsers,
  };
};
