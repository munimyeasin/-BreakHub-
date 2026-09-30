'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Flame,
  Globe,
  Square,
  Gauge,
  Trophy,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';

interface NeonSnakeGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type Point = { x: number; y: number };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
};

export type SnakeMode = 'classic' | 'portal'; // Classic = fatal walls, Portal = wrap around screen
export type SnakeSpeed = 'normal' | 'turbo' | 'dynamic';

const GRID_SIZE = 20;
const CANVAS_WIDTH = 360; // 18 cells * 20px (9:16 Vertical Ratio)
const CANVAS_HEIGHT = 640; // 32 cells * 20px (9:16 Vertical Ratio)
const MAX_CELLS_X = CANVAS_WIDTH / GRID_SIZE; // 18
const MAX_CELLS_Y = CANVAS_HEIGHT / GRID_SIZE; // 32

const SPEED_CONFIGS: Record<SnakeSpeed, { label: string; interval: number }> = {
  normal: { label: 'Normal (105ms)', interval: 110 },
  turbo: { label: 'Turbo (80ms)', interval: 80 },
  dynamic: { label: 'Dynamic (Ramps)', interval: 110 },
};

// Web Audio Synth for instant arcade SFX without external audio files
class SnakeAudioEngine {
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

  public playSound(type: 'eat' | 'bonus' | 'wrap' | 'die') {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'eat') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'bonus') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
      } else if (type === 'wrap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
      }
    } catch {}
  }
}

const snakeAudio = new SnakeAudioEngine();

