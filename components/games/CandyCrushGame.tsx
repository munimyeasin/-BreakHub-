'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Flame,
  Zap,
  Star,
  ChevronRight,
  Hammer,
  Bomb
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BOARD_SIZE = 8;
const TILE_SIZE = 45; // 8 * 45 = 360px board width

export interface CandyCrushGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type CandyType = 0 | 1 | 2 | 3 | 4 | 5;
export type SpecialType = 'none' | 'striped_h' | 'striped_v' | 'wrapped' | 'color_bomb' | 'hazard';

export interface CandyItem {
  id: string;
  type: CandyType;
  special: SpecialType;
  hazardCountdown?: number;
  x: number; // pixel x for animation
  y: number; // pixel y for animation
  targetX: number;
  targetY: number;
  scale: number;
  alpha: number;
}

export interface BoardCell {
  r: number;
  c: number;
  candy: CandyItem | null;
  jelly: number; // 0 = none, 1 = single, 2 = double jelly
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

export interface FloatingText {
  id?: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

const CANDY_METADATA = [
  { name: 'Ruby Heart', color: '#FF4081', glow: '#FF007F', symbol: '❤️' },
  { name: 'Lemon Drop', color: '#FFE600', glow: '#FFD700', symbol: '⚡' },
  { name: 'Cyan Diamond', color: '#00F0FF', glow: '#00BFFF', symbol: '💎' },
  { name: 'Acid Lime', color: '#A3E635', glow: '#00FF66', symbol: '🍏' },
  { name: 'Purple Orb', color: '#C084FC', glow: '#9333EA', symbol: '🔮' },
  { name: 'Orange Blast', color: '#FB923C', glow: '#FF6600', symbol: '🔶' }
];

export interface LevelConfig {
  level: number;
  name: string;
  moves: number;
  targetScore: number;
  targetJellies?: number;
  hasHazards?: boolean;
  stars: [number, number, number];
  description: string;
}

const CAMPAIGN_LEVELS: LevelConfig[] = [
  { level: 1, name: 'Sugar Spark', moves: 22, targetScore: 3500, stars: [3500, 6000, 10000], description: 'Match 3 neo-candies to score 3,500 points!' },
  { level: 2, name: 'Neon Jelly Siege', moves: 24, targetScore: 5500, targetJellies: 12, stars: [5500, 9000, 14000], description: 'Shatter 12 glowing neon jellies beneath the tiles!' },
  { level: 3, name: 'Glitch Hazard Outpost', moves: 22, targetScore: 8000, hasHazards: true, stars: [8000, 13000, 19000], description: 'TWIST: Match glitch bombs before their countdown hits 0!' },
  { level: 4, name: 'Laser Striper Forge', moves: 25, targetScore: 11000, stars: [11000, 17000, 25000], description: 'Match 4 in a row to forge Laser Striped Candies!' },
  { level: 5, name: 'Sugar Overlord Singularity', moves: 30, targetScore: 25000, targetJellies: 20, hasHazards: true, stars: [25000, 40000, 65000], description: 'Final Boss Arena: Shatter 20 jellies & score 25,000 pts!' }
];

let globalCandyCounter = 0;
function createCandy(type?: CandyType): CandyItem {
  globalCandyCounter++;
  const t = type !== undefined ? type : (Math.floor(Math.random() * 6) as CandyType);
  return {
    id: `candy_${globalCandyCounter}_${Date.now()}_${Math.random()}`,
    type: t,
    special: 'none',
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    scale: 1,
    alpha: 1
  };
}

export default function CandyCrushGame({ gameId, onGameOver }: CandyCrushGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Campaign State
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(22);
  const [clearedJellies, setClearedJellies] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sugarFever, setSugarFever] = useState(false);

  // Game UI States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLevelIntro, setIsLevelIntro] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeBooster, setActiveBooster] = useState<'hammer' | 'color_bomb' | null>(null);
  const [boosters, setBoosters] = useState({ hammer: 3, color_bomb: 2 });

