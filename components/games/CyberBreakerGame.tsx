'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Shield,
  Zap,
  Crosshair,
  Flame,
  Maximize2,
  Layers,
  Sparkles,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MobileGamepad from '@/components/ui/MobileGamepad';
import { JoystickMoveEvent } from '@/components/ui/VirtualJoystick';

interface CyberBreakerGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Aspect Ratio (360x640)
const CANVAS_HEIGHT = 640;
const BRICK_ROWS = 8;
const BRICK_COLS = 6;
const BRICK_HEIGHT = 16;
const BRICK_PADDING = 6;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 14;

export type PowerUpType = 'multiball' | 'wide' | 'laser' | 'fireball' | 'slow' | 'shield';

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: PowerUpType;
  color: string;
  letter: string;
  radius: number;
}

interface LaserShot {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  isFireball: boolean;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  status: number; // 0 = dead, 1 = normal, 2 = reinforced (2 hits)
  maxStatus: number;
  color: string;
  points: number;
  powerUp?: PowerUpType;
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

const ROW_COLORS = [
  '#FF0055', // Neon Crimson
  '#FF00EA', // Magenta
  '#9D00FF', // Cyber Purple
  '#00F0FF', // Electric Cyan
  '#00FF66', // Lime Green
  '#FFD700', // Cyber Gold
  '#FF7700', // Solar Orange
  '#38BDF8', // Sky Blue
];

const POWERUP_CONFIGS: Record<PowerUpType, { color: string; letter: string; label: string }> = {
  multiball: { color: '#00F0FF', letter: 'M', label: 'MULTI-BALL' },
  wide: { color: '#00FF66', letter: 'W', label: 'WIDE PADDLE' },
  laser: { color: '#FF0055', letter: 'L', label: 'LASER CANNON' },
  fireball: { color: '#FF7700', letter: 'F', label: 'FIREBALL' },
  slow: { color: '#9D00FF', letter: 'S', label: 'SLOW ORB' },
  shield: { color: '#FFD700', letter: '+', label: 'EXTRA SHIELD' },
};

// Zero-dependency Synth Audio Engine for Cyber Breakout
class BreakerAudioEngine {
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

  public playSound(type: 'paddle' | 'brick' | 'laser' | 'powerup' | 'shield_loss' | 'die' | 'win') {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'paddle') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.05);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'brick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.07);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'powerup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'shield_loss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.45);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const t = now + i * 0.09;
          o.type = 'triangle';
          o.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(0.16, t);
          g.gain.linearRampToValueAtTime(0.001, t + 0.25);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(t);
          o.stop(t + 0.26);
        });
      }
    } catch {}
  }
}

const breakerAudio = new BreakerAudioEngine();

