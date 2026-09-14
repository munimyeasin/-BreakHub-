'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Layers, Trophy } from 'lucide-react';
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
const BRICK_OFFSET_TOP = 40;
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

const ROW_COLORS = ['#FE90E8', '#C0F7FE', '#99E885', '#F7CB46', '#FFDC8B', '#FE90E8', '#C0F7FE'];

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
    height: 14,
  });

  const ballRef = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 65,
    radius: 7,
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
      radius: 7,
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

            // Explosion Particles
            for (let k = 0; k < 12; k++) {
              particlesRef.current.push({
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                alpha: 1,
                color: brick.color,
                size: Math.random() * 4 + 2
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

      // RENDER - Bright Warm Ground
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Neo-Brutalist Dot Grid Texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let x = 12; x < CANVAS_WIDTH; x += 24) {
        for (let y = 12; y < CANVAS_HEIGHT; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Bricks (Solid fill + Crisp Black Border + Offset Shadow)
      bricksRef.current.forEach(brick => {
        if (brick.status === 1) {
          // Hard drop shadow
          ctx.fillStyle = '#000000';
          ctx.fillRect(brick.x + 2, brick.y + 2, brick.width, brick.height);

          // Brick fill
          ctx.fillStyle = brick.color;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

          // Brick border
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        }
      });

      // Draw Paddle (Yellow Neo-Brutalist Swatch)
      // Paddle shadow
      ctx.fillStyle = '#000000';
      ctx.fillRect(pad.x + 3, pad.y + 3, pad.width, pad.height);

      // Paddle fill
      ctx.fillStyle = '#F7CB46';
      ctx.fillRect(pad.x, pad.y, pad.width, pad.height);

      // Paddle border
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(pad.x, pad.y, pad.width, pad.height);

      // Draw Ball (Pink Puck with Black Outline)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(b.x + 2, b.y + 2, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FE90E8';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

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
          ctx.fillRect(part.x, part.y, part.size, part.size);
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(part.x, part.y, part.size, part.size);
          ctx.globalAlpha = 1;
        }
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead, isWon, onGameOver, playSfx]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        <div className="flex items-center gap-1.5 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs">
          <Trophy className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] text-black font-black uppercase tracking-wider">Score</span>
          <span className="text-xs sm:text-sm font-black text-black">{score}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-portal-cyan px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs">
          <Layers className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] text-black font-black uppercase tracking-wider">Breaker</span>
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

      {/* Screen Canvas (9:16 Aspect Ratio) with Figma Handles */}
      <div
        onTouchMove={handleTouchMove}
        onMouseMove={handleMouseMove}
        className="relative rounded-2xl overflow-hidden border-4 border-black shadow-neo-lg bg-[#FAF8F5] touch-none cursor-ew-resize w-full aspect-[9/16] flex items-center justify-center"
      >
        {/* Figma Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            {isWon ? (
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 text-center text-black animate-scaleIn">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="inline-block px-3 py-1 rounded-md bg-portal-green border-2 border-black text-black text-[11px] font-black uppercase tracking-wider shadow-neo-xs">
                  🎉 MATRIX CLEARED!
                </div>

                <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Final Score</div>
                  <div className="text-3xl font-black text-black tracking-tight">{score}</div>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3]" />
                  <span>PLAY AGAIN</span>
                </button>
              </div>
            ) : isDead ? (
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 text-center text-black animate-scaleIn">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="inline-block px-3 py-1 rounded-md bg-portal-pink border-2 border-black text-black text-[11px] font-black uppercase tracking-wider shadow-neo-xs">
                  ⚡ BALL DROPPED ⚡
                </div>

                <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Final Score</div>
                  <div className="text-3xl font-black text-black tracking-tight">{score}</div>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3]" />
                  <span>RETRY LEVEL</span>
                </button>
              </div>
            ) : (
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-4 text-center z-10 animate-scaleIn text-black">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="w-14 h-14 rounded-2xl bg-portal-cyan border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
                  <Layers className="w-7 h-7 stroke-[2.5]" />
                </div>

                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-yellow border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                    • [ ARCADE BREAKER ] •
                  </div>
                  <h3 className="text-xl font-black text-black tracking-tight uppercase">
                    Cyber Breaker
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">
                    Slide paddle or use touch joystick to shatter all neon bricks!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                  <span>START BREAKER</span>
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
