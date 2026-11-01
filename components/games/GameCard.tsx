'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { Game } from '@/lib/types';

interface GameCardProps {
  game: Game;
  isFavorite: boolean;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onPlay: (game: Game) => void;
}

export default function GameCard({
  game,
  isFavorite,
  onToggleFavorite,
  onPlay
}: GameCardProps) {
  return (
    <div
      onClick={() => onPlay(game)}
      className="relative flex flex-col bg-[#281E3B] rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
    >
      {/* Square Image Container */}
      <div className="relative aspect-square w-full overflow-hidden">
        <img
          src={game.thumbnail_url}
          alt={game.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Favorite Heart Badge - Top Right */}
        {isFavorite && (
          <div className="absolute top-2 right-2 z-10">
            <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
          </div>
        )}
      </div>

      {/* Bottom Metadata Section */}
      <div className="p-3">
        <h3 className="font-bold text-white text-sm uppercase tracking-wide line-clamp-1 mb-1">
          {game.title}
        </h3>
        <p className="text-gray-400 text-xs uppercase tracking-wider">
          {game.category}
        </p>
      </div>
    </div>
  );
}
