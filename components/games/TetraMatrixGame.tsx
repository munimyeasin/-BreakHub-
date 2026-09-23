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
  Star
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TetraMatrixGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

// 10 Columns x 20 Visible Rows Matrix
const COLS = 10;
const ROWS = 20;
const TOTAL_ROWS = ROWS;

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface PolyominoStyle {
  type: TetrominoType;
  name: string;
  faceGrad: string;
  faceStart: string;
  faceEnd: string;
  sideGrad: string;
  sideStart: string;
  sideEnd: string;
  glowColor: string;
  shapes: number[][][]; // 4 rotation states
}

// 3D Polyomino Palettes exactly matching public/thumbnails/tetra-matrix.svg
export const TETROMINOES: Record<TetrominoType, PolyominoStyle> = {
  I: {
    type: 'I',
    name: 'CYAN I-BAR',
    faceGrad: 'from-[#7DF9FF] to-[#00D0FF]',
    faceStart: '#7DF9FF',
    faceEnd: '#00D0FF',
    sideGrad: 'from-[#0099CC] to-[#006699]',
    sideStart: '#0099CC',
    sideEnd: '#006699',
    glowColor: 'rgba(0, 240, 255, 0.75)',
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
    name: 'YELLOW O-BOX',
    faceGrad: 'from-[#FFF570] to-[#FFDE59]',
    faceStart: '#FFF570',
    faceEnd: '#FFDE59',
    sideGrad: 'from-[#D49B00] to-[#A67800]',
    sideStart: '#D49B00',
    sideEnd: '#A67800',
    glowColor: 'rgba(255, 222, 89, 0.75)',
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
    name: 'PINK T-CROSS',
    faceGrad: 'from-[#FF63C6] to-[#FF007F]',
    faceStart: '#FF63C6',
    faceEnd: '#FF007F',
    sideGrad: 'from-[#BA005C] to-[#8A0044]',
    sideStart: '#BA005C',
    sideEnd: '#8A0044',
    glowColor: 'rgba(255, 0, 127, 0.75)',
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
    name: 'LIME S-WAVE',
    faceGrad: 'from-[#7BFF9E] to-[#00FF66]',
    faceStart: '#7BFF9E',
    faceEnd: '#00FF66',
    sideGrad: 'from-[#00B84A] to-[#008033]',
    sideStart: '#00B84A',
    sideEnd: '#008033',
    glowColor: 'rgba(0, 255, 102, 0.75)',
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
    name: 'ROSE Z-WAVE',
    faceGrad: 'from-[#FF6B8B] to-[#FF1A4B]',
    faceStart: '#FF6B8B',
    faceEnd: '#FF1A4B',
    sideGrad: 'from-[#C2002B] to-[#8A001E]',
    sideStart: '#C2002B',
    sideEnd: '#8A001E',
    glowColor: 'rgba(255, 26, 75, 0.75)',
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
    name: 'ROYAL J-HOOK',
    faceGrad: 'from-[#60A5FA] to-[#2563EB]',
    faceStart: '#60A5FA',
    faceEnd: '#2563EB',
    sideGrad: 'from-[#1D4ED8] to-[#1E3A8A]',
    sideStart: '#1D4ED8',
    sideEnd: '#1E3A8A',
    glowColor: 'rgba(37, 99, 235, 0.75)',
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
    name: 'ORANGE L-HOOK',
    faceGrad: 'from-[#FFBD59] to-[#FF8800]',
    faceStart: '#FFBD59',
    faceEnd: '#FF8800',
    sideGrad: 'from-[#C25A00] to-[#8F3F00]',
    sideStart: '#C25A00',
    sideEnd: '#8F3F00',
    glowColor: 'rgba(255, 136, 0, 0.75)',
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

// Super Rotation System (SRS) Wall Kick Offset Matrices
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

// Level Speed Timing (ms per gravity tick)
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
} | null;

// ==========================================
// 3D Neo-Brutalist Extruded Polyomino Block
// ==========================================
interface TetraBlockProps {
  type: TetrominoType;
  sizeClass?: string;
  isGhost?: boolean;
  isFlashing?: boolean;
}

const TetraBlock: React.FC<TetraBlockProps> = React.memo(({ type, sizeClass = 'w-full h-full', isGhost = false, isFlashing = false }) => {
  const def = TETROMINOES[type];

  if (isFlashing) {
    return (
      <div className={`relative ${sizeClass} rounded-[3px] bg-white border-2 border-yellow-300 shadow-[0_0_15px_#FFF] animate-pulse`} />
    );
  }

  if (isGhost) {
    return (
      <div
        className={`relative ${sizeClass} rounded-[3px] border-2 border-dashed border-[#00F0FF] bg-[#00F0FF]/15 shadow-[0_0_8px_rgba(0,240,255,0.4)] flex items-center justify-center`}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]/40 animate-ping" />
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeClass} rounded-[3px] sm:rounded-[4px] border-[1.5px] sm:border-2 border-black overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),inset_0_-2px_2px_rgba(0,0,0,0.35)]`}
      style={{
        background: `linear-gradient(135deg, ${def.faceStart} 0%, ${def.faceEnd} 100%)`
      }}
    >
      {/* 3D Top-Left High-Gloss Triangular Specular Highlight (from thumbnail) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 30 30"
        preserveAspectRatio="none"
      >
        {/* Specular Triangle */}
        <polygon points="2,2 24,2 2,24" fill="#FFFFFF" opacity="0.75" />
        {/* Top Edge Bevel Line */}
        <line x1="2" y1="2" x2="28" y2="2" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.9" />
        {/* Bottom-Right 3D Extrusion Shadow Bevel */}
        <polygon points="28,4 28,28 4,28" fill="#000000" opacity="0.22" />
        <line x1="2" y1="28" x2="28" y2="28" stroke="#000000" strokeWidth="1.5" opacity="0.4" />
        <line x1="28" y1="2" x2="28" y2="28" stroke="#000000" strokeWidth="1.5" opacity="0.4" />
      </svg>
    </div>
  );
});
TetraBlock.displayName = 'TetraBlock';

// ==========================================
// 16-Point Neo-Brutalist Starburst Action Badge
// ==========================================
interface StarburstBadgeProps {
  text: string;
  subtext?: string;
  colorGrad?: 'gold' | 'cyan' | 'pink';
}

const StarburstBadge: React.FC<StarburstBadgeProps> = React.memo(({ text, subtext, colorGrad = 'gold' }) => {
  const gradColors = {
    gold: { start: '#FFF066', end: '#FFE600', text: '#000000' },
    cyan: { start: '#7DF9FF', end: '#00D0FF', text: '#000000' },
    pink: { start: '#FF63C6', end: '#FF007F', text: '#FFFFFF' }
  }[colorGrad];

  return (
    <div className="relative inline-flex items-center justify-center animate-bounce select-none pointer-events-none">
      <svg
        viewBox="-35 -35 70 70"
        className="w-28 h-28 sm:w-36 sm:h-36 drop-shadow-[3px_3px_0px_#000000]"
      >
        <defs>
          <linearGradient id={`starburst-${colorGrad}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradColors.start} />
            <stop offset="100%" stopColor={gradColors.end} />
          </linearGradient>
        </defs>
        {/* 16-Point Starburst Polygon from tetra-matrix.svg */}
        <polygon
          points="0,-30 11,-11 32,-19 22,-1 40,14 19,19 24,38 5,27 -5,38 -3,19 -24,24 -16,5 -38,-3 -19,-14 -27,-32 -8,-22"
          fill={`url(#starburst-${colorGrad})`}
          stroke="#000000"
          strokeWidth="3"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span
          className="font-black text-xs sm:text-sm uppercase tracking-tight leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]"
          style={{ color: gradColors.text }}
        >
          {text}
        </span>
        {subtext && (
          <span className="text-[9px] sm:text-[10px] font-black uppercase text-black bg-white px-1 py-0.2 rounded border border-black mt-1 shadow-sm">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
});
StarburstBadge.displayName = 'StarburstBadge';

