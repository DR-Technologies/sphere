'use client';

import React, { useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import SphereLogo from '@/components/brand/SphereLogo';

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeView: 'home' | 'datasets' | 'upload' | 'reports' | 'settings' | 'admin';
    onViewChange: (view: 'home' | 'datasets' | 'upload' | 'reports' | 'settings' | 'admin') => void;
    onLogout: () => void;
    userName?: string;
    editorMode?: boolean;
    isSuperadmin?: boolean;
}

export default function DashboardLayout({
    children,
    activeView,
    onViewChange,
    onLogout,
    userName,
    editorMode = false,
    isSuperadmin = false
}: DashboardLayoutProps) {
    const [isMobile, setIsMobile] = React.useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const media = window.matchMedia('(max-width: 720px)');
        const sync = () => {
            setIsMobile(media.matches);
            if (!media.matches) {
                setIsMobileNavOpen(false);
            }
        };

        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    const handleViewChange = (view: 'home' | 'datasets' | 'upload' | 'reports' | 'settings' | 'admin') => {
        onViewChange(view);
        if (isMobile) {
            setIsMobileNavOpen(false);
        }
    };

    return (
        <div className="dashboard-layout">
            {isMobile ? (
                <>
                    <div className="mobile-topbar">
                        <button className="mobile-nav-toggle" onClick={() => setIsMobileNavOpen(true)} aria-label="Open navigation">
                            <Menu size={20} />
                        </button>
                        <div className="mobile-brand">
                            <SphereLogo width={112} height={28} />
                        </div>
                    </div>
                    {isMobileNavOpen ? <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} /> : null}
                </>
            ) : null}
            <Sidebar
                activeView={activeView}
                onViewChange={handleViewChange}
                onLogout={onLogout}
                userName={userName}
                mobileMode={isMobile}
                mobileOpen={isMobileNavOpen}
                compactMode={editorMode && !isMobile}
                isSuperadmin={isSuperadmin}
            />
            <main className="dashboard-content">
                {children}
            </main>

            <style jsx>{`
                .dashboard-layout {
                    display: flex;
                    height: 100vh;
                    background: transparent;
                    overflow: hidden;
                }

                .mobile-topbar,
                .mobile-backdrop {
                    display: none;
                }

                .dashboard-content {
                    flex: 1;
                    height: 100vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    position: relative;
                    padding: 0 0 0 ${editorMode ? '0' : '8px'};
                }

                @media (max-width: 720px) {
                    .mobile-topbar {
                        position: fixed;
                        inset: 0 0 auto 0;
                        height: 64px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 16px;
                        z-index: 220;
                        background: var(--shell-header-bg);
                        backdrop-filter: blur(18px);
                        -webkit-backdrop-filter: blur(18px);
                        border-bottom: 1px solid var(--border);
                    }

                    .mobile-nav-toggle {
                        width: 42px;
                        height: 42px;
                        border-radius: 999px;
                        border: 1px solid var(--border);
                        background: var(--shell-control-bg);
                        color: var(--foreground);
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .mobile-brand {
                        display: inline-flex;
                        align-items: center;
                        gap: 10px;
                        font-weight: 700;
                        color: var(--foreground);
                    }

                    .mobile-backdrop {
                        display: block;
                        position: fixed;
                        inset: 64px 0 0 0;
                        z-index: 190;
                        background: rgba(9, 10, 14, 0.42);
                        border: none;
                        padding: 0;
                    }

                    .dashboard-content {
                        padding-left: 0;
                        padding-top: 64px;
                    }
                }
            `}</style>
        </div>
    );
}
