'use client';

import React, { useState, useEffect } from 'react';
import { X, Dices, Sparkles, Play, Flame, Trophy, Shuffle } from 'lucide-react';
import Image from 'next/image';
import { audio } from '@/lib/audio';
import { Game } from '@/lib/types';
import { gamification } from '@/lib/gamification';

interface GameRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onSelectGame: (game: Game) => void;
}

export default function GameRouletteModal({
  isOpen,
  onClose,
  games,
  onSelectGame,
}: GameRouletteModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [previewGame, setPreviewGame] = useState<Game | null>(null);

  // Active playable games
  const playableGames = games.filter(g => g.status === 'active');

  useEffect(() => {
    if (isOpen && playableGames.length > 0) {
      // Pick initial preview game
      const randomInitial = playableGames[Math.floor(Math.random() * playableGames.length)];
      setPreviewGame(randomInitial);
      setSelectedGame(null);
      setIsSpinning(false);
    }
  }, [isOpen]);

  const handleSpin = () => {
    if (isSpinning || playableGames.length === 0) return;

    setIsSpinning(true);
    setSelectedGame(null);

    let counter = 0;
    const totalSpins = 25;
    let delay = 50;

    const spinStep = () => {
      const randomGame = playableGames[Math.floor(Math.random() * playableGames.length)];
      setPreviewGame(randomGame);
      audio.playRouletteTickSound();

      counter++;
      if (counter < totalSpins) {
        delay = Math.floor(50 + (counter / totalSpins) * 180);
        setTimeout(spinStep, delay);
      } else {
        // Finished spin
        audio.playRouletteLockSound();
        setSelectedGame(randomGame);
        setIsSpinning(false);
        try {
          gamification.recordRouletteSpin();
        } catch {}
      }
    };

    spinStep();
  };

  if (!isOpen) return null;

  const displayGame = selectedGame || previewGame || playableGames[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-portal-surface border-4 border-black rounded-2xl sm:rounded-3xl shadow-neo-lg overflow-hidden flex flex-col items-center p-6 text-center">

        {/* Top Decorative Color Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-cyan via-portal-yellow to-portal-pink border-b-2 border-black" />

        {/* Modal Top Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-portal-card hover:bg-portal-pink text-white hover:text-black border-2 border-black shadow-neo-sm font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5"
          aria-label="Close modal"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-portal-yellow border-3 border-black flex items-center justify-center text-black shadow-neo mt-2 mb-3">
          <Dices className={`w-7 h-7 stroke-[2.5] ${isSpinning ? 'animate-spin' : ''}`} />
        </div>

        <h3 className="font-black text-lg sm:text-xl text-white tracking-tight uppercase">
          GAME ROULETTE
        </h3>
        <p className="text-xs text-slate-300 font-bold max-w-xs mt-1">
          Eliminate decision fatigue. Let the oracle choose your next stress-busting challenge!
        </p>

        {/* Game Preview Card */}
        {displayGame && (
          <div className="w-full my-4 p-3.5 rounded-2xl bg-portal-card border-3 border-black shadow-neo relative overflow-hidden flex flex-col items-center">
            {/* Thumbnail Container */}
            <div className="game-thumbnail-container relative w-full h-36 rounded-xl overflow-hidden border-2 border-black mb-3">
              <Image
                src={displayGame.thumbnail_url}
                alt={`${displayGame.title} - ${displayGame.category} arcade game artwork preview`}
                fill
                className="game-thumbnail-img object-cover"
              />
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-portal-pink text-white border-2 border-black shadow-neo-sm">
                {displayGame.category}
              </span>
            </div>

            {/* Title & Details */}
            <h4 className="text-base font-black text-white uppercase leading-tight">
              {displayGame.title}
            </h4>
            <p className="text-[11px] text-slate-300 font-bold line-clamp-2 mt-1 px-2">
              {displayGame.description}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="w-full space-y-2.5">
          {selectedGame ? (
            <button
              onClick={() => {
                onClose();
                onSelectGame(selectedGame);
              }}
              className="w-full py-3 rounded-xl bg-portal-lime text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black stroke-[2.5]" />
              <span>LAUNCH {selectedGame.title.toUpperCase()}</span>
            </button>
          ) : (
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className={`w-full py-3 rounded-xl bg-portal-cyan text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 ${
                isSpinning ? 'opacity-80 cursor-not-allowed' : ''
              }`}
            >
              <Shuffle className={`w-4 h-4 stroke-[2.5] ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'SCANNING VAULT...' : 'SPIN ROULETTE'}</span>
            </button>
          )}

          {selectedGame && (
            <button
              onClick={handleSpin}
              className="w-full py-2.5 rounded-xl bg-portal-card hover:bg-portal-yellow hover:text-black border-2 border-black shadow-neo-sm text-white text-xs font-black uppercase transition-all hover:translate-x-0.5 hover:translate-y-0.5 flex items-center justify-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Reroll / Spin Again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
