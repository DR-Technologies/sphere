'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type SphereTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: SphereTheme;
  setTheme: (theme: SphereTheme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'sphere_theme';
const COOKIE_KEY = 'sphere_theme';
const DEFAULT_THEME: SphereTheme = 'dark';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyThemeToDocument(theme: SphereTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(theme);
}

function persistTheme(theme: SphereTheme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, theme);
  document.cookie = `${COOKIE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeProvider({ children, initialTheme = DEFAULT_THEME }: { children: React.ReactNode; initialTheme?: SphereTheme }) {
  const [theme, setThemeState] = useState<SphereTheme>(initialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    persistTheme(theme);
  }, [theme]);

  const setTheme = (nextTheme: SphereTheme) => {
    setThemeState(nextTheme);
  };

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark')
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
