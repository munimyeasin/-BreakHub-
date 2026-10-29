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
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6 max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mx-auto mb-3 text-rose-500">
            <Heart className="w-6 h-6 fill-rose-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No favorite games saved yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Click the heart icon on any game card to add it to your favorites.
          </p>
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
            >
              Browse All Games
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6 max-w-md mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
          <Gamepad2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">No games found</h3>
        <p className="text-xs text-slate-500 mt-1">Try searching for a different keyword or category.</p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