  // Board & Animation Refs (60fps Canvas Loop)
  const boardRef = useRef<BoardCell[][]>([]);
  const selectedRef = useRef<{ r: number; c: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const isProcessingRef = useRef(false);
  const shakeRef = useRef(0);

  // Load Stars
  useEffect(() => {
    try {
      const saved = localStorage.getItem('breakhub_candy_stars');
      if (saved) setLevelStars(JSON.parse(saved));
    } catch {}
  }, []);

  const saveStars = (lvl: number, stars: number) => {
    setLevelStars(prev => {
      const updated = { ...prev, [lvl]: Math.max(prev[lvl] || 0, stars) };
      try { localStorage.setItem('breakhub_candy_stars', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Web Audio Synth
  const playSound = useCallback((type: 'swap' | 'pop' | 'laser' | 'bomb' | 'win' | 'over' | 'hammer', pitch = 1) => {
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

      if (type === 'swap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampType ? osc.frequency.exponentialRampToValueAtTime(500, now + 0.05) : osc.frequency.linearRampToValueAtTime(500, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(800 * pitch, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'bomb') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.setValueAtTime(f, now + i * 0.08);
          g.gain.setValueAtTime(0.2, now + i * 0.08);
          g.gain.linearRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.2);
        });
      } else if (type === 'over') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch {}
  }, [soundEnabled]);

  // Spawn Particle FX
  const spawnParticles = (x: number, y: number, color: string, count = 15) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        life: 0,
        maxLife: 25 + Math.random() * 15
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#FFE600') => {
    floatingTextsRef.current.push({
      x, y, text, color, alpha: 1, vy: -1.5
    });
  };

  // Board generation helper
  const generateBoard = (cfg: LevelConfig): BoardCell[][] => {
    const grid: BoardCell[][] = [];
    const startX = (CANVAS_WIDTH - BOARD_SIZE * TILE_SIZE) / 2 + 20;
    const startY = 110;

    for (let r = 0; r < BOARD_SIZE; r++) {
      const row: BoardCell[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        let jelly = 0;
        if (cfg.targetJellies && Math.random() < 0.4) {
          jelly = Math.random() < 0.5 ? 2 : 1;
        }

        const candy = createCandy();
        if (cfg.hasHazards && Math.random() < 0.08) {
          candy.special = 'hazard';
          candy.hazardCountdown = 5;
        }

        const px = startX + c * TILE_SIZE;
        const py = startY + r * TILE_SIZE;
        candy.x = px;
        candy.y = py;
        candy.targetX = px;
        candy.targetY = py;

        row.push({ r, c, candy, jelly });
      }
      grid.push(row);
    }
    return grid;
  };

  const startLevel = (idx: number) => {
    setCurrentLevelIdx(idx);
    const cfg = CAMPAIGN_LEVELS[idx];
    boardRef.current = generateBoard(cfg);
    setScore(0);
    setMovesLeft(cfg.moves);
    setClearedJellies(0);
    setCombo(0);
    setSugarFever(false);
    selectedRef.current = null;
    setIsGameOver(false);
    setIsVictory(false);
    setIsLevelIntro(false);
    setIsPlaying(true);
    isProcessingRef.current = false;
  };

  // Match finding logic
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

  // Cascades & Gravity loop
  const processCascades = async (currentScore: number, comboCount = 1): Promise<void> => {
    isProcessingRef.current = true;
    const grid = boardRef.current;
    const { matches, matchGroups } = findMatches(grid);

    if (matches.length === 0) {
      isProcessingRef.current = false;
      const cfg = CAMPAIGN_LEVELS[currentLevelIdx];
      const scoreOk = currentScore >= cfg.targetScore;
      const jellyOk = cfg.targetJellies ? clearedJellies >= cfg.targetJellies : true;

      if (scoreOk && jellyOk) {
        setIsPlaying(false);
        setIsVictory(true);
        setIsGameOver(true);
        const stars = currentScore >= cfg.stars[2] ? 3 : currentScore >= cfg.stars[1] ? 2 : 1;
        saveStars(currentLevelIdx, stars);
        playSound('win');
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        return;
      } else if (movesLeft <= 0) {
        setIsPlaying(false);
        setIsVictory(false);
        setIsGameOver(true);
        playSound('over');
        return;
      }
      return;
    }

    const cellsToClear: { r: number; c: number }[] = [...matches];
    let newlyClearedJellies = 0;
    const specialCreations: { r: number; c: number; special: SpecialType; type: CandyType }[] = [];

    matchGroups.forEach(group => {
      const len = group.cells.length;
      const center = group.cells[Math.floor(len / 2)];
      if (len >= 5) {
        specialCreations.push({ r: center.r, c: center.c, special: 'color_bomb', type: group.type });
      } else if (len === 4) {
        specialCreations.push({ r: center.r, c: center.c, special: group.isHorizontal ? 'striped_v' : 'striped_h', type: group.type });
      }
    });

    matches.forEach(({ r, c }) => {
      const cell = grid[r][c];
      if (cell.candy) {
        const meta = CANDY_METADATA[cell.candy.type];
        spawnParticles(cell.candy.x + TILE_SIZE / 2, cell.candy.y + TILE_SIZE / 2, meta.color, 8);
      }
      if (cell.jelly > 0) {
        cell.jelly--;
        if (cell.jelly === 0) newlyClearedJellies++;
      }
    });

    // Clear matched candies
    matches.forEach(({ r, c }) => {
      grid[r][c].candy = null;
    });

    specialCreations.forEach(({ r, c, special, type }) => {
      const candy = createCandy(type);
      candy.special = special;
      candy.x = grid[r][c].c * TILE_SIZE + (CANVAS_WIDTH - BOARD_SIZE * TILE_SIZE) / 2 + 20;
      candy.y = grid[r][c].r * TILE_SIZE + 110;
      candy.targetX = candy.x;
      candy.targetY = candy.y;
      grid[r][c].candy = candy;
    });

    const pts = matches.length * 60 * comboCount * (sugarFever ? 2 : 1);
    const updatedScore = currentScore + pts;
    setScore(updatedScore);
    setClearedJellies(prev => prev + newlyClearedJellies);
    setCombo(comboCount);
    if (comboCount >= 3) setSugarFever(true);

    playSound('pop', comboCount);
    if (comboCount >= 2) {
      const startX = (CANVAS_WIDTH - BOARD_SIZE * TILE_SIZE) / 2 + 20;
      addFloatingText(startX + 80, 250, `SWEET! x${comboCount}`, '#00F0FF');
    }

    await new Promise(r => setTimeout(r, 220));

    // Gravity Drop & Fill
    const startX = (CANVAS_WIDTH - BOARD_SIZE * TILE_SIZE) / 2 + 20;
    const startY = 110;

    for (let c = 0; c < BOARD_SIZE; c++) {
      let emptyRow = BOARD_SIZE - 1;
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        if (grid[r][c].candy !== null) {
          if (r !== emptyRow) {
            grid[emptyRow][c].candy = grid[r][c].candy;
            grid[r][c].candy = null;
          }
          emptyRow--;
        }
      }
      for (let r = emptyRow; r >= 0; r--) {
        const newCandy = createCandy();
        const tx = startX + c * TILE_SIZE;
        const ty = startY + r * TILE_SIZE;
        newCandy.x = tx;
        newCandy.y = startY - 60; // Drop from above
        newCandy.targetX = tx;
        newCandy.targetY = ty;
        grid[r][c].candy = newCandy;
      }
    }

    await new Promise(r => setTimeout(r, 250));
    await processCascades(updatedScore, comboCount + 1);
  };

  // Click & Swap handling
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isGameOver || isProcessingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const startX = (CANVAS_WIDTH - BOARD_SIZE * TILE_SIZE) / 2 + 20;
    const startY = 110;

    if (x < startX || x > startX + BOARD_SIZE * TILE_SIZE || y < startY || y > startY + BOARD_SIZE * TILE_SIZE) return;

    const c = Math.floor((x - startX) / TILE_SIZE);
    const r = Math.floor((y - startY) / TILE_SIZE);

    if (activeBooster === 'hammer') {
      playSound('hammer');
      const candy = boardRef.current[r][c].candy;
      if (candy) spawnParticles(candy.x + TILE_SIZE / 2, candy.y + TILE_SIZE / 2, '#FFE600', 20);
      boardRef.current[r][c].candy = null;
      if (boardRef.current[r][c].jelly > 0) boardRef.current[r][c].jelly = 0;
      setBoosters(prev => ({ ...prev, hammer: prev.hammer - 1 }));
      setActiveBooster(null);
      processCascades(score, 1);
      return;
    }

    if (!selectedRef.current) {
      selectedRef.current = { r, c };
      playSound('swap');
    } else {
      const p1 = selectedRef.current;
      const p2 = { r, c };
      selectedRef.current = null;

      const dr = Math.abs(p1.r - p2.r);
      const dc = Math.abs(p1.c - p2.c);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        // Swap test
        const grid = boardRef.current;
        const temp = grid[p1.r][p1.c].candy;
        grid[p1.r][p1.c].candy = grid[p2.r][p2.c].candy;
        grid[p2.r][p2.c].candy = temp;

        const { matches } = findMatches(grid);
        if (matches.length > 0) {
          setMovesLeft(m => Math.max(0, m - 1));
          processCascades(score, 1);
        } else {
          // Revert
          const t2 = grid[p1.r][p1.c].candy;
          grid[p1.r][p1.c].candy = grid[p2.r][p2.c].candy;
          grid[p2.r][p2.c].candy = t2;
          playSound('over');
        }
      }
    }
  };

