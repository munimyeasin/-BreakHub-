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

export const formatPlayCount = (count: number = 0): string => {
  const n = Math.max(0, Math.floor(count || 0));
  if (n === 0) return '0 plays';
  if (n === 1) return '1 play';
  if (n < 1000) return `${n.toLocaleString()} plays`;
  if (n < 1000000) {
    const k = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return `${k}K plays`;
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
  const isComingSoon = game.status === 'coming_soon';

  return (
    <div
      onClick={() => onPlay(game)}
      role="button"
      tabIndex={0}
      aria-label={`Play ${game.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay(game);
        }
      }}
      className="group relative flex flex-col bg-white rounded-xl border border-slate-200 p-3 cursor-pointer shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 select-none"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-3 bg-slate-100">
        <img
          src={game.thumbnail_url}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badges */}
        {isComingSoon && (
          <div className="absolute top-2 left-2 z-10">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-wider">
              Soon
            </span>
          </div>
        )}

        {/* Favorite Icon */}
        <button
          onClick={(e) => onToggleFavorite(game.id, e)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-sm transition-all z-10"
          title={isFavorite ? "Remove favorite" : "Add to favorites"}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
        </button>

        {/* Leaderboard Button */}
        {!isComingSoon && (
          <button
            onClick={(e) => onViewLeaderboard(game.id, e)}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
            title="View Leaderboard"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
          </button>
        )}
      </div>

      {/* Meta & Info */}
      <div className="flex flex-col flex-1 justify-between">
        <div>
          <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">
            {game.category}
          </span>
          <h3 className="font-semibold text-sm text-slate-900 line-clamp-1 mt-0.5 group-hover:text-blue-600 transition-colors">
            {game.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-1 mt-1">
            {game.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          {isComingSoon ? (
            <span className="text-amber-600 font-medium">Coming Soon</span>
          ) : (
            <>
              <span>{formatPlayCount(game.play_count)}</span>
              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                <StarRating
                  gameId={game.id}
                  gameTitle={game.title}
                  gameCategory={game.category}
                  thumbnailUrl={game.thumbnail_url}
                  rating={game.rating || 5.0}
                  ratingCount={game.rating_count || 0}
                  userRating={userRating}
                  size="xs"
                  showCount={false}
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
