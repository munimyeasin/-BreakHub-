'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bomb,
  Flag,
  RotateCcw,
  Trophy,
  Timer,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  ShieldAlert,
  Flame,
  Shuffle,
  Eye,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberMinesweeperGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type DifficultySector = 'cadet' | 'hacker' | 'overlord' | 'blitz';

interface SectorConfig {
  name: string;
  shortName: string;
  rows: number;
  cols: number;
  mines: number;
  scoreMultiplier: number;
  badgeBg: string;
  badgeText: string;
}

const SECTOR_CONFIGS: Record<DifficultySector, SectorConfig> = {
  cadet: {
    name: 'Sector 01: Cyber Cadet',
    shortName: 'Cadet (8x8)',
    rows: 8,
    cols: 8,
    mines: 10,
    scoreMultiplier: 1.0,
    badgeBg: 'bg-portal-cyan',
    badgeText: 'text-black'
  },
  hacker: {
    name: 'Sector 02: Matrix Hacker',
    shortName: 'Hacker (10x10)',
    rows: 10,
    cols: 10,
    mines: 18,
    scoreMultiplier: 1.6,
    badgeBg: 'bg-portal-lime',
    badgeText: 'text-black'
  },
  overlord: {
    name: 'Sector 03: Neural Overlord',
    shortName: 'Overlord (12x12)',
    rows: 12,
    cols: 12,
    mines: 30,
    scoreMultiplier: 2.4,
    badgeBg: 'bg-portal-pink',
    badgeText: 'text-white'
  },
  blitz: {
    name: 'Sector 04: Quantum Blitz (Randomized)',
    shortName: 'Blitz (Procedural)',
    rows: 9,
    cols: 9,
    mines: 14,
    scoreMultiplier: 3.0,
    badgeBg: 'bg-portal-yellow',
    badgeText: 'text-black'
  }
};

interface CellData {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  exploded?: boolean;
}

// Zero-dependency Web Audio Synthesizer for Neo-Brutalist Minesweeper
class SweeperAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public playDigSound(neighborCount: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const baseFreq = 340 + neighborCount * 65;
      osc.type = neighborCount === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.05);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  public playFlagSound(isPlacing: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isPlacing ? 680 : 420, now);
      osc.frequency.exponentialRampToValueAtTime(isPlacing ? 880 : 340, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  public playExplosionSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // Low rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.45);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.52);

      // Noise burst for crunch
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch {}
  }

  public playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.29);
      });
    } catch {}
  }
}

const sweeperAudio = new SweeperAudioEngine();