  // 60fps Main Canvas Game Loop (Matching Flappy Bird / Starfighter High-End Canvas polish)
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
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#090014');
      bgGrad.addColorStop(0.5, '#1B0033');
      bgGrad.addColorStop(1, '#08000D');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cyber Grid Lines
      ctx.strokeStyle = '#2A1C54';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Render Board & Candies
      const startX = (CANVAS_WIDTH - BOARD_SIZE * TILE_SIZE) / 2 + 20;
      const startY = 110;

      const grid = boardRef.current;
      if (grid && grid.length === BOARD_SIZE) {
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = grid[r][c];
            const px = startX + c * TILE_SIZE;
            const py = startY + r * TILE_SIZE;

            // Cell Tile Background
            ctx.fillStyle = cell.jelly > 0 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)';
            ctx.strokeStyle = cell.jelly > 0 ? '#00F0FF' : '#2A1C54';
            ctx.lineWidth = cell.jelly > 0 ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(px, py, TILE_SIZE - 2, TILE_SIZE - 2, 8);
            ctx.fill();
            ctx.stroke();

            // Jelly Glow
            if (cell.jelly > 0) {
              ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
              ctx.font = '10px monospace';
              ctx.fillText(cell.jelly === 2 ? '⚡' : '✨', px + 4, py + 14);
            }

