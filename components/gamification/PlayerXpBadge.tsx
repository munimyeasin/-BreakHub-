'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Zap, Volume2, VolumeX, Sparkles, Trophy, Target } from 'lucide-react';
import { gamification, GamificationState, getLevelInfo, getDefaultState } from '@/lib/gamification';
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
  const [state, setState] = useState<GamificationState>(() => getDefaultState());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Sync state and audio settings from client storage on mount
    setState(gamification.getState());
    setIsMuted(audio.getMuted());

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
        className="group relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-portal-yellow text-black border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer transition-all active:translate-x-1 active:translate-y-1 active:shadow-none shrink-0 select-none font-black"
        title={`Active Play Streak: ${state.streak.current} ${state.streak.current === 1 ? 'day' : 'days'}. Click to view Daily Quests.`}
      >
        <span className="relative flex items-center justify-center">
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black fill-black group-hover:scale-110 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-portal-pink rounded-full border border-black animate-ping" />
        </span>
        <span className="text-[11px] sm:text-xs font-black text-black tracking-tight">
          {state.streak.current}d
        </span>
      </div>

      {/* 2. Level & XP Progress Interactive Card */}
      <div
        onClick={onOpenTrophies}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer transition-all active:translate-x-1 active:translate-y-1 active:shadow-none shrink-0 select-none"
        title={`Player Level ${levelInfo.level}: ${levelInfo.title} (${levelInfo.xpIntoCurrentLevel}/${levelInfo.xpNeededForNextLevel} XP). Click to open Trophy Room.`}
      >
        {/* Level Tag */}
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-portal-yellow fill-portal-yellow stroke-[2.5]" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-portal-cyan">
            LVL {levelInfo.level}
          </span>
        </div>

        {/* XP Mini Bar */}
        <div className="hidden xs:flex flex-col gap-0.5 w-14 sm:w-20">
          <div className="flex justify-between items-center text-[8px] font-black text-slate-300 leading-none">
            <span className="truncate max-w-[45px] text-white">{levelInfo.title}</span>
            <span>{Math.round(levelInfo.progressPercent)}%</span>
          </div>
          <div className="w-full h-2 bg-black rounded-md overflow-hidden border border-black">
            <div
              className="h-full bg-portal-lime border-r border-black transition-all duration-500"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Hover Detailed XP Tooltip */}
        {isHovered && (
          <div className="absolute top-full mt-2 right-0 z-50 px-3 py-2 rounded-xl bg-portal-surface border-3 border-black shadow-neo text-[11px] whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
            <div className="font-black text-white flex items-center gap-1.5 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-portal-yellow stroke-[2.5]" />
              <span>{levelInfo.title}</span>
            </div>
            <div className="text-slate-300 mt-0.5 font-bold">
              <span className="text-portal-yellow font-black">{state.xp} Total XP</span> ({levelInfo.xpIntoCurrentLevel} / {levelInfo.xpNeededForNextLevel} to LVL {levelInfo.level + 1})
            </div>
          </div>
        )}
      </div>

      {/* 3. Daily Quests Shortcut Button with Unclaimed Badge */}
      <button
        onClick={onOpenQuests}
        className="relative p-2 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm hover:bg-portal-purple text-portal-purple hover:text-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
        title="Open Daily Quests"
        aria-label="Daily Quests"
      >
        <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
        {completedUnclaimedQuests > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-portal-pink text-[9px] font-black text-black border border-black shadow-neo-sm animate-bounce">
            {completedUnclaimedQuests}
          </span>
        )}
      </button>

      {/* 4. Trophy Room Shortcut Button */}
      <button
        onClick={onOpenTrophies}
        className="p-2 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm hover:bg-portal-yellow text-portal-yellow hover:text-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
        title="Open Holographic Trophy Vault"
        aria-label="Trophy Vault"
      >
        <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
      </button>

      {/* 5. Audio Synthesizer Mute/Unmute Toggle */}
      <button
        onClick={toggleMute}
        className={`p-2 rounded-xl border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none ${
          isMuted
            ? 'bg-portal-card text-slate-500 hover:text-slate-200'
            : 'bg-portal-cyan text-black'
        }`}
        title={isMuted ? 'Sound Effects: Muted (Click to Unmute)' : 'Sound Effects: Active (Click to Mute)'}
        aria-label="Toggle Sound"
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />}
      </button>
    </div>
  );
}
