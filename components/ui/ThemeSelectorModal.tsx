'use client';

import React from 'react';
import { X, Palette, Check, Sun, Moon, Zap, Gamepad2, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { ThemeDefinition, ThemeId } from '@/lib/theme';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeSelectorModal({ isOpen, onClose }: ThemeSelectorModalProps) {
  const { theme, setTheme, availableThemes } = useTheme();

  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sun':
        return <Sun className="w-4 h-4 stroke-[2.5]" />;
      case 'Moon':
        return <Moon className="w-4 h-4 stroke-[2.5]" />;
      case 'Zap':
        return <Zap className="w-4 h-4 stroke-[2.5]" />;
      case 'Gamepad2':
        return <Gamepad2 className="w-4 h-4 stroke-[2.5]" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 stroke-[2.5]" />;
      default:
        return <Palette className="w-4 h-4 stroke-[2.5]" />;
    }
  };

  const activeThemes = availableThemes.filter(t => t.status === 'active');
  const upcomingThemes = availableThemes.filter(t => t.status === 'upcoming');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-portal-surface border-4 border-black rounded-2xl sm:rounded-3xl shadow-neo-lg z-10 flex flex-col p-4 sm:p-6 space-y-5 scrollbar-thin">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black rounded-t-2xl sm:rounded-t-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-3 border-black pb-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-portal-yellow border-2 border-black flex items-center justify-center shadow-neo-sm text-black">
              <Palette className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                Design & Theme Engine
              </h2>
              <p className="text-xs text-slate-300 font-bold">
                Toggle portal styles or preview future UI themes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-portal-card hover:bg-portal-pink text-white hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Section 1: Active Themes (Interactive) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-portal-cyan tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              Active Portal Themes
            </span>
            <span className="text-[10px] font-black uppercase bg-portal-lime text-black px-2 py-0.5 rounded-md border border-black shadow-neo-sm">
              Instant Switch
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {activeThemes.map((item) => {
              const isSelected = theme === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setTheme(item.id)}
                  className={`group relative p-4 rounded-2xl border-3 border-black cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-portal-card shadow-neo ring-2 ring-portal-cyan translate-x-0.5 translate-y-0.5'
                      : 'bg-portal-card shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-neo'
                  }`}
                >
                  {/* Top Bar of Theme Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center shadow-neo-sm text-black"
                        style={{ backgroundColor: item.previewColors.accent }}
                      >
                        {renderIcon(item.icon)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-portal-cyan transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-[10px] font-bold text-portal-yellow uppercase">
                          {item.tagline}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-portal-cyan text-black text-[10px] font-black border border-black shadow-neo-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-portal-surface text-slate-300 group-hover:text-white text-[10px] font-black border border-black transition-colors">
                        SELECT
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 font-bold leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Visual Theme Palette Swatches */}
                  <div className="pt-2 border-t-2 border-black/40 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Palette:</span>
                      <div className="flex items-center -space-x-1">
                        <div
                          className="w-4 h-4 rounded-full border border-black shadow-sm"
                          style={{ backgroundColor: item.previewColors.bg }}
                          title="Background Ground"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black shadow-sm"
                          style={{ backgroundColor: item.previewColors.card }}
                          title="Card Surface"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black shadow-sm"
                          style={{ backgroundColor: item.previewColors.accent }}
                          title="Primary Accent"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black shadow-sm"
                          style={{ backgroundColor: item.previewColors.accentSecondary }}
                          title="Secondary Accent"
                        />
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme(item.id);
                      }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border-2 border-black shadow-neo-sm transition-all ${
                        isSelected
                          ? 'bg-portal-cyan text-black'
                          : 'bg-portal-surface text-white hover:bg-portal-yellow hover:text-black'
                      }`}
                    >
                      {isSelected ? 'Applied' : 'Apply Theme'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Future / Upcoming Themes (Design Lab) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-t-2 border-black/40 pt-4">
            <span className="text-xs font-black uppercase text-portal-yellow tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 stroke-[2.5]" />
              Theme Lab (Future UI Designs)
            </span>
            <span className="text-[10px] font-black uppercase bg-portal-pink text-black px-2 py-0.5 rounded-md border border-black shadow-neo-sm">
              In Roadmap
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingThemes.map((item) => (
              <div
                key={item.id}
                className="relative p-3 rounded-2xl bg-portal-card/60 border-2 border-black/80 flex flex-col justify-between space-y-2 opacity-85 hover:opacity-100 transition-opacity shadow-neo-sm"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-md border border-black flex items-center justify-center text-black text-xs"
                      style={{ backgroundColor: item.previewColors.accent }}
                    >
                      {renderIcon(item.icon)}
                    </div>
                    <h4 className="text-xs font-black text-white truncate uppercase">
                      {item.name}
                    </h4>
                  </div>
                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-portal-surface text-portal-yellow border border-black shrink-0">
                    {item.badge || 'SOON'}
                  </span>
                </div>

                <p className="text-[10px] text-slate-300 font-bold line-clamp-2">
                  {item.description}
                </p>

                {/* Swatches & Disabled Trigger */}
                <div className="flex items-center justify-between pt-1 border-t border-black/30">
                  <div className="flex items-center -space-x-1">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black"
                      style={{ backgroundColor: item.previewColors.bg }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black"
                      style={{ backgroundColor: item.previewColors.card }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black"
                      style={{ backgroundColor: item.previewColors.accent }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Coming
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t-3 border-black flex items-center justify-between">
          <p className="text-[11px] text-slate-300 font-bold">
            Theme preference is automatically saved locally.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
