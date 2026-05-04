import { createClient } from '@supabase/supabase-js';
import { appLogger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
        appLogger.error('config', 'SUPABASE_SERVER_ENV_MISSING', 'Supabase environment variables are missing on the server.', {
            once: true,
            meta: {
                hasUrl: Boolean(supabaseUrl),
                hasAnonKey: Boolean(supabaseAnonKey)
            }
        });
    } else {
        appLogger.warn('config', 'SUPABASE_CLIENT_ENV_MISSING', 'Supabase credentials are missing in the browser. Data persistence will not work.', {
            once: true,
            meta: {
                hasUrl: Boolean(supabaseUrl),
                hasAnonKey: Boolean(supabaseAnonKey)
            }
        });
    }
}

// Ensure we don't crash if vars are missing, though it won't work
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'sphere-auth-session'
        }
    }
);
