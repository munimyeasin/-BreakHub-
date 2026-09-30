'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Grid3X3, Undo2, Trophy, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';

interface Cyber2048GameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type Board = number[][];

interface HistoryState {
  board: Board;
  score: number;
  highTile: number;
}

const TILE_CONFIG: Record<number, { bg: string; text: string; border: string; glow?: string; scale?: string }> = {
  2: { bg: 'bg-slate-900/90', text: 'text-slate-200', border: 'border-slate-700/60' },
  4: { bg: 'bg-cyan-950/90', text: 'text-cyan-300', border: 'border-cyan-700/60', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.2)]' },
  8: { bg: 'bg-blue-950/90', text: 'text-blue-300', border: 'border-blue-600/70', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]' },
  16: { bg: 'bg-indigo-950/90', text: 'text-indigo-300', border: 'border-indigo-500/80', glow: 'shadow-[0_0_14px_rgba(99,102,241,0.35)]' },
  32: { bg: 'bg-purple-950/90', text: 'text-purple-300', border: 'border-purple-500', glow: 'shadow-[0_0_16px_rgba(168,85,247,0.4)]' },
  64: { bg: 'bg-fuchsia-950/90', text: 'text-fuchsia-200', border: 'border-fuchsia-500', glow: 'shadow-[0_0_18px_rgba(217,70,239,0.45)]' },
  128: { bg: 'bg-rose-950/90', text: 'text-rose-200', border: 'border-rose-500', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.5)]' },
  256: { bg: 'bg-amber-950/90', text: 'text-amber-200', border: 'border-amber-500', glow: 'shadow-[0_0_22px_rgba(245,158,11,0.55)]' },
  512: { bg: 'bg-yellow-950/95', text: 'text-yellow-200', border: 'border-yellow-400', glow: 'shadow-[0_0_24px_rgba(234,179,8,0.6)]' },
  1024: { bg: 'bg-emerald-950/95', text: 'text-emerald-200', border: 'border-emerald-400', glow: 'shadow-[0_0_26px_rgba(16,185,129,0.7)]' },
  2048: { bg: 'bg-gradient-to-tr from-cyan-500 via-yellow-400 to-amber-500', text: 'text-black font-black', border: 'border-white', glow: 'shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-pulse' },
  4096: { bg: 'bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500', text: 'text-white font-black', border: 'border-white', glow: 'shadow-[0_0_35px_rgba(244,63,94,0.95)]' },
  8192: { bg: 'bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-700', text: 'text-white font-black', border: 'border-cyan-300', glow: 'shadow-[0_0_40px_rgba(6,182,212,1)]' },
};

