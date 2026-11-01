'use client';

import React from 'react';
import GameCard from './GameCard';
import { Game } from '@/lib/types';

interface GameGridProps {
  games: Game[];
  favorites: string[];
  hypedGames?: string[];
  isFavoritesTab?: boolean;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onToggleHype?: (gameId: string, e?: React.MouseEvent) => void;
  onPlayGame: (game: Game) => void;
  onViewLeaderboard?: (gameId: string, e: React.MouseEvent) => void;
  onResetFilters?: () => void;
}

export default function GameGrid({
  games,
  favorites,
  onToggleFavorite,
  onPlayGame,
}: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-gray-400 text-sm mb-2">No games found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          isFavorite={favorites.includes(game.id)}
          onToggleFavorite={onToggleFavorite}
          onPlay={onPlayGame}
        />
      ))}
    </div>
  );
}
