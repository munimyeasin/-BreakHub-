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
    <div className="relative w-full rounded-xl sm:rounded-2xl md:rounded-2xl bg-gradient-to-br from-portal-surface via-slate-950 to-portal-bg border border-cyan-500/30 md:border-2 md:border-cyan-500/40 p-2 sm:p-2.5 md:p-3 mb-2 sm:mb-2.5 md:mb-3 shadow-[0_0_20px_rgba(6,182,212,0.12)] overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 md:w-64 h-36 md:h-64 bg-portal-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 md:w-64 h-36 md:h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Spotlight Pill + Switcher Tabs */}
      <div className="relative z-10 flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2 md:mb-2 pb-1 sm:pb-1.5 md:pb-1.5 border-b border-portal-border/60">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-wider shadow-glow-cyan">
            <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 fill-black" />
            <span>SPOTLIGHT</span>
          </span>
          <span className="text-[9px] md:text-[11px] font-bold text-slate-400 hidden sm:inline">
            Top Featured Games
          </span>
        </div>

        {/* Quick Switcher Tabs */}
        {featuredGames.length > 1 && (
          <div className="flex items-center gap-1 bg-portal-bg/90 p-0.5 rounded-lg border border-portal-border/80">
            {featuredGames.map((game, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={game.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`flex items-center gap-1 px-1.5 sm:px-2 md:px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] md:text-xs font-black transition-all ${
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
                  <span className="truncate max-w-[75px] sm:max-w-[100px] md:max-w-[120px]">{game.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE COMPACT VIEW (< md): Horizontal sleek mini-hero with low height    */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex md:hidden items-center gap-2 sm:gap-2.5">
        {/* Left: Compact Square Thumbnail */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="relative group w-14 h-14 xs:w-16 xs:h-16 sm:w-18 sm:h-18 rounded-lg overflow-hidden bg-slate-900 border border-cyan-400/40 shrink-0 cursor-pointer shadow-md"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Quick Play Icon Badge in thumbnail */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-portal-cyan text-black flex items-center justify-center shadow-glow-cyan group-hover:scale-110 transition-transform">
              <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-black ml-0.5" />
            </div>
          </div>
        </div>

        {/* Right: Info & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-0.5">
          <div>
            {/* Badges row: Rating + Category */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="px-1.5 py-0.2 rounded text-[7px] sm:text-[8px] font-black uppercase tracking-wider bg-cyan-500/15 text-portal-cyan border border-cyan-500/30">
                {currentGame.category}
              </span>
              <span className="flex items-center gap-0.5 text-portal-gold text-[8px] sm:text-[9px] font-black">
                <Star className="w-2 h-2 fill-portal-gold" /> {currentGame.rating?.toFixed(1) || '4.9'}
              </span>
              <span className="text-[8px] sm:text-[9px] text-slate-400 truncate">
                • {formatPlayCount(currentGame.play_count)}
              </span>
            </div>

            {/* Title */}
            <h3
              onClick={() => onPlayGame(currentGame)}
              className="text-xs xs:text-sm font-black text-white truncate cursor-pointer hover:text-portal-cyan transition-colors leading-tight"
            >
              {currentGame.title}
            </h3>

            {/* Key Highlight Tag */}
            <p className="text-[9px] xs:text-[10px] text-slate-300 truncate font-medium mt-0.5">
              ⚡ {tags[0]} {tags[1] ? `• ${tags[1]}` : ''}
            </p>
          </div>

          {/* Mobile Button Row */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={() => onPlayGame(currentGame)}
              className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-portal-cyan to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-[10px] uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all"
            >
              <Play className="w-2.5 h-2.5 fill-black" />
              <span>PLAY</span>
            </button>

            <button
              onClick={() => onViewLeaderboard(currentGame.id)}
              className="p-1 rounded-md bg-portal-surface border border-portal-border hover:border-amber-400/60 text-portal-gold hover:bg-amber-500/10 active:scale-95 transition-all"
              title="View Leaderboard"
            >
              <Trophy className="w-3 h-3 text-portal-gold" />
            </button>

            <button
              onClick={(e) => onToggleFavorite(currentGame.id, e)}
              className={`p-1 rounded-md border transition-all active:scale-95 ${
                isFavorite
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-400'
                  : 'bg-portal-surface border-portal-border text-slate-400 hover:text-white'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-3 h-3 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP HERO VIEW (>= md): Sleek landscape showcase (Low vertical footprint) */}
      {/* ========================================================================= */}
      <div className="hidden md:grid md:grid-cols-12 gap-3.5 lg:gap-4 items-center">
        {/* Left: Landscape Preview Artwork */}
        <div
          onClick={() => onPlayGame(currentGame)}
          className="md:col-span-3 lg:col-span-3 relative group h-28 md:h-32 lg:h-34 w-full rounded-xl overflow-hidden bg-slate-900 border border-cyan-400/40 shadow-md cursor-pointer shrink-0"
        >
          <img
            src={currentGame.thumbnail_url}
            alt={currentGame.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs">
            <div className="w-10 h-10 rounded-full bg-portal-cyan text-black flex items-center justify-center shadow-glow-cyan transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-black ml-0.5" />
            </div>
          </div>

          {/* In-Preview Feature Badge */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white">
            <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] font-black text-portal-cyan border border-cyan-500/40">
              {currentGame.category}
            </span>
            <span className="text-[9px] font-bold text-slate-300 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-md">
              {formatPlayCount(currentGame.play_count)}
            </span>
          </div>
        </div>

        {/* Right: Info, Features & Action Buttons */}
        <div className="md:col-span-9 lg:col-span-9 flex flex-col justify-between space-y-2">
          <div>
            {/* Meta badges row */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="flex items-center gap-1 text-portal-gold text-[10px] font-black bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                <Star className="w-2.5 h-2.5 fill-portal-gold" /> {currentGame.rating?.toFixed(1) || '4.9'}
                {currentGame.rating_count ? (
                  <span className="text-slate-400 font-normal">({currentGame.rating_count} reviews)</span>
                ) : null}
              </span>
              <span className="flex items-center gap-1 text-portal-cyan text-[10px] font-black bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                <Zap className="w-2.5 h-2.5" /> 60-144 FPS
              </span>
              <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-black bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                <Shield className="w-2.5 h-2.5" /> 9:16 PORTRAIT
              </span>
            </div>

            {/* Game Title */}
            <h1 className="text-lg lg:text-xl font-black tracking-tight text-white flex items-center gap-2 leading-tight">
              <span className="bg-gradient-to-r from-white via-cyan-100 to-portal-cyan bg-clip-text text-transparent">
                {currentGame.title}
              </span>
            </h1>

            {/* Game Description (Single concise line) */}
            <p className="text-xs text-slate-300 leading-snug mt-0.5 max-w-2xl font-medium line-clamp-1">
              {currentGame.description}
            </p>

            {/* Feature Chips */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-portal-surface/90 border border-portal-border/80 text-[10px] font-bold text-slate-300"
                >
                  ⚡ {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => onPlayGame(currentGame)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-portal-cyan via-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-xs uppercase tracking-wider shadow-glow-cyan hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>PLAY NOW</span>
            </button>

            <button
              onClick={() => onViewLeaderboard(currentGame.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-portal-surface border border-portal-border hover:border-amber-400/60 text-portal-gold hover:bg-amber-500/10 font-bold text-xs active:scale-95 transition-all"
            >
              <Trophy className="w-3.5 h-3.5 text-portal-gold" />
              <span>Scores</span>
            </button>

            <button
              onClick={(e) => onToggleFavorite(currentGame.id, e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-xs transition-all active:scale-95 ${
                isFavorite
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 hover:bg-rose-500/30'
                  : 'bg-portal-surface border-portal-border text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{isFavorite ? 'Saved' : 'Favorite'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
