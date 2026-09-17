'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeId, ThemeDefinition, THEMES_REGISTRY, DEFAULT_THEME, THEME_STORAGE_KEY, getTheme } from '@/lib/theme';
import { audio } from '@/lib/audio';

interface ThemeContextType {
  theme: ThemeId;
  themeDef: ThemeDefinition;
  isDark: boolean;
  setTheme: (id: ThemeId) => void;
  toggleTheme: () => void;
  isThemeSelectorOpen: boolean;
  setIsThemeSelectorOpen: (open: boolean) => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  // Apply theme to DOM and dispatch custom event
  const applyThemeToDOM = useCallback((newTheme: ThemeId) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const def = getTheme(newTheme);

    root.setAttribute('data-theme', newTheme);
    if (def.isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Custom event for any dynamic listeners (canvas games, visuals, audio)
    window.dispatchEvent(
      new CustomEvent('stressbuster_theme_changed', {
        detail: { theme: newTheme, isDark: def.isDark, definition: def }
      })
    );
  }, []);

  // Initialize theme from LocalStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
      if (savedTheme && THEMES_REGISTRY.some(t => t.id === savedTheme)) {
        setThemeState(savedTheme);
        applyThemeToDOM(savedTheme);
      } else {
        applyThemeToDOM(DEFAULT_THEME);
      }
    } catch {
      applyThemeToDOM(DEFAULT_THEME);
    }
    setMounted(true);
  }, [applyThemeToDOM]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    const targetDef = getTheme(newTheme);
    // Only switch if theme is active
    if (targetDef.status !== 'active') return;

    setThemeState(newTheme);
    applyThemeToDOM(newTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}

    try {
      audio.playClickSound();
    } catch {}
  }, [applyThemeToDOM]);

  const toggleTheme = useCallback(() => {
    let nextTheme: ThemeId;
    if (theme === 'cozy-dark') {
      nextTheme = 'cozy-light';
    } else if (theme === 'cozy-light') {
      nextTheme = 'cozy-dark';
    } else if (theme === 'neo-dark') {
      nextTheme = 'neo-light';
    } else if (theme === 'neo-light') {
      nextTheme = 'neo-dark';
    } else {
      const def = getTheme(theme);
      nextTheme = def.isDark ? 'neo-light' : 'neo-dark';
    }
    setTheme(nextTheme);
  }, [theme, setTheme]);

  const currentThemeDef = getTheme(theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeDef: currentThemeDef,
        isDark: currentThemeDef.isDark,
        setTheme,
        toggleTheme,
        isThemeSelectorOpen,
        setIsThemeSelectorOpen,
        availableThemes: THEMES_REGISTRY,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
