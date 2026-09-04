'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Gamepad2,
  Heart,
  Search,
  Sparkles,
  Zap,
  User,
  Edit3,
  Users,
  Menu,
  SlidersHorizontal,
  X,
  Target,
  Dices
} from 'lucide-react';
import GameGrid from '@/components/games/GameGrid';
import SpotlightBanner from '@/components/games/SpotlightBanner';
import GameModal from '@/components/ui/GameModal';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';
import UsernamePromptModal from '@/components/ui/UsernamePromptModal';
import ComingSoonModal from '@/components/ui/ComingSoonModal';
import AboutSection from '@/components/about/AboutSection';
import Sidebar from '@/components/navigation/Sidebar';
import PlayerXpBadge from '@/components/gamification/PlayerXpBadge';
import DailyQuestsModal from '@/components/gamification/DailyQuestsModal';
import TrophyRoomModal from '@/components/gamification/TrophyRoomModal';
import LevelUpCelebrationModal from '@/components/gamification/LevelUpCelebrationModal';
import GameRouletteModal from '@/components/gamification/GameRouletteModal';
import ActivityTicker from '@/components/gamification/ActivityTicker';
import { gamification, GamificationState, LevelInfo } from '@/lib/gamification';
import { Game } from '@/lib/types';
import { INITIAL_GAMES } from '@/lib/gamesData';
import { getAvatarUrl } from '@/lib/avatar';

