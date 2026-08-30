'use client';

import React from 'react';
import Auth from './Auth';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import SphereLogo from '@/components/brand/SphereLogo';

export default function LoginView() {
    const { t } = useTranslation();

    return (
        <div className="login-container">
            <div className="background-glow"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="login-card glass-card"
            >
                <div className="logo-section">
                    <SphereLogo width={240} height={60} />
                </div>

                <div className="content-section">
                    <h2 className="welcome-text">{t('auth.welcome')}</h2>
                    <p className="welcome-subtext">
                        {t('auth.welcome_sub')}
                    </p>
                </div>

                <div className="auth-section">
                    <Auth />
                </div>

                <div className="features-mini">
                    <div className="feature-dot"><span>{t('auth.features.formats')}</span></div>
                    <div className="feature-dot"><span>{t('auth.features.speed')}</span></div>
                    <div className="feature-dot"><span>{t('auth.features.visuals')}</span></div>
                </div>
            </motion.div>

            <style jsx>{`
                .login-container {
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--background);
                    overflow: hidden;
                    position: relative;
                    padding: 24px;
                }

                .background-glow {
                    position: absolute;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, var(--primary-glow) 28%, transparent 72%);
                    opacity: 0.75;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    filter: blur(110px);
                    pointer-events: none;
                }

                .login-card {
                    width: 100%;
                    max-width: 480px;
                    padding: 60px 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    z-index: 10;
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow-soft);
                }

                .logo-section {
                    margin-bottom: 32px;
                }

                .content-section {
                    margin-bottom: 40px;
                }

                .welcome-text {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: var(--text-primary);
                }

                .welcome-subtext {
                    color: var(--text-muted);
                    font-size: 1rem;
                    line-height: 1.6;
                }

                .auth-section {
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    margin-bottom: 48px;
                }

                .features-mini {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .feature-dot {
                    padding: 6px 14px;
                    background: var(--surface-light);
                    border: 1px solid var(--border);
                    border-radius: 999px;
                    font-size: 0.75rem;
                    color: var(--text-primary);
                    font-weight: 600;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
                }

            `}</style>
        </div>
    );
}
