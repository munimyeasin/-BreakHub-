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
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-br from-portal-surface via-slate-950 to-portal-bg border-2 border-cyan-500/40 p-3 sm:p-5 mb-6 shadow-[0_0_35px_rgba(6,182,212,0.18)] overflow-hidden">
      {/* Background Ambient Glow & Cyber Grid */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-portal-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Spotlight Pill + Selector Switcher */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 mb-3 sm:mb-4 pb-2.5 border-b border-portal-border/60">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-glow-cyan animate-pulse">
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>SPOTLIGHT SHOWCASE</span>
          </span>
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 hidden xs:inline">
            Top Featured Games
          </span>
        </div>

        {/* Quick Switcher Tabs */}
        {featuredGames.length > 1 && (
          <div className="flex items-center gap-1.5 bg-portal-bg/90 p-1 rounded-xl border border-portal-border/80">
            {featuredGames.map((game, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={game.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    isActive
                      ? 'bg-portal-cyan text-black shadow-glow-cyan scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-portal-surface'
                  }`}
                >
                  {game.slug === 'cyber-slicer' ? (
                    <Swords className="w-3 h-3" />
                  ) : (
                    <Rocket className="w-3 h-3" />
                  )}
                  <span className="truncate max-w-[100px] sm:max-w-[130px]">{game.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Spotlight Hero Content */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
        {/* Left: Big Preview Artwork */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="md:col-span-4 relative group aspect-video sm:aspect-square md:aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 border border-cyan-400/40 shadow-xl cursor-pointer"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs">
            <div className="w-14 h-14 rounded-full bg-portal-cyan text-black flex items-center justify-center shadow-glow-cyan transform group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-black translate-x-0.5" />
            </div>
          </div>

          {/* In-Preview Feature Badge */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-black text-portal-cyan border border-cyan-500/40">
              {currentGame.category}
            </span>
            <span className="text-[10px] font-bold text-slate-300 bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-md">
              {formatPlayCount(currentGame.play_count)}
            </span>
          </div>
        </div>

        {/* Right: Info, Features & Action Buttons */}
        <div className="md:col-span-8 flex flex-col justify-between space-y-3 sm:space-y-4">
          <div>
            {/* Meta badges row */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="flex items-center gap-1 text-portal-gold text-xs font-black bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-md">
                <Star className="w-3 h-3 fill-portal-gold" /> {currentGame.rating?.toFixed(1) || '4.9'}
                {currentGame.rating_count ? (
                  <span className="text-slate-400 font-normal">({currentGame.rating_count} reviews)</span>
                ) : null}
              </span>
              <span className="flex items-center gap-1 text-portal-cyan text-xs font-black bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-md">
                <Zap className="w-3 h-3" /> VERIFIED 60-144 FPS
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
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-portal-cyan via-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>PLAY NOW</span>
            </button>

            <button
              onClick={() => onViewLeaderboard(currentGame.id)}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-portal-surface border border-portal-border hover:border-amber-400/60 text-portal-gold font-black text-xs sm:text-sm hover:bg-amber-500/10 active:scale-95 transition-all"
            >
              <Trophy className="w-4 h-4 text-portal-gold" />
              <span>Leaderboard</span>
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
