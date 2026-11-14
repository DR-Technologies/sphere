'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Globe, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import AccountSettings from '@/components/settings/AccountSettings';

export default function SettingsView() {
    const { language, setLanguage, t } = useTranslation();
    const { theme, setTheme } = useTheme();

    return (
        <div style={{ padding: '40px', maxWidth: '800px' }}>
            <header style={{ marginBottom: '48px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>
                    {t('settings.title')}
                </h1>
            </header>

            <AccountSettings />

            <section className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div className="icon-wrapper">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t('settings.language')}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {t('settings.select_language')}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setLanguage('en')}
                        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                    >
                        {t('settings.english')}
                    </button>
                    <button
                        onClick={() => setLanguage('es')}
                        className={`lang-btn ${language === 'es' ? 'active' : ''}`}
                    >
                        {t('settings.spanish')}
                    </button>
                </div>
            </section>

            <section className="glass-card" style={{ padding: '32px', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div className="icon-wrapper">
                        {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t('settings.appearance')}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {t('settings.select_theme')}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`lang-btn ${theme === 'dark' ? 'active' : ''}`}
                    >
                        <Moon size={16} />
                        {t('settings.dark_mode')}
                    </button>
                    <button
                        onClick={() => setTheme('light')}
                        className={`lang-btn ${theme === 'light' ? 'active' : ''}`}
                    >
                        <Sun size={16} />
                        {t('settings.light_mode')}
                    </button>
                </div>
            </section>

            <style jsx>{`
                .icon-wrapper {
                    background: var(--surface-light);
                    color: var(--primary);
                    padding: 12px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
                }

                .lang-btn {
                    flex: 1;
                    padding: 16px;
                    border-radius: 14px;
                    border: 1px solid var(--border);
                    background: var(--surface-light);
                    color: var(--foreground);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.28s ease;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .lang-btn:hover {
                    background: var(--surface-hover);
                    border-color: var(--border);
                    transform: translateY(-1px);
                }

                .lang-btn.active {
                    background: linear-gradient(180deg, var(--primary), var(--primary));
                    border-color: var(--primary);
                    color: var(--shell-inverse-text);
                    box-shadow: 0 18px 34px var(--primary-glow), inset 0 1px 0 rgba(255, 255, 255, 0.16);
                }
            `}</style>
        </div>
    );
}
