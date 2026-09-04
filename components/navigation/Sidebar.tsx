'use client';

import React from 'react';
import {
  Gamepad2,
  Heart,
  Trophy,
  Users,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  Grid,
  X,
  Edit3,
  Flame,
  Clock,
  ChevronRight,
  SlidersHorizontal,
  Compass,
  Target,
  Dices,
  Award
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'all' | 'favorites' | 'about';
  onSelectTab: (tab: 'all' | 'favorites' | 'about') => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  favoritesCount: number;
  onOpenLeaderboard: () => void;
  playerTag: string;
  avatarUrl: string | null;
  onOpenUsernameModal: () => void;
  onOpenQuests?: () => void;
  onOpenTrophies?: () => void;
  onOpenRoulette?: () => void;
  unclaimedQuestsCount?: number;
  categoryCounts?: Record<string, number>;
  totalGamesCount?: number;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Genres', icon: Sparkles, color: 'text-portal-cyan', activeBg: 'bg-cyan-500/15 border-cyan-400 text-portal-cyan shadow-glow-cyan/30' },
  { id: 'UPCOMING', label: 'Upcoming / Soon', icon: Clock, color: 'text-amber-400', activeBg: 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]' },
  { id: 'ARCADE', label: 'Arcade Classics', icon: Gamepad2, color: 'text-cyan-400', activeBg: 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-glow-cyan/30' },
  { id: 'ACTION', label: 'Action & Rush', icon: Zap, color: 'text-rose-400', activeBg: 'bg-rose-500/15 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]' },
  { id: 'PUZZLE', label: 'Neural Puzzles', icon: Grid, color: 'text-purple-400', activeBg: 'bg-purple-500/15 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(192,132,252,0.3)]' },
  { id: 'STRATEGY', label: 'Tactical Strategy', icon: Cpu, color: 'text-emerald-400', activeBg: 'bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]' },
  { id: 'CARD', label: 'Card & Memory', icon: Layers, color: 'text-amber-400', activeBg: 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]' },
];

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  selectedCategory,
  onSelectCategory,
  favoritesCount,
  onOpenLeaderboard,
  playerTag,
  avatarUrl,
  onOpenUsernameModal,
  onOpenQuests,
  onOpenTrophies,
  onOpenRoulette,
  unclaimedQuestsCount = 0,
  categoryCounts = {},
  totalGamesCount = 0
}: SidebarProps) {
  const handleTabClick = (tab: 'all' | 'favorites' | 'about') => {
    onSelectTab(tab);
    if (tab !== 'all') {
      onSelectCategory('ALL');
    }
  };

  const handleCategoryClick = (catId: string) => {
    onSelectCategory(catId);
    if (activeTab !== 'all') {
      onSelectTab('all');
    }
  };

  return (
    <>
      {/* 1. Mobile Backdrop Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* 2. Slide Bar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[61px] left-0 z-50 lg:z-20 h-full lg:h-[calc(100vh-61px)] w-72 sm:w-80 lg:w-64 shrink-0 bg-portal-bg/95 lg:bg-portal-surface/40 backdrop-blur-2xl lg:backdrop-blur-none border-r border-portal-border flex flex-col justify-between transition-transform duration-300 ease-in-out select-none shadow-2xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header of Slide Bar */}
        <div className="p-4 border-b border-portal-border/60 flex items-center justify-between lg:hidden bg-gradient-to-r from-portal-surface/90 via-slate-900/90 to-portal-bg/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-portal-neon to-portal-cyan flex items-center justify-center shadow-glow-cyan">
              <SlidersHorizontal className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-black text-sm text-white tracking-wide bg-gradient-to-r from-white via-slate-100 to-portal-cyan bg-clip-text text-transparent">PORTAL MENU</span>
              <p className="text-[10px] text-portal-cyan font-bold">Navigation & Genres</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-portal-surface border border-portal-border hover:border-portal-cyan text-slate-400 hover:text-white transition-all shadow-sm active:scale-95"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-portal-cyan" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-6 scrollbar-thin scrollbar-thumb-portal-border">

          {/* SECTION 1: PRIMARY NAVIGATION TABS */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-portal-cyan" />
                EXPLORE
              </span>
              {totalGamesCount > 0 && (
                <span className="text-[9px] font-black text-portal-cyan bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/30">
                  {totalGamesCount} Games
                </span>
              )}
            </div>

            <div className="space-y-1">
              {/* All Games Tab */}
              <button
                onClick={() => handleTabClick('all')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all border ${
                  activeTab === 'all'
                    ? 'bg-portal-card text-portal-cyan border-portal-cyan/50 shadow-glow-cyan/20'
                    : 'bg-portal-surface/60 text-slate-300 border-portal-border/60 hover:bg-portal-card hover:text-white hover:border-portal-border'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'all' ? 'text-portal-cyan' : 'text-slate-400'}`} />
                  <span>All Games</span>
                </div>
                {activeTab === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-portal-cyan shadow-glow-cyan animate-pulse" />}
              </button>

              {/* Favorites Tab */}
              <button
                onClick={() => handleTabClick('favorites')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all border ${
                  activeTab === 'favorites'
                    ? 'bg-portal-card text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                    : 'bg-portal-surface/60 text-slate-300 border-portal-border/60 hover:bg-portal-card hover:text-white hover:border-portal-border'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className={`w-4 h-4 shrink-0 ${favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                  <span>Favorites</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'favorites'
                    ? 'bg-rose-500 text-black'
                    : favoritesCount > 0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-portal-surface text-slate-500'
                }`}>
                  {favoritesCount}
                </span>
              </button>

              {/* Hall of Fame / Leaderboard Tab */}
              <button
                onClick={() => {
                  onOpenLeaderboard();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-portal-surface/60 text-portal-gold border border-portal-border/60 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-300 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4 text-portal-gold group-hover:scale-110 transition-transform" />
                  <span>Hall of Fame</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-amber-500/70 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* About Team Tab */}
              <button
                onClick={() => handleTabClick('about')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all border ${
                  activeTab === 'about'
                    ? 'bg-portal-card text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(192,132,252,0.2)]'
                    : 'bg-portal-surface/60 text-slate-300 border-portal-border/60 hover:bg-portal-card hover:text-white hover:border-portal-border'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-4 h-4 shrink-0 ${activeTab === 'about' ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span>About Team</span>
                </div>
                <span className="text-[9px] font-bold text-purple-400/80 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                  4 Devs
                </span>
              </button>
            </div>
          </div>

          {/* SECTION: GAMIFICATION & QUESTS */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <Target className="w-3 h-3 text-purple-400" />
                QUESTS & REWARDS
              </span>
              <span className="text-[9px] text-purple-400 font-black uppercase bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/30">
                LIVE
              </span>
            </div>

            <div className="space-y-1">
              {/* Daily Quests Button */}
              {onOpenQuests && (
                <button
                  onClick={() => {
                    onOpenQuests();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-950/40 via-portal-surface/60 to-slate-900/60 text-purple-300 border border-purple-500/40 hover:border-purple-400 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Target className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>Daily Quests</span>
                  </div>
                  {unclaimedQuestsCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-cyan-400 text-black animate-bounce shadow-glow-cyan">
                      {unclaimedQuestsCount} CLAIM
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-purple-400/80 bg-purple-500/15 px-1.5 py-0.2 rounded border border-purple-500/30">
                      3/day
                    </span>
                  )}
                </button>
              )}

              {/* Holographic Trophy Vault Button */}
              {onOpenTrophies && (
                <button
                  onClick={() => {
                    onOpenTrophies();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-950/30 via-portal-surface/60 to-slate-900/60 text-amber-300 border border-amber-500/40 hover:border-amber-400 hover:text-white hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Trophy Vault</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500/70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Game Roulette Quick-Picker */}
              {onOpenRoulette && (
                <button
                  onClick={() => {
                    onOpenRoulette();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-950/40 via-teal-950/40 to-portal-surface/60 text-portal-cyan border border-cyan-500/40 hover:border-cyan-300 hover:text-white hover:shadow-glow-cyan/30 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Dices className="w-4 h-4 text-portal-cyan group-hover:rotate-180 transition-transform duration-500" />
                    <span>Game Roulette</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    RANDOM
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: CATEGORIES & GENRES */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-portal-neon" />
                GENRES & MODES
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Filter</span>
            </div>

            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id && activeTab === 'all';
                const count = categoryCounts[cat.id] ?? 0;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all border ${
                      isSelected
                        ? cat.activeBg
                        : 'bg-portal-surface/40 text-slate-300 border-portal-border/40 hover:bg-portal-card hover:text-white hover:border-portal-border'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? '' : cat.color}`} />
                      <span className="tracking-wide text-[11px] sm:text-xs">{cat.label}</span>
                    </div>

                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? 'bg-black/40 text-white'
                          : 'text-slate-500 bg-portal-bg/60'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Profile Quick Widget */}
        <div className="p-3 border-t border-portal-border/60 bg-portal-surface/50">
          <div
            onClick={onOpenUsernameModal}
            className="flex items-center justify-between p-2 rounded-xl bg-portal-card border border-portal-border/80 hover:border-portal-cyan/60 cursor-pointer group transition-all"
            title="Edit Player Handle"
          >
            <div className="flex items-center gap-2 min-w-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={playerTag}
                  className="w-7 h-7 rounded-full bg-slate-800 border border-portal-cyan/50 shrink-0 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-portal-surface border border-portal-cyan/50 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-3.5 h-3.5 text-portal-cyan" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Player Tag</p>
                <p className="text-xs font-black text-portal-cyan truncate">{playerTag || 'Set Gamer Tag'}</p>
              </div>
            </div>
            <div className="p-1 rounded-lg bg-portal-surface group-hover:bg-portal-cyan group-hover:text-black text-slate-400 transition-colors">
              <Edit3 className="w-3 h-3" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
