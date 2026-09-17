'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Sun, Moon, Palette, X, ArrowUp } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { audio } from '@/lib/audio';

interface ThemeOnboardingHintProps {
  onOpenThemeSelector: () => void;
}

const STORAGE_KEY = 'stressbuster_theme_intro_seen';

export default function ThemeOnboardingHint({ onOpenThemeSelector }: ThemeOnboardingHintProps) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(true);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setHasDismissed(false);
        // Delay showing by 800ms for natural page load entrance
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsVisible(false);
    setHasDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      audio.playClickSound();
    } catch {}
  };

  const handleTryThemeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTheme();
    try {
      audio.playClickSound();
    } catch {}
    // Keep visible briefly so user sees the transformation, then dismiss after 2s
    setTimeout(() => {
      handleDismiss();
    }, 2500);
  };

  const handleOpenLab = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleDismiss();
    onOpenThemeSelector();
  };

  if (hasDismissed || !isVisible) return null;

  return (
    <>
      {/* Subtle pulsing indicator beacon attached next to the theme buttons */}
      <span className="absolute -top-1.5 -right-1 flex h-3 w-3 pointer-events-none z-20">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-portal-yellow opacity-85"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-portal-yellow border border-black shadow-neo-sm"></span>
      </span>

      {/* Floating Onboarding Popover Tooltip */}
      <div
        className="absolute top-full right-0 mt-3.5 w-72 sm:w-80 bg-portal-surface border-3 border-black rounded-2xl shadow-neo-lg p-3.5 z-50 animate-scaleIn select-none"
        role="dialog"
        aria-label="Theme Customization Hint"
      >
        {/* Upward Triangle Pointer targeting theme switch buttons */}
        <div className="absolute -top-2.5 right-6 sm:right-9 w-4 h-4 bg-portal-surface border-t-3 border-l-3 border-black rotate-45" />

        {/* Decorative Top Accent */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded-md bg-portal-yellow text-black text-[9px] font-black uppercase tracking-wider border border-black shadow-neo-sm flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>DISCOVER</span>
            </span>
            <span className="text-[11px] font-black uppercase text-white tracking-tight">
              Theme Switcher
            </span>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg bg-portal-card hover:bg-portal-pink text-slate-300 hover:text-black border border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5"
            title="Dismiss hint"
            aria-label="Close theme hint"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-200 font-bold leading-snug mb-3">
          Switch anytime between <span className="text-portal-cyan font-black">Neo-Dark</span> & <span className="text-portal-yellow font-black">Neo-Light</span> modes, or customize retro styles!
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTryThemeToggle}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            title="Preview alternate theme"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Try Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Try Dark</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenLab}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-portal-card hover:bg-portal-purple text-slate-100 hover:text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            title="Open Design Engine"
          >
            <Palette className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Theme Lab</span>
          </button>

          <button
            onClick={handleDismiss}
            className="px-2 py-1.5 rounded-xl bg-portal-surface hover:bg-slate-700 text-slate-300 hover:text-white font-black text-xs uppercase border border-black shadow-neo-sm transition-all"
            title="Got it"
          >
            OK
          </button>
        </div>
      </div>
    </>
  );
}
