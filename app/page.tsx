'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trophy,
  Gamepad2,
  Search,
  Zap,
  User,
  Edit3,
  SlidersHorizontal,
  X,
  Sun,
  Moon,
  Sparkles,
  Grid,
  Cpu,
  Layers,
  Clock
} from 'lucide-react';
import dynamic from 'next/dynamic';
import GameGrid from '@/components/games/GameGrid';
import AboutSection from '@/components/about/AboutSection';
import Sidebar from '@/components/navigation/Sidebar';
type PortalTab = 'all' | 'favorites' | 'about-project' | 'about-devs';
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

const QUICK_CATEGORIES = [
  { id: 'ALL', label: 'All Games', icon: Sparkles, color: 'bg-portal-cyan text-black' },
  { id: 'ARCADE', label: 'Arcade', icon: Gamepad2, color: 'bg-portal-cyan text-black' },
  { id: 'ACTION', label: 'Action', icon: Zap, color: 'bg-portal-pink text-black' },
  { id: 'PUZZLE', label: 'Puzzles', icon: Grid, color: 'bg-portal-purple text-black' },
  { id: 'STRATEGY', label: 'Strategy', icon: Cpu, color: 'bg-portal-lime text-black' },
  { id: 'CARD', label: 'Cards', icon: Layers, color: 'bg-portal-yellow text-black' },
  { id: 'UPCOMING', label: 'Coming Soon', icon: Clock, color: 'bg-portal-yellow text-black' },
];