export default function Cyber2048Game({ gameId, onGameOver }: Cyber2048GameProps) {
  const [board, setBoard] = useState<Board>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [highTile, setHighTile] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon2048, setHasWon2048] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scorePointsGained, setScorePointsGained] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [lastMergedTiles, setLastMergedTiles] = useState<{ r: number; c: number }[]>([]);

  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Load best score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cyber2048_best_score');
      if (saved) setBestScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  const playSfx = useCallback((type: 'merge' | 'move' | 'over' | 'win' | 'undo') => {
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
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(260, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.04);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'win') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'undo') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'over') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
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
    newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
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
    setHasWon2048(false);
    setKeepPlaying(false);
    setHistory([]);
    setLastMergedTiles([]);
    setIsPlaying(true);
  };

  const handleUndo = () => {
    if (history.length === 0 || !isPlaying || isGameOver) return;
    const lastState = history[history.length - 1];
    setBoard(lastState.board);
    setScore(lastState.score);
    setHighTile(lastState.highTile);
    setHistory(prev => prev.slice(0, -1));
    playSfx('undo');
  };

  const slideRow = (row: number[]): { newRow: number[]; addedScore: number; mergedIndices: number[] } => {
    const nonZero = row.filter(val => val !== 0);
    const newRow: number[] = [];
    const mergedIndices: number[] = [];
    let addedScore = 0;

    for (let i = 0; i < nonZero.length; i++) {
      if (nonZero[i] === nonZero[i + 1]) {
        const merged = nonZero[i] * 2;
        mergedIndices.push(newRow.length);
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
    return { newRow, addedScore, mergedIndices };
  };

  const move = useCallback((direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    if (!isPlaying || isGameOver || (hasWon2048 && !keepPlaying)) return;

    let newBoard: Board = board.map(row => [...row]);
    let pointsGained = 0;
    let moved = false;
    const newlyMerged: { r: number; c: number }[] = [];

    if (direction === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const { newRow, addedScore, mergedIndices } = slideRow(newBoard[r]);
        if (newRow.some((val, idx) => val !== newBoard[r][idx])) moved = true;
        newBoard[r] = newRow;
        pointsGained += addedScore;
        mergedIndices.forEach(idx => newlyMerged.push({ r, c: idx }));
      }
    } else if (direction === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const reversed = [...newBoard[r]].reverse();
        const { newRow, addedScore, mergedIndices } = slideRow(reversed);
        const originalDir = newRow.reverse();
        if (originalDir.some((val, idx) => val !== newBoard[r][idx])) moved = true;
        newBoard[r] = originalDir;
        pointsGained += addedScore;
        mergedIndices.forEach(idx => newlyMerged.push({ r, c: 3 - idx }));
      }
    } else if (direction === 'UP') {
      for (let c = 0; c < 4; c++) {
        const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
        const { newRow, addedScore, mergedIndices } = slideRow(col);
        for (let r = 0; r < 4; r++) {
          if (newBoard[r][c] !== newRow[r]) moved = true;
          newBoard[r][c] = newRow[r];
        }
        pointsGained += addedScore;
        mergedIndices.forEach(idx => newlyMerged.push({ r: idx, c }));
      }
    } else if (direction === 'DOWN') {
      for (let c = 0; c < 4; c++) {
        const col = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
        const { newRow, addedScore, mergedIndices } = slideRow(col);
        const reversed = newRow.reverse();
        for (let r = 0; r < 4; r++) {
          if (newBoard[r][c] !== reversed[r]) moved = true;
          newBoard[r][c] = reversed[r];
        }
        pointsGained += addedScore;
        mergedIndices.forEach(idx => newlyMerged.push({ r: 3 - idx, c }));
      }
    }

    if (moved) {
      // Save history for Undo (capped at 5 steps)
      setHistory(prev => [...prev.slice(-4), { board, score, highTile }]);

      if (pointsGained > 0) {
        playSfx('merge');
        setScorePointsGained(pointsGained);
        setTimeout(() => setScorePointsGained(null), 600);
      } else {
        playSfx('move');
      }

      setLastMergedTiles(newlyMerged);

      const nextBoard = addRandomTile(newBoard);
      setBoard(nextBoard);
      const newScore = score + pointsGained;
      setScore(newScore);

      if (newScore > bestScore) {
        setBestScore(newScore);
        try { localStorage.setItem('cyber2048_best_score', newScore.toString()); } catch {}
      }

      // Check max tile
      let maxVal = 0;
      nextBoard.forEach(row => row.forEach(v => { if (v > maxVal) maxVal = v; }));
      setHighTile(maxVal);

      if (maxVal >= 2048 && !hasWon2048 && !keepPlaying) {
        setHasWon2048(true);
        playSfx('win');
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
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
        playSfx('over');
        setTimeout(() => onGameOver(newScore), 400);
      }
    }
  }, [board, score, bestScore, highTile, isPlaying, isGameOver, hasWon2048, keepPlaying, onGameOver, playSfx]);

  // Keyboard navigation & Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault(); move('LEFT'); }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { e.preventDefault(); move('RIGHT'); }
      if (['ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); move('UP'); }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { e.preventDefault(); move('DOWN'); }
      if (['u', 'U', 'z', 'Z'].includes(e.key)) { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, history, isPlaying, isGameOver]);

  // Touch swipe handling with gesture locking
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Minimum swipe threshold (20px) and fast gesture limit (within 800ms)
    if (dt > 800) return;

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
      {/* HUD - Professional Neo-Brutalist Strip */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] flex items-center justify-between bg-portal-surface/95 px-3.5 py-2 rounded-xl border border-portal-border mb-2 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex flex-col">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Score</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-portal-cyan">{score}</span>
              {scorePointsGained !== null && (
                <span className="text-xs font-black text-portal-neon animate-bounce">
                  +{scorePointsGained}
                </span>
              )}
            </div>
          </div>
          <div className="h-6 w-[1px] bg-portal-border/60 mx-1" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 text-portal-gold inline" /> Best
            </span>
            <span className="text-sm font-black text-portal-gold">{bestScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isPlaying && (
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
                history.length > 0
                  ? 'bg-portal-card text-portal-cyan border-portal-cyan/40 hover:bg-portal-cyan hover:text-black active:scale-95'
                  : 'bg-portal-card/40 text-slate-600 border-portal-border/40 cursor-not-allowed opacity-50'
              }`}
              title="Undo Move (Z or U)"
            >
              <Undo2 className="w-3 h-3" />
              <span className="text-[10px] hidden sm:inline">({history.length})</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 active:scale-95 transition-all"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-portal-cyan" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
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
            <span className="text-[10px] font-black tracking-wider uppercase text-portal-cyan bg-portal-surface/90 border border-portal-border px-3 py-1 rounded-full shadow-sm">
              Swipe or arrow keys to merge
            </span>
          )}
        </div>

        {!isPlaying ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-portal-cyan shadow-glow-cyan animate-pulse">
              <Grid3X3 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-wide">QUANTUM 2048</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                Merge energy cells to reach <span className="text-portal-gold font-bold">2048</span> and beyond! Full undo support included.
              </p>
            </div>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 hover:bg-cyan-300 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" /> START GAME
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 w-full max-w-[340px] aspect-square my-auto p-2.5 bg-portal-surface/70 backdrop-blur-sm rounded-2xl border-2 border-portal-border/80 shadow-inner">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const conf = TILE_CONFIG[cell] || {
                  bg: 'bg-portal-surface/40',
                  text: 'text-slate-600',
                  border: 'border-portal-border/30',
                };
                const isMerged = lastMergedTiles.some(pos => pos.r === r && pos.c === c);

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`rounded-xl border flex items-center justify-center font-black transition-all duration-100 ${conf.bg} ${conf.text} ${conf.border} ${conf.glow || ''} ${
                      cell > 0 ? (isMerged ? 'scale-105 ring-2 ring-portal-cyan' : 'scale-100') : 'opacity-40'
                    } ${
                      cell >= 1024 ? 'text-sm sm:text-base' : cell >= 128 ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                    }`}
                  >
                    {cell > 0 ? cell : ''}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Bottom banner indicator */}
        <div className="w-full flex items-center justify-center gap-2 py-1">
          <Flame className="w-3 h-3 text-portal-gold animate-pulse" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Peak Cell: <span className="text-portal-cyan font-black">{highTile || 0}</span>
          </p>
        </div>

        {/* 2048 Reached Victory Celebration Dialog */}
        {hasWon2048 && !keepPlaying && (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-4 animate-scaleIn z-20">
            <span className="px-4 py-1.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 text-xs font-black uppercase tracking-wider shadow-glow-gold">
              🌟 2048 Reached! 🌟
            </span>
            <h3 className="text-2xl font-black text-white text-center">QUANTUM OVERLOAD!</h3>
            <p className="text-xs text-slate-300 text-center max-w-[240px]">
              You conquered the 2048 core. Keep going into endless mode for 4096 and the leaderboard records!
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <button
                onClick={() => setKeepPlaying(true)}
                className="w-full py-2.5 rounded-xl bg-portal-cyan text-black font-black text-xs shadow-glow-cyan active:scale-95 transition-all"
              >
                Keep Playing
              </button>
              <button
                onClick={startGame}
                className="w-full py-2 rounded-xl bg-portal-surface border border-portal-border text-slate-300 font-bold text-xs hover:text-white active:scale-95 transition-all"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-3 animate-scaleIn z-20">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase">
              No More Moves
            </span>
            <h3 className="text-2xl font-black text-white">Final Score: {score}</h3>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-portal-cyan text-black font-black text-xs shadow-glow-cyan active:scale-95 transition-all cursor-pointer"
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
