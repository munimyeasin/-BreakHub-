'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';
import { JoystickMoveEvent } from '@/components/ui/VirtualJoystick';

interface CyberBreakerGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Aspect Ratio (360x640)
const CANVAS_HEIGHT = 640;
const BRICK_ROWS = 7;
const BRICK_COLS = 6;
const BRICK_HEIGHT = 16;
const BRICK_PADDING = 6;
const BRICK_OFFSET_TOP = 35;
const BRICK_OFFSET_LEFT = 14;

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  status: number;
  color: string;
  points: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

const ROW_COLORS = ['#FF0055', '#FF00EA', '#9D00FF', '#00F0FF', '#00FF66', '#FFD700', '#FF5500'];

export default function CyberBreakerGame({ gameId, onGameOver }: CyberBreakerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scoreRef = useRef(0);
  const joystickAxisXRef = useRef(0);

  const paddleRef = useRef({
    x: CANVAS_WIDTH / 2 - 40,
    y: CANVAS_HEIGHT - 45,
    width: 80,
    height: 12,
  });

  const ballRef = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 65,
    radius: 6,
    vx: 3.2,
    vy: -4.0,
  });

  const bricksRef = useRef<Brick[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const handleJoystickMove = useCallback((e: JoystickMoveEvent) => {
    joystickAxisXRef.current = e.x;
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickAxisXRef.current = 0;
  }, []);

  const playSfx = useCallback((type: 'paddle' | 'brick' | 'die' | 'win') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'brick') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'paddle') {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.06);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  }, [soundEnabled]);

  const initBricks = () => {
    const brickWidth = (CANVAS_WIDTH - BRICK_OFFSET_LEFT * 2 - (BRICK_COLS - 1) * BRICK_PADDING) / BRICK_COLS;
    const list: Brick[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const brickX = c * (brickWidth + BRICK_PADDING) + BRICK_OFFSET_LEFT;
        const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
        list.push({
          x: brickX,
          y: brickY,
          width: brickWidth,
          height: BRICK_HEIGHT,
          status: 1,
          color: ROW_COLORS[r % ROW_COLORS.length],
          points: (BRICK_ROWS - r) * 100,
        });
      }
    }
    bricksRef.current = list;
  };

  const startGame = () => {
    paddleRef.current.x = CANVAS_WIDTH / 2 - paddleRef.current.width / 2;
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 65,
      radius: 6,
      vx: (Math.random() > 0.5 ? 3.2 : -3.2),
      vy: -4.0,
    };
    particlesRef.current = [];
    initBricks();
    scoreRef.current = 0;
    setScore(0);
    setIsDead(false);
    setIsWon(false);
    setIsPlaying(true);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        paddleRef.current.x = Math.max(0, paddleRef.current.x - 22);
      }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        paddleRef.current.x = Math.min(CANVAS_WIDTH - paddleRef.current.width, paddleRef.current.x + 22);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Touch & Mouse Drag
  const handleTouchMove = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const scaledX = (touchX / rect.width) * CANVAS_WIDTH;
    paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - paddleRef.current.width, scaledX - paddleRef.current.width / 2));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaledX = (mouseX / rect.width) * CANVAS_WIDTH;
    paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - paddleRef.current.width, scaledX - paddleRef.current.width / 2));
  };

  // Game Loop
  useEffect(() => {
    if (!isPlaying || isDead || isWon) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const b = ballRef.current;
      const pad = paddleRef.current;

      // Handle Continuous Joystick Control
      if (Math.abs(joystickAxisXRef.current) > 0.05) {
        pad.x = Math.max(0, Math.min(CANVAS_WIDTH - pad.width, pad.x + joystickAxisXRef.current * 7.5));
      }

      b.x += b.vx;
      b.y += b.vy;

      // Wall reflections
      if (b.x - b.radius <= 0 || b.x + b.radius >= CANVAS_WIDTH) {
        b.vx = -b.vx;
      }
      if (b.y - b.radius <= 0) {
        b.vy = -b.vy;
      }

      // Bottom Wall Check (Death)
      if (b.y + b.radius >= CANVAS_HEIGHT) {
        setIsDead(true);
        setIsPlaying(false);
        playSfx('die');
        const finalScore = scoreRef.current;
        setTimeout(() => onGameOver(finalScore), 0);
        cancelAnimationFrame(animId);
        return;
      }

      // Paddle Collision
      if (
        b.y + b.radius >= pad.y &&
        b.y - b.radius <= pad.y + pad.height &&
        b.x >= pad.x &&
        b.x <= pad.x + pad.width
      ) {
        playSfx('paddle');
        // Angle calculation based on where ball hits paddle
        const hitPoint = (b.x - (pad.x + pad.width / 2)) / (pad.width / 2);
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = hitPoint * (speed * 0.85);
        b.vy = -Math.abs(Math.sqrt(Math.max(4, speed * speed - b.vx * b.vx)));
      }

      // Brick Collisions
      let remainingBricks = 0;
      bricksRef.current.forEach(brick => {
        if (brick.status === 1) {
          remainingBricks++;
          if (
            b.x + b.radius > brick.x &&
            b.x - b.radius < brick.x + brick.width &&
            b.y + b.radius > brick.y &&
            b.y - b.radius < brick.y + brick.height
          ) {
            brick.status = 0;
            b.vy = -b.vy;
            playSfx('brick');
            scoreRef.current += brick.points;
            setScore(scoreRef.current);

            // Explosion
            for (let k = 0; k < 12; k++) {
              particlesRef.current.push({
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                alpha: 1,
                color: brick.color,
                size: Math.random() * 3 + 2
              });
            }
          }
        }
      });

      // Win Condition
      if (remainingBricks === 0) {
        setIsWon(true);
        setIsPlaying(false);
        confetti({ particleCount: 100, spread: 70 });
        const finalScore = scoreRef.current + 2000;
        scoreRef.current = finalScore;
        setScore(finalScore);
        setTimeout(() => onGameOver(finalScore), 0);
        cancelAnimationFrame(animId);
        return;
      }

      // RENDER
      ctx.fillStyle = '#0B0819';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid Sky
      ctx.strokeStyle = '#18123A';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Draw Bricks
      bricksRef.current.forEach(brick => {
        if (brick.status === 1) {
          ctx.fillStyle = brick.color;
          ctx.shadowColor = brick.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
          ctx.fill();
        }
      });

      // Draw Paddle
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(pad.x, pad.y, pad.width, pad.height, 6);
      ctx.fill();

      // Draw Ball
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw Particles
      particlesRef.current.forEach((part, idx) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= 0.04;
        if (part.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
        } else {
          ctx.fillStyle = part.color;
          ctx.globalAlpha = part.alpha;
          ctx.beginPath();
          ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead, isWon, onGameOver, playSfx]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* HUD - Ultra Slim */}
      <div className="w-full flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-portal-cyan" />
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Score</span>
          <span className="text-sm font-black text-portal-gold">{score}</span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60"
        >
          {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </div>

      {/* Screen Canvas (9:16 Aspect Ratio) */}
      <div
        onTouchMove={handleTouchMove}
        onMouseMove={handleMouseMove}
        className="relative rounded-2xl overflow-hidden border-2 border-portal-border shadow-2xl bg-portal-bg touch-none cursor-ew-resize w-full aspect-[9/16] flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-portal-bg/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
            {isWon ? (
              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-black uppercase">
                  Matrix Cleared!
                </span>
                <h3 className="text-2xl font-black text-white">Score: {score}</h3>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                </button>
              </div>
            ) : isDead ? (
              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase">
                  Ball Dropped
                </span>
                <h3 className="text-2xl font-black text-white">Score: {score}</h3>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> RETRY LEVEL
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-portal-cyan/20 border border-portal-cyan/40 flex items-center justify-center mx-auto text-portal-cyan shadow-glow-cyan">
                  <Layers className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Cyber Brick Breaker</h3>
                  <p className="text-xs text-slate-400 mt-1">Joystick, drag, or arrow keys to bounce the energy orb.</p>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-black" /> START BREAKER
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Switchable Joystick / Arrow D-Pad (Mobile / Touch) */}
      <div className="mt-3 flex justify-center w-full sm:hidden">
        <MobileGamepad
          mode="horizontal"
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
          label="PADDLE"
        />
      </div>
    </div>
  );
}
