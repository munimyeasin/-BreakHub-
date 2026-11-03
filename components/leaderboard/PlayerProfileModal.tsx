'use client';

import React, { useState } from 'react';
import { Trophy, Flame, Zap, Star, Heart, Clock, Medal, Check, AlertCircle, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getLevelInfo, TROPHIES } from '@/lib/gamification';
import { GamificationState } from '@/lib/gamification';

interface PlayerProfile {
  id: string;
  username: string;
  avatar_url: string;
  days_played?: number;
  longest_streak?: number;
  level?: number;
  total_score?: number;
  games_played?: number;
  xp?: number;
  unlocked_trophies?: Record<string, { unlockedAt: string }>;
}

interface PlayerProfileModalProps {
  userId: string;
  onClose: () => void;
}

export default function PlayerProfileModal({ userId, onClose }: PlayerProfileModalProps) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  // Fetch profile on mount
  // (in a real app, this would query Supabase or the DB)
  // For now, use a static example or fetch from local state
  // Since the full backend integration would require Supabase auth context,
  // we'll mock the data fetching structure

  // NOTE: In production, this would be:
  // useEffect(() => {
  //   const fetchProfile = async () => {
  //     const result = await db.getUserProfile(userId);
  //     setProfile(result);
  //     setIsLoading(false);
  //   };
  //   fetchProfile();
  // }, [userId]);

  // Mock profile for demo purposes - in production, replace with db.getUserProfile(userId)
  // This placeholder will be replaced with actual DB fetch after backend sync is complete

  // ==========================================================================
  // Profile Data - Mocked for Demo (replace with db.getUserProfile(userId))
  // ==========================================================================
  // These fields come from the GamificationState sync to the database.
  // The server saves: days_played, longest_streak, total_score, games_played,
  // level (from XP), xp, unlocked_trophies, stats.
  // ==========================================================================
  const mockProfile: PlayerProfile = {
    id: userId,
    username: 'Player',
    avatar_url: '/avatars/default.png',
    days_played: 87,
    longest_streak: 14,
    level: 6,
    total_score: 3240,
    games_played: 42,
    xp: 1250,
    unlocked_trophies: {
      first_boot: { unlockedAt: '2026-09-20' },
      neon_initiate: { unlockedAt: '2026-10-01' },
      grid_explorer: { unlockedAt: '2026-10-10' },
      daily_devotee: { unlockedAt: '2026-10-15' },
      flame_keeper: { unlockedAt: '2026-10-20' },
      score_titan: { unlockedAt: '2026-10-25' },
    }
  };

  setProfile(mockProfile);
  setIsLoading(false);

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
        <div className="bg-portal-card border-4 border-black rounded-3xl p-8 shadow-neo-xl text-center animate-scaleIn">
          <div className="w-16 h-16 rounded-2xl bg-portal-surface border-4 border-black flex items-center justify-center mx-auto mb-4 shadow-neo-sm">
            <Trophy className="w-8 h-8 text-portal-yellow stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Loading Profile...</h2>
          <p className="text-slate-400 text-sm mb-6">Fetching player data...</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-xl bg-portal-surface text-black border-2 border-black font-black text-sm uppercase hover:bg-portal-yellow hover:text-black transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const levelInfo = getLevelInfo(profile.xp || 0);
  const totalUnlocked = profile.unlocked_trophies ? Object.keys(profile.unlocked_trophies).length : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
      <div className="bg-portal-card border-4 border-black rounded-3xl p-8 sm:p-10 max-w-lg w-full shadow-neo-xl text-center relative overflow-y-auto animate-scaleIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-portal-surface text-black border-2 border-black font-black text-xs uppercase hover:bg-portal-yellow hover:text-black transition-all"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Header Crest */}
        <div className="w-16 h-16 rounded-2xl bg-portal-surface border-4 border-black flex items-center justify-center mx-auto mb-6 shadow-neo-md overflow-hidden">
          <img src={profile?.avatar_url || '/avatars/default.png'} alt="Avatar" className="w-full h-full object-cover" />
        </div>

        {/* Profile Header Info */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white mb-1">{profile?.username}</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-portal-yellow font-black">LVL {profile?.level || 1}</span>
            <span className="text-slate-400 text-sm">({profile?.longest_streak || 0}-day longest streak)</span>
          </div>
          <div className="text-sm text-slate-400 mb-2">Days Played: {profile?.days_played || 0}</div>
        </div>

        {/* Progress Card */}
        <div className="bg-portal-surface border-3 border-black rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-slate-400 uppercase tracking-wider">Total Score</span>
              <span className="text-3xl font-black text-portal-yellow">{profile?.total_score?.toLocaleString() || 0} PTS</span>
            </div>
            <div>
              <span className="text-sm text-slate-400 uppercase tracking-wider">Games Played</span>
              <span className="text-2xl font-black">{profile?.games_played || 0}</span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full bg-portal-surface border-2 border-black rounded-md h-8 mb-4">
            <div
              className="h-full bg-portal-yellow rounded-md transition-width duration-500"
              style={{ width: (profile?.xp ? Math.min(profile.xp / 1000 * 100, 100) : 0) + '%' }}
            />
          </div>
          <div className="flex items-center text-sm text-slate-400 mb-2">
            <span>XP: {profile?.xp || 0}</span>
            <span className="ml-2">({levelInfo.title || 'Level'} {profile?.level || 1})</span>
          </div>
        </div>

        {/* Unlocked Trophies / Achievements Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
          {profile?.unlocked_trophies && Object.entries(profile.unlocked_trophies).map(([id, val]) => {
            const trophy = TROPHIES.find(t => t.id === id);
            if (!trophy) return null;
            const dateStr = typeof val === 'string' ? val : val?.unlockedAt || new Date().toISOString();
            return (
              <div
                key={id}
                className="bg-portal-surface border-2 border-black rounded-xl p-3 text-center shadow-neo-sm hover:bg-portal-pink/20 transition-all"
              >
                <div className="w-8 h-8 rounded-md mx-auto mb-2 text-xl flex items-center justify-center">
                  {trophy.icon}
                </div>
                <div className="text-[10px] font-black text-white uppercase tracking-wider truncate">{trophy.title}</div>
                <div className="text-[9px] text-portal-yellow font-mono mt-0.5">unlocked {new Date(dateStr).toLocaleDateString()}</div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 rounded-xl bg-portal-cyan text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-neo-sm hover:bg-portal-yellow hover:text-black transition-all mt-6"
        >
          Close Profile
        </button>
      </div>
    </div>
  );
}