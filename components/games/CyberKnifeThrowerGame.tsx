'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Flame, Heart, Target, Zap, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberKnifeThrowerGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;

interface StuckKnife {
  angle: number; // Angle on the rotating wheel (radians)
}

interface FlyingKnife {
  x: number;
  y: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
}

export default function CyberKnifeThrowerGame({ gameId, onGameOver }: CyberKnifeThrowerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [knivesLeft, setKnivesLeft] = useState(7);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const soundEnabledRef = useRef(true);
  const onGameOverRef = useRef(onGameOver);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // Game state refs for 60fps loop
  const wheelAngleRef = useRef(0);
  const wheelSpeedRef = useRef(0.02);
  const stuckKnivesRef = useRef<StuckKnife[]>([]);
  const flyingKnifeRef = useRef<FlyingKnife | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const levelKnivesTotalRef = useRef(7);
  const knivesRemainingRef = useRef(7);
  const isTransitioningRef = useRef(false);

  const playSfx = useCallback((type: 'throw' | 'hit' | 'clash' | 'levelClear' | 'gameOver') => {
    if (!soundEnabledRef.current || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'throw') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'clash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'levelClear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.1);
        osc.frequency.setValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'gameOver') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {}
  }, []);

  const addParticles = (x: number, y: number, color: string, count = 15) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 20,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#facc15') => {
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.5,
      life: 0,
    });
  };

  const startGame = () => {
    scoreRef.current = 0;
    setDisplayScore(0);
    setLevel(1);
    const initialKnives = 7;
    levelKnivesTotalRef.current = initialKnives;
    knivesRemainingRef.current = initialKnives;
    setKnivesLeft(initialKnives);
    stuckKnivesRef.current = [];
    flyingKnifeRef.current = null;
    wheelAngleRef.current = 0;
    wheelSpeedRef.current = 0.025;
    particlesRef.current = [];
    floatingTextsRef.current = [];
    isTransitioningRef.current = false;
    setIsDead(false);
    setIsPlaying(true);
  };

  const throwKnife = useCallback(() => {
    if (!isPlaying || isDead || isTransitioningRef.current) return;
    if (flyingKnifeRef.current !== null) return; // Only one knife in flight at a time
    if (knivesRemainingRef.current <= 0) return;

    flyingKnifeRef.current = {
      x: CANVAS_WIDTH / 2,
      y: 520,
      vy: -22,
    };
    knivesRemainingRef.current -= 1;
    setKnivesLeft(knivesRemainingRef.current);
    playSfx('throw');
  }, [isPlaying, isDead, playSfx]);

  // Handle controls: Space, Up arrow, Click/Tap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        throwKnife();
      } else if (e.key === 'r' || e.key === 'R') {
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [throwKnife]);

  // Main 60fps Game Loop
  useEffect(() => {
    if (!isPlaying || isDead) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const wheelCenter = { x: CANVAS_WIDTH / 2, y: 190 };
    const wheelRadius = 75;

    const render = () => {
      // 1. Update Wheel Rotation
      wheelAngleRef.current += wheelSpeedRef.current;
      if (wheelAngleRef.current > Math.PI * 2) {
        wheelAngleRef.current -= Math.PI * 2;
      }

      // 2. Update Flying Knife
      if (flyingKnifeRef.current) {
        const knife = flyingKnifeRef.current;
        knife.y += knife.vy;

        // Check collision with rotating wheel perimeter
        const dx = knife.x - wheelCenter.x;
        const dy = knife.y - wheelCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= wheelRadius + 10) {
          // Hit the wheel! Calculate angle relative to center
          const hitGlobalAngle = Math.atan2(dy, dx);
          // Convert to wheel local angle
          let localAngle = hitGlobalAngle - wheelAngleRef.current;
          // Normalize to [0, 2pi]
          while (localAngle < 0) localAngle += Math.PI * 2;
          while (localAngle >= Math.PI * 2) localAngle -= Math.PI * 2;

          // Check if it collides with any already stuck knife (collision threshold ~ 0.22 radians / ~12.5 degrees)
          let collided = false;
          for (const stuck of stuckKnivesRef.current) {
            let angleDiff = Math.abs(stuck.angle - localAngle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
            if (angleDiff < 0.24) {
              collided = true;
              break;
            }
          }

          if (collided) {
            // Collision! Game Over or lose
            playSfx('clash');
            addParticles(knife.x, knife.y, '#f43f5e', 25);
            setIsDead(true);
            setIsPlaying(false);
            playSfx('gameOver');
            onGameOverRef.current(scoreRef.current);
          } else {
            // Successful stick!
            playSfx('hit');
            stuckKnivesRef.current.push({ angle: localAngle });
            addParticles(knife.x, knife.y, '#38bdf8', 15);
            scoreRef.current += 10;
            setDisplayScore(scoreRef.current);
            addFloatingText(wheelCenter.x, wheelCenter.y - wheelRadius - 20, '+10', '#38bdf8');
            flyingKnifeRef.current = null;

            // Check if level is cleared
            if (stuckKnivesRef.current.length >= levelKnivesTotalRef.current) {
              isTransitioningRef.current = true;
              playSfx('levelClear');
              scoreRef.current += 100 * level;
              setDisplayScore(scoreRef.current);
              addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, `LEVEL ${level} CLEARED! +${100 * level}`, '#facc15');
              confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });

              setTimeout(() => {
                const nextLevel = level + 1;
                setLevel(nextLevel);
                const nextKnives = 7 + (nextLevel - 1) * 2;
                levelKnivesTotalRef.current = nextKnives;
                knivesRemainingRef.current = nextKnives;
                setKnivesLeft(nextKnives);
                stuckKnivesRef.current = [];
                // Increase speed and occasionally alternate direction
                const speedMagnitude = 0.02 + nextLevel * 0.005;
                wheelSpeedRef.current = nextLevel % 2 === 0 ? -speedMagnitude : speedMagnitude;
                isTransitioningRef.current = false;
              }, 1200);
            }
          }
        } else if (knife.y < -50) {
          // Missed entirely
          flyingKnifeRef.current = null;
        }
      }

      // 3. Render Canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Katana Slicer dojo: deep plum, hot neon, hard-edged grid.
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#18000F');
      bgGrad.addColorStop(0.5, '#2A0518');
      bgGrad.addColorStop(1, '#070014');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const dojoGlow = ctx.createRadialGradient(CANVAS_WIDTH / 2, 210, 20, CANVAS_WIDTH / 2, 210, 280);
      dojoGlow.addColorStop(0, 'rgba(255, 0, 127, 0.18)');
      dojoGlow.addColorStop(0.55, 'rgba(0, 240, 255, 0.07)');
      dojoGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = dojoGlow;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cyber Grid Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Render Stuck Knives on Rotating Wheel
      stuckKnivesRef.current.forEach((stuck) => {
        const globalAngle = stuck.angle + wheelAngleRef.current;
        ctx.save();
        ctx.translate(wheelCenter.x, wheelCenter.y);
        ctx.rotate(globalAngle);
        // Draw knife pointing outward from wheel center
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(-5, wheelRadius);
        ctx.lineTo(5, wheelRadius);
        ctx.lineTo(4, wheelRadius + 50);
        ctx.lineTo(0, wheelRadius + 65);
        ctx.lineTo(-4, wheelRadius + 50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Knife handle
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-7, wheelRadius + 40, 14, 18);
        ctx.strokeRect(-7, wheelRadius + 40, 14, 18);
        ctx.restore();
      });

      // Render Rotating Central Wheel
      ctx.save();
      ctx.translate(wheelCenter.x, wheelCenter.y);
      ctx.rotate(wheelAngleRef.current);

      // Outer rim
      ctx.beginPath();
      ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
      const wheelGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, wheelRadius);
      wheelGrad.addColorStop(0, '#38bdf8');
      wheelGrad.addColorStop(0.7, '#0284c7');
      wheelGrad.addColorStop(1, '#0369a1');
      ctx.fillStyle = wheelGrad;
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner futuristic core
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Render Flying Knife
      if (flyingKnifeRef.current) {
        const fk = flyingKnifeRef.current;
        ctx.save();
        ctx.translate(fk.x, fk.y);
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(-5, 20);
        ctx.lineTo(5, 20);
        ctx.lineTo(4, -20);
        ctx.lineTo(0, -35);
        ctx.lineTo(-4, -20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Render Ready Knife at Bottom Launcher Area
      if (!isTransitioningRef.current && flyingKnifeRef.current === null && knivesRemainingRef.current > 0) {
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, 530);
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(-6, 25);
        ctx.lineTo(6, 25);
        ctx.lineTo(5, -20);
        ctx.lineTo(0, -38);
        ctx.lineTo(-5, -20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Render Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      // Render Floating Texts
      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.life += 1;
        ft.alpha = 1 - ft.life / 30;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '900 16px "Impact", sans-serif';
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.life < 30);

      // Render Bottom Reserve Knives indicator icons
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px monospace';
      ctx.fillText(`RESERVE KNIVES:`, 24, 615);

      for (let i = 0; i < knivesRemainingRef.current; i++) {
        const kx = 150 + i * 18;
        const ky = 610;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(kx, ky - 10, 4, 14);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(kx, ky - 10, 4, 14);
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isDead, level, playSfx]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black select-none overflow-hidden">
      {/* Top HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-4 py-2 rounded-2xl bg-portal-card border-3 border-black shadow-neo-sm text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-portal-cyan stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider text-portal-cyan">
              LVL {level}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-portal-yellow stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider text-portal-yellow">
              {displayScore} PTS
            </span>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-xl bg-portal-surface border-2 border-black text-white hover:text-portal-cyan transition-all shadow-neo-sm"
          title="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 stroke-[2.5]" /> : <VolumeX className="w-4 h-4 stroke-[2.5]" />}
        </button>
      </div>

      {/* Canvas Arcade Container */}
      <div
        className="relative cursor-pointer touch-none"
        onClick={throwKnife}
        onTouchStart={(e) => {
          e.preventDefault();
          throwKnife();
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full max-w-[480px] h-[75dvh] max-h-[640px] object-contain border-4 border-black rounded-2xl shadow-neo-lg bg-[#0a0014]"
        />

        {/* Start Overlay */}
        {!isPlaying && !isDead && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-portal-cyan border-3 border-black flex items-center justify-center mb-4 shadow-neo-sm animate-bounce">
              <Target className="w-8 h-8 text-black stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
              Cyber Knife Thrower
            </h2>
            <p className="text-xs text-slate-300 font-bold max-w-xs mb-6 leading-relaxed">
              Throw cyber knives into the spinning target wheel. Avoid hitting other stuck knives! Tap, click, or press Space to throw.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="px-8 py-3 rounded-2xl bg-portal-yellow text-black text-sm font-black uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current stroke-[2.5]" />
              Start Mission
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isDead && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-rose-500 border-3 border-black flex items-center justify-center mb-4 shadow-neo-sm">
              <Flame className="w-8 h-8 text-white stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-black text-rose-400 uppercase tracking-tight mb-1">
              Blade Collision!
            </h2>
            <p className="text-xs text-slate-300 font-bold mb-4">
              Final Score: <span className="text-portal-yellow font-black">{displayScore} PTS</span> (Level {level})
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="px-6 py-3 rounded-2xl bg-portal-cyan text-black text-xs font-black uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom helper prompt */}
      <div className="mt-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
        [Space / Click / Tap] Throw Knife • [R] Restart
      </div>
    </div>
  );
}
