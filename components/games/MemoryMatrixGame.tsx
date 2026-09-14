'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Sparkles, Timer, Zap, Trophy, Brain } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MemoryMatrixGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

interface Card {
  id: number;
  symbol: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ICONS = [
  { symbol: '⚡', color: 'bg-portal-yellow' },
  { symbol: '🔥', color: 'bg-portal-pink' },
  { symbol: '💎', color: 'bg-portal-cyan' },
  { symbol: '🛸', color: 'bg-portal-green' },
  { symbol: '👑', color: 'bg-portal-butter' },
  { symbol: '👾', color: 'bg-portal-pink' },
];

export default function MemoryMatrixGame({ gameId, onGameOver }: MemoryMatrixGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [streak, setStreak] = useState(0);

  const initGame = useCallback(() => {
    const deck: Card[] = [];
    let idCounter = 0;

    ICONS.forEach((item) => {
      deck.push({ id: idCounter++, symbol: item.symbol, color: item.color, isFlipped: false, isMatched: false });
      deck.push({ id: idCounter++, symbol: item.symbol, color: item.color, isFlipped: false, isMatched: false });
    });

    // Shuffle
    const shuffled = deck.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedIndices([]);
    setScore(0);
    setStreak(0);
    setTimeLeft(45);
    setIsFinished(false);
    setIsPlaying(true);
  }, []);

  // Timer
  useEffect(() => {
    if (!isPlaying || isFinished) return;
    if (timeLeft <= 0) {
      setIsFinished(true);
      setIsPlaying(false);
      setTimeout(() => onGameOver(score), 0);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isFinished, timeLeft, score, onGameOver]);

  // Card click handler
  const handleCardClick = (index: number) => {
    if (!isPlaying || isFinished || flippedIndices.length >= 2 || cards[index].isFlipped || cards[index].isMatched) {
      return;
    }

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const [idx1, idx2] = newFlipped;
      const card1 = newCards[idx1];
      const card2 = newCards[idx2];

      if (card1.symbol === card2.symbol) {
        // MATCH!
        setTimeout(() => {
          setCards(prev => {
            const updated = [...prev];
            updated[idx1].isMatched = true;
            updated[idx2].isMatched = true;
            return updated;
          });
          const comboBonus = (streak + 1) * 250;
          const timeBonus = timeLeft * 10;
          const added = comboBonus + timeBonus;
          setScore(s => s + added);
          setStreak(s => s + 1);
          setFlippedIndices([]);

          // Check if all matched
          const allMatched = newCards.every((c, i) => (i === idx1 || i === idx2) ? true : c.isMatched);
          if (allMatched) {
            const final = score + added + 1000;
            setScore(final);
            setIsFinished(true);
            setIsPlaying(false);
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
            setTimeout(() => onGameOver(final), 0);
          }
        }, 300);
      } else {
        // MISMATCH
        setStreak(0);
        setTimeout(() => {
          setCards(prev => {
            const updated = [...prev];
            updated[idx1].isFlipped = false;
            updated[idx2].isFlipped = false;
            return updated;
          });
          setFlippedIndices([]);
        }, 700);
      }
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        <div className="flex items-center gap-1.5 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Timer className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className={`text-xs font-black ${timeLeft < 10 ? 'text-rose-600 animate-pulse' : 'text-black'}`}>
            {timeLeft}s
          </span>
        </div>

        {streak > 1 ? (
          <div className="px-2.5 py-1 rounded-lg bg-portal-pink border-2 border-black text-black text-[10px] font-black shadow-neo-xs animate-bounce">
            🔥 {streak}X COMBO
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded-lg bg-white border-2 border-black text-slate-700 text-[10px] font-black shadow-neo-xs">
            6 PAIRS
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-portal-cyan px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Trophy className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-xs font-black text-black">{score}</span>
        </div>
      </div>

      {/* Grid Canvas Container (9:16 Standard Aspect Ratio Frame) with Figma Handles */}
      <div className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl border-4 border-black p-4 overflow-hidden shadow-neo-lg flex flex-col items-center justify-between">
        {/* Figma Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        {/* Status prompt */}
        <div className="w-full text-center py-1 z-10">
          {isPlaying && (
            <span className="text-[10px] font-black tracking-wider uppercase text-black bg-white border-2 border-black px-3 py-1 rounded-full shadow-neo-xs">
              ✦ FIND 6 MATCHING PAIRS ✦
            </span>
          )}
        </div>

        {!isPlaying ? (
          /* Pre-Game & Game-Over Neo-Brutalist Card */
          <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-4 my-auto text-center z-10 animate-scaleIn text-black">
            {/* Figma Handles */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
              <Brain className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-yellow border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                {isFinished ? '⚡ PUZZLE OVER ⚡' : '• [ BRAIN MATRIX ] •'}
              </div>
              <h3 className="text-xl font-black text-black tracking-tight uppercase">
                Memory Matrix
              </h3>
              <p className="text-[11px] font-bold text-slate-700 mt-1">
                {isFinished
                  ? `Completed with ${score} points! Can you do it faster?`
                  : 'Flip and match all 6 pairs of neural cards before time runs out!'}
              </p>
            </div>

            <button
              type="button"
              onClick={initGame}
              className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isFinished ? (
                <>
                  <RotateCcw className="w-4 h-4 stroke-[3]" /> RETRY PUZZLE
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" /> START GAME
                </>
              )}
            </button>
          </div>
        ) : (
          /* Active Neo-Brutalist 3x4 Card Matrix */
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[320px] aspect-[3/4] my-auto p-3 bg-white rounded-2xl border-3 border-black shadow-neo">
            {cards.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(idx)}
                className={`relative rounded-xl flex items-center justify-center text-3xl transition-all duration-200 border-3 border-black ${
                  card.isMatched
                    ? 'bg-portal-green/60 opacity-50 scale-95 shadow-none border-dashed'
                    : card.isFlipped
                    ? `${card.color} shadow-neo scale-105`
                    : 'bg-slate-50 shadow-neo-xs hover:bg-portal-butter active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
                }`}
              >
                {card.isFlipped || card.isMatched ? (
                  <span className="animate-scaleIn drop-shadow-sm">{card.symbol}</span>
                ) : (
                  <span className="text-xs font-black text-slate-400">✦</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Bottom hint */}
        <div className="w-full text-center py-1 z-10">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-wider bg-white/80 border border-black/30 px-2 py-0.5 rounded inline-block">
            • 100% RETRO NEURAL MATRIX •
          </p>
        </div>
      </div>
    </div>
  );
}
