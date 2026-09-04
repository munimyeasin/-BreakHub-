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
    border: 'border-amber-700/60 hover:border-amber-600',
    badge: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    text: 'text-amber-400',
    bg: 'from-amber-950/20 via-slate-900/60 to-slate-950/90',
    glow: 'rgba(217,119,6,0.2)',
  },
  SILVER: {
    border: 'border-slate-400/60 hover:border-slate-300',
    badge: 'bg-slate-700/40 text-slate-200 border-slate-500/50',
    text: 'text-slate-200',
    bg: 'from-slate-800/30 via-slate-900/60 to-slate-950/90',
    glow: 'rgba(203,213,225,0.25)',
  },
  GOLD: {
    border: 'border-yellow-500/60 hover:border-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    text: 'text-yellow-400',
    bg: 'from-yellow-950/25 via-slate-900/60 to-slate-950/90',
    glow: 'rgba(234,179,8,0.35)',
  },
  PLATINUM: {
    border: 'border-cyan-400/80 hover:border-cyan-300',
    badge: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60 shadow-glow-cyan',
    text: 'text-portal-cyan',
    bg: 'from-cyan-950/35 via-purple-950/30 to-slate-950/90',
    glow: 'rgba(6,182,212,0.45)',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-portal-bg to-slate-950 border border-amber-500/40 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-portal-border bg-portal-surface/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black shadow-glow-gold">
              <Trophy className="w-5 h-5 fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white tracking-wide">
                  HOLOGRAPHIC TROPHY VAULT
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {unlockedCount}/{totalTrophies} UNLOCKED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Current Rank: <span className="text-portal-cyan font-bold">{levelInfo.title}</span> (LVL {levelInfo.level})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-portal-card text-slate-400 hover:text-white border border-portal-border hover:border-amber-400 transition-all active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Progress Strip */}
        <div className="px-5 py-3 bg-gradient-to-r from-portal-card/90 via-slate-900/90 to-portal-surface/90 border-b border-portal-border/60 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              <span>Vault Completion</span>
              <span className="text-amber-400 font-bold">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-portal-cyan rounded-full transition-all duration-500 shadow-glow-gold"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total XP</span>
              <span className="text-xs font-black text-portal-cyan">{state.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Rarity Filter Tabs */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-portal-border/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {['ALL', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((rarity) => {
            const isSelected = selectedRarity === rarity;
            const count = rarity === 'ALL'
              ? TROPHIES.length
              : TROPHIES.filter(t => t.rarity === rarity).length;

            return (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(rarity)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap border ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-portal-surface/40 text-slate-400 border-portal-border/60 hover:text-white hover:border-slate-600'
                }`}
              >
                <span>{rarity}</span>
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Trophy Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 scrollbar-thin scrollbar-thumb-portal-border">
          {filteredTrophies.map((trophy) => {
            const isUnlocked = Boolean(state.unlockedTrophies[trophy.id]);
            const unlockedData = state.unlockedTrophies[trophy.id];
            const rarityStyle = RARITY_COLORS[trophy.rarity];

            return (
              <div
                key={trophy.id}
                className={`relative p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                  isUnlocked
                    ? `bg-gradient-to-br ${rarityStyle.bg} ${rarityStyle.border} shadow-[0_0_20px_${rarityStyle.glow}]`
                    : 'bg-portal-surface/40 border-slate-800/80 opacity-55 hover:opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-2xl p-1.5 rounded-xl border ${
                        isUnlocked
                          ? 'bg-slate-900/90 border-slate-700/80 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 grayscale'
                      }`}>
                        {trophy.icon}
                      </span>
                      <div>
                        <h4 className={`text-xs sm:text-sm font-black leading-tight ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                          {trophy.title}
                        </h4>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider mt-0.5 border ${rarityStyle.badge}`}>
                          {trophy.rarity}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-black bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Unlocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-700">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-2.5 leading-snug">
                    {trophy.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="font-extrabold text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-portal-cyan" />
                    +{trophy.xpReward} XP Reward
                  </span>

                  {isUnlocked && unlockedData?.unlockedAt && (
                    <span className="text-slate-400 font-mono text-[9px]">
                      {new Date(unlockedData.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-portal-border/80 bg-portal-surface/60 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenQuests?.();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors"
          >
            <span>← View Daily Quests</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-portal-card border border-portal-border hover:border-amber-400 text-white text-xs font-black transition-all active:scale-95"
          >
            CLOSE VAULT
          </button>
        </div>
      </div>
    </div>
  );
}
