'use client';

import React from 'react';
import Auth from './Auth';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/LanguageContext';

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
                    <div className="logo-orb-large"></div>
                    <h1 className="logo-text-large">Sphere</h1>
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
                    background:
                        radial-gradient(circle at top left, rgba(143, 180, 255, 0.2), transparent 28%),
                        radial-gradient(circle at bottom right, rgba(157, 244, 255, 0.18), transparent 26%),
                        linear-gradient(180deg, #0d1729 0%, #08111f 100%);
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
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    box-shadow: 0 28px 80px rgba(7, 15, 29, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.22);
                }

                .logo-orb-large {
                    width: 80px;
                    height: 80px;
                    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.22) 30%, transparent 32%), linear-gradient(135deg, var(--primary), var(--secondary));
                    border-radius: 50%;
                    box-shadow: 0 24px 50px var(--primary-glow), inset 0 1px 0 rgba(255, 255, 255, 0.38);
                    margin-bottom: 24px;
                    position: relative;
                    animation: floatOrb 6s ease-in-out infinite;
                }

                .logo-orb-large::after {
                    content: '';
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    width: 20px;
                    height: 20px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    filter: blur(2px);
                }

                .logo-text-large {
                    font-size: 3rem;
                    font-weight: 800;
                    letter-spacing: -0.06em;
                    margin-bottom: 32px;
                    background: linear-gradient(to right, #ffffff, #d8e6ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .content-section {
                    margin-bottom: 40px;
                }

                .welcome-text {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: #fff;
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
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    border-radius: 999px;
                    font-size: 0.75rem;
                    color: #e6eefc;
                    font-weight: 600;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
                }

                @keyframes floatOrb {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
            `}</style>
        </div>
    );
}
