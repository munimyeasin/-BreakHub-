'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Zap, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';

interface NeonSnakeGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type Point = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number };

const GRID_SIZE = 20;
const CANVAS_WIDTH = 360; // 18 cells * 20px (9:16 Vertical Ratio)
const CANVAS_HEIGHT = 640; // 32 cells * 20px (9:16 Vertical Ratio)
const MAX_CELLS_X = CANVAS_WIDTH / GRID_SIZE; // 18
const MAX_CELLS_Y = CANVAS_HEIGHT / GRID_SIZE; // 32

export default function NeonSnakeGame({ gameId, onGameOver }: NeonSnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const snakeRef = useRef<Point[]>([{ x: 9, y: 16 }, { x: 9, y: 17 }, { x: 9, y: 18 }]);
  const dirRef = useRef<Point>({ x: 0, y: -1 });
  const nextDirRef = useRef<Point>({ x: 0, y: -1 });
  const foodRef = useRef<Point>({ x: 9, y: 8 });
  const bonusFoodRef = useRef<Point | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Web Audio Synth for instant arcade SFX without external audio files
  const playSfx = useCallback((type: 'eat' | 'die' | 'bonus') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'eat') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'bonus') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  }, [soundEnabled]);

  const spawnFood = useCallback(() => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * MAX_CELLS_X),
        y: Math.floor(Math.random() * MAX_CELLS_Y),
      };
      const collides = snakeRef.current.some(s => s.x === newFood.x && s.y === newFood.y);
      if (!collides) break;
    }
    foodRef.current = newFood;

    // 20% chance to spawn a glowing bonus orb
    if (Math.random() < 0.25) {
      bonusFoodRef.current = {
        x: Math.floor(Math.random() * MAX_CELLS_X),
        y: Math.floor(Math.random() * MAX_CELLS_Y),
      };
    } else {
      bonusFoodRef.current = null;
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

  const startGame = () => {
    snakeRef.current = [{ x: 16, y: 9 }, { x: 16, y: 10 }, { x: 16, y: 11 }];
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    particlesRef.current = [];
    setScore(0);
    setCombo(1);
    setIsDead(false);
    setIsPlaying(true);
    spawnFood();
  };

  const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const cur = dirRef.current;
    if (dir === 'UP' && cur.y === 0) nextDirRef.current = { x: 0, y: -1 };
    if (dir === 'DOWN' && cur.y === 0) nextDirRef.current = { x: 0, y: 1 };
    if (dir === 'LEFT' && cur.x === 0) nextDirRef.current = { x: -1, y: 0 };
    if (dir === 'RIGHT' && cur.x === 0) nextDirRef.current = { x: 1, y: 0 };
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { key } = e;
      const cur = dirRef.current;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
        e.preventDefault();
      }

      if ((key === 'ArrowUp' || key === 'w' || key === 'W') && cur.y === 0) nextDirRef.current = { x: 0, y: -1 };
      if ((key === 'ArrowDown' || key === 's' || key === 'S') && cur.y === 0) nextDirRef.current = { x: 0, y: 1 };
      if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && cur.x === 0) nextDirRef.current = { x: -1, y: 0 };
      if ((key === 'ArrowRight' || key === 'd' || key === 'D') && cur.x === 0) nextDirRef.current = { x: 1, y: 0 };
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      if (dx > 25 && dirRef.current.x === 0) nextDirRef.current = { x: 1, y: 0 };
      if (dx < -25 && dirRef.current.x === 0) nextDirRef.current = { x: -1, y: 0 };
    } else {
      if (dy > 25 && dirRef.current.y === 0) nextDirRef.current = { x: 0, y: 1 };
      if (dy < -25 && dirRef.current.y === 0) nextDirRef.current = { x: 0, y: -1 };
    }
  };

  // Game Loop
  useEffect(() => {
    if (!isPlaying || isDead) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const interval = setInterval(() => {
      dirRef.current = nextDirRef.current;
      const head = {
        x: snakeRef.current[0].x + dirRef.current.x,
        y: snakeRef.current[0].y + dirRef.current.y,
      };

      // Wall collision or Self collision
      if (
        head.x < 0 || head.x >= MAX_CELLS_X ||
        head.y < 0 || head.y >= MAX_CELLS_Y ||
        snakeRef.current.some(s => s.x === head.x && s.y === head.y)
      ) {
        setIsDead(true);
        setIsPlaying(false);
        playSfx('die');
        createExplosion(head.x, head.y, '#FF0055', 25);

        if (score > 1000) {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }
        setTimeout(() => onGameOver(score), 0);
        return;
      }

      const newSnake = [head, ...snakeRef.current];

      // Regular Food Collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        const added = 100 * combo;
        const newScore = score + added;
        setScore(newScore);
        setCombo(prev => Math.min(prev + 1, 5));
        if (newScore > highScore) setHighScore(newScore);
        createExplosion(foodRef.current.x, foodRef.current.y, '#00F0FF', 14);
        playSfx('eat');
        spawnFood();
      }
      // Bonus Core Collision
      else if (bonusFoodRef.current && head.x === bonusFoodRef.current.x && head.y === bonusFoodRef.current.y) {
        const added = 300 * combo;
        const newScore = score + added;
        setScore(newScore);
        if (newScore > highScore) setHighScore(newScore);
        createExplosion(bonusFoodRef.current.x, bonusFoodRef.current.y, '#FFD700', 20);
        playSfx('bonus');
        bonusFoodRef.current = null;
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;

      // Render Frame
      ctx.fillStyle = '#0B0819';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid background
      ctx.strokeStyle = '#1A1438';
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw Bonus Core (Gold Pulse)
      if (bonusFoodRef.current) {
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(
          bonusFoodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
          bonusFoodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
          GRID_SIZE / 2.2, 0, Math.PI * 2
        );
        ctx.fill();
      }

      // Draw Food (Electric Cyan Glow)
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(
        foodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
        foodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2.6, 0, Math.PI * 2
      );
      ctx.fill();

      // Draw Snake Body with Gradient Neon
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

        // Cyber head eyes
        if (isHead) {
          ctx.fillStyle = '#00F0FF';
          ctx.beginPath();
          ctx.arc(
            segment.x * GRID_SIZE + GRID_SIZE / 2 + dirRef.current.x * 3,
            segment.y * GRID_SIZE + GRID_SIZE / 2 + dirRef.current.y * 3,
            2.5, 0, Math.PI * 2
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
    }, 105);

    return () => clearInterval(interval);
  }, [isPlaying, isDead, score, highScore, combo, onGameOver, spawnFood, playSfx]);

  const handleDirectionChange = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (dir === 'UP' && dirRef.current.y === 0) nextDirRef.current = { x: 0, y: -1 };
    else if (dir === 'DOWN' && dirRef.current.y === 0) nextDirRef.current = { x: 0, y: 1 };
    else if (dir === 'LEFT' && dirRef.current.x === 0) nextDirRef.current = { x: -1, y: 0 };
    else if (dir === 'RIGHT' && dirRef.current.x === 0) nextDirRef.current = { x: 1, y: 0 };
  }, []);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center">
      {/* Top HUD - Ultra Slim */}
      <div className="w-full max-w-[min(100%,calc(min(78vh,680px)*9/16))] flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Score</span>
          <span className="text-sm font-black text-portal-cyan">{score}</span>
        </div>

        {combo > 1 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-portal-neon/20 border border-portal-neon/40 text-purple-300 text-[9px] font-black animate-pulse">
            <Flame className="w-2.5 h-2.5 text-portal-cyan" /> {combo}x
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Best</span>
            <span className="text-sm font-black text-portal-gold">{highScore}</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Canvas Screen (9:16 Vertical Ratio with Viewport Height Scaling) */}
      <div
        className="relative rounded-2xl overflow-hidden border-2 border-portal-border shadow-2xl bg-portal-bg touch-none w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] flex items-center justify-center shrink-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain"
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
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-gradient-to-r from-portal-cyan to-blue-600 text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
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
                  <h3 className="text-xl font-black text-white">Joystick or WASD</h3>
                  <p className="text-xs text-slate-400 mt-1">Eat cyan cores & golden energy cells</p>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-black" /> START RUN
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Switchable Joystick / Arrow D-Pad (Mobile / Touch) */}
      <div className="mt-3 flex justify-center w-full sm:hidden">
        <MobileGamepad
          mode="4way"
          onDirectionChange={handleDirectionChange}
          label="STEER"
        />
      </div>
    </div>
  );
}
