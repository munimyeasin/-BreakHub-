'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Zap, Flame, Trophy, Award } from 'lucide-react';
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

    // 25% chance to spawn a bonus golden star
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
    snakeRef.current = [{ x: 9, y: 16 }, { x: 9, y: 17 }, { x: 9, y: 18 }];
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
        createExplosion(head.x, head.y, '#FE90E8', 25);

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
        createExplosion(foodRef.current.x, foodRef.current.y, '#FE90E8', 14);
        playSfx('eat');
        spawnFood();
      }
      // Bonus Core Collision
      else if (bonusFoodRef.current && head.x === bonusFoodRef.current.x && head.y === bonusFoodRef.current.y) {
        const added = 300 * combo;
        const newScore = score + added;
        setScore(newScore);
        if (newScore > highScore) setHighScore(newScore);
        createExplosion(bonusFoodRef.current.x, bonusFoodRef.current.y, '#F7CB46', 20);
        playSfx('bonus');
        bonusFoodRef.current = null;
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;

      // Render Frame: Warm ground with Neo-Brutalist clean aesthetic
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Subtle Neo Dot Matrix / Grid
      ctx.strokeStyle = '#E8E3DA';
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

      // Draw Bonus Star Core (Golden Yellow with Black Outline)
      if (bonusFoodRef.current) {
        const bx = bonusFoodRef.current.x * GRID_SIZE + GRID_SIZE / 2;
        const by = bonusFoodRef.current.y * GRID_SIZE + GRID_SIZE / 2;

        ctx.save();
        ctx.fillStyle = '#F7CB46';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(bx, by, GRID_SIZE / 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Star accent inside
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Regular Food (Neo Pink with Bold 2.5px Black Outline)
      const fx = foodRef.current.x * GRID_SIZE + GRID_SIZE / 2;
      const fy = foodRef.current.y * GRID_SIZE + GRID_SIZE / 2;
      ctx.save();
      ctx.fillStyle = '#FE90E8';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(fx, fy, GRID_SIZE / 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Highlight sheen dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Snake Body with Neo Cyan + Green Blocks and Bold Black Stroke
      snakeRef.current.forEach((segment, idx) => {
        const isHead = idx === 0;
        ctx.save();
        ctx.fillStyle = isHead ? '#C0F7FE' : (idx % 2 === 0 ? '#99E885' : '#FFDC8B');
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.roundRect(
          segment.x * GRID_SIZE + 1.5,
          segment.y * GRID_SIZE + 1.5,
          GRID_SIZE - 3,
          GRID_SIZE - 3,
          isHead ? 6 : 4
        );
        ctx.fill();
        ctx.stroke();

        // Cute Comic Eyes on Snake Head
        if (isHead) {
          const eyeOffset = 3.5;
          const eyeRadius = 2.5;
          const pupilRadius = 1.2;

          let eye1X = segment.x * GRID_SIZE + GRID_SIZE / 2;
          let eye1Y = segment.y * GRID_SIZE + GRID_SIZE / 2;
          let eye2X = segment.x * GRID_SIZE + GRID_SIZE / 2;
          let eye2Y = segment.y * GRID_SIZE + GRID_SIZE / 2;

          if (dirRef.current.x !== 0) {
            eye1X += dirRef.current.x * 3;
            eye2X += dirRef.current.x * 3;
            eye1Y -= eyeOffset;
            eye2Y += eyeOffset;
          } else {
            eye1Y += dirRef.current.y * 3;
            eye2Y += dirRef.current.y * 3;
            eye1X -= eyeOffset;
            eye2X += eyeOffset;
          }

          // Eye Whites
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
          ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Pupils
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(eye1X + dirRef.current.x * 0.8, eye1Y + dirRef.current.y * 0.8, pupilRadius, 0, Math.PI * 2);
          ctx.arc(eye2X + dirRef.current.x * 0.8, eye2Y + dirRef.current.y * 0.8, pupilRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Render Active Particles (Neo Brutalism confetti blocks/dots)
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;

        if (p.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
        } else {
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      });
    }, 105);

    return () => clearInterval(interval);
  }, [isPlaying, isDead, score, highScore, combo, onGameOver, spawnFood, playSfx]);

  const handleDirectionChange = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    handleDirection(dir);
  }, []);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        {/* Score Pill */}
        <div className="flex items-center gap-1.5 bg-portal-cyan px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs">
          <span className="text-[10px] text-black font-black uppercase tracking-wider">Score</span>
          <span className="text-xs sm:text-sm font-black text-black">{score}</span>
        </div>

        {/* Dynamic Combo Multiplier Badge */}
        {combo > 1 ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase shadow-neo-xs animate-pulse">
            <Flame className="w-3 h-3 text-black fill-black" />
            <span>{combo}X COMBO</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 tracking-wider">
            <span>• RETRO 2D •</span>
          </div>
        )}

        {/* High Score & Audio Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs">
            <Trophy className="w-3 h-3 text-black stroke-[2.5]" />
            <span className="text-xs sm:text-sm font-black text-black">{highScore}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
            title="Toggle Sound"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Canvas Screen (9:16 Vertical Ratio) with Figma Handles */}
      <div
        className="relative rounded-2xl overflow-hidden border-4 border-black shadow-neo-lg bg-[#FAF8F5] touch-none w-full aspect-[9/16] flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Figma Selection Frame Transform Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain"
        />

        {/* Start / Death Screen Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-10 animate-fadeIn">
            {isDead ? (
              /* Game Over Neo-Brutalist Card */
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 animate-scaleIn text-black">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="inline-block px-3 py-1 rounded-md bg-portal-pink border-2 border-black text-black text-[11px] font-black uppercase tracking-wider shadow-neo-xs">
                  ⚡ CRASHED! ⚡
                </div>

                <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Final Score</div>
                  <div className="text-3xl font-black text-black tracking-tight">{score}</div>
                </div>

                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Score synced to global leaderboard
                </p>

                <button
                  onClick={startGame}
                  className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3]" />
                  <span>PLAY AGAIN</span>
                </button>
              </div>
            ) : (
              /* Pre-Game Start Neo-Brutalist Card */
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-4 animate-scaleIn text-black">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="w-14 h-14 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
                  <Sparkles className="w-7 h-7 stroke-[2.5]" />
                </div>

                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-yellow border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                    • [ ARCADE RUN ] •
                  </div>
                  <h3 className="text-xl font-black text-black tracking-tight uppercase">
                    Neon Snake
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">
                    Eat Pink Apples & Golden Stars. Steer with WASD, Arrows or D-Pad!
                  </p>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-3.5 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                  <span>START GAME</span>
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
