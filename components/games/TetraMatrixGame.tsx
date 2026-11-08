'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Play,
  Pause,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Zap,
  Layers,
  Sparkles,
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TetraMatrixGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const COLS = 10;
const ROWS = 20;
const TOTAL_ROWS = ROWS;
const CANVAS_WIDTH = 380;
const CANVAS_HEIGHT = 520; // Reduced height to leave room for touch controls below canvas
const BLOCK_SIZE = 24;

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const TETROMINOES: Record<TetrominoType, { name: string; color: string; glow: string; shapes: number[][][] }> = {
  I: { name: 'CYAN I-BAR', color: '#00F0FF', glow: 'rgba(0,240,255,0.8)', shapes: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ]},
  O: { name: 'YELLOW O-BOX', color: '#FFE600', glow: 'rgba(255,230,0,0.8)', shapes: [[[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]]] },
  T: { name: 'PINK T-CROSS', color: '#FF007F', glow: 'rgba(255,0,127,0.8)', shapes: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ]},
  S: { name: 'LIME S-WAVE', color: '#00FF66', glow: 'rgba(0,255,102,0.8)', shapes: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
  ]},
  Z: { name: 'ROSE Z-WAVE', color: '#FF1A4B', glow: 'rgba(255,26,75,0.8)', shapes: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
  ]},
  J: { name: 'ROYAL J-HOOK', color: '#2563EB', glow: 'rgba(37,99,235,0.8)', shapes: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
  ]},
  L: { name: 'ORANGE L-HOOK', color: '#FF8800', glow: 'rgba(255,136,0,0.8)', shapes: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
  ]}
};

const PIECE_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const WALL_KICK_TABLE: Record<TetrominoType, [number, number][][]> = {
  I: [
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[-1,0],[1,0],[0,1],[-1,1],[1,1],[-2,0],[2,0]],
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]]
  ],
  T: [
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0]],
    [[0,0],[-1,0],[1,0],[0,1],[-1,1],[1,1],[-2,0],[2,0]],
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[1,1],[-1,1],[2,0],[-2,0],[0,-1],[1,-1],[-1,-1]]
  ],
  O: [[[0,0]]],
  J: [
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[-1,-1],[1,-1],[-2,0],[2,0],[0,1],[-1,1],[1,1]],
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[1,1],[-1,1],[2,0],[-2,0],[0,-1],[1,-1],[-1,-1]]
  ],
  L: [
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[-1,-1],[1,-1],[-2,0],[2,0],[0,1],[-1,1],[1,1]],
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[1,1],[-1,1],[2,0],[-2,0],[0,-1],[1,-1],[-1,-1]]
  ],
  S: [
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[-1,-1],[1,-1],[-2,0],[2,0],[0,1],[-1,1],[1,1]],
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[1,1],[-1,1],[2,0],[-2,0],[0,-1],[1,-1],[-1,-1]]
  ],
  Z: [
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[-1,-1],[1,-1],[-2,0],[2,0],[0,1],[-1,1],[1,1]],
    [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,1]],
    [[0,0],[1,1],[-1,1],[2,0],[-2,0],[0,-1],[1,-1],[-1,-1]]
  ]
};

const LEVEL_SPEEDS = [800, 720, 630, 540, 450, 360, 280, 210, 150, 110, 80, 70, 60, 50, 40];
const LOCK_DELAY_MS = 500;

interface ActivePiece {
  type: TetrominoType;
  rotation: number;
  x: number;
  y: number;
}

