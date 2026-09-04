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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-portal-bg to-slate-950 border border-portal-cyan/50 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col items-center p-6 text-center">

        {/* Modal Top Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-portal-card text-slate-400 hover:text-white border border-portal-border hover:border-portal-cyan transition-all active:scale-95"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-black shadow-glow-cyan mb-3">
          <Dices className={`w-7 h-7 text-white ${isSpinning ? 'animate-spin' : ''}`} />
        </div>

        <h3 className="font-black text-lg sm:text-xl text-white tracking-wide">
          NEURAL GAME ROULETTE
        </h3>
        <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
          Eliminate decision fatigue. Let the cyber oracle choose your next stress-busting challenge!
        </p>

        {/* Game Preview Card */}
        {displayGame && (
          <div className="w-full my-5 p-4 rounded-2xl bg-portal-card/90 border border-portal-border relative overflow-hidden flex flex-col items-center">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-portal-surface/90 via-transparent to-transparent pointer-events-none" />

            {/* Thumbnail Container */}
            <div className="relative w-full h-36 rounded-xl overflow-hidden border border-portal-border mb-3">
              <Image
                src={displayGame.thumbnail_url}
                alt={displayGame.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-portal-cyan/20 text-portal-cyan border border-portal-cyan/40">
                {displayGame.category}
              </span>
            </div>

            {/* Title & Details */}
            <h4 className="text-base font-black text-white leading-tight">
              {displayGame.title}
            </h4>
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 px-2">
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-portal-cyan via-teal-400 to-portal-neon text-black font-black text-sm tracking-wide shadow-glow-cyan hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 animate-bounce"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>LAUNCH {selectedGame.title.toUpperCase()}</span>
            </button>
          ) : (
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className={`w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 text-white font-black text-sm tracking-wide shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${
                isSpinning ? 'opacity-80 cursor-not-allowed' : ''
              }`}
            >
              <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'SCANNING ARCADE VAULT...' : 'SPIN ROULETTE'}</span>
            </button>
          )}

          {selectedGame && (
            <button
              onClick={handleSpin}
              className="w-full py-2 rounded-xl bg-portal-surface/60 border border-portal-border hover:border-purple-400 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>Reroll / Spin Again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
