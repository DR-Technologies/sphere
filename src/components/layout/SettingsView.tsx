'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Globe } from 'lucide-react';

export default function SettingsView() {
    const { language, setLanguage, t } = useTranslation();

    return (
        <div style={{ padding: '40px', maxWidth: '800px' }}>
            <header style={{ marginBottom: '48px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>
                    {t('settings.title')}
                </h1>
            </header>

            <section className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div className="icon-wrapper">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>
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

            <style jsx>{`
                .icon-wrapper {
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
                    color: #ffffff;
                    padding: 12px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
                }

                .lang-btn {
                    flex: 1;
                    padding: 16px;
                    border-radius: 18px;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    background: rgba(255, 255, 255, 0.08);
                    color: var(--foreground);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.28s ease;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
                }

                .lang-btn:hover {
                    background: rgba(255, 255, 255, 0.12);
                    border-color: rgba(255, 255, 255, 0.24);
                    transform: translateY(-1px);
                }

                .lang-btn.active {
                    background: linear-gradient(180deg, rgba(166, 196, 255, 0.28), rgba(137, 182, 255, 0.16));
                    border-color: rgba(196, 217, 255, 0.28);
                    color: #ffffff;
                    box-shadow: 0 18px 34px rgba(116, 161, 255, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
