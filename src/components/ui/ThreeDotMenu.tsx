'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

interface MenuItem {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'danger' | 'default';
}

interface ThreeDotMenuProps {
    items: MenuItem[];
}

export default function ThreeDotMenu({ items }: ThreeDotMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.right - 160 + window.scrollX // 160 is min-width
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('scroll', updateCoords);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="three-dot-menu" onClick={(e) => e.stopPropagation()}>
            <button
                ref={triggerRef}
                className="menu-toggle"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                aria-label="Actions"
            >
                <MoreVertical size={18} />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="menu-dropdown glass-card animate-in zoom-in duration-150"
                    ref={menuRef}
                    style={{
                        position: 'absolute',
                        top: `${coords.top + 8}px`,
                        left: `${coords.left}px`,
                        zIndex: 9999,
                    }}
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            className={`menu-item ${item.variant === 'danger' ? 'danger' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                item.onClick();
                                setIsOpen(false);
                            }}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>,
                document.body
            )}

            <style jsx>{`
                .three-dot-menu {
                    position: relative;
                    display: inline-block;
                }
                .menu-toggle {
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.28s ease;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
                }
                .menu-toggle:hover {
                    background: rgba(255, 255, 255, 0.12);
                    color: var(--foreground);
                    border-color: rgba(255, 255, 255, 0.22);
                }
                .menu-dropdown {
                    min-width: 160px;
                    padding: 8px;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
                    backdrop-filter: blur(28px) saturate(180%);
                    -webkit-backdrop-filter: blur(28px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    box-shadow: 0 22px 44px rgba(7, 15, 29, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.18);
                    border-radius: 22px;
                }
                .menu-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 10px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 14px;
                    color: var(--foreground);
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.28s ease;
                    text-align: left;
                }
                .menu-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--foreground);
                }
                .menu-item.danger {
                    color: #f87171;
                }
                .menu-item.danger:hover {
                    background: rgba(248, 113, 113, 0.14);
                    color: #ef4444;
                }
            `}</style>
        </div>
    );
}
