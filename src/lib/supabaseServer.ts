import { createClient } from '@supabase/supabase-js';

function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) {
    throw new Error('Supabase server configuration is missing.');
  }

  return { url, anonKey };
}

export function createServerSupabaseClient(accessToken?: string) {
  const { url, anonKey } = getSupabaseServerConfig();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: accessToken
      ? {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
      : undefined
  });
}
