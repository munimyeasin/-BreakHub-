'use client';

import React from 'react';
import GameCard from './GameCard';
import { Game } from '@/lib/types';
import { Gamepad2, Heart } from 'lucide-react';

interface GameGridProps {
  games: Game[];
  favorites: string[];
  hypedGames?: string[];
  userRatings?: Record<string, number>;
  isFavoritesTab?: boolean;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onToggleHype?: (gameId: string, e: React.MouseEvent) => void;
  onRateGame?: (gameId: string, rating: number) => Promise<void> | void;
  onPlayGame: (game: Game) => void;
  onViewLeaderboard: (gameId: string, e: React.MouseEvent) => void;
  onResetFilters?: () => void;
}

export default function GameGrid({
  games,
  favorites,
  hypedGames = [],
  userRatings = {},
  isFavoritesTab = false,
  onToggleFavorite,
  onToggleHype,
  onRateGame,
  onPlayGame,
  onViewLeaderboard,
  onResetFilters
}: GameGridProps) {
  if (games.length === 0) {
    if (isFavoritesTab) {
      return (
        <div className="text-center py-16 bg-portal-surface/40 rounded-3xl border border-portal-border px-4">
          <Heart className="w-12 h-12 text-rose-500/50 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No favorite games saved yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click the heart icon on any game card to add it to your personal favorites collection!
          </p>
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="mt-4 px-5 py-2 rounded-xl bg-portal-cyan text-black text-xs font-bold shadow-glow-cyan hover:brightness-110 transition-all"
            >
              Browse All Games
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-16 bg-portal-surface/40 rounded-3xl border border-portal-border px-4">
        <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-300">No games match your search</h3>
        <p className="text-xs text-slate-500 mt-1">Try searching for a different keyword or reset your filters.</p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-portal-surface border border-portal-border text-xs text-portal-cyan font-bold hover:border-portal-cyan transition-all"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3.5 md:gap-4">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          isFavorite={favorites.includes(game.id)}
          isHyped={hypedGames.includes(game.id)}
          userRating={userRatings[game.id] || userRatings[game.slug] || null}
          onToggleFavorite={onToggleFavorite}
          onToggleHype={onToggleHype}
          onRateGame={onRateGame}
          onPlay={onPlayGame}
          onViewLeaderboard={onViewLeaderboard}
        />
      ))}
    </div>
  );
}
