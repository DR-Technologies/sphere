'use client';

import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

export default function Auth() {
    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
        if (error) console.error('Error logging in:', error.message);
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGoogleLogin}
            className="glass-card"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(227,236,255,0.88))',
                color: '#08111f',
                border: '1px solid rgba(255,255,255,0.32)',
                borderRadius: '18px',
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 18px 36px rgba(116, 161, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.6)'
            }}
        >
            <LogIn size={18} />
            <span>Login with Google</span>
        </motion.button>
    );
}
