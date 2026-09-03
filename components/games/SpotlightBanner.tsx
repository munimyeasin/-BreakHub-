'use client';

import React, { useState } from 'react';
import { Play, Trophy, Heart, Star, Sparkles, Zap, Shield, Swords, Rocket } from 'lucide-react';
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
  // Get all active featured games (Cyber Slicer and Neon Starfighter prioritized)
  const featuredGames = games.filter(
    g => g.status === 'active' && (g.featured || g.slug === 'cyber-slicer' || g.slug === 'neon-starfighter')
  );

  const [activeIndex, setActiveIndex] = useState(0);

  // Safety check
  if (featuredGames.length === 0) return null;

  const currentGame = featuredGames[activeIndex] || featuredGames[0];
  const isFavorite = favorites.includes(currentGame.id);
  const tags = HIGHLIGHT_TAGS[currentGame.slug] || ['Cyber Arcade', 'Web Audio Engine', 'Instant Play'];

  return (
    <div className="relative w-full rounded-xl sm:rounded-2xl md:rounded-3xl bg-gradient-to-br from-portal-surface via-slate-950 to-portal-bg border border-cyan-500/30 sm:border-2 sm:border-cyan-500/40 p-2.5 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-6 shadow-[0_0_25px_rgba(6,182,212,0.15)] md:shadow-[0_0_35px_rgba(6,182,212,0.18)] overflow-hidden">
      {/* Background Ambient Glow & Cyber Grid */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 sm:-mr-20 sm:-mt-20 w-48 sm:w-80 h-48 sm:h-80 bg-portal-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 sm:-ml-20 sm:-mb-20 w-48 sm:w-80 h-48 sm:h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Spotlight Pill + Selector Switcher */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5 mb-2 sm:mb-3 md:mb-4 pb-1.5 sm:pb-2.5 border-b border-portal-border/60">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider shadow-glow-cyan animate-pulse">
            <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-black" />
            <span>SPOTLIGHT SHOWCASE</span>
          </span>
          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 hidden xs:inline">
            Top Featured Games
          </span>
        </div>

        {/* Quick Switcher Tabs */}
        {featuredGames.length > 1 && (
          <div className="flex items-center gap-1 bg-portal-bg/90 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-portal-border/80">
            {featuredGames.map((game, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={game.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black transition-all ${
                    isActive
                      ? 'bg-portal-cyan text-black shadow-glow-cyan scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-portal-surface'
                  }`}
                >
                  {game.slug === 'cyber-slicer' ? (
                    <Swords className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : (
                    <Rocket className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  )}
                  <span className="truncate max-w-[75px] xs:max-w-[95px] sm:max-w-[130px]">{game.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Spotlight Hero Content */}
      <div className="relative z-10 grid grid-cols-12 gap-2.5 sm:gap-4 md:gap-6 items-center">
        {/* Left: Preview Artwork */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="col-span-4 sm:col-span-4 md:col-span-4 relative group aspect-square w-full rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden bg-slate-900 border border-cyan-400/40 shadow-lg md:shadow-xl cursor-pointer"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs">
            <div className="w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full bg-portal-cyan text-black flex items-center justify-center shadow-glow-cyan transform group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 fill-black translate-x-0.5" />
            </div>
          </div>

          {/* In-Preview Feature Badge */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2.5 sm:left-2.5 sm:right-2.5 flex items-center justify-between text-white">
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded sm:rounded-md bg-black/70 backdrop-blur-md text-[8px] sm:text-[10px] font-black text-portal-cyan border border-cyan-500/40 uppercase">
              {currentGame.category}
            </span>
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-300 bg-black/70 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded sm:rounded-md backdrop-blur-md">
              {formatPlayCount(currentGame.play_count)}
            </span>
          </div>
        </div>

        {/* Right: Info, Features & Action Buttons */}
        <div className="col-span-8 sm:col-span-8 md:col-span-8 flex flex-col justify-between space-y-1.5 sm:space-y-2.5 md:space-y-4 min-w-0">
          <div>
            {/* Meta badges row */}
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap mb-1 sm:mb-1.5">
              <span className="flex items-center gap-0.5 sm:gap-1 text-portal-gold text-[9px] sm:text-[10px] md:text-xs font-black bg-amber-500/15 border border-amber-500/30 px-1.5 sm:px-2.5 py-0.2 sm:py-0.5 rounded sm:rounded-md">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-portal-gold" /> {currentGame.rating?.toFixed(1) || '4.9'}
                {currentGame.rating_count ? (
                  <span className="text-slate-400 font-normal hidden xs:inline">({currentGame.rating_count})</span>
                ) : null}
              </span>
              <span className="flex items-center gap-0.5 sm:gap-1 text-portal-cyan text-[8px] sm:text-[10px] md:text-xs font-black bg-cyan-500/15 border border-cyan-500/30 px-1.5 sm:px-2.5 py-0.2 sm:py-0.5 rounded sm:rounded-md">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="hidden xs:inline">VERIFIED </span>60-144 FPS
              </span>
              <span className="hidden sm:flex items-center gap-1 text-emerald-400 text-[10px] md:text-xs font-black bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-2.5 py-0.5 rounded-md">
                <Shield className="w-3 h-3" /> 9:16 PORTRAIT READY
              </span>
            </div>

            {/* Game Title */}
            <h1 className="text-sm xs:text-base sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2 leading-tight">
              <span className="bg-gradient-to-r from-white via-cyan-100 to-portal-cyan bg-clip-text text-transparent truncate">
                {currentGame.title}
              </span>
            </h1>

            {/* Game Description */}
            <p className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm text-slate-300 leading-tight sm:leading-relaxed mt-0.5 sm:mt-1.5 max-w-2xl font-medium line-clamp-1 xs:line-clamp-2 md:line-clamp-none">
              {currentGame.description}
            </p>

            {/* Feature Chips */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 mt-1.5 sm:mt-2.5 md:mt-3">
              {tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-lg bg-portal-surface/90 border border-portal-border/80 text-[8px] sm:text-[10px] md:text-xs font-bold text-slate-300 ${
                    i > 1 ? 'hidden sm:inline-block' : ''
                  }`}
                >
                  ⚡ {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 flex-wrap pt-0.5 sm:pt-1">
            <button
              onClick={() => onPlayGame(currentGame)}
              className="flex items-center justify-center gap-1 sm:gap-2 px-3 xs:px-4 sm:px-6 md:px-8 py-1.5 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-portal-cyan via-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-[10px] xs:text-xs sm:text-sm uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all"
            >
              <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-black" />
              <span>PLAY NOW</span>
            </button>

            <button
              onClick={() => onViewLeaderboard(currentGame.id)}
              className="flex items-center justify-center gap-1 sm:gap-2 px-2 xs:px-3 sm:px-4 md:px-5 py-1.5 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl bg-portal-surface border border-portal-border hover:border-amber-400/60 text-portal-gold font-black text-[10px] xs:text-xs sm:text-sm hover:bg-amber-500/10 active:scale-95 transition-all"
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-portal-gold" />
              <span className="hidden xs:inline">Leaderboard</span>
              <span className="xs:hidden">Scores</span>
            </button>

            <button
              onClick={(e) => onToggleFavorite(currentGame.id, e)}
              className={`p-1.5 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl border transition-all active:scale-95 ${
                isFavorite
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-portal-surface border-portal-border text-slate-400 hover:text-white hover:border-slate-500'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