export default function NeonSnakeGame({ onGameOver }: NeonSnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [applesEaten, setApplesEaten] = useState(0);

  const [mode, setMode] = useState<SnakeMode>('classic');
  const [speedMode, setSpeedMode] = useState<SnakeSpeed>('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Snake coordinates and double-buffered input queue
  const snakeRef = useRef<Point[]>([
    { x: 9, y: 16 },
    { x: 9, y: 17 },
    { x: 9, y: 18 },
  ]);
  const dirRef = useRef<Point>({ x: 0, y: -1 });
  const inputQueueRef = useRef<Point[]>([]); // FIFO input queue prevents self-collisions on rapid turns
  const foodRef = useRef<Point>({ x: 9, y: 8 });
  const bonusFoodRef = useRef<{ x: number; y: number; timer: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const scoreRef = useRef(0);
  const modeRef = useRef<SnakeMode>(mode);
  const speedModeRef = useRef<SnakeSpeed>(speedMode);
  const soundEnabledRef = useRef(soundEnabled);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    speedModeRef.current = speedMode;
  }, [speedMode]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playSfx = useCallback((type: 'eat' | 'bonus' | 'wrap' | 'die') => {
    if (soundEnabledRef.current) {
      snakeAudio.playSound(type);
    }
  }, []);

  const spawnFood = useCallback(() => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * MAX_CELLS_X),
        y: Math.floor(Math.random() * MAX_CELLS_Y),
      };
      const collides = snakeRef.current.some((s) => s.x === newFood.x && s.y === newFood.y);
      if (!collides) break;
    }
    foodRef.current = newFood;

    // 25% chance to spawn a timed bonus core (lasts 8 seconds)
    if (Math.random() < 0.28) {
      let newBonus: Point;
      while (true) {
        newBonus = {
          x: Math.floor(Math.random() * MAX_CELLS_X),
          y: Math.floor(Math.random() * MAX_CELLS_Y),
        };
        const collides =
          (newBonus.x === newFood.x && newBonus.y === newFood.y) ||
          snakeRef.current.some((s) => s.x === newBonus.x && s.y === newBonus.y);
        if (!collides) break;
      }
      bonusFoodRef.current = { ...newBonus, timer: 75 }; // ~75 ticks
    }
  }, []);

  const createExplosion = (x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = Math.random() * 4 + 2;
      particlesRef.current.push({
        x: x * GRID_SIZE + GRID_SIZE / 2,
        y: y * GRID_SIZE + GRID_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        size: Math.random() * 3 + 2,
      });
    }
  };

  const queueDirection = useCallback((newDir: Point) => {
    const queue = inputQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;

    // Disallow 180-degree reversals
    if (newDir.x !== 0 && lastDir.x !== 0) return;
    if (newDir.y !== 0 && lastDir.y !== 0) return;

    // Limit queue size to 2 to keep controls ultra-responsive
    if (queue.length < 2) {
      queue.push(newDir);
    }
  }, []);

  const startGame = () => {
    snakeRef.current = [
      { x: 9, y: 16 },
      { x: 9, y: 17 },
      { x: 9, y: 18 },
    ];
    dirRef.current = { x: 0, y: -1 };
    inputQueueRef.current = [];
    particlesRef.current = [];
    bonusFoodRef.current = null;

    scoreRef.current = 0;
    setScore(0);
    setCombo(1);
    setApplesEaten(0);
    setIsDead(false);
    setIsPlaying(true);
    spawnFood();
  };

  // Keyboard navigation with double-buffer queue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { key } = e;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
        e.preventDefault();
      }

      if (key === 'ArrowUp' || key === 'w' || key === 'W') queueDirection({ x: 0, y: -1 });
      if (key === 'ArrowDown' || key === 's' || key === 'S') queueDirection({ x: 0, y: 1 });
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') queueDirection({ x: -1, y: 0 });
      if (key === 'ArrowRight' || key === 'd' || key === 'D') queueDirection({ x: 1, y: 0 });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queueDirection]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isPlaying) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 25) queueDirection({ x: 1, y: 0 });
      if (dx < -25) queueDirection({ x: -1, y: 0 });
    } else {
      if (dy > 25) queueDirection({ x: 0, y: 1 });
      if (dy < -25) queueDirection({ x: 0, y: -1 });
    }
  };

  // Main Canvas & Interval Game Loop
  useEffect(() => {
    if (!isPlaying || isDead) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let baseInterval = SPEED_CONFIGS[speedMode].interval;
    if (speedMode === 'dynamic') {
      // Dynamic speed ramps up as apples are eaten
      baseInterval = Math.max(65, 110 - Math.floor(applesEaten / 3) * 5);
    }

    const interval = setInterval(() => {
      // Dequeue next direction if queued
      if (inputQueueRef.current.length > 0) {
        dirRef.current = inputQueueRef.current.shift()!;
      }

      let nextX = snakeRef.current[0].x + dirRef.current.x;
      let nextY = snakeRef.current[0].y + dirRef.current.y;

      // Check Mode Boundary Handling
      if (modeRef.current === 'portal') {
        // Wrap around seamlessly
        let didWrap = false;
        if (nextX < 0) {
          nextX = MAX_CELLS_X - 1;
          didWrap = true;
        } else if (nextX >= MAX_CELLS_X) {
          nextX = 0;
          didWrap = true;
        }

        if (nextY < 0) {
          nextY = MAX_CELLS_Y - 1;
          didWrap = true;
        } else if (nextY >= MAX_CELLS_Y) {
          nextY = 0;
          didWrap = true;
        }

        if (didWrap) {
          playSfx('wrap');
        }
      } else {
        // Classic mode: Wall hit = instant crash
        if (nextX < 0 || nextX >= MAX_CELLS_X || nextY < 0 || nextY >= MAX_CELLS_Y) {
          setIsDead(true);
          setIsPlaying(false);
          playSfx('die');
          createExplosion(snakeRef.current[0].x, snakeRef.current[0].y, '#FF0055', 25);
          const finalScore = scoreRef.current;
          setTimeout(() => onGameOverRef.current(finalScore), 400);
          return;
        }
      }

      const head = { x: nextX, y: nextY };

      // Self-collision check
      if (snakeRef.current.some((s) => s.x === head.x && s.y === head.y)) {
        setIsDead(true);
        setIsPlaying(false);
        playSfx('die');
        createExplosion(head.x, head.y, '#FF0055', 25);
        const finalScore = scoreRef.current;
        setTimeout(() => onGameOverRef.current(finalScore), 400);
        return;
      }

      const newSnake = [head, ...snakeRef.current];

      // Regular Food Collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setApplesEaten((prev) => prev + 1);
        const added = 100 * combo;
        const newScore = scoreRef.current + added;
        scoreRef.current = newScore;
        setScore(newScore);
        setCombo((prev) => Math.min(prev + 1, 5));
        if (newScore > highScore) setHighScore(newScore);

        createExplosion(foodRef.current.x, foodRef.current.y, '#00F0FF', 16);
        playSfx('eat');
        spawnFood();
      }
      // Bonus Core Collision
      else if (bonusFoodRef.current && head.x === bonusFoodRef.current.x && head.y === bonusFoodRef.current.y) {
        const bonusPoints = 300 * combo + Math.floor(bonusFoodRef.current.timer * 4);
        const newScore = scoreRef.current + bonusPoints;
        scoreRef.current = newScore;
        setScore(newScore);
        if (newScore > highScore) setHighScore(newScore);

        createExplosion(bonusFoodRef.current.x, bonusFoodRef.current.y, '#FFD700', 22);
        playSfx('bonus');
        bonusFoodRef.current = null;
      } else {
        newSnake.pop();
      }

      // Decrement Bonus Timer if active
      if (bonusFoodRef.current) {
        bonusFoodRef.current.timer--;
        if (bonusFoodRef.current.timer <= 0) {
          bonusFoodRef.current = null;
        }
      }

      snakeRef.current = newSnake;

      // 4. RENDER CANVAS
      ctx.fillStyle = '#070512';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid background
      ctx.strokeStyle = '#150f33';
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw Portal Edges if in Portal Mode
      if (modeRef.current === 'portal') {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 8;
        ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.shadowBlur = 0;
      }

      // Draw Bonus Core (Gold Pulse with Countdown Ring)
      if (bonusFoodRef.current) {
        const bx = bonusFoodRef.current.x * GRID_SIZE + GRID_SIZE / 2;
        const by = bonusFoodRef.current.y * GRID_SIZE + GRID_SIZE / 2;

        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(bx, by, GRID_SIZE / 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Countdown circular indicator
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const progress = bonusFoodRef.current.timer / 75;
        ctx.arc(bx, by, GRID_SIZE / 2.2 + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }

      // Draw Regular Food (Electric Cyan Energy Cell)
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(
        foodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
        foodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2.5,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Draw Snake Body
      snakeRef.current.forEach((segment, idx) => {
        const isHead = idx === 0;
        ctx.fillStyle = isHead ? '#9D00FF' : '#5E00D9';
        ctx.shadowColor = isHead ? '#00F0FF' : 'transparent';
        ctx.shadowBlur = isHead ? 15 : 0;

        ctx.beginPath();
        ctx.roundRect(
          segment.x * GRID_SIZE + 1.5,
          segment.y * GRID_SIZE + 1.5,
          GRID_SIZE - 3,
          GRID_SIZE - 3,
          isHead ? 6 : 4
        );
        ctx.fill();

        // Head Eyes
        if (isHead) {
          ctx.fillStyle = '#00F0FF';
          ctx.beginPath();
          ctx.arc(
            segment.x * GRID_SIZE + GRID_SIZE / 2 + dirRef.current.x * 4,
            segment.y * GRID_SIZE + GRID_SIZE / 2 + dirRef.current.y * 4,
            2.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      });

      // Render Active Particles
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;

        if (p.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      ctx.shadowBlur = 0;
    }, baseInterval);

    return () => clearInterval(interval);
  }, [isPlaying, isDead, applesEaten, combo, highScore, speedMode, onGameOver, spawnFood, playSfx]);

  const handleDirectionChange = useCallback(
    (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (dir === 'UP') queueDirection({ x: 0, y: -1 });
      else if (dir === 'DOWN') queueDirection({ x: 0, y: 1 });
      else if (dir === 'LEFT') queueDirection({ x: -1, y: 0 });
      else if (dir === 'RIGHT') queueDirection({ x: 1, y: 0 });
    },
    [queueDirection]
  );

  return (
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center font-sans">
      {/* Top Streamlined HUD Strip */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] flex items-center justify-between bg-portal-surface/95 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md shrink-0">
        {/* Left: Mode & Score */}
        <div className="flex items-center gap-2">
          {/* Mode Badge Button */}
          <button
            onClick={() => setMode((prev) => (prev === 'classic' ? 'portal' : 'classic'))}
            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'portal'
                ? 'bg-portal-cyan text-black shadow-glow-cyan'
                : 'bg-portal-card text-slate-300 border border-portal-border/60'
            }`}
            title={`Toggle Mode: ${mode === 'portal' ? 'Portal Wrap' : 'Classic Walls'}`}
          >
            {mode === 'portal' ? <Globe className="w-2.5 h-2.5" /> : <Square className="w-2.5 h-2.5" />}
            {mode === 'portal' ? 'PORTAL' : 'WALLS'}
          </button>

          <div className="h-4 w-px bg-portal-border/60" />

          {/* Score */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">PTS</span>
            <span className="text-xs font-black text-portal-cyan font-mono">{score}</span>
          </div>

          {/* Combo Multiplier */}
          {combo > 1 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-portal-neon/20 border border-portal-neon/40 text-portal-neon text-[9px] font-black animate-pulse">
              <Flame className="w-2.5 h-2.5 text-portal-cyan" /> {combo}x
            </div>
          )}
        </div>

        {/* Right: Best Score & Sound */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-portal-gold" />
            <span className="text-xs font-black text-portal-gold font-mono">{highScore}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Screen Canvas (9:16 Aspect Ratio) */}
      <div
        className="relative rounded-2xl overflow-hidden border-2 border-portal-border shadow-2xl bg-portal-bg touch-none w-auto h-[min(74vh,620px)] max-w-full aspect-[9/16] flex items-center justify-center shrink-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {/* Start / Death Screen Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-portal-bg/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            {isDead ? (
              <div className="space-y-3 w-full max-w-[280px]">
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase tracking-wider">
                  System Crashed
                </span>
                <h3 className="text-2xl font-black text-white">Score: {score}</h3>
                <p className="text-xs text-slate-400">Score synced to global rankings</p>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-w-[280px]">
                <div className="w-14 h-14 rounded-2xl bg-portal-neon/20 border border-portal-neon/40 flex items-center justify-center mx-auto text-portal-neon shadow-glow-purple">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Cyber Snake</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Slither, eat glowing energy cells, and toggle wrap-around portal mode!
                  </p>
                </div>

                {/* Speed & Mode Selector */}
                <div className="flex items-center justify-center gap-1.5 py-1">
                  {(['classic', 'portal'] as SnakeMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        mode === m
                          ? 'bg-portal-cyan text-black shadow-sm'
                          : 'bg-portal-surface text-slate-400 border border-portal-border/60'
                      }`}
                    >
                      {m === 'portal' ? '🌐 Wrap Portal' : '🧱 Solid Walls'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" /> START SLITHER
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Switchable Joystick / Arrow D-Pad (Mobile / Touch) */}
      <div className="mt-2 flex justify-center w-full sm:hidden">
        <MobileGamepad mode="4way" onDirectionChange={handleDirectionChange} label="STEER" />
      </div>

      {/* Desktop Helper Bar */}
      <div className="hidden md:flex w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] mt-1.5 items-center justify-between text-[9px] font-bold text-slate-400 bg-portal-card/80 px-3 py-1 rounded-xl border border-portal-border/60 shrink-0">
        <span className="text-portal-cyan flex items-center gap-1">⌨️ [WASD / ARROWS] STEER</span>
        <span className="text-portal-yellow flex items-center gap-1">⚡ DOUBLE-BUFFER QUEUE ACTIVE</span>
      </div>
    </div>
  );
}