export default function ArcadePortalDashboard() {
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'about'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hypedGames, setHypedGames] = useState<string[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // User Profile / Tag State
  const [playerTag, setPlayerTag] = useState<string>('');
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [pendingGameToPlay, setPendingGameToPlay] = useState<Game | null>(null);

  // Active Game, Leaderboard & Coming Soon Modals
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [comingSoonGame, setComingSoonGame] = useState<Game | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardGameId, setLeaderboardGameId] = useState<string | 'global'>('global');

  // Gamification Modal States
  const [isQuestsModalOpen, setIsQuestsModalOpen] = useState(false);
  const [isTrophiesModalOpen, setIsTrophiesModalOpen] = useState(false);
  const [isRouletteModalOpen, setIsRouletteModalOpen] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelInfo | null>(null);
  const [gameState, setGameState] = useState<GamificationState>(() => gamification.getState());

  // Listen to gamification state changes and level-ups
  useEffect(() => {
    const handleSync = (e: CustomEvent<GamificationState>) => {
      setGameState(e.detail || gamification.getState());
    };

    const handleLevelUp = (e: CustomEvent<LevelInfo>) => {
      if (e.detail) {
        setLevelUpInfo(e.detail);
      }
    };

    window.addEventListener('stressbuster_gamification_sync' as any, handleSync);
    window.addEventListener('stressbuster_levelup' as any, handleLevelUp);
    return () => {
      window.removeEventListener('stressbuster_gamification_sync' as any, handleSync);
      window.removeEventListener('stressbuster_levelup' as any, handleLevelUp);
    };
  }, []);

  // 1. Fetch live games catalog
  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => {
        if (data.games) setGames(data.games);
      })
      .catch(err => console.error('Failed to load games', err));
  }, []);

  // 2. Load LocalStorage player data, favorites, hyped games & user ratings
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('stressbuster_favorites') || localStorage.getItem('nexus_favorites');
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

      const savedHyped = localStorage.getItem('stressbuster_hyped_games') || localStorage.getItem('nexus_hyped_games');
      if (savedHyped) setHypedGames(JSON.parse(savedHyped));

      const savedRatings = localStorage.getItem('stressbuster_user_ratings') || localStorage.getItem('nexus_user_ratings');
      if (savedRatings) setUserRatings(JSON.parse(savedRatings));

      const savedTag = localStorage.getItem('stressbuster_player_tag') || localStorage.getItem('nexus_player_tag');
      if (savedTag && savedTag.trim().length >= 2) {
        setPlayerTag(savedTag.trim());
      } else {
        // Leave empty for first-time visitors so they are prompted to name themselves before playing
        setPlayerTag('');
      }
    } catch {}
  }, []);

  const handleRateGame = async (gameId: string, rating: number) => {
    setUserRatings(prev => {
      const updated = { ...prev, [gameId]: rating };
      try {
        localStorage.setItem('stressbuster_user_ratings', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Gamification Hook: Record rating XP & daily quest progression
    try {
      gamification.recordGameRated(gameId, rating);
    } catch {}

    try {
      await fetch('/api/games/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, rating }),
      });
    } catch {}
  };

  const handleSelectGameFromRoulette = (selectedGame: any) => {
    setIsRouletteModalOpen(false);
    handleLaunchGame(selectedGame);
  };

  const unclaimedQuestsCount = useMemo(() => {
    return (gameState.dailyQuests?.progress || []).filter(p => p.completed && !p.claimed).length;
  }, [gameState]);

  const toggleFavorite = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId];
      try {
        localStorage.setItem('stressbuster_favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleHype = (gameId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isAdding = !hypedGames.includes(gameId);
    setHypedGames(prev => {
      const updated = isAdding ? [...prev, gameId] : prev.filter(id => id !== gameId);
      try {
        localStorage.setItem('stressbuster_hyped_games', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Optimistically update games state
    setGames(prev =>
      prev.map(g => {
        if (g.id === gameId || g.slug === gameId) {
          const current = g.hype_count || 0;
          return { ...g, hype_count: isAdding ? current + 1 : Math.max(0, current - 1) };
        }
        return g;
      })
    );

    // Update comingSoonGame state if open
    setComingSoonGame(prev => {
      if (prev && (prev.id === gameId || prev.slug === gameId)) {
        const current = prev.hype_count || 0;
        return { ...prev, hype_count: isAdding ? current + 1 : Math.max(0, current - 1) };
      }
      return prev;
    });

    // Persist in backend
    try {
      fetch('/api/games/hype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, increment: isAdding }),
      }).catch(err => console.error('Failed to update hype count', err));
    } catch {}
  };

  const launchGameSession = (game: Game) => {
    // Optimistically increment play count in local state
    setGames(prev =>
      prev.map(g => (g.id === game.id || g.slug === game.slug ? { ...g, play_count: (g.play_count || 0) + 1 } : g))
    );

    // Persist increment in backend
    try {
      fetch('/api/games/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id }),
      }).catch(err => console.error('Failed to increment play count', err));
    } catch {}

    const updatedGame = { ...game, play_count: (game.play_count || 0) + 1 };
    setActiveGame(updatedGame);
  };

  // Launch Game Directly or show Coming Soon / Mandatory Username Modal
  const handleLaunchGame = (game: Game) => {
    if (game.status === 'hidden') return;
    if (game.status === 'coming_soon') {
      setComingSoonGame(game);
      return;
    }

    // Enforce mandatory player naming before launching their first game
    if (!playerTag || playerTag.trim().length < 2) {
      setPendingGameToPlay(game);
      setIsUsernameModalOpen(true);
      return;
    }

    launchGameSession(game);
  };

  const handleConfirmUsername = (newUsername: string) => {
    const clean = newUsername.trim();
    if (!clean) return;
    const previousTag = playerTag;
    setPlayerTag(clean);
    try {
      localStorage.setItem('stressbuster_player_tag', clean);
      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUsername: previousTag, newUsername: clean })
      }).catch(err => console.error('Failed to sync username update', err));
    } catch {}

    setIsUsernameModalOpen(false);

    if (pendingGameToPlay) {
      const gameToPlay = pendingGameToPlay;
      setPendingGameToPlay(null);
      if (gameToPlay.status === 'coming_soon') {
        setComingSoonGame(gameToPlay);
      } else {
        launchGameSession(gameToPlay);
      }
    }
  };

  const handleOpenLeaderboard = (gameId: string | 'global') => {
    setLeaderboardGameId(gameId);
    setIsLeaderboardOpen(true);
  };

  // Dynamic category counts for non-hidden games
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0, UPCOMING: 0 };
    games.forEach(g => {
      if (g.status === 'hidden') return;
      counts['ALL'] = (counts['ALL'] || 0) + 1;
      if (g.status === 'coming_soon') {
        counts['UPCOMING'] = (counts['UPCOMING'] || 0) + 1;
      }
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
    return counts;
  }, [games]);

  // Filtered games (excluding hidden games)
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      if (game.status === 'hidden') return false;
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            game.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            game.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL'
        ? true
        : selectedCategory === 'UPCOMING'
        ? game.status === 'coming_soon'
        : game.category === selectedCategory;
      const matchesTab = activeTab === 'favorites' ? favorites.includes(game.id) : true;
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [games, searchQuery, selectedCategory, activeTab, favorites]);

  const avatarUrl = playerTag ? getAvatarUrl(playerTag) : null;

  return (
    <div className="min-h-screen bg-portal-bg text-slate-100 font-sans antialiased selection:bg-portal-cyan selection:text-black">

      {/* 1. STICKY APP HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-portal-bg/95 border-b border-portal-border/80 px-3 sm:px-6 py-1.5 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col gap-1.5 sm:gap-2.5">

          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2.5 sm:gap-3">

            {/* Left Controls: Sidebar Toggle & Brand Logo */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className="relative group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-purple-950/80 border border-cyan-400/70 hover:border-cyan-300 text-cyan-300 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.65)] transition-all duration-300 active:scale-95 shrink-0"
                title="Open Genres, Navigation & Filters"
                aria-label="Toggle navigation slide bar"
              >
                {/* Ambient pulsing neon background glow */}
                <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-portal-cyan via-purple-500 to-portal-neon opacity-40 group-hover:opacity-90 blur-sm transition-opacity duration-300 pointer-events-none" />

                {/* Inner button content */}
                <div className="relative flex items-center gap-1.5 sm:gap-2 z-10">
                  {isSidebarOpen ? (
                    <X className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-portal-cyan animate-in fade-in zoom-in duration-200" />
                  ) : (
                    <div className="relative flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-portal-cyan group-hover:rotate-180 transition-transform duration-500" />
                      {(selectedCategory !== 'ALL' || activeTab !== 'all') && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-portal-cyan opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-portal-cyan shadow-glow-cyan"></span>
                        </span>
                      )}
                    </div>
                  )}

                  <span className="font-black text-[11px] sm:text-xs tracking-wider uppercase bg-gradient-to-r from-cyan-200 via-white to-portal-cyan bg-clip-text text-transparent">
                    {isSidebarOpen ? 'CLOSE' : 'GENRES'}
                  </span>

                  {/* Active filter counter pill if active */}
                  {selectedCategory !== 'ALL' && !isSidebarOpen && (
                    <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-portal-cyan/20 text-portal-cyan border border-portal-cyan/40">
                      {selectedCategory}
                    </span>
                  )}
                </div>
              </button>

              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => { setActiveTab('all'); setSelectedCategory('ALL'); setSearchQuery(''); }}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-portal-neon to-portal-cyan flex items-center justify-center shadow-glow-cyan">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm sm:text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-portal-cyan bg-clip-text text-transparent">
                      STRESS<span className="text-portal-cyan">BUSTER</span>
                    </span>
                    <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase rounded bg-portal-neon/30 text-purple-300 border border-purple-500/40">
                      PORTAL
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold hidden xs:block">HTML5 Mini-Games</p>
                </div>
              </div>
            </div>

            {/* Desktop Search Bar & Leaderboard Action (Hidden on Mobile < md) */}
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-lg mx-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search games, genres, puzzles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-8 py-2 bg-portal-surface border border-portal-border rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-portal-cyan focus:ring-1 focus:ring-portal-cyan transition-all appearance-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => handleOpenLeaderboard('global')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/50 hover:border-amber-400 text-portal-gold font-black text-xs hover:shadow-glow-gold active:scale-95 transition-all shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)] group"
                title="Open Global Leaderboard"
              >
                <Trophy className="w-3.5 h-3.5 text-portal-gold group-hover:scale-110 transition-transform" />
                <span>Leaderboard</span>
              </button>
            </div>

            {/* Gamification Player XP Badge & Gamer Tag */}
            <div className="flex items-center gap-2 shrink-0">
              <PlayerXpBadge
                onOpenQuests={() => setIsQuestsModalOpen(true)}
                onOpenTrophies={() => setIsTrophiesModalOpen(true)}
              />

              {playerTag ? (
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-portal-surface border border-portal-border hover:border-portal-cyan/50 text-xs font-bold transition-all shadow-sm"
                  title="Change Player Handle"
                >
                  {avatarUrl && <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-slate-800 border border-portal-cyan/40 shrink-0" />}
                  <span className="text-portal-cyan font-black max-w-[80px] sm:max-w-[110px] truncate">{playerTag}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              ) : (
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-portal-surface border border-portal-border hover:border-portal-cyan text-slate-300 text-xs font-bold transition-all"
                >
                  <User className="w-3.5 h-3.5 text-portal-cyan" />
                  <span className="hidden sm:inline">Set Handle</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar & Leaderboard Button Row (Visible on mobile/tablet < md) */}
          <div className="flex md:hidden items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search games, genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full pl-10 pr-9 py-2 bg-portal-surface border border-portal-border rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-portal-cyan focus:ring-1 focus:ring-portal-cyan transition-all appearance-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Mobile Leaderboard Button near Search */}
            <button
              onClick={() => handleOpenLeaderboard('global')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-500/50 text-portal-gold font-black text-xs hover:shadow-glow-gold active:scale-95 transition-all shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              title="Open Global Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5 text-portal-gold animate-bounce" />
              <span>Leaderboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* Real-time Cyber Activity Marquee Ticker */}
      <ActivityTicker />

      {/* 2. DUAL-PANE LAYOUT: LEFT SLIDE BAR + MAIN PORTAL ARENA */}
      <div className="flex w-full min-h-[calc(100vh-61px)]">

        {/* LEFT SLIDE BAR */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
          selectedCategory={selectedCategory}
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            setIsSidebarOpen(false);
          }}
          favoritesCount={favorites.length}
          onOpenLeaderboard={() => handleOpenLeaderboard('global')}
          playerTag={playerTag}
          avatarUrl={avatarUrl}
          onOpenUsernameModal={() => setIsUsernameModalOpen(true)}
          onOpenQuests={() => setIsQuestsModalOpen(true)}
          onOpenTrophies={() => setIsTrophiesModalOpen(true)}
          onOpenRoulette={() => setIsRouletteModalOpen(true)}
          unclaimedQuestsCount={unclaimedQuestsCount}
          categoryCounts={categoryCounts}
          totalGamesCount={categoryCounts['ALL'] || 0}
        />

        {/* MAIN CONTENT ARENA */}
        <main className="flex-1 w-full min-w-0 px-2.5 sm:px-6 py-2.5 sm:py-3 pb-24 overflow-x-hidden">
          {activeTab === 'about' ? (
            <AboutSection
              onExploreGames={() => {
                setActiveTab('all');
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              onOpenLeaderboard={() => handleOpenLeaderboard('global')}
            />
          ) : (
            <>
              {/* SPOTLIGHT HERO BANNER (Top featured: Cyber Slicer & Neon Starfighter) */}
              {activeTab === 'all' && selectedCategory === 'ALL' && !searchQuery && (
                <SpotlightBanner
                  games={games}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onPlayGame={(game) => handleLaunchGame(game)}
                  onViewLeaderboard={(gameId) => handleOpenLeaderboard(gameId)}
                />
              )}

              {/* Active Filter Bar & Breadcrumb Status */}
              <div className="flex items-center justify-between mb-2.5 sm:mb-3 pb-1 sm:pb-1.5 border-b border-portal-border/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-portal-cyan" />
                    {activeTab === 'favorites' ? 'Your Saved Games' : 'Available Mini-Games'}
                    <span className="text-xs text-slate-500 font-bold">({filteredGames.length})</span>
                  </h2>

                  {selectedCategory !== 'ALL' && activeTab === 'all' && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-portal-cyan/15 text-portal-cyan text-[10px] font-black border border-portal-cyan/40">
                      {selectedCategory === 'UPCOMING' ? 'Filter: Upcoming / Soon' : `Category: ${selectedCategory}`}
                      <button
                        onClick={() => setSelectedCategory('ALL')}
                        className="hover:text-white ml-0.5"
                        title="Clear category filter"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>

                {/* Quick reset if filter or search active */}
                {(selectedCategory !== 'ALL' || searchQuery || activeTab !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setSearchQuery('');
                      setActiveTab('all');
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-portal-cyan underline transition-colors"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>

              {/* GAME GRID */}
              <GameGrid
                games={filteredGames}
                favorites={favorites}
                hypedGames={hypedGames}
                isFavoritesTab={activeTab === 'favorites'}
                onToggleFavorite={toggleFavorite}
                onToggleHype={handleToggleHype}
                onPlayGame={(game) => handleLaunchGame(game)}
                onViewLeaderboard={(gameId, e) => {
                  e.stopPropagation();
                  handleOpenLeaderboard(gameId);
                }}
                onResetFilters={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setActiveTab('all');
                }}
              />

              {/* FOOTER TEAM STRIP */}
              <footer className="mt-14 pt-8 border-t border-portal-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-300 font-bold">
                    <Gamepad2 className="w-4 h-4 text-portal-cyan shrink-0" />
                    <span>Stress Buster Project • Developed by:</span>
                  </div>
                  <div className="pl-6 text-slate-200 font-semibold">
                    <strong className="text-white">Tahida</strong>, <strong className="text-white">Marzia</strong>, <strong className="text-white">Rahul</strong>, & <strong className="text-white">Munim Yeasin</strong>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1.5 text-portal-cyan hover:underline font-bold self-start sm:self-center"
                >
                  <Users className="w-3.5 h-3.5" />
                  View Full Team & Project Details →
                </button>
              </footer>
            </>
          )}
        </main>
      </div>

      {/* 5. USERNAME PROMPT MODAL */}
      <UsernamePromptModal
        isOpen={isUsernameModalOpen}
        initialUsername={playerTag}
        title={pendingGameToPlay ? "Enter Your Gamer Tag" : (playerTag ? "Update Gamer Tag" : "Create Player Handle")}
        subtitle={
          pendingGameToPlay
            ? `Choose your gamer tag before launching ${pendingGameToPlay.title} to record your high scores!`
            : "Choose a player handle to record your high scores on the global leaderboard."
        }
        confirmText={pendingGameToPlay ? "CONFIRM & PLAY NOW" : "SAVE HANDLE"}
        onClose={() => {
          setIsUsernameModalOpen(false);
          setPendingGameToPlay(null);
        }}
        onConfirm={handleConfirmUsername}
      />

      {/* 6. PLAYABLE GAME MODAL */}
      {activeGame && (
        <GameModal
          game={activeGame}
          username={playerTag || 'Player'}
          onChangeUsername={() => {
            setPendingGameToPlay(activeGame);
            setIsUsernameModalOpen(true);
          }}
          onClose={() => setActiveGame(null)}
          onOpenLeaderboard={(gameId) => handleOpenLeaderboard(gameId)}
          onNextGameRoulette={() => {
            const activeGames = games.filter(g => g.status === 'active' && g.id !== activeGame.id);
            if (activeGames.length > 0) {
              const nextGame = activeGames[Math.floor(Math.random() * activeGames.length)];
              handleLaunchGame(nextGame);
            }
          }}
          userRating={userRatings[activeGame.id] || null}
          onRateGame={handleRateGame}
        />
      )}

      {/* 7. GLOBAL & PER-GAME LEADERBOARD MODAL */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          initialGameId={leaderboardGameId}
          games={games.filter(g => g.status !== 'hidden')}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}

      {/* 8. COMING SOON MODAL */}
      {comingSoonGame && (
        <ComingSoonModal
          game={comingSoonGame}
          isHyped={hypedGames.includes(comingSoonGame.id)}
          onToggleHype={(gameId) => handleToggleHype(gameId)}
          onClose={() => setComingSoonGame(null)}
          onExploreOtherGames={() => {
            setActiveTab('all');
            setSelectedCategory('ALL');
            setSearchQuery('');
          }}
        />
      )}

      {/* 9. DAILY QUESTS & BOUNTIES MODAL */}
      <DailyQuestsModal
        isOpen={isQuestsModalOpen}
        onClose={() => setIsQuestsModalOpen(false)}
        onPlayGame={(gameId) => {
          setIsQuestsModalOpen(false);
          if (gameId) {
            const g = games.find(item => item.id === gameId);
            if (g) handleLaunchGame(g);
          }
        }}
        onOpenTrophies={() => {
          setIsQuestsModalOpen(false);
          setIsTrophiesModalOpen(true);
        }}
      />

      {/* 10. HOLOGRAPHIC TROPHY VAULT MODAL */}
      <TrophyRoomModal
        isOpen={isTrophiesModalOpen}
        onClose={() => setIsTrophiesModalOpen(false)}
      />

      {/* 11. CYBER LEVEL-UP CELEBRATION MODAL */}
      <LevelUpCelebrationModal
        levelInfo={levelUpInfo}
        onClose={() => setLevelUpInfo(null)}
        onOpenTrophies={() => {
          setLevelUpInfo(null);
          setIsTrophiesModalOpen(true);
        }}
      />

      {/* 12. NEURAL GAME ROULETTE MODAL */}
      <GameRouletteModal
        isOpen={isRouletteModalOpen}
        onClose={() => setIsRouletteModalOpen(false)}
        games={games}
        onSelectGame={handleSelectGameFromRoulette}
      />
    </div>
  );
}
