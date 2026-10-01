'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Skull, Crown, Zap, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';

interface NeonPaperIoGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const GRID_COLS = 45;
const GRID_ROWS = 80;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
const CELL_SIZE = 8; // Canvas size: 360x640 (9:16 Aspect Ratio)
const CANVAS_WIDTH = GRID_COLS * CELL_SIZE; // 360
const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE; // 640

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

interface PlayerEntity {
  id: number;
  name: string;
  isBot: boolean;
  color: string;
  lightColor: string;
  glowColor: string;
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
  trail: Point[];
  alive: boolean;
  respawnTimer: number;
  kills: number;
  territoryCount: number;
  percentage: number;
  botDecisionTimer: number;
  botTarget: Point | null;
}

const PLAYERS_INIT: Omit<PlayerEntity, 'territoryCount' | 'percentage' | 'trail' | 'alive' | 'respawnTimer' | 'kills' | 'botDecisionTimer' | 'botTarget'>[] = [
  {
    id: 1,
    name: 'You',
    isBot: false,
    color: '#00f0ff',
    lightColor: 'rgba(0, 240, 255, 0.35)',
    glowColor: '#00f0ff',
    x: 22,
    y: 65,
    dir: 'UP',
    nextDir: 'UP',
  },
  {
    id: 2,
    name: 'Overthinker Final Boss',
    isBot: true,
    color: '#ff0055',
    lightColor: 'rgba(255, 0, 85, 0.32)',
    glowColor: '#ff0055',
    x: 12,
    y: 15,
    dir: 'DOWN',
    nextDir: 'DOWN',
  },
  {
    id: 3,
    name: 'Glitch',
    isBot: true,
    color: '#00ff66',
    lightColor: 'rgba(0, 255, 102, 0.32)',
    glowColor: '#00ff66',
    x: 32,
    y: 15,
    dir: 'DOWN',
    nextDir: 'DOWN',
  },
  {
    id: 4,
    name: 'Nova',
    isBot: true,
    color: '#ffaa00',
    lightColor: 'rgba(255, 170, 0, 0.32)',
    glowColor: '#ffaa00',
    x: 12,
    y: 40,
    dir: 'RIGHT',
    nextDir: 'RIGHT',
  },
  {
    id: 5,
    name: 'Shadow',
    isBot: true,
    color: '#aa00ff',
    lightColor: 'rgba(170, 0, 255, 0.32)',
    glowColor: '#aa00ff',
    x: 32,
    y: 40,
    dir: 'LEFT',
    nextDir: 'LEFT',
  },
];

