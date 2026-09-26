'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trophy,
  Gamepad2,
  Search,
  Zap,
  User,
  Edit3,
  Users,
  SlidersHorizontal,
  X,
  Sun,
  Moon,
  Palette,
  Sparkles
} from 'lucide-react';
import dynamic from 'next/dynamic';
import GameGrid from '@/components/games/GameGrid';
import SpotlightBanner from '@/components/games/SpotlightBanner';
import ThemeOnboardingHint from '@/components/ui/ThemeOnboardingHint';
import AboutSection from '@/components/about/AboutSection';
import Sidebar, { PortalTab } from '@/components/navigation/Sidebar';
import PlayerXpBadge from '@/components/gamification/PlayerXpBadge';
import ActivityTicker from '@/components/gamification/ActivityTicker';

// High-Performance Dynamic Chunk Loading for Modals (Zero Initial Bundle Overhead)
const GameModal = dynamic(() => import('@/components/ui/GameModal'), { ssr: false });
const LeaderboardModal = dynamic(() => import('@/components/leaderboard/LeaderboardModal'), { ssr: false });
const UsernamePromptModal = dynamic(() => import('@/components/ui/UsernamePromptModal'), { ssr: false });
const ComingSoonModal = dynamic(() => import('@/components/ui/ComingSoonModal'), { ssr: false });
const ThemeSelectorModal = dynamic(() => import('@/components/ui/ThemeSelectorModal'), { ssr: false });
const DailyQuestsModal = dynamic(() => import('@/components/gamification/DailyQuestsModal'), { ssr: false });
const TrophyRoomModal = dynamic(() => import('@/components/gamification/TrophyRoomModal'), { ssr: false });
const LevelUpCelebrationModal = dynamic(() => import('@/components/gamification/LevelUpCelebrationModal'), { ssr: false });
const GameRouletteModal = dynamic(() => import('@/components/gamification/GameRouletteModal'), { ssr: false });
const GameRequestModal = dynamic(() => import('@/components/ui/GameRequestModal'), { ssr: false });
import { useTheme } from '@/context/ThemeContext';
import { gamification, GamificationState, LevelInfo, getDefaultState } from '@/lib/gamification';
import { Game } from '@/lib/types';
import { INITIAL_GAMES } from '@/lib/gamesData';
import { getAvatarUrl } from '@/lib/avatar';

