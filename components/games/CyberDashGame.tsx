'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Zap, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberDashGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Vertical Ratio (360x640)
const CANVAS_HEIGHT = 640;
const GROUND_Y = 520;

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'laser' | 'drone';
}

interface EnergyCoin {
  x: number;
  y: number;
  collected?: boolean;
  pulse?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  rotation?: number;
  vRot?: number;
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

  // Player physics & animation state (Mech Capsule / Transformers x AmongUs style)
  const playerRef = useRef({
    x: 50,
    y: GROUND_Y - 38,
    width: 36,
    height: 36,
    vy: 0,
    isGrounded: true,
    jumpsLeft: 2,
    hoverOffset: 0,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<EnergyCoin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef(5.2);
  const frameCountRef = useRef(0);

  const playSfx = useCallback((type: 'jump' | 'coin' | 'crash' | 'double_jump') => {
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
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'double_jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1050, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'coin') {
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}
  }, [soundEnabled]);

  const jump = useCallback(() => {
    const p = playerRef.current;
    if (p.jumpsLeft > 0) {
      const isDouble = p.jumpsLeft === 1;
      p.vy = isDouble ? -11.2 : -9.8;
      p.isGrounded = false;
      p.jumpsLeft -= 1;
      playSfx(isDouble ? 'double_jump' : 'jump');

      const particleColor = isDouble ? '#FF007F' : '#00F0FF';
      for (let i = 0; i < (isDouble ? 16 : 10); i++) {
        particlesRef.current.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 3 + 1,
          alpha: 0.9,
          color: particleColor,
          size: Math.random() * 4 + 2,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.2,
        });
      }
    }
  }, [playSfx]);

  const startGame = () => {
    playerRef.current = {
      x: 50,
      y: GROUND_Y - 38,
      width: 36,
      height: 36,
      vy: 0,
      isGrounded: true,
      jumpsLeft: 2,
      hoverOffset: 0,
    };
    obstaclesRef.current = [];
    coinsRef.current = [];
    particlesRef.current = [];
    speedRef.current = 5.2;
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
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
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

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    let animId: number;

    const loop = () => {
      frameCountRef.current++;
      const p = playerRef.current;

      // Gravity & Physics
      p.vy += 0.5;
      p.y += p.vy;

      if (p.isGrounded) {
        p.hoverOffset = Math.sin(frameCountRef.current * 0.2) * 3;
      } else {
        p.hoverOffset = 0;
      }

      if (p.y >= GROUND_Y - p.height) {
        p.y = GROUND_Y - p.height;
        p.vy = 0;
        p.isGrounded = true;
        p.jumpsLeft = 2;
      }

      if (frameCountRef.current % 240 === 0) {
        speedRef.current = Math.min(speedRef.current + 0.35, 9.5);
      }

      const currentSpeed = speedRef.current;

      // Spawn Obstacles
      if (frameCountRef.current % Math.floor(65 / (currentSpeed / 5)) === 0) {
        const rand = Math.random();
        if (rand < 0.4) {
          obstaclesRef.current.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y - 28,
            width: 24,
            height: 28,
            type: 'spike',
          });
        } else if (rand < 0.7) {
          obstaclesRef.current.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y - 54,
            width: 16,
            height: 54,
            type: 'laser',
          });
        } else {
          obstaclesRef.current.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y - 78,
            width: 32,
            height: 24,
            type: 'drone',
          });
        }
      }

      // Spawn Energy Crystals
      if (frameCountRef.current % 45 === 0 && Math.random() < 0.75) {
        coinsRef.current.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - (Math.random() < 0.5 ? 38 : 78),
          pulse: Math.random() * Math.PI,
        });
      }

      // Update Obstacles & Collisions
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.x -= currentSpeed;

        if (
          p.x + 6 < obs.x + obs.width - 4 &&
          p.x + p.width - 6 > obs.x + 4 &&
          p.y + 4 < obs.y + obs.height - 2 &&
          p.y + p.height - 4 > obs.y + 2
        ) {
          setIsDead(true);
          setIsPlaying(false);
          playSfx('crash');

          for (let k = 0; k < 35; k++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 7 + 2;
            particlesRef.current.push({
              x: p.x + p.width / 2,
              y: p.y + p.height / 2,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              alpha: 1,
              color: k % 2 === 0 ? '#FF007F' : '#00F0FF',
              size: Math.random() * 5 + 2,
              rotation: Math.random() * Math.PI,
              vRot: (Math.random() - 0.5) * 0.4,
            });
          }

          const finalScore = scoreRef.current;
          if (finalScore > 1500) confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
          setTimeout(() => onGameOver(finalScore), 0);
          cancelAnimationFrame(animId);
          return;
        }

        if (obs.x < -40) {
          obstaclesRef.current.splice(i, 1);
        }
      }

      // Update Energy Crystals
      for (let i = coinsRef.current.length - 1; i >= 0; i--) {
        const coin = coinsRef.current[i];
        coin.x -= currentSpeed;
        if (coin.pulse !== undefined) coin.pulse += 0.1;

        if (
          !coin.collected &&
          Math.hypot(p.x + p.width / 2 - coin.x, p.y + p.height / 2 - coin.y) < 24
        ) {
          coin.collected = true;
          playSfx('coin');
          scoreRef.current += 300;
          setScore(scoreRef.current);

          for (let k = 0; k < 10; k++) {
            particlesRef.current.push({
              x: coin.x,
              y: coin.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              alpha: 1,
              color: '#00F0FF',
              size: Math.random() * 3 + 2,
            });
          }
          coinsRef.current.splice(i, 1);
        } else if (coin.x < -30) {
          coinsRef.current.splice(i, 1);
        }
      }

      // Distance & Score
      distanceRef.current += 1;
      scoreRef.current += 1;
      setDistance(distanceRef.current);
      setScore(scoreRef.current);

      // ==================== RENDERING Katana Slicer Dojo Style ====================
      const dojoGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      dojoGrad.addColorStop(0, '#090014');
      dojoGrad.addColorStop(0.5, '#260021');
      dojoGrad.addColorStop(1, '#08000d');
      ctx.fillStyle = dojoGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const dojoGlow = ctx.createRadialGradient(CANVAS_WIDTH / 2, GROUND_Y * 0.5, 20, CANVAS_WIDTH / 2, GROUND_Y * 0.5, CANVAS_WIDTH * 0.9);
      dojoGlow.addColorStop(0, 'rgba(255, 0, 127, 0.18)');
      dojoGlow.addColorStop(0.55, 'rgba(0, 240, 255, 0.08)');
      dojoGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = dojoGlow;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cyber Grid lines (Scrolling)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const gridOffset = (frameCountRef.current * currentSpeed * 0.5) % 40;
      for (let x = -gridOffset; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GROUND_Y);
        ctx.stroke();
      }
      for (let y = 0; y < GROUND_Y; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Glowing Ground Floor
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, '#140516');
      groundGrad.addColorStop(1, '#070014');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ==================== AMONG US x TRANSFORMERS MECH CAPSULE (NO LEGS) ====================
      const renderY = p.y + p.hoverOffset;
      const cx = p.x + p.width / 2;
      const cy = renderY + p.height / 2;

      ctx.save();
      ctx.translate(cx, cy);

      // Hard Drop Shadow
      ctx.fillStyle = '#000000';
      ctx.fillRect(-p.width / 2 + 5, -p.height / 2 + 5, p.width, p.height);

      // Heavy Jetpack on Back
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(-p.width / 2 - 8, -12, 10, 26);
      ctx.strokeRect(-p.width / 2 - 8, -12, 10, 26);

      // Jetpack Exhaust Glow
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 12;
      ctx.fillRect(-p.width / 2 - 6, 10, 6, 6);
      ctx.shadowBlur = 0;

      // Main Armored Mech-Capsule Body (AmongUs Pod + Transformers Angular Armor)
      const podGrad = ctx.createLinearGradient(-p.width / 2, -p.height / 2, p.width / 2, p.height / 2);
      podGrad.addColorStop(0, '#FF63C6');
      podGrad.addColorStop(0.5, '#FF007F');
      podGrad.addColorStop(1, '#9333EA');
      ctx.fillStyle = podGrad;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 12);
      ctx.fill();
      ctx.stroke();

      // Cyber Visor / Optical Face Screen (Wide Cyan Curved Glass)
      ctx.fillStyle = '#00F0FF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(0, -p.height / 3, 14, 16, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Specular Highlight on Visor
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(4, -p.height / 3 + 3, 6, 4);
      ctx.globalAlpha = 1;

      // Transformers Cyber-Armor Plating Lines
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-p.width / 2 + 4, 0);
      ctx.lineTo(p.width / 2 - 4, 0);
      ctx.stroke();

      ctx.restore();

      // Powerful Jetpack Plasma Flame Trail behind player
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(p.x - 8, renderY + p.height / 2, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(p.x - 4, renderY + p.height / 2, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Obstacles
      obstaclesRef.current.forEach(obs => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(obs.x + 3, obs.y + 3, obs.width, obs.height);

        if (obs.type === 'spike') {
          ctx.fillStyle = '#FF007F';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#FF007F';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (obs.type === 'laser') {
          ctx.fillStyle = '#FF63C6';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#FF007F';
          ctx.shadowBlur = 14;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(obs.x + 4, obs.y, obs.width - 8, obs.height);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = '#FFE600';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#FFE600';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FF007F';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Energy Crystals
      coinsRef.current.forEach(c => {
        const floatY = c.y + Math.sin(c.pulse || 0) * 4;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(c.x + 2, floatY + 2, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00F0FF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(c.x, floatY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw Particles
      particlesRef.current.forEach((part, idx) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= 0.035;

        if (part.rotation !== undefined && part.vRot !== undefined) {
          part.rotation += part.vRot;
        }

        if (part.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
        } else {
          ctx.save();
          ctx.translate(part.x, part.y);
          if (part.rotation) ctx.rotate(part.rotation);
          ctx.fillStyle = part.color;
          ctx.globalAlpha = part.alpha;
          ctx.fillRect(-part.size / 2, -part.size / 2, part.size, part.size);
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead, onGameOver, playSfx]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center font-mono">
      {/* Neo-Brutalist HUD Bar */}
      <div className="w-full max-w-[min(100%,calc(min(78vh,680px)*9/16))] flex items-center justify-between bg-[#140516] text-white px-3.5 py-2 border-2 border-[#FF007F] rounded-xl shadow-[0_4px_20px_rgba(255,0,127,0.25)] mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#00F0FF]" />
          <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Dist</span>
          <span className="text-sm font-black text-[#00F0FF]">{Math.floor(distance / 10)}m</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FFE600]" />
          <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Score</span>
          <span className="text-sm font-black text-[#FFE600]">{score}</span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 bg-[#090014] hover:bg-[#260021] text-zinc-300 border border-[#3d1030] rounded-lg active:scale-95 transition-transform cursor-pointer"
          title="Toggle Audio"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#00F0FF]" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
        </button>
      </div>

      {/* Main 9:16 Portrait Canvas Frame */}
      <div
        onClick={() => {
          if (isPlaying && !isDead) jump();
          else if (!isPlaying) startGame();
        }}
        className="relative w-auto h-[min(78vh,680px)] max-w-full aspect-[9/16] bg-gradient-to-b from-[#090014] via-[#260021] to-[#08000d] rounded-2xl border-2 border-[#3d1030] p-2.5 shadow-[0_12px_40px_rgba(255,0,127,0.3)] flex flex-col items-center justify-between overflow-hidden shrink-0 cursor-pointer"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full rounded-xl object-contain bg-[#070014]"
        />

        {/* Start / Game Over Overlay */}
        {(!isPlaying || isDead) && (
          <div className="absolute inset-0 bg-[#090014]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            {isDead ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 rounded-2xl bg-[#FF007F] border-2 border-black flex items-center justify-center text-3xl mb-3 shadow-[4px_4px_0_#000]">
                  💥
                </div>
                <h2 className="text-2xl font-black text-white tracking-wider mb-1">RUN TERMINATED</h2>
                <p className="text-xs text-[#00F0FF] mb-4">Distance: {Math.floor(distance / 10)}m | Score: {score}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startGame();
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-[#FFE600] hover:bg-yellow-300 text-black font-black text-sm uppercase rounded-xl border-2 border-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Run Again
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00F0FF] to-[#FF007F] border-2 border-black flex items-center justify-center text-3xl mb-4 shadow-[6px_6px_0_#000] animate-pulse">
                  🤖
                </div>
                <h1 className="text-3xl font-black text-white tracking-wider mb-1 drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]">
                  CYBER DASH 2077
                </h1>
                <p className="text-xs text-zinc-300 max-w-[240px] mb-6">
                  Tap / Space / Up Arrow to Jump & Double-Jump across neon obstacles & collect quantum crystals.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startGame();
                  }}
                  className="flex items-center gap-2 px-7 py-3.5 bg-[#00F0FF] hover:bg-cyan-300 text-black font-black text-base uppercase rounded-xl border-2 border-black shadow-[5px_5px_0_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-black" /> Initialize Run
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