export default function CyberMinesweeperGame({ onGameOver }: CyberMinesweeperGameProps) {
  const [sector, setSector] = useState<DifficultySector>('cadet');
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [rows, setRows] = useState<number>(8);
  const [cols, setCols] = useState<number>(8);
  const [totalMines, setTotalMines] = useState<number>(10);
  const [flagsPlaced, setFlagsPlaced] = useState<number>(0);

  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [touchMode, setTouchMode] = useState<'dig' | 'flag'>('dig'); // Mobile toggle
  const [seedCounter, setSeedCounter] = useState<number>(1);
  const [scoreEarned, setScoreEarned] = useState<number>(0);
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // Generate blank initial board
  const initializeBoard = useCallback((targetSector: DifficultySector) => {
    let r = 8;
    let c = 8;
    let m = 10;

    if (targetSector === 'cadet') {
      r = 8;
      c = 8;
      m = 10;
    } else if (targetSector === 'hacker') {
      r = 10;
      c = 10;
      m = 18;
    } else if (targetSector === 'overlord') {
      r = 12;
      c = 12;
      m = 30;
    } else if (targetSector === 'blitz') {
      // Procedural randomized dimensions and mine density
      const randomDims = [
        { r: 8, c: 8, m: 12 },
        { r: 9, c: 9, m: 15 },
        { r: 10, c: 8, m: 16 },
        { r: 10, c: 10, m: 20 },
        { r: 11, c: 11, m: 24 }
      ];
      const picked = randomDims[Math.floor(Math.random() * randomDims.length)];
      r = picked.r;
      c = picked.c;
      m = picked.m;
    }

    setRows(r);
    setCols(c);
    setTotalMines(m);
    setFlagsPlaced(0);
    setGameStarted(false);
    setIsGameOver(false);
    setIsVictory(false);
    setElapsedSeconds(0);
    setScoreEarned(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const newGrid: CellData[][] = [];
    for (let i = 0; i < r; i++) {
      const row: CellData[] = [];
      for (let j = 0; j < c; j++) {
        row.push({
          r: i,
          c: j,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  }, []);

  // Desktop Keyboard Shortcuts (R: Reset, 1-4: Sectors, M: Mute, Space: Flag/Chord)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.repeat
      ) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        setSeedCounter((prev) => prev + 1);
        initializeBoard(sector);
      } else if (e.key === '1') {
        setSector('cadet');
        setSeedCounter((prev) => prev + 1);
      } else if (e.key === '2') {
        setSector('hacker');
        setSeedCounter((prev) => prev + 1);
      } else if (e.key === '3') {
        setSector('overlord');
        setSeedCounter((prev) => prev + 1);
      } else if (e.key === '4') {
        setSector('blitz');
        setSeedCounter((prev) => prev + 1);
      } else if (e.key === 'm' || e.key === 'M') {
        setSoundEnabled((prev) => !prev);
      } else if (e.key === ' ' && hoveredCell) {
        e.preventDefault();
        const cell = grid[hoveredCell.r]?.[hoveredCell.c];
        if (cell) {
          if (cell.isRevealed) {
            handleChord(hoveredCell.r, hoveredCell.c);
          } else {
            handleToggleFlag(hoveredCell.r, hoveredCell.c);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sector, initializeBoard, hoveredCell, grid]);

  // Active Timer Loop
  useEffect(() => {
    if (gameStarted && !isGameOver && !isVictory) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, isGameOver, isVictory]);

  // Procedural Mine Generator with 100% Guaranteed Safe First Click (3x3 safe zone)
  const populateMines = (startR: number, startC: number, currentGrid: CellData[][]): CellData[][] => {
    const board = currentGrid.map((row) => row.map((cell) => ({ ...cell })));
    const totalCells = rows * cols;

    // Build array of eligible coordinates excluding safe starting zone
    const candidateCoords: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isNearStart = Math.abs(r - startR) <= 1 && Math.abs(c - startC) <= 1;
        if (!isNearStart) {
          candidateCoords.push([r, c]);
        }
      }
    }

    // Shuffle candidates (Fisher-Yates)
    for (let i = candidateCoords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateCoords[i], candidateCoords[j]] = [candidateCoords[j], candidateCoords[i]];
    }

    // Place exactly `totalMines`
    const minesToPlace = Math.min(totalMines, candidateCoords.length);
    for (let i = 0; i < minesToPlace; i++) {
      const [mr, mc] = candidateCoords[i];
      board[mr][mc].isMine = true;
    }

    // Calculate neighbor counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (board[nr][nc].isMine) count++;
            }
          }
        }
        board[r][c].neighborMines = count;
      }
    }

    return board;
  };

  // Check victory condition
  const checkVictory = (currentGrid: CellData[][]): boolean => {
    let unrevealedSafeCells = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = currentGrid[r][c];
        if (!cell.isMine && !cell.isRevealed) {
          unrevealedSafeCells++;
        }
      }
    }
    return unrevealedSafeCells === 0;
  };

  // Flood-fill reveal logic
  const revealCellRecursive = (r: number, c: number, board: CellData[][]) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged || cell.isMine) return;

    cell.isRevealed = true;

    if (cell.neighborMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) {
            revealCellRecursive(r + dr, c + dc, board);
          }
        }
      }
    }
  };

  // Handle cell dig / reveal
  const handleReveal = (r: number, c: number) => {
    if (isGameOver || isVictory) return;

    let currentBoard = grid;

    // First click initialization
    if (!gameStarted) {
      currentBoard = populateMines(r, c, grid);
      setGameStarted(true);
    }

    const cell = currentBoard[r][c];
    if (cell.isFlagged || cell.isRevealed) return;

    // Hit a mine!
    if (cell.isMine) {
      if (soundEnabled) sweeperAudio.playExplosionSound();

      const explodedBoard = currentBoard.map((row) =>
        row.map((cItem) => {
          if (cItem.r === r && cItem.c === c) {
            return { ...cItem, isRevealed: true, exploded: true };
          }
          if (cItem.isMine) {
            return { ...cItem, isRevealed: true };
          }
          return cItem;
        })
      );

      setGrid(explodedBoard);
      setIsGameOver(true);

      // Calculate consolation score based on safe reveals
      let revealedCount = 0;
      explodedBoard.forEach(row => row.forEach(c => {
        if (c.isRevealed && !c.isMine) revealedCount++;
      }));

      const finalScore = Math.floor(revealedCount * 45 * SECTOR_CONFIGS[sector].scoreMultiplier);
      setScoreEarned(finalScore);
      setTimeout(() => onGameOverRef.current(finalScore), 400);
      return;
    }

    // Safe reveal
    const nextBoard = currentBoard.map((row) => row.map((cItem) => ({ ...cItem })));
    revealCellRecursive(r, c, nextBoard);

    if (soundEnabled) {
      sweeperAudio.playDigSound(nextBoard[r][c].neighborMines);
    }

    // Check Victory
    const won = checkVictory(nextBoard);
    if (won) {
      setIsVictory(true);
      if (soundEnabled) sweeperAudio.playVictoryFanfare();

      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}

      // Calculate high score
      const timeBonus = Math.max(0, 300 - elapsedSeconds) * 12;
      const basePoints = (rows * cols - totalMines) * 120;
      const finalScore = Math.floor((basePoints + timeBonus) * SECTOR_CONFIGS[sector].scoreMultiplier);
      setScoreEarned(finalScore);
      setTimeout(() => onGameOverRef.current(finalScore), 400);
    }

    setGrid(nextBoard);
  };

  // Handle Flag Toggle
  const handleToggleFlag = (r: number, c: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isGameOver || isVictory) return;

    const cell = grid[r][c];
    if (cell.isRevealed) return;

    const newFlagState = !cell.isFlagged;
    if (newFlagState && flagsPlaced >= totalMines) {
      // Cannot place more flags than total mines
      return;
    }

    if (soundEnabled) {
      sweeperAudio.playFlagSound(newFlagState);
    }

    setFlagsPlaced((prev) => (newFlagState ? prev + 1 : prev - 1));

    setGrid((prevGrid) =>
      prevGrid.map((row, ri) =>
        row.map((cItem, ci) => {
          if (ri === r && ci === c) {
            return { ...cItem, isFlagged: newFlagState };
          }
          return cItem;
        })
      )
    );
  };

  // Chord Action: Click an open numbered tile to clear neighbors if flagged count matches
  const handleChord = (r: number, c: number) => {
    if (isGameOver || isVictory || !gameStarted) return;
    const cell = grid[r][c];
    if (!cell.isRevealed || cell.neighborMines === 0) return;

    // Count adjacent flags
    let adjacentFlags = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          if (grid[nr][nc].isFlagged) adjacentFlags++;
        }
      }
    }

    if (adjacentFlags === cell.neighborMines) {
      const nextBoard = grid.map((row) => row.map((cItem) => ({ ...cItem })));
      let hitMine = false;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = nextBoard[nr][nc];
            if (!neighbor.isRevealed && !neighbor.isFlagged) {
              if (neighbor.isMine) {
                hitMine = true;
                neighbor.exploded = true;
              } else {
                revealCellRecursive(nr, nc, nextBoard);
              }
            }
          }
        }
      }

      if (hitMine) {
        if (soundEnabled) sweeperAudio.playExplosionSound();
        nextBoard.forEach(row => row.forEach(c => {
          if (c.isMine) c.isRevealed = true;
        }));
        setGrid(nextBoard);
        setIsGameOver(true);
        const finalScore = Math.floor(100 * SECTOR_CONFIGS[sector].scoreMultiplier);
        setScoreEarned(finalScore);
        setTimeout(() => onGameOverRef.current(finalScore), 400);
        return;
      }

      if (soundEnabled) sweeperAudio.playDigSound(cell.neighborMines);

      const won = checkVictory(nextBoard);
      if (won) {
        setIsVictory(true);
        if (soundEnabled) sweeperAudio.playVictoryFanfare();
        const timeBonus = Math.max(0, 300 - elapsedSeconds) * 12;
        const basePoints = (rows * cols - totalMines) * 120;
        const finalScore = Math.floor((basePoints + timeBonus) * SECTOR_CONFIGS[sector].scoreMultiplier);
        setScoreEarned(finalScore);
        setTimeout(() => onGameOverRef.current(finalScore), 400);
      }

      setGrid(nextBoard);
    }
  };

  // Primary Cell Click Router (Mobile/Desktop friendly)
  const handleCellClick = (r: number, c: number) => {
    const cell = grid[r][c];
    if (cell.isRevealed) {
      handleChord(r, c);
      return;
    }

    if (touchMode === 'flag') {
      handleToggleFlag(r, c);
    } else {
      handleReveal(r, c);
    }
  };

  // Mobile Long Press to Flag
  const handleTouchStart = (r: number, c: number) => {
    longPressTimeoutRef.current = setTimeout(() => {
      handleToggleFlag(r, c);
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 320);
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // Tile Number Color Palette
  const getNumberColor = (num: number) => {
    switch (num) {
      case 1:
        return 'text-portal-cyan';
      case 2:
        return 'text-portal-lime';
      case 3:
        return 'text-portal-pink';
      case 4:
        return 'text-portal-yellow';
      case 5:
        return 'text-orange-400';
      case 6:
        return 'text-teal-300';
      case 7:
        return 'text-purple-400';
      case 8:
        return 'text-white';
      default:
        return 'text-slate-300';
    }
  };

  const currentSectorConfig = SECTOR_CONFIGS[sector];
  const remainingMines = Math.max(0, totalMines - flagsPlaced);

  // Check if a cell is an unrevealed neighbor of the hovered open numbered cell (PC desktop visual cue)
  const isNeighborHovered = (r: number, c: number) => {
    if (!hoveredCell) return false;
    const hCell = grid[hoveredCell.r]?.[hoveredCell.c];
    if (!hCell || !hCell.isRevealed || hCell.neighborMines === 0) return false;
    return (
      Math.abs(r - hoveredCell.r) <= 1 &&
      Math.abs(c - hoveredCell.c) <= 1 &&
      !(r === hoveredCell.r && c === hoveredCell.c)
    );
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[420px] md:max-w-[560px] lg:max-w-[620px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-portal-surface px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border-3 border-black mb-2 shadow-neo-sm">
        {/* Remaining Mines */}
        <div
          className="flex items-center gap-1.5 bg-portal-card px-2 sm:px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-sm text-[11px] font-black"
          title="Mines Remaining"
        >
          <Bomb className="w-3.5 h-3.5 text-portal-pink fill-portal-pink stroke-[2.5]" />
          <span className={`text-xs font-black ${remainingMines === 0 ? 'text-portal-lime' : 'text-portal-pink'}`}>
            {String(remainingMines).padStart(2, '0')}
          </span>
        </div>

        {/* Status / Face Reset Button */}
        <button
          onClick={() => {
            setSeedCounter((prev) => prev + 1);
            initializeBoard(sector);
          }}
          className="px-2.5 py-1 rounded-lg bg-portal-yellow hover:bg-portal-cyan text-black border-2 border-black shadow-neo-sm font-black text-xs uppercase flex items-center gap-1 hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          title="Restart with New Random Seed [Hotkey: R]"
        >
          {isVictory ? (
            <span className="flex items-center gap-1 text-[11px]">
              <span>😎</span> WON
            </span>
          ) : isGameOver ? (
            <span className="flex items-center gap-1 text-[11px]">
              <span>💥</span> RETRY
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px]">
              <span>🕹️</span> RESET
            </span>
          )}
        </button>

        {/* Stopwatch Timer */}
        <div
          className="flex items-center gap-1.5 bg-portal-card px-2 sm:px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-sm text-[11px] font-black"
          title="Time Elapsed"
        >
          <Timer className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
          <span className="text-xs font-black text-white">
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
          </span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 sm:p-1.5 rounded-lg bg-portal-card text-white hover:bg-portal-yellow hover:text-black border-2 border-black shadow-neo-sm font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5"
          aria-label="Toggle sound"
          title={soundEnabled ? 'Mute Audio [Hotkey: M]' : 'Enable Audio [Hotkey: M]'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </button>
      </div>

      {/* Sector Selection Bar & Mobile Mode Switcher */}
      <div className="w-full flex items-center justify-between gap-1.5 mb-2">
        {/* Sector Difficulty Selector */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none flex-1">
          {(['cadet', 'hacker', 'overlord', 'blitz'] as DifficultySector[]).map((secKey, idx) => {
            const conf = SECTOR_CONFIGS[secKey];
            const isSelected = sector === secKey;
            return (
              <button
                key={secKey}
                onClick={() => {
                  setSector(secKey);
                  setSeedCounter((prev) => prev + 1);
                }}
                className={`px-2 py-1 rounded-lg border-2 border-black text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                  isSelected
                    ? `${conf.badgeBg} ${conf.badgeText} shadow-neo-sm translate-x-0.5 translate-y-0.5`
                    : 'bg-portal-card text-slate-300 hover:text-white shadow-neo-sm hover:border-portal-cyan'
                }`}
                title={`Select ${conf.name} [Hotkey: ${idx + 1}]`}
              >
                {secKey === 'blitz' ? '🎲 BLITZ' : conf.shortName.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Mobile Dig / Flag Mode Switcher (Visible on mobile/tablets) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setTouchMode('dig')}
            className={`px-2.5 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase flex items-center gap-1 transition-all ${
              touchMode === 'dig'
                ? 'bg-portal-cyan text-black shadow-neo-sm translate-x-0.5 translate-y-0.5'
                : 'bg-portal-card text-slate-400 hover:text-white shadow-neo-sm'
            }`}
            title="Dig Mode (Reveal Cell)"
          >
            <span>⛏️</span> <span className="hidden xs:inline">DIG</span>
          </button>
          <button
            onClick={() => setTouchMode('flag')}
            className={`px-2.5 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase flex items-center gap-1 transition-all ${
              touchMode === 'flag'
                ? 'bg-portal-pink text-white shadow-neo-sm translate-x-0.5 translate-y-0.5'
                : 'bg-portal-card text-slate-400 hover:text-white shadow-neo-sm'
            }`}
            title="Flag Mode (Mark Mine)"
          >
            <span>🚩</span> <span className="hidden xs:inline">FLAG</span>
          </button>
        </div>
      </div>

      {/* Main Minefield Frame */}
      <div className="relative w-full bg-portal-bg bg-neo-dots rounded-2xl border-4 border-black p-2 sm:p-3 shadow-neo-lg flex flex-col items-center justify-center overflow-hidden">
        {/* Subtle Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-neo-grid opacity-25 pointer-events-none" />

        {/* Minesweeper Grid Board */}
        <div
          className="relative z-10 grid gap-1 sm:gap-1.5 p-1 bg-portal-surface border-3 border-black rounded-xl shadow-neo-sm select-none touch-manipulation"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            maxWidth: '100%'
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isCellRevealed = cell.isRevealed;
              const isCellFlagged = cell.isFlagged;
              const isCellMine = cell.isMine;
              const isExplodedMine = cell.exploded;
              const isNeighbor = isNeighborHovered(rIdx, cIdx);

              let cellBg = 'bg-portal-card hover:bg-portal-surface text-slate-300';
              let cellBorder = 'border-2 border-black shadow-neo-sm';

              if (isCellRevealed) {
                if (isExplodedMine) {
                  cellBg = 'bg-portal-pink text-white animate-pulse';
                  cellBorder = 'border-2 border-black shadow-none';
                } else if (isCellMine) {
                  cellBg = 'bg-red-950 text-portal-pink';
                  cellBorder = 'border-2 border-black shadow-none';
                } else {
                  cellBg = 'bg-black/90 text-white';
                  cellBorder = 'border border-slate-800 shadow-none';
                }
              } else if (isCellFlagged) {
                cellBg = 'bg-portal-yellow text-black';
                cellBorder = 'border-2 border-black shadow-neo-sm';
              } else if (isNeighbor) {
                // Subtle desktop neighbor highlight for unrevealed cells
                cellBg = 'bg-slate-700/80 text-white ring-2 ring-portal-cyan/80';
              }

              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  type="button"
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  onContextMenu={(e) => handleToggleFlag(rIdx, cIdx, e)}
                  onMouseDown={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      handleChord(rIdx, cIdx);
                    }
                  }}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      handleChord(rIdx, cIdx);
                    }
                  }}
                  onMouseEnter={() => setHoveredCell({ r: rIdx, c: cIdx })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onTouchStart={() => handleTouchStart(rIdx, cIdx)}
                  onTouchEnd={handleTouchEnd}
                  disabled={isGameOver || isVictory}
                  className={`aspect-square w-7 sm:w-8 md:w-9 lg:w-10 max-w-full rounded-lg flex items-center justify-center font-black text-xs sm:text-sm md:text-base transition-all duration-75 ${cellBg} ${cellBorder} ${
                    !isCellRevealed
                      ? 'hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer'
                      : cell.neighborMines > 0
                      ? 'hover:brightness-125 cursor-pointer'
                      : 'cursor-default'
                  }`}
                  title={
                    isCellRevealed && cell.neighborMines > 0
                      ? `Hint: ${cell.neighborMines} adjacent mines (Click/Chord to clear)`
                      : !isCellRevealed
                      ? `Cell [${rIdx + 1}, ${cIdx + 1}] - Left Click to Dig, Right Click to Flag`
                      : undefined
                  }
                >
                  {isCellRevealed ? (
                    isCellMine ? (
                      isExplodedMine ? (
                        <span className="text-sm md:text-base">💥</span>
                      ) : (
                        <Bomb className="w-3.5 h-3.5 md:w-4 md:h-4 text-portal-pink fill-portal-pink" />
                      )
                    ) : cell.neighborMines > 0 ? (
                      <span className={`font-black ${getNumberColor(cell.neighborMines)}`}>
                        {cell.neighborMines}
                      </span>
                    ) : null
                  ) : isCellFlagged ? (
                    <Flag className="w-3.5 h-3.5 md:w-4 md:h-4 fill-black text-black stroke-[3]" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Win / Loss Overlay Banner */}
        {(isVictory || isGameOver) && (
          <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl border-3 border-black flex items-center justify-center shadow-neo mb-2.5">
              {isVictory ? (
                <div className="w-full h-full bg-portal-lime flex items-center justify-center text-black">
                  <Sparkles className="w-7 h-7 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-full h-full bg-portal-pink flex items-center justify-center text-white">
                  <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
                </div>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
              {isVictory ? 'Sector Breached!' : 'Mine Detonated!'}
            </h3>

            <p className="text-xs text-slate-300 font-bold mt-1 max-w-[250px]">
              {isVictory
                ? `Cleared all ${totalMines} quantum mines in ${elapsedSeconds}s!`
                : 'Tripped a high-voltage plasma charge. Better luck next breach!'}
            </p>

            <div className="my-3 px-3.5 py-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-portal-yellow fill-portal-yellow" />
              <span className="text-sm font-black text-portal-yellow">+{scoreEarned} PTS</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                ({currentSectorConfig.scoreMultiplier}x)
              </span>
            </div>

            <button
              onClick={() => {
                setSeedCounter((prev) => prev + 1);
                initializeBoard(sector);
              }}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
              <span>BREACH AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile/General Helper Strip */}
      <div className="w-full mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 bg-portal-card px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-sm">
        <span className="flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-portal-cyan" /> 100% Safe First Click
        </span>
        <span className="text-portal-yellow flex items-center gap-1">
          <Zap className="w-3 h-3" /> Chord Clears
        </span>
      </div>

      {/* Desktop-Only Ergonomics & Keyboard Shortcuts Legend (Hidden on Mobile) */}
      <div className="hidden md:flex w-full mt-1.5 items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 bg-portal-surface px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-sm">
        <span className="flex items-center gap-1 text-portal-cyan">
          ⌨️ [L-CLICK] DIG • [R-CLICK / SPACE] FLAG • [M-CLICK / CHORD] CLEAR
        </span>
        <span className="text-portal-yellow flex items-center gap-1">
          [R] RESET • [1-4] SECTORS • [M] AUDIO
        </span>
      </div>
    </div>
  );
}
