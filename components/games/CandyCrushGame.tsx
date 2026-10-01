'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Flame,
  Clock,
  Zap,
  Star,
  Award,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Wand2,
  Hammer,
  RefreshCw,
  Bomb
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

export interface CandyCrushGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

// 6 Neo-Retro Candy Types
export type CandyType = 0 | 1 | 2 | 3 | 4 | 5;
export type SpecialType = 'none' | 'striped_h' | 'striped_v' | 'wrapped' | 'color_bomb';

export interface CandyItem {
  id: string;
  type: CandyType;
  special: SpecialType;
  isMatched?: boolean;
  isNew?: boolean;
}

export interface BoardCell {
  r: number;
  c: number;
  candy: CandyItem | null;
  jelly: number; // 0 = none, 1 = single, 2 = double jelly
  obstacle: 'none' | 'blocker' | 'locked';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  scale?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

// Visual definitions for the 6 candy types
const CANDY_CONFIG = [
  {
    name: 'Ruby Heart',
    color: '#FF4081',
    bgGrad: 'from-pink-500 to-rose-600',
    border: 'border-pink-300',
    glow: 'rgba(255, 64, 129, 0.6)',
    symbol: '❤️'
  },
  {
    name: 'Lemon Drop',
    color: '#FFE600',
    bgGrad: 'from-yellow-400 to-amber-500',
    border: 'border-yellow-200',
    glow: 'rgba(255, 230, 0, 0.6)',
    symbol: '⚡'
  },
  {
    name: 'Cyan Diamond',
    color: '#00F0FF',
    bgGrad: 'from-cyan-400 to-blue-600',
    border: 'border-cyan-200',
    glow: 'rgba(0, 240, 255, 0.6)',
    symbol: '💎'
  },
  {
    name: 'Acid Lime',
    color: '#A3E635',
    bgGrad: 'from-lime-400 to-emerald-600',
    border: 'border-lime-200',
    glow: 'rgba(163, 230, 53, 0.6)',
    symbol: '🍏'
  },
  {
    name: 'Purple Orb',
    color: '#C084FC',
    bgGrad: 'from-purple-400 to-indigo-600',
    border: 'border-purple-200',
    glow: 'rgba(192, 132, 252, 0.6)',
    symbol: '🔮'
  },
  {
    name: 'Orange Blast',
    color: '#FB923C',
    bgGrad: 'from-orange-400 to-red-600',
    border: 'border-orange-200',
    glow: 'rgba(251, 146, 60, 0.6)',
    symbol: '🔶'
  }
];

// 15 Handcrafted Campaign Levels
export interface LevelConfig {
  level: number;
  name: string;
  moves: number;
  targetScore: number;
  stars: [number, number, number];
  targetJellies?: number;
  targetCandies?: { type: CandyType; count: number }[];
  targetSpecials?: { special: SpecialType; count: number }[];
  initialJellyLayout?: { r: number; c: number; level: number }[];
  initialBlockers?: { r: number; c: number }[];
  description: string;
}

const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Sugar Spark',
    moves: 18,
    targetScore: 2500,
    stars: [2500, 4500, 7000],
    description: 'Score 2,500 points with classic 3-in-a-row matches!'
  },
  {
    level: 2,
    name: 'Jelly Breaker',
    moves: 20,
    targetScore: 4000,
    targetJellies: 8,
    stars: [4000, 7000, 10000],
    initialJellyLayout: [
      { r: 2, c: 2, level: 1 }, { r: 2, c: 5, level: 1 },
      { r: 3, c: 3, level: 1 }, { r: 3, c: 4, level: 1 },
      { r: 4, c: 3, level: 1 }, { r: 4, c: 4, level: 1 },
      { r: 5, c: 2, level: 1 }, { r: 5, c: 5, level: 1 }
    ],
    description: 'Clear all 8 glowing neon jelly tiles by matching over them.'
  },
  {
    level: 3,
    name: 'Color Harvest',
    moves: 22,
    targetScore: 6000,
    targetCandies: [{ type: 0, count: 16 }, { type: 2, count: 16 }],
    stars: [6000, 9500, 14000],
    description: 'Harvest 16 Ruby Hearts and 16 Cyan Diamonds.'
  },
  {
    level: 4,
    name: 'Laser Striper',
    moves: 20,
    targetScore: 8000,
    targetSpecials: [{ special: 'striped_h', count: 2 }],
    stars: [8000, 12000, 18000],
    description: 'Match 4 in a row to forge 2 Striped Laser Candies!'
  },
  {
    level: 5,
    name: 'Double Jelly Siege',
    moves: 24,
    targetScore: 10000,
    targetJellies: 12,
    stars: [10000, 15000, 22000],
    initialJellyLayout: [
      { r: 2, c: 2, level: 2 }, { r: 2, c: 3, level: 2 }, { r: 2, c: 4, level: 2 }, { r: 2, c: 5, level: 2 },
      { r: 3, c: 2, level: 2 }, { r: 3, c: 5, level: 2 },
      { r: 4, c: 2, level: 2 }, { r: 4, c: 5, level: 2 },
      { r: 5, c: 2, level: 2 }, { r: 5, c: 3, level: 2 }, { r: 5, c: 4, level: 2 }, { r: 5, c: 5, level: 2 }
    ],
    description: 'Break 12 thick double-layer jellies (2 matches required each)!'
  },
  {
    level: 6,
    name: 'Wrapped Bomb Blast',
    moves: 22,
    targetScore: 12000,
    targetSpecials: [{ special: 'wrapped', count: 2 }],
    stars: [12000, 18000, 26000],
    description: 'Form T or L shapes to create 2 explosive Wrapped Candies!'
  },
  {
    level: 7,
    name: 'Color Bomb Disco',
    moves: 25,
    targetScore: 15000,
    targetSpecials: [{ special: 'color_bomb', count: 1 }],
    stars: [15000, 22000, 32000],
    description: 'Align 5 candies in a line to unlock a Rainbow Color Bomb!'
  },
  {
    level: 8,
    name: 'Corner Infiltration',
    moves: 22,
    targetScore: 16000,
    targetJellies: 16,
    stars: [16000, 24000, 35000],
    initialJellyLayout: [
      { r: 0, c: 0, level: 1 }, { r: 0, c: 1, level: 1 }, { r: 1, c: 0, level: 1 }, { r: 1, c: 1, level: 1 },
      { r: 0, c: 6, level: 1 }, { r: 0, c: 7, level: 1 }, { r: 1, c: 6, level: 1 }, { r: 1, c: 7, level: 1 },
      { r: 6, c: 0, level: 1 }, { r: 6, c: 1, level: 1 }, { r: 7, c: 0, level: 1 }, { r: 7, c: 1, level: 1 },
      { r: 6, c: 6, level: 1 }, { r: 6, c: 7, level: 1 }, { r: 7, c: 6, level: 1 }, { r: 7, c: 7, level: 1 }
    ],
    description: 'Clear all 16 stubborn perimeter corner jellies.'
  },
  {
    level: 9,
    name: 'Rainbow Sugar Rush',
    moves: 20,
    targetScore: 25000,
    stars: [25000, 38000, 55000],
    description: 'High-score blitz: Chain multi-cascades to reach 25,000 points!'
  },
  {
    level: 10,
    name: 'Cyber Boss Overlord',
    moves: 28,
    targetScore: 35000,
    targetJellies: 20,
    stars: [35000, 50000, 75000],
    initialJellyLayout: [
      { r: 1, c: 3, level: 2 }, { r: 1, c: 4, level: 2 },
      { r: 2, c: 2, level: 2 }, { r: 2, c: 3, level: 2 }, { r: 2, c: 4, level: 2 }, { r: 2, c: 5, level: 2 },
      { r: 3, c: 1, level: 2 }, { r: 3, c: 2, level: 2 }, { r: 3, c: 5, level: 2 }, { r: 3, c: 6, level: 2 },
      { r: 4, c: 1, level: 2 }, { r: 4, c: 2, level: 2 }, { r: 4, c: 5, level: 2 }, { r: 4, c: 6, level: 2 },
      { r: 5, c: 2, level: 2 }, { r: 5, c: 3, level: 2 }, { r: 5, c: 4, level: 2 }, { r: 5, c: 5, level: 2 },
      { r: 6, c: 3, level: 2 }, { r: 6, c: 4, level: 2 }
    ],
    description: 'Shatter the Cyber Boss Core: Clear 20 double jellies & score 35,000 pts!'
  }
];

