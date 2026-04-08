'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Layers, LogOut, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Auth from '../auth/Auth';
import { User } from '@supabase/supabase-js';

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <nav className="glass" style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    background: 'var(--primary)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px var(--primary-glow)'
                }}>
                    <Layers size={18} color="white" />
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                    Sphere
                </span>
            </Link>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.user_metadata.avatar_url ? (
                                <Image
                                    src={user.user_metadata.avatar_url}
                                    alt="Profile"
                                    width={32}
                                    height={32}
                                    style={{ borderRadius: '50%', border: '1px solid var(--border)' }}
                                />
                            ) : (
                                <div style={{ background: 'var(--surface)', padding: '6px', borderRadius: '50%' }}>
                                    <UserIcon size={16} />
                                </div>
                            )}
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                {user.user_metadata.full_name || user.email}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                color: 'var(--text-muted)',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            <LogOut size={14} />
                            Logout
                        </button>
                    </div>
                ) : (
                    <Auth />
                )}
            </div>
        </nav>
    );
}
