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
  Gamepad2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TetraMatrixGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

// 10 Columns x 20 Visible Rows Matrix (Zero hidden buffer rows for immediate visibility)
const COLS = 10;
const ROWS = 20;
const TOTAL_ROWS = ROWS;
const BUFFER_ROWS = 0;

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface PieceDefinition {
  type: TetrominoType;
  color: string;
  bgClass: string;
  borderClass: string;
  glowColor: string;
  shapes: number[][][]; // 4 rotation states
}

// Complete Standard Polyomino Geometries & Rotation Matrices
const TETROMINOES: Record<TetrominoType, PieceDefinition> = {
  I: {
    type: 'I',
    color: '#00F0FF',
    bgClass: 'bg-portal-cyan',
    borderClass: 'border-cyan-300',
    glowColor: 'rgba(0, 240, 255, 0.6)',
    shapes: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0]
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0]
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0]
      ]
    ]
  },
  O: {
    type: 'O',
    color: '#FFDE59',
    bgClass: 'bg-portal-yellow',
    borderClass: 'border-yellow-200',
    glowColor: 'rgba(255, 222, 89, 0.6)',
    shapes: [
      [
        [1, 1],
        [1, 1]
      ],
      [
        [1, 1],
        [1, 1]
      ],
      [
        [1, 1],
        [1, 1]
      ],
      [
        [1, 1],
        [1, 1]
      ]
    ]
  },
  T: {
    type: 'T',
    color: '#FF0080',
    bgClass: 'bg-portal-pink',
    borderClass: 'border-pink-300',
    glowColor: 'rgba(255, 0, 128, 0.6)',
    shapes: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0]
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0]
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    ]
  },
  S: {
    type: 'S',
    color: '#00FF66',
    bgClass: 'bg-portal-lime',
    borderClass: 'border-emerald-300',
    glowColor: 'rgba(0, 255, 102, 0.6)',
    shapes: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1]
      ],
      [
        [0, 0, 0],
        [0, 1, 1],
        [1, 1, 0]
      ],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    ]
  },
  Z: {
    type: 'Z',
    color: '#FF3366',
    bgClass: 'bg-rose-500',
    borderClass: 'border-rose-300',
    glowColor: 'rgba(255, 51, 102, 0.6)',
    shapes: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0]
      ],
      [
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 1]
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0]
      ]
    ]
  },
  J: {
    type: 'J',
    color: '#3B82F6',
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-300',
    glowColor: 'rgba(59, 130, 246, 0.6)',
    shapes: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0]
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1]
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0]
      ]
    ]
  },
  L: {
    type: 'L',
    color: '#FF8800',
    bgClass: 'bg-orange-500',
    borderClass: 'border-orange-300',
    glowColor: 'rgba(255, 136, 0, 0.6)',
    shapes: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1]
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0]
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0]
      ]
    ]
  }
};

const PIECE_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Wall kick test offsets for SRS rotation
const WALL_KICK_OFFSETS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
  [-2, 0],
  [2, 0],
  [0, 1]
];

// Drop speed based on level (ms)
const LEVEL_SPEEDS = [
  800, 720, 630, 540, 450, 360, 280, 210, 150, 110, 80, 70, 60, 50, 40
];

interface ActivePiece {
  type: TetrominoType;
  rotation: number;
  x: number;
  y: number;
}

type GridCell = {
  type: TetrominoType;
  color: string;
  glowColor: string;
} | null;

