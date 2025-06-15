
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  resolvedTheme: 'light',
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme', // Mesmo que ShadCN usa, para consistência
  ...props
}: ThemeProviderProps) {
  // Initialize theme state with defaultTheme; localStorage will be checked in useEffect
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    // Initial best guess for resolved theme (client will correct if system theme differs)
    return defaultTheme === 'dark' ? 'dark' : 'light';
  });

  // Effect to load theme from localStorage (runs only on client, after initial mount)
  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // If no theme in localStorage, set to defaultTheme (could be 'system')
      setTheme(defaultTheme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]); // Only re-run if storageKey changes (which is unlikely)

  // Effect to apply theme to DOM and update resolvedTheme (runs only on client)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let effectiveTheme = theme;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      effectiveTheme = systemTheme;
    }

    root.classList.add(effectiveTheme);
    setResolvedTheme(effectiveTheme as 'light' | 'dark');
  }, [theme]); // Re-run when theme state changes

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme); // Persist to localStorage
      setTheme(newTheme); // Update React state
    },
    resolvedTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