export default function CyberBreakerGame({ onGameOver }: CyberBreakerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [powerUpTimer, setPowerUpTimer] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const joystickAxisXRef = useRef(0);
  const onGameOverRef = useRef(onGameOver);

  const paddleRef = useRef({
    x: CANVAS_WIDTH / 2 - 42,
    y: CANVAS_HEIGHT - 45,
    width: 84,
    height: 12,
    baseWidth: 84,
    hasLaser: false,
  });

  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const lasersRef = useRef<LaserShot[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const powerUpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playSfx = useCallback((type: 'paddle' | 'brick' | 'laser' | 'powerup' | 'shield_loss' | 'die' | 'win') => {
    if (soundEnabledRef.current) {
      breakerAudio.playSound(type);
    }
  }, []);

  const handleJoystickMove = useCallback((e: JoystickMoveEvent) => {
    joystickAxisXRef.current = e.x;
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickAxisXRef.current = 0;
  }, []);

  // Initialize Bricks Grid with procedural power-up assignments
  const initBricks = () => {
    const brickWidth = (CANVAS_WIDTH - BRICK_OFFSET_LEFT * 2 - (BRICK_COLS - 1) * BRICK_PADDING) / BRICK_COLS;
    const list: Brick[] = [];
    const powerTypes: PowerUpType[] = ['multiball', 'wide', 'laser', 'fireball', 'slow', 'shield'];

    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const brickX = c * (brickWidth + BRICK_PADDING) + BRICK_OFFSET_LEFT;
        const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;

        // 25% chance of containing a powerup
        const hasPowerUp = Math.random() < 0.28;
        const assignedPowerUp = hasPowerUp
          ? powerTypes[Math.floor(Math.random() * powerTypes.length)]
          : undefined;

        // Top rows have reinforced 2-hit bricks
        const isReinforced = r === 0 || r === 1;

        list.push({
          x: brickX,
          y: brickY,
          width: brickWidth,
          height: BRICK_HEIGHT,
          status: isReinforced ? 2 : 1,
          maxStatus: isReinforced ? 2 : 1,
          color: ROW_COLORS[r % ROW_COLORS.length],
          points: (BRICK_ROWS - r) * 100 * (isReinforced ? 1.5 : 1),
          powerUp: assignedPowerUp,
        });
      }
    }
    bricksRef.current = list;
  };

  const spawnBall = (vxMultiplier = 1) => {
    return {
      x: paddleRef.current.x + paddleRef.current.width / 2,
      y: CANVAS_HEIGHT - 65,
      radius: 6,
      vx: (Math.random() > 0.5 ? 3.4 : -3.4) * vxMultiplier,
      vy: -4.2,
      isFireball: false,
    };
  };

  const activatePowerUp = (type: PowerUpType) => {
    playSfx('powerup');
    setActivePowerUp(type);
    setPowerUpTimer(10);

    if (powerUpTimeoutRef.current) {
      clearTimeout(powerUpTimeoutRef.current);
    }

    if (type === 'multiball') {
      // Split each existing ball into 3 balls
      const newBalls: Ball[] = [];
      ballsRef.current.forEach((b) => {
        newBalls.push(
          { ...b, vx: b.vx * 0.9, vy: b.vy },
          { ...b, vx: b.vx - 2.2, vy: b.vy * 0.9 },
          { ...b, vx: b.vx + 2.2, vy: b.vy * 0.9 }
        );
      });
      ballsRef.current = newBalls.slice(0, 9); // Cap at 9 balls
    } else if (type === 'wide') {
      paddleRef.current.width = paddleRef.current.baseWidth * 1.5;
    } else if (type === 'laser') {
      paddleRef.current.hasLaser = true;
    } else if (type === 'fireball') {
      ballsRef.current.forEach((b) => (b.isFireball = true));
    } else if (type === 'slow') {
      ballsRef.current.forEach((b) => {
        b.vx *= 0.65;
        b.vy *= 0.65;
      });
    } else if (type === 'shield') {
      setLives((prev) => {
        const next = Math.min(5, prev + 1);
        livesRef.current = next;
        return next;
      });
    }

    // Reset temporary powerups after 10 seconds
    if (type !== 'shield' && type !== 'multiball') {
      powerUpTimeoutRef.current = setTimeout(() => {
        setActivePowerUp(null);
        paddleRef.current.width = paddleRef.current.baseWidth;
        paddleRef.current.hasLaser = false;
        ballsRef.current.forEach((b) => (b.isFireball = false));
      }, 10000);
    }
  };

  const fireLasers = useCallback(() => {
    if (!paddleRef.current.hasLaser || !isPlaying || isDead || isWon) return;
    const pad = paddleRef.current;
    playSfx('laser');
    lasersRef.current.push(
      { x: pad.x + 8, y: pad.y - 10, vy: -9, width: 4, height: 14 },
      { x: pad.x + pad.width - 12, y: pad.y - 10, vy: -9, width: 4, height: 14 }
    );
  }, [isPlaying, isDead, isWon, playSfx]);

  const startGame = () => {
    paddleRef.current.x = CANVAS_WIDTH / 2 - paddleRef.current.baseWidth / 2;
    paddleRef.current.width = paddleRef.current.baseWidth;
    paddleRef.current.hasLaser = false;

    ballsRef.current = [spawnBall()];
    powerUpsRef.current = [];
    lasersRef.current = [];
    particlesRef.current = [];

    initBricks();
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    setScore(0);
    setLives(3);
    setCombo(0);
    setActivePowerUp(null);
    setIsDead(false);
    setIsWon(false);
    setIsPlaying(true);
  };

  // Keyboard navigation & Laser Firing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        paddleRef.current.x = Math.max(0, paddleRef.current.x - 24);
      }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        paddleRef.current.x = Math.min(CANVAS_WIDTH - paddleRef.current.width, paddleRef.current.x + 24);
      }
      if (e.key === ' ' || e.key === 'Enter') {
        fireLasers();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fireLasers]);

  // Touch & Mouse Drag
  const handleTouchMove = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const scaledX = (touchX / rect.width) * CANVAS_WIDTH;
    paddleRef.current.x = Math.max(
      0,
      Math.min(CANVAS_WIDTH - paddleRef.current.width, scaledX - paddleRef.current.width / 2)
    );
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaledX = (mouseX / rect.width) * CANVAS_WIDTH;
    paddleRef.current.x = Math.max(
      0,
      Math.min(CANVAS_WIDTH - paddleRef.current.width, scaledX - paddleRef.current.width / 2)
    );
  };

  // Main Canvas Game Loop
  useEffect(() => {
    if (!isPlaying || isDead || isWon) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const pad = paddleRef.current;

      // Continuous Joystick Movement
      if (Math.abs(joystickAxisXRef.current) > 0.05) {
        pad.x = Math.max(0, Math.min(CANVAS_WIDTH - pad.width, pad.x + joystickAxisXRef.current * 8.5));
      }

      // 1. UPDATE LASERS
      lasersRef.current.forEach((laser, lIdx) => {
        laser.y += laser.vy;

        // Brick collision for lasers
        bricksRef.current.forEach((brick) => {
          if (brick.status > 0) {
            if (
              laser.x + laser.width > brick.x &&
              laser.x < brick.x + brick.width &&
              laser.y < brick.y + brick.height &&
              laser.y + laser.height > brick.y
            ) {
              brick.status--;
              playSfx('brick');
              scoreRef.current += brick.points;
              setScore(scoreRef.current);
              laser.y = -999; // Remove laser

              // Spawn powerup if destroyed
              if (brick.status === 0 && brick.powerUp) {
                const conf = POWERUP_CONFIGS[brick.powerUp];
                powerUpsRef.current.push({
                  x: brick.x + brick.width / 2,
                  y: brick.y + brick.height / 2,
                  vy: 2.2,
                  type: brick.powerUp,
                  color: conf.color,
                  letter: conf.letter,
                  radius: 11,
                });
              }
            }
          }
        });

        if (laser.y < -20) {
          lasersRef.current.splice(lIdx, 1);
        }
      });

      // 2. UPDATE POWER-UPS
      powerUpsRef.current.forEach((p, pIdx) => {
        p.y += p.vy;

        // Paddle Catch Power-Up
        if (
          p.y + p.radius >= pad.y &&
          p.y - p.radius <= pad.y + pad.height &&
          p.x >= pad.x - 5 &&
          p.x <= pad.x + pad.width + 5
        ) {
          activatePowerUp(p.type);
          powerUpsRef.current.splice(pIdx, 1);

          // Particles
          for (let k = 0; k < 10; k++) {
            particlesRef.current.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              alpha: 1,
              color: p.color,
              size: Math.random() * 3 + 2,
            });
          }
          return;
        }

        // Offscreen
        if (p.y > CANVAS_HEIGHT + 20) {
          powerUpsRef.current.splice(pIdx, 1);
        }
      });

      // 3. UPDATE BALLS
      const balls = ballsRef.current;
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.x += b.vx;
        b.y += b.vy;

        // Wall Reflections
        if (b.x - b.radius <= 0) {
          b.x = b.radius;
          b.vx = Math.abs(b.vx);
        } else if (b.x + b.radius >= CANVAS_WIDTH) {
          b.x = CANVAS_WIDTH - b.radius;
          b.vx = -Math.abs(b.vx);
        }

        if (b.y - b.radius <= 0) {
          b.y = b.radius;
          b.vy = Math.abs(b.vy);
        }

        // Paddle Bounce
        if (
          b.y + b.radius >= pad.y &&
          b.y - b.radius <= pad.y + pad.height &&
          b.x >= pad.x &&
          b.x <= pad.x + pad.width &&
          b.vy > 0
        ) {
          playSfx('paddle');
          comboRef.current = 0; // Reset streak on paddle hit
          setCombo(0);

          // Authentic normal deflection curve based on impact offset
          const hitPoint = (b.x - (pad.x + pad.width / 2)) / (pad.width / 2);
          const currentSpeed = Math.hypot(b.vx, b.vy);
          const newSpeed = Math.min(6.5, Math.max(4.0, currentSpeed * 1.02)); // Gradual speed ramp

          b.vx = hitPoint * (newSpeed * 0.88);
          b.vy = -Math.sqrt(Math.max(4, newSpeed * newSpeed - b.vx * b.vx));
        }

        // Brick Collisions
        bricksRef.current.forEach((brick) => {
          if (brick.status > 0) {
            if (
              b.x + b.radius > brick.x &&
              b.x - b.radius < brick.x + brick.width &&
              b.y + b.radius > brick.y &&
              b.y - b.radius < brick.y + brick.height
            ) {
              brick.status--;
              if (!b.isFireball) {
                b.vy = -b.vy;
              }
              playSfx('brick');

              // Combo Streak Bonus
              comboRef.current++;
              setCombo(comboRef.current);
              const comboMultiplier = Math.min(5, 1 + comboRef.current * 0.2);
              const earned = Math.floor(brick.points * comboMultiplier);
              scoreRef.current += earned;
              setScore(scoreRef.current);

              // Spawn PowerUp Drop Capsule if brick broken
              if (brick.status === 0 && brick.powerUp) {
                const conf = POWERUP_CONFIGS[brick.powerUp];
                powerUpsRef.current.push({
                  x: brick.x + brick.width / 2,
                  y: brick.y + brick.height / 2,
                  vy: 2.2,
                  type: brick.powerUp,
                  color: conf.color,
                  letter: conf.letter,
                  radius: 11,
                });
              }

              // Debris Particles
              for (let k = 0; k < 12; k++) {
                particlesRef.current.push({
                  x: brick.x + brick.width / 2,
                  y: brick.y + brick.height / 2,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  alpha: 1,
                  color: brick.color,
                  size: Math.random() * 3 + 2,
                });
              }
            }
          }
        });

        // Bottom Fall / Loss Check
        if (b.y + b.radius >= CANVAS_HEIGHT) {
          balls.splice(i, 1);
        }
      }

      // Check if all active balls fell
      if (balls.length === 0) {
        livesRef.current--;
        setLives(livesRef.current);

        if (livesRef.current > 0) {
          playSfx('shield_loss');
          // Respawn single ball on paddle
          ballsRef.current = [spawnBall()];
        } else {
          // Game Over
          setIsDead(true);
          setIsPlaying(false);
          playSfx('die');
          const finalScore = scoreRef.current;
          setTimeout(() => onGameOverRef.current(finalScore), 400);
          cancelAnimationFrame(animId);
          return;
        }
      }

      // Check Win Condition (all bricks cleared)
      const remainingBricks = bricksRef.current.filter((br) => br.status > 0).length;
      if (remainingBricks === 0) {
        setIsWon(true);
        setIsPlaying(false);
        playSfx('win');
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch {}
        const finalScore = scoreRef.current + 3000 + livesRef.current * 1000;
        scoreRef.current = finalScore;
        setScore(finalScore);
        setTimeout(() => onGameOverRef.current(finalScore), 400);
        cancelAnimationFrame(animId);
        return;
      }

      // 4. RENDER FRAME
      ctx.fillStyle = '#070512';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cyber Grid Background
      ctx.strokeStyle = '#150f33';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Draw Bricks
      bricksRef.current.forEach((brick) => {
        if (brick.status > 0) {
          ctx.fillStyle = brick.status === 2 ? '#FFFFFF' : brick.color;
          ctx.shadowColor = brick.color;
          ctx.shadowBlur = brick.status === 2 ? 14 : 8;
          ctx.beginPath();
          ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
          ctx.fill();

          // If powerup contained, draw faint icon marker
          if (brick.powerUp) {
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', brick.x + brick.width / 2, brick.y + brick.height / 2);
          }
        }
      });

      // Draw Falling Power-Up Capsules
      powerUpsRef.current.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.letter, p.x, p.y);
      });

      // Draw Lasers
      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 10;
      lasersRef.current.forEach((laser) => {
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
      });

      // Draw Paddle
      ctx.fillStyle = pad.hasLaser ? '#FF0055' : '#00F0FF';
      ctx.shadowColor = pad.hasLaser ? '#FF0055' : '#00F0FF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(pad.x, pad.y, pad.width, pad.height, 6);
      ctx.fill();

      // Twin Cannons on Paddle if Laser active
      if (pad.hasLaser) {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(pad.x + 6, pad.y - 4, 4, 4);
        ctx.fillRect(pad.x + pad.width - 10, pad.y - 4, 4, 4);
      }

      // Draw Balls
      ballsRef.current.forEach((b) => {
        ctx.fillStyle = b.isFireball ? '#FF7700' : '#FFD700';
        ctx.shadowColor = b.isFireball ? '#FF0000' : '#FFD700';
        ctx.shadowBlur = b.isFireball ? 20 : 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
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
  }, [isPlaying, isDead, isWon, playSfx]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center font-sans">
      {/* Streamlined Top HUD Strip */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] flex items-center justify-between bg-portal-surface/95 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md shrink-0">
        {/* Lives & Score */}
        <div className="flex items-center gap-2">
          {/* Shields (Lives) */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Shield
                key={idx}
                className={`w-3.5 h-3.5 transition-all ${
                  idx < lives
                    ? 'text-portal-cyan fill-portal-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]'
                    : 'text-slate-600 fill-transparent'
                }`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-portal-border/60" />

          {/* Score */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">PTS</span>
            <span className="text-xs font-black text-portal-gold font-mono">{score}</span>
          </div>

          {/* Streak Combo Indicator */}
          {combo > 1 && (
            <span className="px-1.5 py-0.5 rounded-md bg-portal-pink/20 border border-portal-pink/50 text-[9px] font-black text-portal-pink animate-pulse">
              {combo}x
            </span>
          )}
        </div>

        {/* Active Power-Up Badge & Audio Toggle */}
        <div className="flex items-center gap-1.5">
          {activePowerUp && (
            <span
              className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase text-black flex items-center gap-1 shadow-sm animate-bounce"
              style={{ backgroundColor: POWERUP_CONFIGS[activePowerUp].color }}
            >
              <Zap className="w-2.5 h-2.5" />
              {POWERUP_CONFIGS[activePowerUp].label}
            </span>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Screen Canvas (9:16 Responsive Viewport Wrapper) */}
      <div
        onTouchMove={handleTouchMove}
        onMouseMove={handleMouseMove}
        onClick={fireLasers}
        className="relative rounded-2xl overflow-hidden border-2 border-portal-border shadow-2xl bg-portal-bg touch-none cursor-ew-resize w-auto h-[min(74vh,620px)] max-w-full aspect-[9/16] flex items-center justify-center shrink-0"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {/* Start / Game Over / Win Overlays */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-portal-bg/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
            {isWon ? (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-portal-lime/20 border border-portal-lime/40 flex items-center justify-center mx-auto text-portal-lime shadow-glow-cyan">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-black uppercase">
                    Sector Cleared!
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">Score: {score}</h3>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                </button>
              </div>
            ) : isDead ? (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-portal-pink/20 border border-portal-pink/40 flex items-center justify-center mx-auto text-portal-pink shadow-glow-purple">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase">
                    Shields Depleted
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">Score: {score}</h3>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider shadow-glow-yellow active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> RETRY SECTOR
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-portal-cyan/20 border border-portal-cyan/40 flex items-center justify-center mx-auto text-portal-cyan shadow-glow-cyan">
                  <Layers className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Cyber Breakout</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                    Bounce the plasma orb, capture falling capsules (Multi-Ball, Laser Blaster, Fireball), and breach the matrix!
                  </p>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-xs uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" /> LAUNCH BREAKER
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Horizontal Paddle Controller & Laser Trigger */}
      <div className="mt-2 flex items-center justify-center gap-2 w-full sm:hidden">
        <MobileGamepad
          mode="horizontal"
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
          label="PADDLE"
        />

        {paddleRef.current.hasLaser && isPlaying && (
          <button
            onClick={fireLasers}
            className="px-4 py-3 rounded-xl bg-portal-pink text-white font-black text-xs uppercase shadow-glow-purple active:scale-90 transition-all flex items-center gap-1"
          >
            <Crosshair className="w-4 h-4" /> FIRE
          </button>
        )}
      </div>

      {/* Desktop Helper Bar */}
      <div className="hidden md:flex w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] mt-1.5 items-center justify-between text-[9px] font-bold text-slate-400 bg-portal-card/80 px-3 py-1 rounded-xl border border-portal-border/60 shrink-0">
        <span className="text-portal-cyan flex items-center gap-1">
          ⌨️ [A/D or ARROWS] MOVE • [SPACE] LASER
        </span>
        <span className="text-portal-gold">★ CATCH POWER-UPS</span>
      </div>
    </div>
  );
}
