'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Sparkles, Flame, Trophy, Star, Zap } from 'lucide-react';
import { gamification, GamificationState, getLevelInfo, TROPHIES } from '@/lib/gamification';

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
    icon: <Zap className="w-3.5 h-3.5 text-portal-cyan fill-portal-cyan" />,
    user: 'Tahida',
    action: 'ascended to Rank',
    highlight: 'Grid Pilot (LVL 4)',
    tag: 'LEVEL UP',
    color: 'border-cyan-500/40 text-portal-cyan',
  },
  {
    id: '3',
    icon: <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />,
    user: 'Marzia',
    action: 'unlocked Holographic Trophy',
    highlight: 'Night Owl Platinum',
    tag: 'TROPHY',
    color: 'border-amber-500/40 text-amber-300',
  },
  {
    id: '4',
    icon: <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />,
    user: 'Nazmul',
    action: 'set new high score in',
    highlight: 'Cyber Slicer (3,450 pts)',
    tag: 'RECORD',
    color: 'border-yellow-500/40 text-yellow-300',
  },
  {
    id: '5',
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
    user: 'CyberRunner_9',
    action: 'claimed',
    highlight: '3/3 Daily Master Bonus',
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
      className="relative w-full overflow-hidden bg-gradient-to-r from-portal-surface/80 via-slate-900/90 to-portal-surface/80 border-y border-portal-border/60 py-1.5 px-3 sm:px-4 flex items-center justify-between text-[11px] select-none"
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-black uppercase text-portal-cyan tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-portal-cyan animate-ping" />
          <Radio className="w-2.5 h-2.5 ml-0.5" />
          <span className="hidden xs:inline">LIVE FEED</span>
        </div>
      </div>

      {/* Main Animated Ticker Strip */}
      <div className="flex-1 mx-3 overflow-hidden flex items-center justify-center">
        <div
          key={current.id}
          className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 truncate"
        >
          <span className="shrink-0">{current.icon}</span>
          <span className="text-white font-extrabold">{current.user}</span>
          <span className="text-slate-400 hidden sm:inline">{current.action}</span>
          <span className={`font-black underline decoration-dashed underline-offset-2 ${current.color.split(' ')[1]}`}>
            {current.highlight}
          </span>
          <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border shrink-0 ${current.color}`}>
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
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              idx === currentIndex ? 'bg-portal-cyan w-3' : 'bg-slate-700 hover:bg-slate-500'
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
