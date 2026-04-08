'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // 1. Check if Supabase already picked up the session (most common)
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    router.replace('/');
                    return;
                }

                // 2. Check for code in URL (PKCE flow)
                const searchParams = new URLSearchParams(window.location.search);
                const code = searchParams.get('code');

                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;
                }

                // 3. Last fallback: session might be in hash fragment # (Implicit flow)
                // supabase-js usually handles this automatically on initialization

                router.replace('/');
            } catch (err: any) {
                console.error('Auth Callback Error:', err.message);
                setError(err.message);
            }
        };

        handleCallback();
    }, [router]);

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
                <h1 style={{ color: '#f87171' }}>Error de Autenticación</h1>
                <p>{error}</p>
                <button
                    onClick={() => window.location.href = '/'}
                    style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px' }}
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
            <Loader2 size={48} className="animate-spin text-primary" />
            <p>Finalizando autenticación...</p>
        </div>
    );
}