type GridCell = { type: TetrominoType } | null;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id?: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export default function TetraMatrixGame({ gameId, onGameOver }: TetraMatrixGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [grid, setGrid] = useState<GridCell[][]>(() => Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null)));
  const [currentPiece, setCurrentPiece] = useState<ActivePiece | null>(null);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [combo, setCombo] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Refs for 60fps loop & event listeners
  const gridRef = useRef<GridCell[][]>(grid);
  gridRef.current = grid;
  const currentPieceRef = useRef<ActivePiece | null>(currentPiece);
  currentPieceRef.current = currentPiece;
  const bagRef = useRef<TetrominoType[]>([]);
  const nextQueueRef = useRef<TetrominoType[]>(nextQueue);
  nextQueueRef.current = nextQueue;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const levelRef = useRef(level);
  levelRef.current = level;
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const canHoldRef = useRef(canHold);
  canHoldRef.current = canHold;
  const holdPieceRef = useRef(holdPiece);
  holdPieceRef.current = holdPiece;

  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('breakhub_tetra_highscore');
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Audio Synth
  const playSound = useCallback((type: 'move' | 'rotate' | 'drop' | 'clear' | 'tetra' | 'over' | 'hold') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.04);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'rotate') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'drop') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'tetra') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.setValueAtTime(f, now + i * 0.06);
          g.gain.setValueAtTime(0.2, now + i * 0.06);
          g.gain.linearRampToValueAtTime(0.01, now + i * 0.06 + 0.2);
          o.start(now + i * 0.06);
          o.stop(now + i * 0.06 + 0.2);
        });
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {}
  }, [soundEnabled]);

  const addFloatingText = (x: number, y: number, text: string, color = '#FFE600') => {
    floatingTextsRef.current.push({ x, y, text, color, alpha: 1, vy: -1.2 });
  };

  // 7-Bag
  const getNextPiece = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) {
      const bag = [...PIECE_TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      bagRef.current = bag;
    }
    return bagRef.current.pop()!;
  }, []);

  const isValidPosition = useCallback((piece: ActivePiece, currentGrid: GridCell[][] = gridRef.current): boolean => {
    const shape = TETROMINOES[piece.type].shapes[piece.rotation];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const gx = piece.x + c;
          const gy = piece.y + r;
          if (gx < 0 || gx >= COLS || gy >= TOTAL_ROWS) return false;
          if (gy >= 0 && currentGrid[gy][gx] !== null) return false;
        }
      }
    }
    return true;
  }, []);

  const getGhostY = useCallback((piece: ActivePiece | null): number => {
    if (!piece) return 0;
    let gy = piece.y;
    while (isValidPosition({ ...piece, y: gy + 1 })) gy++;
    return gy;
  }, [isValidPosition]);

  const spawnPiece = useCallback((type?: TetrominoType) => {
    let t = type;
    let queue = [...nextQueueRef.current];
    if (!t) {
      t = queue.shift() || getNextPiece();
      while (queue.length < 3) queue.push(getNextPiece());
      setNextQueue(queue);
      nextQueueRef.current = queue;
    }

    const shape = TETROMINOES[t].shapes[0];
    const startX = Math.floor((COLS - shape[0].length) / 2);
    const startY = t === 'I' ? -1 : 0;
    const newPiece: ActivePiece = { type: t, rotation: 0, x: startX, y: startY };

    if (!isValidPosition(newPiece, gridRef.current)) {
      setIsGameOver(true);
      isGameOverRef.current = true;
      setIsPlaying(false);
      isPlayingRef.current = false;
      playSound('over');
      const final = scoreRef.current;
      onGameOver(final);
      if (final > highScore) {
        setHighScore(final);
        try { localStorage.setItem('breakhub_tetra_highscore', String(final)); } catch {}
      }
      return;
    }

    setCurrentPiece(newPiece);
    currentPieceRef.current = newPiece;
    setCanHold(true);
    canHoldRef.current = true;
  }, [getNextPiece, isValidPosition, onGameOver, playSound, highScore]);

  // Clear Lines
  const clearLines = useCallback((newGrid: GridCell[][]) => {
    const fullRows: number[] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (newGrid[r].every(cell => cell !== null)) fullRows.push(r);
    }

    const linesCleared = fullRows.length;
    if (linesCleared === 0) {
      setCombo(0);
      comboRef.current = 0;
      setGrid(newGrid);
      gridRef.current = newGrid;
      spawnPiece();
      return;
    }

    const curLevel = levelRef.current;
    let basePts = 0;
    let label = '';
    if (linesCleared === 1) { basePts = 100 * curLevel; label = 'SINGLE'; }
    else if (linesCleared === 2) { basePts = 300 * curLevel; label = 'DOUBLE'; }
    else if (linesCleared === 3) { basePts = 500 * curLevel; label = 'TRIPLE'; }
    else if (linesCleared === 4) { basePts = 800 * curLevel; label = 'TETRIS!'; }

    const curCombo = comboRef.current + 1;
    setCombo(curCombo);
    comboRef.current = curCombo;

    const totalPts = basePts + (curCombo - 1) * 50 * curLevel;
    const newScore = scoreRef.current + totalPts;
    const newLines = linesRef.current + linesCleared;
    const newLevel = Math.floor(newLines / 10) + 1;

    setScore(newScore);
    scoreRef.current = newScore;
    setLines(newLines);
    linesRef.current = newLines;
    setLevel(newLevel);
    levelRef.current = newLevel;

    if (linesCleared === 4) {
      playSound('tetra');
      try { confetti({ particleCount: 100, spread: 90 }); } catch {}
      addFloatingText(CANVAS_WIDTH / 2, 200, 'TETRIS!', '#00F0FF');
    } else {
      playSound('clear');
      addFloatingText(CANVAS_WIDTH / 2, 200, label, '#FFE600');
    }

    setTimeout(() => {
      const rem = newGrid.filter((_, idx) => !fullRows.includes(idx));
      const empty = TOTAL_ROWS - rem.length;
      const collapsed = [...Array.from({ length: empty }, () => Array(COLS).fill(null)), ...rem];
      setGrid(collapsed);
      gridRef.current = collapsed;
      spawnPiece();
    }, 200);
  }, [spawnPiece, playSound]);

  const lockPiece = useCallback((piece: ActivePiece = currentPieceRef.current!) => {
    if (!piece) return;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }

    const shape = TETROMINOES[piece.type].shapes[piece.rotation];
    const grid = gridRef.current.map(row => [...row]);

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const gx = piece.x + c;
          const gy = piece.y + r;
          if (gy >= 0 && gy < TOTAL_ROWS && gx >= 0 && gx < COLS) {
            grid[gy][gx] = { type: piece.type };
          }
        }
      }
    }

    setCurrentPiece(null);
    currentPieceRef.current = null;
    clearLines(grid);
  }, [clearLines]);

  const moveHorizontal = useCallback((dir: -1 | 1) => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
    const p = currentPieceRef.current;
    if (!p) return;
    const next = { ...p, x: p.x + dir };
    if (isValidPosition(next)) {
      setCurrentPiece(next);
      currentPieceRef.current = next;
      playSound('move');
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }
    }
  }, [isValidPosition, playSound]);

  const rotatePiece = useCallback((dir: 1 | -1 = 1) => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
    const p = currentPieceRef.current;
    if (!p) return;

    const count = TETROMINOES[p.type].shapes.length;
    const oldRot = p.rotation;
    const newRot = (oldRot + dir + count) % count;
    const kickIdx = dir === 1 ? oldRot : newRot;
    const kicks = WALL_KICK_TABLE[p.type][kickIdx] || [[0, 0]];

    for (const [ox, oy] of kicks) {
      const testP = { ...p, rotation: newRot, x: p.x + ox, y: p.y + oy };
      if (isValidPosition(testP)) {
        setCurrentPiece(testP);
        currentPieceRef.current = testP;
        playSound('rotate');
        if (lockTimerRef.current) {
          clearTimeout(lockTimerRef.current);
          lockTimerRef.current = null;
        }
        return;
      }
    }
  }, [isValidPosition, playSound]);

  const softDrop = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
    const p = currentPieceRef.current;
    if (!p) return;
    const next = { ...p, y: p.y + 1 };
    if (isValidPosition(next)) {
      setCurrentPiece(next);
      currentPieceRef.current = next;
      setScore(s => s + 1);
      scoreRef.current += 1;
      playSound('move');
    } else {
      lockPiece(p);
    }
  }, [isValidPosition, lockPiece, playSound]);

  const hardDrop = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
    const p = currentPieceRef.current;
    if (!p) return;
    const gy = getGhostY(p);
    const dist = gy - p.y;
    const dropped = { ...p, y: gy };

    if (dist > 0) {
      setScore(s => s + dist * 2);
      scoreRef.current += dist * 2;
    }
    playSound('drop');
    lockPiece(dropped);
  }, [getGhostY, lockPiece, playSound]);

  const holdCurrentPiece = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current || !canHoldRef.current) return;
    const p = currentPieceRef.current;
    if (!p) return;

    playSound('hold');
    const curType = p.type;
    const prevHold = holdPieceRef.current;
    setHoldPiece(curType);
    holdPieceRef.current = curType;
    setCanHold(false);
    canHoldRef.current = false;

    if (prevHold) spawnPiece(prevHold);
    else spawnPiece();
  }, [spawnPiece, playSound]);

  const startNewGame = useCallback(() => {
    const empty = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
    setGrid(empty);
    gridRef.current = empty;
    bagRef.current = [];
    setHoldPiece(null);
    holdPieceRef.current = null;
    setCanHold(true);
    canHoldRef.current = true;
    setScore(0);
    scoreRef.current = 0;
    setLines(0);
    linesRef.current = 0;
    setLevel(1);
    levelRef.current = 1;
    setCombo(0);
    comboRef.current = 0;
    setIsGameOver(false);
    isGameOverRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setIsPlaying(true);
    isPlayingRef.current = true;

    const q = [getNextPiece(), getNextPiece(), getNextPiece()];
    setNextQueue(q);
    nextQueueRef.current = q;
    spawnPiece();
  }, [getNextPiece, spawnPiece]);

  // Gravity Loop
  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) return;
    const speed = LEVEL_SPEEDS[Math.min(level - 1, LEVEL_SPEEDS.length - 1)];
    const timer = setInterval(() => {
      const p = currentPieceRef.current;
      if (!p) return;
      const next = { ...p, y: p.y + 1 };
      if (isValidPosition(next, gridRef.current)) {
        setCurrentPiece(next);
        currentPieceRef.current = next;
        if (lockTimerRef.current) {
          clearTimeout(lockTimerRef.current);
          lockTimerRef.current = null;
        }
      } else {
        if (!lockTimerRef.current) {
          lockTimerRef.current = setTimeout(() => {
            if (currentPieceRef.current) lockPiece(currentPieceRef.current);
          }, LOCK_DELAY_MS);
        }
      }
    }, speed);
    return () => clearInterval(timer);
  }, [isPlaying, isPaused, isGameOver, level, isValidPosition, lockPiece]);

  // Auto-start on mount
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Keyboard controls bound securely with e.preventDefault()
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) {
        if (e.key === 'r' || e.key === 'R') startNewGame();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a') moveHorizontal(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') moveHorizontal(1);
      if (e.key === 'ArrowDown' || e.key === 's') softDrop();
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'x') rotatePiece(1);
      if (e.key === 'z') rotatePiece(-1);
      if (e.key === ' ') hardDrop();
      if (e.key === 'c' || e.key === 'Shift') holdCurrentPiece();
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startNewGame, moveHorizontal, rotatePiece, softDrop, hardDrop, holdCurrentPiece]);

  // 60fps HTML5 Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;
    const render = () => {
      if (!active) return;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background Gradient
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bg.addColorStop(0, '#090014');
      bg.addColorStop(0.5, '#1B0033');
      bg.addColorStop(1, '#08000D');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cyber Grid
      ctx.strokeStyle = '#2A1C54';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += BLOCK_SIZE) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += BLOCK_SIZE) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
      }

      // Playfield Border Frame
      const boardX = (CANVAS_WIDTH - COLS * BLOCK_SIZE) / 2;
      const boardY = 15;
      ctx.fillStyle = 'rgba(4, 2, 14, 0.9)';
      ctx.fillRect(boardX, boardY, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      ctx.strokeRect(boardX, boardY, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);

      // Render Locked Grid
      const grid = gridRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = grid[r][c];
          if (cell) {
            const def = TETROMINOES[cell.type];
            const bx = boardX + c * BLOCK_SIZE;
            const by = boardY + r * BLOCK_SIZE;
            ctx.fillStyle = def.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx + 1, by + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 4);
            ctx.fill();
            ctx.stroke();
          }
        }
      }

      // Render Ghost Piece
      const cp = currentPieceRef.current;
      if (cp) {
        const gy = getGhostY(cp);
        const shape = TETROMINOES[cp.type].shapes[cp.rotation];
        const def = TETROMINOES[cp.type];
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] !== 0) {
              const gx = cp.x + c;
              const gRow = gy + r;
              if (gRow >= 0 && gRow < ROWS) {
                const bx = boardX + gx * BLOCK_SIZE;
                const by = boardY + gRow * BLOCK_SIZE;
                ctx.strokeStyle = def.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(bx + 2, by + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
                ctx.setLineDash([]);
              }
            }
          }
        }

        // Render Active Piece
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] !== 0) {
              const gx = cp.x + c;
              const gRow = cp.y + r;
              if (gRow >= 0 && gRow < ROWS) {
                const bx = boardX + gx * BLOCK_SIZE;
                const by = boardY + gRow * BLOCK_SIZE;
                ctx.fillStyle = def.color;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(bx + 1, by + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 4);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.roundRect(bx + 3, by + 3, BLOCK_SIZE - 10, 6, 2);
                ctx.fill();
              }
            }
          }
        }
      }

      // Floating Texts
      const fts = floatingTextsRef.current;
      for (let i = fts.length - 1; i >= 0; i--) {
        const ft = fts[i];
        ft.y += ft.vy; ft.alpha -= 0.02;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
        if (ft.alpha <= 0) fts.splice(i, 1);
      }

      requestAnimationFrame(render);
    };

    render();
    return () => { active = false; };
  }, [getGhostY]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onClick={() => containerRef.current?.focus()}
      className="flex flex-col items-center justify-center w-full h-full flex-1 select-none font-mono text-slate-100 outline-none p-2"
    >
      {/* Top HUD */}
      <div className="w-[380px] flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border-2 border-black mb-1.5 shadow-neo-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-portal-cyan" />
          <span className="text-xs font-black text-portal-neon">LVL {level}</span>
          <span className="text-sm font-black text-portal-yellow">{score.toLocaleString()} PTS</span>
        </div>
        <div className="flex items-center gap-2 bg-black/50 px-2.5 py-0.5 rounded-lg border border-portal-border">
          <Zap className="w-3.5 h-3.5 text-portal-gold" />
          <span className="text-xs font-black text-white">{lines} LINES</span>
        </div>
        <button
          type="button"
          onFocus={e => e.currentTarget.blur()}
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-card text-slate-300 hover:text-white border border-black"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-portal-cyan" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Playfield & Non-Overlapping Control Deck */}
      <div className="flex flex-col items-center w-[380px] bg-[#08000D] rounded-2xl border-4 border-black shadow-[6px_6px_0px_#000] p-2">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="cursor-default rounded-xl border-2 border-black bg-[#04020E]"
        />

        {/* Clean Non-Overlapping Bottom Touch & Action Bar */}
        <div className="w-full flex items-center justify-between mt-2 pt-2 border-t-2 border-black/50 px-1">
          <button
            type="button"
            onFocus={e => e.currentTarget.blur()}
            onClick={() => holdCurrentPiece()}
            className="px-3 py-2 rounded-xl bg-portal-pink text-black font-black text-xs border-2 border-black shadow-neo-sm active:scale-95 transition-transform"
          >
            HOLD [C]
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onFocus={e => e.currentTarget.blur()}
              onClick={() => moveHorizontal(-1)}
              className="w-9 h-9 rounded-lg bg-portal-card text-white font-black border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
            >
              ←
            </button>
            <button
              type="button"
              onFocus={e => e.currentTarget.blur()}
              onClick={() => rotatePiece(1)}
              className="w-9 h-9 rounded-lg bg-portal-card text-white font-black border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
            >
              ⟳
            </button>
            <button
              type="button"
              onFocus={e => e.currentTarget.blur()}
              onClick={() => softDrop()}
              className="w-9 h-9 rounded-lg bg-portal-card text-white font-black border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
            >
              ↓
            </button>
            <button
              type="button"
              onFocus={e => e.currentTarget.blur()}
              onClick={() => moveHorizontal(1)}
              className="w-9 h-9 rounded-lg bg-portal-card text-white font-black border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
            >
              →
            </button>
            <button
              type="button"
              onFocus={e => e.currentTarget.blur()}
              onClick={() => hardDrop()}
              className="px-3 h-9 rounded-lg bg-portal-yellow text-black font-black text-xs border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
            >
              DROP
            </button>
          </div>
        </div>
      </div>

      {/* Game Over / Pause Overlays */}
      {isGameOver && (
        <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-500 text-white border-2 border-black">
            MATRIX BREACH
          </span>
          <h3 className="text-2xl font-black text-white">Game Over</h3>
          <div className="text-3xl font-black text-portal-yellow">{score.toLocaleString()} PTS</div>
          <button
            type="button"
            onFocus={e => e.currentTarget.blur()}
            onClick={() => startNewGame()}
            className="py-3 px-8 rounded-xl bg-portal-neon text-black font-black text-xs border-2 border-black shadow-neo-sm active:scale-95 transition-all"
          >
            RETRY MATRIX
          </button>
        </div>
      )}
    </div>
  );
}