            // Candy Item
            const candy = cell.candy;
            if (candy) {
              // Smooth lerp towards target position
              candy.x += (px - candy.x) * 0.25;
              candy.y += (py - candy.y) * 0.25;

              const meta = CANDY_METADATA[candy.type];
              const isSelected = selectedRef.current?.r === r && selectedRef.current?.c === c;

              ctx.save();
              ctx.translate(candy.x + TILE_SIZE / 2, candy.y + TILE_SIZE / 2);
              if (isSelected) ctx.scale(1.12, 1.12);

              // Candy Rounded Box
              ctx.fillStyle = meta.color;
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.roundRect(-TILE_SIZE / 2 + 3, -TILE_SIZE / 2 + 3, TILE_SIZE - 8, TILE_SIZE - 8, 10);
              ctx.fill();
              ctx.stroke();

              // Specular Glow
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.beginPath();
              ctx.roundRect(-TILE_SIZE / 2 + 5, -TILE_SIZE / 2 + 5, TILE_SIZE - 14, 10, 4);
              ctx.fill();

              // Symbol
              ctx.font = '20px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(meta.symbol, 0, 2);

              ctx.restore();
            }
          }
        }
      }

      // Render Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life++;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (p.life >= p.maxLife) particles.splice(i, 1);
      }

      // Render Floating Texts
      const ftexts = floatingTextsRef.current;
      for (let i = ftexts.length - 1; i >= 0; i--) {
        const ft = ftexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.02;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
        if (ft.alpha <= 0) ftexts.splice(i, 1);
      }

      requestAnimationFrame(render);
    };

    render();
    return () => {
      active = false;
    };
  }, []);

  const currentCfg = CAMPAIGN_LEVELS[currentLevelIdx];

  return (
    <div className="flex flex-col items-center justify-center w-full h-full flex-1 select-none font-mono text-slate-100">
      {/* Top HUD */}
      <div className="w-[380px] flex items-center justify-between bg-portal-surface/90 px-3 py-2 rounded-xl border-2 border-black mb-2 shadow-neo-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-portal-cyan" />
          <span className="text-xs font-black text-portal-neon">LVL {currentCfg.level}</span>
          <span className="text-sm font-black text-portal-yellow">{score.toLocaleString()} PTS</span>
        </div>
        <div className="flex items-center gap-2 bg-black/50 px-2.5 py-1 rounded-lg border border-portal-border">
          <Zap className="w-3.5 h-3.5 text-portal-gold" />
          <span className="text-xs font-black text-portal-gold">{movesLeft} MOVES</span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-portal-card text-slate-300 hover:text-white border border-black"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-portal-cyan" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Main 60fps HTML5 Canvas Container (Matching Flappy Bird & Starfighter arcade engine) */}
      <div className="relative w-[400px] h-[600px] bg-[#08000D] rounded-3xl border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col items-center justify-center overflow-hidden">
        {isLevelIntro ? (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4 animate-in fade-in">
            <div className="w-20 h-20 rounded-2xl bg-portal-cyan border-3 border-black shadow-neo flex items-center justify-center text-black animate-bounce">
              <Sparkles className="w-10 h-10 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs text-portal-cyan font-black uppercase">LEVEL {currentCfg.level}</span>
              <h2 className="text-2xl font-black text-white">{currentCfg.name}</h2>
              <p className="text-xs text-slate-300 mt-2 max-w-[260px]">{currentCfg.description}</p>
            </div>
            <button
              onClick={() => startLevel(currentLevelIdx)}
              className="w-full max-w-[200px] py-3.5 rounded-xl bg-portal-neon text-black font-black text-sm shadow-neo border-3 border-black active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              START GAME
            </button>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            className="cursor-pointer touch-none"
          />
        )}

        {/* Boosters Footer Bar */}
        {!isLevelIntro && !isGameOver && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-portal-surface/90 px-3 py-2 rounded-xl border-2 border-black shadow-neo-sm z-20">
            <button
              onClick={() => setActiveBooster(b => (b === 'hammer' ? null : 'hammer'))}
              disabled={boosters.hammer <= 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-black text-xs font-black ${
                activeBooster === 'hammer' ? 'bg-portal-gold text-black shadow-neo-sm' : 'bg-portal-card text-slate-300'
              }`}
            >
              <Hammer className="w-4 h-4" /> Hammer ({boosters.hammer})
            </button>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Tap adjacent candies to swap</span>
          </div>
        )}

        {/* Game Over / Victory Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 space-y-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border-2 border-black ${isVictory ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
              {isVictory ? 'VICTORY!' : 'GAME OVER'}
            </span>
            <h3 className="text-2xl font-black text-white">{isVictory ? 'Sugar Crush Mastery!' : 'Out of Moves'}</h3>
            <div className="text-3xl font-black text-portal-yellow">{score.toLocaleString()} PTS</div>

            {isVictory && (
              <div className="flex items-center gap-1 my-2">
                {[1, 2, 3].map(s => (
                  <Star key={s} className={`w-6 h-6 ${score >= currentCfg.stars[s - 1] ? 'text-portal-gold fill-portal-gold' : 'text-slate-600'}`} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 w-full max-w-[240px] pt-2">
              <button onClick={() => setIsLevelIntro(true)} className="flex-1 py-2.5 rounded-xl bg-portal-card text-slate-300 font-black text-xs border-2 border-black">
                Levels
              </button>
              {isVictory && currentLevelIdx < CAMPAIGN_LEVELS.length - 1 ? (
                <button
                  onClick={() => startLevel(currentLevelIdx + 1)}
                  className="flex-1 py-2.5 rounded-xl bg-portal-neon text-black font-black text-xs border-2 border-black shadow-neo-sm flex items-center justify-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              ) : (
                <button onClick={() => startLevel(currentLevelIdx)} className="flex-1 py-2.5 rounded-xl bg-portal-neon text-black font-black text-xs border-2 border-black shadow-neo-sm">
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
