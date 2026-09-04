'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Sparkles, CheckCircle2, Clock, Gift, Flame, Trophy, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  gamification,
  GamificationState,
  getDailyQuestsForDate,
  getTodayDateString,
  DailyQuestDefinition,
} from '@/lib/gamification';
import { audio } from '@/lib/audio';

interface DailyQuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayGame?: (gameId?: string) => void;
  onOpenTrophies?: () => void;
}

export default function DailyQuestsModal({
  isOpen,
  onClose,
  onPlayGame,
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
        colors: ['#06b6d4', '#a855f7', '#fbbf24'],
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
        colors: ['#fbbf24', '#f59e0b', '#06b6d4', '#ec4899'],
      });
    }
  };

  const allCompleted = state.dailyQuests.progress.every(p => p.completed);
  const allClaimed = state.dailyQuests.progress.every(p => p.claimed);
  const completedCount = state.dailyQuests.progress.filter(p => p.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-portal-bg to-slate-950 border border-purple-500/40 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.25)] overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-portal-border bg-portal-surface/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              <Target className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white tracking-wide">
                  DAILY QUESTS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {completedCount}/3 DONE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold mt-0.5">
                <Clock className="w-3.5 h-3.5 text-portal-cyan" />
                <span>Resets in:</span>
                <span className="font-mono font-black text-portal-cyan tracking-wider">{timeLeft || '00:00:00'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-portal-card text-slate-400 hover:text-white border border-portal-border hover:border-purple-400 transition-all active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Quest Cards */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-portal-border">

          {/* Streak Banner Strip */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-red-500/15 border border-orange-500/40 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                <Flame className="w-4 h-4 text-black fill-black" />
              </div>
              <div>
                <p className="text-xs font-black text-white flex items-center gap-1">
                  Active Play Streak: <span className="text-orange-400 font-black">{state.streak.current} Days</span>
                </p>
                <p className="text-[10px] text-slate-300 font-medium">
                  Play any game today to keep your cyber flame burning!
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Best Streak</span>
              <span className="text-xs font-black text-amber-300">{state.streak.longest}d</span>
            </div>
          </div>

          {/* 3 Daily Quest Cards */}
          <div className="space-y-2.5">
            {questDefinitions.map((questDef, index) => {
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
                  className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                    progress.claimed
                      ? 'bg-slate-900/40 border-slate-800 opacity-60'
                      : progress.completed
                      ? 'bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-slate-900/90 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : 'bg-portal-card/80 border-portal-border hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl shrink-0 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
                        {questDef.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                            {questDef.title}
                          </h4>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                            questDef.tier === 'easy'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : questDef.tier === 'medium'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          }`}>
                            {questDef.tier}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {questDef.description}
                        </p>
                      </div>
                    </div>

                    {/* Reward Badge or Claim Button */}
                    <div className="shrink-0">
                      {progress.claimed ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Claimed</span>
                        </div>
                      ) : progress.completed ? (
                        <button
                          onClick={(e) => handleClaim(questDef.id, e)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-portal-cyan to-portal-neon text-black font-black text-xs hover:scale-105 active:scale-95 shadow-glow-cyan transition-all animate-bounce"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>CLAIM +{questDef.xpReward} XP</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black">
                          <Sparkles className="w-3 h-3 text-portal-cyan" />
                          <span>+{questDef.xpReward} XP</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress.completed
                            ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                            : 'bg-gradient-to-r from-purple-500 to-cyan-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 shrink-0 font-mono">
                      {currentVal}/{questDef.target}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3/3 Daily Master Bonus Chest */}
          <div className={`p-4 rounded-2xl border transition-all ${
            allClaimed
              ? state.dailyQuests.dailyMasterClaimed
                ? 'bg-slate-900/40 border-slate-800 opacity-70'
                : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
              : 'bg-portal-surface/40 border-portal-border/60'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black shadow-glow-gold shrink-0">
                  <Trophy className="w-5 h-5 fill-black" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-amber-300">
                      DAILY MASTER 3/3 CHEST
                    </h4>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-black border border-amber-500/40">
                      BONUS
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-300">
                    Complete all 3 daily quests to harvest an extra +100 XP!
                  </p>
                </div>
              </div>

              <div>
                {state.dailyQuests.dailyMasterClaimed ? (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unlocked</span>
                  </div>
                ) : allClaimed ? (
                  <button
                    onClick={handleClaimMasterBonus}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-black text-xs hover:scale-105 active:scale-95 shadow-glow-gold transition-all animate-pulse"
                  >
                    <Gift className="w-4 h-4" />
                    <span>CLAIM +100 XP</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500">
                    {completedCount}/3 Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Quick Actions */}
        <div className="p-4 border-t border-portal-border/80 bg-portal-surface/60 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenTrophies?.();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-portal-cyan transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>View Trophy Vault →</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-portal-card border border-portal-border hover:border-portal-cyan text-white text-xs font-black transition-all active:scale-95"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
