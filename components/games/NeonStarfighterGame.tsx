'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Rocket, Zap, Shield, Sparkles, AlertTriangle, Tv, AlertCircle } from 'lucide-react';
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

  // Pre-allocated Starfield
  const starsRef = useRef<Star[]>(
    Array.from({ length: 50 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() > 0.75 ? 2 : 1,
      speed: Math.random() * 2.5 + 1.0,
      color: Math.random() > 0.7 ? '#00F0FF' : Math.random() > 0.4 ? '#FF00EA' : Math.random() > 0.2 ? '#FFE600' : '#FFFFFF',
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

  // High-Performance Singleton Web Audio Oscillator Engine (Zero Leak, Zero Lag on PC)
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
      for (let k = 0; k < 5; k++) {
        if (particlesRef.current.length < 35) {
          particlesRef.current.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            alpha: 1,
            color: enemy.color,
            size: 2.5,
            life: 0,
            maxLife: 18,
          });
        }
      }
    });
    enemiesRef.current = [];
    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'EMP SCREEN CLEAR!', '#FF00EA');
  };

  const revivePlayer = () => {
    hasRevivedRef.current = true;
    setHasRevived(true);
    setAdNotice(null);

    // 1. Reset ship coordinates safely to base position
    playerRef.current = {
      ...playerRef.current,
      x: CANVAS_WIDTH / 2 - 16,
      y: PLAYER_BASE_Y,
      hasShield: true, // Emergency shield granted upon respawn
      tripleShotTimer: Math.max(playerRef.current.tripleShotTimer, 180), // 3s temporary rapid boost
    };

    // 2. Clear immediate threats & hazards near bottom/spawn area
    enemiesRef.current = enemiesRef.current.filter((e) => e.y < CANVAS_HEIGHT * 0.4);
    meteorsRef.current = meteorsRef.current.filter((m) => m.y < CANVAS_HEIGHT * 0.35);
    blackHolesRef.current = [];

    // 3. Spawn EMP shockwave & visual particles for revival blast
    screenShakeRef.current = 16;
    for (let k = 0; k < 25; k++) {
      particlesRef.current.push({
        x: CANVAS_WIDTH / 2,
        y: PLAYER_BASE_Y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        alpha: 1,
        color: '#00F0FF',
        size: 3,
        life: 0,
        maxLife: 24,
      });
    }

    addFloatingText(CANVAS_WIDTH / 2, PLAYER_BASE_Y - 40, '⚡ SHIP REVIVED! +1 LIFE ⚡', '#00F0FF');
    playSfx('powerup');

    // 4. Reset timestamp clock so delta-time doesn't jump forward
    lastTimeRef.current = performance.now();
    lastShotTimeRef.current = performance.now();
    pointerRef.current = {
      active: false,
      lastX: 0,
      pendingDeltaX: 0,
    };

    // 5. Resume combat game loop
    setIsDead(false);
    setIsPlaying(true);
  };

  const handleWatchAdForRevive = () => {
    if (hasRevivedRef.current) {
      setAdNotice('Revive has already been used for this mission flight (Limit: 1 per run).');
      if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
      adTimeoutRef.current = setTimeout(() => setAdNotice(null), 4000);
      return;
    }

    playSfx('laser');
    setAdNotice('No ads are available to watch right now. Please try again later!');
    if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
    adTimeoutRef.current = setTimeout(() => {
      setAdNotice(null);
    }, 4000);
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

  // Relative Delta Pointer Handling (No Teleportation, Touch & Drag anywhere)
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

  // Idle Background Loop (Exact in-game cosmos starfield)
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

      // In-Game Background Clear
      ctx.fillStyle = '#080417';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Subtle Background Grid Lines
      ctx.save();
      ctx.strokeStyle = '#180e2e';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.restore();

      // Cosmic Atmosphere (Neo Pink on Death, Neo Cyan on Launch)
      const radGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45, 10,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45, CANVAS_WIDTH * 0.75
      );
      if (isDead) {
        radGrad.addColorStop(0, 'rgba(254, 144, 232, 0.22)');
        radGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.08)');
        radGrad.addColorStop(1, 'rgba(8, 4, 23, 0)');
      } else {
        radGrad.addColorStop(0, 'rgba(0, 240, 255, 0.16)');
        radGrad.addColorStop(0.5, 'rgba(254, 144, 232, 0.08)');
        radGrad.addColorStop(1, 'rgba(8, 4, 23, 0)');
      }
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // In-Game Moving Starfield
      const stars = starsRef.current;
      for (let s = 0; s < stars.length; s++) {
        const star = stars[s];
        star.y += star.speed * timeScale;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
        ctx.fillStyle = star.color;
        ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size * 1.5);
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

      // Sync Wave and Score with React HUD periodically (every 120ms max) without resetting game loop
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

      // Player Movement: Horizontal Only (A/D, Left/Right Arrows, or Touch/Mouse Drag)
      p.y = PLAYER_BASE_Y; // Lock vertical position strictly

      // Calculate gravitational pull from all active black holes
      let totalGravityX = 0;
      let strongestPullRatio = 0;
      let nearestBhX = p.x + p.width / 2;

      blackHolesRef.current.forEach((bh) => {
        const dx = bh.x - (p.x + p.width / 2);
        const dy = bh.y - (p.y + p.height / 2);
        const dist = Math.hypot(dx, dy);

        if (dist < bh.pullRadius && dist > 1) {
          const pullRatio = (bh.pullRadius - dist) / bh.pullRadius; // 0 to 1
          if (pullRatio > strongestPullRatio) {
            strongestPullRatio = pullRatio;
            nearestBhX = bh.x;
          }
          // Non-linear gravitational suction (stronger acceleration near singularity)
          const force = Math.pow(pullRatio, 1.25) * 11.5 * timeScale;
          totalGravityX += (dx / dist) * force;

          // Spawn gravitational accretion sparks toward black hole
          if (Math.random() < 0.35 && particlesRef.current.length < 45) {
            particlesRef.current.push({
              x: p.x + p.width / 2 + (Math.random() - 0.5) * 12,
              y: p.y + p.height / 2 + (Math.random() - 0.5) * 12,
              vx: (dx / dist) * 4.5 + (Math.random() - 0.5) * 2,
              vy: (dy / dist) * 4.5 + (Math.random() - 0.5) * 2,
              alpha: 0.85,
              color: Math.random() > 0.5 ? '#9D00FF' : '#FF00EA',
              size: 2,
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

        // Reduce steering traction when being pulled by strong gravity
        const controlTraction = Math.max(0.08, 1 - Math.pow(strongestPullRatio, 1.1) * 0.92);
        p.x += deltaX * controlTraction;
      }

      // Apply gravitational force directly to ship
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
            { x: p.x + p.width / 2 - 2, y: p.y - 4, vx: 0, vy: -14, color: '#00F0FF' },
            { x: p.x + p.width / 2 - 2, y: p.y - 4, vx: -3, vy: -13.5, color: '#39FF14' },
            { x: p.x + p.width / 2 - 2, y: p.y - 4, vx: 3, vy: -13.5, color: '#39FF14' }
          );
          playSfxRef.current('spread');
        } else {
          bulletsRef.current.push(
            { x: p.x + 5, y: p.y - 2, vx: 0, vy: -14, color: p.hyperTimer > 0 ? '#FFE600' : '#00F0FF' },
            { x: p.x + p.width - 9, y: p.y - 2, vx: 0, vy: -14, color: p.hyperTimer > 0 ? '#FFE600' : '#00F0FF' }
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
          alpha: 0.8,
          color: p.hyperTimer > 0 ? '#FFE600' : p.tripleShotTimer > 0 ? '#39FF14' : '#00F0FF',
          size: 2,
          life: 0,
          maxLife: 10,
        });
      }

      // SPAWN SYSTEM (Time-Based)
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
            color: '#FF0055',
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
            color: '#FF00EA',
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
            color: '#9D00FF',
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
            addFloatingText(pow.x, pow.y, 'TRIPLE LASERS!', '#39FF14');
          } else if (pow.type === 'shield') {
            p.hasShield = true;
            activePowerupRef.current = 'ENERGY SHIELD';
            addFloatingText(pow.x, pow.y, 'ENERGY SHIELD!', '#00F0FF');
          } else if (pow.type === 'nuke') {
            triggerNuke();
          } else if (pow.type === 'hyper') {
            p.hyperTimer = 320;
            activePowerupRef.current = 'HYPERDRIVE RAPID-FIRE';
            addFloatingText(pow.x, pow.y, 'HYPERDRIVE!', '#FFE600');
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

        // Singularity Event Horizon Absorption
        const eventHorizonRadius = bh.radius + p.width * 0.42;
        if (dist < eventHorizonRadius) {
          if (p.hasShield) {
            p.hasShield = false;
            playSfxRef.current('shield_hit');
            screenShakeRef.current = 16;
            bh.y += 45;
            addFloatingText(p.x, p.y - 20, 'SHIELD CRUSHED BY SINGULARITY!', '#FF00EA');
            for (let k = 0; k < 15; k++) {
              particlesRef.current.push({
                x: p.x + p.width / 2,
                y: p.y + p.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                alpha: 1,
                color: '#FF00EA',
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
                  color: '#FFE600',
                  size: 2,
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
            addFloatingText(p.x, p.y, 'SHIELD BROKEN!', '#00F0FF');
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
              addFloatingText(enemy.x, enemy.y, `+${pointsEarned}`, enemy.color);

              if (particlesRef.current.length < 35) {
                for (let k = 0; k < 6; k++) {
                  particlesRef.current.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    alpha: 1,
                    color: enemy.color,
                    size: 2.2,
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
            addFloatingText(p.x, p.y, 'SHIELD BROKEN!', '#00F0FF');
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
            color: '#00F0FF',
            size: 2.8,
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
      // NEO-BRUTALISM CANVAS 2D RENDER ENGINE
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

      // Background Clear (Deep Indigo Ground)
      ctx.fillStyle = '#080417';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Subtle Background Matrix / Grid Lines
      ctx.save();
      ctx.strokeStyle = '#180e2e';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.restore();

      // Starfield (Direct Pixel Drawing with Pop Colors)
      const stars = starsRef.current;
      for (let s = 0; s < stars.length; s++) {
        const star = stars[s];
        star.y += star.speed * timeScale;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
        ctx.fillStyle = star.color;
        ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size * 1.5);
      }

      // 1. Black Holes (Neo-Brutalist Cosmic Singularity)
      blackHolesRef.current.forEach((bh) => {
        // Gravitational Warning Hazard Ring (Dashed Neo Pink)
        ctx.save();
        ctx.strokeStyle = 'rgba(254, 144, 232, 0.25)';
        ctx.lineWidth = 5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, (bh.pullRadius * 0.75) | 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Dual Swirling Accretion Disk Rings with Solid Neo Borders
        ctx.save();
        ctx.translate(bh.x, bh.y);
        ctx.rotate(bh.angle);
        ctx.strokeStyle = '#FE90E8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, bh.radius + 6, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.rotate(-bh.angle * 2.5);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, bh.radius + 11, 0, Math.PI * 1.2);
        ctx.stroke();
        ctx.restore();

        // Event Horizon (Singularity Core with Solid Neo-Brutalist Border)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FE90E8';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      });

      // 2. Meteors (Faceted Neo-Brutalist Space Asteroids with Hard Shadows & Black Outlines)
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

        // Asteroid Body (Deep Purple Asteroid)
        ctx.fillStyle = '#381E54';
        ctx.beginPath();
        m.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();

        // Solid Black 2.5px Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Comic Crater Details
        ctx.fillStyle = '#220F38';
        ctx.beginPath();
        ctx.arc(m.radius * 0.2, m.radius * 0.2, m.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // White Highlight Spot
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-m.radius * 0.35, -m.radius * 0.35, m.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 3. Powerups (Neo-Brutalist Tactile Swatch Boxes with Figma Node Accents)
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

        const size = pulseSize * 1.7;
        const x = pow.x - size / 2;
        const y = pow.y - size / 2;

        ctx.save();
        // 1. Hard Offset Drop Shadow (Neo-Brutalism)
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 3, y + 3, size, size);

        // 2. Main Swatch Box Fill
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);

        // 3. Solid Black Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, size, size);

        // 4. White Corner Accent Node
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 1, y - 1, 3, 3);

        // 5. Crisp Text Label
        ctx.fillStyle = '#000000';
        ctx.font = '900 10px system-ui, -apple-system, sans-serif';
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
        ctx.fillText(label, pow.x, pow.y + 0.5);
        ctx.restore();
      });

      // 4. Bullets (High-Impact Chunky Cartoon Plasma Lasers)
      bulletsRef.current.forEach((b) => {
        ctx.save();
        // Hard Offset Drop Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(b.x + 1.5, b.y + 1.5, 4, 14);

        // Laser Fill
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, 4, 14);

        // Laser Black Outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, 4, 14);

        // White Core Energy Line
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(b.x + 1, b.y + 2, 2, 8);
        ctx.restore();
      });

      // 5. Enemies (Arcade Neo-Brutalist Invaders with Solid Outlines, Eyes & Health Bars)
      enemiesRef.current.forEach((enemy) => {
        ctx.save();

        if (enemy.type === 'heavy') {
          // Hard Drop Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2 + 3, enemy.y + enemy.height + 3);
          ctx.lineTo(enemy.x + 3, enemy.y + 3);
          ctx.lineTo(enemy.x + 9, enemy.y + 6);
          ctx.lineTo(enemy.x + enemy.width / 2 + 3, enemy.y + 13);
          ctx.lineTo(enemy.x + enemy.width - 3, enemy.y + 6);
          ctx.lineTo(enemy.x + enemy.width + 3, enemy.y + 3);
          ctx.closePath();
          ctx.fill();

          // Main Heavy Hull Fill
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

          // Solid Black 2.5px Stroke
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Dual Angry Eyes
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(enemy.x + 8, enemy.y + 12, 6, 6);
          ctx.fillRect(enemy.x + enemy.width - 14, enemy.y + 12, 6, 6);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(enemy.x + 8, enemy.y + 12, 6, 6);
          ctx.strokeRect(enemy.x + enemy.width - 14, enemy.y + 12, 6, 6);
          // Pupils
          ctx.fillStyle = '#000000';
          ctx.fillRect(enemy.x + 10, enemy.y + 14, 3, 3);
          ctx.fillRect(enemy.x + enemy.width - 12, enemy.y + 14, 3, 3);

          // Neo-Brutalist HP Segmented Bar
          if (enemy.hp < enemy.maxHp) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(enemy.x + 2, enemy.y - 7, enemy.width, 5);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(enemy.x, enemy.y - 9, enemy.width, 5);
            ctx.fillStyle = '#99E885';
            ctx.fillRect(enemy.x, enemy.y - 9, (enemy.hp / enemy.maxHp) * enemy.width, 5);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(enemy.x, enemy.y - 9, enemy.width, 5);
          }
        } else if (enemy.type === 'scout') {
          // Hard Drop Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2 + 2, enemy.y + enemy.height + 2);
          ctx.lineTo(enemy.x + 2, enemy.y + 2);
          ctx.lineTo(enemy.x + enemy.width / 2 + 2, enemy.y + 6);
          ctx.lineTo(enemy.x + enemy.width + 2, enemy.y + 2);
          ctx.closePath();
          ctx.fill();

          // Main Hull
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
          ctx.lineTo(enemy.x, enemy.y);
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + 4);
          ctx.lineTo(enemy.x + enemy.width, enemy.y);
          ctx.closePath();
          ctx.fill();

          // Solid Black Border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Cute Eyes
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(enemy.x + 5, enemy.y + 6, 5, 5);
          ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + 6, 5, 5);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(enemy.x + 5, enemy.y + 6, 5, 5);
          ctx.strokeRect(enemy.x + enemy.width - 10, enemy.y + 6, 5, 5);
          ctx.fillStyle = '#000000';
          ctx.fillRect(enemy.x + 7, enemy.y + 8, 2, 2);
          ctx.fillRect(enemy.x + enemy.width - 8, enemy.y + 8, 2, 2);
        } else {
          // Drone Invader: Diamond Saucer
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2 + 2, enemy.y + enemy.height + 2);
          ctx.lineTo(enemy.x + 2, enemy.y + enemy.height / 2 + 2);
          ctx.lineTo(enemy.x + enemy.width / 2 + 2, enemy.y + 2);
          ctx.lineTo(enemy.x + enemy.width + 2, enemy.y + enemy.height / 2 + 2);
          ctx.closePath();
          ctx.fill();

          // Body
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
          ctx.lineTo(enemy.x, enemy.y + enemy.height / 2);
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
          ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height / 2);
          ctx.closePath();
          ctx.fill();

          // Solid Black Border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Single Cyclops Eye
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 0.5, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 6. Player Starfighter (Tactile Neo-Brutalist Interceptor with Figma Corner Accents & Bold Outlines)
      const shipColor = p.hyperTimer > 0 ? '#F7CB46' : p.tripleShotTimer > 0 ? '#99E885' : '#00F0FF';
      ctx.save();

      // Exhaust Cartoon Flame Blocks
      ctx.fillStyle = '#000000';
      ctx.fillRect(p.x + p.width / 2 - 4 + 1.5, p.y + p.height - 2 + 1.5, 8, 8);
      ctx.fillStyle = '#FE90E8';
      ctx.fillRect(p.x + p.width / 2 - 4, p.y + p.height - 2, 8, 8);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x + p.width / 2 - 4, p.y + p.height - 2, 8, 8);

      ctx.fillStyle = '#FFE600';
      ctx.fillRect(p.x + p.width / 2 - 2, p.y + p.height, 4, 4);

      // Starfighter Hard Drop Shadow
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2 + 3, p.y + 3);
      ctx.lineTo(p.x + 3, p.y + p.height + 3);
      ctx.lineTo(p.x + p.width / 2 + 3, p.y + p.height - 8 + 3);
      ctx.lineTo(p.x + p.width + 3, p.y + p.height + 3);
      ctx.closePath();
      ctx.fill();

      // Main Hull Fill
      ctx.fillStyle = shipColor;
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2, p.y);
      ctx.lineTo(p.x, p.y + p.height);
      ctx.lineTo(p.x + p.width / 2, p.y + p.height - 8);
      ctx.lineTo(p.x + p.width, p.y + p.height);
      ctx.closePath();
      ctx.fill();

      // Solid 3px Black Hull Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Wing Racing Stripes (Neo Pink)
      ctx.fillStyle = '#FE90E8';
      ctx.beginPath();
      ctx.moveTo(p.x + 6, p.y + p.height - 4);
      ctx.lineTo(p.x + 12, p.y + p.height - 10);
      ctx.lineTo(p.x + 15, p.y + p.height - 7);
      ctx.lineTo(p.x + 9, p.y + p.height - 1);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(p.x + p.width - 6, p.y + p.height - 4);
      ctx.lineTo(p.x + p.width - 12, p.y + p.height - 10);
      ctx.lineTo(p.x + p.width - 15, p.y + p.height - 7);
      ctx.lineTo(p.x + p.width - 9, p.y + p.height - 1);
      ctx.closePath();
      ctx.fill();

      // Cockpit Canopy (White Domed Capsule with Solid Outline)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2 - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cockpit Pupil / Pilot HUD Dot
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2 - 2, 2, 0, Math.PI * 2);
      ctx.fill();

      // Energy Shield (Segmented Neo Bubble with Hard Shadow)
      if (p.hasShield) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2 + 2, p.y + p.height / 2 + 2, p.width * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Floating Energy Nodes on Shield
        const shieldNodes = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        shieldNodes.forEach((ang) => {
          const nx = p.x + p.width / 2 + Math.cos(ang + timestamp * 0.003) * (p.width * 0.82);
          const ny = p.y + p.height / 2 + Math.sin(ang + timestamp * 0.003) * (p.width * 0.82);
          ctx.fillStyle = '#FE90E8';
          ctx.fillRect(nx - 3, ny - 3, 6, 6);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(nx - 3, ny - 3, 6, 6);
        });
      }

      ctx.restore();

      // 7. Render Particles (Comic Confetti Shards with Black Outlines)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const part = particlesRef.current[i];
        part.x += part.vx * timeScale;
        part.y += part.vy * timeScale;
        part.life += timeScale;
        part.alpha = 1 - part.life / part.maxLife;

        if (part.life >= part.maxLife) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = Math.max(0, part.alpha);
          ctx.fillStyle = part.color;
          ctx.fillRect(part.x | 0, part.y | 0, part.size * 1.6, part.size * 1.6);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(part.x | 0, part.y | 0, part.size * 1.6, part.size * 1.6);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;

      // 8. Floating Texts (Comic Neo-Brutalist Badges with Solid Black Stroke)
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * timeScale;
        ft.alpha -= 0.025 * timeScale;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = '900 13px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';

          // Black Outline
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.lineJoin = 'miter';
          ctx.strokeText(ft.text, ft.x, ft.y);

          // Pop Fill
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;

      // 8. Floating Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * timeScale;
        ft.alpha -= 0.025 * timeScale;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.fillStyle = ft.color;
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
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
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center">
      {/* Top Combat HUD - Ultra Slim Neo Brutalism */}
      <div className="w-full max-w-[min(100%,calc(min(78vh,680px)*9/16))] flex items-center justify-between bg-portal-card px-3 py-1.5 rounded-xl border-2 border-black mb-1.5 shadow-neo shrink-0">
        <div className="flex items-center gap-2 bg-portal-surface px-2.5 py-0.5 rounded-lg border border-black shadow-neo-sm">
          <Rocket className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
          <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Score</span>
          <span className="text-sm font-black text-portal-yellow tracking-wide">{displayScore}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg bg-portal-purple text-white border border-black text-[10px] font-black uppercase tracking-wider shadow-neo-sm">
            Wave {wave}
          </span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-portal-surface hover:bg-portal-cyan text-white hover:text-black border border-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 transition-all"
            title={soundEnabled ? "Mute audio" : "Enable audio"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        </div>
      </div>

      {/* Active Powerup Banner */}
      {activePowerup && (
        <div className="w-full max-w-[min(100%,calc(min(78vh,680px)*9/16))] mb-1.5 px-3 py-1 rounded-xl bg-portal-yellow text-black border-2 border-black shadow-neo flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider animate-pulse shrink-0">
          <Zap className="w-3.5 h-3.5 fill-black stroke-[2.5]" />
          <span>POWERUP: {activePowerup}</span>
        </div>
      )}

      {/* Main Game Screen Canvas (9:16 Vertical Aspect Ratio with Viewport Height Scaling) */}
      <div className="relative rounded-2xl overflow-hidden border-3 border-black shadow-neo-lg bg-black touch-none cursor-crosshair w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] flex items-center justify-center shrink-0">
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
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 text-center transition-all ${
              isDead
                ? 'bg-black/75 backdrop-blur-[2px]'
                : 'bg-black/60 backdrop-blur-[2px]'
            }`}
          >
            {isDead ? (
              <div className="relative space-y-3.5 w-full max-w-[320px] bg-portal-card p-5 rounded-2xl border-3 border-black shadow-neo-lg animate-in fade-in zoom-in duration-200">
                {/* Figma Corner Nodes */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />

                <div className="w-14 h-14 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mx-auto text-white shadow-neo">
                  <AlertTriangle className="w-7 h-7 stroke-[2.5] animate-pulse" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-lg bg-portal-pink text-white border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-neo-sm inline-block">
                    Ship Destroyed
                  </span>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-1.5">Score: {displayScore}</h3>
                  <p className="text-xs font-bold text-portal-cyan uppercase tracking-wider mt-0.5">Reached Wave {wave}</p>
                </div>

                {/* Ad Transmission Status Alert */}
                {adNotice && (
                  <div className="p-2.5 rounded-xl bg-portal-surface border-2 border-black text-portal-yellow text-xs font-bold shadow-neo-sm">
                    <div className="flex items-center justify-center gap-1.5 mb-1 font-black">
                      <AlertCircle className="w-4 h-4 text-portal-yellow shrink-0 stroke-[2.5]" />
                      <span className="text-[11px] tracking-wide uppercase">AD NETWORK NOTICE</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{adNotice}</p>
                  </div>
                )}

                {/* Watch Ad to Revive Action */}
                <button
                  onClick={handleWatchAdForRevive}
                  disabled={hasRevived}
                  className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo transition-all ${
                    hasRevived
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-portal-yellow hover:bg-yellow-300 text-black hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none'
                  }`}
                  title={hasRevived ? 'Revive already used for this run' : 'Watch video transmission for emergency ship revive'}
                >
                  <Tv className="w-4 h-4 stroke-[2.5]" />
                  <span>{hasRevived ? 'REVIVE ALREADY USED (1/RUN)' : 'WATCH AD TO REVIVE'}</span>
                </button>

                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan hover:bg-cyan-300 text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" /> RESTART MISSION
                </button>
              </div>
            ) : (
              <div className="relative space-y-3.5 w-full max-w-[320px] bg-portal-card p-5 rounded-2xl border-3 border-black shadow-neo-lg animate-in fade-in zoom-in duration-200">
                {/* Figma Corner Nodes */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />

                <div className="w-14 h-14 rounded-2xl bg-portal-cyan border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
                  <Rocket className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Neon Starfighter</h3>
                  <p className="text-xs font-bold text-portal-yellow uppercase tracking-wider mt-0.5">
                    Touch & Drag or A/D Keys to Steer
                  </p>
                </div>

                {/* Tactical Intel Box */}
                <div className="bg-portal-surface p-3 rounded-xl border-2 border-black shadow-neo-sm text-[11px] text-slate-200 space-y-1.5 text-left font-bold">
                  <div className="flex items-center gap-2 text-portal-yellow">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    <span>Meteors: Indestructible! Deflects lasers.</span>
                  </div>
                  <div className="flex items-center gap-2 text-portal-purple">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    <span>Black Holes: Gravitational pull vortex!</span>
                  </div>
                  <div className="flex items-center gap-2 text-portal-cyan">
                    <Shield className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    <span>Powerups: 3X Spread, Shields, EMP Nukes.</span>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan hover:bg-cyan-300 text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" /> LAUNCH MISSION
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Tips Strip */}
      <div className="mt-2 text-center">
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide bg-portal-card px-3 py-1 rounded-lg border-2 border-black shadow-neo-sm inline-block">
          Controls: Touch & Drag across screen • A/D or Left/Right Keys
        </span>
      </div>
    </div>
  );
}
