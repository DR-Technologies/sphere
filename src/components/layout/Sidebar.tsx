'use client';

import React from 'react';
import { Home, Database, Upload, LogOut, Activity as SphereIcon, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface SidebarProps {
    activeView: 'home' | 'datasets' | 'upload' | 'reports' | 'settings';
    onViewChange: (view: 'home' | 'datasets' | 'upload' | 'reports' | 'settings') => void;
    onLogout: () => void;
    userName?: string;
}

export default function Sidebar({ activeView, onViewChange, onLogout, userName }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const { t } = useTranslation();

    const menuItems = [
        { id: 'home', label: t('sidebar.home'), icon: <Home size={20} /> },
        { id: 'datasets', label: t('sidebar.datasets'), icon: <Database size={20} /> },
        { id: 'reports', label: t('sidebar.reports'), icon: <SphereIcon size={20} /> },
        { id: 'upload', label: t('sidebar.upload'), icon: <Upload size={20} /> },
        { id: 'settings', label: t('sidebar.settings'), icon: <Settings size={20} /> },
    ];

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo-container">
                    <div className="logo-orb"></div>
                    {!isCollapsed && <span className="logo-text">Sphere</span>}
                </div>
                <button className="collapse-toggle" onClick={toggleCollapse}>
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => onViewChange(item.id as 'home' | 'datasets' | 'upload' | 'reports')}
                        title={isCollapsed ? item.label : undefined}
                    >
                        {item.icon}
                        {!isCollapsed && <span>{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                {userName && (
                    <div className="user-info">
                        <div className="user-avatar">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="user-details">
                                <span className="user-name">{userName}</span>
                            </div>
                        )}
                    </div>
                )}
                <button
                    className="nav-item logout-btn"
                    onClick={onLogout}
                    title={isCollapsed ? t('sidebar.logout') : undefined}
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span>{t('sidebar.logout')}</span>}
                </button>
            </div>

            <style jsx>{`
                .sidebar {
                    width: 220px;
                    height: 100vh;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.06));
                    backdrop-filter: blur(30px) saturate(170%);
                    -webkit-backdrop-filter: blur(30px) saturate(170%);
                    border-right: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.06);
                    display: flex;
                    flex-direction: column;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                .sidebar.collapsed {
                    width: 80px;
                }

                .sidebar-header {
                    padding: 24px 18px 22px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                }

                .sidebar.collapsed .sidebar-header {
                    padding: 24px 0;
                    justify-content: center;
                }

                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .logo-orb {
                    width: 32px;
                    height: 32px;
                    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.2) 28%, transparent 30%), linear-gradient(135deg, var(--primary), var(--secondary));
                    border-radius: 50%;
                    box-shadow: 0 12px 24px var(--primary-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
                    position: relative;
                }

                .logo-orb::after {
                    content: '';
                    position: absolute;
                    top: 4px;
                    left: 4px;
                    width: 8px;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.4);
                    border-radius: 50%;
                }

                .logo-text {
                    font-size: 1.35rem;
                    font-weight: 700;
                    letter-spacing: -0.04em;
                    background: linear-gradient(to right, #ffffff, #d8e6ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .collapse-toggle {
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    border-radius: 999px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--text-muted);
                    transition: all 0.2s;
                    position: absolute;
                    right: -12px;
                    top: 30px;
                    z-index: 10;
                }

                .sidebar.collapsed .collapse-toggle {
                    right: auto;
                    top: 18px;
                    position: absolute;
                    transform: translateX(35px);
                }

                .collapse-toggle:hover {
                    color: var(--foreground);
                    border-color: rgba(255, 255, 255, 0.3);
                    background: rgba(255, 255, 255, 0.18);
                    transform: translateY(-1px);
                }

                .sidebar-nav {
                    flex: 1;
                    padding: 14px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 11px 14px;
                    background: rgba(255, 255, 255, 0.03);
                    border: none;
                    border-radius: 16px;
                    color: rgba(233, 242, 255, 0.74);
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.28s ease;
                    text-align: left;
                    white-space: nowrap;
                    width: 100%;
                    border: 1px solid transparent;
                    backdrop-filter: blur(16px);
                }

                .sidebar.collapsed .nav-item {
                    justify-content: center;
                    padding: 11px;
                }

                .nav-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--foreground);
                    border-color: rgba(255, 255, 255, 0.14);
                    transform: translateX(2px);
                }

                .nav-item.active {
                    background: linear-gradient(180deg, rgba(166, 196, 255, 0.24), rgba(137, 182, 255, 0.16));
                    color: #f7fbff;
                    border-color: rgba(196, 217, 255, 0.26);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 12px 24px rgba(116, 161, 255, 0.14);
                }

                .sidebar-footer {
                    padding: 18px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 0 6px;
                }

                .sidebar.collapsed .user-info {
                    justify-content: center;
                    padding: 0;
                }

                .user-avatar {
                    width: 34px;
                    height: 34px;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    color: #ffffff;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
                }

                .user-details {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .user-name {
                    font-size: 0.84rem;
                    font-weight: 500;
                    color: var(--foreground);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .logout-btn {
                    color: #f87171;
                }

                .logout-btn:hover {
                    background: rgba(248, 113, 113, 0.1);
                    color: #ef4444;
                }
            `}</style>
        </aside>
    );
}
