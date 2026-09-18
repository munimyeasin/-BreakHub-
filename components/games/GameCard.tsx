'use client';

import React from 'react';
import { Heart, Trophy, Play, Star, Clock, Sparkles } from 'lucide-react';
import { Game } from '@/lib/types';
import StarRating from '@/components/ui/StarRating';

interface GameCardProps {
  game: Game;
  isFavorite: boolean;
  isHyped?: boolean;
  userRating?: number | null;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onToggleHype?: (gameId: string, e: React.MouseEvent) => void;
  onRateGame?: (gameId: string, rating: number) => Promise<void> | void;
  onPlay: (game: Game) => void;
  onViewLeaderboard: (gameId: string, e: React.MouseEvent) => void;
}

const CATEGORY_THEMES: Record<string, { bg: string; text: string }> = {
  ARCADE: { bg: 'bg-portal-cyan', text: 'text-black' },
  PUZZLE: { bg: 'bg-portal-purple', text: 'text-black' },
  STRATEGY: { bg: 'bg-portal-lime', text: 'text-black' },
  ACTION: { bg: 'bg-portal-pink', text: 'text-black' },
  CARD: { bg: 'bg-portal-yellow', text: 'text-black' },
};

export const formatPlayCount = (count: number = 0): string => {
  const n = Math.max(0, Math.floor(count || 0));
  if (n === 0) return '0 PLAYS';
  if (n === 1) return '1 PLAY';
  if (n < 1000) return `${n.toLocaleString()} PLAYS`;
  if (n < 1000000) {
    const k = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return `${k}K PLAYS`;
  }
  const m = (n / 1000000).toFixed(1).replace(/\.0$/, '');
  return `${m}M PLAYS`;
};

export default function GameCard({
  game,
  isFavorite,
  isHyped = false,
  userRating = null,
  onToggleFavorite,
  onToggleHype,
  onRateGame,
  onPlay,
  onViewLeaderboard
}: GameCardProps) {
  const badge = CATEGORY_THEMES[game.category] || CATEGORY_THEMES.ARCADE;
  const isComingSoon = game.status === 'coming_soon';

  return (
    <div
      onClick={() => onPlay(game)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay(game);
        }
      }}
      className="group relative flex flex-col bg-portal-card rounded-2xl border-3 border-black p-2.5 sm:p-3 cursor-pointer shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-200 select-none"
    >
      {/* Thumbnail Container */}
      <div className="game-thumbnail-container relative aspect-square w-full rounded-xl overflow-hidden mb-2 border-2 border-black shadow-neo-sm">
        <img
          src={game.thumbnail_url}
          alt={`${game.title} - ${game.category} retro arcade mini-game thumbnail`}
          className={`game-thumbnail-img w-full h-full object-cover transition-transform duration-300 ${
            isComingSoon ? 'filter brightness-95 group-hover:scale-105' : 'group-hover:scale-110'
          }`}
          loading="lazy"
        />
        <div className="game-thumbnail-overlay absolute inset-0 group-hover:opacity-20 transition-opacity pointer-events-none" />

        {/* Coming Soon Top Ribbon */}
        {isComingSoon && (
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-portal-yellow text-black text-[9px] font-black uppercase tracking-wider border border-black shadow-neo-sm">
              <Clock className="w-2.5 h-2.5 stroke-[2.5]" /> SOON
            </span>
          </div>
        )}

        {/* Featured Top Ribbon */}
        {!isComingSoon && (game.featured || game.slug === 'cyber-slicer' || game.slug === 'neon-starfighter') && (
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-portal-cyan text-black text-[9px] font-black uppercase tracking-wider border border-black shadow-neo-sm">
              <Star className="w-2.5 h-2.5 fill-black stroke-[2.5]" /> <span>FEATURED</span>
            </span>
          </div>
        )}

        {/* Favorite Icon */}
        <button
          onClick={(e) => onToggleFavorite(game.id, e)}
          className="absolute top-1.5 right-1.5 p-1.5 rounded-xl bg-portal-surface hover:bg-portal-pink text-white hover:text-black border-2 border-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 transition-all z-10"
          title={isFavorite ? "Remove favorite" : "Add to favorites"}
        >
          <Heart className={`w-3.5 h-3.5 stroke-[2.5] ${isFavorite ? 'fill-portal-pink text-portal-pink' : 'text-slate-300'}`} />
        </button>

        {/* Quick Trophy Leaderboard Button (Only for active games) */}
        {!isComingSoon && (
          <button
            onClick={(e) => onViewLeaderboard(game.id, e)}
            className="absolute bottom-1.5 right-1.5 p-1.5 rounded-xl bg-portal-yellow text-black border-2 border-black shadow-neo-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all z-10 hover:translate-x-0.5 hover:translate-y-0.5"
            title="View Top Scores"
          >
            <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}

        {/* Action Overlay Icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {isComingSoon ? (
            <div className="px-3 py-1.5 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider flex items-center gap-1 border-2 border-black shadow-neo-sm">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Preview</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-portal-cyan text-black flex items-center justify-center border-2 border-black shadow-neo-sm">
              <Play className="w-5 h-5 fill-black stroke-[2.5] ml-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* Meta & Info */}
      <div className="flex flex-col flex-1 justify-between min-w-0">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-black shadow-neo-sm ${badge.bg} ${badge.text} truncate max-w-full`}>
              {game.category}
            </span>
          </div>
          <h3 className={`font-black text-xs sm:text-sm leading-tight uppercase line-clamp-1 transition-colors ${
            isComingSoon ? 'text-slate-200 group-hover:text-portal-yellow' : 'text-white group-hover:text-portal-cyan'
          }`}>
            {game.title}
          </h3>
        </div>

        <div className="flex items-center justify-between mt-2 pt-1.5 border-t-2 border-black text-[10px] text-slate-300 font-black uppercase">
          {isComingSoon ? (
            <>
              <span className="text-portal-yellow font-black flex items-center gap-1">
                <Sparkles className="w-3 h-3 stroke-[2.5]" /> In Dev
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHype?.(game.id, e);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 border-black text-[10px] font-black tracking-wide shadow-neo-sm transition-all z-10 hover:translate-x-0.5 hover:translate-y-0.5 ${
                  isHyped
                    ? 'bg-portal-yellow text-black'
                    : 'bg-portal-surface text-portal-yellow hover:bg-portal-yellow hover:text-black'
                }`}
                title={isHyped ? "You've hyped this game! Click to un-hype" : "Hype this game!"}
              >
                <span>🔥</span>
                <span>{game.hype_count || 0}</span>
              </button>
            </>
          ) : (
            <>
              <span className="truncate tracking-wider">{formatPlayCount(game.play_count)}</span>
              <div onClick={(e) => e.stopPropagation()} className="shrink-0 z-10">
                <StarRating
                  gameId={game.id}
                  gameTitle={game.title}
                  gameCategory={game.category}
                  thumbnailUrl={game.thumbnail_url}
                  rating={game.rating || 4.9}
                  ratingCount={game.rating_count || 0}
                  userRating={userRating}
                  size="xs"
                  showCount={true}
                  interactive={true}
                  onRate={(rating) => onRateGame?.(game.id, rating)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