export default function TetraMatrixGame({ gameId, onGameOver }: TetraMatrixGameProps) {
  // Game State
  const [grid, setGrid] = useState<GridCell[][]>(() =>
    Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<ActivePiece | null>(null);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [combo, setCombo] = useState<number>(0);
  const [backToBack, setBackToBack] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [flashRows, setFlashRows] = useState<number[]>([]);
  const [calloutText, setCalloutText] = useState<{ text: string; color: string; id: number } | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sound Synthesizer via Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playTetraSound = useCallback((type: 'move' | 'rotate' | 'softDrop' | 'hardDrop' | 'hold' | 'single' | 'double' | 'triple' | 'tetra' | 'levelUp' | 'gameOver') => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'move') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'rotate') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.06);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'softDrop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.03);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'hardDrop') {
        // Heavy Sub-Bass Impact Detonation
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'hold') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'single' || type === 'double') {
        [523.25, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          gain.gain.setValueAtTime(0.12, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.18);
        });
      } else if (type === 'triple') {
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.15, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.22);
        });
      } else if (type === 'tetra') {
        // 4-Note Triumphant Quad Clear Fanfare + Synth Blast
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.2, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.35);
        });
      } else if (type === 'levelUp') {
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.15, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.25);
        });
      } else if (type === 'gameOver') {
        [320, 280, 220, 140].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.16, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.3);
        });
      }
    } catch {}
  }, [soundEnabled, getAudioContext]);

  // Synchronized Refs to avoid stale React closures during animation and tick loops
  const gridRef = useRef<GridCell[][]>(grid);
  gridRef.current = grid;
  const currentPieceRef = useRef<ActivePiece | null>(currentPiece);
  currentPieceRef.current = currentPiece;
  const bagRef = useRef<TetrominoType[]>([]);
  const nextQueueRef = useRef<TetrominoType[]>(nextQueue);
  nextQueueRef.current = nextQueue;
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;
  const isGameOverRef = useRef<boolean>(isGameOver);
  isGameOverRef.current = isGameOver;
  const scoreRef = useRef<number>(score);
  scoreRef.current = score;
  const linesRef = useRef<number>(lines);
  linesRef.current = lines;
  const levelRef = useRef<number>(level);
  levelRef.current = level;
  const comboRef = useRef<number>(combo);
  comboRef.current = combo;
  const backToBackRef = useRef<boolean>(backToBack);
  backToBackRef.current = backToBack;
  const canHoldRef = useRef<boolean>(canHold);
  canHoldRef.current = canHold;
  const holdPieceRef = useRef<TetrominoType | null>(holdPiece);
  holdPieceRef.current = holdPiece;
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load High Score on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stressbuster_tetra_matrix_highscore');
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // 7-Bag Randomizer generator
  const getNextPieceFromBag = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) {
      // Create and shuffle a fresh 7-bag
      const newBag = [...PIECE_TYPES];
      for (let i = newBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
      }
      bagRef.current = newBag;
    }
    return bagRef.current.pop()!;
  }, []);

  // Collision detection helper
  const isValidPosition = useCallback(
    (piece: ActivePiece, currentGrid: GridCell[][] = gridRef.current): boolean => {
      const shape = TETROMINOES[piece.type].shapes[piece.rotation];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            const gridX = piece.x + c;
            const gridY = piece.y + r;

            // Check boundary bounds
            if (gridX < 0 || gridX >= COLS || gridY >= TOTAL_ROWS) {
              return false;
            }

            // Check locked blocks (ignore gridY < 0 above ceiling)
            if (gridY >= 0 && currentGrid[gridY][gridX] !== null) {
              return false;
            }
          }
        }
      }
      return true;
    },
    []
  );

  // Calculate Ghost Piece position (Hard Drop projection)
  const getGhostY = useCallback(
    (piece: ActivePiece | null, currentGrid: GridCell[][] = gridRef.current): number => {
      if (!piece) return 0;
      let ghostY = piece.y;
      while (
        isValidPosition({ ...piece, y: ghostY + 1 }, currentGrid)
      ) {
        ghostY++;
      }
      return ghostY;
    },
    [isValidPosition]
  );

  // Spawn a new Tetromino
  const spawnPiece = useCallback(
    (type?: TetrominoType) => {
      let pieceType = type;
      let newQueue = [...nextQueueRef.current];

      if (!pieceType) {
        // Pop first from queue and replenish
        pieceType = newQueue.shift() || getNextPieceFromBag();
        while (newQueue.length < 3) {
          newQueue.push(getNextPieceFromBag());
        }
        setNextQueue(newQueue);
        nextQueueRef.current = newQueue;
      }

      const shape = TETROMINOES[pieceType].shapes[0];
      const startX = Math.floor((COLS - shape[0].length) / 2);
      const startY = pieceType === 'I' ? -1 : 0;

      const newPiece: ActivePiece = {
        type: pieceType,
        rotation: 0,
        x: startX,
        y: startY
      };

      if (!isValidPosition(newPiece, gridRef.current)) {
        // Game Over!
        setIsGameOver(true);
        isGameOverRef.current = true;
        setIsPlaying(false);
        isPlayingRef.current = false;
        playTetraSound('gameOver');
        const final = scoreRef.current;
        if (final > 0) {
          onGameOver(final);
          if (final > highScore) {
            setHighScore(final);
            try {
              localStorage.setItem('stressbuster_tetra_matrix_highscore', String(final));
            } catch {}
          }
        }
        return;
      }

      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
      setCanHold(true);
      canHoldRef.current = true;
    },
    [getNextPieceFromBag, isValidPosition, onGameOver, playTetraSound, highScore]
  );

  // Clear completed rows, award points & combos
  const clearLines = useCallback(
    (newGrid: GridCell[][]) => {
      const fullRowIndices: number[] = [];

      for (let r = 0; r < TOTAL_ROWS; r++) {
        if (newGrid[r].every(cell => cell !== null)) {
          fullRowIndices.push(r);
        }
      }

      if (fullRowIndices.length === 0) {
        // No lines cleared -> reset combo
        setCombo(0);
        comboRef.current = 0;
        setGrid(newGrid);
        gridRef.current = newGrid;
        spawnPiece();
        return;
      }

      // Flash rows animation
      setFlashRows(fullRowIndices);

      const linesCleared = fullRowIndices.length;
      const curLevel = levelRef.current;
      const isTetra = linesCleared === 4;
      const isB2B = isTetra && backToBackRef.current;

      // Base scoring: Single=100, Double=300, Triple=500, Tetra=800
      let basePoints = 0;
      if (linesCleared === 1) basePoints = 100 * curLevel;
      else if (linesCleared === 2) basePoints = 300 * curLevel;
      else if (linesCleared === 3) basePoints = 500 * curLevel;
      else if (linesCleared === 4) basePoints = 800 * curLevel;

      if (isB2B) {
        basePoints = Math.floor(basePoints * 1.5);
      }

      const curCombo = comboRef.current + 1;
      setCombo(curCombo);
      comboRef.current = curCombo;

      const comboBonus = (curCombo - 1) * 50 * curLevel;
      const totalPoints = basePoints + comboBonus;

      const updatedScore = scoreRef.current + totalPoints;
      const updatedLines = linesRef.current + linesCleared;
      const newLevel = Math.floor(updatedLines / 10) + 1;

      setScore(updatedScore);
      scoreRef.current = updatedScore;
      setLines(updatedLines);
      linesRef.current = updatedLines;

      if (newLevel > curLevel) {
        setLevel(newLevel);
        levelRef.current = newLevel;
        playTetraSound('levelUp');
      }

      if (isTetra) {
        setBackToBack(true);
        backToBackRef.current = true;
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 300);
        playTetraSound('tetra');

        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}

        setCalloutText({
          text: isB2B ? '⚡ B2B TETRA MATRIX! (+1.5x)' : '🔥 TETRA MATRIX! (+800)',
          color: 'text-portal-yellow',
          id: Date.now()
        });
      } else {
        if (linesCleared === 3) {
          playTetraSound('triple');
          setCalloutText({ text: 'TRIPLE CLEAR! (+500)', color: 'text-portal-pink', id: Date.now() });
        } else if (linesCleared === 2) {
          playTetraSound('double');
          setCalloutText({ text: 'DOUBLE CLEAR! (+300)', color: 'text-portal-cyan', id: Date.now() });
        } else {
          playTetraSound('single');
          setCalloutText({ text: 'SINGLE (+100)', color: 'text-portal-lime', id: Date.now() });
        }
        setBackToBack(false);
        backToBackRef.current = false;
      }

      setTimeout(() => {
        // Collapse cleared rows
        const remainingRows = newGrid.filter((_, idx) => !fullRowIndices.includes(idx));
        const emptyRowsNeeded = TOTAL_ROWS - remainingRows.length;
        const collapsedGrid = [
          ...Array.from({ length: emptyRowsNeeded }, () => Array(COLS).fill(null)),
          ...remainingRows
        ];

        setFlashRows([]);
        setGrid(collapsedGrid);
        gridRef.current = collapsedGrid;
        spawnPiece();
      }, 160);
    },
    [spawnPiece, playTetraSound]
  );

  // Lock active piece into the grid
  const lockPiece = useCallback(
    (pieceToLock: ActivePiece = currentPieceRef.current!) => {
      if (!pieceToLock) return;

      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }

      const shape = TETROMINOES[pieceToLock.type].shapes[pieceToLock.rotation];
      const newGrid = gridRef.current.map(row => [...row]);
      const def = TETROMINOES[pieceToLock.type];

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            const gridX = pieceToLock.x + c;
            const gridY = pieceToLock.y + r;
            if (gridY >= 0 && gridY < TOTAL_ROWS && gridX >= 0 && gridX < COLS) {
              newGrid[gridY][gridX] = {
                type: pieceToLock.type,
                color: def.color,
                glowColor: def.glowColor
              };
            }
          }
        }
      }

      setCurrentPiece(null);
      currentPieceRef.current = null;
      clearLines(newGrid);
    },
    [clearLines]
  );

  // Move piece left or right
  const moveHorizontal = useCallback(
    (dir: -1 | 1) => {
      if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
      const piece = currentPieceRef.current;
      if (!piece) return;

      const newPiece: ActivePiece = { ...piece, x: piece.x + dir };
      if (isValidPosition(newPiece)) {
        setCurrentPiece(newPiece);
        currentPieceRef.current = newPiece;
        playTetraSound('move');
      }
    },
    [isValidPosition, playTetraSound]
  );

  // Rotate piece (clockwise = 1, counter-clockwise = -1)
  const rotatePiece = useCallback(
    (dir: 1 | -1 = 1) => {
      if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
      const piece = currentPieceRef.current;
      if (!piece) return;

      const shapesCount = TETROMINOES[piece.type].shapes.length;
      const newRotation = (piece.rotation + dir + shapesCount) % shapesCount;

      // Try wall kicks
      for (const [offsetX, offsetY] of WALL_KICK_OFFSETS) {
        const kickPiece: ActivePiece = {
          ...piece,
          rotation: newRotation,
          x: piece.x + offsetX,
          y: piece.y + offsetY
        };

        if (isValidPosition(kickPiece)) {
          setCurrentPiece(kickPiece);
          currentPieceRef.current = kickPiece;
          playTetraSound('rotate');
          return;
        }
      }
    },
    [isValidPosition, playTetraSound]
  );

  // Soft drop (move down 1 step + award 1 score point)
  const softDrop = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
    const piece = currentPieceRef.current;
    if (!piece) return;

    const newPiece: ActivePiece = { ...piece, y: piece.y + 1 };
    if (isValidPosition(newPiece)) {
      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
      setScore(prev => prev + 1);
      scoreRef.current += 1;
      playTetraSound('softDrop');
    } else {
      // Hit bottom or stack
      lockPiece(piece);
    }
  }, [isValidPosition, lockPiece, playTetraSound]);

  // Hard drop (instant drop to bottom + award 2 score points per row dropped)
  const hardDrop = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
    const piece = currentPieceRef.current;
    if (!piece) return;

    const ghostY = getGhostY(piece);
    const dropDistance = ghostY - piece.y;
    const droppedPiece: ActivePiece = { ...piece, y: ghostY };

    if (dropDistance > 0) {
      setScore(prev => prev + dropDistance * 2);
      scoreRef.current += dropDistance * 2;
    }

    playTetraSound('hardDrop');
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 150);

    lockPiece(droppedPiece);
  }, [getGhostY, lockPiece, playTetraSound]);

  // Hold piece swap
  const holdCurrentPiece = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;
    if (!canHoldRef.current) return;
    const piece = currentPieceRef.current;
    if (!piece) return;

    playTetraSound('hold');
    const currentType = piece.type;
    const prevHold = holdPieceRef.current;

    setHoldPiece(currentType);
    holdPieceRef.current = currentType;
    setCanHold(false);
    canHoldRef.current = false;

    if (prevHold) {
      spawnPiece(prevHold);
    } else {
      spawnPiece();
    }
  }, [spawnPiece, playTetraSound]);

  // Start / Restart Game
  const startNewGame = useCallback(() => {
    const emptyGrid = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
    setGrid(emptyGrid);
    gridRef.current = emptyGrid;
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
    setBackToBack(false);
    backToBackRef.current = false;
    setIsGameOver(false);
    isGameOverRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setIsPlaying(true);
    isPlayingRef.current = true;
    setCalloutText(null);

    // Fill initial queue
    const initialQueue = [getNextPieceFromBag(), getNextPieceFromBag(), getNextPieceFromBag()];
    setNextQueue(initialQueue);
    nextQueueRef.current = initialQueue;

    // Spawn first piece
    const firstPieceType = initialQueue.shift() || getNextPieceFromBag();
    initialQueue.push(getNextPieceFromBag());
    setNextQueue(initialQueue);
    nextQueueRef.current = initialQueue;

    const shape = TETROMINOES[firstPieceType].shapes[0];
    const startX = Math.floor((COLS - shape[0].length) / 2);
    const startY = firstPieceType === 'I' ? -1 : 0;
    const newPiece: ActivePiece = {
      type: firstPieceType,
      rotation: 0,
      x: startX,
      y: startY
    };
    setCurrentPiece(newPiece);
    currentPieceRef.current = newPiece;

    playTetraSound('rotate');
  }, [getNextPieceFromBag, playTetraSound]);

  // Game Gravity Tick Loop
  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) return;

    const currentSpeed = LEVEL_SPEEDS[Math.min(level - 1, LEVEL_SPEEDS.length - 1)];
    const interval = setInterval(() => {
      const piece = currentPieceRef.current;
      if (!piece) return;

      const nextPiece: ActivePiece = { ...piece, y: piece.y + 1 };
      if (isValidPosition(nextPiece, gridRef.current)) {
        setCurrentPiece(nextPiece);
        currentPieceRef.current = nextPiece;
      } else {
        // Start lock sequence
        lockPiece(piece);
      }
    }, currentSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, isGameOver, level, isValidPosition, lockPiece]);

  // Synchronized Handlers in Refs to eliminate keyboard listener teardown churn
  const moveHorizontalRef = useRef(moveHorizontal);
  moveHorizontalRef.current = moveHorizontal;
  const rotatePieceRef = useRef(rotatePiece);
  rotatePieceRef.current = rotatePiece;
  const softDropRef = useRef(softDrop);
  softDropRef.current = softDrop;
  const hardDropRef = useRef(hardDrop);
  hardDropRef.current = hardDrop;
  const holdCurrentPieceRef = useRef(holdCurrentPiece);
  holdCurrentPieceRef.current = holdCurrentPiece;
  const startNewGameRef = useRef(startNewGame);
  startNewGameRef.current = startNewGame;

  // Auto-start once on mount
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startNewGameRef.current();
    }
    containerRef.current?.focus();
  }, []);

  // Rock-Solid Capture-Phase Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a form input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key;
      const code = e.code;

      // Prevent default page scroll on navigation and game action keys
      const isGameControlKey =
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(key) ||
        ['w', 'a', 's', 'd', 'z', 'x', 'c', 'h', 'j', 'k', 'p', 'r', 'q', 'e', 'W', 'A', 'S', 'D', 'Z', 'X', 'C', 'H', 'J', 'K', 'P', 'R', 'Q', 'E'].includes(key) ||
        [
          'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
          'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyX', 'KeyZ', 'KeyC', 'KeyH', 'KeyP', 'KeyR', 'KeyK', 'KeyJ', 'KeyQ', 'KeyE',
          'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
          'Numpad8', 'Numpad2', 'Numpad4', 'Numpad6', 'Numpad5', 'Numpad0', 'Numpad3', 'Numpad7', 'Enter', 'NumpadEnter'
        ].includes(code);

      if (isGameControlKey) {
        e.preventDefault();
        e.stopPropagation();
      }

      // 1. Restart / Quick Start trigger (R, or Enter/Space when Game Over)
      if (
        key === 'r' || key === 'R' || code === 'KeyR' ||
        (isGameOverRef.current && (key === 'Enter' || code === 'Enter' || code === 'NumpadEnter' || key === ' ' || code === 'Space'))
      ) {
        startNewGameRef.current();
        return;
      }

      // 2. Pause / Resume trigger (P)
      if (key === 'p' || key === 'P' || code === 'KeyP') {
        if (isPlayingRef.current && !isGameOverRef.current) {
          setIsPaused(prev => !prev);
        }
        return;
      }

      // 3. Start Game if on splash screen and any action key is pressed
      if (!isPlayingRef.current) {
        if (
          key === ' ' || key === 'Enter' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowDown' || key === 'ArrowUp' ||
          code === 'Space' || code === 'Enter' || code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD'
        ) {
          startNewGameRef.current();
        }
        return;
      }

      // 4. If paused, pressing Space, Enter, or P resumes
      if (isPausedRef.current) {
        if (
          key === ' ' || key === 'Enter' || key === 'p' || key === 'P' ||
          code === 'Space' || code === 'Enter' || code === 'KeyP'
        ) {
          setIsPaused(false);
        }
        return;
      }

      // 5. If Game Over, ignore further movement
      if (isGameOverRef.current) return;

      // 6. Left Movement (ArrowLeft, A, Numpad 4)
      if (
        key === 'ArrowLeft' || key === 'a' || key === 'A' ||
        code === 'ArrowLeft' || code === 'KeyA' || code === 'Numpad4'
      ) {
        moveHorizontalRef.current(-1);
        return;
      }

      // 7. Right Movement (ArrowRight, D, Numpad 6)
      if (
        key === 'ArrowRight' || key === 'd' || key === 'D' ||
        code === 'ArrowRight' || code === 'KeyD' || code === 'Numpad6'
      ) {
        moveHorizontalRef.current(1);
        return;
      }

      // 8. Soft Drop (ArrowDown, S, Numpad 2)
      if (
        key === 'ArrowDown' || key === 's' || key === 'S' ||
        code === 'ArrowDown' || code === 'KeyS' || code === 'Numpad2'
      ) {
        softDropRef.current();
        return;
      }

      // 9. Rotate Clockwise (ArrowUp, W, X, K, E, Numpad 8, Numpad 5)
      if (
        key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'x' || key === 'X' || key === 'k' || key === 'K' || key === 'e' || key === 'E' ||
        code === 'ArrowUp' || code === 'KeyW' || code === 'KeyX' || code === 'KeyK' || code === 'KeyE' || code === 'Numpad8' || code === 'Numpad5'
      ) {
        rotatePieceRef.current(1);
        return;
      }

      // 10. Rotate Counter-Clockwise (Z, J, Q, Left/Right Control, Numpad 3, Numpad 7)
      if (
        key === 'z' || key === 'Z' || key === 'j' || key === 'J' || key === 'q' || key === 'Q' || key === 'Control' ||
        code === 'KeyZ' || code === 'KeyJ' || code === 'KeyQ' || code === 'ControlLeft' || code === 'ControlRight' || code === 'Numpad3' || code === 'Numpad7'
      ) {
        rotatePieceRef.current(-1);
        return;
      }

      // 11. Hard Drop Slam (Space, Numpad 0) - Disallow repeat spam
      if (key === ' ' || key === 'Spacebar' || code === 'Space' || code === 'Numpad0') {
        if (!e.repeat) {
          hardDropRef.current();
        }
        return;
      }

      // 12. Hold Piece Vault (C, Shift, H) - Disallow repeat spam
      if (
        key === 'c' || key === 'C' || key === 'Shift' || key === 'h' || key === 'H' ||
        code === 'KeyC' || code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyH'
      ) {
        if (!e.repeat) {
          holdCurrentPieceRef.current();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Calculate Ghost Piece for Rendering
  const ghostY = currentPiece ? getGhostY(currentPiece) : 0;
  const currentShape = currentPiece ? TETROMINOES[currentPiece.type].shapes[currentPiece.rotation] : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onClick={() => containerRef.current?.focus()}
      className={`w-full max-w-4xl mx-auto flex flex-col items-center select-none outline-none ${screenShake ? 'animate-bounce' : ''}`}
    >
      {/* Top Header Strip */}
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 mb-1.5 sm:mb-2 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-xl bg-portal-yellow text-black font-black text-[11px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Zap className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-black stroke-[2.5]" />
            <span>TETRA MATRIX</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-portal-card border-2 border-black text-[10px] sm:text-[11px] font-black text-portal-cyan uppercase">
            LVL {level}
          </span>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onFocus={e => e.currentTarget.blur()}
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1 sm:p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <VolumeX className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
          </button>
          {isPlaying && !isGameOver && (
            <button
              type="button"
              onFocus={e => e.currentTarget.blur()}
              onClick={() => setIsPaused(prev => !prev)}
              className="p-1 sm:p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all"
              title={isPaused ? 'Resume Game' : 'Pause Game'}
            >
              {isPaused ? <Play className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Pause className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            </button>
          )}
          <button
            type="button"
            onFocus={e => e.currentTarget.blur()}
            onClick={() => startNewGameRef.current()}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm font-black text-[10px] sm:text-xs uppercase transition-all"
          >
            <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span className="hidden xs:inline">RESET</span>
          </button>
        </div>
      </div>

      {/* Main Arena Layout: Flanking Wings on Mobile (< md), 3-Column on Desktop (md+) */}
      <div className="w-full flex items-center md:items-start justify-center gap-1.5 sm:gap-3 md:gap-4 lg:gap-6">
        {/* Mobile Left Wing (< md): Mini Hold + Score */}
        <div className="flex md:hidden flex-col items-center gap-1.5 w-[68px] min-[380px]:w-[78px] shrink-0">
          {/* Mini Hold Card with Direct Tap-to-Hold */}
          <button
            type="button"
            onFocus={e => e.currentTarget.blur()}
            onPointerDown={e => {
              e.preventDefault();
              holdCurrentPieceRef.current();
            }}
            className="w-full p-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm flex flex-col items-center active:scale-95 transition-transform touch-none"
            title="Tap to Hold Piece"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[8px] min-[380px]:text-[9px] font-black text-portal-pink uppercase flex items-center gap-0.5">
                <Layers className="w-2.5 h-2.5" /> HOLD
              </span>
              <span className="text-[7px] font-mono text-black bg-portal-yellow px-1 rounded border border-black font-black">
                TAP
              </span>
            </div>
            <div className="w-11 h-11 min-[380px]:w-13 min-[380px]:h-13 rounded-lg bg-black/80 border border-black/80 flex items-center justify-center mt-1 overflow-hidden">
              {holdPiece ? (
                <div
                  className="grid gap-0.5 p-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${TETROMINOES[holdPiece].shapes[0][0].length}, minmax(0, 1fr))`
                  }}
                >
                  {TETROMINOES[holdPiece].shapes[0].map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div
                        key={`m-hold-${rIdx}-${cIdx}`}
                        className={`w-2 h-2 min-[380px]:w-2.5 min-[380px]:h-2.5 rounded-[2px] border ${
                          val ? `${TETROMINOES[holdPiece].bgClass} border-black shadow-sm` : 'opacity-0'
                        }`}
                      />
                    ))
                  )}
                </div>
              ) : (
                <span className="text-[8px] text-slate-500 font-bold uppercase">EMPTY</span>
              )}
            </div>
          </button>

          {/* Mini Score Card */}
          <div className="w-full p-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm text-center">
            <span className="text-[7px] min-[380px]:text-[8px] font-black text-slate-400 uppercase block">SCORE</span>
            <p className="text-xs min-[380px]:text-sm font-black text-portal-yellow truncate leading-tight mt-0.5">
              {score.toLocaleString()}
            </p>
          </div>

          {/* Mini High Score Card */}
          <div className="w-full p-1 rounded-xl bg-portal-card border border-black text-center">
            <span className="text-[7px] font-black text-slate-400 uppercase block">BEST</span>
            <p className="text-[9px] min-[380px]:text-[10px] font-black text-portal-cyan truncate leading-tight">
              {highScore.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Desktop Left Column (md+): Full-size HOLD Piece & Tactical Stats */}
        <div className="hidden md:flex md:w-44 flex-col gap-3">
          {/* Hold Card */}
          <div className="p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-portal-pink" /> HOLD
              </span>
              <span className="text-[8px] font-mono text-black bg-portal-yellow px-1.5 py-0.2 rounded border border-black font-black">
                [C]
              </span>
            </div>
            <div className="w-20 h-20 rounded-xl bg-black/60 border-2 border-black/80 flex items-center justify-center relative overflow-hidden">
              {holdPiece ? (
                <div
                  className="grid gap-0.5 p-1"
                  style={{
                    gridTemplateColumns: `repeat(${TETROMINOES[holdPiece].shapes[0][0].length}, minmax(0, 1fr))`
                  }}
                >
                  {TETROMINOES[holdPiece].shapes[0].map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div
                        key={`hold-${rIdx}-${cIdx}`}
                        className={`w-4 h-4 rounded-sm border ${
                          val ? `${TETROMINOES[holdPiece].bgClass} border-black shadow-sm` : 'opacity-0'
                        }`}
                      />
                    ))
                  )}
                </div>
              ) : (
                <span className="text-[9px] text-slate-500 font-bold uppercase">EMPTY</span>
              )}
            </div>
          </div>

          {/* Stats Deck */}
          <div className="p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm space-y-2">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase">SCORE</span>
              <p className="text-xl font-black text-portal-yellow tracking-tight leading-tight">
                {score.toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-1 border-t border-black/40">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase">LINES</span>
                <p className="text-base font-black text-white">{lines}</p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase">TOP SCORE</span>
                <p className="text-base font-black text-portal-cyan">{highScore.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Primary 10x20 Matrix Canvas Viewport */}
        <div className="relative flex flex-col items-center">
          {/* Active Callout Overlay (Combo / Tetra Matrix Alert) */}
          {calloutText && (
            <div className="absolute -top-3 z-30 pointer-events-none animate-bounce">
              <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-black border-2 border-black font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-wider shadow-neo ${calloutText.color}`}>
                {calloutText.text}
              </span>
            </div>
          )}

          {/* Matrix Board */}
          <div className="relative p-1 sm:p-1.5 md:p-2 rounded-xl sm:rounded-2xl md:rounded-3xl bg-portal-surface border-2 sm:border-3 md:border-4 border-black shadow-neo-lg">
            <div
              className="grid gap-[1px] sm:gap-[1.5px] md:gap-[2px] bg-black/95 p-0.5 sm:p-1 rounded-lg sm:rounded-xl md:rounded-2xl border border-black/80 md:border-2 md:border-black overflow-hidden relative"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                width: 'clamp(145px, 42vw, 270px)',
                height: 'clamp(290px, 84vw, 540px)',
                maxHeight: 'calc(100dvh - 275px)'
              }}
            >
              {/* Subtle Matrix Laser Scanline FX */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-portal-cyan/5 to-transparent h-12 animate-pulse pointer-events-none" />

              {/* Render Visible Grid Cells (All 20 Rows) */}
              {grid.map((row, actualY) => {
                const isFlashing = flashRows.includes(actualY);

                return row.map((cell, cIdx) => {
                  // Check if this cell is occupied by the falling active piece
                  let isActiveCell = false;
                  let activePieceType: TetrominoType | null = null;

                  if (currentPiece && currentShape) {
                    const pieceR = actualY - currentPiece.y;
                    const pieceC = cIdx - currentPiece.x;
                    if (
                      pieceR >= 0 &&
                      pieceR < currentShape.length &&
                      pieceC >= 0 &&
                      pieceC < currentShape[pieceR].length &&
                      currentShape[pieceR][pieceC] !== 0
                    ) {
                      isActiveCell = true;
                      activePieceType = currentPiece.type;
                    }
                  }

                  // Check if this cell is occupied by the Ghost Piece
                  let isGhostCell = false;
                  let ghostPieceType: TetrominoType | null = null;
                  if (!isActiveCell && currentPiece && currentShape) {
                    const ghostR = actualY - ghostY;
                    const ghostC = cIdx - currentPiece.x;
                    if (
                      ghostR >= 0 &&
                      ghostR < currentShape.length &&
                      ghostC >= 0 &&
                      ghostC < currentShape[ghostR].length &&
                      currentShape[ghostR][ghostC] !== 0
                    ) {
                      isGhostCell = true;
                      ghostPieceType = currentPiece.type;
                    }
                  }

                  return (
                    <div
                      key={`cell-${actualY}-${cIdx}`}
                      className={`relative w-full h-full rounded-[2px] sm:rounded-[3px] transition-colors duration-75 flex items-center justify-center ${
                        isFlashing
                          ? 'bg-white border-2 border-portal-yellow shadow-[0_0_12px_#FFF] animate-ping'
                          : isActiveCell && activePieceType
                          ? `${TETROMINOES[activePieceType].bgClass} border border-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] scale-[0.98]`
                          : isGhostCell && ghostPieceType
                          ? 'border border-dashed border-white/60 bg-white/10 shadow-[0_0_6px_rgba(255,255,255,0.2)]'
                          : cell
                          ? `${TETROMINOES[cell.type].bgClass} border border-black/90 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3)]`
                          : 'bg-slate-900/40 border border-slate-800/30'
                      }`}
                    >
                      {/* Gloss Highlight on Filled Blocks */}
                      {(isActiveCell || cell) && !isFlashing && (
                        <div className="absolute top-0.5 left-0.5 right-0.5 h-[30%] bg-white/25 rounded-t-sm pointer-events-none" />
                      )}
                    </div>
                  );
                });
              })}

              {/* In-Game Overlays */}
              {!isPlaying && !isGameOver && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 text-center z-20">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-portal-yellow border-2 sm:border-3 border-black shadow-neo flex items-center justify-center mb-1.5 sm:mb-3">
                    <Zap className="w-5 h-5 sm:w-7 sm:h-7 fill-black stroke-[2.5]" />
                  </div>
                  <h2 className="text-sm sm:text-xl font-black text-white uppercase tracking-tight mb-0.5 sm:mb-1">
                    TETRA MATRIX
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-300 font-medium mb-2.5 sm:mb-4 max-w-[150px] sm:max-w-[200px] leading-tight">
                    Align polyominoes, clear 4-line Tetra quads, & chain multipliers!
                  </p>
                  <button
                    type="button"
                    onFocus={e => e.currentTarget.blur()}
                    onClick={() => startNewGameRef.current()}
                    className="w-full max-w-[130px] sm:max-w-[180px] py-1.5 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-portal-cyan text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 sm:border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all"
                  >
                    START MATRIX
                  </button>
                </div>
              )}

              {isPaused && !isGameOver && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 text-center z-20">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-portal-pink border-2 sm:border-3 border-black shadow-neo flex items-center justify-center mb-2 sm:mb-3">
                    <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-black stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm sm:text-lg font-black text-white uppercase mb-2 sm:mb-3">PAUSED</h3>
                  <button
                    type="button"
                    onFocus={e => e.currentTarget.blur()}
                    onClick={() => setIsPaused(false)}
                    className="py-1.5 sm:py-2 px-4 sm:px-5 rounded-xl bg-portal-yellow text-black font-black text-[10px] sm:text-xs uppercase border-2 sm:border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    RESUME
                  </button>
                </div>
              )}

              {isGameOver && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 text-center z-20 animate-fadeIn">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-portal-pink border-2 sm:border-3 border-black shadow-neo flex items-center justify-center mb-1 sm:mb-2">
                    <Trophy className="w-5 h-5 sm:w-7 sm:h-7 fill-black stroke-[2.5]" />
                  </div>
                  <h2 className="text-sm sm:text-xl font-black text-portal-pink uppercase tracking-tight mb-0.5">
                    MATRIX BREACH
                  </h2>
                  <p className="text-[9px] sm:text-[11px] text-slate-300 font-bold uppercase mb-1.5 sm:mb-2">GAME OVER</p>
                  <div className="w-full max-w-[130px] sm:max-w-[190px] p-1.5 sm:p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm mb-2 sm:mb-3">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase">FINAL SCORE</span>
                    <p className="text-sm sm:text-xl font-black text-portal-yellow">{score.toLocaleString()}</p>
                    <span className="text-[9px] sm:text-[10px] font-black text-portal-cyan">{lines} Lines Cleared</span>
                  </div>
                  <button
                    type="button"
                    onFocus={e => e.currentTarget.blur()}
                    onClick={() => startNewGameRef.current()}
                    className="w-full max-w-[130px] sm:max-w-[190px] py-1.5 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-portal-cyan text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 sm:border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    RETRY MATRIX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Right Column (md+): NEXT Queue & Controls Helper */}
        <div className="hidden md:flex md:w-44 flex-col gap-3">
          {/* Next Queue Card */}
          <div className="p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-portal-cyan" /> NEXT
              </span>
            </div>
            <div className="w-full flex flex-col items-center justify-around gap-2 p-1.5 rounded-xl bg-black/60 border-2 border-black/80">
              {nextQueue.slice(0, 3).map((nextType, qIdx) => (
                <div
                  key={`next-${qIdx}`}
                  className="w-14 h-14 flex items-center justify-center p-0.5"
                >
                  <div
                    className="grid gap-0.5"
                    style={{
                      gridTemplateColumns: `repeat(${TETROMINOES[nextType].shapes[0][0].length}, minmax(0, 1fr))`
                    }}
                  >
                    {TETROMINOES[nextType].shapes[0].map((row, rIdx) =>
                      row.map((val, cIdx) => (
                        <div
                          key={`next-q-${qIdx}-${rIdx}-${cIdx}`}
                          className={`w-3 h-3 rounded-[2px] border ${
                            val ? `${TETROMINOES[nextType].bgClass} border-black` : 'opacity-0'
                          }`}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls Mini Cheat Sheet for Desktop */}
          <div className="p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm space-y-1.5 text-[10px] font-bold">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              CONTROLS
            </span>
            <div className="flex items-center justify-between text-slate-300">
              <span>MOVE</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">← → / A D</kbd>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>ROTATE</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">↑ / W / Z</kbd>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>SOFT DROP</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">↓ / S</kbd>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>HARD DROP</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">SPACE</kbd>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>HOLD</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">C / SHIFT</kbd>
            </div>
          </div>
        </div>

        {/* Mobile Right Wing (< md): Mini Next Preview + Lines */}
        <div className="flex md:hidden flex-col items-center gap-1.5 w-[68px] min-[380px]:w-[78px] shrink-0">
          {/* Mini Next Preview Card */}
          <div className="w-full p-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full">
              <span className="text-[8px] min-[380px]:text-[9px] font-black text-portal-cyan uppercase flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> NEXT
              </span>
            </div>
            <div className="w-11 h-11 min-[380px]:w-13 min-[380px]:h-13 rounded-lg bg-black/80 border border-black/80 flex items-center justify-center mt-1 overflow-hidden">
              {nextQueue[0] ? (
                <div
                  className="grid gap-0.5 p-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${TETROMINOES[nextQueue[0]].shapes[0][0].length}, minmax(0, 1fr))`
                  }}
                >
                  {TETROMINOES[nextQueue[0]].shapes[0].map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div
                        key={`m-next-${rIdx}-${cIdx}`}
                        className={`w-2 h-2 min-[380px]:w-2.5 min-[380px]:h-2.5 rounded-[2px] border ${
                          val ? `${TETROMINOES[nextQueue[0]].bgClass} border-black` : 'opacity-0'
                        }`}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Mini Lines Cleared Card */}
          <div className="w-full p-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm text-center">
            <span className="text-[7px] min-[380px]:text-[8px] font-black text-slate-400 uppercase block">LINES</span>
            <p className="text-xs min-[380px]:text-sm font-black text-white leading-tight mt-0.5">
              {lines}
            </p>
          </div>

          {/* Mini Level Card */}
          <div className="w-full p-1 rounded-xl bg-portal-card border border-black text-center">
            <span className="text-[7px] font-black text-slate-400 uppercase block">LEVEL</span>
            <p className="text-[9px] min-[380px]:text-[10px] font-black text-portal-lime leading-tight">
              LVL {level}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Touch Controller (Visible on Phones & Tablets, md:hidden) */}
      <div className="w-full max-w-[420px] mt-1.5 sm:mt-2 p-1.5 rounded-2xl bg-portal-surface border-3 border-black shadow-neo md:hidden select-none touch-none">
        <div className="grid grid-cols-2 gap-1.5">
          {/* Left Sub-Pad: Movement & Soft Drop (Left Hand) */}
          <div className="flex flex-col gap-1 bg-black/40 p-1 rounded-xl border border-black">
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onFocus={e => e.currentTarget.blur()}
                onPointerDown={e => {
                  e.preventDefault();
                  moveHorizontalRef.current(-1);
                }}
                className="h-10 sm:h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex items-center justify-center font-black shadow-neo-sm active:scale-95 transition-transform touch-none"
                aria-label="Move left"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onFocus={e => e.currentTarget.blur()}
                onPointerDown={e => {
                  e.preventDefault();
                  softDropRef.current();
                }}
                className="h-10 sm:h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex items-center justify-center font-black shadow-neo-sm active:scale-95 transition-transform touch-none"
                aria-label="Soft drop"
              >
                <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onFocus={e => e.currentTarget.blur()}
                onPointerDown={e => {
                  e.preventDefault();
                  moveHorizontalRef.current(1);
                }}
                className="h-10 sm:h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex items-center justify-center font-black shadow-neo-sm active:scale-95 transition-transform touch-none"
                aria-label="Move right"
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            </div>
            <button
              type="button"
              onFocus={e => e.currentTarget.blur()}
              onPointerDown={e => {
                e.preventDefault();
                holdCurrentPieceRef.current();
              }}
              className="h-7 sm:h-8 rounded-lg bg-portal-pink active:bg-white text-black font-black text-[9px] sm:text-[10px] border-2 border-black flex items-center justify-center gap-1 shadow-neo-sm active:scale-95 transition-transform uppercase touch-none"
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
              <span>HOLD PIECE</span>
            </button>
          </div>

          {/* Right Sub-Pad: Rotations & Hard Drop Slam (Right Hand) */}
          <div className="flex flex-col gap-1 bg-black/40 p-1 rounded-xl border border-black">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onFocus={e => e.currentTarget.blur()}
                onPointerDown={e => {
                  e.preventDefault();
                  rotatePieceRef.current(-1);
                }}
                className="h-10 sm:h-11 rounded-lg bg-portal-card active:bg-portal-cyan text-white active:text-black border-2 border-black flex flex-col items-center justify-center font-black text-[8px] sm:text-[9px] shadow-neo-sm active:scale-95 transition-transform uppercase touch-none"
                aria-label="Rotate Counter-Clockwise"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                <span>⟲ ROTATE</span>
              </button>
              <button
                type="button"
                onFocus={e => e.currentTarget.blur()}
                onPointerDown={e => {
                  e.preventDefault();
                  rotatePieceRef.current(1);
                }}
                className="h-10 sm:h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex flex-col items-center justify-center font-black text-[8px] sm:text-[9px] shadow-neo-sm active:scale-95 transition-transform uppercase touch-none"
                aria-label="Rotate Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                <span>ROTATE ⟳</span>
              </button>
            </div>
            <button
              type="button"
              onFocus={e => e.currentTarget.blur()}
              onPointerDown={e => {
                e.preventDefault();
                hardDropRef.current();
              }}
              className="h-7 sm:h-8 rounded-lg bg-portal-yellow active:bg-white text-black font-black text-[10px] sm:text-xs border-2 border-black flex items-center justify-center gap-1 shadow-neo-sm active:scale-95 transition-transform uppercase tracking-wider touch-none"
            >
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-black stroke-[2.5]" />
              <span>HARD DROP SLAM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
