'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Zap, Footprints, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberDashGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Vertical Ratio (360x640)
const CANVAS_HEIGHT = 640;
const GROUND_Y = 530;

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'laser' | 'drone';
  passed?: boolean;
}

interface EnergyCoin {
  x: number;
  y: number;
  collected?: boolean;
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

export default function CyberDashGame({ gameId, onGameOver }: CyberDashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scoreRef = useRef(0);
  const distanceRef = useRef(0);

  // Player physics
  const playerRef = useRef({
    x: 40,
    y: GROUND_Y - 34,
    width: 26,
    height: 34,
    vy: 0,
    isGrounded: true,
    jumpsLeft: 2,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<EnergyCoin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef(4.5);
  const frameCountRef = useRef(0);

  const playSfx = useCallback((type: 'jump' | 'coin' | 'crash') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'jump') {
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'coin') {
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}
  }, [soundEnabled]);

  const jump = useCallback(() => {
    const p = playerRef.current;
    if (p.jumpsLeft > 0) {
      p.vy = -9.4;
      p.isGrounded = false;
      p.jumpsLeft -= 1;
      playSfx('jump');

      // Jump dust in Neo Brutalist colors
      const colors = ['#FE90E8', '#C0F7FE', '#F7CB46', '#99E885'];
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: p.x + p.width / 2,
          y: p.y + p.height,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2 + 0.5,
          alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 3 + 2,
        });
      }
    }
  }, [playSfx]);

  const startGame = () => {
    playerRef.current = {
      x: 40,
      y: GROUND_Y - 34,
      width: 26,
      height: 34,
      vy: 0,
      isGrounded: true,
      jumpsLeft: 2,
    };
    obstaclesRef.current = [];
    coinsRef.current = [];
    particlesRef.current = [];
    speedRef.current = 4.5;
    frameCountRef.current = 0;
    scoreRef.current = 0;
    distanceRef.current = 0;
    setScore(0);
    setDistance(0);
    setIsDead(false);
    setIsPlaying(true);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (isPlaying && !isDead) jump();
        else if (!isPlaying) startGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isDead, jump]);

  // Main Loop
  useEffect(() => {
    if (!isPlaying || isDead) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      frameCountRef.current++;
      const p = playerRef.current;

      // Gravity & Physics
      p.vy += 0.44;
      p.y += p.vy;

      if (p.y >= GROUND_Y - p.height) {
        p.y = GROUND_Y - p.height;
        p.vy = 0;
        p.isGrounded = true;
        p.jumpsLeft = 2;
      }

      // Speed increases gradually
      if (frameCountRef.current % 300 === 0) {
        speedRef.current = Math.min(speedRef.current + 0.3, 8.5);
      }

      const currentSpeed = speedRef.current;

      // Spawn obstacles
      if (frameCountRef.current % Math.floor(75 / (currentSpeed / 4.5)) === 0) {
        const rand = Math.random();
        if (rand < 0.45) {
          obstaclesRef.current.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y - 28,
            width: 22,
            height: 28,
            type: 'spike',
          });
        } else if (rand < 0.75) {
          obstaclesRef.current.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y - 48,
            width: 20,
            height: 48,
            type: 'laser',
          });
        } else {
          obstaclesRef.current.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y - 72,
            width: 28,
            height: 24,
            type: 'drone',
          });
        }
      }

      // Spawn energy coins
      if (frameCountRef.current % 60 === 0 && Math.random() < 0.7) {
        coinsRef.current.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - (Math.random() < 0.5 ? 32 : 68),
        });
      }

      // Update Obstacles & Check Collisions
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.x -= currentSpeed;

        // Collision Check (AABB with small padding)
        if (
          p.x + 4 < obs.x + obs.width &&
          p.x + p.width - 4 > obs.x &&
          p.y + 4 < obs.y + obs.height &&
          p.y + p.height - 4 > obs.y
        ) {
          setIsDead(true);
          setIsPlaying(false);
          playSfx('crash');

          const crashColors = ['#FE90E8', '#F7CB46', '#C0F7FE', '#000000'];
          for (let k = 0; k < 25; k++) {
            particlesRef.current.push({
              x: p.x + p.width / 2,
              y: p.y + p.height / 2,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              alpha: 1,
              color: crashColors[Math.floor(Math.random() * crashColors.length)],
              size: Math.random() * 4 + 2,
            });
          }

          const finalScore = scoreRef.current;
          if (finalScore > 2000) confetti({ particleCount: 60, spread: 60 });
          setTimeout(() => onGameOver(finalScore), 0);
          cancelAnimationFrame(animId);
          return;
        }

        if (obs.x < -40) {
          obstaclesRef.current.splice(i, 1);
        }
      }

      // Update Coins
      for (let i = coinsRef.current.length - 1; i >= 0; i--) {
        const coin = coinsRef.current[i];
        coin.x -= currentSpeed;

        // Collect check
        if (
          !coin.collected &&
          Math.hypot(p.x + p.width / 2 - coin.x, p.y + p.height / 2 - coin.y) < 22
        ) {
          coin.collected = true;
          playSfx('coin');
          scoreRef.current += 250;
          setScore(scoreRef.current);

          for (let k = 0; k < 8; k++) {
            particlesRef.current.push({
              x: coin.x,
              y: coin.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              alpha: 1,
              color: '#F7CB46',
              size: Math.random() * 3 + 1,
            });
          }
          coinsRef.current.splice(i, 1);
        } else if (coin.x < -30) {
          coinsRef.current.splice(i, 1);
        }
      }

      // Distance score
      distanceRef.current += 1;
      scoreRef.current += 1;
      setDistance(distanceRef.current);
      setScore(scoreRef.current);

      // ==========================================
      // RENDER - Neo-Brutalist Canvas 2D
      // ==========================================
      // 1. Warm Ground Surface
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Neo-Brutalist Dot Grid
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let x = 12; x < CANVAS_WIDTH; x += 24) {
        for (let y = 12; y < GROUND_Y; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Scrolling Background Decorative Pillars
      const offset = (frameCountRef.current * currentSpeed * 0.25) % 80;
      for (let x = -offset; x < CANVAS_WIDTH + 80; x += 80) {
        ctx.fillStyle = 'rgba(192, 247, 254, 0.35)'; // Soft cyan block
        ctx.fillRect(x, 180, 24, GROUND_Y - 180);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.strokeRect(x, 180, 24, GROUND_Y - 180);
      }

      // 4. Ground Floor & Striped Neo-Underfill
      ctx.fillStyle = '#FFDC8B'; // Warm Neo Butter
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Black Ground Divider Line
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, GROUND_Y - 2, CANVAS_WIDTH, 4);

      // Ground Diagonal Hatch Pattern
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      const groundScroll = (frameCountRef.current * currentSpeed) % 24;
      for (let gx = -groundScroll - 24; gx < CANVAS_WIDTH + 48; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, GROUND_Y + 4);
        ctx.lineTo(gx - 18, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // 5. Draw Obstacles (Solid Swatches + 2.5px Black Border + Hard Drop Shadows)
      obstaclesRef.current.forEach(obs => {
        if (obs.type === 'spike') {
          // Hard Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(obs.x + 3, obs.y + obs.height + 2);
          ctx.lineTo(obs.x + obs.width / 2 + 3, obs.y + 2);
          ctx.lineTo(obs.x + obs.width + 3, obs.y + obs.height + 2);
          ctx.closePath();
          ctx.fill();

          // Spike Face (Neo Pink)
          ctx.fillStyle = '#FE90E8';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#000000';
          ctx.stroke();
        } else if (obs.type === 'laser') {
          // Hard Shadow
          ctx.fillStyle = '#000000';
          ctx.fillRect(obs.x + 3, obs.y + 3, obs.width, obs.height);

          // Pillar Swatch (Neo Cyan)
          ctx.fillStyle = '#C0F7FE';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

          // Center hazard lines
          ctx.fillStyle = '#000000';
          ctx.fillRect(obs.x + 4, obs.y + 8, obs.width - 8, 4);
          ctx.fillRect(obs.x + 4, obs.y + obs.height - 12, obs.width - 8, 4);
        } else {
          // Drone (Neo Yellow Hovering Bot)
          // Hard Shadow
          ctx.fillStyle = '#000000';
          ctx.fillRect(obs.x + 3, obs.y + 3, obs.width, obs.height);

          ctx.fillStyle = '#F7CB46';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

          // Drone Eye
          ctx.fillStyle = '#000000';
          ctx.fillRect(obs.x + 6, obs.y + 8, 8, 8);
          ctx.fillStyle = '#FE90E8';
          ctx.fillRect(obs.x + 8, obs.y + 10, 4, 4);
        }
      });

      // 6. Draw Energy Coins (Golden Swatch + Black Border + Hard Shadow)
      coinsRef.current.forEach(c => {
        // Shadow
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(c.x + 2, c.y + 2, 7, 0, Math.PI * 2);
        ctx.fill();

        // Coin Body
        ctx.fillStyle = '#F7CB46';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Star / Sparkle Mark
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', c.x, c.y + 0.5);
      });

      // 7. Draw Player Runner (Neo Pink Swatch + Hard Black Shadow + Visor)
      // Hard Drop Shadow
      ctx.fillStyle = '#000000';
      ctx.fillRect(p.x + 3, p.y + 3, p.width, p.height);

      // Player Body
      ctx.fillStyle = '#FE90E8';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(p.x, p.y, p.width, p.height);

      // Cyber Visor / Face
      ctx.fillStyle = '#000000';
      ctx.fillRect(p.x + p.width - 10, p.y + 6, 8, 7);
      ctx.fillStyle = '#C0F7FE';
      ctx.fillRect(p.x + p.width - 8, p.y + 8, 5, 4);

      // Neo Jet Thruster Dust
      if (!p.isGrounded) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(p.x + 3, p.y + p.height + 2, 6, 6);
        ctx.fillStyle = '#F7CB46';
        ctx.fillRect(p.x + 2, p.y + p.height + 1, 6, 6);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(p.x + 2, p.y + p.height + 1, 6, 6);
      }

      // 8. Draw Particles (Hard Outlined Color Blobs)
      particlesRef.current.forEach((part, idx) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= 0.035;

        if (part.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
        } else {
          ctx.fillStyle = part.color;
          ctx.globalAlpha = Math.max(0, part.alpha);
          ctx.beginPath();
          ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#000000';
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead, onGameOver, playSfx]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        {/* Distance */}
        <div className="flex items-center gap-1.5 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Footprints className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] uppercase tracking-wider">Dist</span>
          <span className="text-xs font-black">{Math.floor(distance / 10)}m</span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1.5 bg-portal-cyan px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Trophy className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] uppercase tracking-wider">Score</span>
          <span className="text-xs font-black">{score}</span>
        </div>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
          title="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />}
        </button>
      </div>

      {/* Screen Canvas (9:16 Aspect Ratio Frame) with Figma Handles */}
      <div
        onClick={() => { if (isPlaying && !isDead) jump(); }}
        className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden border-4 border-black shadow-neo-lg bg-[#FAF8F5] touch-none cursor-pointer flex items-center justify-center"
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
          className="w-full h-full object-contain"
        />

        {/* Pre-Game & Game Over Neo-Brutalist Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            {isDead ? (
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 text-center text-black animate-scaleIn">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="inline-block px-3 py-1 rounded-md bg-portal-pink border-2 border-black text-black text-[11px] font-black uppercase tracking-wider shadow-neo-xs">
                  ⚡ RUN COMPLETED ⚡
                </div>

                <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Final Score</div>
                  <div className="text-3xl font-black text-black tracking-tight">{score}</div>
                  <div className="text-[11px] font-bold text-slate-800">
                    Distance: {Math.floor(distance / 10)}m
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3]" />
                  <span>TRY AGAIN</span>
                </button>
              </div>
            ) : (
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-4 text-center text-black animate-scaleIn">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="w-14 h-14 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
                  <Zap className="w-7 h-7 fill-black stroke-[2.5]" />
                </div>

                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-yellow border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                    • [ INFINITE RUNNER ] •
                  </div>
                  <h3 className="text-xl font-black text-black tracking-tight uppercase">
                    Cyber Dash
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">
                    Tap screen or Space to jump! Double jump to clear high obstacles and collect stars.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                  <span>START DASH</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Jump Button */}
      <div className="mt-2.5 sm:hidden w-full px-1">
        <button
          type="button"
          onClick={jump}
          disabled={!isPlaying || isDead}
          className="w-full py-3 bg-portal-yellow active:bg-portal-pink border-3 border-black text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          ▲ TAP TO JUMP (DOUBLE JUMP)
        </button>
      </div>
    </div>
  );
}
