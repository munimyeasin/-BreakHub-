'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Grid3X3 } from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';

interface Cyber2048GameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type Board = number[][];

const TILE_COLORS: Record<number, { bg: string; text: string; glow?: string }> = {
  2: { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-200' },
  4: { bg: 'bg-cyan-950 border-cyan-700/60', text: 'text-portal-cyan' },
  8: { bg: 'bg-blue-950 border-blue-600', text: 'text-blue-300' },
  16: { bg: 'bg-indigo-950 border-indigo-500', text: 'text-indigo-300' },
  32: { bg: 'bg-purple-950 border-purple-500', text: 'text-purple-300', glow: 'shadow-glow-purple' },
  64: { bg: 'bg-fuchsia-950 border-fuchsia-500', text: 'text-fuchsia-300', glow: 'shadow-glow-purple' },
  128: { bg: 'bg-rose-950 border-rose-500', text: 'text-rose-300', glow: 'shadow-glow-purple' },
  256: { bg: 'bg-amber-950 border-amber-500', text: 'text-amber-300', glow: 'shadow-glow-gold' },
  512: { bg: 'bg-yellow-950 border-yellow-400', text: 'text-yellow-300', glow: 'shadow-glow-gold' },
  1024: { bg: 'bg-emerald-950 border-emerald-400', text: 'text-emerald-300', glow: 'shadow-glow-cyan' },
  2048: { bg: 'bg-gradient-to-tr from-portal-neon to-portal-cyan border-white', text: 'text-black', glow: 'shadow-glow-gold' },
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
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center">
      {/* HUD - Ultra Slim */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md shrink-0">
        <div className="flex items-center gap-1.5">
          <Grid3X3 className="w-3.5 h-3.5 text-portal-cyan" />
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Score</span>
          <span className="text-sm font-black text-portal-gold">{score}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Max Tile</span>
          <span className="text-sm font-black text-portal-cyan">{highTile || 0}</span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60"
        >
          {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </div>

      {/* Grid Canvas Screen (9:16 Standard Aspect Ratio Frame) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-2xl overflow-hidden border-2 border-portal-border shadow-2xl bg-portal-bg touch-none cursor-default w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] flex flex-col items-center justify-between p-4 shrink-0"
      >
        {/* Status prompt */}
        <div className="w-full text-center py-1">
          {isPlaying && (
            <span className="text-[11px] font-black tracking-wider uppercase text-portal-cyan bg-portal-surface/80 border border-portal-border px-3 py-1 rounded-full">
              Swipe or use keys to merge
            </span>
          )}
        </div>

        {!isPlaying ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-portal-cyan shadow-glow-cyan">
              <Grid3X3 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Quantum 2048</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">Slide or flick with keys/controls to merge retro energy tiles to 2048.</p>
            </div>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-black" /> START MERGE
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 w-full max-w-[340px] aspect-square my-auto p-2 bg-portal-surface/40 rounded-2xl border border-portal-border/50">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const style = TILE_COLORS[cell] || { bg: 'bg-portal-surface border-portal-border/40', text: 'text-slate-600' };
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`rounded-xl border flex items-center justify-center font-black text-base sm:text-lg transition-all duration-150 ${style.bg} ${style.text} ${style.glow || ''}`}
                  >
                    {cell > 0 ? cell : ''}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Bottom hint */}
        <div className="w-full text-center py-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Quantum Number Fusion
          </p>
        </div>

        {isGameOver && (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-3 animate-scaleIn">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase">
              No More Moves
            </span>
            <h3 className="text-2xl font-black text-white">Final Score: {score}</h3>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-portal-cyan text-black font-black text-xs shadow-glow-cyan active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* Switchable Joystick / Arrow D-Pad (Mobile / Touch) */}
      <div className="mt-2.5 flex justify-center w-full sm:hidden">
        <MobileGamepad
          mode="4way"
          onDirectionChange={(dir) => move(dir as any)}
          label="SLIDE"
        />
      </div>
    </div>
  );
}
