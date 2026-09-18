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
  Flame,
  Shield,
  Gamepad2,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audio } from '@/lib/audio';

interface TetraMatrixGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

// 10 Columns x 20 Visible Rows (+ 2 Buffer Rows above)
const COLS = 10;
const ROWS = 20;
const BUFFER_ROWS = 2;
const TOTAL_ROWS = ROWS + BUFFER_ROWS;

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface PieceDefinition {
  type: TetrominoType;
  color: string;
  bgClass: string;
  borderClass: string;
  glowColor: string;
  shapes: number[][][]; // 4 rotation states
}

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
    color: '#FF9900',
    bgClass: 'bg-portal-orange',
    borderClass: 'border-amber-300',
    glowColor: 'rgba(255, 153, 0, 0.6)',
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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [flashRows, setFlashRows] = useState<number[]>([]);
  const [calloutText, setCalloutText] = useState<{ text: string; color: string; id: number } | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);

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

            // Check locked blocks
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
      const startY = 0; // Buffer row top

      const newPiece: ActivePiece = {
        type: pieceType,
        rotation: 0,
        x: startX,
        y: startY
      };

      if (!isValidPosition(newPiece, gridRef.current)) {
        // Game Over!
        setIsGameOver(true);
        setIsPlaying(false);
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
    const newPiece: ActivePiece = {
      type: firstPieceType,
      rotation: 0,
      x: startX,
      y: 0
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

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling on game control keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (isPlayingRef.current && !isGameOverRef.current) {
          setIsPaused(prev => !prev);
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        startNewGame();
        return;
      }

      if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveHorizontal(1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          softDrop();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'x':
        case 'X':
        case 'k':
        case 'K':
          rotatePiece(1);
          break;
        case 'z':
        case 'Z':
        case 'j':
        case 'J':
          rotatePiece(-1);
          break;
        case ' ':
          hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
        case 'h':
        case 'H':
          holdCurrentPiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHorizontal, rotatePiece, softDrop, hardDrop, holdCurrentPiece, startNewGame]);

  // Calculate Ghost Piece for Rendering
  const ghostY = currentPiece ? getGhostY(currentPiece) : 0;
  const currentShape = currentPiece ? TETROMINOES[currentPiece.type].shapes[currentPiece.rotation] : null;

  return (
    <div className={`w-full max-w-4xl mx-auto flex flex-col items-center select-none ${screenShake ? 'animate-bounce' : ''}`}>
      {/* Top Header Strip */}
      <div className="w-full flex items-center justify-between gap-2 p-2 sm:p-3 mb-2 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Zap className="w-3.5 h-3.5 fill-black stroke-[2.5]" />
            <span>TETRA MATRIX</span>
          </span>
          <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-portal-card border-2 border-black text-[11px] font-black text-portal-cyan uppercase">
            LVL {level}
          </span>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {isPlaying && !isGameOver && (
            <button
              onClick={() => setIsPaused(prev => !prev)}
              className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all"
              title={isPaused ? 'Resume Game' : 'Pause Game'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={startNewGame}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm font-black text-xs uppercase transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Arena Layout */}
      <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-center gap-3 sm:gap-4 lg:gap-6">
        {/* Left Column: HOLD Piece & Tactical Stats */}
        <div className="w-full md:w-44 flex md:flex-col justify-between md:justify-start gap-2 sm:gap-3 order-2 md:order-1">
          {/* Hold Card */}
          <div className="flex-1 md:flex-initial p-2.5 sm:p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-portal-pink" /> HOLD
              </span>
              <span className="text-[8px] font-mono text-black bg-portal-yellow px-1.5 py-0.2 rounded border border-black font-black">
                [C]
              </span>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-black/60 border-2 border-black/80 flex items-center justify-center relative overflow-hidden">
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
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm border ${
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
          <div className="flex-1 md:flex-initial p-2.5 sm:p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm space-y-2">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase">SCORE</span>
              <p className="text-lg sm:text-xl font-black text-portal-yellow tracking-tight leading-tight">
                {score.toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 pt-1 border-t border-black/40">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase">LINES</span>
                <p className="text-sm sm:text-base font-black text-white">{lines}</p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase">TOP SCORE</span>
                <p className="text-sm sm:text-base font-black text-portal-cyan">{highScore.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Primary 10x20 Matrix Canvas Viewport */}
        <div className="relative order-1 md:order-2 flex flex-col items-center">
          {/* Active Callout Overlay (Combo / Tetra Matrix Alert) */}
          {calloutText && (
            <div className="absolute -top-3 z-30 pointer-events-none animate-bounce">
              <span className={`px-3 py-1 rounded-xl bg-black border-2 border-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-neo ${calloutText.color}`}>
                {calloutText.text}
              </span>
            </div>
          )}

          {/* Matrix Board */}
          <div className="relative p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl bg-portal-surface border-3 sm:border-4 border-black shadow-neo-lg">
            <div
              className="grid gap-[1.5px] sm:gap-[2px] bg-black/95 p-1 rounded-xl sm:rounded-2xl border-2 border-black overflow-hidden relative"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                width: 'min(78vw, 270px)',
                height: 'min(156vw, 540px)',
                maxHeight: 'calc(100dvh - 270px)'
              }}
            >
              {/* Subtle Matrix Laser Scanline FX */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-portal-cyan/5 to-transparent h-12 animate-pulse pointer-events-none" />

              {/* Render Visible Grid Cells (rows 2 to 21) */}
              {grid.slice(BUFFER_ROWS).map((row, rIdx) => {
                const actualY = rIdx + BUFFER_ROWS;
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
                      className={`relative w-full h-full rounded-[3px] transition-colors duration-75 flex items-center justify-center ${
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
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                  <div className="w-14 h-14 rounded-2xl bg-portal-yellow border-3 border-black shadow-neo flex items-center justify-center mb-3">
                    <Zap className="w-7 h-7 fill-black stroke-[2.5]" />
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                    TETRA MATRIX
                  </h2>
                  <p className="text-xs text-slate-300 font-medium mb-4 max-w-[200px]">
                    Align falling polyominoes, clear 4-line Tetra quads, and chain back-to-back multipliers!
                  </p>
                  <button
                    onClick={startNewGame}
                    className="w-full max-w-[180px] py-2.5 px-4 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all"
                  >
                    START MATRIX
                  </button>
                </div>
              )}

              {isPaused && !isGameOver && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                  <div className="w-12 h-12 rounded-2xl bg-portal-pink border-3 border-black shadow-neo flex items-center justify-center mb-3">
                    <Pause className="w-6 h-6 fill-black stroke-[2.5]" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase mb-3">MATRIX PAUSED</h3>
                  <button
                    onClick={() => setIsPaused(false)}
                    className="py-2 px-5 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    RESUME
                  </button>
                </div>
              )}

              {isGameOver && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-portal-pink border-3 border-black shadow-neo flex items-center justify-center mb-2">
                    <Trophy className="w-7 h-7 fill-black stroke-[2.5]" />
                  </div>
                  <h2 className="text-xl font-black text-portal-pink uppercase tracking-tight mb-0.5">
                    MATRIX BREACH
                  </h2>
                  <p className="text-[11px] text-slate-300 font-bold uppercase mb-2">GAME OVER</p>
                  <div className="w-full max-w-[190px] p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm mb-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase">FINAL SCORE</span>
                    <p className="text-xl font-black text-portal-yellow">{score.toLocaleString()}</p>
                    <span className="text-[10px] font-black text-portal-cyan">{lines} Lines Cleared</span>
                  </div>
                  <button
                    onClick={startNewGame}
                    className="w-full max-w-[190px] py-2.5 px-4 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    RETRY MATRIX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: NEXT Queue & Controls Helper */}
        <div className="w-full md:w-44 flex md:flex-col justify-between md:justify-start gap-2 sm:gap-3 order-3">
          {/* Next Queue Card */}
          <div className="flex-1 md:flex-initial p-2.5 sm:p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-portal-cyan" /> NEXT
              </span>
            </div>
            <div className="w-full flex md:flex-col items-center justify-around gap-2 p-1.5 rounded-xl bg-black/60 border-2 border-black/80">
              {nextQueue.slice(0, 3).map((nextType, qIdx) => (
                <div
                  key={`next-${qIdx}`}
                  className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center p-0.5"
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
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] border ${
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
          <div className="hidden md:block p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm space-y-1.5 text-[10px] font-bold">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              CONTROLS
            </span>
            <div className="flex items-center justify-between text-slate-300">
              <span>MOVE</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">← →</kbd>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>ROTATE</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">↑ / Z</kbd>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>HARD DROP</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">SPACE</kbd>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>HOLD</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">C</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Touch Controller (Visible on Phones & Tablets) */}
      <div className="w-full mt-3 p-2 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm md:hidden">
        <div className="grid grid-cols-2 gap-2">
          {/* Left Sub-Pad: Movement & Soft Drop */}
          <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1.5 rounded-xl border border-black">
            <div />
            <button
              type="button"
              onClick={() => rotatePiece(1)}
              className="h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex items-center justify-center font-black shadow-neo-sm active:translate-y-0.5"
              aria-label="Rotate piece"
            >
              <RotateCw className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div />

            <button
              type="button"
              onClick={() => moveHorizontal(-1)}
              className="h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex items-center justify-center font-black shadow-neo-sm active:translate-y-0.5"
              aria-label="Move left"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={softDrop}
              className="h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex items-center justify-center font-black shadow-neo-sm active:translate-y-0.5"
              aria-label="Soft drop"
            >
              <ArrowDown className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => moveHorizontal(1)}
              className="h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex items-center justify-center font-black shadow-neo-sm active:translate-y-0.5"
              aria-label="Move right"
            >
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Right Sub-Pad: Action Buttons (Hold, Rotate CCW, Hard Drop Slam) */}
          <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1.5 rounded-xl border border-black">
            <button
              type="button"
              onClick={holdCurrentPiece}
              className="h-11 rounded-lg bg-portal-pink active:bg-white text-black font-black text-[10px] border-2 border-black flex flex-col items-center justify-center shadow-neo-sm active:translate-y-0.5 uppercase"
            >
              <Layers className="w-4 h-4 stroke-[2.5]" />
              <span>HOLD</span>
            </button>
            <button
              type="button"
              onClick={() => rotatePiece(-1)}
              className="h-11 rounded-lg bg-portal-card active:bg-portal-yellow text-white active:text-black border-2 border-black flex flex-col items-center justify-center font-black text-[10px] shadow-neo-sm active:translate-y-0.5 uppercase"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>ROTATE ⟲</span>
            </button>
            <button
              type="button"
              onClick={hardDrop}
              className="col-span-2 h-11 rounded-lg bg-portal-yellow active:bg-white text-black font-black text-xs border-2 border-black flex items-center justify-center gap-1.5 shadow-neo-sm active:translate-y-0.5 uppercase"
            >
              <Zap className="w-4 h-4 fill-black stroke-[2.5]" />
              <span>HARD DROP SLAM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
