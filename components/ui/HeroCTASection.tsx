'use client';

import React from 'react';
import { Zap, Trophy, Gamepad2, Sparkles, Play, Flame, Shield, ArrowRight, Dices } from 'lucide-react';

interface HeroCTASectionProps {
  onQuickPlay: () => void;
  onOpenLeaderboard: () => void;
  onOpenRoulette: () => void;
}

export default function HeroCTASection({
  onQuickPlay,
  onOpenLeaderboard,
  onOpenRoulette,
}: HeroCTASectionProps) {
  return (
    <section className="my-8 relative overflow-hidden bg-portal-card border-4 border-black p-6 sm:p-8 shadow-neo-lg rounded-2xl sm:rounded-3xl">
      {/* Neo Background Glow & Dots */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-portal-yellow/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-portal-pink/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left text column */}
        <div className="space-y-4 text-center lg:text-left max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-portal-pink text-black font-black text-xs uppercase tracking-widest border-2 border-black shadow-neo-sm rounded-xl">
            <Flame className="w-4 h-4 text-black fill-black" />
            <span>INSTANT STRESS RELIEF • ZERO LAG</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
            Ready to <span className="text-portal-yellow">Bust Some Stress?</span> Play Now!
          </h2>

          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
            Jump straight into 22+ instant HTML5 retro mini-games. No sign-ups, zero installs, pure arcade adrenaline. Compete on global leaderboards, earn XP, and unlock daily trophies.
          </p>

          {/* Value props list */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1 text-xs font-black uppercase text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5 bg-portal-surface px-2.5 py-1 border-2 border-black rounded-lg shadow-neo-sm">
              <Zap className="w-3.5 h-3.5 text-portal-lime stroke-[2.5]" />
              Instant 60 FPS
            </span>
            <span className="flex items-center gap-1.5 bg-portal-surface px-2.5 py-1 border-2 border-black rounded-lg shadow-neo-sm">
              <Gamepad2 className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
              Mobile Gamepad Ready
            </span>
            <span className="flex items-center gap-1.5 bg-portal-surface px-2.5 py-1 border-2 border-black rounded-lg shadow-neo-sm">
              <Trophy className="w-3.5 h-3.5 text-portal-yellow stroke-[2.5]" />
              Live Global Ranks
            </span>
          </div>
        </div>

        {/* Right Action Deck */}
        <div className="flex flex-col w-full sm:w-auto shrink-0 gap-3 min-w-[280px]">
          <button
            type="button"
            onClick={onQuickPlay}
            className="w-full px-6 py-4 bg-portal-yellow text-black font-black uppercase text-sm sm:text-base tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 group rounded-2xl"
          >
            <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
            <span>LAUNCH QUICK PLAY</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={onOpenRoulette}
              className="flex-1 px-4 py-3 bg-portal-cyan text-black font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 rounded-xl"
            >
              <Dices className="w-4 h-4" />
              <span>ROULETTE</span>
            </button>

            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="flex-1 px-4 py-3 bg-portal-surface text-portal-lime font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 rounded-xl"
            >
              <Trophy className="w-4 h-4" />
              <span>RANKS</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
