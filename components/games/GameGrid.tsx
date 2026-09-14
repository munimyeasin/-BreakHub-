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
        <div className="text-center py-16 bg-white rounded-3xl border-3 sm:border-4 border-black p-6 shadow-neo-lg max-w-lg mx-auto select-none">
          <div className="w-16 h-16 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mx-auto mb-4 shadow-neo-sm">
            <Heart className="w-8 h-8 fill-black text-black stroke-[2.5]" />
          </div>
          <h3 className="text-lg font-black text-black uppercase tracking-tight">No favorite games saved yet</h3>
          <p className="text-xs text-slate-700 font-bold mt-1.5 max-w-sm mx-auto leading-relaxed">
            Click the heart icon on any game card to add it to your personal favorites collection!
          </p>
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="mt-5 px-6 py-2.5 rounded-xl bg-portal-cyan text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              Browse All Games
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-16 bg-white rounded-3xl border-3 sm:border-4 border-black p-6 shadow-neo-lg max-w-lg mx-auto select-none">
        <div className="w-16 h-16 rounded-2xl bg-portal-yellow border-3 border-black flex items-center justify-center mx-auto mb-4 shadow-neo-sm">
          <Gamepad2 className="w-8 h-8 text-black stroke-[2.5]" />
        </div>
        <h3 className="text-lg font-black text-black uppercase tracking-tight">No games match your search</h3>
        <p className="text-xs text-slate-700 font-bold mt-1.5 leading-relaxed">Try searching for a different keyword or reset your genre filters.</p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="mt-5 px-6 py-2.5 rounded-xl bg-portal-pink text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
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
