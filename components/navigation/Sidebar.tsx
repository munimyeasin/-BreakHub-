'use client';

import React from 'react';
import {
  Gamepad2,
  Heart,
  Trophy,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  Grid,
  X,
  Clock
} from 'lucide-react';

export type PortalTab = 'all' | 'favorites' | 'about-project' | 'about-devs';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
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
  onOpenGameRequests?: () => void;
  unclaimedQuestsCount?: number;
  categoryCounts?: Record<string, number>;
  totalGamesCount?: number;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Genres', icon: Sparkles },
  { id: 'UPCOMING', label: 'Coming Soon', icon: Clock },
  { id: 'ARCADE', label: 'Arcade', icon: Gamepad2 },
  { id: 'ACTION', label: 'Action', icon: Zap },
  { id: 'PUZZLE', label: 'Puzzles', icon: Grid },
  { id: 'STRATEGY', label: 'Strategy', icon: Cpu },
  { id: 'CARD', label: 'Cards', icon: Layers },
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
  onOpenGameRequests,
  unclaimedQuestsCount = 0,
  categoryCounts = {},
  totalGamesCount = 0
}: SidebarProps) {
  const handleTabClick = (tab: PortalTab) => {
    onSelectTab(tab);
    if (tab !== 'all') {
      onSelectCategory('ALL');
    }
    onClose();
  };

  const handleCategoryClick = (catId: string) => {
    onSelectCategory(catId);
    if (activeTab !== 'all') {
      onSelectTab('all');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      {/* Sidebar Panel */}
      <div className="relative w-72 max-w-full bg-white h-full shadow-xl z-10 flex flex-col border-r border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              BH
            </div>
            <span className="font-bold text-slate-900">Break Hub</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">
              Navigation
            </span>
            <button
              onClick={() => handleTabClick('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gamepad2 className="w-4 h-4" />
                <span>All Games</span>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {totalGamesCount}
              </span>
            </button>

            <button
              onClick={() => handleTabClick('favorites')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4" />
                <span>Favorites</span>
              </div>
              <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-semibold">
                {favoritesCount}
              </span>
            </button>

            <button
              onClick={() => {
                onOpenLeaderboard();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Global Leaderboard</span>
            </button>
          </div>

          {/* Genres */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">
              Genres
            </span>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeTab === 'all' && selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </div>
                  {cat.id !== 'ALL' && categoryCounts[cat.id] !== undefined && (
                    <span className="text-xs text-slate-400">
                      {categoryCounts[cat.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
