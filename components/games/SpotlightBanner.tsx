'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Trophy, Heart, Star, Sparkles, Zap, Shield, Swords, Rocket, Grid3X3, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { Game } from '@/lib/types';
import { formatPlayCount } from '@/components/games/GameCard';

interface SpotlightBannerProps {
  games: Game[];
  favorites: string[];
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onPlayGame: (game: Game) => void;
  onViewLeaderboard: (gameId: string) => void;
}

const HIGHLIGHT_TAGS: Record<string, string[]> = {
  'cyber-slicer': ['Katana Multi-Slice', 'Combo Multipliers', 'Plasma Bombs', '9:16 Portrait'],
  'neon-starfighter': ['Singularity Black Holes', 'EMP Nukes', '3X Spread Laser', '60-144 FPS Space Combat'],
  'multidimension-xo': ['9 Nested 3x3 Boards', 'Macro-Node Capture', 'Ultimate Tic-Tac-Toe', 'Overthinker AI Boss'],
  'quantum-xo': ['Overthinker AI Boss', 'Round-Robin Turns', 'Quantum Rules'],
  'quantum-2048': ['Block Merger', 'Neural Synthesis', 'Endless Mode']
};

export default function SpotlightBanner({
  games,
  favorites,
  onToggleFavorite,
  onPlayGame,
  onViewLeaderboard
}: SpotlightBannerProps) {
  // Get all featured games (Cyber Slicer, Neon Starfighter, and Multidimension XO prioritized)
  const featuredGames = games.filter(
    g => g.status !== 'hidden' && (g.featured || g.slug === 'cyber-slicer' || g.slug === 'neon-starfighter' || g.slug === 'multidimension-xo')
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [animDirection, setAnimDirection] = useState<'next' | 'prev'>('next');
  const [transitionKey, setTransitionKey] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Safety check
  if (featuredGames.length === 0) return null;

  const currentGame = featuredGames[activeIndex] || featuredGames[0];
  const isFavorite = favorites.includes(currentGame.id);
  const isComingSoon = currentGame.status === 'coming_soon';
  const tags = HIGHLIGHT_TAGS[currentGame.slug] || ['Cyber Arcade', 'Web Audio Engine', 'Instant Play'];

  const getGameIcon = (slug: string) => {
    if (slug === 'cyber-slicer') return <Swords className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
    if (slug === 'neon-starfighter') return <Rocket className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
    if (slug === 'multidimension-xo') return <Grid3X3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
    return <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
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
  };

  // Auto-cycling rotation timer (6.5s) with pause on hover/interaction
  useEffect(() => {
    if (featuredGames.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setAnimDirection('next');
      setActiveIndex(prev => (prev + 1) % featuredGames.length);
      setTransitionKey(k => k + 1);
    }, 6500);
    return () => clearInterval(timer);
  }, [featuredGames.length, isPaused]);

  return (
    <div
      ref={bannerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
      className="relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-br from-portal-surface via-slate-950 to-portal-bg border border-cyan-500/30 sm:border-2 sm:border-cyan-500/40 p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-6 shadow-[0_0_25px_rgba(6,182,212,0.15)] md:shadow-[0_0_35px_rgba(6,182,212,0.18)] overflow-hidden"
    >
      {/* Dynamic Keyframes for Smooth Spotlight Animation */}
      <style jsx>{`
        @keyframes spotlightFadeScale {
          0% {
            opacity: 0;
            transform: scale(0.97) translateY(4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-spotlight {
          animation: spotlightFadeScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Background Ambient Glow & Cyber Grid */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 sm:-mr-20 sm:-mt-20 w-48 sm:w-80 h-48 sm:h-80 bg-portal-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 sm:-ml-20 sm:-mb-20 w-48 sm:w-80 h-48 sm:h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Spotlight Pill + Selector Switcher + Nav Arrows */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5 mb-2.5 sm:mb-3 md:mb-4 pb-2 sm:pb-2.5 border-b border-portal-border/60">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider shadow-glow-cyan animate-pulse">
            <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-black" />
            <span>SPOTLIGHT SHOWCASE</span>
          </span>
          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 hidden xs:inline">
            Featured Highlights
          </span>
        </div>

        {/* Quick Switcher Tabs & Arrows */}
        {featuredGames.length > 1 && (
          <div className="flex items-center gap-1">
            {/* Prev Arrow */}
            <button
              onClick={handlePrev}
              className="p-1 sm:p-1.5 rounded-lg bg-portal-bg/90 hover:bg-portal-surface border border-portal-border/80 text-slate-400 hover:text-white transition-all active:scale-95"
              title="Previous Game"
            >
              <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Game Tabs */}
            <div className="flex items-center gap-1 bg-portal-bg/90 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-portal-border/80">
              {featuredGames.map((game, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={game.id}
                    onClick={() => handleSelect(idx)}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black transition-all duration-300 ${
                      isActive
                        ? 'bg-portal-cyan text-black shadow-glow-cyan scale-105'
                        : 'text-slate-400 hover:text-white hover:bg-portal-surface'
                    }`}
                  >
                    {getGameIcon(game.slug)}
                    <span className="truncate max-w-[70px] xs:max-w-[90px] sm:max-w-[130px]">{game.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Next Arrow */}
            <button
              onClick={handleNext}
              className="p-1 sm:p-1.5 rounded-lg bg-portal-bg/90 hover:bg-portal-surface border border-portal-border/80 text-slate-400 hover:text-white transition-all active:scale-95"
              title="Next Game"
            >
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* MOBILE VIEW (< md): Cinematic 2-Grid Height Showcase Card with Smooth Transitions */}
      <div key={`mobile-${currentGame.id}-${transitionKey}`} className="md:hidden relative z-10 space-y-2 animate-spotlight">
        {/* Cinematic Artwork with Center Play Overlay & Corner Badges */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="relative group w-full aspect-[2.2/1] xs:aspect-[2.4/1] rounded-xl overflow-hidden bg-slate-900 border border-cyan-400/40 shadow-lg cursor-pointer"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

          {/* Center Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-11 h-11 xs:w-12 xs:h-12 rounded-full flex items-center justify-center shadow-glow-cyan transform group-hover:scale-110 group-active:scale-95 transition-transform ${
              isComingSoon
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                : 'bg-portal-cyan text-black'
            }`}>
              {isComingSoon ? (
                <Flame className="w-5 h-5 xs:w-6 xs:h-6 fill-black" />
              ) : (
                <Play className="w-5 h-5 xs:w-6 xs:h-6 fill-black translate-x-0.5" />
              )}
            </div>
          </div>

          {/* Top In-Artwork Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-white pointer-events-none">
            <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-black text-portal-cyan border border-cyan-500/40 uppercase">
              {currentGame.category}
            </span>
            {isComingSoon ? (
              <span className="flex items-center gap-1 text-amber-400 text-[9px] font-black bg-black/80 backdrop-blur-md border border-amber-500/50 px-2 py-0.5 rounded-md shadow-glow-gold">
                <Flame className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {currentGame.hype_count || 0} HYPES
              </span>
            ) : (
              <span className="flex items-center gap-1 text-portal-gold text-[9px] font-black bg-black/80 backdrop-blur-md border border-amber-500/40 px-2 py-0.5 rounded-md">
                <Star className="w-2.5 h-2.5 fill-portal-gold" /> {currentGame.rating?.toFixed(1) || '4.9'}
              </span>
            )}
          </div>

          {/* Bottom In-Artwork Badges */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white pointer-events-none">
            <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-black bg-black/80 backdrop-blur-md border border-emerald-500/40 px-2 py-0.5 rounded-md">
              <Zap className="w-2.5 h-2.5 text-portal-cyan" /> {isComingSoon ? '9 NESTED BOARDS' : '60-144 FPS'}
            </span>
            <span className="text-[9px] font-bold text-slate-300 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-700/50">
              {isComingSoon ? 'COMING SOON' : formatPlayCount(currentGame.play_count)}
            </span>
          </div>
        </div>

        {/* Title & Description Row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm xs:text-base font-black tracking-tight text-white truncate">
              <span className="bg-gradient-to-r from-white via-cyan-100 to-portal-cyan bg-clip-text text-transparent">
                {currentGame.title}
              </span>
            </h1>
            <p className="text-[10px] text-slate-300 line-clamp-1 font-medium mt-0.5">
              {currentGame.description}
            </p>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={() => onPlayGame(currentGame)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-black text-xs uppercase tracking-wider active:scale-95 transition-all ${
              isComingSoon
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.4)]'
                : 'bg-gradient-to-r from-portal-cyan via-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black shadow-glow-cyan'
            }`}
          >
            {isComingSoon ? (
              <>
                <Flame className="w-3.5 h-3.5 fill-black text-black" />
                <span>HYPE / PREVIEW</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>PLAY NOW</span>
              </>
            )}
          </button>

          <button
            onClick={() => isComingSoon ? onPlayGame(currentGame) : onViewLeaderboard(currentGame.id)}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-portal-surface border border-portal-border hover:border-amber-400/60 text-portal-gold font-black text-xs hover:bg-amber-500/10 active:scale-95 transition-all"
          >
            {isComingSoon ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-portal-gold" />
                <span>Hype Info</span>
              </>
            ) : (
              <>
                <Trophy className="w-3.5 h-3.5 text-portal-gold" />
                <span>Scores</span>
              </>
            )}
          </button>

          <button
            onClick={(e) => onToggleFavorite(currentGame.id, e)}
            className={`p-2 rounded-lg border transition-all active:scale-95 ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-portal-surface border-portal-border text-slate-400 hover:text-white hover:border-slate-500'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* DESKTOP VIEW (≥ md): Full Rich Dual-Pane Showcase Grid with Smooth Transitions */}
      <div key={`desktop-${currentGame.id}-${transitionKey}`} className="hidden md:grid relative z-10 grid-cols-12 gap-6 items-center animate-spotlight">
        {/* Left: Big Preview Artwork */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="col-span-4 relative group aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 border border-cyan-400/40 shadow-xl cursor-pointer"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Hover Play/Hype Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-glow-cyan transform group-hover:scale-110 transition-transform ${
              isComingSoon
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                : 'bg-portal-cyan text-black'
            }`}>
              {isComingSoon ? (
                <Flame className="w-7 h-7 fill-black" />
              ) : (
                <Play className="w-7 h-7 fill-black translate-x-0.5" />
              )}
            </div>
          </div>

          {/* In-Preview Feature Badge */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-black text-portal-cyan border border-cyan-500/40">
              {currentGame.category}
            </span>
            <span className="text-[10px] font-bold text-slate-300 bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-md">
              {isComingSoon ? 'COMING SOON' : formatPlayCount(currentGame.play_count)}
            </span>
          </div>
        </div>

        {/* Right: Info, Features & Action Buttons */}
        <div className="col-span-8 flex flex-col justify-between space-y-4">
          <div>
            {/* Meta badges row */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {isComingSoon ? (
                <span className="flex items-center gap-1 text-amber-400 text-xs font-black bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-md shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                  <Flame className="w-3 h-3 fill-amber-400 text-amber-400" /> {currentGame.hype_count || 0} HYPE VOTES
                </span>
              ) : (
                <span className="flex items-center gap-1 text-portal-gold text-xs font-black bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-md">
                  <Star className="w-3 h-3 fill-portal-gold" /> {currentGame.rating?.toFixed(1) || '4.9'}
                  {currentGame.rating_count ? (
                    <span className="text-slate-400 font-normal">({currentGame.rating_count} reviews)</span>
                  ) : null}
                </span>
              )}
              <span className="flex items-center gap-1 text-portal-cyan text-xs font-black bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-md">
                <Zap className="w-3 h-3" /> {isComingSoon ? 'STRATEGY ENGINE' : 'VERIFIED 60-144 FPS'}
              </span>
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-black bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                <Shield className="w-3 h-3" /> 9:16 PORTRAIT READY
              </span>
            </div>

            {/* Game Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-cyan-100 to-portal-cyan bg-clip-text text-transparent">
                {currentGame.title}
              </span>
            </h1>

            {/* Game Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1.5 max-w-2xl font-medium">
              {currentGame.description}
            </p>

            {/* Feature Chips */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-portal-surface/90 border border-portal-border/80 text-[10px] sm:text-xs font-bold text-slate-300"
                >
                  ⚡ {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap pt-1">
            <button
              onClick={() => onPlayGame(currentGame)}
              className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider active:scale-95 transition-all ${
                isComingSoon
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black shadow-[0_0_22px_rgba(245,158,11,0.45)]'
                  : 'bg-gradient-to-r from-portal-cyan via-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black shadow-glow-cyan'
              }`}
            >
              {isComingSoon ? (
                <>
                  <Flame className="w-4 h-4 fill-black text-black" />
                  <span>HYPE / PREVIEW</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" />
                  <span>PLAY NOW</span>
                </>
              )}
            </button>

            <button
              onClick={() => isComingSoon ? onPlayGame(currentGame) : onViewLeaderboard(currentGame.id)}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-portal-surface border border-portal-border hover:border-amber-400/60 text-portal-gold font-black text-xs sm:text-sm hover:bg-amber-500/10 active:scale-95 transition-all"
            >
              {isComingSoon ? (
                <>
                  <Sparkles className="w-4 h-4 text-portal-gold" />
                  <span>Hype Details</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 text-portal-gold" />
                  <span>Leaderboard</span>
                </>
              )}
            </button>

            <button
              onClick={(e) => onToggleFavorite(currentGame.id, e)}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all active:scale-95 ${
                isFavorite
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-portal-surface border-portal-border text-slate-400 hover:text-white hover:border-slate-500'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

