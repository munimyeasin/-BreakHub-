'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Sparkles, Timer, Zap, Trophy } from 'lucide-react';
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
  { symbol: '⚡', color: '#00F0FF' },
  { symbol: '🔥', color: '#FF0055' },
  { symbol: '💎', color: '#9D00FF' },
  { symbol: '🛸', color: '#00FF66' },
  { symbol: '👑', color: '#FFD700' },
  { symbol: '👾', color: '#FF00EA' },
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
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center">
      {/* HUD - Ultra Slim */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
          <Timer className="w-3.5 h-3.5 text-portal-cyan" />
          <span className={`text-sm font-black ${timeLeft < 10 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
            {timeLeft}s
          </span>
        </div>

        {streak > 1 && (
          <div className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black animate-pulse">
            🔥 {streak}x MATCH
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
          <Trophy className="w-3.5 h-3.5 text-portal-gold" />
          <span className="text-sm font-black text-portal-cyan">{score}</span>
        </div>
      </div>

      {/* Grid Canvas Container (9:16 Standard Aspect Ratio Frame) */}
      <div className="relative w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] bg-portal-bg rounded-2xl border-2 border-portal-border p-3 overflow-hidden shadow-2xl flex flex-col items-center justify-between shrink-0">
        {/* Status prompt */}
        <div className="w-full text-center py-1">
          {isPlaying && (
            <span className="text-[11px] font-black tracking-wider uppercase text-portal-cyan bg-portal-surface/80 border border-portal-border px-3 py-1 rounded-full">
              Find 6 Matching Pairs
            </span>
          )}
        </div>

        {!isPlaying ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-glow-purple">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Memory Matrix</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">Match matching neural tiles before the clock expires.</p>
            </div>
            <button
              onClick={initGame}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-black" /> {isFinished ? 'PLAY AGAIN' : 'START GAME'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[320px] aspect-[3/4] my-auto">
            {cards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(idx)}
                className={`relative rounded-xl flex items-center justify-center text-3xl transition-all duration-300 transform perspective-1000 border ${
                  card.isMatched
                    ? 'bg-emerald-500/10 border-emerald-500/40 opacity-40 scale-95'
                    : card.isFlipped
                    ? 'bg-portal-card border-portal-cyan shadow-glow-cyan rotate-y-180 scale-105'
                    : 'bg-portal-surface border-portal-border hover:border-slate-500 active:scale-95'
                }`}
              >
                {card.isFlipped || card.isMatched ? (
                  <span className="animate-scaleIn">{card.symbol}</span>
                ) : (
                  <span className="text-xs font-black text-slate-600">❖</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Bottom hint */}
        <div className="w-full text-center py-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Neural Pattern Memory Matrix
          </p>
        </div>
      </div>
    </div>
  );
}
