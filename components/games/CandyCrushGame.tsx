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

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

export interface CandyCrushGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

// 6 Neo-Retro Candy Types
export type CandyType = 0 | 1 | 2 | 3 | 4 | 5;
export type SpecialType = 'none' | 'striped_h' | 'striped_v' | 'wrapped' | 'color_bomb' | 'hazard';

export interface CandyItem {
  id: string;
  type: CandyType;
  special: SpecialType;
  hazardCountdown?: number; // Twists: countdown timer on hazard candy
}

export interface BoardCell {
  r: number;
  c: number;
  candy: CandyItem | null;
  jelly: number; // 0 = none, 1 = single, 2 = double jelly
  portalTarget?: { r: number; c: number }; // Twists: portal teleporter link
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

const CANDY_CONFIG = [
  {
    name: 'Ruby Heart',
    color: '#FF4081',
    bgGrad: 'from-pink-500 to-rose-600',
    border: 'border-pink-300',
    symbol: '❤️'
  },
  {
    name: 'Lemon Drop',
    color: '#FFE600',
    bgGrad: 'from-yellow-400 to-amber-500',
    border: 'border-yellow-200',
    symbol: '⚡'
  },
  {
    name: 'Cyan Diamond',
    color: '#00F0FF',
    bgGrad: 'from-cyan-400 to-blue-600',
    border: 'border-cyan-200',
    symbol: '💎'
  },
  {
    name: 'Acid Lime',
    color: '#A3E635',
    bgGrad: 'from-lime-400 to-emerald-600',
    border: 'border-lime-200',
    symbol: '🍏'
  },
  {
    name: 'Purple Orb',
    color: '#C084FC',
    bgGrad: 'from-purple-400 to-indigo-600',
    border: 'border-purple-200',
    symbol: '🔮'
  },
  {
    name: 'Orange Blast',
    color: '#FB923C',
    bgGrad: 'from-orange-400 to-red-600',
    border: 'border-orange-200',
    symbol: '🔶'
  }
];

// Linear Campaign Levels with increasing twists
export interface LevelConfig {
  level: number;
  name: string;
  moves: number;
  targetScore: number;
  targetJellies?: number;
  hasHazards?: boolean;
  hasPortals?: boolean;
  stars: [number, number, number];
  description: string;
}

const CAMPAIGN_LEVELS: LevelConfig[] = [
  { level: 1, name: 'Sugar Spark', moves: 20, targetScore: 3000, stars: [3000, 5000, 8000], description: 'Welcome to Break Hub Candy! Match 3 candies to score 3,000 points.' },
  { level: 2, name: 'Neon Jelly Siege', moves: 22, targetScore: 5000, targetJellies: 10, stars: [5000, 8000, 12000], description: 'Shatter 10 glowing neon jellies beneath the tiles!' },
  { level: 3, name: 'Glitch Hazard Outpost', moves: 22, targetScore: 7000, hasHazards: true, stars: [7000, 11000, 16000], description: 'TWIST: Glitch Hazard bombs appear! Match them before countdown hits 0!' },
  { level: 4, name: 'Laser Striper Forge', moves: 20, targetScore: 9000, stars: [9000, 14000, 20000], description: 'Match 4 in a row to forge Laser Striped Candies that clear entire rows!' },
  { level: 5, name: 'Wormhole Portal Grid', moves: 24, targetScore: 12000, hasPortals: true, stars: [12000, 18000, 26000], description: 'TWIST: Quantum wormholes teleport falling candies across the board!' },
  { level: 6, name: 'Wrapped Bomb Blitz', moves: 22, targetScore: 15000, stars: [15000, 22000, 32000], description: 'Form T & L shapes for explosive Wrapped Bomb Candies!' },
  { level: 7, name: 'Double Jelly Nightmare', moves: 25, targetScore: 18000, targetJellies: 16, hasHazards: true, stars: [18000, 26000, 38000], description: 'Clear double-layer jellies while evading unstable glitch hazards!' },
  { level: 8, name: 'Color Bomb Disco', moves: 22, targetScore: 22000, stars: [22000, 32000, 48000], description: 'Align 5 in a row to unleash the ultimate Rainbow Color Bomb!' },
  { level: 9, name: 'Quantum Portal Chaos', moves: 25, targetScore: 28000, hasPortals: true, hasHazards: true, stars: [28000, 42000, 60000], description: 'TWIST: Wormhole portals & glitch hazards combined! Pure arcade mastery.' },
  { level: 10, name: 'Sugar Overlord Singularity', moves: 30, targetScore: 40000, targetJellies: 24, hasHazards: true, hasPortals: true, stars: [40000, 60000, 90000], description: 'Final Boss Level: Defeat the Sugar Singularity with all twists active!' }
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
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});

  const [board, setBoard] = useState<BoardCell[][]>([]);
  const [score, setScore] = useState<number>(0);
  const [movesLeft, setMovesLeft] = useState<number>(20);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [sugarFever, setSugarFever] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLevelIntro, setIsLevelIntro] = useState<boolean>(true);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [clearedJellies, setClearedJellies] = useState<number>(0);
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
  const [activeBooster, setActiveBooster] = useState<'hammer' | 'color_bomb' | 'wrapped' | null>(null);
  const [boosters, setBoosters] = useState<{ hammer: number; color_bomb: number; wrapped: number }>({ hammer: 3, color_bomb: 2, wrapped: 2 });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [laserBeams, setLaserBeams] = useState<{ id: string; type: 'row' | 'col'; index: number }[]>([]);
  const [hintPair, setHintPair] = useState<[{ r: number; c: number }, { r: number; c: number }] | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ r: number; c: number; x: number; y: number } | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Load progress
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedStars = localStorage.getItem('retro_candy_stars');
        if (savedStars) setLevelStars(JSON.parse(savedStars));
        const savedUnlock = localStorage.getItem('retro_candy_unlocked');
        if (savedUnlock) setUnlockedLevel(parseInt(savedUnlock, 10));
      } catch {}
    }
  }, []);

  const saveProgress = (lvlIdx: number, stars: number) => {
    const lvlNum = CAMPAIGN_LEVELS[lvlIdx].level;
    setLevelStars(prev => {
      const updated = { ...prev, [lvlNum]: Math.max(prev[lvlNum] || 0, stars) };
      try { localStorage.setItem('retro_candy_stars', JSON.stringify(updated)); } catch {}
      return updated;
    });

    const nextIdx = lvlIdx + 1;
    if (nextIdx > unlockedLevel && nextIdx < CAMPAIGN_LEVELS.length) {
      setUnlockedLevel(nextIdx);
      try { localStorage.setItem('retro_candy_unlocked', nextIdx.toString()); } catch {}
    }
  };

  // Sound synthesis
  const playSfx = useCallback((type: 'swap' | 'pop' | 'laser' | 'bomb' | 'color_bomb' | 'combo' | 'sugar' | 'hammer' | 'reject', pitch = 1) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      } else if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      } else if (type === 'bomb') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }, [soundEnabled]);

  // Particle engine
  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 3,
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
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    let active = true;
    const render = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life++;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.life >= p.maxLife) parts.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const addFloatingText = (x: number, y: number, text: string, color = '#FFE600') => {
    const id = `f_${Date.now()}_${Math.random()}`;
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
  };

  // Find valid matches
  const findMatches = (grid: BoardCell[][]) => {
    const matchMap: boolean[][] = Array(BOARD_SIZE).fill(false).map(() => Array(BOARD_SIZE).fill(false));
    const matchGroups: { cells: { r: number; c: number }[]; type: CandyType; isHorizontal: boolean }[] = [];

    // Horizontal
    for (let r = 0; r < BOARD_SIZE; r++) {
      let count = 1;
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cur = grid[r][c]?.candy;
        const nxt = c < BOARD_SIZE - 1 ? grid[r][c + 1]?.candy : null;
        if (cur && nxt && cur.type === nxt.type && cur.special !== 'color_bomb' && nxt.special !== 'color_bomb') {
          count++;
        } else {
          if (count >= 3 && cur) {
            const cells = [];
            for (let k = c - count + 1; k <= c; k++) {
              matchMap[r][k] = true;
              cells.push({ r, c: k });
            }
            matchGroups.push({ cells, type: cur.type, isHorizontal: true });
          }
          count = 1;
        }
      }
    }

    // Vertical
    for (let c = 0; c < BOARD_SIZE; c++) {
      let count = 1;
      for (let r = 0; r < BOARD_SIZE; r++) {
        const cur = grid[r][c]?.candy;
        const nxt = r < BOARD_SIZE - 1 ? grid[r + 1][c]?.candy : null;
        if (cur && nxt && cur.type === nxt.type && cur.special !== 'color_bomb' && nxt.special !== 'color_bomb') {
          count++;
        } else {
          if (count >= 3 && cur) {
            const cells = [];
            for (let k = r - count + 1; k <= r; k++) {
              matchMap[k][c] = true;
              cells.push({ r: k, c });
            }
            matchGroups.push({ cells, type: cur.type, isHorizontal: false });
          }
          count = 1;
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

  const findPossibleMoves = (grid: BoardCell[][]) => {
    const moves: [{ r: number; c: number }, { r: number; c: number }][] = [];
    const dirs = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const c1 = grid[r][c]?.candy;
        if (!c1) continue;
        for (const { dr, dc } of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr < BOARD_SIZE && nc < BOARD_SIZE) {
            const c2 = grid[nr][nc]?.candy;
            if (!c2) continue;
            if (c1.special === 'color_bomb' || c2.special === 'color_bomb') {
              moves.push([{ r, c }, { r: nr, c: nc }]);
              continue;
            }
            const cloned = grid.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));
            const temp = cloned[r][c].candy;
            cloned[r][c].candy = cloned[nr][nc].candy;
            cloned[nr][nc].candy = temp;
            if (findMatches(cloned).matches.length > 0) {
              moves.push([{ r, c }, { r: nr, c: nc }]);
            }
          }
        }
      }
    }
    return moves;
  };

  const generateBoard = (cfg: LevelConfig): BoardCell[][] => {
    const grid: BoardCell[][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const row: BoardCell[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        let jelly = 0;
        if (cfg.targetJellies && Math.random() < 0.35) {
          jelly = Math.random() < 0.4 ? 2 : 1;
        }

        // Twists: Portals linking (e.g., top row to bottom row)
        let portalTarget;
        if (cfg.hasPortals && r === 0 && (c === 2 || c === 5)) {
          portalTarget = { r: BOARD_SIZE - 1, c: c === 2 ? 5 : 2 };
        }

        const exclude: CandyType[] = [];
        if (c >= 2 && row[c - 1]?.candy && row[c - 2]?.candy && row[c - 1].candy?.type === row[c - 2].candy?.type) {
          exclude.push(row[c - 1].candy!.type);
        }
        if (r >= 2 && grid[r - 1]?.[c]?.candy && grid[r - 2]?.[c]?.candy && grid[r - 1][c].candy?.type === grid[r - 2][c].candy?.type) {
          exclude.push(grid[r - 1][c].candy!.type);
        }

        // Twists: Hazard glitch candy chance
        const isHazard = cfg.hasHazards && Math.random() < 0.08;
        const candy = createRandomCandy(exclude);
        if (isHazard) {
          candy.special = 'hazard';
          candy.hazardCountdown = 5;
        }

        row.push({ r, c, candy, jelly, portalTarget });
      }
      grid.push(row);
    }

    if (findPossibleMoves(grid).length === 0) return generateBoard(cfg);
    return grid;
  };

  const startLevel = (idx: number) => {
    setCurrentLevelIdx(idx);
    const cfg = CAMPAIGN_LEVELS[idx];
    const newBoard = generateBoard(cfg);
    setBoard(newBoard);
    setScore(0);
    setMovesLeft(cfg.moves);
    setClearedJellies(0);
    setSugarFever(false);
    setSelectedPos(null);
    setIsGameOver(false);
    setIsVictory(false);
    setIsProcessing(false);
    setIsLevelIntro(false);
    setIsPlaying(true);
    setLaserBeams([]);
  };

  const resetIdleHint = (currentBoard: BoardCell[][]) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setHintPair(null);
    idleTimerRef.current = setTimeout(() => {
      const moves = findPossibleMoves(currentBoard);
      if (moves.length > 0) setHintPair(moves[0]);
    }, 4500);
  };

  const triggerLaser = (type: 'row' | 'col', index: number) => {
    const id = `l_${Date.now()}_${Math.random()}`;
    setLaserBeams(prev => [...prev, { id, type, index }]);
    playSfx('laser');
    setTimeout(() => setLaserBeams(prev => prev.filter(b => b.id !== id)), 400);
  };

  const checkWinCondition = (currentScore: number, jellies: number) => {
    const cfg = CAMPAIGN_LEVELS[currentLevelIdx];
    const scoreOk = currentScore >= cfg.targetScore;
    const jellyOk = cfg.targetJellies ? jellies >= cfg.targetJellies : true;
    return scoreOk && jellyOk;
  };

  const processCascades = async (currentBoard: BoardCell[][], currentScore: number, combo = 1): Promise<void> => {
    setIsProcessing(true);
    const { matches, matchGroups } = findMatches(currentBoard);

    if (matches.length === 0) {
      // Check hazards countdown decrement
      let hazardExploded = false;
      const boardCopy = currentBoard.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const candy = boardCopy[r][c].candy;
          if (candy && candy.special === 'hazard' && candy.hazardCountdown !== undefined) {
            candy.hazardCountdown -= 1;
            if (candy.hazardCountdown <= 0) {
              hazardExploded = true;
              boardCopy[r][c].candy = null; // Hazard exploded penalty!
              playSfx('bomb');
              addFloatingText(c * 42 + 21, r * 42 + 21, '💥 GLITCH EXPLOSION!', '#FF4081');
            }
          }
        }
      }

      if (hazardExploded) {
        setBoard([...boardCopy]);
        await new Promise(r => setTimeout(r, 400));
      }

      // Check possible moves or reshuffle
      if (findPossibleMoves(boardCopy).length === 0) {
        addFloatingText(180, 240, '🔄 SHUFFLE!', '#00F0FF');
        setBoard(generateBoard(CAMPAIGN_LEVELS[currentLevelIdx]));
      }

      setIsProcessing(false);
      resetIdleHint(boardCopy);

      const won = checkWinCondition(currentScore, clearedJellies);
      if (won) {
        setIsPlaying(false);
        setIsVictory(true);
        setIsGameOver(true);
        const cfg = CAMPAIGN_LEVELS[currentLevelIdx];
        let stars = currentScore >= cfg.stars[2] ? 3 : currentScore >= cfg.stars[1] ? 2 : 1;
        saveProgress(currentLevelIdx, stars);
        confetti({ particleCount: 120, spread: 80 });
        playSfx('sugar');
        return;
      } else if (movesLeft <= 0) {
        setIsPlaying(false);
        setIsVictory(false);
        setIsGameOver(true);
        playSfx('reject');
        return;
      }
      return;
    }

    const boardCopy = currentBoard.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));
    const cellsToClear: { r: number; c: number }[] = [...matches];
    let newlyClearedJellies = 0;
    const specialCreations: { r: number; c: number; special: SpecialType; type: CandyType }[] = [];

    matchGroups.forEach(group => {
      const len = group.cells.length;
      const center = group.cells[Math.floor(len / 2)];
      if (len >= 5) {
        specialCreations.push({ r: center.r, c: center.c, special: 'color_bomb', type: group.type });
      } else if (len === 4) {
        const special: SpecialType = group.isHorizontal ? 'striped_v' : 'striped_h';
        specialCreations.push({ r: center.r, c: center.c, special, type: group.type });
      }
    });

    matches.forEach(({ r, c }) => {
      const cell = boardCopy[r][c];
      if (cell.candy && cell.candy.special === 'striped_h') {
        triggerLaser('row', r);
        for (let col = 0; col < BOARD_SIZE; col++) cellsToClear.push({ r, c: col });
      } else if (cell.candy && cell.candy.special === 'striped_v') {
        triggerLaser('col', c);
        for (let row = 0; row < BOARD_SIZE; row++) cellsToClear.push({ r: row, c });
      }
      if (cell.jelly > 0) {
        cell.jelly--;
        if (cell.jelly === 0) newlyClearedJellies++;
      }
    });

    // Unique clear list
    const uniqueMap = new Set<string>();
    const finalClear: { r: number; c: number }[] = [];
    cellsToClear.forEach(p => {
      if (!uniqueMap.has(`${p.r}_${p.c}`)) {
        uniqueMap.add(`${p.r}_${p.c}`);
        finalClear.push(p);
      }
    });

    finalClear.forEach(({ r, c }) => {
      boardCopy[r][c].candy = null;
    });

    specialCreations.forEach(({ r, c, special, type }) => {
      boardCopy[r][c].candy = { id: `spec_${Date.now()}_${Math.random()}`, type, special };
    });

    const feverMult = sugarFever ? 2 : 1;
    const pts = finalClear.length * 50 * combo * feverMult;
    const nextScore = currentScore + pts;

    setScore(nextScore);
    setClearedJellies(prev => prev + newlyClearedJellies);
    setComboMultiplier(combo);
    if (combo >= 3) setSugarFever(true);

    playSfx('pop', combo);
    setBoard([...boardCopy]);
    await new Promise(r => setTimeout(r, 200));

    // Gravity & Portal Drop
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
      for (let r = emptyRow; r >= 0; r--) {
        boardCopy[r][c].candy = createRandomCandy();
      }
    }

    setBoard([...boardCopy]);
    await new Promise(r => setTimeout(r, 200));
    await processCascades(boardCopy, nextScore, combo + 1);
  };

  const attemptSwap = async (p1: { r: number; c: number }, p2: { r: number; c: number }) => {
    if (isProcessing || !isPlaying || isGameOver) return;
    const dr = Math.abs(p1.r - p2.r);
    const dc = Math.abs(p1.c - p2.c);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      const c1 = board[p1.r][p1.c].candy;
      const c2 = board[p2.r][p2.c].candy;
      if (!c1 || !c2) return;

      setIsProcessing(true);
      playSfx('swap');
      const cloned = board.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));
      cloned[p1.r][p1.c].candy = c2;
      cloned[p2.r][p2.c].candy = c1;
      setBoard([...cloned]);

      const { matches } = findMatches(cloned);
      if (matches.length > 0) {
        setSelectedPos(null);
        setMovesLeft(m => Math.max(0, m - 1));
        await new Promise(r => setTimeout(r, 150));
        await processCascades(cloned, score, 1);
      } else {
        playSfx('reject');
        await new Promise(r => setTimeout(r, 200));
        setBoard([...board]);
        setIsProcessing(false);
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (isProcessing || !isPlaying || isGameOver) return;
    if (activeBooster) {
      const cloned = board.map(row => row.map(cell => ({ ...cell, candy: cell.candy ? { ...cell.candy } : null })));
      if (activeBooster === 'hammer') {
        playSfx('hammer');
        cloned[r][c].candy = null;
        if (cloned[r][c].jelly > 0) cloned[r][c].jelly = 0;
      } else if (activeBooster === 'color_bomb') {
        playSfx('color_bomb');
        cloned[r][c].candy = { id: `cb_${Date.now()}`, type: 0, special: 'color_bomb' };
      }
      setBoosters(prev => ({ ...prev, [activeBooster]: prev[activeBooster] - 1 }));
      setActiveBooster(null);
      setBoard([...cloned]);
      processCascades(cloned, score, 1);
      return;
    }

    if (!selectedPos) {
      setSelectedPos({ r, c });
      playSfx('swap');
    } else {
      if (selectedPos.r === r && selectedPos.c === c) {
        setSelectedPos(null);
      } else {
        attemptSwap(selectedPos, { r, c });
        setSelectedPos(null);
      }
    }
  };

  const currentCfg = CAMPAIGN_LEVELS[currentLevelIdx];

  return (
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center text-slate-100 font-mono">
      {/* Top Header HUD */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-portal-neon" />
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">LVL {currentCfg.level}</span>
          <span className="text-sm font-black text-portal-neon">{score.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-lg border border-portal-border/60">
          <Zap className="w-3 h-3 text-portal-gold" />
          <span className={`text-[11px] font-black ${movesLeft <= 5 ? 'text-rose-400 animate-bounce' : 'text-portal-gold'}`}>
            {movesLeft} MOVES
          </span>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 transition-all"
        >
          {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </div>

      {/* Main 9:16 Portrait Canvas Frame */}
      <div className="relative w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] bg-gradient-to-b from-[#090014] via-[#260021] to-[#08000d] rounded-2xl border-2 border-[#3d1030] p-2.5 shadow-[0_8px_32px_rgba(255,0,127,0.2)] flex flex-col items-center justify-between overflow-hidden shrink-0">
        <canvas ref={canvasRef} width={360} height={580} className="absolute inset-0 pointer-events-none z-30 w-full h-full" />

        {floatingTexts.map(f => (
          <div key={f.id} style={{ left: `${f.x}px`, top: `${f.y}px` }} className="absolute z-40 pointer-events-none font-black text-sm animate-bounce">
            <span style={{ color: f.color }}>{f.text}</span>
          </div>
        ))}

        {laserBeams.map(b => (
          <div
            key={b.id}
            className={`absolute z-35 bg-white shadow-[0_0_15px_#00F0FF] pointer-events-none animate-pulse ${
              b.type === 'row' ? 'w-full h-3 left-0' : 'h-full w-3 top-0'
            }`}
            style={b.type === 'row' ? { top: `${b.index * 12.5 + 6.25}%` } : { left: `${b.index * 12.5 + 6.25}%` }}
          />
        ))}

        {/* Level Intro / Progression Screen (NO level picker — linear progression only!) */}
        {isLevelIntro ? (
          <div className="flex flex-col items-center justify-center w-full h-full p-4 z-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-portal-neon/20 border border-portal-neon flex items-center justify-center text-portal-neon shadow-glow-gold animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] text-portal-cyan font-black uppercase tracking-widest">LEVEL {currentCfg.level}</span>
              <h2 className="text-2xl font-black text-white">{currentCfg.name}</h2>
              <p className="text-xs text-slate-300 mt-2 max-w-[240px] leading-relaxed">{currentCfg.description}</p>
            </div>

            <div className="bg-black/50 p-3 rounded-xl border border-portal-border w-full space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Target Score:</span><span className="text-portal-gold font-black">{currentCfg.targetScore.toLocaleString()}</span></div>
              {currentCfg.targetJellies && <div className="flex justify-between"><span className="text-slate-400">Target Jellies:</span><span className="text-portal-cyan font-black">{currentCfg.targetJellies}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">Allowed Moves:</span><span className="text-white font-black">{currentCfg.moves}</span></div>
            </div>

            <button
              onClick={() => startLevel(currentLevelIdx)}
              className="w-full py-3.5 rounded-xl bg-portal-neon text-black font-black text-sm shadow-glow-gold active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" /> START LEVEL {currentCfg.level}
            </button>
          </div>
        ) : (
          <>
            {/* Objective Bar */}
            <div className="w-full flex items-center justify-between px-2 py-1 bg-black/40 rounded-lg border border-portal-border/60 text-[10px]">
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-400 font-bold uppercase">Goal:</span>
                <span className="text-portal-cyan font-bold truncate">
                  {currentCfg.targetJellies ? `Jellies: ${clearedJellies}/${currentCfg.targetJellies}` : `Score: ${score}/${currentCfg.targetScore}`}
                </span>
              </div>
              {sugarFever && (
                <div className="flex items-center gap-1 text-portal-gold animate-pulse font-black">
                  <Flame className="w-3 h-3" /> SUGAR FEVER x2
                </div>
              )}
            </div>

            {/* 8x8 Board */}
            <div ref={boardRef} className="relative grid grid-cols-8 gap-1 w-full max-w-[340px] aspect-square p-1.5 bg-[#140628] rounded-xl border border-portal-border shadow-inner">
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                  const isHinted = hintPair?.some(p => p.r === r && p.c === c);
                  const candy = cell.candy;
                  const cfg = candy ? CANDY_CONFIG[candy.type] : null;

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`relative flex items-center justify-center rounded-lg cursor-pointer transition-all ${
                        cell.jelly > 0 ? 'bg-cyan-950/60 border border-cyan-400/60 shadow-[inset_0_0_6px_#00F0FF]' : 'bg-black/30'
                      } ${isSelected ? 'ring-2 ring-portal-gold scale-105 z-20' : ''} ${isHinted ? 'animate-pulse ring-1 ring-portal-cyan' : ''}`}
                    >
                      {candy && cfg && (
                        <div
                          className={`w-full h-full rounded-md flex items-center justify-center font-black ${
                            candy.special === 'hazard'
                              ? 'bg-rose-900 border-2 border-rose-400 animate-pulse text-white text-xs'
                              : candy.special === 'color_bomb'
                              ? 'bg-black border-2 border-yellow-300 animate-spin-slow'
                              : `bg-gradient-to-tr ${cfg.bgGrad} border ${cfg.border}`
                          }`}
                        >
                          {candy.special === 'hazard' ? (
                            <span className="text-[11px] font-black">💣{candy.hazardCountdown}</span>
                          ) : candy.special === 'color_bomb' ? (
                            <span>🌈</span>
                          ) : (
                            <span className="text-xs sm:text-sm drop-shadow">{cfg.symbol}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Boosters */}
            <div className="w-full grid grid-cols-2 gap-2 px-1">
              <button
                onClick={() => setActiveBooster(b => (b === 'hammer' ? null : 'hammer'))}
                disabled={boosters.hammer <= 0}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs font-black transition-all ${
                  activeBooster === 'hammer' ? 'bg-portal-gold text-black border-white' : 'bg-portal-surface/80 text-slate-300 border-portal-border'
                }`}
              >
                <span className="flex items-center gap-1"><Hammer className="w-3.5 h-3.5" /> Hammer</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">{boosters.hammer}</span>
              </button>
              <button
                onClick={() => setActiveBooster(b => (b === 'color_bomb' ? null : 'color_bomb'))}
                disabled={boosters.color_bomb <= 0}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs font-black transition-all ${
                  activeBooster === 'color_bomb' ? 'bg-portal-cyan text-black border-white' : 'bg-portal-surface/80 text-slate-300 border-portal-border'
                }`}
              >
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Color Bomb</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">{boosters.color_bomb}</span>
              </button>
            </div>
          </>
        )}

        {/* Win / Loss Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-3 z-50">
            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border ${isVictory ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'}`}>
              {isVictory ? `LEVEL ${currentCfg.level} CLEARED!` : 'OUT OF MOVES'}
            </span>

            <h3 className="text-2xl font-black text-white">{isVictory ? 'Sugar Victory!' : 'Defeated!'}</h3>
            <div className="text-3xl font-black text-portal-neon">{score.toLocaleString()} PTS</div>

            {isVictory && (
              <div className="flex items-center gap-1.5 my-2">
                {[1, 2, 3].map(s => (
                  <Star key={s} className={`w-6 h-6 ${score >= currentCfg.stars[s - 1] ? 'text-portal-gold fill-portal-gold' : 'text-slate-600'}`} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 w-full pt-2">
              <button onClick={() => setIsLevelIntro(true)} className="flex-1 py-2.5 rounded-xl bg-portal-surface text-slate-300 font-black text-xs border border-portal-border">
                Menu
              </button>
              {isVictory && currentLevelIdx < CAMPAIGN_LEVELS.length - 1 ? (
                <button
                  onClick={() => {
                    const nextIdx = currentLevelIdx + 1;
                    setCurrentLevelIdx(nextIdx);
                    startLevel(nextIdx);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-portal-neon text-black font-black text-xs shadow-glow-gold active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  Next Level <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              ) : (
                <button onClick={() => startLevel(currentLevelIdx)} className="flex-1 py-2.5 rounded-xl bg-portal-neon text-black font-black text-xs shadow-glow-gold">
                  Replay
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
