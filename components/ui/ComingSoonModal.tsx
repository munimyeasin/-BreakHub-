'use client';

import React, { useState } from 'react';
import { X, Sparkles, Rocket, Gamepad2, ArrowRight, ShieldCheck, Clock, Flame, Users } from 'lucide-react';
import { Game } from '@/lib/types';

interface ComingSoonModalProps {
  game: Game | null;
  isHyped?: boolean;
  onToggleHype?: (gameId: string) => void;
  onClose: () => void;
  onExploreOtherGames?: () => void;
}

export default function ComingSoonModal({
  game,
  isHyped = false,
  onToggleHype,
  onClose,
  onExploreOtherGames
}: ComingSoonModalProps) {
  const [animatingHype, setAnimatingHype] = useState(false);

  if (!game) return null;

  const currentHype = game.hype_count || 0;
  // Calculate milestone target (e.g. 200, 500, etc.)
  const milestoneTarget = currentHype < 100 ? 100 : currentHype < 250 ? 250 : 500;
  const milestonePercent = Math.min(100, Math.round((currentHype / milestoneTarget) * 100));

  const playHypeSound = (hyping: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (hyping) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {}
  };

  const handleHypeClick = () => {
    setAnimatingHype(true);
    setTimeout(() => setAnimatingHype(false), 600);
    playHypeSound(!isHyped);
    if (onToggleHype) {
      onToggleHype(game.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-portal-bg border border-portal-border rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col space-y-4 sm:space-y-5 overflow-hidden">
        {/* Cyber Neon Ambient Glow in Background */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-portal-cyan/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-portal-surface text-slate-400 hover:text-white border border-portal-border z-10 transition-colors"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Visual Cyber Badge */}
        <div className="text-center space-y-2.5 pt-1">
          <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-portal-surface border-2 border-amber-500/60 p-1 shadow-glow-gold flex items-center justify-center">
            <img
              src={game.thumbnail_url}
              alt={game.title}
              className="w-full h-full rounded-xl object-cover bg-slate-900 filter brightness-90"
            />
            <div className="absolute -bottom-2.5 -right-2.5 p-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full border border-white text-black shadow-lg">
              <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-portal-gold text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Coming Soon • In Development</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {game.title}
            </h2>
            <p className="text-[11px] font-black uppercase tracking-widest text-portal-cyan mt-0.5">
              {game.category} EDITION
            </p>
          </div>
        </div>

        {/* Game Brief & Status Box */}
        <div className="bg-portal-surface/90 border border-portal-border rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-300">
          <p className="leading-relaxed text-slate-300 text-[11px] sm:text-xs">
            {game.description}
          </p>

          <div className="pt-2 border-t border-portal-border/60 flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <span className="flex items-center gap-1 text-amber-400">
              <Rocket className="w-3 h-3" />
              Engineering in Progress
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Canvas Engine Ready
            </span>
          </div>
        </div>

        {/* Interactive Hype & Player Interest Section */}
        <div className="bg-gradient-to-br from-amber-950/30 via-portal-surface to-slate-900 border border-amber-500/40 rounded-2xl p-3.5 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Player Interest Tracker
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-white bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentHype} Hyped</span>
            </div>
          </div>

          {/* Milestone Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-slate-400">
              <span>Community Release Priority</span>
              <span className="text-amber-400">{currentHype} / {milestoneTarget} votes ({milestonePercent}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/60 border border-amber-500/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-500 shadow-glow-gold"
                style={{ width: `${milestonePercent}%` }}
              />
            </div>
          </div>

          {/* Interactive Hype Button */}
          <button
            onClick={handleHypeClick}
            className={`w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
              isHyped
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.6)] border-2 border-white'
                : 'bg-portal-surface/80 hover:bg-amber-500/20 text-amber-300 border-2 border-amber-500/60 hover:border-amber-400 hover:shadow-glow-gold'
            } ${animatingHype ? 'scale-105' : ''}`}
          >
            <Flame className={`w-4 h-4 ${isHyped ? 'fill-black text-black' : 'text-amber-400 animate-pulse'}`} />
            <span>{isHyped ? '🔥 INTEREST REGISTERED! (HYPED)' : '🔥 HYPE THIS GAME (+1)'}</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-0.5">
          <button
            onClick={() => {
              onClose();
              if (onExploreOtherGames) onExploreOtherGames();
            }}
            className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-portal-cyan to-blue-600 text-black font-black text-xs sm:text-sm shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>PLAY OTHER MINI-GAMES</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-portal-surface hover:bg-portal-card border border-portal-border text-slate-400 hover:text-white font-bold text-xs transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
