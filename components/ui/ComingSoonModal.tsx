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
      <div className="relative w-full max-w-md bg-portal-surface border-4 border-black shadow-neo-lg rounded-2xl p-5 sm:p-6 text-white space-y-4 overflow-hidden">
        {/* Top Decorative Color Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-portal-card hover:bg-portal-pink border-2 border-black text-white hover:text-black font-black z-10 transition-all hover:translate-x-0.5 hover:translate-y-0.5"
          title="Close Modal"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Header with Visual Arcade Badge */}
        <div className="text-center space-y-2.5 pt-1">
          <div className="game-thumbnail-container relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-portal-card border-3 border-black p-1 shadow-neo-sm flex items-center justify-center">
            <img
              src={game.thumbnail_url}
              alt={game.title}
              className="game-thumbnail-img w-full h-full rounded-xl object-cover"
            />
            <div className="absolute -bottom-2.5 -right-2.5 p-1.5 bg-portal-yellow rounded-lg border-2 border-black text-black shadow-neo-sm">
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-portal-pink border-2 border-black text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1.5 shadow-neo-sm">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Coming Soon • In Development</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              {game.title}
            </h2>
            <p className="text-[11px] font-black uppercase tracking-widest text-portal-yellow mt-0.5">
              {game.category} EDITION
            </p>
          </div>
        </div>

        {/* Game Brief & Status Box */}
        <div className="bg-portal-card border-2 border-black shadow-neo-sm rounded-xl p-3.5 space-y-2.5 text-xs text-slate-300">
          <p className="leading-relaxed text-slate-200 text-[11px] sm:text-xs font-bold">
            {game.description}
          </p>

          <div className="pt-2 border-t-2 border-black flex items-center justify-between text-[11px] font-black">
            <span className="flex items-center gap-1.5 text-portal-yellow">
              <Rocket className="w-3.5 h-3.5 stroke-[2.5]" />
              Engineering in Progress
            </span>
            <span className="flex items-center gap-1.5 text-portal-lime">
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              Canvas Engine Ready
            </span>
          </div>
        </div>

        {/* Interactive Hype & Player Interest Section */}
        <div className="bg-portal-card border-3 border-black shadow-neo rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-portal-yellow fill-portal-yellow" />
              <span className="text-xs font-black uppercase tracking-wider text-portal-yellow">
                Player Interest Tracker
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-black bg-portal-yellow px-2 py-0.5 rounded-md border-2 border-black shadow-neo-sm">
              <Users className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              <span>{currentHype} Hyped</span>
            </div>
          </div>

          {/* Milestone Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase text-slate-300">
              <span>Community Release Priority</span>
              <span className="text-portal-yellow">{currentHype} / {milestoneTarget} votes ({milestonePercent}%)</span>
            </div>
            <div className="w-full h-3 rounded-lg bg-black border-2 border-black overflow-hidden">
              <div
                className="h-full bg-portal-yellow transition-all duration-500 border-r-2 border-black"
                style={{ width: `${milestonePercent}%` }}
              />
            </div>
          </div>

          {/* Interactive Hype Button */}
          <button
            onClick={handleHypeClick}
            className={`w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 border-3 border-black transition-all ${
              isHyped
                ? 'bg-portal-yellow text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5'
                : 'bg-portal-surface hover:bg-portal-pink text-white hover:text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5'
            } ${animatingHype ? 'scale-105' : ''}`}
          >
            <Flame className={`w-4 h-4 ${isHyped ? 'fill-black text-black' : 'text-portal-yellow animate-pulse'}`} />
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
            className="w-full py-2.5 sm:py-3 rounded-xl bg-portal-cyan text-black font-black text-xs sm:text-sm border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <Gamepad2 className="w-4 h-4 stroke-[2.5]" />
            <span>PLAY OTHER MINI-GAMES</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-portal-card hover:bg-portal-surface border-2 border-black text-slate-300 hover:text-white font-black text-xs transition-all uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
