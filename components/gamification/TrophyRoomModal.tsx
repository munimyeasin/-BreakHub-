'use client';

import React, { useState, useEffect } from 'react';
import { X, Trophy, Sparkles, Lock, CheckCircle2 } from 'lucide-react';
import {
  gamification,
  GamificationState,
  TROPHIES,
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
}> = {
  BRONZE: {
    border: 'border-2 border-black',
    badge: 'bg-portal-yellow/40 text-black border border-black shadow-neo-sm',
    text: 'text-black',
    bg: 'bg-slate-50',
  },
  SILVER: {
    border: 'border-2 border-black',
    badge: 'bg-portal-cyan text-black border border-black shadow-neo-sm',
    text: 'text-black',
    bg: 'bg-slate-50',
  },
  GOLD: {
    border: 'border-3 border-black',
    badge: 'bg-portal-yellow text-black border-2 border-black shadow-neo-sm',
    text: 'text-black',
    bg: 'bg-slate-50',
  },
  PLATINUM: {
    border: 'border-3 border-black',
    badge: 'bg-portal-pink text-black border-2 border-black shadow-neo-sm',
    text: 'text-black',
    bg: 'bg-slate-50',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-white border-4 border-black rounded-2xl sm:rounded-3xl shadow-neo-xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn">

        {/* Figma Selection Frame Transform Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        {/* Top Decorative Color Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black shrink-0" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b-3 border-black bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-portal-yellow border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0">
              <Trophy className="w-5 h-5 fill-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-black tracking-tight uppercase">
                  TROPHY VAULT
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-portal-pink text-black border-2 border-black shadow-neo-sm">
                  {unlockedCount}/{totalTrophies} UNLOCKED
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-bold mt-0.5">
                Current Rank: <span className="text-black bg-portal-cyan px-1 rounded border border-black font-black">{levelInfo.title}</span> (LVL {levelInfo.level})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-portal-pink text-black border-2 border-black shadow-neo-sm font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Master Progress Strip */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b-3 border-black flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-black mb-1">
              <span>Vault Completion</span>
              <span className="text-black font-black">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-md overflow-hidden border-2 border-black">
              <div
                className="h-full bg-portal-yellow border-r-2 border-black transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider block">Total XP</span>
              <span className="text-xs font-black text-black bg-portal-green px-2 py-0.5 rounded border border-black shadow-neo-sm">{state.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Rarity Filter Tabs */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b-3 border-black flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
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
                    ? 'bg-portal-yellow text-black shadow-neo-sm -translate-y-0.5'
                    : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-black shadow-neo-xs'
                }`}
              >
                <span>{rarity}</span>
                <span className="ml-1 text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Trophy Grid */}
        <div className="p-3.5 sm:p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
          {filteredTrophies.map((trophy) => {
            const isUnlocked = Boolean(state.unlockedTrophies[trophy.id]);
            const unlockedData = state.unlockedTrophies[trophy.id];
            const rarityStyle = RARITY_COLORS[trophy.rarity];

            return (
              <div
                key={trophy.id}
                className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-black shadow-neo-sm transition-all duration-200 flex flex-col justify-between ${
                  isUnlocked
                    ? 'bg-slate-50 hover:bg-portal-yellow/20'
                    : 'bg-slate-100/70 opacity-60 grayscale'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-1.5 rounded-xl border-2 border-black bg-white shadow-neo-sm">
                        {trophy.icon}
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-black leading-tight uppercase">
                          {trophy.title}
                        </h4>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-0.5 ${rarityStyle.badge}`}>
                          {trophy.rarity}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 text-black text-[10px] font-black bg-portal-green px-2 py-0.5 rounded-md border border-black shadow-neo-sm">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>Unlocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500 text-[10px] font-black bg-white px-2 py-0.5 rounded-md border border-black shadow-neo-sm">
                          <Lock className="w-3 h-3 stroke-[2.5]" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-700 font-bold mt-2.5 leading-snug">
                    {trophy.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t-2 border-black flex items-center justify-between text-[10px]">
                  <span className="font-black text-black flex items-center gap-1 uppercase bg-white px-2 py-0.5 rounded border border-black shadow-neo-xs">
                    <Sparkles className="w-3 h-3 text-black stroke-[2.5]" />
                    +{trophy.xpReward} XP Reward
                  </span>

                  {isUnlocked && unlockedData?.unlockedAt && (
                    <span className="text-slate-600 font-black text-[9px] uppercase">
                      {new Date(unlockedData.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t-3 border-black bg-white flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              onClose();
              onOpenQuests?.();
            }}
            className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 hover:text-black transition-colors"
          >
            <span>← View Daily Quests</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-portal-yellow hover:bg-portal-pink text-black border-2 border-black text-xs font-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none uppercase tracking-wider"
          >
            CLOSE VAULT
          </button>
        </div>
      </div>
    </div>
  );
}
