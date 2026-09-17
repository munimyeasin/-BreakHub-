'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberDashGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Vertical Ratio (360x640)
const CANVAS_HEIGHT = 640;
const GROUND_Y = 540;

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
    y: GROUND_Y - 32,
    width: 24,
    height: 32,
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
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
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
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}
  }, [soundEnabled]);

  const jump = useCallback(() => {
    const p = playerRef.current;
    if (p.jumpsLeft > 0) {
      p.vy = -9.2;
      p.isGrounded = false;
      p.jumpsLeft -= 1;
      playSfx('jump');

      // Jump dust
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: p.x + p.width / 2,
          y: p.y + p.height,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2,
          alpha: 0.8,
          color: '#00F0FF',
          size: Math.random() * 3 + 1
        });
      }
    }
  }, [playSfx]);

  const startGame = () => {
    playerRef.current = {
      x: 40,
      y: GROUND_Y - 32,
      width: 24,
      height: 32,
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
            y: GROUND_Y - 26,
            width: 20,
            height: 26,
            type: 'spike'
          });
        } else if (rand < 0.75) {
          obstaclesRef.current.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y - 45,
            width: 18,
            height: 45,
            type: 'laser'
          });
        } else {
          obstaclesRef.current.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y - 70,
            width: 26,
            height: 22,
            type: 'drone'
          });
        }
      }

      // Spawn energy coins
      if (frameCountRef.current % 60 === 0 && Math.random() < 0.7) {
        coinsRef.current.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - (Math.random() < 0.5 ? 30 : 65)
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

          for (let k = 0; k < 25; k++) {
            particlesRef.current.push({
              x: p.x + p.width / 2,
              y: p.y + p.height / 2,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              alpha: 1,
              color: '#FF0055',
              size: Math.random() * 4 + 2
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
              color: '#00F0FF',
              size: Math.random() * 3 + 1
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

      // RENDER
      ctx.fillStyle = '#0B0819';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cyber Grid Sky
      ctx.strokeStyle = '#161138';
      ctx.lineWidth = 1;
      for (let x = (frameCountRef.current * currentSpeed * 0.3) % 40; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH - x, 0);
        ctx.lineTo(CANVAS_WIDTH - x, GROUND_Y);
        ctx.stroke();
      }

      // Glowing Ground Floor
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Ground underfill
      ctx.fillStyle = '#110C29';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Draw Player Runner
      ctx.fillStyle = '#9D00FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, p.height, 6);
      ctx.fill();

      // Cyber Visor
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(p.x + p.width - 8, p.y + 6, 6, 4);

      // Draw Jet / Thruster Trail
      if (!p.isGrounded) {
        ctx.fillStyle = '#00F0FF';
        ctx.beginPath();
        ctx.arc(p.x + 4, p.y + p.height - 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Obstacles
      obstaclesRef.current.forEach(obs => {
        if (obs.type === 'spike') {
          ctx.fillStyle = '#FF0055';
          ctx.shadowColor = '#FF0055';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
        } else if (obs.type === 'laser') {
          ctx.fillStyle = '#FF00EA';
          ctx.shadowColor = '#FF00EA';
          ctx.shadowBlur = 12;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        } else {
          ctx.fillStyle = '#FFD700';
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 5);
          ctx.fill();
        }
      });

      // Draw Coins
      coinsRef.current.forEach(c => {
        ctx.fillStyle = '#00F0FF';
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

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
  }, [isPlaying, isDead, onGameOver, playSfx]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* HUD - Ultra Slim */}
      <div className="w-full flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Dist</span>
          <span className="text-sm font-black text-portal-cyan">{Math.floor(distance / 10)}m</span>
        </div>
        <div className="flex items-center gap-1.5">
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

      {/* Screen Canvas (9:16 Aspect Ratio Frame) */}
      <div
        onClick={() => { if (isPlaying && !isDead) jump(); }}
        className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden border-2 border-portal-border shadow-2xl bg-portal-bg touch-none cursor-pointer flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-portal-bg/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
            {isDead ? (
              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase">
                  Run Over
                </span>
                <h3 className="text-2xl font-black text-white">Score: {score}</h3>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> TRY AGAIN
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-portal-neon/20 border border-portal-neon/40 flex items-center justify-center mx-auto text-portal-cyan shadow-glow-cyan">
                  <Zap className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Cyber Dash 2077</h3>
                  <p className="text-xs text-slate-400 mt-1">Tap screen or Space to jump (Double jump available!).</p>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-black" /> START DASH
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Jump Button */}
      <div className="mt-2.5 sm:hidden w-full px-1">
        <button
          onClick={jump}
          disabled={!isPlaying || isDead}
          className="w-full py-3 bg-portal-surface border border-portal-cyan/60 text-portal-cyan font-black text-sm rounded-xl active:bg-portal-cyan active:text-black shadow-glow-cyan"
        >
          ▲ TAP TO JUMP (DOUBLE JUMP)
        </button>
      </div>
    </div>
  );
}
