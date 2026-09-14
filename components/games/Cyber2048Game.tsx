'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Grid3X3, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';

interface Cyber2048GameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type Board = number[][];

const TILE_STYLES: Record<number, { bg: string; text: string; shadow?: string }> = {
  2: { bg: 'bg-white', text: 'text-black', shadow: 'shadow-neo-xs' },
  4: { bg: 'bg-portal-cyan', text: 'text-black', shadow: 'shadow-neo-xs' },
  8: { bg: 'bg-portal-yellow', text: 'text-black', shadow: 'shadow-neo-xs' },
  16: { bg: 'bg-portal-pink', text: 'text-black', shadow: 'shadow-neo-sm' },
  32: { bg: 'bg-portal-green', text: 'text-black', shadow: 'shadow-neo-sm' },
  64: { bg: 'bg-portal-butter', text: 'text-black', shadow: 'shadow-neo-sm' },
  128: { bg: 'bg-portal-pink', text: 'text-black', shadow: 'shadow-neo' },
  256: { bg: 'bg-portal-cyan', text: 'text-black', shadow: 'shadow-neo' },
  512: { bg: 'bg-portal-yellow', text: 'text-black', shadow: 'shadow-neo' },
  1024: { bg: 'bg-portal-green', text: 'text-black', shadow: 'shadow-neo-lg' },
  2048: { bg: 'bg-gradient-to-tr from-portal-pink via-portal-yellow to-portal-cyan', text: 'text-black', shadow: 'shadow-neo-lg' },
};

