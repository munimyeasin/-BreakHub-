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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-portal-surface border-4 border-black rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-neo-lg text-center overflow-hidden flex flex-col items-center">

        {/* Top Decorative Color Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

        {/* Floating Arcade Badge Icon */}
        <div className="relative mb-4 mt-2">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-portal-yellow border-3 border-black flex items-center justify-center shadow-neo">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-black fill-black stroke-[2.5]" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-lg bg-portal-pink text-black font-black text-xs border-2 border-black shadow-neo-sm uppercase">
            LVL {levelInfo.level}
          </span>
        </div>

        {/* Heading */}
        <p className="text-xs font-black uppercase tracking-wider text-portal-yellow mb-1 flex items-center gap-1.5 justify-center">
          <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>RANK ASCENSION</span>
          <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
        </p>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-none mb-2">
          LEVEL UP!
        </h2>

        {/* Rank Title Box */}
        <div className="w-full py-3 px-4 my-2.5 rounded-xl bg-portal-card border-3 border-black shadow-neo-sm">
          <p className="text-[10px] uppercase font-black text-slate-300 tracking-wider">
            New Title Unlocked
          </p>
          <p className="text-lg sm:text-xl font-black text-portal-cyan uppercase mt-0.5">
            {levelInfo.title}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 font-bold max-w-xs mb-5 leading-relaxed">
          Your reflexes and neural endurance have ascended. Keep busting stress to unlock legendary vault trophies!
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-portal-yellow text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <span>CONTINUE DOMINATION</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {onOpenTrophies && (
            <button
              onClick={() => {
                onClose();
                onOpenTrophies();
              }}
              className="w-full py-2.5 rounded-xl bg-portal-card hover:bg-portal-surface text-slate-200 hover:text-white text-xs font-black uppercase border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-portal-yellow stroke-[2.5]" />
              <span>Inspect Trophy Vault</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