export default function NeonPaperIoGame({ gameId, onGameOver }: NeonPaperIoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [deathReason, setDeathReason] = useState<string>('Your tail was sliced by enemy combatants!');
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [territoryPercent, setTerritoryPercent] = useState('0.0');
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [leaderboard, setLeaderboard] = useState<{ name: string; percent: string; color: string; isPlayer: boolean; kills: number }[]>([]);
  const [killFeed, setKillFeed] = useState<string | null>(null);

  // Engine state refs
  const gridRef = useRef<Uint8Array>(new Uint8Array(TOTAL_CELLS));
  const playersRef = useRef<PlayerEntity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);
  const killFeedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio Synthesizer
  const playSfx = useCallback((type: 'turn' | 'capture' | 'kill' | 'death' | 'win', count = 1) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'turn') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'capture') {
        const pitches = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 chord
        pitches.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.04);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + 0.25);
          osc.start(ctx.currentTime + i * 0.04);
          osc.stop(ctx.currentTime + i * 0.04 + 0.25);
        });
      } else if (type === 'kill') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'death') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}
  }, [soundEnabled]);

  const triggerKillFeed = (msg: string) => {
    setKillFeed(msg);
    if (killFeedTimeoutRef.current) clearTimeout(killFeedTimeoutRef.current);
    killFeedTimeoutRef.current = setTimeout(() => setKillFeed(null), 3500);
  };

  const spawnParticles = (x: number, y: number, color: string, count = 20) => {
    const px = x * CELL_SIZE + CELL_SIZE / 2;
    const py = y * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  };

  // Initialize a 5x5 starting base on the grid
  const claimBase = (grid: Uint8Array, centerX: number, centerY: number, id: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const gx = centerX + dx;
        const gy = centerY + dy;
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
          grid[gy * GRID_COLS + gx] = id;
        }
      }
    }
  };

  // Robust flood-fill capture algorithm
  const captureTerritory = (player: PlayerEntity, grid: Uint8Array): number => {
    if (player.trail.length === 0) return 0;

    // 1. Create a binary map: 1 = WALL (player's existing territory OR player's trail), 0 = EMPTY
    const isWall = new Uint8Array(TOTAL_CELLS);
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (grid[i] === player.id) {
        isWall[i] = 1;
      }
    }
    for (const pt of player.trail) {
      if (pt.x >= 0 && pt.x < GRID_COLS && pt.y >= 0 && pt.y < GRID_ROWS) {
        isWall[pt.y * GRID_COLS + pt.x] = 1;
      }
    }

    // 2. Flood fill from map outer perimeter through EMPTY cells to find all OUTSIDE cells
    const outside = new Uint8Array(TOTAL_CELLS);
    const queue: number[] = [];

    // Push all border cells that are not walls
    for (let x = 0; x < GRID_COLS; x++) {
      const topIdx = 0 * GRID_COLS + x;
      if (!isWall[topIdx] && !outside[topIdx]) {
        outside[topIdx] = 1;
        queue.push(topIdx);
      }
      const botIdx = (GRID_ROWS - 1) * GRID_COLS + x;
      if (!isWall[botIdx] && !outside[botIdx]) {
        outside[botIdx] = 1;
        queue.push(botIdx);
      }
    }
    for (let y = 0; y < GRID_ROWS; y++) {
      const leftIdx = y * GRID_COLS + 0;
      if (!isWall[leftIdx] && !outside[leftIdx]) {
        outside[leftIdx] = 1;
        queue.push(leftIdx);
      }
      const rightIdx = y * GRID_COLS + (GRID_COLS - 1);
      if (!isWall[rightIdx] && !outside[rightIdx]) {
        outside[rightIdx] = 1;
        queue.push(rightIdx);
      }
    }

    // Process BFS Queue
    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const cx = idx % GRID_COLS;
      const cy = Math.floor(idx / GRID_COLS);

      const neighbors = [
        { x: cx + 1, y: cy },
        { x: cx - 1, y: cy },
        { x: cx, y: cy + 1 },
        { x: cx, y: cy - 1 },
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < GRID_COLS && n.y >= 0 && n.y < GRID_ROWS) {
          const nIdx = n.y * GRID_COLS + n.x;
          if (!isWall[nIdx] && !outside[nIdx]) {
            outside[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }

    // 3. Any cell that is NOT outside belongs to the player!
    let capturedCount = 0;
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (!outside[i] && grid[i] !== player.id) {
        grid[i] = player.id;
        capturedCount++;
      }
    }

    // Also solidify all trail cells
    for (const pt of player.trail) {
      const idx = pt.y * GRID_COLS + pt.x;
      if (grid[idx] !== player.id) {
        grid[idx] = player.id;
        capturedCount++;
      }
    }

    // Clear trail
    player.trail = [];
    return capturedCount;
  };

  // Eliminate a player from the arena
  const eliminatePlayer = (
    target: PlayerEntity,
    killer: PlayerEntity | null,
    grid: Uint8Array,
    reason?: string
  ) => {
    target.alive = false;
    target.respawnTimer = target.isBot ? 80 : 0; // Bots respawn after ~5 seconds

    // Clear all territory of target to neutral 0
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (grid[i] === target.id) {
        grid[i] = 0;
      }
    }
    target.trail = [];

    // Particle explosion
    spawnParticles(target.x, target.y, target.color, 35);

    if (killer) {
      killer.kills += 1;
      if (!killer.isBot) {
        playSfx('kill');
        triggerKillFeed(`⚡ You sliced ${target.name}! (+1000 PTS)`);
      } else if (!target.isBot) {
        setDeathReason(`Your tail was sliced by ${killer.name}!`);
        triggerKillFeed(`💀 ${killer.name} sliced your tail!`);
      } else {
        triggerKillFeed(`⚔️ ${killer.name} eliminated ${target.name}`);
      }
    } else if (!target.isBot) {
      if (reason) {
        setDeathReason(reason);
      }
    }

    if (!target.isBot) {
      playSfx('death');
      setIsDead(true);
      setIsPlaying(false);
    }
  };

  // Find a clear quadrant to respawn a bot
  const respawnBot = (bot: PlayerEntity, grid: Uint8Array) => {
    let bestX = Math.floor(10 + Math.random() * (GRID_COLS - 20));
    let bestY = Math.floor(10 + Math.random() * (GRID_ROWS - 20));

    // Find a free spot not owned by anyone
    for (let attempt = 0; attempt < 25; attempt++) {
      const tx = Math.floor(8 + Math.random() * (GRID_COLS - 16));
      const ty = Math.floor(8 + Math.random() * (GRID_ROWS - 16));
      let cellFree = true;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const gx = tx + dx;
          const gy = ty + dy;
          if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS || grid[gy * GRID_COLS + gx] !== 0) {
            cellFree = false;
            break;
          }
        }
        if (!cellFree) break;
      }
      if (cellFree) {
        bestX = tx;
        bestY = ty;
        break;
      }
    }

    bot.x = bestX;
    bot.y = bestY;
    bot.dir = 'UP';
    bot.nextDir = 'UP';
    bot.trail = [];
    bot.alive = true;
    claimBase(grid, bestX, bestY, bot.id);
    spawnParticles(bestX, bestY, bot.color, 15);
  };

  // Start / Reset Game
  const initGame = () => {
    const grid = new Uint8Array(TOTAL_CELLS);

    const players: PlayerEntity[] = PLAYERS_INIT.map(p => {
      const entity: PlayerEntity = {
        ...p,
        trail: [],
        alive: true,
        respawnTimer: 0,
        kills: 0,
        territoryCount: 25,
        percentage: 0.7,
        botDecisionTimer: 0,
        botTarget: null,
      };
      claimBase(grid, entity.x, entity.y, entity.id);
      return entity;
    });

    gridRef.current = grid;
    playersRef.current = players;
    particlesRef.current = [];

    setScore(0);
    setKills(0);
    setTerritoryPercent('0.7');
    setIsDead(false);
    setIsPlaying(true);
  };

  // Bot AI Controller
  const updateBotAi = (bot: PlayerEntity, grid: Uint8Array, allPlayers: PlayerEntity[]) => {
    if (!bot.alive) return;

    bot.botDecisionTimer--;
    const currentCell = grid[bot.y * GRID_COLS + bot.x];
    const isHome = currentCell === bot.id;
    const trailLen = bot.trail.length;

    // Possible valid moves (exclude 180° turns)
    const validDirs: { dir: Direction; dx: number; dy: number }[] = [];
    if (bot.dir !== 'DOWN' && bot.y > 1) validDirs.push({ dir: 'UP', dx: 0, dy: -1 });
    if (bot.dir !== 'UP' && bot.y < GRID_ROWS - 2) validDirs.push({ dir: 'DOWN', dx: 0, dy: 1 });
    if (bot.dir !== 'RIGHT' && bot.x > 1) validDirs.push({ dir: 'LEFT', dx: -1, dy: 0 });
    if (bot.dir !== 'LEFT' && bot.x < GRID_COLS - 2) validDirs.push({ dir: 'RIGHT', dx: 1, dy: 0 });

    // Filter out moves that would immediately collide with bot's own trail
    const safeDirs = validDirs.filter(d => {
      const nx = bot.x + d.dx;
      const ny = bot.y + d.dy;
      return !bot.trail.some(t => t.x === nx && t.y === ny);
    });

    if (safeDirs.length === 0) return;

    // Strategy 1: Hunt nearby enemy trails!
    let huntDir: Direction | null = null;
    let closestDist = 12;

    for (const other of allPlayers) {
      if (other.id !== bot.id && other.alive && other.trail.length > 0) {
        for (const t of other.trail) {
          const dist = Math.abs(bot.x - t.x) + Math.abs(bot.y - t.y);
          if (dist < closestDist) {
            closestDist = dist;
            // Pick safe direction that minimizes distance to target trail
            let bestD = safeDirs[0];
            let minD = 999;
            for (const sd of safeDirs) {
              const nd = Math.abs(bot.x + sd.dx - t.x) + Math.abs(bot.y + sd.dy - t.y);
              if (nd < minD) {
                minD = nd;
                bestD = sd;
              }
            }
            huntDir = bestD.dir;
          }
        }
      }
    }

    if (huntDir) {
      bot.nextDir = huntDir;
      return;
    }

    // Strategy 2: If trail is getting long (> 5-8 cells), return to home base
    if (trailLen >= 6 || (!isHome && trailLen >= 4 && Math.random() < 0.4)) {
      // Find nearest owned cell
      let nearestHomeDist = 999;
      let targetHome: Point | null = null;
      for (let dy = -10; dy <= 10; dy++) {
        for (let dx = -10; dx <= 10; dx++) {
          const gx = bot.x + dx;
          const gy = bot.y + dy;
          if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
            if (grid[gy * GRID_COLS + gx] === bot.id) {
              const d = Math.abs(dx) + Math.abs(dy);
              if (d < nearestHomeDist) {
                nearestHomeDist = d;
                targetHome = { x: gx, y: gy };
              }
            }
          }
        }
      }

      if (targetHome) {
        let bestDir = safeDirs[0];
        let minD = 999;
        for (const sd of safeDirs) {
          const nd = Math.abs(bot.x + sd.dx - targetHome.x) + Math.abs(bot.y + sd.dy - targetHome.y);
          if (nd < minD) {
            minD = nd;
            bestDir = sd;
          }
        }
        bot.nextDir = bestDir.dir;
        return;
      }
    }

    // Strategy 3: Patrol / Expanding Loop
    if (bot.botDecisionTimer <= 0 || Math.random() < 0.15) {
      bot.botDecisionTimer = 3 + Math.floor(Math.random() * 5);
      const chosen = safeDirs[Math.floor(Math.random() * safeDirs.length)];
      bot.nextDir = chosen.dir;
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const player = playersRef.current[0];
      if (!player || !player.alive) return;

      const key = e.key.toLowerCase();
      if ((key === 'arrowup' || key === 'w') && player.dir !== 'DOWN') {
        player.nextDir = 'UP';
        playSfx('turn');
      } else if ((key === 'arrowdown' || key === 's') && player.dir !== 'UP') {
        player.nextDir = 'DOWN';
        playSfx('turn');
      } else if ((key === 'arrowleft' || key === 'a') && player.dir !== 'RIGHT') {
        player.nextDir = 'LEFT';
        playSfx('turn');
      } else if ((key === 'arrowright' || key === 'd') && player.dir !== 'LEFT') {
        player.nextDir = 'RIGHT';
        playSfx('turn');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playSfx]);

  // Handle Touch Swipes
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const player = playersRef.current[0];
    if (!player || !player.alive || e.changedTouches.length === 0) return;

    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 15) {
      if (absX > absY) {
        if (dx > 0 && player.dir !== 'LEFT') player.nextDir = 'RIGHT';
        else if (dx < 0 && player.dir !== 'RIGHT') player.nextDir = 'LEFT';
      } else {
        if (dy > 0 && player.dir !== 'UP') player.nextDir = 'DOWN';
        else if (dy < 0 && player.dir !== 'DOWN') player.nextDir = 'UP';
      }
      playSfx('turn');
    }
  };

  // Direction button click helper for Mobile D-pad
  const setPlayerDir = (newDir: Direction) => {
    const player = playersRef.current[0];
    if (!player || !player.alive) return;
    if (newDir === 'UP' && player.dir !== 'DOWN') player.nextDir = 'UP';
    if (newDir === 'DOWN' && player.dir !== 'UP') player.nextDir = 'DOWN';
    if (newDir === 'LEFT' && player.dir !== 'RIGHT') player.nextDir = 'LEFT';
    if (newDir === 'RIGHT' && player.dir !== 'LEFT') player.nextDir = 'RIGHT';
    playSfx('turn');
  };

  // Main Engine Loop
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

    let running = true;
    const stepInterval = 1000 / 14; // 14 steps per second for responsive pacing

    const loop = (timestamp: number) => {
      if (!running) return;

      if (!lastStepTimeRef.current) lastStepTimeRef.current = timestamp;
      const elapsed = timestamp - lastStepTimeRef.current;

      const grid = gridRef.current;
      const players = playersRef.current;

      // Physics & Simulation Step
      if (isPlaying && elapsed >= stepInterval) {
        lastStepTimeRef.current = timestamp;

        // 1. Update AI bots
        for (let i = 1; i < players.length; i++) {
          const bot = players[i];
          if (!bot.alive) {
            bot.respawnTimer--;
            if (bot.respawnTimer <= 0) {
              respawnBot(bot, grid);
            }
          } else {
            updateBotAi(bot, grid, players);
          }
        }

        // 2. Move players
        for (const p of players) {
          if (!p.alive) continue;
          p.dir = p.nextDir;

          let nx = p.x;
          let ny = p.y;
          if (p.dir === 'UP') ny--;
          if (p.dir === 'DOWN') ny++;
          if (p.dir === 'LEFT') nx--;
          if (p.dir === 'RIGHT') nx++;

          // Wall collision check
          if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) {
            eliminatePlayer(p, null, grid, 'You collided with the arena grid perimeter!');
            continue;
          }

          p.x = nx;
          p.y = ny;

          const currentOwner = grid[ny * GRID_COLS + nx];

          // Check if player entered their own territory
          if (currentOwner === p.id) {
            if (p.trail.length > 0) {
              // Captured!
              const capturedCount = captureTerritory(p, grid);
              if (capturedCount > 0) {
                if (!p.isBot) {
                  playSfx('capture', capturedCount);
                  setScore(prev => prev + capturedCount * 5 + 50);
                  spawnParticles(p.x, p.y, p.color, 15);
                  if (capturedCount > 80) {
                    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
                  }
                }
              }
            }
          } else {
            // Check self-collision on trail
            if (p.trail.some(t => t.x === nx && t.y === ny)) {
              eliminatePlayer(p, null, grid, 'You crossed your own active neon trail!');
              continue;
            }
            p.trail.push({ x: nx, y: ny });
          }
        }

        // 3. Combat / Rival Tail Slicing Collisions
        for (const attacker of players) {
          if (!attacker.alive) continue;

          for (const victim of players) {
            if (!victim.alive || victim.id === attacker.id) continue;

            // Did attacker hit victim's trail?
            const trailHitIdx = victim.trail.findIndex(t => t.x === attacker.x && t.y === attacker.y);
            if (trailHitIdx !== -1) {
              eliminatePlayer(victim, attacker, grid);
              if (!attacker.isBot) {
                setScore(prev => prev + 1000);
                setKills(prev => prev + 1);
              }
            }
          }
        }

        // 4. Head-to-Head Collisions
        for (let i = 0; i < players.length; i++) {
          const p1 = players[i];
          if (!p1.alive) continue;
          for (let j = i + 1; j < players.length; j++) {
            const p2 = players[j];
            if (!p2.alive) continue;
            if (p1.x === p2.x && p1.y === p2.y) {
              const p1InBase = grid[p1.y * GRID_COLS + p1.x] === p1.id;
              const p2InBase = grid[p2.y * GRID_COLS + p2.x] === p2.id;
              if (p1InBase && !p2InBase) {
                eliminatePlayer(p2, p1, grid);
                if (!p1.isBot) {
                  setScore(prev => prev + 1000);
                  setKills(prev => prev + 1);
                }
              } else if (p2InBase && !p1InBase) {
                eliminatePlayer(p1, p2, grid);
                if (!p2.isBot) {
                  setScore(prev => prev + 1000);
                  setKills(prev => prev + 1);
                }
              } else {
                eliminatePlayer(p1, p2, grid);
                eliminatePlayer(p2, p1, grid);
              }
            }
          }
        }

        // 5. Recalculate territory counts & percentages
        const counts = [0, 0, 0, 0, 0, 0];
        for (let i = 0; i < TOTAL_CELLS; i++) {
          const owner = grid[i];
          if (owner > 0 && owner <= 5) {
            counts[owner]++;
          }
        }

        for (const p of players) {
          p.territoryCount = counts[p.id];
          p.percentage = Number(((p.territoryCount / TOTAL_CELLS) * 100).toFixed(1));
        }

        // Update React leaderboard states
        const playerStats = players[0];
        if (playerStats) {
          setTerritoryPercent(playerStats.percentage.toFixed(1));
        }

        const sorted = [...players]
          .sort((a, b) => b.territoryCount - a.territoryCount)
          .map(p => ({
            name: p.name,
            percent: p.percentage.toFixed(1),
            color: p.color,
            isPlayer: !p.isBot,
            kills: p.kills,
          }));
        setLeaderboard(sorted);
      }

      // ==================== RENDERING ====================
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Draw Map Grid Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_WIDTH; x += CELL_SIZE * 5) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += CELL_SIZE * 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // 2. Draw Claimed Territories
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          const ownerId = grid[y * GRID_COLS + x];
          if (ownerId > 0) {
            const owner = players.find(p => p.id === ownerId);
            if (owner) {
              ctx.fillStyle = owner.lightColor;
              ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
          }
        }
      }

      // 3. Draw Player & Bot Trails with Glow
      for (const p of players) {
        if (!p.alive || p.trail.length === 0) continue;

        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;

        for (const pt of p.trail) {
          ctx.fillRect(pt.x * CELL_SIZE + 1, pt.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
        ctx.shadowBlur = 0;
      }

      // 4. Draw Heads / Ships
      for (const p of players) {
        if (!p.alive) continue;

        const hx = p.x * CELL_SIZE;
        const hy = p.y * CELL_SIZE;

        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx, hy, CELL_SIZE, CELL_SIZE);

        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx - 1, hy - 1, CELL_SIZE + 2, CELL_SIZE + 2);
        ctx.shadowBlur = 0;

        // Draw Player Crown if #1 Leader
        if (leaderboard.length > 0 && leaderboard[0].name === p.name) {
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.moveTo(hx + CELL_SIZE / 2, hy - 5);
          ctx.lineTo(hx + CELL_SIZE + 2, hy - 1);
          ctx.lineTo(hx - 2, hy - 1);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 5. Draw Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;

        if (pt.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playSfx, leaderboard]);

  // Synchronize High Score and Handle Game Over
  useEffect(() => {
    if (isDead) {
      if (score > highScore) setHighScore(score);
      onGameOver(score);
    }
  }, [isDead, score, highScore, onGameOver]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-full h-full flex-1 mx-auto select-none">
      {/* Top Game HUD Strip - Ultra Slim */}
      <div className="flex items-center justify-between w-full max-w-[min(100%,calc(min(78vh,680px)*9/16))] px-3 py-1.5 mb-1.5 bg-portal-card/90 rounded-xl border border-portal-border text-xs shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-portal-cyan font-black">
            <Shield className="w-3 h-3" />
            <span>{territoryPercent}%</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400 font-bold">
            <Skull className="w-3 h-3" />
            <span>{kills} Kills</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-portal-gold font-black">
            <Trophy className="w-3 h-3" />
            <span>{score} pts</span>
          </div>
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Main Canvas & Overlay Viewport (9:16 Aspect Ratio with Viewport Height Scaling) */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-portal-border shadow-neon-cyan/20 shadow-2xl bg-black flex items-center justify-center w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] shrink-0">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full block cursor-pointer"
        />

        {/* Live In-Game Leaderboard Mini-Widget */}
        {isPlaying && leaderboard.length > 0 && (
          <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-[10px] flex flex-col gap-0.5 shadow-lg pointer-events-none">
            <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1 border-b border-white/10 pb-0.5 mb-0.5">
              <Crown className="w-2.5 h-2.5 text-amber-400" /> Leaderboard
            </div>
            {leaderboard.slice(0, 4).map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 font-mono">
                <span className={`font-bold flex items-center gap-1 ${entry.isPlayer ? 'text-portal-cyan' : 'text-slate-300'}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="font-black text-white">{entry.percent}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Kill Feed Alert Toast */}
        {killFeed && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-rose-500/50 text-rose-300 text-[11px] font-black px-3 py-1 rounded-full shadow-lg animate-bounce pointer-events-none">
            {killFeed}
          </div>
        )}

        {/* Start / Pre-Game Screen */}
        {!isPlaying && !isDead && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-portal-cyan/15 border-2 border-portal-cyan flex items-center justify-center mb-3 shadow-glow-cyan">
              <Zap className="w-7 h-7 text-portal-cyan animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-wider mb-1">NEON PAPER.IO</h2>
            <p className="text-xs text-slate-400 max-w-[280px] mb-4">
              Conquer arcade territory! Encircle zones to claim grid land and slice enemy trails.
            </p>
            <div className="flex gap-2 text-[11px] text-slate-300 mb-5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <span>⌨️ <b>WASD / Arrows</b></span>
              <span>•</span>
              <span>🕹️ <b>Virtual Joystick</b></span>
            </div>
            <button
              onClick={initGame}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-portal-cyan to-cyan-500 text-black font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-glow-cyan"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START CONQUEST</span>
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {isDead && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-2">
              <Skull className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-0.5">TERRITORY LOST</h3>
            <p className="text-xs text-rose-300 font-bold mb-3">{deathReason}</p>

            <div className="grid grid-cols-2 gap-2 w-full max-w-[240px] mb-4">
              <div className="bg-portal-card/90 border border-portal-border p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 font-bold block">MAP CONQUERED</span>
                <span className="text-base font-black text-portal-cyan">{territoryPercent}%</span>
              </div>
              <div className="bg-portal-card/90 border border-portal-border p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 font-bold block">TOTAL KILLS</span>
                <span className="text-base font-black text-rose-400">{kills}</span>
              </div>
            </div>

            <div className="text-xs font-black text-portal-gold mb-4">
              FINAL SCORE: <span className="text-sm font-mono">{score} PTS</span>
            </div>

            <button
              onClick={initGame}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-portal-cyan to-blue-500 text-black font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-glow-cyan"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REPLAY ARENA</span>
            </button>
          </div>
        )}
      </div>

      {/* Switchable Joystick / Arrow D-Pad (Mobile / Touch) */}
      <div className="mt-3 flex justify-center w-full sm:hidden">
        <MobileGamepad
          mode="4way"
          onDirectionChange={(dir) => setPlayerDir(dir as Direction)}
          label="STEER"
        />
      </div>
    </div>
  );
}
