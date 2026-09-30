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
    name: 'Sector 01: Arcade Cadet',
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
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [touchMode, setTouchMode] = useState<'dig' | 'flag'>('dig'); // Mobile touch toggle
  const [scoreEarned, setScoreEarned] = useState<number>(0);
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTouchDeviceRef = useRef<boolean>(false);

  // Keep references stable for keyboard listener without churn
  const gridRef = useRef<CellData[][]>([]);
  const sectorRef = useRef<DifficultySector>(sector);
  const hoveredCellRef = useRef<{ r: number; c: number } | null>(null);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const isGameOverRef = useRef<boolean>(isGameOver);
  const isVictoryRef = useRef<boolean>(isVictory);
  const gameStartedRef = useRef<boolean>(gameStarted);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    sectorRef.current = sector;
  }, [sector]);

  useEffect(() => {
    hoveredCellRef.current = hoveredCell;
  }, [hoveredCell]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    isVictoryRef.current = isVictory;
  }, [isVictory]);

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

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
    setIsMouseDown(false);
    setElapsedSeconds(0);
    setScoreEarned(0);
    setHoveredCell(null);

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
    gridRef.current = newGrid;
  }, []);

  // Initialize board on mount or sector change
  useEffect(() => {
    initializeBoard(sector);
  }, [sector, initializeBoard]);

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
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}

      const timeBonus = Math.max(0, 300 - elapsedSeconds) * 12;
      const basePoints = (rows * cols - totalMines) * 120;
      const finalScore = Math.floor((basePoints + timeBonus) * SECTOR_CONFIGS[sector].scoreMultiplier);
      setScoreEarned(finalScore);
      setTimeout(() => onGameOverRef.current(finalScore), 400);
    }

    setGrid(nextBoard);
  };

  // Handle Flag Toggle
  const handleToggleFlag = (r: number, c: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isGameOver || isVictory) return;

    const currentGrid = gridRef.current.length > 0 ? gridRef.current : grid;
    const cell = currentGrid[r]?.[c];
    if (!cell || cell.isRevealed) return;

    const newFlagState = !cell.isFlagged;
    if (newFlagState && flagsPlaced >= totalMines) {
      return;
    }

    if (soundEnabledRef.current) {
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
    const currentGrid = gridRef.current.length > 0 ? gridRef.current : grid;
    if (isGameOverRef.current || isVictoryRef.current || !gameStartedRef.current) return;
    const cell = currentGrid[r]?.[c];
    if (!cell || !cell.isRevealed || cell.neighborMines === 0) return;

    // Count adjacent flags
    let adjacentFlags = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          if (currentGrid[nr][nc].isFlagged) adjacentFlags++;
        }
      }
    }

    if (adjacentFlags === cell.neighborMines) {
      const nextBoard = currentGrid.map((row) => row.map((cItem) => ({ ...cItem })));
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
        if (soundEnabledRef.current) sweeperAudio.playExplosionSound();
        nextBoard.forEach(row => row.forEach(c => {
          if (c.isMine) c.isRevealed = true;
        }));
        setGrid(nextBoard);
        setIsGameOver(true);
        const finalScore = Math.floor(100 * SECTOR_CONFIGS[sectorRef.current].scoreMultiplier);
        setScoreEarned(finalScore);
        setTimeout(() => onGameOverRef.current(finalScore), 400);
        return;
      }

      if (soundEnabledRef.current) sweeperAudio.playDigSound(cell.neighborMines);

      const won = checkVictory(nextBoard);
      if (won) {
        setIsVictory(true);
        if (soundEnabledRef.current) sweeperAudio.playVictoryFanfare();
        const timeBonus = Math.max(0, 300 - elapsedSeconds) * 12;
        const basePoints = (rows * cols - totalMines) * 120;
        const finalScore = Math.floor((basePoints + timeBonus) * SECTOR_CONFIGS[sectorRef.current].scoreMultiplier);
        setScoreEarned(finalScore);
        setTimeout(() => onGameOverRef.current(finalScore), 400);
      }

      setGrid(nextBoard);
    }
  };

  // Primary Cell Click Router (PC Mouse & Mobile Touch Unified)
  const handleCellClick = (r: number, c: number, e?: React.MouseEvent) => {
    const currentGrid = gridRef.current.length > 0 ? gridRef.current : grid;
    const cell = currentGrid[r]?.[c];
    if (!cell) return;

    if (cell.isRevealed) {
      handleChord(r, c);
      return;
    }

    if (isTouchDeviceRef.current && touchMode === 'flag') {
      handleToggleFlag(r, c);
    } else {
      handleReveal(r, c);
    }
  };

  // Mobile Long Press to Flag
  const handleTouchStart = (r: number, c: number) => {
    isTouchDeviceRef.current = true;
    longPressTimeoutRef.current = setTimeout(() => {
      handleToggleFlag(r, c);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
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

  // Desktop Keyboard Shortcuts
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
        initializeBoard(sectorRef.current);
      } else if (e.key === '1') {
        setSector('cadet');
      } else if (e.key === '2') {
        setSector('hacker');
      } else if (e.key === '3') {
        setSector('overlord');
      } else if (e.key === '4') {
        setSector('blitz');
      } else if (e.key === 'm' || e.key === 'M') {
        setSoundEnabled((prev) => !prev);
      } else if (e.key === ' ') {
        const hovered = hoveredCellRef.current;
        if (hovered) {
          e.preventDefault();
          const curGrid = gridRef.current;
          const cell = curGrid[hovered.r]?.[hovered.c];
          if (cell) {
            if (cell.isRevealed) {
              handleChord(hovered.r, hovered.c);
            } else {
              handleToggleFlag(hovered.r, hovered.c);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initializeBoard]);

  // Tile Number Color Palette
  const getNumberColor = (num: number) => {
    switch (num) {
      case 1:
        return 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]';
      case 2:
        return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]';
      case 3:
        return 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]';
      case 4:
        return 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]';
      case 5:
        return 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]';
      case 6:
        return 'text-teal-300 drop-shadow-[0_0_8px_rgba(94,234,212,0.8)]';
      case 7:
        return 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]';
      case 8:
        return 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]';
      default:
        return 'text-slate-300';
    }
  };

  const currentSectorConfig = SECTOR_CONFIGS[sector];
  const remainingMines = Math.max(0, totalMines - flagsPlaced);

  // Check if a cell is an unrevealed neighbor of the hovered open numbered cell
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
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center font-sans">
      {/* Top Streamlined HUD Strip */}
      <div className="w-full max-w-[min(100%,calc(min(72vh,580px)))] flex items-center justify-between bg-portal-surface/95 px-3.5 py-2 rounded-xl border border-portal-border mb-2 shadow-md shrink-0">
        {/* Left: Sector Selector & 7-Segment LED Mines Counter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(['cadet', 'hacker', 'overlord', 'blitz'] as DifficultySector[]).map((secKey, idx) => {
              const conf = SECTOR_CONFIGS[secKey];
              const isSelected = sector === secKey;
              return (
                <button
                  key={secKey}
                  onClick={() => setSector(secKey)}
                  className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                    isSelected
                      ? `${conf.badgeBg} ${conf.badgeText} shadow-sm scale-105`
                      : 'bg-portal-card/80 text-slate-400 hover:text-white border border-portal-border/60'
                  }`}
                  title={`Select ${conf.name} [Hotkey: ${idx + 1}]`}
                >
                  {secKey === 'blitz' ? 'BLITZ' : conf.shortName.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Authentic Digital 7-Segment LED Mines Display */}
          <div
            className="flex items-center gap-1 bg-black/90 px-2 py-0.5 rounded-lg border border-red-900/60 shadow-[inset_0_0_8px_rgba(239,68,68,0.4)]"
            title="Mines Remaining"
          >
            <Bomb className="w-3 h-3 text-red-500 fill-red-500" />
            <span className="font-mono text-xs font-black tracking-widest text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">
              {String(remainingMines).padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* Center: Interactive Status Face Button */}
        <button
          onClick={() => initializeBoard(sector)}
          className="w-8 h-8 rounded-lg bg-portal-yellow hover:bg-yellow-300 text-black border-2 border-black/80 shadow-[0_2px_0_rgba(0,0,0,1)] flex items-center justify-center text-base active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          title="Restart with New Field [Hotkey: R]"
        >
          {isVictory ? '😎' : isGameOver ? '😵' : isMouseDown ? '😮' : '🙂'}
        </button>

        {/* Right: Authentic 7-Segment LED Timer, Touch Toggle, Sound */}
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-1 bg-black/90 px-2 py-0.5 rounded-lg border border-cyan-900/60 shadow-[inset_0_0_8px_rgba(6,182,212,0.4)]"
            title="Time Elapsed (Seconds)"
          >
            <Timer className="w-3 h-3 text-cyan-400" />
            <span className="font-mono text-xs font-black tracking-widest text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
              {String(Math.min(999, elapsedSeconds)).padStart(3, '0')}
            </span>
          </div>

          {/* Touch Mode switch for mobile */}
          <div className="flex sm:hidden items-center gap-0.5">
            <button
              onClick={() => setTouchMode('dig')}
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                touchMode === 'dig' ? 'bg-portal-cyan text-black' : 'bg-portal-card text-slate-400'
              }`}
            >
              ⛏️
            </button>
            <button
              onClick={() => setTouchMode('flag')}
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                touchMode === 'flag' ? 'bg-portal-pink text-white' : 'bg-portal-card text-slate-400'
              }`}
            >
              🚩
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 cursor-pointer"
            aria-label="Toggle sound"
            title={soundEnabled ? 'Mute Audio [Hotkey: M]' : 'Enable Audio [Hotkey: M]'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3 h-3 text-portal-cyan" />
            ) : (
              <VolumeX className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Main Minefield Frame - Viewport Scaled */}
      <div
        onMouseDown={() => setIsMouseDown(true)}
        onMouseUp={() => setIsMouseDown(false)}
        className="relative w-auto h-[min(70vh,560px)] max-w-full aspect-square bg-portal-bg/95 rounded-2xl border-2 border-portal-border p-2 shadow-2xl flex flex-col items-center justify-center overflow-hidden shrink-0"
      >
        {/* Subtle Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-neo-grid opacity-20 pointer-events-none" />

        {/* Minesweeper Grid Board - Pure Fluid CSS Grid */}
        <div
          className="relative z-10 grid gap-1 sm:gap-1.5 p-1 bg-portal-surface/90 border border-portal-border rounded-xl shadow-inner select-none touch-manipulation w-full h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
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

              let cellBg = 'bg-portal-card text-slate-300 shadow-[0_2px_0_rgba(0,0,0,0.5)]';
              let cellBorder = 'border border-portal-border/60';

              if (isCellRevealed) {
                if (isExplodedMine) {
                  cellBg = 'bg-red-600 text-white animate-pulse shadow-inner';
                  cellBorder = 'border border-red-400';
                } else if (isCellMine) {
                  cellBg = 'bg-red-950/80 text-portal-pink';
                  cellBorder = 'border border-red-800';
                } else {
                  cellBg = 'bg-black/90 text-white shadow-inner';
                  cellBorder = 'border border-white/5';
                }
              } else if (isCellFlagged) {
                cellBg = 'bg-portal-yellow text-black shadow-[0_2px_0_rgba(0,0,0,0.8)]';
                cellBorder = 'border border-yellow-400';
              } else if (isNeighbor) {
                cellBg = 'bg-slate-700 text-white ring-2 ring-portal-cyan/80';
              }

              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  type="button"
                  onClick={(e) => handleCellClick(rIdx, cIdx, e)}
                  onContextMenu={(e) => handleToggleFlag(rIdx, cIdx, e)}
                  onMouseDown={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChord(rIdx, cIdx);
                    }
                  }}
                  onMouseEnter={() => setHoveredCell({ r: rIdx, c: cIdx })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onTouchStart={() => handleTouchStart(rIdx, cIdx)}
                  onTouchEnd={handleTouchEnd}
                  disabled={isGameOver || isVictory}
                  className={`w-full h-full rounded-md flex items-center justify-center font-black text-xs sm:text-sm md:text-base select-none transition-all duration-75 ${cellBg} ${cellBorder} ${
                    !isCellRevealed
                      ? 'hover:bg-slate-700/80 hover:border-portal-cyan active:scale-95 cursor-pointer'
                      : cell.neighborMines > 0
                      ? 'hover:brightness-125 cursor-pointer'
                      : 'cursor-default'
                  }`}
                  title={
                    isCellRevealed && cell.neighborMines > 0
                      ? `Chord: Click or Middle-Click to reveal non-flagged neighbors (${cell.neighborMines} total)`
                      : !isCellRevealed
                      ? `Cell [${rIdx + 1}, ${cIdx + 1}] - Click to Dig, Right-Click to Flag`
                      : undefined
                  }
                >
                  {isCellRevealed ? (
                    isCellMine ? (
                      isExplodedMine ? (
                        <span className="text-xs sm:text-sm md:text-base">💥</span>
                      ) : (
                        <Bomb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-portal-pink fill-portal-pink" />
                      )
                    ) : cell.neighborMines > 0 ? (
                      <span className={`font-black font-mono ${getNumberColor(cell.neighborMines)}`}>
                        {cell.neighborMines}
                      </span>
                    ) : null
                  ) : isCellFlagged ? (
                    <Flag className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-black text-black stroke-[2.5]" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Win / Loss Overlay Banner */}
        {(isVictory || isGameOver) && (
          <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl border border-white/20 flex items-center justify-center shadow-xl mb-2">
              {isVictory ? (
                <div className="w-full h-full bg-portal-lime flex items-center justify-center text-black rounded-2xl shadow-glow-cyan">
                  <Sparkles className="w-6 h-6 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-full h-full bg-portal-pink flex items-center justify-center text-white rounded-2xl shadow-glow-purple">
                  <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
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

            <div className="my-2 px-3 py-1 rounded-xl bg-portal-surface border border-portal-border flex items-center gap-2">
              <Trophy className="w-4 h-4 text-portal-yellow fill-portal-yellow" />
              <span className="text-sm font-black text-portal-yellow">+{scoreEarned} PTS</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                ({currentSectorConfig.scoreMultiplier}x)
              </span>
            </div>

            <button
              onClick={() => initializeBoard(sector)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs uppercase tracking-wider shadow-glow-yellow hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
              <span>BREACH AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Desktop Helper Strip */}
      <div className="hidden md:flex w-full max-w-[min(100%,calc(min(72vh,580px)))] mt-2 items-center justify-between text-[9px] font-bold text-slate-400 bg-portal-card/80 px-3 py-1.5 rounded-xl border border-portal-border/60 shrink-0">
        <span className="flex items-center gap-1 text-portal-cyan">
          ⌨️ [L-CLICK] DIG • [R-CLICK / SPACE] FLAG • [CHORD CLICK] CLEAR NEIGHBORS
        </span>
        <span className="text-portal-yellow flex items-center gap-1">
          [R] RESET • [1-4] SECTOR • [M] MUTE
        </span>
      </div>
    </div>
  );
}