export default function Cyber2048Game({ gameId, onGameOver }: Cyber2048GameProps) {
  const [board, setBoard] = useState<Board>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);
  const [highTile, setHighTile] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const playSfx = useCallback((type: 'merge' | 'move' | 'over') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'merge') {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'move') {
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {}
  }, [soundEnabled]);

  const addRandomTile = (currentBoard: Board): Board => {
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return currentBoard;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    const newBoard = currentBoard.map(row => [...row]);
    newBoard[r][c] = Math.random() < 0.85 ? 2 : 4;
    return newBoard;
  };

  const startGame = () => {
    let fresh: Board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    fresh = addRandomTile(fresh);
    fresh = addRandomTile(fresh);
    setBoard(fresh);
    setScore(0);
    setHighTile(4);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  const slideRow = (row: number[]): { newRow: number[]; addedScore: number } => {
    const nonZero = row.filter(val => val !== 0);
    const newRow: number[] = [];
    let addedScore = 0;

    for (let i = 0; i < nonZero.length; i++) {
      if (nonZero[i] === nonZero[i + 1]) {
        const merged = nonZero[i] * 2;
        newRow.push(merged);
        addedScore += merged;
        i++;
      } else {
        newRow.push(nonZero[i]);
      }
    }

    while (newRow.length < 4) {
      newRow.push(0);
    }
    return { newRow, addedScore };
  };

  const move = useCallback((direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    if (!isPlaying || isGameOver) return;

    let newBoard: Board = board.map(row => [...row]);
    let pointsGained = 0;
    let moved = false;

    if (direction === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const { newRow, addedScore } = slideRow(newBoard[r]);
        if (newRow.some((val, idx) => val !== newBoard[r][idx])) moved = true;
        newBoard[r] = newRow;
        pointsGained += addedScore;
      }
    } else if (direction === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const reversed = [...newBoard[r]].reverse();
        const { newRow, addedScore } = slideRow(reversed);
        const originalDir = newRow.reverse();
        if (originalDir.some((val, idx) => val !== newBoard[r][idx])) moved = true;
        newBoard[r] = originalDir;
        pointsGained += addedScore;
      }
    } else if (direction === 'UP') {
      for (let c = 0; c < 4; c++) {
        const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
        const { newRow, addedScore } = slideRow(col);
        for (let r = 0; r < 4; r++) {
          if (newBoard[r][c] !== newRow[r]) moved = true;
          newBoard[r][c] = newRow[r];
        }
        pointsGained += addedScore;
      }
    } else if (direction === 'DOWN') {
      for (let c = 0; c < 4; c++) {
        const col = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
        const { newRow, addedScore } = slideRow(col);
        const reversed = newRow.reverse();
        for (let r = 0; r < 4; r++) {
          if (newBoard[r][c] !== reversed[r]) moved = true;
          newBoard[r][c] = reversed[r];
        }
        pointsGained += addedScore;
      }
    }

    if (moved) {
      if (pointsGained > 0) playSfx('merge');
      else playSfx('move');

      const nextBoard = addRandomTile(newBoard);
      setBoard(nextBoard);
      const newScore = score + pointsGained;
      setScore(newScore);

      // Check max tile
      let maxVal = 0;
      nextBoard.forEach(row => row.forEach(v => { if (v > maxVal) maxVal = v; }));
      setHighTile(maxVal);

      if (maxVal >= 2048) {
        confetti({ particleCount: 100, spread: 80 });
      }

      // Check Game Over
      let canMove = false;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (nextBoard[r][c] === 0) canMove = true;
          if (r < 3 && nextBoard[r][c] === nextBoard[r + 1][c]) canMove = true;
          if (c < 3 && nextBoard[r][c] === nextBoard[r][c + 1]) canMove = true;
        }
      }

      if (!canMove) {
        setIsGameOver(true);
        setIsPlaying(false);
        setTimeout(() => onGameOver(newScore), 0);
      }
    }
  }, [board, score, isPlaying, isGameOver, onGameOver, playSfx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault(); move('LEFT'); }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { e.preventDefault(); move('RIGHT'); }
      if (['ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); move('UP'); }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { e.preventDefault(); move('DOWN'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 25) move('RIGHT');
      else if (dx < -25) move('LEFT');
    } else {
      if (dy > 25) move('DOWN');
      else if (dy < -25) move('UP');
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        <div className="flex items-center gap-1.5 bg-portal-cyan px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs">
          <Grid3X3 className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] text-black font-black uppercase tracking-wider">Score</span>
          <span className="text-xs sm:text-sm font-black text-black">{score}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs">
          <Trophy className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] text-black font-black uppercase tracking-wider">Max</span>
          <span className="text-xs sm:text-sm font-black text-black">{highTile || 0}</span>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
          title="Toggle Sound"
          aria-label="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />}
        </button>
      </div>

      {/* Grid Canvas Screen (9:16 Standard Aspect Ratio Frame) with Figma Handles */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl border-4 border-black p-4 shadow-neo-lg flex flex-col items-center justify-between touch-none overflow-hidden"
      >
        {/* Figma Selection Frame Transform Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        {/* Status Prompt */}
        <div className="w-full text-center py-1 z-10">
          {isPlaying && (
            <span className="text-[10px] font-black tracking-wider uppercase text-black bg-white border-2 border-black px-3 py-1 rounded-full shadow-neo-xs">
              ✦ SWIPE OR USE CONTROLS TO MERGE ✦
            </span>
          )}
        </div>

        {!isPlaying ? (
          /* Pre-Game Start Neo-Brutalist Card */
          <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-4 my-auto text-center z-10 animate-scaleIn text-black">
            {/* Figma Handles */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-portal-cyan border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
              <Grid3X3 className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-yellow border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                • [ NUMBER FUSION ] •
              </div>
              <h3 className="text-xl font-black text-black tracking-tight uppercase">
                Cyber 2048
              </h3>
              <p className="text-[11px] font-bold text-slate-700 mt-1">
                Slide matching tiles to fuse them into 2048 and beyond!
              </p>
            </div>

            <button
              onClick={startGame}
              className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black stroke-[2.5]" />
              <span>START FUSION</span>
            </button>
          </div>
        ) : (
          /* Active Neo-Brutalist 4x4 Grid */
          <div className="grid grid-cols-4 gap-2.5 w-full max-w-[320px] aspect-square my-auto p-3 bg-white rounded-2xl border-3 border-black shadow-neo">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const style = TILE_STYLES[cell] || { bg: 'bg-slate-100', text: 'text-slate-400', shadow: '' };
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`rounded-xl border-2 border-black flex items-center justify-center font-black text-base sm:text-lg transition-all duration-150 select-none ${
                      cell > 0 ? `${style.bg} ${style.text} ${style.shadow}` : 'bg-slate-100/70 border-dashed border-black/20 text-transparent'
                    }`}
                  >
                    {cell > 0 ? cell : ''}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Bottom Tag */}
        <div className="w-full text-center py-1 z-10">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-wider bg-white/80 border border-black/30 px-2 py-0.5 rounded inline-block">
            • 100% RETRO PUZZLE •
          </p>
        </div>

        {/* Game Over Neo-Brutalist Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div className="inline-block px-3 py-1 rounded-md bg-portal-pink border-2 border-black text-black text-[11px] font-black uppercase tracking-wider shadow-neo-xs">
                ⚡ NO MORE MOVES ⚡
              </div>

              <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Final Score</div>
                <div className="text-3xl font-black text-black tracking-tight">{score}</div>
              </div>

              <button
                onClick={startGame}
                className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[3]" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Switchable Joystick / Arrow D-Pad (Mobile / Touch) */}
      <div className="mt-3 flex justify-center w-full sm:hidden">
        <MobileGamepad
          mode="4way"
          onDirectionChange={(dir) => move(dir as any)}
          label="SLIDE"
        />
      </div>
    </div>
  );
}
