import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
        console.error('CRITICAL: Supabase environment variables are missing on the SERVER.');
    } else {
        console.warn('Supabase credentials missing. Data persistence will not work.');
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
// Optional: enable debug if needed (user can see it in console)
// (supabase as any).debug = true;
