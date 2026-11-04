'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Sparkles, Flame, Trophy, Star, Zap } from 'lucide-react';
import { gamification, getLevelInfo } from '@/lib/gamification';

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  user: string;
  action: string;
  highlight: string;
  tag: string;
  color: string;
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    icon: <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />,
    user: 'Munim',
    action: 'ignited a',
    highlight: '7-Day Play Streak',
    tag: 'STREAK',
    color: 'border-orange-500/40 text-orange-300',
  },
  {
    id: '2',
    icon: <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />,
    user: 'Nazmul',
    action: 'set new high score in',
    highlight: 'Cyber Katana Slicer',
    tag: 'RECORD',
    color: 'border-yellow-500/40 text-yellow-300',
  },
  {
    id: '3',
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
    user: 'ArcadeRunner_9',
    action: 'claimed',
    highlight: 'Daily Master Bonus',
    tag: 'QUESTS',
    color: 'border-purple-500/40 text-purple-300',
  },
];

export default function ActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>(DEFAULT_ACTIVITIES);

  useEffect(() => {
    // Build combined activity list with local player's accomplishments
    const updateFeed = () => {
      const state = gamification.getState();
      const levelInfo = getLevelInfo(state.xp);
      const combined = [...DEFAULT_ACTIVITIES];

      // Add local player streak if active
      if (state.streak.current >= 2) {
        combined.unshift({
          id: 'player_streak',
          icon: <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-bounce" />,
          user: 'You',
          action: 'are rocking an active',
          highlight: `${state.streak.current}-Day Play Streak`,
          tag: 'YOUR STREAK',
          color: 'border-orange-400/80 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.3)]',
        });
      }

      // Add local player rank if advanced
      if (levelInfo.level >= 2) {
        combined.splice(2, 0, {
          id: 'player_rank',
          icon: <Zap className="w-3.5 h-3.5 text-portal-cyan fill-portal-cyan animate-pulse" />,
          user: 'You',
          action: 'hold Clearance Rank',
          highlight: `${levelInfo.title} (LVL ${levelInfo.level})`,
          tag: 'YOUR RANK',
          color: 'border-cyan-400/80 text-portal-cyan shadow-[0_0_10px_rgba(6,182,212,0.3)]',
        });
      }

      setActivities(combined);
    };

    updateFeed();

    const handleSync = () => {
      updateFeed();
    };

    window.addEventListener('stressbuster_gamification_sync' as any, handleSync);
    return () => {
      window.removeEventListener('stressbuster_gamification_sync' as any, handleSync);
    };
  }, []);

  useEffect(() => {
    if (isPaused || activities.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, activities.length]);

  const current = activities[currentIndex] || DEFAULT_ACTIVITIES[0];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full max-w-full overflow-hidden bg-portal-surface border-y-3 border-black py-2 px-3 sm:px-4 flex items-center justify-between text-[11px] select-none shadow-neo-sm box-border"
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-portal-pink border-2 border-black text-[10px] font-black uppercase text-black tracking-wider shadow-neo-sm">
          <span className="w-2 h-2 rounded-full bg-black animate-ping shrink-0" />
          <Radio className="w-3 h-3 stroke-[2.5] shrink-0" />
          <span className="hidden xs:inline">LIVE</span>
        </div>
      </div>

      {/* Main Animated Ticker Strip */}
      <div className="flex-1 mx-2 sm:mx-3 overflow-hidden min-w-0 flex items-center justify-center">
        <div
          key={current.id}
          className="flex items-center gap-1.5 sm:gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0 truncate"
        >
          <span className="shrink-0">{current.icon}</span>
          <span className="text-white font-black truncate max-w-[90px] sm:max-w-none">{current.user}</span>
          <span className="text-slate-300 font-bold hidden md:inline truncate">{current.action}</span>
          <span className="font-black text-portal-yellow underline decoration-2 underline-offset-2 truncate">
            {current.highlight}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase bg-portal-yellow text-black border-2 border-black shadow-neo-sm shrink-0">
            {current.tag}
          </span>
        </div>
      </div>

      {/* Indicators */}
      <div className="flex items-center gap-1 shrink-0">
        {activities.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-sm border border-black transition-all ${
              idx === currentIndex ? 'bg-portal-yellow w-4 shadow-neo-sm' : 'bg-portal-card hover:bg-slate-400'
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
