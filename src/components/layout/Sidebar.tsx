'use client';

import React from 'react';
import { Home, Database, Upload, LogOut, Activity as SphereIcon, Settings } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import SphereLogo from '@/components/brand/SphereLogo';

interface SidebarProps {
    activeView: 'home' | 'datasets' | 'upload' | 'reports' | 'settings';
    onViewChange: (view: 'home' | 'datasets' | 'upload' | 'reports' | 'settings') => void;
    onLogout: () => void;
    userName?: string;
    mobileMode?: boolean;
    mobileOpen?: boolean;
    compactMode?: boolean;
}

export default function Sidebar({ activeView, onViewChange, onLogout, userName, mobileMode = false, mobileOpen = false, compactMode = false }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const { t } = useTranslation();

    React.useEffect(() => {
        if (mobileMode) return;
        setIsCollapsed(compactMode);
    }, [compactMode, mobileMode]);

    const menuItems = [
        { id: 'home', label: t('sidebar.home'), icon: <Home size={20} /> },
        { id: 'datasets', label: t('sidebar.datasets'), icon: <Database size={20} /> },
        { id: 'reports', label: t('sidebar.reports'), icon: <SphereIcon size={20} /> },
        { id: 'upload', label: t('sidebar.upload'), icon: <Upload size={20} /> },
        { id: 'settings', label: t('sidebar.settings'), icon: <Settings size={20} /> },
    ];

    const toggleCollapse = () => {
        if (compactMode) return;
        setIsCollapsed(!isCollapsed);
    };
    const showLabels = mobileMode || (!isCollapsed && !compactMode);
    const isRailMode = compactMode && !mobileMode;

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileMode ? 'mobile-mode' : ''} ${mobileOpen ? 'mobile-open' : ''} ${isRailMode ? 'rail-mode' : ''}`}>
            <div className="sidebar-header">
                <div className="logo-container">
                    <SphereLogo compact={!showLabels} width={130} height={32} />
                </div>
                <button
                    className="collapse-toggle"
                    onClick={toggleCollapse}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <span className={`panel-toggle-icon ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`} aria-hidden="true">
                        <span className="panel-toggle-main" />
                        <span className="panel-toggle-side" />
                    </span>
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => onViewChange(item.id as 'home' | 'datasets' | 'upload' | 'reports')}
                        title={!showLabels ? item.label : undefined}
                    >
                        {item.icon}
                        {showLabels && <span>{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                {userName && (
                    <div className="user-info">
                        <div className="user-avatar">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        {showLabels && (
                            <div className="user-details">
                                <span className="user-name">{userName}</span>
                            </div>
                        )}
                    </div>
                )}
                <button
                    className="nav-item logout-btn"
                    onClick={onLogout}
                    title={!showLabels ? t('sidebar.logout') : undefined}
                >
                    <LogOut size={20} />
                    {showLabels && <span>{t('sidebar.logout')}</span>}
                </button>
            </div>

            <style jsx>{`
                .sidebar {
                    width: 204px;
                    height: 100vh;
                    background: var(--shell-sidebar-bg);
                    backdrop-filter: blur(18px) saturate(140%);
                    -webkit-backdrop-filter: blur(18px) saturate(140%);
                    border-right: 1px solid var(--border);
                    box-shadow: var(--shell-sidebar-shadow);
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

                .sidebar.rail-mode {
                    width: 64px;
                }

                .sidebar.mobile-mode {
                    position: fixed;
                    inset: 0 auto 0 0;
                    width: min(78vw, 280px);
                    transform: translateX(-105%);
                    transition: transform 0.28s ease, width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 210;
                }

                .sidebar.mobile-mode.mobile-open {
                    transform: translateX(0);
                }

                .sidebar-header {
                    padding: 12px 12px 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    min-height: 52px;
                }

                .sidebar.collapsed .sidebar-header {
                    padding: 12px 10px 10px;
                    justify-content: space-between;
                }

                .sidebar.rail-mode .sidebar-header {
                    padding: 12px 10px 10px;
                    justify-content: center;
                }

                .sidebar.mobile-mode .sidebar-header {
                    padding: 12px 12px 10px;
                    justify-content: space-between;
                }

                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                }

                .collapse-toggle {
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--text-muted);
                    transition: background 0.2s ease, color 0.2s ease;
                    position: relative;
                    flex: none;
                }

                .sidebar.rail-mode .collapse-toggle {
                    display: none;
                }

                .sidebar.collapsed .collapse-toggle {
                    width: 26px;
                    height: 26px;
                }

                .collapse-toggle:hover {
                    color: var(--foreground);
                    background: var(--shell-control-hover);
                }

                .collapse-toggle:focus-visible {
                    outline: none;
                    background: var(--shell-control-hover);
                    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 18%, transparent);
                }

                .panel-toggle-icon {
                    width: 17px;
                    height: 17px;
                    border: 1px solid currentColor;
                    border-radius: 4px;
                    display: grid;
                    grid-template-columns: 1fr 4px;
                    overflow: hidden;
                    opacity: 0.84;
                }

                .panel-toggle-main,
                .panel-toggle-side {
                    display: block;
                    height: 100%;
                }

                .panel-toggle-main {
                    background: transparent;
                }

                .panel-toggle-side {
                    border-left: 1px solid currentColor;
                    background: color-mix(in srgb, currentColor 16%, transparent);
                }

                .panel-toggle-icon.is-collapsed {
                    grid-template-columns: 4px 1fr;
                }

                .panel-toggle-icon.is-collapsed .panel-toggle-side {
                    order: -1;
                    border-left: none;
                    border-right: 1px solid currentColor;
                }

                .sidebar-nav {
                    flex: 1;
                    padding: 10px 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .sidebar.rail-mode .sidebar-nav {
                    padding: 8px 8px 10px;
                    gap: 6px;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 11px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: var(--text-muted);
                    font-size: 0.92rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.28s ease;
                    text-align: left;
                    white-space: nowrap;
                    width: 100%;
                    border: 1px solid transparent;
                    position: relative;
                    overflow: hidden;
                }

                .sidebar.collapsed .nav-item {
                    justify-content: center;
                    padding: 11px;
                }

                .sidebar.rail-mode .nav-item {
                    justify-content: center;
                    padding: 12px 10px;
                }

                .sidebar.mobile-mode .nav-item {
                    justify-content: flex-start;
                    padding: 13px 12px;
                }

                .nav-item:hover {
                    background: var(--shell-control-bg);
                    color: var(--foreground);
                    border-color: var(--shell-active-border);
                }

                .nav-item.active {
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        color-mix(in srgb, var(--shell-active-bg) 86%, transparent) 34%,
                        color-mix(in srgb, var(--primary) 14%, var(--shell-active-bg)) 100%
                    );
                    color: var(--foreground);
                    border-color: transparent;
                    border-radius: 0;
                    box-shadow: none;
                }

                .nav-item.active::after {
                    content: '';
                    position: absolute;
                    right: 0;
                    top: 7px;
                    bottom: 7px;
                    width: 2px;
                    background: linear-gradient(180deg, color-mix(in srgb, var(--secondary) 32%, #ffffff), var(--primary));
                    box-shadow: 0 0 14px color-mix(in srgb, var(--primary) 36%, transparent);
                }

                .nav-item.active::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        transparent 18%,
                        color-mix(in srgb, var(--primary) 7%, transparent) 100%
                    );
                    pointer-events: none;
                }

                .sidebar-footer {
                    padding: 14px 8px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                }

                .sidebar.rail-mode .sidebar-footer {
                    padding: 14px 8px 16px;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    border-radius: 12px;
                    background: var(--shell-user-bg);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                }

                .sidebar.collapsed .user-info {
                    justify-content: center;
                    padding: 0;
                }

                .sidebar.rail-mode .user-info {
                    justify-content: center;
                    padding: 0;
                    background: transparent;
                    border-color: transparent;
                }

                .user-avatar {
                    width: 34px;
                    height: 34px;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
                    border: 1px solid rgba(255, 255, 255, 0.1);
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
                    color: var(--danger-text);
                }

                .logout-btn:hover {
                    background: color-mix(in srgb, var(--danger-text) 10%, transparent);
                    color: var(--danger-text);
                }

                @media (max-width: 720px) {
                    .collapse-toggle {
                        display: none !important;
                    }
                }
            `}</style>
        </aside>
    );
}