export default function ArcadePortalDashboard() {
  const { toggleTheme, isThemeSelectorOpen, setIsThemeSelectorOpen, isDark } = useTheme();
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<any>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hypedGames, setHypedGames] = useState<string[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Search input refs for global shortcut focus
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch games from /api/games on mount to respect live database statuses
  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.games)) {
          setGames(data.games);
        }
      })
      .catch(err => console.error('Failed to fetch games:', err));
  }, []);

  // Global Keyboard Shortcuts (⌘K, Ctrl+K, /, Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth >= 768) {
          desktopSearchInputRef.current?.focus();
          desktopSearchInputRef.current?.select();
        } else {
          mobileSearchInputRef.current?.focus();
          mobileSearchInputRef.current?.select();
        }
      } else if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        if (window.innerWidth >= 768) {
          desktopSearchInputRef.current?.focus();
          desktopSearchInputRef.current?.select();
        } else {
          mobileSearchInputRef.current?.focus();
          mobileSearchInputRef.current?.select();
        }
      } else if (e.key === 'Escape' && isInputActive) {
        activeEl?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
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

  // 4. Beforeunload site exit confirmation when on portal home
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!activeGame && !comingSoonGame && !isLeaderboardOpen && !isQuestsModalOpen && !isTrophiesModalOpen && !isRouletteModalOpen && !isGameRequestModalOpen && !isThemeSelectorOpen && !isUsernameModalOpen) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to exit Break Hub?';
        return 'Are you sure you want to exit Break Hub?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeGame, comingSoonGame, isLeaderboardOpen, isQuestsModalOpen, isTrophiesModalOpen, isRouletteModalOpen, isGameRequestModalOpen, isThemeSelectorOpen, isUsernameModalOpen]);
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

    try {
      gamification.recordGameRated(gameId, rating);
    } catch {}

    try {
      const res = await fetch('/api/games/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          rating,
          username: playerTag || 'Player'
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.rating === 'number' && typeof data.rating_count === 'number') {
          setGames(prev =>
            prev.map(g =>
              g.id === gameId || g.slug === gameId
                ? { ...g, rating: data.rating, rating_count: data.rating_count }
                : g
            )
          );
          setActiveGame(prev =>
            prev && (prev.id === gameId || prev.slug === gameId)
              ? { ...prev, rating: data.rating, rating_count: data.rating_count }
              : prev
          );
        }
      }
    } catch (err) {
      console.error('Failed to submit rating', err);
    }
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

    setGames(prev =>
      prev.map(g => {
        if (g.id === gameId || g.slug === gameId) {
          const current = g.hype_count || 0;
          return { ...g, hype_count: isAdding ? current + 1 : Math.max(0, current - 1) };
        }
        return g;
      })
    );

    setComingSoonGame(prev => {
      if (prev && (prev.id === gameId || prev.slug === gameId)) {
        const current = prev.hype_count || 0;
        return { ...prev, hype_count: isAdding ? current + 1 : Math.max(0, current - 1) };
      }
      return prev;
    });

    try {
      fetch('/api/games/hype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, increment: isAdding }),
      }).catch(err => console.error('Failed to update hype count', err));
    } catch {}
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() && (activeTab === 'about-project' || activeTab === 'about-devs')) {
      setActiveTab('all');
    }
  };

  const launchGameSession = (game: Game) => {
    try {
      window.history.pushState({ modalOpen: true }, '');
    } catch {}
    setActiveGame(game);
  };

  const handleLaunchGame = (game: Game) => {
    if (game.status === 'hidden') return;
    if (game.status === 'coming_soon') {
      setComingSoonGame(game);
      return;
    }

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

  const filteredGames = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const searchTerms = query.split(/\s+/).filter(Boolean);

    return games.filter(game => {
      if (game.status === 'hidden') return false;
      const matchesSearch =
        searchTerms.length === 0 ||
        searchTerms.every(
          term =>
            game.title.toLowerCase().includes(term) ||
            game.slug.toLowerCase().includes(term) ||
            game.category.toLowerCase().includes(term) ||
            game.description.toLowerCase().includes(term)
        );
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
    <div className="min-h-screen bg-portal-bg text-slate-100 font-sans antialiased selection:bg-portal-cyan selection:text-black overflow-x-hidden box-border">

      {/* 1. STICKY APP HEADER */}
      <header className="sticky top-0 z-30 bg-portal-surface border-b-3 sm:border-b-4 border-black px-2.5 sm:px-6 py-2 sm:py-2.5 select-none shadow-neo-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-2">

          {/* DESKTOP SINGLE ROW (md and above) */}
          <div className="hidden md:flex items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className={`relative group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all shrink-0 ${
                  isSidebarOpen ? 'bg-portal-pink text-black' : 'bg-portal-yellow text-black'
                }`}
                aria-label="Toggle Genres Menu"
              >
                <div className="flex items-center gap-1.5 z-10">
                  {isSidebarOpen ? (
                    <X className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <SlidersHorizontal className="w-4 h-4 stroke-[2.5] group-hover:rotate-180 transition-transform duration-300" />
                  )}
                  <span>{isSidebarOpen ? 'CLOSE' : 'GENRES'}</span>
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
                    {`${games.length} Mini-Games`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-lg mx-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  ref={desktopSearchInputRef}
                  type="text"
                  placeholder="Search games, genres, puzzles... (/ or ⌘K)"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-16 py-2 bg-portal-card border-2 border-black rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 font-bold focus:outline-none focus:border-portal-cyan shadow-neo-sm transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => handleOpenLeaderboard('global')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all shrink-0"
              >
                <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Ranks</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 border-black font-black text-xs uppercase tracking-wider shadow-neo-sm bg-portal-yellow text-black hover:bg-portal-cyan transition-all"
                title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                aria-label="Toggle Theme"
              >
                {isDark ? <Moon className="w-3.5 h-3.5 stroke-[2.5]" /> : <Sun className="w-3.5 h-3.5 stroke-[2.5]" />}
              </button>

              <PlayerXpBadge
                onOpenQuests={() => setIsQuestsModalOpen(true)}
                onOpenTrophies={() => setIsTrophiesModalOpen(true)}
              />

              {playerTag ? (
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-portal-card border-2 border-black hover:bg-portal-yellow text-slate-200 hover:text-black font-black text-xs uppercase shadow-neo-sm"
                  title={`Player: ${playerTag}`}
                >
                  {avatarUrl && <img src={avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover bg-slate-800 border border-black" />}
                  <span className="text-portal-cyan group-hover:text-black font-black max-w-[80px] sm:max-w-[110px] truncate">{playerTag}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              ) : (
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm"
                >
                  <User className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Set Handle</span>
                </button>
              )}
            </div>
          </div>

          {/* MOBILE 2-ROW HEADER (< md) */}
          <div className="flex md:hidden flex-col gap-2 w-full">
            {/* FIRST LAYER: Genres Button + BreakHub Logo + Game Search Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full">
              <button
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className={`relative group flex items-center gap-1 px-2 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all shrink-0 ${
                  isSidebarOpen ? 'bg-portal-pink text-black' : 'bg-portal-yellow text-black'
                }`}
                aria-label="Toggle Genres Menu"
              >
                <div className="flex items-center gap-1">
                  {isSidebarOpen ? (
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>{isSidebarOpen ? 'CLOSE' : 'GENRES'}</span>
                </div>
              </button>

              <div
                className="flex items-center gap-1.5 cursor-pointer group shrink-0"
                onClick={() => { setActiveTab('all'); setSelectedCategory('ALL'); setSearchQuery(''); }}
                title="Break Hub Home"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-portal-cyan border-2 border-black flex items-center justify-center shadow-neo-sm group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
                  <Gamepad2 className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
                <div className="hidden xs:block">
                  <span className="font-black text-xs sm:text-sm tracking-tight uppercase text-white group-hover:text-portal-cyan transition-colors">
                    BREAK<span className="text-portal-cyan">HUB</span>
                  </span>
                </div>
              </div>

              {/* Game Search Bar in First Layer */}
              <div className="relative flex-1 min-w-[100px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-portal-card border-2 border-black rounded-xl text-xs text-white placeholder-slate-400 font-bold focus:outline-none focus:border-portal-cyan shadow-neo-sm transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* SECOND LAYER (Brought down so features never get hidden): Light/Dark Switch, Daily Quest, Level, Mute, Ranks, Name */}
            <div className="flex items-center justify-between gap-1 w-full pt-1.5 border-t border-black/20">
              {/* Light / Dark Switch */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center p-1.5 rounded-xl border-2 border-black font-black text-xs shadow-neo-sm bg-portal-yellow text-black hover:bg-portal-cyan transition-all shrink-0"
                title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                aria-label="Toggle Theme"
              >
                {isDark ? <Moon className="w-3.5 h-3.5 stroke-[2.5]" /> : <Sun className="w-3.5 h-3.5 stroke-[2.5]" />}
              </button>

              {/* Daily Quest, Level, and Mute */}
              <PlayerXpBadge
                onOpenQuests={() => setIsQuestsModalOpen(true)}
                onOpenTrophies={() => setIsTrophiesModalOpen(true)}
              />

              {/* Ranks Shortcut */}
              <button
                onClick={() => handleOpenLeaderboard('global')}
                className="flex items-center gap-1 p-1.5 xs:px-2.5 xs:py-1.5 rounded-xl bg-portal-yellow text-black font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all shrink-0"
                title="Global Leaderboard"
                aria-label="Leaderboard Ranks"
              >
                <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden xs:inline">Ranks</span>
              </button>

              {/* Player Name / Handle */}
              {playerTag ? (
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-xl bg-portal-card border-2 border-black hover:bg-portal-yellow text-slate-200 hover:text-black font-black text-[11px] uppercase shadow-neo-sm shrink-0 max-w-[90px] xs:max-w-[120px]"
                  title={`Player: ${playerTag}. Click to edit.`}
                >
                  {avatarUrl && <img src={avatarUrl} alt="Avatar" className="w-4 h-4 rounded-full object-cover bg-slate-800 border border-black shrink-0" />}
                  <span className="text-portal-cyan group-hover:text-black font-black truncate text-[11px]">{playerTag}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              ) : (
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-portal-cyan text-black font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-neo-sm shrink-0"
                >
                  <User className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Handle</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full min-h-[calc(100vh-61px)]">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab as 'all' | 'favorites' | 'about-project' | 'about-devs');
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
              {activeTab === 'all' && (
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-3 pt-0.5 no-scrollbar">
                  {QUICK_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    const count = categoryCounts[cat.id] || 0;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`cartoon-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider border-2 border-black whitespace-nowrap transition-all shrink-0 ${
                          isSelected ? `${cat.color} shadow-neo-sm translate-x-0.5 translate-y-0.5` : 'bg-portal-card text-slate-300 hover:text-white hover:bg-portal-surface shadow-neo-sm'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{cat.label}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border border-black ${isSelected ? 'bg-black text-white' : 'bg-portal-surface text-portal-cyan'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'about-project' || activeTab === 'about-devs' ? (
                <AboutSection
                  initialView={activeTab === 'about-devs' ? 'devs' : 'project'}
                  onExploreGames={() => setActiveTab('all')}
                  onOpenLeaderboard={() => handleOpenLeaderboard('global')}
                  onViewChange={(v) => setActiveTab(v === 'devs' ? 'about-devs' : 'about-project')}
                />
              ) : (
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
              )}
            </>
          )}
        </main>
      </div>

      <UsernamePromptModal
        isOpen={isUsernameModalOpen}
        initialUsername={playerTag}
        title={pendingGameToPlay ? "Enter Your Gamer Tag" : (playerTag ? "Update Gamer Tag" : "Create Player Handle")}
        subtitle="Choose a player handle to record your high scores."
        confirmText="SAVE HANDLE"
        onClose={() => {
          setIsUsernameModalOpen(false);
          setPendingGameToPlay(null);
        }}
        onConfirm={handleConfirmUsername}
      />

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
        />
      )}

      {isLeaderboardOpen && (
        <LeaderboardModal
          initialGameId={leaderboardGameId}
          games={games.filter(g => g.status !== 'hidden')}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}

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

      <TrophyRoomModal isOpen={isTrophiesModalOpen} onClose={() => setIsTrophiesModalOpen(false)} />
      <LevelUpCelebrationModal levelInfo={levelUpInfo} onClose={() => setLevelUpInfo(null)} onOpenTrophies={() => { setLevelUpInfo(null); setIsTrophiesModalOpen(true); }} />
      <GameRouletteModal isOpen={isRouletteModalOpen} onClose={() => setIsRouletteModalOpen(false)} games={games} onSelectGame={handleSelectGameFromRoulette} />
      <ThemeSelectorModal isOpen={isThemeSelectorOpen} onClose={() => setIsThemeSelectorOpen(false)} />
      <GameRequestModal isOpen={isGameRequestModalOpen} onClose={() => setIsGameRequestModalOpen(false)} playerTag={playerTag} onOpenUsernameModal={() => setIsUsernameModalOpen(true)} />
    </div>
  );
}
