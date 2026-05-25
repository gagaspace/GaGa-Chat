import { createClient } from '@supabase/supabase-js';

const requireEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// Supabase project: nhdnjvyubirsaztusmlz (ap-southeast-1)
const SUPABASE_URL = requireEnv(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'gaga-chat-auth',
  },
});

export type AuthUser = {
  id: string;
  email: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};
