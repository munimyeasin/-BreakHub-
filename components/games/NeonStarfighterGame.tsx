'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Rocket, Zap, Shield, Sparkles, AlertTriangle, Tv, AlertCircle, Radio } from 'lucide-react';
import confetti from 'canvas-confetti';

interface NeonStarfighterGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Vertical Portrait Ratio (360x640)
const CANVAS_HEIGHT = 640;
const PLAYER_BASE_Y = CANVAS_HEIGHT - 75;

type PowerupType = 'spread' | 'shield' | 'nuke' | 'hyper';

interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
  vy: number;
  radius: number;
  pulse: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  color: string;
  type: 'drone' | 'scout' | 'heavy';
}

interface Meteor {
  x: number;
  y: number;
  radius: number;
  vy: number;
  vx: number;
  rotation: number;
  rotSpeed: number;
  points: { x: number; y: number }[];
}

interface BlackHole {
  x: number;
  y: number;
  radius: number;
  pullRadius: number;
  vy: number;
  angle: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
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
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  shape: 'square' | 'cross' | 'dot';
}

export default function NeonStarfighterGame({ gameId, onGameOver }: NeonStarfighterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activePowerup, setActivePowerup] = useState<string | null>(null);
  const [adNotice, setAdNotice] = useState<string | null>(null);
  const [hasRevived, setHasRevived] = useState(false);

  // Pure refs for hot game loop (zero React reconciliation lag on PC)
  const soundEnabledRef = useRef(true);
  const onGameOverRef = useRef(onGameOver);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const activePowerupRef = useRef<string | null>(null);
  const lastSyncedPowerupRef = useRef<string | null>(null);
  const hasRevivedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // Pre-allocated Neo-Brutalist Geometric Starfield
  const starsRef = useRef<Star[]>(
    Array.from({ length: 45 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() > 0.65 ? 3 : 2,
      speed: Math.random() * 2.2 + 1.0,
      color: Math.random() > 0.6 ? '#FE90E8' : Math.random() > 0.35 ? '#C0F7FE' : Math.random() > 0.15 ? '#F7CB46' : '#000000',
      shape: Math.random() > 0.7 ? 'cross' : Math.random() > 0.4 ? 'square' : 'dot',
    }))
  );

  // Player state
  const playerRef = useRef({
    x: CANVAS_WIDTH / 2 - 16,
    y: PLAYER_BASE_Y,
    width: 32,
    height: 36,
    speed: 10,
    hasShield: false,
    tripleShotTimer: 0,
    hyperTimer: 0,
  });

  const pointerRef = useRef<{
    active: boolean;
    lastX: number;
    pendingDeltaX: number;
  }>({
    active: false,
    lastX: 0,
    pendingDeltaX: 0,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const blackHolesRef = useRef<BlackHole[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef(0);

  const keysRef = useRef<{
    left: boolean;
    right: boolean;
  }>({
    left: false,
    right: false,
  });

  const lastShotTimeRef = useRef(0);
  const lastSpawnEnemyTimeRef = useRef(0);
  const lastSpawnMeteorTimeRef = useRef(0);
  const lastSpawnBlackHoleTimeRef = useRef(0);
  const lastSpawnPowerupTimeRef = useRef(0);
  const lastScoreSyncTimeRef = useRef(0);
  const lastTimeRef = useRef(0);

  // High-Performance Singleton Web Audio Oscillator Engine
  const initAudioCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const playSfx = useCallback((type: 'laser' | 'spread' | 'boom' | 'shield_hit' | 'powerup' | 'nuke' | 'deflect') => {
    if (!soundEnabledRef.current || typeof window === 'undefined') return;
    try {
      const ctx = initAudioCtx();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'spread') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1050, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'boom') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'shield_hit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.linearRampToValueAtTime(700, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'nuke') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'deflect') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.03);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch {}
  }, [initAudioCtx]);

  const playSfxRef = useRef(playSfx);
  useEffect(() => {
    playSfxRef.current = playSfx;
  }, [playSfx]);

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    if (floatingTextsRef.current.length > 6) floatingTextsRef.current.shift();
    floatingTextsRef.current.push({ x, y, text, color, alpha: 1, vy: -1.6 });
  };

  const createMeteor = (): Meteor => {
    const radius = Math.random() * 15 + 15;
    const numPoints = 6;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const dist = radius * (0.8 + Math.random() * 0.4);
      points.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    }
    return {
      x: Math.random() * (CANVAS_WIDTH - 60) + 30,
      y: -35,
      radius,
      vy: Math.random() * 1.5 + 2.0,
      vx: (Math.random() - 0.5) * 1.2,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      points,
    };
  };

  const createBlackHole = (): BlackHole => {
    return {
      x: Math.random() * (CANVAS_WIDTH - 120) + 60,
      y: -45,
      radius: 20,
      pullRadius: 135,
      vy: 1.3,
      angle: 0,
    };
  };

  const triggerNuke = () => {
    playSfx('nuke');
    screenShakeRef.current = 14;

    enemiesRef.current.forEach((enemy) => {
      scoreRef.current += 150;
      for (let k = 0; k < 6; k++) {
        if (particlesRef.current.length < 40) {
          particlesRef.current.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            alpha: 1,
            color: enemy.color,
            size: 3,
            life: 0,
            maxLife: 18,
          });
        }
      }
    });
    enemiesRef.current = [];
    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'EMP SCREEN CLEAR!', '#FE90E8');
  };

  const revivePlayer = () => {
    hasRevivedRef.current = true;
    setHasRevived(true);
    setAdNotice(null);

    // Reset ship coordinates safely to base position
    playerRef.current = {
      ...playerRef.current,
      x: CANVAS_WIDTH / 2 - 16,
      y: PLAYER_BASE_Y,
      hasShield: true, // Emergency shield granted upon respawn
      tripleShotTimer: Math.max(playerRef.current.tripleShotTimer, 180), // 3s temporary rapid boost
    };

    // Clear immediate threats & hazards near bottom/spawn area
    enemiesRef.current = enemiesRef.current.filter((e) => e.y < CANVAS_HEIGHT * 0.4);
    meteorsRef.current = meteorsRef.current.filter((m) => m.y < CANVAS_HEIGHT * 0.35);
    blackHolesRef.current = [];

    // Spawn shockwave & visual particles for revival blast
    screenShakeRef.current = 16;
    for (let k = 0; k < 25; k++) {
      particlesRef.current.push({
        x: CANVAS_WIDTH / 2,
        y: PLAYER_BASE_Y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        alpha: 1,
        color: '#F7CB46',
        size: 3.5,
        life: 0,
        maxLife: 24,
      });
    }

    addFloatingText(CANVAS_WIDTH / 2, PLAYER_BASE_Y - 40, '⚡ SHIP REVIVED! +1 LIFE ⚡', '#FE90E8');
    playSfx('powerup');

    // Reset timestamp clock so delta-time doesn't jump forward
    lastTimeRef.current = performance.now();
    lastShotTimeRef.current = performance.now();
    pointerRef.current = {
      active: false,
      lastX: 0,
      pendingDeltaX: 0,
    };

    // Resume combat game loop
    setIsDead(false);
    setIsPlaying(true);
  };

  const handleWatchAdForRevive = () => {
    if (hasRevivedRef.current) {
      setAdNotice('Revive has already been used for this mission (Limit: 1 per run).');
      if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
      adTimeoutRef.current = setTimeout(() => setAdNotice(null), 4000);
      return;
    }

    playSfx('laser');
    setAdNotice('No ads are available right now. Emergency revive granted!');
    setTimeout(() => {
      revivePlayer();
    }, 600);
  };

  const startGame = () => {
    setAdNotice(null);
    setHasRevived(false);
    hasRevivedRef.current = false;
    playerRef.current = {
      x: CANVAS_WIDTH / 2 - 16,
      y: PLAYER_BASE_Y,
      width: 32,
      height: 36,
      speed: 10,
      hasShield: false,
      tripleShotTimer: 0,
      hyperTimer: 0,
    };
    pointerRef.current = {
      active: false,
      lastX: 0,
      pendingDeltaX: 0,
    };
    enemiesRef.current = [];
    meteorsRef.current = [];
    blackHolesRef.current = [];
    powerupsRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    lastShotTimeRef.current = 0;
    lastSpawnEnemyTimeRef.current = 0;
    lastSpawnMeteorTimeRef.current = 0;
    lastSpawnBlackHoleTimeRef.current = 0;
    lastSpawnPowerupTimeRef.current = 0;
    lastScoreSyncTimeRef.current = 0;
    lastTimeRef.current = performance.now();
    scoreRef.current = 0;
    waveRef.current = 1;
    activePowerupRef.current = null;
    lastSyncedPowerupRef.current = null;
    screenShakeRef.current = 0;
    setDisplayScore(0);
    setWave(1);
    setActivePowerup(null);
    setIsDead(false);
    setIsPlaying(true);
  };

  // Keyboard Event Handlers (Horizontal Only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) keysRef.current.left = true;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) keysRef.current.left = false;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Relative Delta Pointer Handling
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isDead) return;
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const rect = target.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaledX = (clientX / (rect.width || CANVAS_WIDTH)) * CANVAS_WIDTH;

    pointerRef.current.active = true;
    pointerRef.current.lastX = scaledX;
    pointerRef.current.pendingDeltaX = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isDead || !pointerRef.current.active) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaledX = (clientX / (rect.width || CANVAS_WIDTH)) * CANVAS_WIDTH;

    const deltaX = scaledX - pointerRef.current.lastX;
    pointerRef.current.lastX = scaledX;
    pointerRef.current.pendingDeltaX += deltaX;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const target = e.currentTarget;
    try {
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch {}
    pointerRef.current.active = false;
    pointerRef.current.pendingDeltaX = 0;
  };

  // Idle Background Loop (Neo-Brutalist Ground + Geometric Drift)
  useEffect(() => {
    if (isPlaying && !isDead) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const idleLoop = (timestamp: number) => {
      const rawDt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const dt = Math.min(rawDt, 0.045);
      const timeScale = dt * 60;

      // 1. Warm Ground Clear
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Dot Matrix Texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let x = 12; x < CANVAS_WIDTH; x += 24) {
        for (let y = 12; y < CANVAS_HEIGHT; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Floating Geometric Retro Stars
      const stars = starsRef.current;
      for (let s = 0; s < stars.length; s++) {
        const star = stars[s];
        star.y += star.speed * timeScale;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }

        ctx.fillStyle = star.color;
        if (star.shape === 'square') {
          ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(star.x | 0, star.y | 0, star.size, star.size);
        } else if (star.shape === 'cross') {
          const cx = star.x | 0;
          const cy = star.y | 0;
          ctx.fillRect(cx - 2, cy, 5, 1.5);
          ctx.fillRect(cx, cy - 2, 1.5, 5);
        } else {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(idleLoop);
    };

    animId = requestAnimationFrame(idleLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead]);

  // High-Performance 60-144+ FPS Delta-Time Game Loop
  useEffect(() => {
    if (!isPlaying || isDead) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    lastTimeRef.current = performance.now();

    const loop = (timestamp: number) => {
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 0.045);
      const timeScale = dt * 60; // 1.0 at 60 FPS

      const p = playerRef.current;

      // Sync Wave and Score with React HUD periodically
      if (timestamp - lastScoreSyncTimeRef.current > 120) {
        lastScoreSyncTimeRef.current = timestamp;
        setDisplayScore(scoreRef.current);

        const currentWave = Math.floor(scoreRef.current / 1500) + 1;
        if (currentWave !== waveRef.current) {
          waveRef.current = currentWave;
          setWave(currentWave);
        }

        if (activePowerupRef.current !== lastSyncedPowerupRef.current) {
          lastSyncedPowerupRef.current = activePowerupRef.current;
          setActivePowerup(activePowerupRef.current);
        }
      }

      // Decrement Powerup Timers
      if (p.tripleShotTimer > 0) {
        p.tripleShotTimer -= timeScale;
        if (p.tripleShotTimer <= 0) {
          p.tripleShotTimer = 0;
          activePowerupRef.current = null;
        }
      }
      if (p.hyperTimer > 0) {
        p.hyperTimer -= timeScale;
        if (p.hyperTimer <= 0) {
          p.hyperTimer = 0;
          activePowerupRef.current = null;
        }
      }

      // Player Movement: Horizontal Only
      p.y = PLAYER_BASE_Y;

      // Calculate gravitational pull from all active black holes
      let totalGravityX = 0;
      let strongestPullRatio = 0;

      blackHolesRef.current.forEach((bh) => {
        const dx = bh.x - (p.x + p.width / 2);
        const dy = bh.y - (p.y + p.height / 2);
        const dist = Math.hypot(dx, dy);

        if (dist < bh.pullRadius && dist > 1) {
          const pullRatio = (bh.pullRadius - dist) / bh.pullRadius;
          if (pullRatio > strongestPullRatio) {
            strongestPullRatio = pullRatio;
          }
          const force = Math.pow(pullRatio, 1.25) * 11.5 * timeScale;
          totalGravityX += (dx / dist) * force;

          // Spawn gravitational suction sparks toward black hole
          if (Math.random() < 0.35 && particlesRef.current.length < 45) {
            particlesRef.current.push({
              x: p.x + p.width / 2 + (Math.random() - 0.5) * 12,
              y: p.y + p.height / 2 + (Math.random() - 0.5) * 12,
              vx: (dx / dist) * 4.5 + (Math.random() - 0.5) * 2,
              vy: (dy / dist) * 4.5 + (Math.random() - 0.5) * 2,
              alpha: 0.9,
              color: Math.random() > 0.5 ? '#FE90E8' : '#000000',
              size: 2.5,
              life: 0,
              maxLife: 14,
            });
          }
        }
      });

      const currentSpeed = (p.hyperTimer > 0 ? p.speed * 1.35 : p.speed) * timeScale;
      const hasKeyInput = keysRef.current.left || keysRef.current.right;

      if (hasKeyInput) {
        if (keysRef.current.left) p.x = Math.max(0, p.x - currentSpeed);
        if (keysRef.current.right) p.x = Math.min(CANVAS_WIDTH - p.width, p.x + currentSpeed);
        pointerRef.current.active = false;
        pointerRef.current.pendingDeltaX = 0;
      } else if (pointerRef.current.active || pointerRef.current.pendingDeltaX !== 0) {
        const deltaX = pointerRef.current.pendingDeltaX;
        pointerRef.current.pendingDeltaX = 0;

        const controlTraction = Math.max(0.08, 1 - Math.pow(strongestPullRatio, 1.1) * 0.92);
        p.x += deltaX * controlTraction;
      }

      if (totalGravityX !== 0) {
        p.x += totalGravityX;
      }
      p.x = Math.max(0, Math.min(CANVAS_WIDTH - p.width, p.x));

      // Auto-Shooting Cannon
      const fireIntervalMs = p.hyperTimer > 0 ? 80 : p.tripleShotTimer > 0 ? 115 : 135;
      if (timestamp - lastShotTimeRef.current >= fireIntervalMs) {
        lastShotTimeRef.current = timestamp;

        if (p.tripleShotTimer > 0) {
          bulletsRef.current.push(
            { x: p.x + p.width / 2 - 2, y: p.y - 4, vx: 0, vy: -14, color: '#FE90E8' },
            { x: p.x + p.width / 2 - 2, y: p.y - 4, vx: -3, vy: -13.5, color: '#99E885' },
            { x: p.x + p.width / 2 - 2, y: p.y - 4, vx: 3, vy: -13.5, color: '#99E885' }
          );
          playSfxRef.current('spread');
        } else {
          bulletsRef.current.push(
            { x: p.x + 5, y: p.y - 2, vx: 0, vy: -14, color: p.hyperTimer > 0 ? '#F7CB46' : '#000000' },
            { x: p.x + p.width - 9, y: p.y - 2, vx: 0, vy: -14, color: p.hyperTimer > 0 ? '#F7CB46' : '#000000' }
          );
          playSfxRef.current('laser');
        }
      }

      // Thruster Exhaust
      if (particlesRef.current.length < 35) {
        particlesRef.current.push({
          x: p.x + p.width / 2 + (Math.random() - 0.5) * 8,
          y: p.y + p.height - 4,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 3 + 4,
          alpha: 0.85,
          color: p.hyperTimer > 0 ? '#F7CB46' : p.tripleShotTimer > 0 ? '#99E885' : '#FE90E8',
          size: 2.5,
          life: 0,
          maxLife: 10,
        });
      }

      // SPAWN SYSTEM
      const currentWave = waveRef.current;
      const enemyInterval = Math.max(450, 850 - currentWave * 50);
      if (timestamp - lastSpawnEnemyTimeRef.current >= enemyInterval) {
        lastSpawnEnemyTimeRef.current = timestamp;
        const rand = Math.random();
        if (rand > 0.75) {
          enemiesRef.current.push({
            x: Math.random() * (CANVAS_WIDTH - 44) + 6,
            y: -35,
            width: 36,
            height: 30,
            vx: (Math.random() - 0.5) * 2.2,
            vy: Math.random() * 1.2 + 2.2 + currentWave * 0.15,
            hp: 4,
            maxHp: 4,
            color: '#FE90E8',
            type: 'heavy',
          });
        } else if (rand > 0.4) {
          enemiesRef.current.push({
            x: Math.random() * (CANVAS_WIDTH - 32) + 6,
            y: -30,
            width: 26,
            height: 22,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 1.5 + 3.2 + currentWave * 0.15,
            hp: 2,
            maxHp: 2,
            color: '#C0F7FE',
            type: 'scout',
          });
        } else {
          enemiesRef.current.push({
            x: Math.random() * (CANVAS_WIDTH - 28) + 6,
            y: -25,
            width: 22,
            height: 18,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 1.5 + 3.8 + currentWave * 0.2,
            hp: 1,
            maxHp: 1,
            color: '#F7CB46',
            type: 'drone',
          });
        }
      }

      // Spawn Meteors
      if (timestamp - lastSpawnMeteorTimeRef.current >= Math.max(1600, 2600 - currentWave * 100)) {
        lastSpawnMeteorTimeRef.current = timestamp;
        meteorsRef.current.push(createMeteor());
      }

      // Spawn Black Holes
      if (timestamp - lastSpawnBlackHoleTimeRef.current >= 5500 && blackHolesRef.current.length === 0) {
        lastSpawnBlackHoleTimeRef.current = timestamp;
        blackHolesRef.current.push(createBlackHole());
      }

      // Spawn Powerups
      if (timestamp - lastSpawnPowerupTimeRef.current >= 4500) {
        lastSpawnPowerupTimeRef.current = timestamp;
        const types: PowerupType[] = ['spread', 'shield', 'nuke', 'hyper'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        powerupsRef.current.push({
          x: Math.random() * (CANVAS_WIDTH - 40) + 20,
          y: -20,
          type: chosen,
          vy: 2.2,
          radius: 13,
          pulse: 0,
        });
      }

      // UPDATE BULLETS
      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.x += b.vx * timeScale;
        b.y += b.vy * timeScale;
        if (b.y < -20 || b.x < -20 || b.x > CANVAS_WIDTH + 20) {
          bulletsRef.current.splice(i, 1);
        }
      }

      // UPDATE POWERUPS
      for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
        const pow = powerupsRef.current[i];
        pow.y += pow.vy * timeScale;
        pow.pulse += 0.08 * timeScale;

        const dist = Math.hypot(p.x + p.width / 2 - pow.x, p.y + p.height / 2 - pow.y);
        if (dist < pow.radius + p.width / 2) {
          playSfxRef.current('powerup');
          if (pow.type === 'spread') {
            p.tripleShotTimer = 420;
            activePowerupRef.current = 'TRIPLE SPREAD LASER';
            addFloatingText(pow.x, pow.y, 'TRIPLE LASERS!', '#99E885');
          } else if (pow.type === 'shield') {
            p.hasShield = true;
            activePowerupRef.current = 'ENERGY SHIELD';
            addFloatingText(pow.x, pow.y, 'ENERGY SHIELD!', '#C0F7FE');
          } else if (pow.type === 'nuke') {
            triggerNuke();
          } else if (pow.type === 'hyper') {
            p.hyperTimer = 320;
            activePowerupRef.current = 'HYPERDRIVE RAPID-FIRE';
            addFloatingText(pow.x, pow.y, 'HYPERDRIVE!', '#F7CB46');
          }

          scoreRef.current += 200;
          powerupsRef.current.splice(i, 1);
          continue;
        }

        if (pow.y > CANVAS_HEIGHT + 30) powerupsRef.current.splice(i, 1);
      }

      // UPDATE BLACK HOLES
      for (let i = blackHolesRef.current.length - 1; i >= 0; i--) {
        const bh = blackHolesRef.current[i];
        bh.y += bh.vy * timeScale;
        bh.angle += 0.05 * timeScale;

        const dx = bh.x - (p.x + p.width / 2);
        const dy = bh.y - (p.y + p.height / 2);
        const dist = Math.hypot(dx, dy);

        // Singularity Absorption
        const eventHorizonRadius = bh.radius + p.width * 0.42;
        if (dist < eventHorizonRadius) {
          if (p.hasShield) {
            p.hasShield = false;
            playSfxRef.current('shield_hit');
            screenShakeRef.current = 16;
            bh.y += 45;
            addFloatingText(p.x, p.y - 20, 'SHIELD CRUSHED BY SINGULARITY!', '#FE90E8');
            for (let k = 0; k < 15; k++) {
              particlesRef.current.push({
                x: p.x + p.width / 2,
                y: p.y + p.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                alpha: 1,
                color: '#FE90E8',
                size: 3,
                life: 0,
                maxLife: 16,
              });
            }
          } else {
            handlePlayerDeath();
            cancelAnimationFrame(animId);
            return;
          }
        }

        if (bh.y > CANVAS_HEIGHT + 80) blackHolesRef.current.splice(i, 1);
      }

      // UPDATE METEORS
      for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const m = meteorsRef.current[i];
        m.y += m.vy * timeScale;
        m.x += m.vx * timeScale;
        m.rotation += m.rotSpeed * timeScale;

        if (m.x <= m.radius || m.x >= CANVAS_WIDTH - m.radius) m.vx *= -1;

        // Laser Deflection
        for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
          const b = bulletsRef.current[j];
          const dist = Math.hypot(b.x - m.x, b.y - m.y);
          if (dist < m.radius) {
            bulletsRef.current.splice(j, 1);
            playSfxRef.current('deflect');

            if (particlesRef.current.length < 35) {
              for (let k = 0; k < 2; k++) {
                particlesRef.current.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  alpha: 1,
                  color: '#F7CB46',
                  size: 2.5,
                  life: 0,
                  maxLife: 8,
                });
              }
            }
          }
        }

        // Collision with ship
        const playerDist = Math.hypot(p.x + p.width / 2 - m.x, p.y + p.height / 2 - m.y);
        if (playerDist < m.radius + p.width / 2 - 4) {
          if (p.hasShield) {
            p.hasShield = false;
            playSfxRef.current('shield_hit');
            screenShakeRef.current = 10;
            m.vy = -m.vy * 0.5;
            addFloatingText(p.x, p.y, 'SHIELD BROKEN!', '#C0F7FE');
          } else {
            handlePlayerDeath();
            cancelAnimationFrame(animId);
            return;
          }
        }

        if (m.y > CANVAS_HEIGHT + 60) meteorsRef.current.splice(i, 1);
      }

      // UPDATE ENEMIES
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        enemy.y += enemy.vy * timeScale;
        enemy.x += enemy.vx * timeScale;

        if (enemy.x <= 0 || enemy.x >= CANVAS_WIDTH - enemy.width) enemy.vx *= -1;

        // Check Bullet Collisions
        for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
          const b = bulletsRef.current[j];
          if (
            b.x >= enemy.x &&
            b.x <= enemy.x + enemy.width &&
            b.y >= enemy.y &&
            b.y <= enemy.y + enemy.height
          ) {
            bulletsRef.current.splice(j, 1);
            enemy.hp--;

            if (enemy.hp <= 0) {
              playSfxRef.current('boom');
              const pointsEarned = enemy.type === 'heavy' ? 300 : enemy.type === 'scout' ? 200 : 100;
              scoreRef.current += pointsEarned;
              addFloatingText(enemy.x, enemy.y, `+${pointsEarned}`, '#000000');

              if (particlesRef.current.length < 35) {
                for (let k = 0; k < 6; k++) {
                  particlesRef.current.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    alpha: 1,
                    color: enemy.color,
                    size: 3,
                    life: 0,
                    maxLife: 14,
                  });
                }
              }

              enemiesRef.current.splice(i, 1);
              break;
            }
          }
        }

        // Collision with Ship
        if (
          enemy &&
          p.x + 4 < enemy.x + enemy.width &&
          p.x + p.width - 4 > enemy.x &&
          p.y + 4 < enemy.y + enemy.height &&
          p.y + p.height - 4 > enemy.y
        ) {
          if (p.hasShield) {
            p.hasShield = false;
            playSfxRef.current('shield_hit');
            screenShakeRef.current = 10;
            enemiesRef.current.splice(i, 1);
            addFloatingText(p.x, p.y, 'SHIELD BROKEN!', '#C0F7FE');
          } else {
            handlePlayerDeath();
            cancelAnimationFrame(animId);
            return;
          }
        }

        if (enemy && enemy.y > CANVAS_HEIGHT + 30) enemiesRef.current.splice(i, 1);
      }

      function handlePlayerDeath() {
        setIsDead(true);
        setIsPlaying(false);
        playSfxRef.current('boom');
        screenShakeRef.current = 18;

        for (let k = 0; k < 20; k++) {
          particlesRef.current.push({
            x: p.x + p.width / 2,
            y: p.y + p.height / 2,
            vx: (Math.random() - 0.5) * 7,
            vy: (Math.random() - 0.5) * 7,
            alpha: 1,
            color: '#F7CB46',
            size: 3.5,
            life: 0,
            maxLife: 20,
          });
        }

        const finalScore = scoreRef.current;
        setDisplayScore(finalScore);
        if (finalScore > 3000) confetti({ particleCount: 50, spread: 60 });
        setTimeout(() => onGameOverRef.current(finalScore), 0);
      }

      // ==========================================
      // NEO-BRUTALIST CANVAS 2D RENDERER
      // ==========================================

      ctx.save();

      if (screenShakeRef.current > 0) {
        ctx.translate(
          (Math.random() - 0.5) * screenShakeRef.current,
          (Math.random() - 0.5) * screenShakeRef.current
        );
        screenShakeRef.current *= 0.85;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // 1. Warm Ground Clear
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Dot Matrix Texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let x = 12; x < CANVAS_WIDTH; x += 24) {
        for (let y = 12; y < CANVAS_HEIGHT; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Floating Geometric Retro Stars
      const stars = starsRef.current;
      for (let s = 0; s < stars.length; s++) {
        const star = stars[s];
        star.y += star.speed * timeScale;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }

        ctx.fillStyle = star.color;
        if (star.shape === 'square') {
          ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(star.x | 0, star.y | 0, star.size, star.size);
        } else if (star.shape === 'cross') {
          const cx = star.x | 0;
          const cy = star.y | 0;
          ctx.fillRect(cx - 2, cy, 5, 1.5);
          ctx.fillRect(cx, cy - 2, 1.5, 5);
        } else {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Black Holes (Singularity with Hard Rings & Concentric Dashed Perimeter)
      blackHolesRef.current.forEach((bh) => {
        // Outer dashed attraction ring
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.pullRadius * 0.75, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#FE90E8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.pullRadius * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Swirling Accretion Disk Ring
        ctx.save();
        ctx.translate(bh.x, bh.y);
        ctx.rotate(bh.angle);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, bh.radius + 6, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.rotate(-bh.angle * 2.2);
        ctx.strokeStyle = '#FE90E8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, bh.radius + 10, 0, Math.PI * 1.2);
        ctx.stroke();
        ctx.restore();

        // Singularity Core (Solid Black + Pink Outline)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FE90E8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Center crosshair
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bh.x - 3, bh.y - 1, 6, 2);
        ctx.fillRect(bh.x - 1, bh.y - 3, 2, 6);
      });

      // 5. Meteors (Neo Butter Polygon + Hard Black Drop Shadow + 2.5px Border)
      meteorsRef.current.forEach((m) => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rotation);

        // Hard Drop Shadow
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        m.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x + 3, pt.y + 3);
          else ctx.lineTo(pt.x + 3, pt.y + 3);
        });
        ctx.closePath();
        ctx.fill();

        // Meteor Body
        ctx.fillStyle = '#FFDC8B';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        m.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crater Hatching Details
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-m.radius * 0.3, -m.radius * 0.2, 3, 0, Math.PI * 2);
        ctx.arc(m.radius * 0.25, m.radius * 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 6. Powerups (Tactile Neo Swatch Tokens)
      powerupsRef.current.forEach((pow) => {
        const pulseSize = pow.radius + Math.sin(pow.pulse) * 1.5;
        const color =
          pow.type === 'spread'
            ? '#99E885'
            : pow.type === 'shield'
            ? '#C0F7FE'
            : pow.type === 'nuke'
            ? '#FE90E8'
            : '#F7CB46';

        // Hard Drop Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(pow.x - pulseSize + 2.5, pow.y - pulseSize + 2.5, pulseSize * 2, pulseSize * 2);

        // Token Body
        ctx.fillStyle = color;
        ctx.fillRect(pow.x - pulseSize, pow.y - pulseSize, pulseSize * 2, pulseSize * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(pow.x - pulseSize, pow.y - pulseSize, pulseSize * 2, pulseSize * 2);

        // Label
        ctx.fillStyle = '#000000';
        ctx.font = '900 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label =
          pow.type === 'spread'
            ? '3X'
            : pow.type === 'shield'
            ? 'SH'
            : pow.type === 'nuke'
            ? 'EMP'
            : '⚡';
        ctx.fillText(label, pow.x, pow.y);
      });

      // 7. Bullets (Hard Laser Rectangles)
      bulletsRef.current.forEach((b) => {
        // Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect((b.x | 0) + 1.5, (b.y | 0) + 1.5, 4, 12);

        // Bolt
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x | 0, b.y | 0, 4, 12);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x | 0, b.y | 0, 4, 12);
      });

      // 8. Enemies (Neo-Brutalist Craft with Hard Drop Shadows & Black Outlines)
      enemiesRef.current.forEach((enemy) => {
        // Hard Drop Shadow
        ctx.fillStyle = '#000000';
        if (enemy.type === 'heavy') {
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2 + 3, enemy.y + enemy.height + 3);
          ctx.lineTo(enemy.x + 3, enemy.y + 3);
          ctx.lineTo(enemy.x + 6 + 3, enemy.y + 3 + 3);
          ctx.lineTo(enemy.x + enemy.width / 2 + 3, enemy.y + 10 + 3);
          ctx.lineTo(enemy.x + enemy.width - 6 + 3, enemy.y + 3 + 3);
          ctx.lineTo(enemy.x + enemy.width + 3, enemy.y + 3);
          ctx.closePath();
          ctx.fill();

          // Body
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
          ctx.lineTo(enemy.x, enemy.y);
          ctx.lineTo(enemy.x + 6, enemy.y + 3);
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + 10);
          ctx.lineTo(enemy.x + enemy.width - 6, enemy.y + 3);
          ctx.lineTo(enemy.x + enemy.width, enemy.y);
          ctx.closePath();
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#000000';
          ctx.stroke();

          // Health Bar
          if (enemy.hp < enemy.maxHp) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(enemy.x, enemy.y - 7, enemy.width, 3.5);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(enemy.x, enemy.y - 7, enemy.width, 3.5);
            ctx.fillStyle = '#99E885';
            ctx.fillRect(enemy.x, enemy.y - 7, (enemy.hp / enemy.maxHp) * enemy.width, 3.5);
          }
        } else {
          // Scout & Drone
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2 + 2.5, enemy.y + enemy.height + 2.5);
          ctx.lineTo(enemy.x + 2.5, enemy.y + 2.5);
          ctx.lineTo(enemy.x + enemy.width + 2.5, enemy.y + 2.5);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
          ctx.lineTo(enemy.x, enemy.y);
          ctx.lineTo(enemy.x + enemy.width, enemy.y);
          ctx.closePath();
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#000000';
          ctx.stroke();

          // Small cockpit window
          ctx.fillStyle = '#000000';
          ctx.fillRect(enemy.x + enemy.width / 2 - 2, enemy.y + 4, 4, 4);
        }
      });

      // 9. Player Starfighter (Golden Yellow with Hard Shadow, Cockpit & Solid Stroke)
      const shipColor = p.hyperTimer > 0 ? '#FE90E8' : p.tripleShotTimer > 0 ? '#99E885' : '#F7CB46';

      // Drop Shadow
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2 + 3.5, p.y + 3.5);
      ctx.lineTo(p.x + 3.5, p.y + p.height + 3.5);
      ctx.lineTo(p.x + p.width / 2 + 3.5, p.y + p.height - 8 + 3.5);
      ctx.lineTo(p.x + p.width + 3.5, p.y + p.height + 3.5);
      ctx.closePath();
      ctx.fill();

      // Ship Body
      ctx.fillStyle = shipColor;
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2, p.y);
      ctx.lineTo(p.x, p.y + p.height);
      ctx.lineTo(p.x + p.width / 2, p.y + p.height - 8);
      ctx.lineTo(p.x + p.width, p.y + p.height);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Cockpit Canopy (White with Black Border)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2 - 2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Wing flaps
      ctx.fillStyle = '#FE90E8';
      ctx.fillRect(p.x + 2, p.y + p.height - 6, 4, 3);
      ctx.fillRect(p.x + p.width - 6, p.y + p.height - 6, 4, 3);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x + 2, p.y + p.height - 6, 4, 3);
      ctx.strokeRect(p.x + p.width - 6, p.y + p.height - 6, 4, 3);

      // Energy Shield (Tactile Ring)
      if (p.hasShield) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.85, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#C0F7FE';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.85, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 10. Render Particles (Retro Square Sparks)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const part = particlesRef.current[i];
        part.x += part.vx * timeScale;
        part.y += part.vy * timeScale;
        part.life += timeScale;
        part.alpha = 1 - part.life / part.maxLife;

        if (part.life >= part.maxLife) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.fillStyle = part.color;
          ctx.globalAlpha = Math.max(0, part.alpha);
          ctx.fillRect(part.x | 0, part.y | 0, part.size, part.size);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(part.x | 0, part.y | 0, part.size, part.size);
        }
      }
      ctx.globalAlpha = 1;

      // 11. Floating Combat Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * timeScale;
        ft.alpha -= 0.025 * timeScale;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = '900 12px sans-serif';
          ctx.textAlign = 'center';

          // Text shadow
          ctx.fillStyle = '#000000';
          ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);

          // Front text
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, ft.x, ft.y);
        }
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        <div className="flex items-center gap-1.5 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Rocket className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] uppercase tracking-wider">Score</span>
          <span className="text-xs font-black">{displayScore}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-portal-pink px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <span className="text-[10px] uppercase tracking-wider">Wave</span>
          <span className="text-xs font-black">{wave}</span>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
          title="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />}
        </button>
      </div>

      {/* Active Powerup Banner */}
      {activePowerup && (
        <div className="w-full mb-2 px-2.5 py-1 rounded-lg bg-portal-cyan border-2 border-black shadow-neo-xs flex items-center justify-center gap-1.5 text-[10px] font-black text-black uppercase animate-bounce">
          <Zap className="w-3.5 h-3.5 stroke-[2.5] text-black" />
          <span>POWERUP ACTIVE: {activePowerup}</span>
        </div>
      )}

      {/* Screen Canvas (9:16 Standard Aspect Ratio Frame) with Figma Handles */}
      <div className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl border-4 border-black p-0 overflow-hidden shadow-neo-lg flex items-center justify-center touch-none cursor-crosshair">
        {/* Figma Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full object-contain block select-none"
        />

        {/* Start / Game Over Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            {isDead ? (
              /* Death / Game Over Modal */
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[300px] space-y-3.5 text-center text-black animate-scaleIn">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="inline-block px-3 py-1 rounded-md bg-portal-pink border-2 border-black text-black text-[11px] font-black uppercase tracking-wider shadow-neo-xs">
                  ⚡ SHIP DESTROYED ⚡
                </div>

                <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Mission Score</div>
                  <div className="text-3xl font-black text-black tracking-tight">{displayScore}</div>
                  <div className="text-[10px] font-black text-slate-800">SURVIVED TO WAVE {wave}</div>
                </div>

                {/* Ad Notice */}
                {adNotice && (
                  <div className="p-2.5 rounded-xl bg-portal-butter border-2 border-black text-black text-[11px] font-bold shadow-neo-xs">
                    <div className="flex items-center justify-center gap-1 mb-0.5 text-black font-black">
                      <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="text-[10px] uppercase">TRANSMISSION NOTICE</span>
                    </div>
                    <p className="text-[10px] leading-snug">{adNotice}</p>
                  </div>
                )}

                {/* Watch Ad to Revive Action */}
                <button
                  type="button"
                  onClick={handleWatchAdForRevive}
                  disabled={hasRevived}
                  className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider border-3 border-black transition-all ${
                    hasRevived
                      ? 'bg-slate-200 text-slate-500 border-dashed cursor-not-allowed shadow-none'
                      : 'bg-portal-butter hover:bg-portal-yellow text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none'
                  }`}
                  title={hasRevived ? 'Revive already used for this run' : 'Emergency ship revive'}
                >
                  <Tv className={`w-4 h-4 stroke-[2.5] ${hasRevived ? 'text-slate-500' : 'text-black animate-pulse'}`} />
                  <span>{hasRevived ? 'REVIVE USED (1/RUN)' : 'WATCH AD TO REVIVE'}</span>
                </button>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3]" />
                  <span>RESTART MISSION</span>
                </button>
              </div>
            ) : (
              /* Pre-Game Neo-Brutalist Card */
              <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[300px] space-y-3.5 text-center text-black animate-scaleIn">
                {/* Figma Handles */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

                <div className="w-14 h-14 rounded-2xl bg-portal-yellow border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
                  <Rocket className="w-7 h-7 stroke-[2.5]" />
                </div>

                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                    • [ RETRO STARFIGHTER ] •
                  </div>
                  <h3 className="text-xl font-black text-black tracking-tight uppercase">
                    Neon Starfighter
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">
                    Touch & Drag or A/D Keys to Steer
                  </p>
                </div>

                {/* Tactical Intel */}
                <div className="bg-[#FAF8F5] p-3 rounded-xl border-2 border-black text-[10px] text-slate-800 space-y-1.5 text-left font-bold shadow-neo-xs">
                  <div className="flex items-center gap-1.5 text-black">
                    <AlertTriangle className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
                    <span>Meteors: Indestructible! Deflects lasers.</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-black">
                    <Sparkles className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
                    <span>Black Holes: Gravitational pull vortex!</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-black">
                    <Shield className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
                    <span>Powerups: 3X Spread, Shields, EMP Nukes.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                  <span>LAUNCH MISSION</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Tips Strip */}
      <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider mt-2.5 text-center">
        Controls: Touch & Drag across screen • A/D or Left/Right Keys
      </p>
    </div>
  );
}
