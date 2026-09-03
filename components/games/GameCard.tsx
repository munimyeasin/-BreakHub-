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

const CATEGORY_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  ARCADE: { bg: 'bg-cyan-500/15', text: 'text-portal-cyan', border: 'border-cyan-500/30' },
  PUZZLE: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  STRATEGY: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  ACTION: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  CARD: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
};

export const formatPlayCount = (count: number = 0): string => {
  const n = Math.max(0, Math.floor(count || 0));
  if (n === 0) return '0 plays';
  if (n === 1) return '1 play';
  if (n < 1000) return `${n.toLocaleString()} plays`;
  if (n < 1000000) {
    const k = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return `${k}k plays`;
  }
  const m = (n / 1000000).toFixed(1).replace(/\.0$/, '');
  return `${m}M plays`;
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
      className={`group relative flex flex-col bg-portal-surface rounded-xl sm:rounded-2xl border p-2 sm:p-2.5 cursor-pointer shadow-lg active:scale-95 transition-all duration-200 select-none ${
        isComingSoon
          ? 'border-amber-500/40 hover:border-amber-400/80 hover:shadow-glow-gold/25'
          : 'border-portal-border hover:border-portal-cyan/60 hover:shadow-glow-cyan/25'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full rounded-lg sm:rounded-xl overflow-hidden bg-slate-900 mb-1.5 sm:mb-2">
        <img
          src={game.thumbnail_url}
          alt={game.title}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isComingSoon ? 'filter brightness-90 group-hover:scale-105' : 'group-hover:scale-110'
          }`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-portal-bg/95 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />

        {/* Coming Soon Top Ribbon */}
        {isComingSoon && (
          <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 z-10">
            <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-sm border border-yellow-300">
              <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> SOON
            </span>
          </div>
        )}

        {/* Featured Top Ribbon */}
        {!isComingSoon && (game.featured || game.slug === 'neon-starfighter') && (
          <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 z-10">
            <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-cyan-500/90 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-sm border border-cyan-300">
              <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-black" /> <span className="hidden xs:inline sm:inline">FEATURED</span><span className="xs:hidden sm:hidden">HOT</span>
            </span>
          </div>
        )}

        {/* Favorite Icon */}
        <button
          onClick={(e) => onToggleFavorite(game.id, e)}
          className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 p-1 sm:p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:text-rose-400 active:scale-75 transition-all z-10"
          title={isFavorite ? "Remove favorite" : "Add to favorites"}
        >
          <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`} />
        </button>

        {/* Quick Trophy Leaderboard Button (Only for active games) */}
        {!isComingSoon && (
          <button
            onClick={(e) => onViewLeaderboard(game.id, e)}
            className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 p-1 sm:p-1.5 rounded-lg bg-black/75 backdrop-blur-md text-portal-gold opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
            title="View Top Scores"
          >
            <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-portal-gold/30" />
          </button>
        )}

        {/* Action Overlay Icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {isComingSoon ? (
            <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500 text-black font-black text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-glow-gold">
              <Sparkles className="w-3 h-3" />
              <span>Preview</span>
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-portal-cyan text-black flex items-center justify-center shadow-glow-cyan">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black ml-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* Meta & Info */}
      <div className="flex flex-col flex-1 justify-between min-w-0">
        <div>
          <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
            <span className={`inline-block px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border} truncate max-w-full`}>
              {game.category}
            </span>
          </div>
          <h3 className={`font-black text-[11px] sm:text-xs leading-tight line-clamp-1 transition-colors ${
            isComingSoon ? 'text-slate-200 group-hover:text-amber-300' : 'text-white group-hover:text-portal-cyan'
          }`}>
            {game.title}
          </h3>
        </div>

        <div className="flex items-center justify-between mt-1.5 sm:mt-2 pt-1 border-t border-portal-border/50 text-[9px] sm:text-[10px] text-slate-400 font-medium">
          {isComingSoon ? (
            <>
              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> In Dev
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHype?.(game.id, e);
                }}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md border text-[9px] sm:text-[10px] font-black tracking-wide transition-all z-10 ${
                  isHyped
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)] scale-105'
                    : 'bg-portal-surface border-amber-500/30 text-amber-400 hover:border-amber-400 hover:bg-amber-500/15'
                }`}
                title={isHyped ? "You've hyped this game! Click to un-hype" : "Hype this game!"}
              >
                <span>🔥</span>
                <span>{game.hype_count || 0}</span>
              </button>
            </>
          ) : (
            <>
              <span className="truncate">{formatPlayCount(game.play_count)}</span>
              <div onClick={(e) => e.stopPropagation()} className="shrink-0 z-10">
                <StarRating
                  gameId={game.id}
                  gameTitle={game.title}
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

