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
  'cyber-drift': ['2D Infinite Drifting', '10X Apex Multipliers', 'Garage Car Tuning', 'Procedural Web Audio'],
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
  // Get all featured games (Cyber Drift, Cyber Slicer, Neon Starfighter, and Multidimension XO prioritized)
  const featuredGames = games.filter(
    g => g.status !== 'hidden' && (g.featured || g.slug === 'cyber-drift' || g.slug === 'cyber-slicer' || g.slug === 'neon-starfighter' || g.slug === 'multidimension-xo')
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
    if (slug === 'cyber-drift') return <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-portal-cyan" />;
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
      className="relative w-full rounded-2xl sm:rounded-3xl bg-portal-surface border-3 sm:border-4 border-black p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6 shadow-neo-lg overflow-hidden"
    >
      {/* Top Tri-Color Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

      {/* Dynamic Keyframes for Smooth Spotlight Animation */}
      <style jsx>{`
        @keyframes spotlightFadeScale {
          0% {
            opacity: 0;
            transform: scale(0.98) translateY(4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-spotlight {
          animation: spotlightFadeScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Top Bar: Spotlight Pill + Selector Switcher + Nav Arrows */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5 mb-2.5 sm:mb-3 md:mb-4 pt-1 pb-2 sm:pb-2.5 border-b-3 border-black">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1 sm:gap-1.5 px-3 py-1 rounded-xl bg-portal-yellow text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>SPOTLIGHT SHOWCASE</span>
          </span>
          <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase hidden xs:inline">
            Featured Highlights
          </span>
        </div>

        {/* Quick Switcher Tabs & Arrows */}
        {featuredGames.length > 1 && (
          <div className="flex items-center gap-1">
            {/* Prev Arrow */}
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
              title="Previous Game"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Game Tabs */}
            <div className="flex items-center gap-1 bg-portal-card p-1 rounded-xl border-2 border-black shadow-neo-sm">
              {featuredGames.map((game, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={game.id}
                    onClick={() => handleSelect(idx)}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all border uppercase ${
                      isActive
                        ? 'bg-portal-cyan text-black border-black shadow-neo-sm font-black'
                        : 'border-transparent text-slate-300 hover:text-white hover:bg-portal-surface'
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
              className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
              title="Next Game"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>

      {/* MOBILE VIEW (< md): Taller Cinematic Showcase Card */}
      <div key={`mobile-${currentGame.id}-${transitionKey}`} className="md:hidden relative z-10 space-y-3 animate-spotlight">
        {/* Cinematic Artwork with Center Play Overlay & Corner Badges */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="relative group w-full h-[245px] xs:h-[275px] rounded-2xl overflow-hidden bg-black border-3 border-black shadow-neo cursor-pointer"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Center Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-3 border-black shadow-neo transform group-hover:scale-110 group-active:translate-x-1 group-active:translate-y-1 transition-all ${
              isComingSoon
                ? 'bg-portal-yellow text-black'
                : 'bg-portal-cyan text-black'
            }`}>
              {isComingSoon ? (
                <Flame className="w-7 h-7 fill-black stroke-[2.5]" />
              ) : (
                <Play className="w-7 h-7 fill-black stroke-[2.5] ml-0.5" />
              )}
            </div>
          </div>

          {/* Top In-Artwork Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-white pointer-events-none">
            <span className="px-2.5 py-0.5 rounded-md bg-portal-cyan text-black text-[9px] font-black uppercase border border-black shadow-neo-sm">
              {currentGame.category}
            </span>
            {isComingSoon ? (
              <span className="flex items-center gap-1 text-black text-[9px] font-black bg-portal-yellow border border-black px-2.5 py-0.5 rounded-md shadow-neo-sm uppercase">
                <Flame className="w-3 h-3 fill-black text-black stroke-[2.5]" /> {currentGame.hype_count || 0} HYPES
              </span>
            ) : (
              <span className="flex items-center gap-1 text-black text-[9px] font-black bg-portal-yellow border border-black px-2.5 py-0.5 rounded-md shadow-neo-sm uppercase">
                <Star className="w-3 h-3 fill-black stroke-[2.5]" /> {currentGame.rating?.toFixed(1) || '4.9'}
              </span>
            )}
          </div>

          {/* Bottom In-Artwork Badges */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white pointer-events-none">
            <span className="flex items-center gap-1 text-black text-[9px] font-black bg-portal-lime border border-black px-2.5 py-0.5 rounded-md shadow-neo-sm uppercase">
              <Zap className="w-3 h-3 text-black stroke-[2.5]" /> {isComingSoon ? (currentGame.slug === 'multidimension-xo' ? '9 NESTED BOARDS' : currentGame.slug === 'cyber-drift' ? 'DRIFT PHYSICS' : 'COMMUNITY HYPE') : '60-144 FPS'}
            </span>
            <span className="text-[9px] font-black text-white bg-portal-surface px-2.5 py-0.5 rounded-md border border-black shadow-neo-sm uppercase">
              {isComingSoon ? 'COMING SOON' : formatPlayCount(currentGame.play_count)}
            </span>
          </div>
        </div>

        {/* Title & Description Row */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="min-w-0">
            <h1 className="text-lg xs:text-xl font-black tracking-tight text-white uppercase truncate">
              {currentGame.title}
            </h1>
            <p className="text-xs text-slate-300 line-clamp-2 font-bold mt-0.5 leading-snug">
              {currentGame.description}
            </p>
          </div>

          {/* Feature Chips on Mobile */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-lg bg-portal-card border border-black text-[9px] font-black text-slate-200 uppercase shadow-neo-sm"
              >
                ⚡ {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onPlayGame(currentGame)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${
              isComingSoon
                ? 'bg-portal-yellow text-black'
                : 'bg-portal-cyan text-black'
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
            {isComingSoon ? (
              <>
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Hype</span>
              </>
            ) : (
              <>
                <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Ranks</span>
              </>
            )}
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

      {/* DESKTOP VIEW (≥ md): Full Rich Dual-Pane Showcase Grid */}
      <div key={`desktop-${currentGame.id}-${transitionKey}`} className="hidden md:grid relative z-10 grid-cols-12 gap-6 items-center animate-spotlight">
        {/* Left: Big Preview Artwork */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="col-span-4 relative group aspect-square w-full rounded-2xl overflow-hidden bg-black border-3 border-black shadow-neo-lg cursor-pointer"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Hover Play/Hype Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-3 border-black shadow-neo transform group-hover:scale-110 transition-transform ${
              isComingSoon
                ? 'bg-portal-yellow text-black'
                : 'bg-portal-cyan text-black'
            }`}>
              {isComingSoon ? (
                <Flame className="w-8 h-8 fill-black stroke-[2.5]" />
              ) : (
                <Play className="w-8 h-8 fill-black stroke-[2.5] ml-1" />
              )}
            </div>
          </div>

          {/* In-Preview Feature Badge */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
            <span className="px-2.5 py-0.5 rounded-md bg-portal-cyan text-black text-[10px] font-black uppercase border border-black shadow-neo-sm">
              {currentGame.category}
            </span>
            <span className="text-[10px] font-black text-white bg-portal-surface px-2.5 py-0.5 rounded-md border border-black shadow-neo-sm uppercase">
              {isComingSoon ? 'COMING SOON' : formatPlayCount(currentGame.play_count)}
            </span>
          </div>
        </div>

        {/* Right: Info, Features & Action Buttons */}
        <div className="col-span-8 flex flex-col justify-between space-y-4">
          <div>
            {/* Meta badges row */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {isComingSoon ? (
                <span className="flex items-center gap-1.5 text-black text-xs font-black bg-portal-yellow border-2 border-black px-2.5 py-0.5 rounded-lg shadow-neo-sm uppercase">
                  <Flame className="w-3.5 h-3.5 fill-black text-black stroke-[2.5]" /> {currentGame.hype_count || 0} HYPE VOTES
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-black text-xs font-black bg-portal-yellow border-2 border-black px-2.5 py-0.5 rounded-lg shadow-neo-sm uppercase">
                  <Star className="w-3.5 h-3.5 fill-black stroke-[2.5]" /> {currentGame.rating?.toFixed(1) || '4.9'}
                  {currentGame.rating_count ? (
                    <span className="text-black/80 font-bold">({currentGame.rating_count} reviews)</span>
                  ) : null}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-black text-xs font-black bg-portal-cyan border-2 border-black px-2.5 py-0.5 rounded-lg shadow-neo-sm uppercase">
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" /> {isComingSoon ? (currentGame.slug === 'multidimension-xo' ? 'STRATEGY ENGINE' : currentGame.slug === 'cyber-drift' ? 'DRIFT PHYSICS' : 'COMMUNITY HYPE') : 'VERIFIED 60-144 FPS'}
              </span>
              <span className="flex items-center gap-1.5 text-black text-xs font-black bg-portal-lime border-2 border-black px-2.5 py-0.5 rounded-lg shadow-neo-sm uppercase">
                <Shield className="w-3.5 h-3.5 stroke-[2.5]" /> 9:16 PORTRAIT READY
              </span>
            </div>

            {/* Game Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase">
              {currentGame.title}
            </h1>

            {/* Game Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1.5 max-w-2xl font-bold">
              {currentGame.description}
            </p>

            {/* Feature Chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-xl bg-portal-card border-2 border-black text-xs font-black text-slate-200 uppercase shadow-neo-sm"
                >
                  ⚡ {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button
              onClick={() => onPlayGame(currentGame)}
              className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${
                isComingSoon
                  ? 'bg-portal-yellow text-black'
                  : 'bg-portal-cyan text-black'
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
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-portal-card hover:bg-portal-yellow text-portal-yellow hover:text-black border-3 border-black font-black text-sm uppercase tracking-wider shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              {isComingSoon ? (
                <>
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>Hype Details</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 stroke-[2.5]" />
                  <span>Leaderboard</span>
                </>
              )}
            </button>

            <button
              onClick={(e) => onToggleFavorite(currentGame.id, e)}
              className={`p-3 rounded-xl border-3 border-black transition-all shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none ${
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
      </div>
    </div>
  );
}

