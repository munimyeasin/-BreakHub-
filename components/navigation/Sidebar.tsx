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
  { id: 'ALL', label: 'All Genres', icon: Sparkles, color: 'text-black', activeBg: 'bg-portal-cyan text-black border-2 border-black shadow-neo-sm' },
  { id: 'UPCOMING', label: 'Upcoming / Soon', icon: Clock, color: 'text-black', activeBg: 'bg-portal-yellow text-black border-2 border-black shadow-neo-sm' },
  { id: 'ARCADE', label: 'Arcade Classics', icon: Gamepad2, color: 'text-black', activeBg: 'bg-portal-cyan text-black border-2 border-black shadow-neo-sm' },
  { id: 'ACTION', label: 'Action & Rush', icon: Zap, color: 'text-black', activeBg: 'bg-portal-pink text-black border-2 border-black shadow-neo-sm' },
  { id: 'PUZZLE', label: 'Neural Puzzles', icon: Grid, color: 'text-black', activeBg: 'bg-portal-green text-black border-2 border-black shadow-neo-sm' },
  { id: 'STRATEGY', label: 'Tactical Strategy', icon: Cpu, color: 'text-black', activeBg: 'bg-portal-butter text-black border-2 border-black shadow-neo-sm' },
  { id: 'CARD', label: 'Card & Memory', icon: Layers, color: 'text-black', activeBg: 'bg-portal-yellow text-black border-2 border-black shadow-neo-sm' },
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
        className={`fixed inset-0 bg-black/85 backdrop-blur-md z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* 2. Slide Bar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[61px] left-0 z-50 lg:z-20 h-full lg:h-[calc(100vh-61px)] w-72 sm:w-80 lg:w-64 shrink-0 bg-white border-r-3 lg:border-r-4 border-black flex flex-col justify-between transition-transform duration-300 ease-in-out select-none shadow-neo-lg lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header of Slide Bar (Mobile Only) */}
        <div className="p-4 border-b-3 border-black flex items-center justify-between lg:hidden bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-portal-yellow border-2 border-black flex items-center justify-center shadow-neo-sm">
              <SlidersHorizontal className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-sm text-black tracking-wide uppercase">PORTAL MENU</span>
              <p className="text-[10px] text-black font-black uppercase">Navigation & Genres</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white hover:bg-portal-pink text-black border-2 border-black shadow-neo-sm transition-all"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5 scrollbar-thin scrollbar-thumb-black">

          {/* SECTION 1: PRIMARY NAVIGATION TABS */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-black uppercase flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                EXPLORE
              </span>
              {totalGamesCount > 0 && (
                <span className="text-[9px] font-black text-black bg-portal-cyan px-2 py-0.5 rounded-md border-2 border-black shadow-neo-sm uppercase">
                  {totalGamesCount} Games
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {/* All Games Tab */}
              <button
                onClick={() => handleTabClick('all')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all border-2 border-black uppercase ${
                  activeTab === 'all'
                    ? 'bg-portal-cyan text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5'
                    : 'bg-white text-black hover:bg-portal-cyan/30 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 stroke-[2.5] shrink-0 text-black" />
                  <span>All Games</span>
                </div>
                {activeTab === 'all' && <div className="w-2 h-2 rounded-full bg-black" />}
              </button>

              {/* Favorites Tab */}
              <button
                onClick={() => handleTabClick('favorites')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all border-2 border-black uppercase ${
                  activeTab === 'favorites'
                    ? 'bg-portal-pink text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5'
                    : 'bg-white text-black hover:bg-portal-pink/30 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className={`w-4 h-4 stroke-[2.5] shrink-0 ${favoritesCount > 0 ? 'fill-portal-pink text-black' : 'text-black'}`} />
                  <span>Favorites</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border border-black ${
                  activeTab === 'favorites'
                    ? 'bg-black text-white'
                    : favoritesCount > 0
                    ? 'bg-portal-pink text-black'
                    : 'bg-slate-100 text-black'
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
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all uppercase group"
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4 stroke-[2.5]" />
                  <span>Hall of Fame</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* About Team Tab */}
              <button
                onClick={() => handleTabClick('about')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all border-2 border-black uppercase ${
                  activeTab === 'about'
                    ? 'bg-portal-butter text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5'
                    : 'bg-white text-black hover:bg-portal-butter/30 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 stroke-[2.5] shrink-0 text-black" />
                  <span>About Team</span>
                </div>
                <span className="text-[9px] font-black text-black bg-portal-butter px-1.5 py-0.5 rounded border border-black uppercase shadow-neo-sm">
                  4 Devs
                </span>
              </button>
            </div>
          </div>

          {/* SECTION: GAMIFICATION & QUESTS */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-black uppercase flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                QUESTS & REWARDS
              </span>
              <span className="text-[9px] text-black font-black uppercase bg-portal-lime px-2 py-0.5 rounded-md border-2 border-black shadow-neo-sm">
                LIVE
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Daily Quests Button */}
              {onOpenQuests && (
                <button
                  onClick={() => {
                    onOpenQuests();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-portal-pink text-black border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all uppercase group"
                >
                  <div className="flex items-center gap-2.5">
                    <Target className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>Daily Quests</span>
                  </div>
                  {unclaimedQuestsCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-portal-cyan text-black border border-black shadow-neo-sm animate-bounce">
                      {unclaimedQuestsCount} CLAIM
                    </span>
                  ) : (
                    <span className="text-[9px] font-black text-black bg-portal-yellow px-1.5 py-0.5 rounded border border-black">
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
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all uppercase group"
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>Trophy Vault</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Game Roulette Quick-Picker */}
              {onOpenRoulette && (
                <button
                  onClick={() => {
                    onOpenRoulette();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-portal-cyan text-black border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all uppercase group"
                >
                  <div className="flex items-center gap-2.5">
                    <Dices className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>Game Roulette</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-portal-cyan text-black border border-black">
                    RANDOM
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: CATEGORIES & GENRES */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-black uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                GENRES & MODES
              </span>
              <span className="text-[9px] text-black font-black uppercase">Filter</span>
            </div>

            <div className="space-y-1.5">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id && activeTab === 'all';
                const count = categoryCounts[cat.id] ?? 0;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all border-2 border-black uppercase ${
                      isSelected
                        ? cat.activeBg
                        : 'bg-white text-black hover:bg-slate-100 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className="w-3.5 h-3.5 stroke-[2.5] shrink-0 text-black" />
                      <span className="tracking-wide text-[11px] sm:text-xs">{cat.label}</span>
                    </div>

                    {count > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border border-black ${
                        isSelected
                          ? 'bg-black text-white'
                          : 'text-black bg-slate-100'
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
        <div className="p-3 border-t-3 border-black bg-white">
          <div
            onClick={onOpenUsernameModal}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white border-2 border-black hover:bg-portal-yellow text-black cursor-pointer group transition-all shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5"
            title="Edit Player Handle"
          >
            <div className="flex items-center gap-2 min-w-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={playerTag}
                  className="w-7 h-7 rounded-full bg-slate-100 border-2 border-black shrink-0 object-cover shadow-neo-sm"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-portal-cyan border-2 border-black flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 group-hover:text-black uppercase tracking-wider">Player Tag</p>
                <p className="text-xs font-black text-black group-hover:text-black truncate uppercase">{playerTag || 'Set Gamer Tag'}</p>
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-black group-hover:text-white text-black border border-black shadow-neo-sm transition-colors">
              <Edit3 className="w-3 h-3 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
