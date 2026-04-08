'use client';

import React, { useEffect } from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeView: 'home' | 'datasets' | 'upload' | 'reports' | 'settings';
    onViewChange: (view: 'home' | 'datasets' | 'upload' | 'reports' | 'settings') => void;
    onLogout: () => void;
    userName?: string;
}

export default function DashboardLayout({
    children,
    activeView,
    onViewChange,
    onLogout,
    userName
}: DashboardLayoutProps) {
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

    return (
        <div className="dashboard-layout">
            <Sidebar
                activeView={activeView}
                onViewChange={onViewChange}
                onLogout={onLogout}
                userName={userName}
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

                .dashboard-content {
                    flex: 1;
                    height: 100vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    position: relative;
                    padding: 0 0 0 18px;
                }
            `}</style>
        </div>
    );
}
