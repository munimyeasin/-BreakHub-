'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Zap, Volume2, VolumeX, Sparkles, Trophy, Target } from 'lucide-react';
import { gamification, GamificationState, getLevelInfo } from '@/lib/gamification';
import { audio } from '@/lib/audio';

interface PlayerXpBadgeProps {
  onOpenQuests: () => void;
  onOpenTrophies: () => void;
  onOpenRoulette?: () => void;
}

export default function PlayerXpBadge({
  onOpenQuests,
  onOpenTrophies,
  onOpenRoulette,
}: PlayerXpBadgeProps) {
  const [state, setState] = useState<GamificationState>(() => gamification.getState());
  const [isMuted, setIsMuted] = useState<boolean>(() => audio.getMuted());
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleSync = (e: CustomEvent<GamificationState>) => {
      setState(e.detail || gamification.getState());
    };

    window.addEventListener('stressbuster_gamification_sync' as any, handleSync);
    return () => {
      window.removeEventListener('stressbuster_gamification_sync' as any, handleSync);
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMute = !isMuted;
    audio.setMuted(nextMute);
    setIsMuted(nextMute);
    if (!nextMute) {
      audio.playXpGainSound();
    }
  };

  const levelInfo = getLevelInfo(state.xp);
  const completedUnclaimedQuests = state.dailyQuests.progress.filter(
    p => p.completed && !p.claimed
  ).length;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* 1. Daily Streak Pill */}
      <div
        onClick={onOpenQuests}
        className="group relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-red-500/10 border border-orange-500/40 hover:border-orange-400 cursor-pointer shadow-[0_0_10px_rgba(249,115,22,0.2)] hover:shadow-[0_0_15px_rgba(249,115,22,0.45)] transition-all active:scale-95 shrink-0 select-none"
        title={`Active Play Streak: ${state.streak.current} ${state.streak.current === 1 ? 'day' : 'days'}. Click to view Daily Quests.`}
      >
        <span className="relative flex items-center justify-center">
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 fill-orange-500 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping" />
        </span>
        <span className="text-[11px] sm:text-xs font-black text-orange-300 tracking-tight">
          {state.streak.current}d
        </span>
      </div>

      {/* 2. Level & XP Progress Interactive Card */}
      <div
        onClick={onOpenTrophies}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-portal-surface/90 via-slate-900/95 to-portal-card border border-cyan-500/40 hover:border-cyan-300 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all active:scale-95 shrink-0 select-none"
        title={`Player Level ${levelInfo.level}: ${levelInfo.title} (${levelInfo.xpIntoCurrentLevel}/${levelInfo.xpNeededForNextLevel} XP). Click to open Trophy Room.`}
      >
        {/* Level Tag */}
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-portal-cyan fill-portal-cyan animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-portal-cyan">
            LVL {levelInfo.level}
          </span>
        </div>

        {/* XP Mini Bar */}
        <div className="hidden xs:flex flex-col gap-0.5 w-14 sm:w-20">
          <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 leading-none">
            <span className="truncate max-w-[45px] text-slate-300">{levelInfo.title}</span>
            <span>{Math.round(levelInfo.progressPercent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-portal-neon rounded-full transition-all duration-500 shadow-glow-cyan"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Hover Detailed XP Tooltip */}
        {isHovered && (
          <div className="absolute top-full mt-1.5 right-0 z-50 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.4)] text-[10px] whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
            <div className="font-extrabold text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-portal-cyan" />
              <span>{levelInfo.title}</span>
            </div>
            <div className="text-slate-400 mt-0.5 font-semibold">
              <span className="text-portal-cyan font-bold">{state.xp} Total XP</span> ({levelInfo.xpIntoCurrentLevel} / {levelInfo.xpNeededForNextLevel} to LVL {levelInfo.level + 1})
            </div>
          </div>
        )}
      </div>

      {/* 3. Daily Quests Shortcut Button with Unclaimed Badge */}
      <button
        onClick={onOpenQuests}
        className="relative p-1.5 rounded-xl bg-portal-surface/80 border border-portal-border hover:border-purple-400 text-purple-300 hover:text-white transition-all shadow-sm active:scale-95"
        title="Open Daily Quests"
        aria-label="Daily Quests"
      >
        <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
        {completedUnclaimedQuests > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-lg animate-bounce">
            {completedUnclaimedQuests}
          </span>
        )}
      </button>

      {/* 4. Trophy Room Shortcut Button */}
      <button
        onClick={onOpenTrophies}
        className="p-1.5 rounded-xl bg-portal-surface/80 border border-portal-border hover:border-amber-400 text-amber-300 hover:text-white transition-all shadow-sm active:scale-95"
        title="Open Holographic Trophy Vault"
        aria-label="Trophy Vault"
      >
        <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
      </button>

      {/* 5. Audio Synthesizer Mute/Unmute Toggle */}
      <button
        onClick={toggleMute}
        className={`p-1.5 rounded-xl border transition-all shadow-sm active:scale-95 ${
          isMuted
            ? 'bg-portal-surface/40 border-slate-700 text-slate-500 hover:text-slate-300'
            : 'bg-cyan-950/40 border-cyan-500/40 text-portal-cyan hover:border-cyan-300 hover:text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]'
        }`}
        title={isMuted ? 'Sound Effects: Muted (Click to Unmute)' : 'Sound Effects: Active (Click to Mute)'}
        aria-label="Toggle Sound"
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
      </button>
    </div>
  );
}