const BOARD_SIZE = 8;

let globalCandyCounter = 0;
function createRandomCandy(excludeTypes: CandyType[] = []): CandyItem {
  globalCandyCounter++;
  const available: CandyType[] = [0, 1, 2, 3, 4, 5].filter(t => !excludeTypes.includes(t as CandyType)) as CandyType[];
  const type = available[Math.floor(Math.random() * available.length)] ?? 0;
  return {
    id: `candy_${globalCandyCounter}_${Date.now()}_${Math.random()}`,
    type,
    special: 'none'
  };
}

export default function CandyCrushGame({ gameId, onGameOver }: CandyCrushGameProps) {
  // Game Modes: 'campaign' | 'arcade' | 'timer'
  const [gameMode, setGameMode] = useState<'campaign' | 'arcade' | 'timer'>('campaign');
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(0);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});

  // Core Game State
  const [board, setBoard] = useState<BoardCell[][]>([]);
  const [score, setScore] = useState<number>(0);
  const [movesLeft, setMovesLeft] = useState<number>(20);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLevelSelect, setIsLevelSelect] = useState<boolean>(true);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [isSugarCrush, setIsSugarCrush] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Objectives tracking
  const [clearedJellies, setClearedJellies] = useState<number>(0);
  const [collectedCandies, setCollectedCandies] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [createdSpecials, setCreatedSpecials] = useState<Record<string, number>>({ striped: 0, wrapped: 0, color_bomb: 0 });

  // Selection & Input
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
  const [activeBooster, setActiveBooster] = useState<'hammer' | 'color_bomb' | 'wrapped' | null>(null);
  const [boosters, setBoosters] = useState<{ hammer: number; color_bomb: number; wrapped: number }>({
    hammer: 3,
    color_bomb: 2,
    wrapped: 2
  });

  // Effects & Visual Feedback
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [laserBeams, setLaserBeams] = useState<{ id: string; type: 'row' | 'col'; index: number }[]>([]);
  const [isReshuffling, setIsReshuffling] = useState<boolean>(false);
  const [hintPair, setHintPair] = useState<[{ r: number; c: number }, { r: number; c: number }] | null>(null);

  // References
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ r: number; c: number; x: number; y: number } | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Load persistent stars from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('retro_candy_crush_stars');
        if (saved) {
          setLevelStars(JSON.parse(saved));
        }
      } catch {}
    }
  }, []);

  // Save stars
  const saveStars = (lvl: number, starsEarned: number) => {
    setLevelStars(prev => {
      const current = prev[lvl] || 0;
      if (starsEarned > current) {
        const updated = { ...prev, [lvl]: starsEarned };
        try {
          localStorage.setItem('retro_candy_crush_stars', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });
  };

  // Web Audio Procedural Synthesis
  const playSfx = useCallback((type: 'swap' | 'pop' | 'laser' | 'bomb' | 'color_bomb' | 'combo' | 'sugar' | 'hammer' | 'reject', pitchParam = 1) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'swap') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const baseFreq = Math.min(1300, 440 + pitchParam * 90);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'laser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'bomb') {
        // Deep sub-bass punch + rumble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'color_bomb') {
        // Shimmering rainbow arpeggio
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const t = now + idx * 0.04;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.25);
        });
      } else if (type === 'combo') {
        const chord = [440, 554.37, 659.25, 880];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const t = now + idx * 0.06;
          osc.frequency.setValueAtTime(freq * (1 + pitchParam * 0.2), t);
          gain.gain.setValueAtTime(0.14, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.3);
        });
      } else if (type === 'sugar') {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const t = now + idx * 0.07;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.18, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.4);
        });
      } else if (type === 'hammer') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'reject') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch {}
  }, [soundEnabled]);

  // Particle Canvas Engine
  const spawnParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        life: 0,
        maxLife: 20 + Math.random() * 15
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // DPR scaling for HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    let isRunning = true;
    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity
        p.life++;

        const progress = p.life / p.maxLife;
        const alpha = Math.max(0, 1 - progress);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Floating text feedback (+100, SWEET! x2)
  const addFloatingText = (x: number, y: number, text: string, color = '#FFE600', scale = 1) => {
    const id = `float_${Date.now()}_${Math.random()}`;
    setFloatingTexts(prev => [...prev, { id, x, y, text, color, scale }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1100);
  };

  // Helper: Find valid matches on the board
  const findMatches = (grid: BoardCell[][]): {
    matches: { r: number; c: number }[];
    matchGroups: { cells: { r: number; c: number }[]; type: CandyType; isHorizontal: boolean }[];
  } => {
    const matchMap: boolean[][] = Array(BOARD_SIZE).fill(false).map(() => Array(BOARD_SIZE).fill(false));
    const matchGroups: { cells: { r: number; c: number }[]; type: CandyType; isHorizontal: boolean }[] = [];

    // Horizontal check
    for (let r = 0; r < BOARD_SIZE; r++) {
      let matchCount = 1;
      for (let c = 0; c < BOARD_SIZE; c++) {
        const current = grid[r][c]?.candy;
        const next = c < BOARD_SIZE - 1 ? grid[r][c + 1]?.candy : null;

        if (current && next && current.type === next.type && current.special !== 'color_bomb' && next.special !== 'color_bomb') {
          matchCount++;
        } else {
          if (matchCount >= 3 && current) {
            const groupCells: { r: number; c: number }[] = [];
            for (let k = c - matchCount + 1; k <= c; k++) {
              matchMap[r][k] = true;
              groupCells.push({ r, c: k });
            }
            matchGroups.push({ cells: groupCells, type: current.type, isHorizontal: true });
          }
          matchCount = 1;
        }
      }
    }

    // Vertical check
    for (let c = 0; c < BOARD_SIZE; c++) {
      let matchCount = 1;
      for (let r = 0; r < BOARD_SIZE; r++) {
        const current = grid[r][c]?.candy;
        const next = r < BOARD_SIZE - 1 ? grid[r + 1][c]?.candy : null;

        if (current && next && current.type === next.type && current.special !== 'color_bomb' && next.special !== 'color_bomb') {
          matchCount++;
        } else {
          if (matchCount >= 3 && current) {
            const groupCells: { r: number; c: number }[] = [];
            for (let k = r - matchCount + 1; k <= r; k++) {
              matchMap[k][c] = true;
              groupCells.push({ r: k, c });
            }
            matchGroups.push({ cells: groupCells, type: current.type, isHorizontal: false });
          }
          matchCount = 1;
        }
      }
    }

    const matches: { r: number; c: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (matchMap[r][c]) matches.push({ r, c });
      }
    }

    return { matches, matchGroups };
  };

  // Helper: Find at least one valid possible move for hints / reshuffle checks
  const findPossibleMoves = (grid: BoardCell[][]): [{ r: number; c: number }, { r: number; c: number }][] => {
    const validMoves: [{ r: number; c: number }, { r: number; c: number }][] = [];

    const dirs = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 }
    ];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const c1 = grid[r][c]?.candy;
        if (!c1) continue;

        // Color bombs can swap with ANY adjacent candy
        for (const { dr, dc } of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < BOARD_SIZE && nc < BOARD_SIZE) {
            const c2 = grid[nr][nc]?.candy;
            if (!c2) continue;

            if (c1.special === 'color_bomb' || c2.special === 'color_bomb') {
              validMoves.push([{ r, c }, { r: nr, c: nc }]);
              continue;
            }

            // Simulate swap
            const cloned: BoardCell[][] = grid.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));
            const temp = cloned[r][c].candy;
            cloned[r][c].candy = cloned[nr][nc].candy;
            cloned[nr][nc].candy = temp;

            const { matches } = findMatches(cloned);
            if (matches.length > 0) {
              validMoves.push([{ r, c }, { r: nr, c: nc }]);
            }
          }
        }
      }
    }

    return validMoves;
  };

  // Generate a clean initial board with no initial 3-in-a-row matches
  const generateCleanBoard = (levelCfg?: LevelConfig): BoardCell[][] => {
    const newBoard: BoardCell[][] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      const row: BoardCell[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        let jelly = 0;
        let obstacle: 'none' | 'blocker' | 'locked' = 'none';

        if (levelCfg?.initialJellyLayout) {
          const found = levelCfg.initialJellyLayout.find(j => j.r === r && j.c === c);
          if (found) jelly = found.level;
        }

        if (levelCfg?.initialBlockers) {
          const foundB = levelCfg.initialBlockers.find(b => b.r === r && b.c === c);
          if (foundB) obstacle = 'blocker';
        }

        // Prevent initial match-3
        const exclude: CandyType[] = [];
        if (c >= 2 && row[c - 1]?.candy && row[c - 2]?.candy && row[c - 1].candy?.type === row[c - 2].candy?.type) {
          exclude.push(row[c - 1].candy!.type);
        }
        if (r >= 2 && newBoard[r - 1]?.[c]?.candy && newBoard[r - 2]?.[c]?.candy && newBoard[r - 1][c].candy?.type === newBoard[r - 2][c].candy?.type) {
          exclude.push(newBoard[r - 1][c].candy!.type);
        }

        row.push({
          r,
          c,
          candy: obstacle === 'none' ? createRandomCandy(exclude) : null,
          jelly,
          obstacle
        });
      }
      newBoard.push(row);
    }

    // Ensure there is at least one valid move
    const moves = findPossibleMoves(newBoard);
    if (moves.length === 0) {
      return generateCleanBoard(levelCfg);
    }

    return newBoard;
  };

  // Start Level / Match
  const startMatch = (mode: 'campaign' | 'arcade' | 'timer', levelIdx = 0) => {
    setGameMode(mode);
    setSelectedLevelIndex(levelIdx);
    const cfg = mode === 'campaign' ? CAMPAIGN_LEVELS[levelIdx] : undefined;

    const freshBoard = generateCleanBoard(cfg);
    setBoard(freshBoard);
    setScore(0);
    setMovesLeft(mode === 'campaign' ? (cfg?.moves ?? 20) : (mode === 'arcade' ? 25 : 999));
    setTimeLeft(mode === 'timer' ? 60 : 0);
    setComboMultiplier(1);
    setClearedJellies(0);
    setCollectedCandies({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    setCreatedSpecials({ striped: 0, wrapped: 0, color_bomb: 0 });
    setSelectedPos(null);
    setActiveBooster(null);
    setIsGameOver(false);
    setIsVictory(false);
    setIsSugarCrush(false);
    setIsProcessing(false);
    setIsLevelSelect(false);
    setIsPlaying(true);
    setLaserBeams([]);

    // Reset idle hint timer
    resetIdleHint(freshBoard);
  };

  // 60-Sec Timer Countdown
  useEffect(() => {
    if (!isPlaying || gameMode !== 'timer' || isGameOver || isVictory) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleGameOverSequence(score, false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, gameMode, isGameOver, isVictory, score]);

  // Idle Hint Timer (Highlights a matchable pair after 4.5s of inactivity)
  const resetIdleHint = (currentBoard: BoardCell[][]) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setHintPair(null);
    idleTimerRef.current = setTimeout(() => {
      const moves = findPossibleMoves(currentBoard);
      if (moves.length > 0) {
        setHintPair(moves[0]);
      }
    }, 4500);
  };

  // Trigger Laser Beam Animation Across Row/Column
  const triggerLaser = (type: 'row' | 'col', index: number) => {
    const id = `laser_${Date.now()}_${Math.random()}`;
    setLaserBeams(prev => [...prev, { id, type, index }]);
    playSfx('laser');
    setTimeout(() => {
      setLaserBeams(prev => prev.filter(b => b.id !== id));
    }, 400);
  };

  // Check Level Win Conditions
  const checkLevelCompletion = (currentScore: number, currentJellies: number, currentCandies: Record<number, number>, currentSpecials: Record<string, number>, remainingMoves: number) => {
    if (gameMode !== 'campaign') return false;
    const cfg = CAMPAIGN_LEVELS[selectedLevelIndex];
    if (!cfg) return false;

    const scoreMet = currentScore >= cfg.targetScore;
    const jelliesMet = cfg.targetJellies ? currentJellies >= cfg.targetJellies : true;
    const candiesMet = cfg.targetCandies ? cfg.targetCandies.every(tc => (currentCandies[tc.type] || 0) >= tc.count) : true;
    const specialsMet = cfg.targetSpecials ? cfg.targetSpecials.every(ts => {
      if (ts.special.startsWith('striped')) return (currentSpecials.striped || 0) >= ts.count;
      if (ts.special === 'wrapped') return (currentSpecials.wrapped || 0) >= ts.count;
      if (ts.special === 'color_bomb') return (currentSpecials.color_bomb || 0) >= ts.count;
      return true;
    }) : true;

    return scoreMet && jelliesMet && candiesMet && specialsMet;
  };

  // Game Over / Victory Sequence
  const handleGameOverSequence = (finalScore: number, won: boolean) => {
    setIsPlaying(false);
    setIsGameOver(true);
    setIsVictory(won);

    if (won && gameMode === 'campaign') {
      const cfg = CAMPAIGN_LEVELS[selectedLevelIndex];
      let stars = 1;
      if (finalScore >= cfg.stars[2]) stars = 3;
      else if (finalScore >= cfg.stars[1]) stars = 2;
      saveStars(cfg.level, stars);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      playSfx('sugar');
    }

    setTimeout(() => {
      onGameOver(finalScore);
    }, 1200);
  };

  // Sugar Crush Finale: Convert remaining moves into special candies that detonate!
  const triggerSugarCrush = async (currentBoard: BoardCell[][], moves: number, startScore: number) => {
    setIsSugarCrush(true);
    playSfx('sugar');
    addFloatingText(180, 200, '✨ SUGAR CRUSH! ✨', '#FFE600', 1.8);
    confetti({ particleCount: 100, spread: 80 });

    let workingBoard = currentBoard.map(row => row.map(cell => ({ ...cell })));
    let currentScore = startScore;

    for (let m = 0; m < moves; m++) {
      await new Promise(r => setTimeout(r, 220));
      // Pick random cell and turn into Striped/Wrapped
      const r = Math.floor(Math.random() * BOARD_SIZE);
      const c = Math.floor(Math.random() * BOARD_SIZE);
      if (workingBoard[r][c]?.candy) {
        const special: SpecialType = Math.random() < 0.5 ? 'striped_h' : 'wrapped';
        workingBoard[r][c].candy!.special = special;
        currentScore += 1000;
        setScore(currentScore);
        playSfx('pop', 3);
        setBoard([...workingBoard]);
      }
    }

    await new Promise(r => setTimeout(r, 400));
    // Cascade-detonate everything
    await processCascades(workingBoard, currentScore, 0, true);
  };

  // Process Cascades, Gravity, Matches & Combos
  const processCascades = async (
    currentBoard: BoardCell[][],
    currentScore: number,
    combo = 1,
    isFinalCrush = false
  ): Promise<void> => {
    setIsProcessing(true);
    const { matches, matchGroups } = findMatches(currentBoard);

    if (matches.length === 0) {
      // Check if no valid moves exist on board, then reshuffle
      const possible = findPossibleMoves(currentBoard);
      if (possible.length === 0 && !isFinalCrush) {
        setIsReshuffling(true);
        addFloatingText(180, 240, '🔄 RESHUFFLING...', '#00F0FF', 1.4);
        playSfx('color_bomb');
        await new Promise(r => setTimeout(r, 800));

        const reshuffled = generateCleanBoard();
        setBoard(reshuffled);
        setIsReshuffling(false);
        setIsProcessing(false);
        resetIdleHint(reshuffled);
        return;
      }

      setIsProcessing(false);
      resetIdleHint(currentBoard);

      // Check win/loss conditions
      if (isFinalCrush || isSugarCrush) {
        handleGameOverSequence(currentScore, true);
        return;
      }

      if (gameMode === 'campaign') {
        const won = checkLevelCompletion(currentScore, clearedJellies, collectedCandies, createdSpecials, movesLeft);
        if (won) {
          if (movesLeft > 0) {
            await triggerSugarCrush(currentBoard, movesLeft, currentScore);
          } else {
            handleGameOverSequence(currentScore, true);
          }
          return;
        } else if (movesLeft <= 0) {
          handleGameOverSequence(currentScore, false);
          return;
        }
      } else if (gameMode === 'arcade' && movesLeft <= 0) {
        handleGameOverSequence(currentScore, true);
        return;
      }
      return;
    }

    // Mark matched candies
    const boardCopy: BoardCell[][] = currentBoard.map(row =>
      row.map(cell => ({
        ...cell,
        candy: cell.candy ? { ...cell.candy } : null
      }))
    );

    let pointsGained = 0;
    let newlyClearedJellies = 0;
    const newlyCollected = { ...collectedCandies };
    const newlyCreatedSpecials = { ...createdSpecials };

    // Determine created specials based on match patterns
    const specialCreations: { r: number; c: number; special: SpecialType; type: CandyType }[] = [];

    matchGroups.forEach(group => {
      const len = group.cells.length;
      const center = group.cells[Math.floor(len / 2)];
      if (len >= 5) {
        // 5-in-a-row -> Color Bomb!
        specialCreations.push({ r: center.r, c: center.c, special: 'color_bomb', type: group.type });
        newlyCreatedSpecials.color_bomb++;
      } else if (len === 4) {
        // 4-in-a-row -> Striped Candy!
        const special: SpecialType = group.isHorizontal ? 'striped_v' : 'striped_h';
        specialCreations.push({ r: center.r, c: center.c, special, type: group.type });
        newlyCreatedSpecials.striped++;
      }
    });

    // Check intersecting matches (T-Shape or L-Shape) -> Wrapped Candy
    if (matchGroups.length >= 2) {
      for (let i = 0; i < matchGroups.length; i++) {
        for (let j = i + 1; j < matchGroups.length; j++) {
          const g1 = matchGroups[i];
          const g2 = matchGroups[j];
          if (g1.type === g2.type && g1.isHorizontal !== g2.isHorizontal) {
            const intersect = g1.cells.find(c1 => g2.cells.some(c2 => c1.r === c2.r && c1.c === c2.c));
            if (intersect) {
              specialCreations.push({ r: intersect.r, c: intersect.c, special: 'wrapped', type: g1.type });
              newlyCreatedSpecials.wrapped++;
            }
          }
        }
      }
    }

    // Explode specials & clear matched cells
    const cellsToClear: { r: number; c: number }[] = [...matches];

    matches.forEach(({ r, c }) => {
      const cell = boardCopy[r][c];
      if (cell.candy) {
        // Track candy collections
        newlyCollected[cell.candy.type] = (newlyCollected[cell.candy.type] || 0) + 1;

        // If candy was a special, trigger its special blast
        if (cell.candy.special === 'striped_h') {
          triggerLaser('row', r);
          for (let col = 0; col < BOARD_SIZE; col++) cellsToClear.push({ r, c: col });
        } else if (cell.candy.special === 'striped_v') {
          triggerLaser('col', c);
          for (let row = 0; row < BOARD_SIZE; row++) cellsToClear.push({ r: row, c });
        } else if (cell.candy.special === 'wrapped') {
          playSfx('bomb');
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                cellsToClear.push({ r: nr, c: nc });
              }
            }
          }
        }
      }

      // Clear jelly under match
      if (cell.jelly > 0) {
        cell.jelly -= 1;
        if (cell.jelly === 0) newlyClearedJellies++;
      }
    });

    // Remove duplicates
    const uniqueClearMap = new Set<string>();
    const finalClearList: { r: number; c: number }[] = [];
    cellsToClear.forEach(p => {
      const key = `${p.r}_${p.c}`;
      if (!uniqueClearMap.has(key)) {
        uniqueClearMap.add(key);
        finalClearList.push(p);
      }
    });

    // Calculate score
    const basePoints = finalClearList.length * 60;
    const comboBonus = combo * 40;
    pointsGained = (basePoints + comboBonus) * combo;

    // Visual particles & sound
    finalClearList.forEach(({ r, c }) => {
      const cell = boardCopy[r][c];
      if (cell.candy) {
        const cfg = CANDY_CONFIG[cell.candy.type];
        spawnParticles(c * 42 + 21, r * 42 + 21, cfg.color, 8);
      }
      boardCopy[r][c].candy = null;
    });

    // Re-insert forged special candies
    specialCreations.forEach(({ r, c, special, type }) => {
      boardCopy[r][c].candy = {
        id: `special_${special}_${Date.now()}_${Math.random()}`,
        type,
        special
      };
    });

    playSfx('pop', combo);
    if (combo >= 2) {
      const praiseWords = ['SWEET! 🍬', 'TASTY! ⚡', 'DELICIOUS! 💥', 'SUGAR RUSH! 🌟', 'DIVINE! 🔥'];
      const word = praiseWords[Math.min(combo - 2, praiseWords.length - 1)];
      addFloatingText(180, 160, `${word} x${combo}`, '#00F0FF', 1.3);
      playSfx('combo', combo);
    }

    const nextScore = currentScore + pointsGained;
    setScore(nextScore);
    setClearedJellies(prev => prev + newlyClearedJellies);
    setCollectedCandies(newlyCollected);
    setCreatedSpecials(newlyCreatedSpecials);
    setComboMultiplier(combo);
    setBoard([...boardCopy]);

    await new Promise(r => setTimeout(r, 220));

    // Gravity Drop & Fill
    for (let c = 0; c < BOARD_SIZE; c++) {
      let emptyRow = BOARD_SIZE - 1;
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        if (boardCopy[r][c].candy !== null) {
          if (r !== emptyRow) {
            boardCopy[emptyRow][c].candy = boardCopy[r][c].candy;
            boardCopy[r][c].candy = null;
          }
          emptyRow--;
        }
      }
      // Fill empty spaces from top
      for (let r = emptyRow; r >= 0; r--) {
        boardCopy[r][c].candy = createRandomCandy();
      }
    }

    setBoard([...boardCopy]);
    await new Promise(r => setTimeout(r, 220));

    // Loop next cascade
    await processCascades(boardCopy, nextScore, combo + 1, isFinalCrush);
  };

  // Special Combo Blast (When 2 specials are swapped directly together)
  const handleSpecialCombo = async (
    c1Pos: { r: number; c: number },
    c2Pos: { r: number; c: number },
    s1: SpecialType,
    s2: SpecialType,
    t1: CandyType,
    t2: CandyType
  ) => {
    setIsProcessing(true);
    const boardCopy: BoardCell[][] = board.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));
    let addedPoints = 0;

    // 1. Color Bomb + Color Bomb = Screen Wipe
    if (s1 === 'color_bomb' && s2 === 'color_bomb') {
      playSfx('color_bomb');
      addFloatingText(180, 200, '💥 MEGA SINGULARITY! 💥', '#FFFFFF', 1.8);
      confetti({ particleCount: 200, spread: 120 });

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          boardCopy[r][c].candy = null;
          if (boardCopy[r][c].jelly > 0) boardCopy[r][c].jelly = 0;
        }
      }
      addedPoints = 15000;
    }
    // 2. Color Bomb + Striped = All of target color turn Striped & detonate!
    else if ((s1 === 'color_bomb' && s2.startsWith('striped')) || (s2 === 'color_bomb' && s1.startsWith('striped'))) {
      const targetColor = s1 === 'color_bomb' ? t2 : t1;
      playSfx('color_bomb');
      addFloatingText(180, 200, '⚡ LASER STORM! ⚡', '#00F0FF', 1.6);

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (boardCopy[r][c]?.candy?.type === targetColor) {
            boardCopy[r][c].candy!.special = Math.random() < 0.5 ? 'striped_h' : 'striped_v';
          }
        }
      }
      setBoard([...boardCopy]);
      await new Promise(r => setTimeout(r, 260));

      // Detonate all striped
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (boardCopy[r][c]?.candy?.type === targetColor) {
            triggerLaser('row', r);
            triggerLaser('col', c);
            boardCopy[r][c].candy = null;
          }
        }
      }
      addedPoints = 8000;
    }
    // 3. Color Bomb + Wrapped = All of target color turn Wrapped & explode!
    else if ((s1 === 'color_bomb' && s2 === 'wrapped') || (s2 === 'color_bomb' && s1 === 'wrapped')) {
      const targetColor = s1 === 'color_bomb' ? t2 : t1;
      playSfx('color_bomb');
      addFloatingText(180, 200, '💣 WRAPPED CLUSTER! 💣', '#FF4081', 1.6);

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (boardCopy[r][c]?.candy?.type === targetColor) {
            boardCopy[r][c].candy = null;
            // 3x3 blast
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                  boardCopy[nr][nc].candy = null;
                }
              }
            }
          }
        }
      }
      addedPoints = 9000;
    }
    // 4. Striped + Striped = 4-Way Cross Laser
    else if (s1.startsWith('striped') && s2.startsWith('striped')) {
      triggerLaser('row', c2Pos.r);
      triggerLaser('col', c2Pos.c);
      for (let c = 0; c < BOARD_SIZE; c++) boardCopy[c2Pos.r][c].candy = null;
      for (let r = 0; r < BOARD_SIZE; r++) boardCopy[r][c2Pos.c].candy = null;
      addedPoints = 3500;
    }
    // 5. Striped + Wrapped = Giant 3-Row x 3-Column Cross Laser
    else if ((s1.startsWith('striped') && s2 === 'wrapped') || (s2.startsWith('striped') && s1 === 'wrapped')) {
      playSfx('laser');
      playSfx('bomb');
      addFloatingText(180, 200, '✨ MEGA CROSS BLAST! ✨', '#FFE600', 1.6);

      for (let dr = -1; dr <= 1; dr++) {
        const nr = c2Pos.r + dr;
        if (nr >= 0 && nr < BOARD_SIZE) {
          triggerLaser('row', nr);
          for (let col = 0; col < BOARD_SIZE; col++) boardCopy[nr][col].candy = null;
        }
      }
      for (let dc = -1; dc <= 1; dc++) {
        const nc = c2Pos.c + dc;
        if (nc >= 0 && nc < BOARD_SIZE) {
          triggerLaser('col', nc);
          for (let row = 0; row < BOARD_SIZE; row++) boardCopy[row][nc].candy = null;
        }
      }
      addedPoints = 6500;
    }
    // 6. Wrapped + Wrapped = Giant 5x5 Megabomb
    else if (s1 === 'wrapped' && s2 === 'wrapped') {
      playSfx('bomb');
      addFloatingText(180, 200, '💥 SUPER BOMB! 💥', '#FF4081', 1.6);

      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = c2Pos.r + dr;
          const nc = c2Pos.c + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            boardCopy[nr][nc].candy = null;
          }
        }
      }
      addedPoints = 6000;
    }
    // 7. Color Bomb + Regular Candy = Clear all of target color
    else if (s1 === 'color_bomb' || s2 === 'color_bomb') {
      const targetColor = s1 === 'color_bomb' ? t2 : t1;
      playSfx('color_bomb');
      addFloatingText(180, 200, '🌈 COLOR ABSORB! 🌈', '#FFE600', 1.4);

      boardCopy[c1Pos.r][c1Pos.c].candy = null;
      boardCopy[c2Pos.r][c2Pos.c].candy = null;

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (boardCopy[r][c]?.candy?.type === targetColor) {
            boardCopy[r][c].candy = null;
          }
        }
      }
      addedPoints = 4000;
    }

    setMovesLeft(m => Math.max(0, m - 1));
    const nextScore = score + addedPoints;
    setScore(nextScore);
    setBoard([...boardCopy]);

    await new Promise(r => setTimeout(r, 260));
    await processCascades(boardCopy, nextScore, 1);
  };

  // User Swaps Two Adjacent Tiles
  const attemptSwap = async (p1: { r: number; c: number }, p2: { r: number; c: number }) => {
    if (isProcessing || !isPlaying || isGameOver) return;

    // Must be orthogonally adjacent
    const dr = Math.abs(p1.r - p2.r);
    const dc = Math.abs(p1.c - p2.c);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      const cell1 = board[p1.r][p1.c];
      const cell2 = board[p2.r][p2.c];
      if (!cell1?.candy || !cell2?.candy) return;

      const c1 = cell1.candy;
      const c2 = cell2.candy;

      // Check special combos first
      if (
        c1.special === 'color_bomb' ||
        c2.special === 'color_bomb' ||
        (c1.special !== 'none' && c2.special !== 'none')
      ) {
        setSelectedPos(null);
        await handleSpecialCombo(p1, p2, c1.special, c2.special, c1.type, c2.type);
        return;
      }

      // Simulate swap
      setIsProcessing(true);
      playSfx('swap');
      const cloned: BoardCell[][] = board.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));
      cloned[p1.r][p1.c].candy = c2;
      cloned[p2.r][p2.c].candy = c1;

      setBoard([...cloned]);

      const { matches } = findMatches(cloned);

      if (matches.length > 0) {
        // Valid Move!
        setSelectedPos(null);
        setMovesLeft(m => Math.max(0, m - 1));
        await new Promise(r => setTimeout(r, 160));
        await processCascades(cloned, score, 1);
      } else {
        // Invalid Move - Rollback with sound
        playSfx('reject');
        await new Promise(r => setTimeout(r, 200));
        setBoard([...board]);
        setIsProcessing(false);
      }
    }
  };

  // Handle Tile Click / Touch Tap
  const handleCellClick = (r: number, c: number) => {
    if (isProcessing || !isPlaying || isGameOver) return;

    // Booster Activation
    if (activeBooster) {
      handleBoosterUse(r, c);
      return;
    }

    if (!selectedPos) {
      setSelectedPos({ r, c });
      playSfx('swap');
    } else {
      if (selectedPos.r === r && selectedPos.c === c) {
        setSelectedPos(null);
      } else {
        const p1 = selectedPos;
        const p2 = { r, c };
        attemptSwap(p1, p2);
        setSelectedPos(null);
      }
    }
  };

  // In-Game Booster Usage
  const handleBoosterUse = (r: number, c: number) => {
    if (!activeBooster || boosters[activeBooster] <= 0) {
      setActiveBooster(null);
      return;
    }

    const boardCopy: BoardCell[][] = board.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));

    if (activeBooster === 'hammer') {
      playSfx('hammer');
      boardCopy[r][c].candy = null;
      if (boardCopy[r][c].jelly > 0) boardCopy[r][c].jelly = 0;
      spawnParticles(c * 42 + 21, r * 42 + 21, '#FFE600', 16);
      addFloatingText(c * 42 + 21, r * 42 + 21, '🔨 SMASH!', '#FFE600', 1.3);
    } else if (activeBooster === 'color_bomb') {
      playSfx('color_bomb');
      boardCopy[r][c].candy = {
        id: `booster_cb_${Date.now()}`,
        type: 0,
        special: 'color_bomb'
      };
      addFloatingText(c * 42 + 21, r * 42 + 21, '🌈 COLOR BOMB!', '#00F0FF', 1.3);
    } else if (activeBooster === 'wrapped') {
      playSfx('bomb');
      boardCopy[r][c].candy = {
        id: `booster_wrap_${Date.now()}`,
        type: boardCopy[r][c]?.candy?.type ?? 0,
        special: 'wrapped'
      };
      addFloatingText(c * 42 + 21, r * 42 + 21, '💣 WRAPPED BOMB!', '#FF4081', 1.3);
    }

    setBoosters(prev => ({ ...prev, [activeBooster]: prev[activeBooster] - 1 }));
    setActiveBooster(null);
    setBoard([...boardCopy]);
    processCascades(boardCopy, score, 1);
  };

  // Touch Swipe Gesture Handling
  const handleTouchStart = (r: number, c: number, e: React.TouchEvent) => {
    touchStartRef.current = {
      r,
      c,
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const { r, c, x, y } = touchStartRef.current;
    const dx = e.changedTouches[0].clientX - x;
    const dy = e.changedTouches[0].clientY - y;
    touchStartRef.current = null;

    const threshold = 20;
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swap
        const targetC = dx > 0 ? c + 1 : c - 1;
        if (targetC >= 0 && targetC < BOARD_SIZE) {
          attemptSwap({ r, c }, { r, c: targetC });
        }
      } else {
        // Vertical swap
        const targetR = dy > 0 ? r + 1 : r - 1;
        if (targetR >= 0 && targetR < BOARD_SIZE) {
          attemptSwap({ r, c }, { r: targetR, c });
        }
      }
    }
  };

  // Keyboard navigation & Shortcuts (1-3 for boosters, R for restart)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1'].includes(e.key)) setActiveBooster(b => (b === 'hammer' ? null : 'hammer'));
      if (['2'].includes(e.key)) setActiveBooster(b => (b === 'color_bomb' ? null : 'color_bomb'));
      if (['3'].includes(e.key)) setActiveBooster(b => (b === 'wrapped' ? null : 'wrapped'));
      if (['r', 'R'].includes(e.key)) {
        if (isPlaying) startMatch(gameMode, selectedLevelIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameMode, selectedLevelIndex]);

  const currentLevelCfg = gameMode === 'campaign' ? CAMPAIGN_LEVELS[selectedLevelIndex] : undefined;

  return (
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center text-slate-100 font-mono">
      {/* Top Header HUD - Ultra Slim Single Line */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-portal-neon" />
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">
            {gameMode === 'campaign' ? `LVL ${selectedLevelIndex + 1}` : (gameMode === 'arcade' ? 'BLITZ' : 'RUSH')}
          </span>
          <span className="text-sm font-black text-portal-neon">{score.toLocaleString()}</span>
        </div>

        {/* Moves / Time Left */}
        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-lg border border-portal-border/60">
          {gameMode === 'timer' ? (
            <>
              <Clock className="w-3 h-3 text-portal-cyan" />
              <span className={`text-[11px] font-black ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-portal-cyan'}`}>
                {timeLeft}s
              </span>
            </>
          ) : (
            <>
              <Zap className="w-3 h-3 text-portal-gold" />
              <span className={`text-[11px] font-black ${movesLeft <= 5 ? 'text-rose-400 animate-bounce' : 'text-portal-gold'}`}>
                {movesLeft} MOVES
              </span>
            </>
          )}
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 active:scale-95 transition-all"
        >
          {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </div>

      {/* Main 9:16 Portrait Canvas Frame - Viewport Scaled */}
      <div className="relative w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] bg-[#0c0418] rounded-2xl border-2 border-portal-border p-2.5 shadow-2xl flex flex-col items-center justify-between overflow-hidden shrink-0">
        {/* Particle Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={360}
          height={580}
          className="absolute inset-0 pointer-events-none z-30 w-full h-full"
        />

        {/* Floating Text FX */}
        {floatingTexts.map(f => (
          <div
            key={f.id}
            style={{ left: `${f.x}px`, top: `${f.y}px`, transform: `scale(${f.scale || 1})` }}
            className="absolute z-40 pointer-events-none font-black text-sm sm:text-base animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          >
            <span style={{ color: f.color }}>{f.text}</span>
          </div>
        ))}

        {/* Laser Beams FX */}
        {laserBeams.map(b => (
          <div
            key={b.id}
            className={`absolute z-35 bg-white shadow-[0_0_15px_#00F0FF] pointer-events-none animate-pulse ${
              b.type === 'row'
                ? 'w-full h-3 left-0'
                : 'h-full w-3 top-0'
            }`}
            style={b.type === 'row' ? { top: `${b.index * 12.5 + 6.25}%` } : { left: `${b.index * 12.5 + 6.25}%` }}
          />
        ))}

        {/* Level Select / Mode Selection Screen */}
        {isLevelSelect ? (
          <div className="flex flex-col items-center justify-between w-full h-full p-2 py-4 z-20 overflow-y-auto">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/40 text-[10px] font-black uppercase">
                ⚡ Neo-Brutalist Match-3
              </div>
              <h2 className="text-2xl font-black text-white tracking-wider">RETRO CANDY CRUSH</h2>
              <p className="text-[11px] text-slate-400 max-w-[260px] mx-auto">
                Match candies, forge laser specials, and shatter neon jellies!
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 w-full bg-portal-surface/60 p-1 rounded-xl border border-portal-border my-2">
              <button
                onClick={() => setGameMode('campaign')}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-all ${
                  gameMode === 'campaign' ? 'bg-portal-neon text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
                }`}
              >
                QUEST
              </button>
              <button
                onClick={() => setGameMode('arcade')}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-all ${
                  gameMode === 'arcade' ? 'bg-portal-cyan text-black shadow-glow-cyan' : 'text-slate-400 hover:text-white'
                }`}
              >
                BLITZ 25
              </button>
              <button
                onClick={() => setGameMode('timer')}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-all ${
                  gameMode === 'timer' ? 'bg-portal-pink text-black shadow-glow-pink' : 'text-slate-400 hover:text-white'
                }`}
              >
                60s RUSH
              </button>
            </div>

            {/* Campaign Level Grid or Quick Play Start */}
            {gameMode === 'campaign' ? (
              <div className="w-full flex-1 overflow-y-auto px-1 space-y-1.5 max-h-[300px]">
                {CAMPAIGN_LEVELS.map((lvl, idx) => {
                  const starsEarned = levelStars[lvl.level] || 0;
                  return (
                    <button
                      key={lvl.level}
                      onClick={() => startMatch('campaign', idx)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-portal-surface/80 hover:bg-portal-surface border border-portal-border hover:border-portal-neon/60 text-left transition-all active:scale-98 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-black/50 border border-portal-border flex items-center justify-center font-black text-xs text-portal-neon group-hover:border-portal-neon">
                          {lvl.level}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white group-hover:text-portal-neon">{lvl.name}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{lvl.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map(s => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= starsEarned ? 'text-portal-gold fill-portal-gold' : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center my-auto space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-portal-pink shadow-glow-pink animate-pulse">
                  <Flame className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-white">
                    {gameMode === 'arcade' ? 'Arcade Blitz Duel' : '60-Second Speed Rush'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                    {gameMode === 'arcade'
                      ? 'Compete for global high scores with 25 strategic moves!'
                      : 'Chain fast combos to extend time and hit Fever Mode!'}
                  </p>
                </div>
                <button
                  onClick={() => startMatch(gameMode, 0)}
                  className="w-full px-8 py-3 rounded-xl bg-portal-neon text-black font-black text-sm shadow-glow-gold active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-black" /> START GAME
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Active Game Objective Banner */}
            <div className="w-full flex items-center justify-between px-2 py-1 bg-black/40 rounded-lg border border-portal-border/60 text-[10px]">
              {gameMode === 'campaign' && currentLevelCfg ? (
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-400 font-bold uppercase">Goal:</span>
                  <span className="text-portal-cyan font-bold truncate">
                    {currentLevelCfg.targetJellies
                      ? `Jellies: ${clearedJellies}/${currentLevelCfg.targetJellies}`
                      : `Score: ${score}/${currentLevelCfg.targetScore}`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Flame className="w-3 h-3 text-portal-gold" />
                  <span className="text-portal-gold font-bold">Combo Multiplier: x{comboMultiplier}</span>
                </div>
              )}

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setIsLevelSelect(true);
                }}
                className="text-[9px] text-slate-400 hover:text-white uppercase font-bold underline"
              >
                Levels
              </button>
            </div>

            {/* 8x8 Match-3 Grid Board */}
            <div
              ref={boardRef}
              className="relative grid grid-cols-8 gap-1 w-full max-w-[340px] aspect-square p-1.5 bg-[#140628] rounded-xl border border-portal-border shadow-inner touch-none"
            >
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                  const isHinted = hintPair?.some(p => p.r === r && p.c === c);
                  const candy = cell.candy;
                  const candyCfg = candy ? CANDY_CONFIG[candy.type] : null;

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      onTouchStart={e => handleTouchStart(r, c, e)}
                      onTouchEnd={handleTouchEnd}
                      className={`relative flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150 ${
                        cell.jelly > 0 ? (cell.jelly === 2 ? 'bg-cyan-900/60 border border-cyan-400/80 shadow-[inset_0_0_8px_#00F0FF]' : 'bg-cyan-950/40 border border-cyan-500/40') : 'bg-black/30'
                      } ${
                        isSelected ? 'ring-2 ring-portal-gold scale-105 z-20 shadow-glow-gold' : ''
                      } ${
                        isHinted ? 'animate-pulse ring-1 ring-portal-cyan' : ''
                      }`}
                    >
                      {candy && candyCfg && (
                        <div
                          style={{
                            backgroundColor: candy.special === 'color_bomb' ? '#18042b' : undefined,
                            boxShadow: isSelected ? `0 0 12px ${candyCfg.color}` : undefined
                          }}
                          className={`w-full h-full rounded-md flex items-center justify-center font-black transition-transform active:scale-90 ${
                            candy.special === 'color_bomb'
                              ? 'border-2 border-yellow-300 animate-spin-slow'
                              : `bg-gradient-to-tr ${candyCfg.bgGrad} border ${candyCfg.border}`
                          }`}
                        >
                          {/* Special Icon Badges */}
                          {candy.special === 'striped_h' && (
                            <div className="absolute inset-0 flex flex-col justify-around py-0.5 pointer-events-none opacity-80">
                              <div className="w-full h-0.5 bg-white shadow-sm" />
                              <div className="w-full h-0.5 bg-white shadow-sm" />
                            </div>
                          )}
                          {candy.special === 'striped_v' && (
                            <div className="absolute inset-0 flex justify-around px-0.5 pointer-events-none opacity-80">
                              <div className="h-full w-0.5 bg-white shadow-sm" />
                              <div className="h-full w-0.5 bg-white shadow-sm" />
                            </div>
                          )}
                          {candy.special === 'wrapped' && (
                            <div className="absolute inset-0 border-2 border-dashed border-white rounded-md flex items-center justify-center">
                              <span className="text-[10px]">💣</span>
                            </div>
                          )}
                          {candy.special === 'color_bomb' ? (
                            <span className="text-sm">🌈</span>
                          ) : (
                            <span className="text-xs sm:text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                              {candyCfg.symbol}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* In-Game Power-Up Booster Bar */}
            <div className="w-full grid grid-cols-3 gap-2 px-1">
              <button
                onClick={() => setActiveBooster(b => (b === 'hammer' ? null : 'hammer'))}
                disabled={boosters.hammer <= 0}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs font-black transition-all ${
                  activeBooster === 'hammer'
                    ? 'bg-portal-gold text-black border-white shadow-glow-gold'
                    : 'bg-portal-surface/80 text-slate-300 border-portal-border hover:border-portal-gold/60'
                } ${boosters.hammer <= 0 ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <div className="flex items-center gap-1">
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Hammer</span>
                </div>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">{boosters.hammer}</span>
              </button>

              <button
                onClick={() => setActiveBooster(b => (b === 'color_bomb' ? null : 'color_bomb'))}
                disabled={boosters.color_bomb <= 0}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs font-black transition-all ${
                  activeBooster === 'color_bomb'
                    ? 'bg-portal-cyan text-black border-white shadow-glow-cyan'
                    : 'bg-portal-surface/80 text-slate-300 border-portal-border hover:border-portal-cyan/60'
                } ${boosters.color_bomb <= 0 ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Color Bomb</span>
                </div>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">{boosters.color_bomb}</span>
              </button>

              <button
                onClick={() => setActiveBooster(b => (b === 'wrapped' ? null : 'wrapped'))}
                disabled={boosters.wrapped <= 0}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs font-black transition-all ${
                  activeBooster === 'wrapped'
                    ? 'bg-portal-pink text-black border-white shadow-glow-pink'
                    : 'bg-portal-surface/80 text-slate-300 border-portal-border hover:border-portal-pink/60'
                } ${boosters.wrapped <= 0 ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <div className="flex items-center gap-1">
                  <Bomb className="w-3.5 h-3.5" />
                  <span>Bomb</span>
                </div>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">{boosters.wrapped}</span>
              </button>
            </div>
          </>
        )}

        {/* Game Over / Victory Modal Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-3 z-50 animate-scaleIn">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border ${
                isVictory
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              {isVictory ? 'LEVEL COMPLETED!' : 'OUT OF MOVES'}
            </span>

            <h3 className="text-2xl font-black text-white text-center">
              {isVictory ? 'Sugar Victory!' : 'Game Over'}
            </h3>

            <div className="text-center space-y-1">
              <div className="text-xs text-slate-400 uppercase font-bold">Final Score</div>
              <div className="text-3xl font-black text-portal-neon">{score.toLocaleString()}</div>
            </div>

            {gameMode === 'campaign' && isVictory && (
              <div className="flex items-center gap-1.5 my-2">
                {[1, 2, 3].map(s => {
                  const cfg = CAMPAIGN_LEVELS[selectedLevelIndex];
                  const earned = score >= (cfg?.stars[s - 1] ?? 99999);
                  return (
                    <Star
                      key={s}
                      className={`w-6 h-6 ${
                        earned ? 'text-portal-gold fill-portal-gold animate-bounce' : 'text-slate-600'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 w-full pt-2">
              <button
                onClick={() => {
                  setIsGameOver(false);
                  setIsLevelSelect(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-portal-surface text-slate-300 font-black text-xs border border-portal-border hover:text-white"
              >
                Levels
              </button>
              <button
                onClick={() => startMatch(gameMode, isVictory && selectedLevelIndex < CAMPAIGN_LEVELS.length - 1 ? selectedLevelIndex + 1 : selectedLevelIndex)}
                className="flex-1 py-2.5 rounded-xl bg-portal-neon text-black font-black text-xs shadow-glow-gold active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isVictory && selectedLevelIndex < CAMPAIGN_LEVELS.length - 1 ? 'Next Level' : 'Replay'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile D-Pad Companion (Mobile / Touch) */}
      <div className="mt-2 flex justify-center w-full sm:hidden">
        <MobileGamepad
          mode="4way"
          onDirectionChange={dir => {
            if (!selectedPos) return;
            const { r, c } = selectedPos;
            if (dir === 'UP' && r > 0) attemptSwap({ r, c }, { r: r - 1, c });
            if (dir === 'DOWN' && r < BOARD_SIZE - 1) attemptSwap({ r, c }, { r: r + 1, c });
            if (dir === 'LEFT' && c > 0) attemptSwap({ r, c }, { r, c: c - 1 });
            if (dir === 'RIGHT' && c < BOARD_SIZE - 1) attemptSwap({ r, c }, { r, c: c + 1 });
          }}
          label="SWAP"
        />
      </div>
    </div>
  );
}
