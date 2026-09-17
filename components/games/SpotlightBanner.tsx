'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Trophy,
  Heart,
  Star,
  Sparkles,
  Zap,
  Shield,
  Swords,
  Rocket,
  Grid3X3,
  Flame,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Target,
  Layers,
} from 'lucide-react';
import { Game } from '@/lib/types';
import { formatPlayCount } from '@/components/games/GameCard';
import { audio } from '@/lib/audio';

interface SpotlightBannerProps {
  games: Game[];
  favorites: string[];
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onPlayGame: (game: Game) => void;
  onViewLeaderboard: (gameId: string) => void;
}

export default function SpotlightBanner({
  games,
  favorites,
  onToggleFavorite,
  onPlayGame,
  onViewLeaderboard,
}: SpotlightBannerProps) {
  // Get all featured games
  const featuredGames = games.filter(
    g =>
      g.status !== 'hidden' &&
      (g.featured ||
        g.slug === 'retro-candy-crush' ||
        g.slug === 'retro-battleship' ||
        g.slug === 'black-hole' ||
        g.slug === 'cyber-drift' ||
        g.slug === 'cyber-slicer' ||
        g.slug === 'neon-starfighter' ||
        g.slug === 'multidimension-xo')
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [animDirection, setAnimDirection] = useState<'next' | 'prev'>('next');
  const [transitionKey, setTransitionKey] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Mobile Touch Swipe gesture recognition state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  // Safety check
  if (featuredGames.length === 0) return null;

  const currentGame = featuredGames[activeIndex] || featuredGames[0];
  const isFavorite = favorites.includes(currentGame.id);
  const isComingSoon = currentGame.status === 'coming_soon';

  const getGameIcon = (slug: string) => {
    if (slug === 'retro-candy-crush') return <Sparkles className="w-3.5 h-3.5 text-portal-yellow" />;
    if (slug === 'retro-battleship') return <Shield className="w-3.5 h-3.5 text-portal-cyan" />;
    if (slug === 'black-hole') return <Zap className="w-3.5 h-3.5 text-portal-pink" />;
    if (slug === 'cyber-drift') return <Flame className="w-3.5 h-3.5 text-portal-cyan" />;
    if (slug === 'cyber-slicer') return <Swords className="w-3.5 h-3.5 text-portal-lime" />;
    if (slug === 'neon-starfighter') return <Rocket className="w-3.5 h-3.5 text-portal-pink" />;
    if (slug === 'multidimension-xo') return <Grid3X3 className="w-3.5 h-3.5 text-portal-yellow" />;
    if (slug === 'cyber-minesweeper') return <Target className="w-3.5 h-3.5 text-portal-cyan" />;
    if (slug === 'cyber-maze') return <Layers className="w-3.5 h-3.5 text-portal-lime" />;
    return <Gamepad2 className="w-3.5 h-3.5 text-portal-cyan" />;
  };

  const handleNext = () => {
    setAnimDirection('next');
    setActiveIndex(prev => (prev + 1) % featuredGames.length);
    setTransitionKey(k => k + 1);
  };

  const handlePrev = () => {
    setAnimDirection('prev');
    setActiveIndex(prev => (prev - 1 + featuredGames.length) % featuredGames.length);
    setTransitionKey(k => k + 1);
  };

  const handleSelect = (idx: number) => {
    if (idx === activeIndex) return;
    setAnimDirection(idx > activeIndex ? 'next' : 'prev');
    setActiveIndex(idx);
    setTransitionKey(k => k + 1);
    try {
      audio.playClickSound();
    } catch {}
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchDeltaX.current = 0;
      touchDeltaY.current = 0;
      isSwiping.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current || touchStartX.current === null || touchStartY.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    touchDeltaX.current = currentX - touchStartX.current;
    touchDeltaY.current = currentY - touchStartY.current;
  };

  const handleTouchEnd = () => {
    if (isSwiping.current && touchStartX.current !== null) {
      const dX = touchDeltaX.current;
      const dY = touchDeltaY.current;
      const absX = Math.abs(dX);
      const absY = Math.abs(dY);

      if (absX > 35 && absX > absY * 0.7) {
        if (dX < 0) {
          handleNext();
          try { audio.playClickSound(); } catch {}
        } else {
          handlePrev();
          try { audio.playClickSound(); } catch {}
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    isSwiping.current = false;

    setTimeout(() => setIsPaused(false), 5000);
  };

  // Auto-cycling rotation timer (7s)
  useEffect(() => {
    if (featuredGames.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setAnimDirection('next');
      setActiveIndex(prev => (prev + 1) % featuredGames.length);
      setTransitionKey(k => k + 1);
    }, 7000);
    return () => clearInterval(timer);
  }, [featuredGames.length, isPaused]);

  return (
    <div
      ref={bannerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full rounded-2xl sm:rounded-3xl bg-portal-surface border-3 sm:border-4 border-black p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-6 shadow-neo-lg overflow-hidden touch-pan-y"
    >
      {/* Top Tri-Color Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes spotlightSlideNext {
          0% {
            opacity: 0;
            transform: translateX(18px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes spotlightSlidePrev {
          0% {
            opacity: 0;
            transform: translateX(-18px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .animate-spotlight-next {
          animation: spotlightSlideNext 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-spotlight-prev {
          animation: spotlightSlidePrev 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Top Bar: Spotlight Pill + Selector Switcher + Nav Arrows */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b-3 border-black">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-portal-yellow text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>SPOTLIGHT</span>
          </span>
        </div>

        {/* Quick Switcher Tabs & Arrows */}
        {featuredGames.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                handlePrev();
                try { audio.playClickSound(); } catch {}
              }}
              className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
              title="Previous Game"
              aria-label="Previous Game"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Game Tabs */}
            <div className="hidden xs:flex items-center gap-1 bg-portal-card p-1 rounded-xl border-2 border-black shadow-neo-sm overflow-x-auto max-w-[420px] sm:max-w-none">
              {featuredGames.map((game, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={game.id}
                    onClick={() => handleSelect(idx)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all border uppercase shrink-0 ${
                      isActive
                        ? 'bg-portal-cyan text-black border-black shadow-neo-sm font-black'
                        : 'border-transparent text-slate-300 hover:text-white hover:bg-portal-surface'
                    }`}
                  >
                    {getGameIcon(game.slug)}
                    <span className="truncate max-w-[90px] sm:max-w-[130px]">{game.title}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                handleNext();
                try { audio.playClickSound(); } catch {}
              }}
              className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
              title="Next Game"
              aria-label="Next Game"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MOBILE VIEW (< md): Clean Cinematic Hero Card            */}
      {/* ========================================================= */}
      <div
        key={`mobile-${currentGame.id}-${transitionKey}`}
        className={`md:hidden relative z-10 space-y-3 ${
          animDirection === 'next' ? 'animate-spotlight-next' : 'animate-spotlight-prev'
        }`}
      >
        {/* Cinematic Artwork with Center Play Overlay */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="game-thumbnail-container relative group w-full h-[220px] xs:h-[240px] rounded-2xl overflow-hidden bg-black border-3 border-black shadow-neo cursor-pointer select-none"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="game-thumbnail-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="game-thumbnail-overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

          {/* Left/Right Tap Arrows for Mobile */}
          {featuredGames.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                  try { audio.playClickSound(); } catch {}
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-portal-yellow text-white hover:text-black border border-black flex items-center justify-center backdrop-blur-sm z-20 active:scale-95 transition-all"
                aria-label="Previous game"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                  try { audio.playClickSound(); } catch {}
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-portal-yellow text-white hover:text-black border border-black flex items-center justify-center backdrop-blur-sm z-20 active:scale-95 transition-all"
                aria-label="Next game"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </>
          )}

          {/* Center Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-3 border-black shadow-neo transform group-hover:scale-110 group-active:scale-95 transition-all ${
              isComingSoon ? 'bg-portal-yellow text-black' : 'bg-portal-cyan text-black'
            }`}>
              {isComingSoon ? (
                <Flame className="w-7 h-7 fill-black stroke-[2.5]" />
              ) : (
                <Play className="w-7 h-7 fill-black stroke-[2.5] ml-0.5" />
              )}
            </div>
          </div>

          {/* Top In-Artwork Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
            <span className="px-2.5 py-0.5 rounded-md bg-portal-purple text-white text-[9px] font-black uppercase border border-black shadow-neo-sm">
              {currentGame.category}
            </span>
            <span className="flex items-center gap-1 text-black text-[9px] font-black bg-portal-yellow border border-black px-2 py-0.5 rounded-md shadow-neo-sm uppercase">
              <Star className="w-3 h-3 fill-black stroke-[2.5]" /> {currentGame.rating?.toFixed(1) || '5.0'}
            </span>
          </div>

          {/* Bottom In-Artwork Badges */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
            <span className="text-[9px] font-black text-white bg-portal-surface px-2 py-0.5 rounded-md border border-black shadow-neo-sm uppercase">
              {isComingSoon ? 'COMING SOON' : formatPlayCount(currentGame.play_count)}
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-lg xs:text-xl font-black tracking-tight text-white uppercase truncate">
            {currentGame.title}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onPlayGame(currentGame)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${
              isComingSoon ? 'bg-portal-yellow text-black' : 'bg-portal-cyan text-black'
            }`}
          >
            {isComingSoon ? (
              <>
                <Flame className="w-4 h-4 fill-black stroke-[2.5]" />
                <span>HYPE / PREVIEW</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                <span>PLAY NOW</span>
              </>
            )}
          </button>

          <button
            onClick={() => isComingSoon ? onPlayGame(currentGame) : onViewLeaderboard(currentGame.id)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-portal-yellow hover:text-black border-3 border-black font-black text-xs uppercase shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Ranks</span>
          </button>

          <button
            onClick={(e) => onToggleFavorite(currentGame.id, e)}
            className={`p-2.5 rounded-xl border-3 border-black transition-all shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none ${
              isFavorite
                ? 'bg-portal-pink text-white'
                : 'bg-portal-card text-slate-300 hover:text-white'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 stroke-[2.5] ${isFavorite ? 'fill-white text-white' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP VIEW (≥ md): Clean Showcase Dual Pane              */}
      {/* ========================================================= */}
      <div
        key={`desktop-${currentGame.id}-${transitionKey}`}
        className={`hidden md:grid relative z-10 grid-cols-12 gap-5 lg:gap-6 items-center ${
          animDirection === 'next' ? 'animate-spotlight-next' : 'animate-spotlight-prev'
        }`}
      >
        {/* Left Column (5 cols): Cinematic Artwork Preview */}
        <div className="col-span-5">
          <div
            onClick={() => onPlayGame(currentGame)}
            className="game-thumbnail-container relative group aspect-[16/10] lg:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border-3 border-black shadow-neo-lg cursor-pointer"
          >
            <img
              src={currentGame.thumbnail_url}
              alt={currentGame.title}
              className="game-thumbnail-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="game-thumbnail-overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

            {/* Hover Play Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-3 border-black shadow-neo transform group-hover:scale-110 transition-transform ${
                isComingSoon ? 'bg-portal-yellow text-black' : 'bg-portal-cyan text-black'
              }`}>
                {isComingSoon ? (
                  <Flame className="w-8 h-8 fill-black stroke-[2.5]" />
                ) : (
                  <Play className="w-8 h-8 fill-black stroke-[2.5] ml-1" />
                )}
              </div>
            </div>

            {/* Top In-Preview Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs text-white z-10 pointer-events-none">
              <span className="px-2.5 py-0.5 rounded-md bg-portal-purple text-white text-[10px] font-black uppercase border border-black shadow-neo-sm">
                {currentGame.category}
              </span>
              <span className="flex items-center gap-1 text-black text-[10px] font-black bg-portal-yellow border border-black px-2.5 py-0.5 rounded-md shadow-neo-sm uppercase">
                <Star className="w-3.5 h-3.5 fill-black stroke-[2.5]" /> {currentGame.rating?.toFixed(1) || '5.0'}
              </span>
            </div>

            {/* Bottom In-Preview Badges */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white z-10 pointer-events-none">
              <span className="text-[10px] font-black text-white bg-portal-surface px-2.5 py-0.5 rounded-md border border-black shadow-neo-sm uppercase">
                {isComingSoon ? 'COMING SOON' : formatPlayCount(currentGame.play_count)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Clean Game Title & Action Buttons */}
        <div className="col-span-7 flex flex-col justify-center space-y-4">
          {/* Header Row: Category Badge + Rating + Play Count */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-black text-xs font-black bg-portal-purple text-white border-2 border-black px-2.5 py-0.5 rounded-lg shadow-neo-sm uppercase">
              <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" /> {currentGame.category}
            </span>
            <span className="flex items-center gap-1.5 text-black text-xs font-black bg-portal-yellow border-2 border-black px-2.5 py-0.5 rounded-lg shadow-neo-sm uppercase">
              <Star className="w-3.5 h-3.5 fill-black stroke-[2.5]" /> {currentGame.rating?.toFixed(1) || '5.0'}
              {currentGame.rating_count ? (
                <span className="text-black/80 font-bold">({currentGame.rating_count} reviews)</span>
              ) : null}
            </span>
            <span className="text-xs font-black text-white bg-portal-card border-2 border-black px-2.5 py-0.5 rounded-lg shadow-neo-sm uppercase">
              {isComingSoon ? 'COMING SOON' : formatPlayCount(currentGame.play_count)}
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-tight">
              {currentGame.title}
            </h1>
          </div>

          {/* Primary Action Button Strip */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onPlayGame(currentGame)}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${
                isComingSoon ? 'bg-portal-yellow text-black' : 'bg-portal-cyan text-black'
              }`}
            >
              {isComingSoon ? (
                <>
                  <Flame className="w-5 h-5 fill-black stroke-[2.5]" />
                  <span>HYPE / PREVIEW</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-black stroke-[2.5]" />
                  <span>PLAY NOW</span>
                </>
              )}
            </button>

            <button
              onClick={() => isComingSoon ? onPlayGame(currentGame) : onViewLeaderboard(currentGame.id)}
              className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-portal-card hover:bg-portal-yellow text-portal-yellow hover:text-black border-3 border-black font-black text-sm uppercase tracking-wider shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              <Trophy className="w-4 h-4 stroke-[2.5]" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={(e) => onToggleFavorite(currentGame.id, e)}
              className={`p-3.5 rounded-2xl border-3 border-black transition-all shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none ${
                isFavorite
                  ? 'bg-portal-pink text-white'
                  : 'bg-portal-card text-slate-300 hover:text-white'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-5 h-5 stroke-[2.5] ${isFavorite ? 'fill-white text-white' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
