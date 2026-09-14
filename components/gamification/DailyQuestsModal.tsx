'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Sparkles, CheckCircle2, Clock, Gift, Flame, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  gamification,
  GamificationState,
  getDailyQuestsForDate,
  getTodayDateString,
} from '@/lib/gamification';

interface DailyQuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayGame?: (gameId?: string) => void;
  onOpenTrophies?: () => void;
}

export default function DailyQuestsModal({
  isOpen,
  onClose,
  onOpenTrophies,
}: DailyQuestsModalProps) {
  const [state, setState] = useState<GamificationState>(() => gamification.getState());
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const handleSync = (e: CustomEvent<GamificationState>) => {
      setState(e.detail || gamification.getState());
    };

    window.addEventListener('stressbuster_gamification_sync' as any, handleSync);
    return () => {
      window.removeEventListener('stressbuster_gamification_sync' as any, handleSync);
    };
  }, []);

  // Countdown timer to next calendar midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const todayStr = state.dailyQuests.date || getTodayDateString();
  const questDefinitions = getDailyQuestsForDate(todayStr);

  const handleClaim = (questId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = gamification.claimQuest(questId);
    if (res) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FE90E8', '#C0F7FE', '#F7CB46', '#99E885'],
      });
    }
  };

  const handleClaimMasterBonus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = gamification.claimDailyMasterBonus();
    if (res) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#F7CB46', '#FE90E8', '#C0F7FE', '#99E885'],
      });
    }
  };

  const allClaimed = state.dailyQuests.progress.every(p => p.claimed);
  const completedCount = state.dailyQuests.progress.filter(p => p.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-white border-4 border-black rounded-2xl sm:rounded-3xl shadow-neo-xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn">

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
            <div className="w-10 h-10 rounded-xl bg-portal-pink border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0">
              <Target className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-black tracking-tight uppercase">
                  DAILY QUESTS
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-portal-yellow text-black border-2 border-black shadow-neo-sm">
                  {completedCount}/3 DONE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-bold mt-0.5">
                <Clock className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                <span>Resets in:</span>
                <span className="font-mono font-black text-black bg-portal-cyan px-1.5 py-0.2 rounded border border-black">{timeLeft || '00:00:00'}</span>
              </div>
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

        {/* Modal Body / Quest Cards */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 bg-white">

          {/* Streak Banner Strip */}
          <div className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl bg-slate-50 border-3 border-black shadow-neo-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-portal-yellow border-2 border-black flex items-center justify-center shadow-neo-sm shrink-0">
                <Flame className="w-4 h-4 text-black fill-black" />
              </div>
              <div>
                <p className="text-xs font-black text-black uppercase flex items-center gap-1">
                  Active Streak: <span className="text-black bg-portal-yellow px-1 rounded border border-black font-black">{state.streak.current} Days</span>
                </p>
                <p className="text-[10px] text-slate-700 font-bold">
                  Play any game today to keep your streak alive!
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider block">Best</span>
              <span className="text-xs font-black text-black bg-portal-cyan px-2 py-0.5 rounded border border-black shadow-neo-sm">{state.streak.longest}d</span>
            </div>
          </div>

          {/* 3 Daily Quest Cards */}
          <div className="space-y-2.5">
            {questDefinitions.map((questDef) => {
              const progress = state.dailyQuests.progress.find(p => p.id === questDef.id) || {
                id: questDef.id,
                current: 0,
                completed: false,
                claimed: false,
              };

              const currentVal = Math.min(questDef.target, progress.current);
              const percent = Math.min(100, Math.round((currentVal / questDef.target) * 100));

              return (
                <div
                  key={questDef.id}
                  className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 border-black shadow-neo-sm transition-all duration-200 ${
                    progress.claimed
                      ? 'bg-slate-100 opacity-70'
                      : progress.completed
                      ? 'bg-portal-yellow/20 border-black'
                      : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0 p-1 bg-white rounded-xl border-2 border-black shadow-neo-sm">
                        {questDef.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-black uppercase leading-tight">
                            {questDef.title}
                          </h4>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-black shadow-neo-sm ${
                            questDef.tier === 'easy'
                              ? 'bg-portal-green text-black'
                              : questDef.tier === 'medium'
                              ? 'bg-portal-cyan text-black'
                              : 'bg-portal-pink text-black'
                          }`}>
                            {questDef.tier}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-bold mt-1 leading-snug">
                          {questDef.description}
                        </p>
                      </div>
                    </div>

                    {/* Reward Badge or Claim Button */}
                    <div className="shrink-0">
                      {progress.claimed ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-slate-500 text-[10px] font-black border border-black shadow-neo-sm">
                          <CheckCircle2 className="w-3 h-3 text-black stroke-[2.5]" />
                          <span>Claimed</span>
                        </div>
                      ) : progress.completed ? (
                        <button
                          onClick={(e) => handleClaim(questDef.id, e)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-portal-green text-black font-black text-xs uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                        >
                          <Gift className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>CLAIM +{questDef.xpReward} XP</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-black text-black text-[10px] font-black shadow-neo-sm">
                          <Sparkles className="w-3 h-3 text-black stroke-[2.5]" />
                          <span>+{questDef.xpReward} XP</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-2.5 bg-slate-200 rounded-md overflow-hidden border-2 border-black">
                      <div
                        className={`h-full border-r border-black transition-all duration-500 ${
                          progress.completed
                            ? 'bg-portal-green'
                            : 'bg-portal-yellow'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-black shrink-0">
                      {currentVal}/{questDef.target}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3/3 Daily Master Bonus Chest */}
          <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-3 border-black shadow-neo transition-all ${
            allClaimed
              ? state.dailyQuests.dailyMasterClaimed
                ? 'bg-slate-100 opacity-70'
                : 'bg-portal-yellow/30'
              : 'bg-slate-50'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-portal-yellow border-2 border-black flex items-center justify-center text-black shadow-neo-sm shrink-0">
                  <Trophy className="w-5 h-5 fill-black stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-black uppercase">
                      DAILY MASTER 3/3 CHEST
                    </h4>
                    <span className="px-1.5 py-0.5 rounded bg-portal-pink text-black text-[8px] font-black uppercase border border-black shadow-neo-sm">
                      BONUS
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-700 font-bold">
                    Complete all 3 daily quests to harvest an extra +100 XP!
                  </p>
                </div>
              </div>

              <div>
                {state.dailyQuests.dailyMasterClaimed ? (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-slate-500 text-xs font-black border border-black shadow-neo-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                    <span>Unlocked</span>
                  </div>
                ) : allClaimed ? (
                  <button
                    onClick={handleClaimMasterBonus}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  >
                    <Gift className="w-4 h-4 stroke-[2.5]" />
                    <span>CLAIM +100 XP</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-black text-slate-600 bg-white px-2 py-1 rounded border border-black shadow-neo-sm">
                    {completedCount}/3 Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Quick Actions */}
        <div className="p-3.5 sm:p-4 border-t-3 border-black bg-white flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              onClose();
              onOpenTrophies?.();
            }}
            className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 hover:text-black transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span>View Trophy Vault →</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-portal-yellow hover:bg-portal-pink text-black border-2 border-black text-xs font-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none uppercase tracking-wider"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
