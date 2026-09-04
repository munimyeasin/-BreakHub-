'use client';

import React, { useEffect } from 'react';
import { Sparkles, Trophy, Zap, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audio } from '@/lib/audio';
import { LevelInfo } from '@/lib/gamification';

interface LevelUpCelebrationModalProps {
  levelInfo: LevelInfo | null;
  onClose: () => void;
  onOpenTrophies?: () => void;
}

export default function LevelUpCelebrationModal({
  levelInfo,
  onClose,
  onOpenTrophies,
}: LevelUpCelebrationModalProps) {
  useEffect(() => {
    if (!levelInfo) return;

    // Trigger audio fanfare
    audio.playLevelUpSound();

    // Trigger double confetti blast
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#06b6d4', '#a855f7', '#fbbf24', '#ec4899', '#22c55e'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, [levelInfo]);

  if (!levelInfo) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-portal-bg to-slate-950 border-2 border-cyan-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(6,182,212,0.5)] text-center overflow-hidden flex flex-col items-center">

        {/* Background Radiant Glow Rings */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Floating Cyber Badge Icon */}
        <div className="relative mb-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-purple-600 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.8)] border border-white/30 animate-bounce">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-black fill-black" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-amber-400 text-black font-black text-xs shadow-lg border border-amber-300">
            ★ LVL {levelInfo.level}
          </span>
        </div>

        {/* Heading */}
        <p className="text-xs font-black uppercase tracking-widest text-portal-cyan mb-1 flex items-center gap-1.5 justify-center">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>CYBER RANK EVOLUTION</span>
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
        </p>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-2">
          LEVEL UP!
        </h2>

        {/* Rank Title Box */}
        <div className="w-full py-3 px-4 my-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-purple-950/60 to-slate-900 border border-cyan-500/40 shadow-inner">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            New Clearance Title Unlocked
          </p>
          <p className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-portal-cyan via-teal-300 to-amber-300 mt-0.5">
            {levelInfo.title}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xs mb-6 leading-relaxed">
          Your reflexes and neural endurance have ascended. Keep busting stress to unlock legendary vault trophies!
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-portal-cyan via-teal-400 to-portal-neon text-black font-black text-sm tracking-wide shadow-glow-cyan hover:scale-[1.02] active:scale-95 transition-all"
          >
            CONTINUE DOMINATION
          </button>

          {onOpenTrophies && (
            <button
              onClick={() => {
                onClose();
                onOpenTrophies();
              }}
              className="w-full py-2.5 rounded-xl bg-portal-surface/60 border border-portal-border hover:border-amber-400 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Inspect Trophy Vault</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