// ==========================================
// Main TetraMatrixGame Component
// ==========================================
export default function TetraMatrixGame({ gameId, onGameOver }: TetraMatrixGameProps) {
  // Game Board State
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
  const [laserTrailCol, setLaserTrailCol] = useState<{ x: number; startY: number; endY: number } | null>(null);
  const [callout, setCallout] = useState<{ text: string; subtext?: string; grad: 'gold' | 'cyan' | 'pink'; id: number } | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Web Audio API Synthesizer
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

  const playTetraSound = useCallback(
    (type: 'move' | 'rotate' | 'softDrop' | 'hardDrop' | 'hold' | 'single' | 'double' | 'triple' | 'tetra' | 'levelUp' | 'gameOver') => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'move') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(130, now + 0.04);
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
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
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
          // Sub-Bass Heavy Detonation
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.16);
          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.16);
        } else if (type === 'hold') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(620, now);
          osc.frequency.linearRampToValueAtTime(380, now + 0.08);
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
          // Quad-Clear Fanfare
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0.22, now + idx * 0.06);
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
          [320, 270, 210, 140].forEach((freq, idx) => {
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
    },
    [soundEnabled, getAudioContext]
  );

  // Synchronized Reference Pointers
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

  // Standard 7-Bag Randomizer generator
  const getNextPieceFromBag = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) {
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

  // Ghost Piece Landing Raycast Projection
  const getGhostY = useCallback(
    (piece: ActivePiece | null, currentGrid: GridCell[][] = gridRef.current): number => {
      if (!piece) return 0;
      let ghostY = piece.y;
      while (isValidPosition({ ...piece, y: ghostY + 1 }, currentGrid)) {
        ghostY++;
      }
      return ghostY;
    },
    [isValidPosition]
  );

  // Spawn a new Tetromino from 7-Bag
  const spawnPiece = useCallback(
    (type?: TetrominoType) => {
      let pieceType = type;
      let newQueue = [...nextQueueRef.current];

      if (!pieceType) {
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
        // Matrix Breach - Game Over!
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

  // Clear completed rows, award points & starburst popups
  const clearLines = useCallback(
    (newGrid: GridCell[][]) => {
      const fullRowIndices: number[] = [];

      for (let r = 0; r < TOTAL_ROWS; r++) {
        if (newGrid[r].every(cell => cell !== null)) {
          fullRowIndices.push(r);
        }
      }

      if (fullRowIndices.length === 0) {
        setCombo(0);
        comboRef.current = 0;
        setGrid(newGrid);
        gridRef.current = newGrid;
        spawnPiece();
        return;
      }

      // Flash Row & Laser Wave Beam FX
      setFlashRows(fullRowIndices);

      const linesCleared = fullRowIndices.length;
      const curLevel = levelRef.current;
      const isTetra = linesCleared === 4;
      const isB2B = isTetra && backToBackRef.current;

      // Scoring System: Single=100, Double=300, Triple=500, Tetra=800
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
            particleCount: 60,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch {}

        setCallout({
          text: isB2B ? 'B2B TETRA!' : '4X TETRIS!',
          subtext: isB2B ? '+1.5X MULTIPLIER' : '+800 PTS',
          grad: 'gold',
          id: Date.now()
        });
      } else {
        if (linesCleared === 3) {
          playTetraSound('triple');
          setCallout({ text: 'TRIPLE CLEAR!', subtext: '+500 PTS', grad: 'pink', id: Date.now() });
        } else if (linesCleared === 2) {
          playTetraSound('double');
          setCallout({ text: 'DOUBLE CLEAR!', subtext: '+300 PTS', grad: 'cyan', id: Date.now() });
        } else {
          playTetraSound('single');
          setCallout({ text: 'SINGLE CLEAR', subtext: '+100 PTS', grad: 'cyan', id: Date.now() });
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
      }, 180);
    },
    [spawnPiece, playTetraSound]
  );

  // Lock active piece into grid
  const lockPiece = useCallback(
    (pieceToLock: ActivePiece = currentPieceRef.current!) => {
      if (!pieceToLock) return;

      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }

      const shape = TETROMINOES[pieceToLock.type].shapes[pieceToLock.rotation];
      const newGrid = gridRef.current.map(row => [...row]);

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            const gridX = pieceToLock.x + c;
            const gridY = pieceToLock.y + r;
            if (gridY >= 0 && gridY < TOTAL_ROWS && gridX >= 0 && gridX < COLS) {
              newGrid[gridY][gridX] = {
                type: pieceToLock.type
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

  // Move Piece Left or Right
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

  // Rotate Piece Clockwise / Counter-Clockwise with SRS Wall Kicks
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

  // Soft Drop
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
      lockPiece(piece);
    }
  }, [isValidPosition, lockPiece, playTetraSound]);

  // Hard Drop Slam with Laser Speed Trail
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

      // Trigger Laser Speed Trail Animation
      setLaserTrailCol({ x: piece.x, startY: piece.y, endY: ghostY });
      setTimeout(() => setLaserTrailCol(null), 150);
    }

    playTetraSound('hardDrop');
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 150);

    lockPiece(droppedPiece);
  }, [getGhostY, lockPiece, playTetraSound]);

  // Hold Piece Vault Swap
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
    setCallout(null);

    // Initial 3-piece Next Queue
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
        lockPiece(piece);
      }
    }, currentSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, isGameOver, level, isValidPosition, lockPiece]);

  // Synchronized Handlers in Refs
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

  // Auto-start on mount
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startNewGameRef.current();
    }
    containerRef.current?.focus();
  }, []);

  // Keyboard Capture Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key;
      const code = e.code;

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

      // 1. Restart
      if (
        key === 'r' || key === 'R' || code === 'KeyR' ||
        (isGameOverRef.current && (key === 'Enter' || code === 'Enter' || code === 'NumpadEnter' || key === ' ' || code === 'Space'))
      ) {
        startNewGameRef.current();
        return;
      }

      // 2. Pause / Resume
      if (key === 'p' || key === 'P' || code === 'KeyP') {
        if (isPlayingRef.current && !isGameOverRef.current) {
          setIsPaused(prev => !prev);
        }
        return;
      }

      // 3. Start from splash
      if (!isPlayingRef.current) {
        if (
          key === ' ' || key === 'Enter' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowDown' || key === 'ArrowUp' ||
          code === 'Space' || code === 'Enter' || code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD'
        ) {
          startNewGameRef.current();
        }
        return;
      }

      // 4. Resume if paused
      if (isPausedRef.current) {
        if (
          key === ' ' || key === 'Enter' || key === 'p' || key === 'P' ||
          code === 'Space' || code === 'Enter' || code === 'KeyP'
        ) {
          setIsPaused(false);
        }
        return;
      }

      if (isGameOverRef.current) return;

      // 5. Left Movement
      if (
        key === 'ArrowLeft' || key === 'a' || key === 'A' ||
        code === 'ArrowLeft' || code === 'KeyA' || code === 'Numpad4'
      ) {
        moveHorizontalRef.current(-1);
        return;
      }

      // 6. Right Movement
      if (
        key === 'ArrowRight' || key === 'd' || key === 'D' ||
        code === 'ArrowRight' || code === 'KeyD' || code === 'Numpad6'
      ) {
        moveHorizontalRef.current(1);
        return;
      }

      // 7. Soft Drop
      if (
        key === 'ArrowDown' || key === 's' || key === 'S' ||
        code === 'ArrowDown' || code === 'KeyS' || code === 'Numpad2'
      ) {
        softDropRef.current();
        return;
      }

      // 8. Rotate Clockwise
      if (
        key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'x' || key === 'X' || key === 'k' || key === 'K' || key === 'e' || key === 'E' ||
        code === 'ArrowUp' || code === 'KeyW' || code === 'KeyX' || code === 'KeyK' || code === 'KeyE' || code === 'Numpad8' || code === 'Numpad5'
      ) {
        rotatePieceRef.current(1);
        return;
      }

      // 9. Rotate Counter-Clockwise
      if (
        key === 'z' || key === 'Z' || key === 'j' || key === 'J' || key === 'q' || key === 'Q' || key === 'Control' ||
        code === 'KeyZ' || code === 'KeyJ' || code === 'KeyQ' || code === 'ControlLeft' || code === 'ControlRight' || code === 'Numpad3' || code === 'Numpad7'
      ) {
        rotatePieceRef.current(-1);
        return;
      }

      // 10. Hard Drop Slam
      if (key === ' ' || key === 'Spacebar' || code === 'Space' || code === 'Numpad0') {
        if (!e.repeat) {
          hardDropRef.current();
        }
        return;
      }

      // 11. Hold Piece
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

  // Ghost Piece Calculation
  const ghostY = currentPiece ? getGhostY(currentPiece) : 0;
  const currentShape = currentPiece ? TETROMINOES[currentPiece.type].shapes[currentPiece.rotation] : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onClick={() => containerRef.current?.focus()}
      className={`w-full max-w-4xl mx-auto flex flex-col items-center select-none outline-none ${
        screenShake ? 'animate-bounce' : ''
      }`}
    >
      {/* Top Retro-Arcade Header Marquee Ribbon */}
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 mb-1.5 sm:mb-2 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm">
        {/* Left: Game Title Badge & Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 rounded-xl bg-gradient-to-r from-[#FFF570] to-[#FFDE59] text-black font-black text-[11px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Zap className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-black stroke-[2.5]" />
            <span>TETRA MATRIX</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-portal-card border-2 border-black text-[10px] font-black text-portal-cyan uppercase">
            SRS // 7-BAG
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-portal-card border-2 border-black text-[10px] sm:text-[11px] font-black text-portal-yellow uppercase">
            LVL {level}
          </span>
          {backToBack && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-portal-pink border-2 border-black text-[9px] sm:text-[10px] font-black text-white uppercase animate-pulse">
              <Flame className="w-2.5 h-2.5 fill-white" /> B2B
            </span>
          )}
        </div>

        {/* Right: Audio & Reset Quick Buttons */}
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

      {/* Main Arcade Layout: Mobile Flanking Wings (< md), 3-Column on Desktop (md+) */}
      <div className="w-full flex items-center md:items-start justify-center gap-1.5 sm:gap-3 md:gap-4 lg:gap-6">
        {/* Mobile Left Wing (< md): 3D HOLD Vault + Score */}
        <div className="flex md:hidden flex-col items-center gap-1.5 w-[68px] min-[380px]:w-[78px] shrink-0">
          {/* Mobile Tap-to-Hold Card */}
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
            <div className="w-11 h-11 min-[380px]:w-13 min-[380px]:h-13 rounded-lg bg-[#04020E] border-2 border-black flex items-center justify-center mt-1 overflow-hidden relative">
              {/* Subtle Matrix Stage Grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#2A1C54_1px,transparent_1px)] [background-size:6px_6px] opacity-40 pointer-events-none" />
              {holdPiece ? (
                <div
                  className="grid gap-0.5 p-0.5 relative z-10"
                  style={{
                    gridTemplateColumns: `repeat(${TETROMINOES[holdPiece].shapes[0][0].length}, minmax(0, 1fr))`
                  }}
                >
                  {TETROMINOES[holdPiece].shapes[0].map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div key={`m-hold-${rIdx}-${cIdx}`} className="w-2.5 h-2.5 min-[380px]:w-3 min-[380px]:h-3 flex items-center justify-center">
                        {val ? <TetraBlock type={holdPiece} /> : <div className="w-full h-full opacity-0" />}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <span className="text-[8px] text-slate-500 font-bold uppercase z-10">VAULT</span>
              )}
            </div>
          </button>

          {/* Mobile Score Card */}
          <div className="w-full p-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm text-center">
            <span className="text-[7px] min-[380px]:text-[8px] font-black text-slate-400 uppercase block">SCORE</span>
            <p className="text-xs min-[380px]:text-sm font-black text-portal-yellow truncate leading-tight mt-0.5">
              {score.toLocaleString()}
            </p>
          </div>

          {/* Mobile Best High Score */}
          <div className="w-full p-1 rounded-xl bg-portal-card border border-black text-center">
            <span className="text-[7px] font-black text-slate-400 uppercase block">BEST</span>
            <p className="text-[9px] min-[380px]:text-[10px] font-black text-portal-cyan truncate leading-tight">
              {highScore.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Desktop Left Column (md+): 3D HOLD Vault & Tactical Stats */}
        <div className="hidden md:flex md:w-44 lg:w-48 flex-col gap-3">
          {/* Hold Piece Vault Card */}
          <div className="p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-portal-pink" /> HOLD VAULT
              </span>
              <span className="text-[9px] font-mono text-black bg-portal-yellow px-1.5 py-0.5 rounded border border-black font-black">
                [C]
              </span>
            </div>
            <div className="w-24 h-24 rounded-xl bg-[#04020E] border-2 border-black flex items-center justify-center relative overflow-hidden shadow-inner">
              {/* Matrix Stage Grid Backdrop */}
              <div className="absolute inset-0 bg-[radial-gradient(#2A1C54_1px,transparent_1px)] [background-size:8px_8px] opacity-50 pointer-events-none" />
              {holdPiece ? (
                <div
                  className="grid gap-1 p-1 relative z-10"
                  style={{
                    gridTemplateColumns: `repeat(${TETROMINOES[holdPiece].shapes[0][0].length}, minmax(0, 1fr))`
                  }}
                >
                  {TETROMINOES[holdPiece].shapes[0].map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div key={`hold-${rIdx}-${cIdx}`} className="w-5 h-5 flex items-center justify-center">
                        {val ? <TetraBlock type={holdPiece} /> : <div className="w-full h-full opacity-0" />}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold uppercase z-10">VAULT EMPTY</span>
              )}
            </div>
          </div>

          {/* Tactical Stats Deck */}
          <div className="p-3.5 rounded-2xl bg-portal-surface border-3 border-black shadow-neo space-y-2.5">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SCORE</span>
              <p className="text-2xl font-black text-portal-yellow tracking-tight leading-tight">
                {score.toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black/30">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase">LINES</span>
                <p className="text-base font-black text-white">{lines}</p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase">LEVEL</span>
                <p className="text-base font-black text-portal-lime">LVL {level}</p>
              </div>
            </div>
            <div className="pt-2 border-t-2 border-black/30">
              <span className="text-[9px] font-black text-slate-400 uppercase">BEST RECORD</span>
              <p className="text-sm font-black text-portal-cyan">{highScore.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Center Column: 3D Neo-Brutalist 10x20 Arcade Matrix Playfield */}
        <div className="relative flex flex-col items-center">
          {/* 16-Point Starburst Action Callout Overlay */}
          {callout && (
            <div className="absolute -top-10 z-40 pointer-events-none">
              <StarburstBadge text={callout.text} subtext={callout.subtext} colorGrad={callout.grad} />
            </div>
          )}

          {/* Neo-Brutalist Outer Arcade Container (From Thumbnail: theme-frame-bg with 4px border & brutal shadow) */}
          <div className="relative p-1.5 sm:p-2 md:p-3 rounded-2xl sm:rounded-3xl bg-[#0B081E] border-3 sm:border-4 border-[#FFE600] shadow-[5px_5px_0px_#000000]">
            {/* Playfield Inner Stage (From Thumbnail: #04020E with 2.5px border) */}
            <div
              className="grid gap-[1px] sm:gap-[1.5px] md:gap-[2px] bg-[#04020E] p-1 rounded-xl sm:rounded-2xl border-2 border-black overflow-hidden relative shadow-inner"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                width: 'clamp(150px, 44vw, 280px)',
                height: 'clamp(300px, 88vw, 560px)',
                maxHeight: 'calc(100dvh - 270px)'
              }}
            >
              {/* Perspective Floor Cyber Grid Lines (From Thumbnail: theme-stage-grid #2A1C54) */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#2A1C54_1px,transparent_1px),linear-gradient(to_bottom,#2A1C54_1px,transparent_1px)] bg-[size:10%_5%] opacity-40 pointer-events-none" />

              {/* Ambient Laser Scanline */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00F0FF]/10 to-transparent h-16 animate-pulse pointer-events-none" />

              {/* Hard Drop Laser Speed Trail FX (From Thumbnail: linearGradient #laserTrail) */}
              {laserTrailCol && (
                <div
                  className="absolute z-20 pointer-events-none transition-opacity duration-150"
                  style={{
                    left: `${(laserTrailCol.x / COLS) * 100}%`,
                    width: `${(1 / COLS) * 100}%`,
                    top: `${(Math.max(0, laserTrailCol.startY) / TOTAL_ROWS) * 100}%`,
                    height: `${((laserTrailCol.endY - Math.max(0, laserTrailCol.startY) + 1) / TOTAL_ROWS) * 100}%`
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-b from-transparent via-[#00F0FF]/50 to-[#00F0FF] flex items-center justify-center">
                    <div className="w-0.5 h-full border-l border-dashed border-white opacity-80" />
                  </div>
                </div>
              )}

              {/* Line Clear Horizontal Energy Laser Waves (From Thumbnail: #cyanGlow + #00F0FF wave) */}
              {flashRows.map(rowIdx => (
                <div
                  key={`laser-wave-${rowIdx}`}
                  className="absolute left-0 right-0 z-30 pointer-events-none flex items-center justify-center shadow-[0_0_20px_#00F0FF]"
                  style={{
                    top: `${(rowIdx / TOTAL_ROWS) * 100}%`,
                    height: `${(1 / TOTAL_ROWS) * 100}%`
                  }}
                >
                  <div className="w-full h-full bg-[#00F0FF] opacity-90 flex items-center">
                    <div className="w-full h-1 bg-white shadow-[0_0_10px_#FFF]" />
                  </div>
                </div>
              ))}

              {/* 10x20 Matrix Grid Cells with 3D Extruded Polyomino Rendering */}
              {grid.map((row, actualY) => {
                const isFlashing = flashRows.includes(actualY);

                return row.map((cell, cIdx) => {
                  // Active Falling Piece Cell Check
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

                  // Ghost Wireframe Cell Check
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
                      className="relative w-full h-full flex items-center justify-center"
                    >
                      {isActiveCell && activePieceType ? (
                        <TetraBlock type={activePieceType} isFlashing={isFlashing} />
                      ) : isGhostCell && ghostPieceType ? (
                        <TetraBlock type={ghostPieceType} isGhost={true} />
                      ) : cell ? (
                        <TetraBlock type={cell.type} isFlashing={isFlashing} />
                      ) : (
                        <div className="w-full h-full rounded-[2px] bg-slate-950/40 border border-slate-900/30" />
                      )}
                    </div>
                  );
                });
              })}

              {/* In-Game Splash Screen Overlay */}
              {!isPlaying && !isGameOver && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-4 text-center z-30">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#FFF570] to-[#FFDE59] border-3 border-black shadow-neo flex items-center justify-center mb-2 sm:mb-3">
                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 fill-black stroke-[2.5]" />
                  </div>
                  <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-tight mb-1">
                    TETRA MATRIX
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-300 font-medium mb-3 sm:mb-4 max-w-[160px] sm:max-w-[210px] leading-tight">
                    Align 3D polyominoes, drop SRS quads, and chain multi-line combos!
                  </p>
                  <button
                    type="button"
                    onFocus={e => e.currentTarget.blur()}
                    onClick={() => startNewGameRef.current()}
                    className="w-full max-w-[140px] sm:max-w-[190px] py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7DF9FF] to-[#00D0FF] text-black font-black text-[11px] sm:text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all"
                  >
                    START MATRIX
                  </button>
                </div>
              )}

              {/* Pause Overlay */}
              {isPaused && !isGameOver && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-4 text-center z-30">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-portal-pink border-3 border-black shadow-neo flex items-center justify-center mb-2 sm:mb-3">
                    <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-black stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm sm:text-lg font-black text-white uppercase mb-2 sm:mb-3">PAUSED</h3>
                  <button
                    type="button"
                    onFocus={e => e.currentTarget.blur()}
                    onClick={() => setIsPaused(false)}
                    className="py-1.5 sm:py-2 px-5 rounded-xl bg-portal-yellow text-black font-black text-[11px] sm:text-xs uppercase border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    RESUME
                  </button>
                </div>
              )}

              {/* Matrix Breach / Game Over Overlay */}
              {isGameOver && (
                <div className="absolute inset-0 bg-black/92 backdrop-blur-sm flex flex-col items-center justify-center p-2.5 sm:p-4 text-center z-30 animate-fadeIn">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-portal-pink border-3 border-black shadow-neo flex items-center justify-center mb-1.5 sm:mb-2">
                    <Trophy className="w-6 h-6 sm:w-7 sm:h-7 fill-black stroke-[2.5]" />
                  </div>
                  <h2 className="text-sm sm:text-xl font-black text-portal-pink uppercase tracking-tight mb-0.5">
                    MATRIX BREACH
                  </h2>
                  <p className="text-[9px] sm:text-[11px] text-slate-300 font-bold uppercase mb-2">GAME OVER</p>
                  <div className="w-full max-w-[140px] sm:max-w-[200px] p-2 sm:p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm mb-2.5 sm:mb-3">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase">FINAL SCORE</span>
                    <p className="text-base sm:text-2xl font-black text-portal-yellow">{score.toLocaleString()}</p>
                    <span className="text-[9px] sm:text-[10px] font-black text-portal-cyan">{lines} Lines Cleared</span>
                  </div>
                  <button
                    type="button"
                    onFocus={e => e.currentTarget.blur()}
                    onClick={() => startNewGameRef.current()}
                    className="w-full max-w-[140px] sm:max-w-[200px] py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7DF9FF] to-[#00D0FF] text-black font-black text-[11px] sm:text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    RETRY MATRIX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Right Column (md+): 3D NEXT 3-Piece Queue & Controls Guide */}
        <div className="hidden md:flex md:w-44 lg:w-48 flex-col gap-3">
          {/* Next 3-Piece Preview Queue Card */}
          <div className="p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-portal-cyan" /> NEXT QUEUE
              </span>
            </div>
            <div className="w-full flex flex-col items-center justify-around gap-2 p-2 rounded-xl bg-[#04020E] border-2 border-black shadow-inner">
              {nextQueue.slice(0, 3).map((nextType, qIdx) => (
                <div
                  key={`next-${qIdx}`}
                  className="w-16 h-14 flex items-center justify-center p-0.5 relative"
                >
                  <div
                    className="grid gap-1 relative z-10"
                    style={{
                      gridTemplateColumns: `repeat(${TETROMINOES[nextType].shapes[0][0].length}, minmax(0, 1fr))`
                    }}
                  >
                    {TETROMINOES[nextType].shapes[0].map((row, rIdx) =>
                      row.map((val, cIdx) => (
                        <div key={`next-q-${qIdx}-${rIdx}-${cIdx}`} className="w-3.5 h-3.5 flex items-center justify-center">
                          {val ? <TetraBlock type={nextType} /> : <div className="w-full h-full opacity-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Controls Cheat Sheet */}
          <div className="p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo space-y-1.5 text-[10px] font-bold">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              CONTROLS MAP
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
              <kbd className="px-1.5 py-0.5 bg-portal-yellow text-black border border-black rounded text-[9px] font-mono font-black">SPACE</kbd>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>HOLD</span>
              <kbd className="px-1.5 py-0.5 bg-portal-card border border-black rounded text-[9px] font-mono font-black text-white">C / SHIFT</kbd>
            </div>
          </div>
        </div>

        {/* Mobile Right Wing (< md): Mini Next Preview + Lines Cleared */}
        <div className="flex md:hidden flex-col items-center gap-1.5 w-[68px] min-[380px]:w-[78px] shrink-0">
          {/* Mini Next Preview Card */}
          <div className="w-full p-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full">
              <span className="text-[8px] min-[380px]:text-[9px] font-black text-portal-cyan uppercase flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> NEXT
              </span>
            </div>
            <div className="w-11 h-11 min-[380px]:w-13 min-[380px]:h-13 rounded-lg bg-[#04020E] border-2 border-black flex items-center justify-center mt-1 overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(#2A1C54_1px,transparent_1px)] [background-size:6px_6px] opacity-40 pointer-events-none" />
              {nextQueue[0] ? (
                <div
                  className="grid gap-0.5 p-0.5 relative z-10"
                  style={{
                    gridTemplateColumns: `repeat(${TETROMINOES[nextQueue[0]].shapes[0][0].length}, minmax(0, 1fr))`
                  }}
                >
                  {TETROMINOES[nextQueue[0]].shapes[0].map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div key={`m-next-${rIdx}-${cIdx}`} className="w-2.5 h-2.5 min-[380px]:w-3 min-[380px]:h-3 flex items-center justify-center">
                        {val ? <TetraBlock type={nextQueue[0]} /> : <div className="w-full h-full opacity-0" />}
                      </div>
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
              className="h-7 sm:h-8 rounded-lg bg-gradient-to-r from-[#FFF570] to-[#FFDE59] active:bg-white text-black font-black text-[10px] sm:text-xs border-2 border-black flex items-center justify-center gap-1 shadow-neo-sm active:scale-95 transition-transform uppercase tracking-wider touch-none"
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