export default function ArcadePortalDashboard() {
  const { toggleTheme, isThemeSelectorOpen, setIsThemeSelectorOpen, isDark } = useTheme();
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PortalTab>('all');
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
  const [isGameRequestModalOpen, setIsGameRequestModalOpen] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelInfo | null>(null);
  const [gameState, setGameState] = useState<GamificationState>(() => getDefaultState());

  const [isHydrated, setIsHydrated] = useState(false);

  // Gamification Synchronization on Client Mount & Event Updates
  useEffect(() => {
    try {
      setGameState(gamification.getState());
    } catch {}

    const handleSync = (e: any) => {
      setGameState(e?.detail || gamification.getState());
    };

    window.addEventListener('stressbuster_gamification_sync', handleSync as EventListener);
    return () => {
      window.removeEventListener('stressbuster_gamification_sync', handleSync as EventListener);
    };
  }, []);

  // 1. Initial State Hydration from URL Search Parameters & Session Storage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      let savedRoute: any = null;
      try {
        const raw = sessionStorage.getItem('stressbuster_active_route');
        if (raw) savedRoute = JSON.parse(raw);
      } catch {}

      // Tab resolution
      const tabParam = (params.get('tab') as PortalTab) || savedRoute?.tab;
      if (tabParam && ['all', 'favorites', 'about-project', 'about-devs'].includes(tabParam)) {
        setActiveTab(tabParam);
      }

      // Category / Genre resolution
      const genreParam = params.get('genre') || params.get('category') || savedRoute?.selectedCategory;
      if (genreParam && typeof genreParam === 'string') {
        setSelectedCategory(genreParam.toUpperCase());
      }

      // Search query resolution
      const qParam = params.get('q') || params.get('search') || savedRoute?.searchQuery;
      if (qParam && typeof qParam === 'string') {
        setSearchQuery(qParam);
      }

      // Active / Coming Soon Game resolution
      const gameParam =
        params.get('game') ||
        params.get('play') ||
        savedRoute?.activeGameSlug ||
        savedRoute?.comingSoonSlug;

      if (gameParam && typeof gameParam === 'string') {
        const targetGame = INITIAL_GAMES.find(
          g => g.slug.toLowerCase() === gameParam.toLowerCase() || g.id.toLowerCase() === gameParam.toLowerCase()
        );
        if (targetGame) {
          if (targetGame.status === 'coming_soon') {
            setComingSoonGame(targetGame);
          } else if (targetGame.status === 'active') {
            const savedTag =
              localStorage.getItem('stressbuster_player_tag') || localStorage.getItem('nexus_player_tag');
            if (savedTag && savedTag.trim().length >= 2) {
              setActiveGame(targetGame);
            } else {
              setPendingGameToPlay(targetGame);
              setIsUsernameModalOpen(true);
            }
          }
        }
      }

      // Modal state resolution
      const modalParam = params.get('modal') || savedRoute?.modal;
      const lbParam = params.get('gameId') || params.get('leaderboard') || savedRoute?.leaderboardGameId;
      if (modalParam === 'leaderboard' || (lbParam && modalParam !== 'null')) {
        setIsLeaderboardOpen(true);
        if (lbParam) setLeaderboardGameId(lbParam);
      } else if (modalParam === 'quests') {
        setIsQuestsModalOpen(true);
      } else if (modalParam === 'trophies') {
        setIsTrophiesModalOpen(true);
      } else if (modalParam === 'roulette') {
        setIsRouletteModalOpen(true);
      } else if (modalParam === 'requests' || modalParam === 'wishlist') {
        setIsGameRequestModalOpen(true);
      } else if (modalParam === 'themes') {
        setIsThemeSelectorOpen(true);
      } else if (modalParam === 'username') {
        setIsUsernameModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to hydrate URL / session state', e);
    } finally {
      setIsHydrated(true);
    }
  }, [setIsThemeSelectorOpen]);

  // 2. Synchronize active state with Browser URL and Session Storage
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams();

      // Tab
      if (activeTab !== 'all') {
        params.set('tab', activeTab);
      }

      // Genre / Category
      if (selectedCategory !== 'ALL') {
        params.set('genre', selectedCategory);
      }

      // Search Query
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      // Active / Coming Soon Game
      if (activeGame) {
        params.set('game', activeGame.slug || activeGame.id);
      } else if (comingSoonGame) {
        params.set('game', comingSoonGame.slug || comingSoonGame.id);
      }

      // Modals
      if (isLeaderboardOpen) {
        params.set('modal', 'leaderboard');
        if (leaderboardGameId && leaderboardGameId !== 'global') {
          params.set('gameId', leaderboardGameId);
        }
      } else if (isQuestsModalOpen) {
        params.set('modal', 'quests');
      } else if (isTrophiesModalOpen) {
        params.set('modal', 'trophies');
      } else if (isRouletteModalOpen) {
        params.set('modal', 'roulette');
      } else if (isGameRequestModalOpen) {
        params.set('modal', 'requests');
      } else if (isThemeSelectorOpen) {
        params.set('modal', 'themes');
      } else if (isUsernameModalOpen) {
        params.set('modal', 'username');
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

      if (window.location.pathname + window.location.search !== newUrl) {
        window.history.replaceState(null, '', newUrl);
      }

      // Persist snapshot in sessionStorage
      sessionStorage.setItem(
        'stressbuster_active_route',
        JSON.stringify({
          tab: activeTab,
          selectedCategory,
          searchQuery,
          activeGameSlug: activeGame ? activeGame.slug || activeGame.id : null,
          comingSoonSlug: comingSoonGame ? comingSoonGame.slug || comingSoonGame.id : null,
          modal: isLeaderboardOpen
            ? 'leaderboard'
            : isQuestsModalOpen
            ? 'quests'
            : isTrophiesModalOpen
            ? 'trophies'
            : isRouletteModalOpen
            ? 'roulette'
            : isGameRequestModalOpen
            ? 'requests'
            : isThemeSelectorOpen
            ? 'themes'
            : isUsernameModalOpen
            ? 'username'
            : null,
          leaderboardGameId: isLeaderboardOpen ? leaderboardGameId : null,
        })
      );
    } catch {}
  }, [
    isHydrated,
    activeTab,
    selectedCategory,
    searchQuery,
    activeGame,
    comingSoonGame,
    isLeaderboardOpen,
    leaderboardGameId,
    isQuestsModalOpen,
    isTrophiesModalOpen,
    isRouletteModalOpen,
    isGameRequestModalOpen,
    isThemeSelectorOpen,
    isUsernameModalOpen,
  ]);

  // 3. Browser History Back / Forward Navigation Listener
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);

      const tabParam = params.get('tab') as PortalTab | null;
      if (tabParam && ['all', 'favorites', 'about-project', 'about-devs'].includes(tabParam)) {
        setActiveTab(tabParam);
      } else {
        setActiveTab('all');
      }

      const genreParam = params.get('genre') || params.get('category');
      if (genreParam) {
        setSelectedCategory(genreParam.toUpperCase());
      } else {
        setSelectedCategory('ALL');
      }

      const qParam = params.get('q') || params.get('search');
      setSearchQuery(qParam || '');

      const gameParam = params.get('game') || params.get('play');
      if (gameParam) {
        const found = INITIAL_GAMES.find(
          g => g.slug.toLowerCase() === gameParam.toLowerCase() || g.id.toLowerCase() === gameParam.toLowerCase()
        );
        if (found) {
          if (found.status === 'coming_soon') {
            setComingSoonGame(found);
            setActiveGame(null);
          } else if (found.status === 'active') {
            setActiveGame(found);
            setComingSoonGame(null);
          }
        }
      } else {
        setActiveGame(null);
        setComingSoonGame(null);
      }

      const modalParam = params.get('modal');
      const lbParam = params.get('gameId') || params.get('leaderboard');
      setIsLeaderboardOpen(modalParam === 'leaderboard' || !!lbParam);
      if (lbParam) setLeaderboardGameId(lbParam);
      setIsQuestsModalOpen(modalParam === 'quests');
      setIsTrophiesModalOpen(modalParam === 'trophies');
      setIsRouletteModalOpen(modalParam === 'roulette');
      setIsGameRequestModalOpen(modalParam === 'requests' || modalParam === 'wishlist');
      setIsThemeSelectorOpen(modalParam === 'themes');
      setIsUsernameModalOpen(modalParam === 'username');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setIsThemeSelectorOpen]);

  // Load LocalStorage player data, favorites, hyped games & user ratings
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

  const handleQuickPlay = () => {
    const activeGames = games.filter(g => g.status === 'active');
    if (activeGames.length > 0) {
      const randomGame = activeGames[Math.floor(Math.random() * activeGames.length)];
      handleLaunchGame(randomGame);
    }
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
      <header className="sticky top-0 z-30 bg-portal-surface border-b-3 sm:border-b-4 border-black px-3 sm:px-6 py-2 sm:py-2.5 select-none shadow-neo-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-2">

          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2.5 sm:gap-3">

            {/* Left Controls: Sidebar Toggle & Brand Logo */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className={`relative group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all shrink-0 ${
                  isSidebarOpen ? 'bg-portal-pink text-black' : 'bg-portal-yellow text-black'
                }`}
                title="Open Genres, Navigation & Filters"
                aria-label="Toggle navigation slide bar"
              >
                <div className="flex items-center gap-1.5 z-10">
                  {isSidebarOpen ? (
                    <X className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <div className="relative flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4 stroke-[2.5] group-hover:rotate-180 transition-transform duration-300" />
                      {(selectedCategory !== 'ALL' || activeTab !== 'all') && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-portal-pink opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-portal-pink"></span>
                        </span>
                      )}
                    </div>
                  )}

                  <span>{isSidebarOpen ? 'CLOSE' : 'GENRES'}</span>

                  {/* Active filter counter pill if active */}
                  {selectedCategory !== 'ALL' && !isSidebarOpen && (
                    <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-black text-white border border-black">
                      {selectedCategory}
                    </span>
                  )}
                </div>
              </button>

              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => { setActiveTab('all'); setSelectedCategory('ALL'); setSearchQuery(''); }}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-portal-cyan border-2 border-black flex items-center justify-center shadow-neo-sm group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm sm:text-base tracking-tight uppercase text-white group-hover:text-portal-cyan transition-colors">
                      BREAK<span className="text-portal-cyan">HUB</span>
                    </span>
                    <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase rounded-md bg-portal-pink text-black border border-black shadow-neo-sm">
                      PORTAL
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-portal-yellow font-black uppercase tracking-wider hidden xs:block">
                    {games.length > 0 ? `${games.length} Mini-Games` : '21 Mini-Games'}
                  </p>
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
                  className="w-full pl-10 pr-8 py-2 bg-portal-card border-2 border-black rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 font-bold focus:outline-none focus:border-portal-cyan shadow-neo-sm transition-all appearance-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-black p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => handleOpenLeaderboard('global')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all shrink-0 group"
                title="Open Global Leaderboard"
              >
                <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Ranks</span>
              </button>
            </div>

            {/* Theme Toggle & Gamification Player XP Badge & Gamer Tag */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Theme Quick Toggle & Engine Trigger with Onboarding Discovery Hint */}
              <div className="relative flex items-center gap-1">
                {/* Instant Dark/Light Switch */}
                <button
                  onClick={toggleTheme}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 border-black font-black text-xs uppercase tracking-wider shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${
                    isDark
                      ? 'bg-portal-yellow text-black hover:bg-portal-cyan'
                      : 'bg-portal-card text-white hover:bg-portal-yellow hover:text-black'
                  }`}
                  title={isDark ? 'Switch to Light Neo-Brutalist Theme' : 'Switch to Dark Neo-Brutalist Theme'}
                  aria-label="Toggle Theme"
                >
                  {isDark ? (
                    <>
                      <Sun className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="hidden sm:inline">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
                      <span className="hidden sm:inline">Dark</span>
                    </>
                  )}
                </button>

                {/* Theme Selector Modal Trigger */}
                <button
                  onClick={() => setIsThemeSelectorOpen(true)}
                  className="p-1.5 sm:p-2 rounded-xl bg-portal-card hover:bg-portal-purple text-slate-200 hover:text-black border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  title="Design Engine & Theme Lab"
                  aria-label="Open Theme Engine"
                >
                  <Palette className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* First-Time Visitor Theme Discovery Indicator */}
                <ThemeOnboardingHint onOpenThemeSelector={() => setIsThemeSelectorOpen(true)} />
              </div>

              <PlayerXpBadge
                onOpenQuests={() => setIsQuestsModalOpen(true)}
                onOpenTrophies={() => setIsTrophiesModalOpen(true)}
              />

              {playerTag ? (
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-portal-card border-2 border-black hover:bg-portal-yellow text-slate-200 hover:text-black font-black text-xs uppercase shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  title="Change Player Handle"
                >
                  {avatarUrl && <img src={avatarUrl} alt={`${playerTag}'s player avatar`} className="w-5 h-5 rounded-full object-cover bg-slate-800 border border-black shadow-neo-sm shrink-0" />}
                  <span className="text-portal-cyan group-hover:text-black font-black max-w-[80px] sm:max-w-[110px] truncate">{playerTag}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              ) : (
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  <User className="w-3.5 h-3.5 stroke-[2.5]" />
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
                className="w-full pl-10 pr-9 py-2 bg-portal-card border-2 border-black rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 font-bold focus:outline-none focus:border-portal-cyan shadow-neo-sm transition-all appearance-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm font-black p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Mobile Leaderboard Button near Search */}
            <button
              onClick={() => handleOpenLeaderboard('global')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all shrink-0"
              title="Open Global Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ranks</span>
            </button>
          </div>
        </div>
      </header>

      {/* Real-time Arcade Activity Marquee Ticker */}
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
          onOpenGameRequests={() => setIsGameRequestModalOpen(true)}
          unclaimedQuestsCount={unclaimedQuestsCount}
          categoryCounts={categoryCounts}
          totalGamesCount={categoryCounts['ALL'] || 0}
        />

        {/* MAIN CONTENT ARENA */}
        <main className="flex-1 w-full min-w-0 px-2.5 sm:px-6 py-2.5 sm:py-3 pb-24 overflow-x-hidden">
          {(activeTab === 'about-project' || activeTab === 'about-devs') ? (
            <AboutSection
              initialView={activeTab === 'about-devs' ? 'devs' : 'project'}
              onViewChange={(view) => setActiveTab(view === 'devs' ? 'about-devs' : 'about-project')}
              onExploreGames={() => {
                setActiveTab('all');
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              onOpenLeaderboard={() => handleOpenLeaderboard('global')}
            />
          ) : (
            <>
              {/* SPOTLIGHT HERO BANNER (Top featured: Retro Slicer & Neon Starfighter) */}
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
              <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 sm:pb-2.5 border-b-3 border-black">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-portal-yellow border border-black shadow-neo-sm flex items-center justify-center">
                      <Zap className="w-3 h-3 text-black stroke-[3]" />
                    </div>
                    <span>{activeTab === 'favorites' ? 'Your Saved Games' : 'Available Mini-Games'}</span>
                    <span className="px-1.5 py-0.2 rounded bg-portal-surface text-portal-cyan text-[11px] font-black border border-black shadow-neo-sm">
                      {filteredGames.length}
                    </span>
                  </h2>

                  {selectedCategory !== 'ALL' && activeTab === 'all' && (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-portal-cyan text-black text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-neo-sm">
                      <span>{selectedCategory === 'UPCOMING' ? 'Filter: Upcoming' : `Category: ${selectedCategory}`}</span>
                      <button
                        onClick={() => setSelectedCategory('ALL')}
                        className="hover:scale-125 ml-0.5 font-black"
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
                    className="px-2.5 py-1 rounded-lg bg-portal-pink text-black text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  >
                    Reset Filters
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

              {/* FOOTER PROJECT STRIP */}
              <footer className="mt-14 p-5 sm:p-6 bg-portal-surface border-3 border-black rounded-2xl shadow-neo flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-portal-yellow font-black uppercase tracking-wider">
                    <Gamepad2 className="w-4 h-4 text-portal-cyan stroke-[2.5] shrink-0" />
                    <span>Break Hub Arcade Portal</span>
                  </div>
                  <div className="text-slate-200 font-bold">
                    Internship Web Gaming Platform • 18 Custom HTML5 Games
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                  <button
                    onClick={() => {
                      setActiveTab('about-project');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5"
                  >
                    <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>About Project</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('about-devs');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>About Developer →</span>
                  </button>
                </div>
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

      {/* 13. DESIGN ENGINE & THEME LAB MODAL */}
      <ThemeSelectorModal
        isOpen={isThemeSelectorOpen}
        onClose={() => setIsThemeSelectorOpen(false)}
      />

      {/* 14. GAME REQUEST & COMMUNITY WISHLIST MODAL */}
      <GameRequestModal
        isOpen={isGameRequestModalOpen}
        onClose={() => setIsGameRequestModalOpen(false)}
        playerTag={playerTag}
        onOpenUsernameModal={() => setIsUsernameModalOpen(true)}
      />
    </div>
  );
}
