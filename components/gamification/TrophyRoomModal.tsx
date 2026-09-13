'use client';

import React, { useState, useEffect } from 'react';
import { X, Trophy, Sparkles, Lock, CheckCircle2, ShieldCheck, Zap, Award, Star } from 'lucide-react';
import {
  gamification,
  GamificationState,
  TROPHIES,
  Trophy as TrophyType,
  TrophyRarity,
  getLevelInfo,
} from '@/lib/gamification';

interface TrophyRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuests?: () => void;
}

const RARITY_COLORS: Record<TrophyRarity, {
  border: string;
  badge: string;
  text: string;
  bg: string;
  glow: string;
}> = {
  BRONZE: {
    border: 'border-2 border-black',
    badge: 'bg-amber-700 text-white border border-black shadow-neo-sm',
    text: 'text-amber-400',
    bg: 'bg-portal-card',
    glow: 'none',
  },
  SILVER: {
    border: 'border-2 border-black',
    badge: 'bg-slate-300 text-black border border-black shadow-neo-sm',
    text: 'text-slate-200',
    bg: 'bg-portal-card',
    glow: 'none',
  },
  GOLD: {
    border: 'border-3 border-black',
    badge: 'bg-portal-yellow text-black border-2 border-black shadow-neo-sm',
    text: 'text-portal-yellow',
    bg: 'bg-portal-card',
    glow: 'none',
  },
  PLATINUM: {
    border: 'border-3 border-black',
    badge: 'bg-portal-cyan text-black border-2 border-black shadow-neo-sm',
    text: 'text-portal-cyan',
    bg: 'bg-portal-card',
    glow: 'none',
  },
};

export default function TrophyRoomModal({
  isOpen,
  onClose,
  onOpenQuests,
}: TrophyRoomModalProps) {
  const [state, setState] = useState<GamificationState>(() => gamification.getState());
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');

  useEffect(() => {
    const handleSync = (e: CustomEvent<GamificationState>) => {
      setState(e.detail || gamification.getState());
    };

    window.addEventListener('stressbuster_gamification_sync' as any, handleSync);
    return () => {
      window.removeEventListener('stressbuster_gamification_sync' as any, handleSync);
    };
  }, []);

  if (!isOpen) return null;

  const levelInfo = getLevelInfo(state.xp);
  const totalTrophies = TROPHIES.length;
  const unlockedCount = Object.keys(state.unlockedTrophies).length;
  const completionPercentage = Math.round((unlockedCount / totalTrophies) * 100);

  const filteredTrophies = TROPHIES.filter(t => {
    if (selectedRarity === 'ALL') return true;
    return t.rarity === selectedRarity;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-portal-surface border-4 border-black rounded-2xl sm:rounded-3xl shadow-neo-lg overflow-hidden flex flex-col max-h-[92vh]">

        {/* Top Decorative Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black shrink-0" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b-3 border-black bg-portal-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-portal-yellow border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0">
              <Trophy className="w-5 h-5 fill-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight uppercase">
                  HOLOGRAPHIC TROPHY VAULT
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-portal-pink text-white border-2 border-black shadow-neo-sm">
                  {unlockedCount}/{totalTrophies} UNLOCKED
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-bold mt-0.5">
                Current Rank: <span className="text-portal-cyan font-black">{levelInfo.title}</span> (LVL {levelInfo.level})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-portal-card hover:bg-portal-pink text-white hover:text-black border-2 border-black shadow-neo-sm font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Master Progress Strip */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-portal-card border-b-3 border-black flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-200 mb-1">
              <span>Vault Completion</span>
              <span className="text-portal-yellow font-black">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-black rounded-md overflow-hidden border-2 border-black">
              <div
                className="h-full bg-portal-yellow border-r-2 border-black transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider block">Total XP</span>
              <span className="text-xs font-black text-portal-cyan bg-portal-surface px-2 py-0.5 rounded border border-black">{state.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Rarity Filter Tabs */}
        <div className="px-4 sm:px-6 py-2 bg-portal-surface border-b-3 border-black flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {['ALL', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((rarity) => {
            const isSelected = selectedRarity === rarity;
            const count = rarity === 'ALL'
              ? TROPHIES.length
              : TROPHIES.filter(t => t.rarity === rarity).length;

            return (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(rarity)}
                className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap border-2 border-black ${
                  isSelected
                    ? 'bg-portal-yellow text-black shadow-neo-sm'
                    : 'bg-portal-card text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{rarity}</span>
                <span className="ml-1 text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Trophy Grid */}
        <div className="p-3.5 sm:p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredTrophies.map((trophy) => {
            const isUnlocked = Boolean(state.unlockedTrophies[trophy.id]);
            const unlockedData = state.unlockedTrophies[trophy.id];
            const rarityStyle = RARITY_COLORS[trophy.rarity];

            return (
              <div
                key={trophy.id}
                className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-black shadow-neo-sm transition-all duration-200 flex flex-col justify-between ${
                  isUnlocked
                    ? 'bg-portal-card'
                    : 'bg-portal-card/50 opacity-50 grayscale'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-1.5 rounded-xl border-2 border-black bg-portal-surface shadow-neo-sm">
                        {trophy.icon}
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white leading-tight uppercase">
                          {trophy.title}
                        </h4>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-0.5 ${rarityStyle.badge}`}>
                          {trophy.rarity}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 text-black text-[10px] font-black bg-portal-lime px-2 py-0.5 rounded-md border border-black shadow-neo-sm">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>Unlocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-300 text-[10px] font-black bg-portal-surface px-2 py-0.5 rounded-md border border-black">
                          <Lock className="w-3 h-3 stroke-[2.5]" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 font-bold mt-2.5 leading-snug">
                    {trophy.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t-2 border-black flex items-center justify-between text-[10px]">
                  <span className="font-black text-portal-yellow flex items-center gap-1 uppercase">
                    <Sparkles className="w-3 h-3 text-portal-yellow stroke-[2.5]" />
                    +{trophy.xpReward} XP Reward
                  </span>

                  {isUnlocked && unlockedData?.unlockedAt && (
                    <span className="text-slate-300 font-black text-[9px] uppercase">
                      {new Date(unlockedData.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t-3 border-black bg-portal-surface flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              onClose();
              onOpenQuests?.();
            }}
            className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-300 hover:text-portal-yellow transition-colors"
          >
            <span>← View Daily Quests</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-portal-card hover:bg-portal-yellow hover:text-black border-2 border-black text-white text-xs font-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 uppercase tracking-wider"
          >
            CLOSE VAULT
          </button>
        </div>
      </div>
    </div>
  );
}
