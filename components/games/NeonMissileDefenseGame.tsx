'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Play,
  Radio,
  Flame,
  Maximize,
  Minimize,
  Crosshair,
  Target,
  AlertTriangle,
  Zap,
  Shield,
  Clock,
  Sparkles,
  Keyboard,
  Bomb
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NeonMissileDefenseGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

// Tactical Virtual Resolution Constants (Aspect Ratio 3:2)
const VIRTUAL_WIDTH = 900;
const VIRTUAL_HEIGHT = 600;
const VIRTUAL_GROUND_Y = 555; // Ground baseline height in virtual space

// Tactical Game Configuration & Threat Profiles
interface Battery {
  id: number;
  x: number;
  y: number;
  maxAmmo: number;
  ammo: number;
  alive: boolean;
  name: string;
}

interface City {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  name: string;
}

type ThreatType = 'standard' | 'mirv' | 'hypersonic' | 'cruise' | 'bomber_drop';
type PowerUpType = 'shield' | 'laser' | 'slowmo' | 'ammo' | 'nuke';

interface EnemyMissile {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: ThreatType;
  color: string;
  trailColor: string;
  hasSplit?: boolean;
  splitY?: number;
  zigzagOffset?: number;
  progress: number; // 0 to 1
  scoreValue: number;
}

interface Interceptor {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number;
  fromBatteryId: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  expanding: boolean;
  alive: boolean;
  isNuke?: boolean;
  isPlayerFlak: boolean;
}

interface PowerUpDrop {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: PowerUpType;
  radius: number;
  alive: boolean;
}

interface FloatingBadge {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  scale: number;
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

interface Bomber {
  id: number;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  lastBombTime: number;
  color: string;
}

interface BossDreadnought {
  id: number;
  x: number;
  y: number;
  targetY: number;
  vx: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  lastAttackTime: number;
  alive: boolean;
}

export default function NeonMissileDefenseGame({ gameId, onGameOver }: NeonMissileDefenseGameProps) {
  // Container & Canvas Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // High-DPI & Uniform Aspect-Fit Projection Transform Matrix
  const viewTransformRef = useRef({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    dpr: 1
  });

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Game UI State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(0);
  const [nukeCharges, setNukeCharges] = useState<number>(1);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [isWaveIntermission, setIsWaveIntermission] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [selectedBattery, setSelectedBattery] = useState<number>(0); // 0 = SMART AUTO, 1 = Alpha, 2 = Delta, 3 = Omega
  const [menuTab, setMenuTab] = useState<'intel' | 'arsenal' | 'controls'>('intel');

  // Active Power-Up State
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [laserTimeLeft, setLaserTimeLeft] = useState<number>(0);
  const [slowMoTimeLeft, setSlowMoTimeLeft] = useState<number>(0);

  // Tactical Battery & City Live UI State
  const [batteryAmmo, setBatteryAmmo] = useState<{ b1: number; b2: number; b3: number }>({ b1: 15, b2: 25, b3: 15 });
  const [citiesStatus, setCitiesStatus] = useState<boolean[]>([true, true, true, true, true, true]);

  // Performance Mutable Refs (Zero-Lag Game Loop)
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const nukeChargesRef = useRef(1);
  const comboStreakRef = useRef(0);
  const lastKillTimeRef = useRef(0);
  const waveEnemyCountRef = useRef(0);
  const waveEnemiesSpawnedRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const spawnIntervalRef = useRef(1200);
  const radarAngleRef = useRef(0);
  const screenShakeRef = useRef(0);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: VIRTUAL_WIDTH / 2, y: VIRTUAL_HEIGHT / 2 });

  // Power-Up Timers in Refs
  const shieldRef = useRef(false);
  const laserTimerRef = useRef(0);
  const slowMoTimerRef = useRef(0);
  const lastLaserZapRef = useRef(0);

  // Stats Counters
  const shotsFiredRef = useRef(0);
  const threatsDestroyedRef = useRef(0);

  // Entity Collections
  const batteriesRef = useRef<Battery[]>([]);
  const citiesRef = useRef<City[]>([]);
  const enemiesRef = useRef<EnemyMissile[]>([]);
  const interceptorsRef = useRef<Interceptor[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const powerUpsRef = useRef<PowerUpDrop[]>([]);
  const bombersRef = useRef<Bomber[]>([]);
  const bossRef = useRef<BossDreadnought | null>(null);
  const badgesRef = useRef<FloatingBadge[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const idCounterRef = useRef<number>(1);

  // Setup Web Audio Synthesizer
  const initAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  const playSfx = useCallback((type: 'launch' | 'explode' | 'chain' | 'mirv' | 'nuke' | 'alarm' | 'victory' | 'lost' | 'gameover' | 'powerup' | 'laser' | 'slowmo') => {
    if (isMuted) return;
    try {
      initAudioCtx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'launch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'explode') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'chain') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.22);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'mirv') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.15);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'laser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'powerup') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);

          gain.gain.setValueAtTime(0.15, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.25);
        });
      } else if (type === 'slowmo') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.5);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'nuke') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(25, now + 1.2);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      } else if (type === 'victory') {
        const chord = [523.25, 659.25, 783.99, 1046.5]; // C E G C
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0.18, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.4);
        });
      } else if (type === 'lost') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.45);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'gameover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.8);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      }
    } catch {
      // Ignore audio synthesis errors gracefully
    }
  }, [isMuted, initAudioCtx]);

  // Teardown Audio on Unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Load High Score on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('break_hub_high_score_' + gameId);
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {
      // LocalStorage unavailable
    }
  }, [gameId]);

  // Dynamic Virtual Canvas Layout Initializer (Fixed in 900x600 coordinate space)
  const initTacticalLayout = useCallback(() => {
    // Setup 3 Anti-Missile Batteries (Left, Center, Right)
    batteriesRef.current = [
      { id: 1, x: 60, y: VIRTUAL_GROUND_Y - 10, maxAmmo: 15, ammo: 15, alive: true, name: 'ALPHA' },
      { id: 2, x: VIRTUAL_WIDTH / 2, y: VIRTUAL_GROUND_Y - 12, maxAmmo: 25, ammo: 25, alive: true, name: 'DELTA' },
      { id: 3, x: VIRTUAL_WIDTH - 60, y: VIRTUAL_GROUND_Y - 10, maxAmmo: 15, ammo: 15, alive: true, name: 'OMEGA' }
    ];

    // Setup 6 Defended Cyber Data Cities (3 on left half, 3 on right half)
    citiesRef.current = [
      { id: 1, x: 150, y: VIRTUAL_GROUND_Y - 20, width: 34, height: 20, alive: true, name: 'MEGACORE-A' },
      { id: 2, x: 240, y: VIRTUAL_GROUND_Y - 24, width: 36, height: 24, alive: true, name: 'POWERGRID-B' },
      { id: 3, x: 330, y: VIRTUAL_GROUND_Y - 22, width: 34, height: 22, alive: true, name: 'DATAHUB-C' },
      { id: 4, x: 535, y: VIRTUAL_GROUND_Y - 22, width: 34, height: 22, alive: true, name: 'RESEARCH-D' },
      { id: 5, x: 625, y: VIRTUAL_GROUND_Y - 26, width: 38, height: 26, alive: true, name: 'NEXUS-E' },
      { id: 6, x: 715, y: VIRTUAL_GROUND_Y - 22, width: 34, height: 22, alive: true, name: 'ORBITAL-F' }
    ];

    setBatteryAmmo({ b1: 15, b2: 25, b3: 15 });
    setCitiesStatus([true, true, true, true, true, true]);
  }, []);

  // Responsive High-DPI Canvas Resizer with Aspect-Fit Transform Matrix
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayW = Math.floor(rect.width);
    const displayH = Math.floor(rect.height);

    if (displayW <= 0 || displayH <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(displayW * dpr);
    canvas.height = Math.floor(displayH * dpr);

    const scale = Math.min(displayW / VIRTUAL_WIDTH, displayH / VIRTUAL_HEIGHT);
    const offsetX = (displayW - VIRTUAL_WIDTH * scale) / 2;
    const offsetY = (displayH - VIRTUAL_HEIGHT * scale) / 2;

    viewTransformRef.current = {
      scale,
      offsetX,
      offsetY,
      dpr
    };
  }, []);

  useEffect(() => {
    initTacticalLayout();
    handleResize();

    const onFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement
      );
      setIsFullscreen(isFs);
      setTimeout(handleResize, 60);
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
      document.removeEventListener('MSFullscreenChange', onFsChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [initTacticalLayout, handleResize]);

  // Virtual Coordinate Pointer Mapper
  const getVirtualCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: VIRTUAL_WIDTH / 2, y: VIRTUAL_HEIGHT / 2, inBounds: false };

    const rect = canvas.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    const { scale, offsetX, offsetY } = viewTransformRef.current;
    if (scale <= 0) return { x: VIRTUAL_WIDTH / 2, y: VIRTUAL_HEIGHT / 2, inBounds: false };

    const vx = (relX - offsetX) / scale;
    const vy = (relY - offsetY) / scale;

    return {
      x: Math.max(0, Math.min(VIRTUAL_WIDTH, vx)),
      y: Math.max(0, Math.min(VIRTUAL_HEIGHT, vy)),
      inBounds: vx >= 0 && vx <= VIRTUAL_WIDTH && vy >= 0 && vy <= VIRTUAL_HEIGHT
    };
  }, []);

  // Add Particle Sparks
  const addExplosionParticles = useCallback((x: number, y: number, color: string, count: number = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5.5 + 1.2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 20
      });
    }
  }, []);

  // Add Floating Combat Badge
  const addBadge = useCallback((x: number, y: number, text: string, color: string = '#FFE600') => {
    badgesRef.current.push({
      id: idCounterRef.current++,
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.4,
      scale: 1.2
    });
  }, []);

  // Spawn Tactical Power-Up Pod
  const spawnPowerUp = useCallback((x: number, y: number) => {
    const types: PowerUpType[] = ['shield', 'laser', 'slowmo', 'ammo', 'nuke'];
    const selectedType = types[Math.floor(Math.random() * types.length)];

    powerUpsRef.current.push({
      id: idCounterRef.current++,
      x,
      y,
      vy: 1.2,
      type: selectedType,
      radius: 14,
      alive: true
    });
  }, []);

  // Activate Power-Up Effect
  const applyPowerUp = useCallback((type: PowerUpType, x: number, y: number) => {
    playSfx('powerup');
    if (type === 'shield') {
      shieldRef.current = true;
      setShieldActive(true);
      addBadge(x, y - 10, '🛡️ PLASMA SHIELD ACTIVATED!', '#00F0FF');
    } else if (type === 'laser') {
      laserTimerRef.current = 6.0;
      setLaserTimeLeft(6.0);
      addBadge(x, y - 10, '⚡ CIWS DEFENSE LASERS ARMED!', '#FFE600');
    } else if (type === 'slowmo') {
      slowMoTimerRef.current = 6.0;
      setSlowMoTimeLeft(6.0);
      playSfx('slowmo');
      addBadge(x, y - 10, '⏱️ CHRONO TIME DILATION MATRIX!', '#A3E635');
    } else if (type === 'ammo') {
      batteriesRef.current.forEach((b) => {
        if (b.alive) b.ammo = b.maxAmmo;
      });
      setBatteryAmmo({
        b1: batteriesRef.current[0].ammo,
        b2: batteriesRef.current[1].ammo,
        b3: batteriesRef.current[2].ammo
      });
      addBadge(x, y - 10, '🔋 BATTERY SILOS FULLY RECHARGED!', '#39FF14');
    } else if (type === 'nuke') {
      nukeChargesRef.current = Math.min(3, nukeChargesRef.current + 1);
      setNukeCharges(nukeChargesRef.current);
      addBadge(x, y - 10, '☢️ +1 ORBITAL EMP NUKE ARMED!', '#FF00EA');
    }
  }, [playSfx, addBadge]);

  // Launch Player Interceptor Missile
  const launchInterceptor = useCallback((targetX: number, targetY: number, preferredBatteryId = 0) => {
    if (!isPlayingRef.current || isPausedRef.current) return;

    if (targetY > VIRTUAL_GROUND_Y - 10) {
      targetY = VIRTUAL_GROUND_Y - 10; // Prevent targeting below ground baseline
    }

    const activeBatteries = batteriesRef.current.filter((b) => b.alive && b.ammo > 0);
    if (activeBatteries.length === 0) return;

    let selected: Battery | undefined;

    // Manual Silo Selection (1, 2, or 3)
    if (preferredBatteryId > 0) {
      selected = activeBatteries.find((b) => b.id === preferredBatteryId);
    }

    // Smart Auto-Routing: Picks closest operational battery to maximize intercept velocity
    if (!selected) {
      let minDist = Infinity;
      activeBatteries.forEach((b) => {
        const dist = Math.hypot(targetX - b.x, targetY - b.y);
        if (dist < minDist) {
          minDist = dist;
          selected = b;
        }
      });
    }

    if (!selected) return;

    shotsFiredRef.current += 1;
    selected.ammo -= 1;
    setBatteryAmmo({
      b1: batteriesRef.current[0]?.ammo || 0,
      b2: batteriesRef.current[1]?.ammo || 0,
      b3: batteriesRef.current[2]?.ammo || 0
    });

    interceptorsRef.current.push({
      id: idCounterRef.current++,
      startX: selected.x,
      startY: selected.y,
      currentX: selected.x,
      currentY: selected.y,
      targetX,
      targetY,
      speed: 18.0,
      progress: 0,
      fromBatteryId: selected.id
    });

    playSfx('launch');
  }, [playSfx]);

  // Trigger Orbital EMP Nuke
  const triggerNuke = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || nukeChargesRef.current <= 0) return;

    nukeChargesRef.current -= 1;
    setNukeCharges(nukeChargesRef.current);
    screenShakeRef.current = 18;

    explosionsRef.current.push({
      id: idCounterRef.current++,
      x: VIRTUAL_WIDTH / 2,
      y: VIRTUAL_HEIGHT / 2,
      radius: 5,
      maxRadius: 220,
      color: '#00F0FF',
      expanding: true,
      alive: true,
      isNuke: true,
      isPlayerFlak: true
    });

    addBadge(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.35, '⚡ TACTICAL EMP BLAST DETONATED (220M RADIUS) ⚡', '#00F0FF');
    playSfx('nuke');
  }, [playSfx, addBadge]);

  // Start New Sector Wave
  const startWave = useCallback((waveNum: number) => {
    waveRef.current = waveNum;
    setWave(waveNum);
    setIsWaveIntermission(false);

    // Calculate wave threat quotas
    waveEnemyCountRef.current = 12 + waveNum * 5;
    waveEnemiesSpawnedRef.current = 0;
    spawnIntervalRef.current = Math.max(320, 1150 - waveNum * 70);

    // Reload Silos
    batteriesRef.current.forEach((b) => {
      if (b.alive) {
        b.ammo = b.maxAmmo;
      } else {
        // Repair damaged battery with half ammo
        b.alive = true;
        b.ammo = Math.floor(b.maxAmmo / 2);
      }
    });

    setBatteryAmmo({
      b1: batteriesRef.current[0].ammo,
      b2: batteriesRef.current[1].ammo,
      b3: batteriesRef.current[2].ammo
    });

    // Grant 1 EMP Nuke charge every 2 waves
    if (waveNum % 2 === 0 && nukeChargesRef.current < 3) {
      nukeChargesRef.current += 1;
      setNukeCharges(nukeChargesRef.current);
      addBadge(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.45, '+1 ORBITAL EMP NUKE ARMED!', '#FFE600');
    }

    // Sector Boss Dreadnought Every 5th Wave
    if (waveNum % 5 === 0) {
      bossRef.current = {
        id: idCounterRef.current++,
        x: VIRTUAL_WIDTH / 2,
        y: -50,
        targetY: 85,
        vx: 1.8,
        width: 140,
        height: 48,
        hp: 15 + waveNum * 4,
        maxHp: 15 + waveNum * 4,
        lastAttackTime: performance.now(),
        alive: true
      };
      addBadge(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.25, '🚨 WARNING: ORBITAL DREADNOUGHT FLAGSHIP APPROACHING! 🚨', '#FF0055');
      playSfx('alarm');
    } else {
      bossRef.current = null;
    }

    addBadge(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.3, `DEFENSE SECTOR ${waveNum} ENGAGED`, '#39FF14');
    playSfx('victory');
  }, [playSfx, addBadge]);

  // Launch / Reboot Mission
  const startNewGame = useCallback(() => {
    initAudioCtx();
    initTacticalLayout();

    scoreRef.current = 0;
    nukeChargesRef.current = 1;
    comboStreakRef.current = 0;
    lastKillTimeRef.current = 0;
    screenShakeRef.current = 0;
    shotsFiredRef.current = 0;
    threatsDestroyedRef.current = 0;
    shieldRef.current = false;
    laserTimerRef.current = 0;
    slowMoTimerRef.current = 0;

    enemiesRef.current = [];
    interceptorsRef.current = [];
    explosionsRef.current = [];
    powerUpsRef.current = [];
    bombersRef.current = [];
    bossRef.current = null;
    badgesRef.current = [];
    particlesRef.current = [];

    setScore(0);
    setNukeCharges(1);
    setComboStreak(0);
    setShieldActive(false);
    setLaserTimeLeft(0);
    setSlowMoTimeLeft(0);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    isPausedRef.current = false;

    startWave(1);
  }, [initAudioCtx, initTacticalLayout, startWave]);

  // Handle Game Over
  const handleGameOver = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsGameOver(true);
    screenShakeRef.current = 16;

    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        localStorage.setItem('break_hub_high_score_' + gameId, finalScore.toString());
      } catch {
        // LocalStorage unavailable
      }
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    playSfx('gameover');
    onGameOver(finalScore);
  }, [highScore, gameId, onGameOver, playSfx]);

  // Toggle Fullscreen API
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        (el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
    setTimeout(handleResize, 60);
  }, [handleResize]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (k === '0' || k === 'a' || k === '`') {
        setSelectedBattery(0); // Smart Auto
      } else if (k === '1' || k === 'q') {
        setSelectedBattery(1);
      } else if (k === '2' || k === 'w') {
        setSelectedBattery(2);
      } else if (k === '3' || k === 'e') {
        setSelectedBattery(3);
      } else if (k === ' ' || k === 'spacebar') {
        e.preventDefault();
        triggerNuke();
      } else if (k === 'r') {
        e.preventDefault();
        startNewGame();
      } else if (k === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (k === 'p') {
        e.preventDefault();
        setIsPaused((prev) => {
          isPausedRef.current = !prev;
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerNuke, startNewGame, toggleFullscreen]);

  // Handle Canvas Click & Touch Targeting with crosshair tracking
  const handleCanvasAction = useCallback((clientX: number, clientY: number, preferredBattery?: number) => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    const { x, y } = getVirtualCoords(clientX, clientY);
    mousePosRef.current = { x, y };
    launchInterceptor(x, y, preferredBattery !== undefined ? preferredBattery : selectedBattery);
  }, [getVirtualCoords, launchInterceptor, selectedBattery]);

  // Touch Move / Drag Targeting for mobile aiming
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const { x, y } = getVirtualCoords(touch.clientX, touch.clientY);
      mousePosRef.current = { x, y };
    }
  }, [getVirtualCoords]);

  // Mouse Move for Custom Crosshairs
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getVirtualCoords(e.clientX, e.clientY);
    mousePosRef.current = { x, y };
  };

  // Main 60+ FPS Canvas Animation & Physics Loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const rawDt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      // Time Dilation if Slow-Mo Matrix is Active
      const isSlowMo = slowMoTimerRef.current > 0;
      const effectiveDt = isSlowMo ? rawDt * 0.4 : rawDt;
      const timeScale = effectiveDt * 60;

      // Update Power-Up Timers
      if (laserTimerRef.current > 0) {
        laserTimerRef.current = Math.max(0, laserTimerRef.current - rawDt);
        setLaserTimeLeft(laserTimerRef.current);
      }
      if (slowMoTimerRef.current > 0) {
        slowMoTimerRef.current = Math.max(0, slowMoTimerRef.current - rawDt);
        setSlowMoTimeLeft(slowMoTimerRef.current);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        const { scale, offsetX, offsetY, dpr } = viewTransformRef.current;

        // Clear full canvas with deep space black (letterbox background)
        ctx.save();
        ctx.fillStyle = '#02000A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply Uniform Aspect-Fit Projection Transform Matrix
        ctx.setTransform(
          scale * dpr, 0,
          0, scale * dpr,
          offsetX * dpr, offsetY * dpr
        );

        // Clip strictly to Virtual Viewport [0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT]
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        ctx.clip();

        // Apply Screen Shake inside Virtual Coordinates
        ctx.save();
        if (screenShakeRef.current > 0) {
          const sx = (Math.random() - 0.5) * screenShakeRef.current * 1.5;
          const sy = (Math.random() - 0.5) * screenShakeRef.current * 1.5;
          ctx.translate(sx, sy);
          screenShakeRef.current = Math.max(0, screenShakeRef.current - 0.65 * timeScale);
        }

        // 1. Draw Deep Cyber Space Sky
        ctx.fillStyle = isSlowMo ? '#040d1a' : '#060214';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // Radar Scanning Sweep Arcs & Radial Sector Grid (matching thumbnail)
        radarAngleRef.current = (radarAngleRef.current + 0.015 * timeScale) % (Math.PI * 2);
        const centerRadarX = VIRTUAL_WIDTH / 2;
        const centerRadarY = VIRTUAL_GROUND_Y;

        ctx.strokeStyle = isSlowMo ? 'rgba(0, 240, 255, 0.35)' : 'rgba(0, 240, 255, 0.16)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerRadarX, centerRadarY, VIRTUAL_HEIGHT * 0.25, Math.PI, 0, false);
        ctx.arc(centerRadarX, centerRadarY, VIRTUAL_HEIGHT * 0.50, Math.PI, 0, false);
        ctx.arc(centerRadarX, centerRadarY, VIRTUAL_HEIGHT * 0.75, Math.PI, 0, false);
        ctx.arc(centerRadarX, centerRadarY, VIRTUAL_HEIGHT * 1.00, Math.PI, 0, false);
        ctx.stroke();

        // Sector Radial Division Lines (matching thumbnail)
        ctx.beginPath();
        ctx.moveTo(centerRadarX, centerRadarY);
        ctx.lineTo(centerRadarX - VIRTUAL_HEIGHT * 0.8, centerRadarY - VIRTUAL_HEIGHT * 0.8);
        ctx.moveTo(centerRadarX, centerRadarY);
        ctx.lineTo(centerRadarX, centerRadarY - VIRTUAL_HEIGHT * 0.95);
        ctx.moveTo(centerRadarX, centerRadarY);
        ctx.lineTo(centerRadarX + VIRTUAL_HEIGHT * 0.8, centerRadarY - VIRTUAL_HEIGHT * 0.8);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radar Sweep Line
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerRadarX, centerRadarY);
        ctx.lineTo(
          centerRadarX + Math.cos(radarAngleRef.current) * VIRTUAL_HEIGHT * 0.9,
          centerRadarY - Math.abs(Math.sin(radarAngleRef.current)) * VIRTUAL_HEIGHT * 0.9
        );
        ctx.stroke();

        // Cyber Skyline Silhouettes in Backdrop
        ctx.fillStyle = '#050218';
        const skylineBlocks = [
          { x: 30, w: 45, h: 60 },
          { x: 85, w: 35, h: 85 },
          { x: 190, w: 40, h: 70 },
          { x: 280, w: 42, h: 90 },
          { x: 390, w: 50, h: 65 },
          { x: 470, w: 45, h: 80 },
          { x: 580, w: 38, h: 95 },
          { x: 670, w: 36, h: 60 },
          { x: 760, w: 48, h: 75 },
          { x: 830, w: 40, h: 85 }
        ];
        skylineBlocks.forEach((b) => {
          ctx.fillRect(b.x, VIRTUAL_GROUND_Y - b.h, b.w, b.h);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
          ctx.strokeRect(b.x, VIRTUAL_GROUND_Y - b.h, b.w, b.h);
        });

        // Stars & Background Quantum Sparks
        ctx.fillStyle = 'rgba(255, 230, 0, 0.5)';
        for (let i = 1; i <= 32; i++) {
          const sx = (i * 137.5) % VIRTUAL_WIDTH;
          const sy = (i * 73.1) % (VIRTUAL_HEIGHT * 0.65);
          ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        if (isPlayingRef.current && !isPausedRef.current) {
          // 2. SPAWN THREAT LOGIC
          const currentWave = waveRef.current;
          if (
            waveEnemiesSpawnedRef.current < waveEnemyCountRef.current &&
            timestamp - lastSpawnTimeRef.current >= spawnIntervalRef.current
          ) {
            lastSpawnTimeRef.current = timestamp;
            waveEnemiesSpawnedRef.current += 1;

            const spawnX = Math.random() * (VIRTUAL_WIDTH - 80) + 40;
            const startY = 0;

            // Pick Target: Live City or Live Battery
            const validTargets: { x: number; y: number }[] = [];
            citiesRef.current.filter((c) => c.alive).forEach((c) => validTargets.push({ x: c.x + c.width / 2, y: c.y }));
            batteriesRef.current.filter((b) => b.alive).forEach((b) => validTargets.push({ x: b.x, y: b.y }));

            const chosenTarget = validTargets.length > 0
              ? validTargets[Math.floor(Math.random() * validTargets.length)]
              : { x: Math.random() * VIRTUAL_WIDTH, y: VIRTUAL_GROUND_Y };

            // Determine Threat Type
            const rand = Math.random();
            let threatType: ThreatType = 'standard';
            let speed = (Math.random() * 0.6 + 0.95) * (1 + (currentWave - 1) * 0.08);
            let color = '#FF0055';
            let trailColor = 'rgba(255, 0, 85, 0.45)';
            let scoreVal = 100;

            if (currentWave >= 2 && rand < 0.28) {
              threatType = 'mirv';
              color = '#FF00EA';
              trailColor = 'rgba(255, 0, 234, 0.5)';
              speed *= 0.9;
              scoreVal = 250;
            } else if (currentWave >= 3 && rand > 0.76) {
              threatType = 'hypersonic';
              color = '#FFE600';
              trailColor = 'rgba(255, 230, 0, 0.6)';
              speed *= 1.6;
              scoreVal = 300;
            } else if (currentWave >= 4 && rand >= 0.28 && rand <= 0.46) {
              threatType = 'cruise';
              color = '#00F0FF';
              trailColor = 'rgba(0, 240, 255, 0.5)';
              speed *= 1.1;
              scoreVal = 280;
            }

            enemiesRef.current.push({
              id: idCounterRef.current++,
              startX: spawnX,
              startY,
              currentX: spawnX,
              currentY: startY,
              targetX: chosenTarget.x,
              targetY: chosenTarget.y,
              speed,
              type: threatType,
              color,
              trailColor,
              progress: 0,
              scoreValue: scoreVal,
              splitY: threatType === 'mirv' ? Math.random() * (VIRTUAL_HEIGHT * 0.35) + VIRTUAL_HEIGHT * 0.2 : undefined,
              zigzagOffset: threatType === 'cruise' ? Math.random() * Math.PI * 2 : undefined
            });
          }

          // 3. SPAWN BOMBER GUNSHIPS (Sector 3+)
          if (currentWave >= 3 && bombersRef.current.length === 0 && Math.random() < 0.0035 * timeScale) {
            const fromLeft = Math.random() > 0.5;
            bombersRef.current.push({
              id: idCounterRef.current++,
              x: fromLeft ? -40 : VIRTUAL_WIDTH + 40,
              y: Math.random() * (VIRTUAL_HEIGHT * 0.2) + 35,
              vx: fromLeft ? 1.4 : -1.4,
              width: 44,
              height: 20,
              hp: 2,
              maxHp: 2,
              lastBombTime: timestamp,
              color: '#FF0055'
            });
            addBadge(VIRTUAL_WIDTH / 2, 80, '⚠️ HOSTILE BOMBER INCOMING! ⚠️', '#FF0055');
            playSfx('alarm');
          }

          // Update Bombers
          bombersRef.current.forEach((bomber) => {
            bomber.x += bomber.vx * timeScale;
            if (timestamp - bomber.lastBombTime > 1600) {
              bomber.lastBombTime = timestamp;
              const liveCities = citiesRef.current.filter((c) => c.alive);
              const targetCity = liveCities[Math.floor(Math.random() * liveCities.length)];
              const targetX = targetCity ? targetCity.x + targetCity.width / 2 : VIRTUAL_WIDTH / 2;

              enemiesRef.current.push({
                id: idCounterRef.current++,
                startX: bomber.x,
                startY: bomber.y,
                currentX: bomber.x,
                currentY: bomber.y,
                targetX,
                targetY: VIRTUAL_GROUND_Y,
                speed: 1.6,
                type: 'bomber_drop',
                color: '#FF0055',
                trailColor: 'rgba(255, 0, 85, 0.6)',
                progress: 0,
                scoreValue: 150
              });
            }
          });
          bombersRef.current = bombersRef.current.filter((b) => b.x >= -60 && b.x <= VIRTUAL_WIDTH + 60);

          // 4. UPDATE BOSS DREADNOUGHT
          const boss = bossRef.current;
          if (boss && boss.alive) {
            if (boss.y < boss.targetY) {
              boss.y += 0.8 * timeScale;
            } else {
              boss.x += boss.vx * timeScale;
              if (boss.x < 100 || boss.x > VIRTUAL_WIDTH - 100) {
                boss.vx *= -1;
              }
            }

            // Boss Cluster Fire Attack
            if (timestamp - boss.lastAttackTime > 2200) {
              boss.lastAttackTime = timestamp;
              for (let i = -1; i <= 1; i++) {
                enemiesRef.current.push({
                  id: idCounterRef.current++,
                  startX: boss.x + i * 35,
                  startY: boss.y + 20,
                  currentX: boss.x + i * 35,
                  currentY: boss.y + 20,
                  targetX: Math.random() * VIRTUAL_WIDTH,
                  targetY: VIRTUAL_GROUND_Y,
                  speed: 1.5,
                  type: 'standard',
                  color: '#FF00EA',
                  trailColor: 'rgba(255, 0, 234, 0.6)',
                  progress: 0,
                  scoreValue: 200
                });
              }
              playSfx('alarm');
            }
          }

          // 5. UPDATE INTERCEPTORS
          for (let i = interceptorsRef.current.length - 1; i >= 0; i--) {
            const ic = interceptorsRef.current[i];
            const dx = ic.targetX - ic.startX;
            const dy = ic.targetY - ic.startY;
            const distTotal = Math.hypot(dx, dy);

            ic.progress += (ic.speed * timeScale) / distTotal;
            ic.currentX = ic.startX + dx * ic.progress;
            ic.currentY = ic.startY + dy * ic.progress;

            if (ic.progress >= 1) {
              // Detonate at target
              explosionsRef.current.push({
                id: idCounterRef.current++,
                x: ic.targetX,
                y: ic.targetY,
                radius: 4,
                maxRadius: 48,
                color: '#00F0FF',
                expanding: true,
                alive: true,
                isPlayerFlak: true
              });
              addExplosionParticles(ic.targetX, ic.targetY, '#00F0FF', 16);
              playSfx('explode');
              interceptorsRef.current.splice(i, 1);
            }
          }

          // 6. CIWS LASER DEFENSE AUTOMATIC FIRING
          if (laserTimerRef.current > 0 && timestamp - lastLaserZapRef.current > 120) {
            lastLaserZapRef.current = timestamp;
            const nearestEnemy = enemiesRef.current.find((e) => e.currentY < VIRTUAL_GROUND_Y - 40);
            if (nearestEnemy) {
              // Vaporize nearest threat with laser
              explosionsRef.current.push({
                id: idCounterRef.current++,
                x: nearestEnemy.currentX,
                y: nearestEnemy.currentY,
                radius: 3,
                maxRadius: 36,
                color: '#FFE600',
                expanding: true,
                alive: true,
                isPlayerFlak: true
              });

              addExplosionParticles(nearestEnemy.currentX, nearestEnemy.currentY, '#FFE600', 14);
              scoreRef.current += nearestEnemy.scoreValue;
              setScore(scoreRef.current);
              threatsDestroyedRef.current += 1;
              playSfx('laser');

              // Remove vaporized threat
              enemiesRef.current = enemiesRef.current.filter((e) => e.id !== nearestEnemy.id);
            }
          }

          // 7. UPDATE EXPLOSIONS & FLAK CHAIN REACTIONS
          for (let eIdx = explosionsRef.current.length - 1; eIdx >= 0; eIdx--) {
            const exp = explosionsRef.current[eIdx];

            if (exp.expanding) {
              exp.radius += (exp.isNuke ? 18.0 : 2.6) * timeScale;
              if (exp.radius >= exp.maxRadius) {
                exp.expanding = false;
              }
            } else {
              exp.radius -= 1.6 * timeScale;
              if (exp.radius <= 0.1) {
                exp.radius = 0;
                exp.alive = false;
                explosionsRef.current.splice(eIdx, 1);
                continue;
              }
            }

            // Check Flak Collisions against Enemy Missiles
            for (let mIdx = enemiesRef.current.length - 1; mIdx >= 0; mIdx--) {
              const m = enemiesRef.current[mIdx];
              const dist = Math.hypot(m.currentX - exp.x, m.currentY - exp.y);

              if (dist <= exp.radius) {
                // Secondary Chain Reaction Detonation
                explosionsRef.current.push({
                  id: idCounterRef.current++,
                  x: m.currentX,
                  y: m.currentY,
                  radius: 3,
                  maxRadius: 38,
                  color: '#FFE600',
                  expanding: true,
                  alive: true,
                  isPlayerFlak: false
                });

                addExplosionParticles(m.currentX, m.currentY, '#FFE600', 16);

                // Chance to spawn tactical power-up drop (8% chance or on 5x streak)
                if (Math.random() < 0.08 || comboStreakRef.current === 4) {
                  spawnPowerUp(m.currentX, m.currentY);
                }

                // Calculate Combo & Score
                const timeSinceLastKill = timestamp - lastKillTimeRef.current;
                lastKillTimeRef.current = timestamp;

                let streak = comboStreakRef.current;
                if (timeSinceLastKill < 1800) {
                  streak += 1;
                } else {
                  streak = 1;
                }
                comboStreakRef.current = streak;
                setComboStreak(streak);

                const multiplier = Math.min(10, 1 + (streak - 1) * 0.5);
                const pointsEarned = Math.floor(m.scoreValue * multiplier);
                scoreRef.current += pointsEarned;
                setScore(scoreRef.current);
                threatsDestroyedRef.current += 1;

                addBadge(m.currentX, m.currentY - 10, `+${pointsEarned}`, streak > 2 ? '#FF00EA' : '#FFE600');
                playSfx(streak > 2 ? 'chain' : 'explode');

                enemiesRef.current.splice(mIdx, 1);
              }
            }

            // Check Flak against Power-Up Drops (Shoot to collect!)
            for (let pIdx = powerUpsRef.current.length - 1; pIdx >= 0; pIdx--) {
              const pod = powerUpsRef.current[pIdx];
              const dist = Math.hypot(pod.x - exp.x, pod.y - exp.y);
              if (dist <= exp.radius + pod.radius) {
                applyPowerUp(pod.type, pod.x, pod.y);
                powerUpsRef.current.splice(pIdx, 1);
              }
            }

            // Check Flak against Bombers
            for (let bIdx = bombersRef.current.length - 1; bIdx >= 0; bIdx--) {
              const bomber = bombersRef.current[bIdx];
              const dist = Math.hypot(bomber.x - exp.x, bomber.y - exp.y);

              if (dist <= exp.radius + bomber.width / 2) {
                bomber.hp -= 1;
                addExplosionParticles(bomber.x, bomber.y, '#FF0055', 20);

                if (bomber.hp <= 0) {
                  explosionsRef.current.push({
                    id: idCounterRef.current++,
                    x: bomber.x,
                    y: bomber.y,
                    radius: 5,
                    maxRadius: 52,
                    color: '#FF0055',
                    expanding: true,
                    alive: true,
                    isPlayerFlak: false
                  });

                  spawnPowerUp(bomber.x, bomber.y);
                  scoreRef.current += 500;
                  setScore(scoreRef.current);
                  threatsDestroyedRef.current += 1;
                  addBadge(bomber.x, bomber.y, '+500 BOMBER DOWN!', '#FF0055');
                  playSfx('explode');
                  bombersRef.current.splice(bIdx, 1);
                }
              }
            }

            // Check Flak against Boss Dreadnought
            if (boss && boss.alive) {
              const dist = Math.hypot(boss.x - exp.x, boss.y - exp.y);
              if (dist <= exp.radius + boss.width / 2) {
                boss.hp -= 1;
                addExplosionParticles(boss.x, boss.y, '#FF00EA', 8);

                if (boss.hp <= 0) {
                  boss.alive = false;
                  screenShakeRef.current = 24;

                  for (let k = 0; k < 6; k++) {
                    explosionsRef.current.push({
                      id: idCounterRef.current++,
                      x: boss.x + (Math.random() - 0.5) * boss.width,
                      y: boss.y + (Math.random() - 0.5) * boss.height,
                      radius: 6,
                      maxRadius: 65,
                      color: '#00F0FF',
                      expanding: true,
                      alive: true,
                      isPlayerFlak: false
                    });
                  }

                  spawnPowerUp(boss.x - 30, boss.y);
                  spawnPowerUp(boss.x + 30, boss.y);
                  scoreRef.current += 2500;
                  setScore(scoreRef.current);
                  addBadge(boss.x, boss.y, '🏆 +2500 DREADNOUGHT DESTROYED! 🏆', '#39FF14');
                  playSfx('victory');
                  bossRef.current = null;
                }
              }
            }
          }

          // 8. UPDATE POWER-UP PODS
          for (let pIdx = powerUpsRef.current.length - 1; pIdx >= 0; pIdx--) {
            const pod = powerUpsRef.current[pIdx];
            pod.y += pod.vy * timeScale;

            if (pod.y >= VIRTUAL_GROUND_Y - 10) {
              applyPowerUp(pod.type, pod.x, pod.y);
              powerUpsRef.current.splice(pIdx, 1);
            }
          }

          // 9. UPDATE HOSTILE MISSILES & GROUND IMPACTS
          for (let mIdx = enemiesRef.current.length - 1; mIdx >= 0; mIdx--) {
            const m = enemiesRef.current[mIdx];
            const dx = m.targetX - m.startX;
            const dy = m.targetY - m.startY;
            const totalDist = Math.hypot(dx, dy);

            m.progress += (m.speed * timeScale) / totalDist;
            m.currentX = m.startX + dx * m.progress;
            m.currentY = m.startY + dy * m.progress;

            // Cruise Missile Zig-Zag Trajectory
            if (m.type === 'cruise' && m.zigzagOffset !== undefined) {
              m.zigzagOffset += 0.08 * timeScale;
              m.currentX += Math.sin(m.zigzagOffset) * 2.5;
            }

            // MIRV Warhead Split Logic
            if (m.type === 'mirv' && !m.hasSplit && m.splitY && m.currentY >= m.splitY) {
              m.hasSplit = true;
              playSfx('mirv');
              addBadge(m.currentX, m.currentY, '⚡ MIRV CLUSTER DETACHED! ⚡', '#FF00EA');

              // Spawn 2 sub-warheads targeting nearby sectors
              const liveCities = citiesRef.current.filter((c) => c.alive);
              for (let s = -1; s <= 1; s += 2) {
                const targetCity = liveCities[Math.floor(Math.random() * liveCities.length)];
                const subTargetX = targetCity ? targetCity.x + targetCity.width / 2 : m.currentX + s * 80;

                enemiesRef.current.push({
                  id: idCounterRef.current++,
                  startX: m.currentX,
                  startY: m.currentY,
                  currentX: m.currentX,
                  currentY: m.currentY,
                  targetX: Math.max(20, Math.min(VIRTUAL_WIDTH - 20, subTargetX)),
                  targetY: VIRTUAL_GROUND_Y,
                  speed: m.speed * 1.15,
                  type: 'standard',
                  color: '#FF00EA',
                  trailColor: 'rgba(255, 0, 234, 0.65)',
                  progress: 0,
                  scoreValue: 150
                });
              }
            }

            // Impact Check at Ground Level
            if (m.progress >= 1 || m.currentY >= VIRTUAL_GROUND_Y) {
              screenShakeRef.current = 10;

              // Crater Explosion
              explosionsRef.current.push({
                id: idCounterRef.current++,
                x: m.targetX,
                y: VIRTUAL_GROUND_Y,
                radius: 4,
                maxRadius: 40,
                color: '#FF0055',
                expanding: true,
                alive: true,
                isPlayerFlak: false
              });

              addExplosionParticles(m.targetX, VIRTUAL_GROUND_Y, '#FF0055', 24);
              playSfx('lost');

              // Check Plasma Shield Barrier Protection
              if (shieldRef.current) {
                shieldRef.current = false;
                setShieldActive(false);
                addBadge(m.targetX, VIRTUAL_GROUND_Y - 30, '🛡️ PLASMA SHIELD ABSORBED IMPACT! 🛡️', '#00F0FF');
                enemiesRef.current.splice(mIdx, 1);
                continue;
              }

              // Check Damage to Batteries
              batteriesRef.current.forEach((bat) => {
                if (bat.alive && Math.abs(m.targetX - bat.x) < 32) {
                  bat.alive = false;
                  bat.ammo = 0;
                  addBadge(bat.x, bat.y - 20, `SILO ${bat.name} DESTROYED!`, '#FF0055');
                }
              });

              setBatteryAmmo({
                b1: batteriesRef.current[0]?.ammo || 0,
                b2: batteriesRef.current[1]?.ammo || 0,
                b3: batteriesRef.current[2]?.ammo || 0
              });

              // Check Damage to Cities
              citiesRef.current.forEach((city, cIdx) => {
                if (city.alive && Math.abs(m.targetX - (city.x + city.width / 2)) < city.width * 0.85) {
                  city.alive = false;
                  addBadge(city.x + city.width / 2, city.y - 15, `${city.name} OFFLINE!`, '#FF0055');
                  setCitiesStatus((prev) => {
                    const next = [...prev];
                    next[cIdx] = false;
                    return next;
                  });
                }
              });

              enemiesRef.current.splice(mIdx, 1);

              // Check Game Over Condition (All cities destroyed)
              const remainingCities = citiesRef.current.filter((c) => c.alive).length;
              if (remainingCities === 0) {
                handleGameOver();
                return;
              }
            }
          }

          // 10. CHECK SECTOR WAVE COMPLETION
          if (
            waveEnemiesSpawnedRef.current >= waveEnemyCountRef.current &&
            enemiesRef.current.length === 0 &&
            bombersRef.current.length === 0 &&
            (!bossRef.current || !bossRef.current.alive) &&
            !isWaveIntermission
          ) {
            setIsWaveIntermission(true);

            // Calculate Ammo & City Bonuses
            let totalRemainingAmmo = 0;
            batteriesRef.current.forEach((b) => (totalRemainingAmmo += b.ammo));
            const liveCityCount = citiesRef.current.filter((c) => c.alive).length;

            const ammoBonus = totalRemainingAmmo * 20;
            const cityBonus = liveCityCount * 250;
            const totalWaveBonus = ammoBonus + cityBonus;

            scoreRef.current += totalWaveBonus;
            setScore(scoreRef.current);

            addBadge(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.35, `SECTOR CLEARED! BONUS +${totalWaveBonus}`, '#39FF14');
            playSfx('victory');

            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.5 }
            });

            // Auto-advance to next wave after 3.2 seconds
            setTimeout(() => {
              if (isPlayingRef.current) {
                startWave(waveRef.current + 1);
              }
            }, 3200);
          }
        }

        // ================= RENDERING PASS =================

        // 11. Draw Hostile Missile Vapor Trails & Warheads
        enemiesRef.current.forEach((m) => {
          ctx.strokeStyle = m.trailColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(m.startX, m.startY);
          ctx.lineTo(m.currentX, m.currentY);
          ctx.stroke();

          // Warhead Tip
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(m.currentX, m.currentY, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // 12. Draw Orbital Bomber Gunships
        bombersRef.current.forEach((bomber) => {
          ctx.save();
          ctx.translate(bomber.x, bomber.y);

          // 3D Neo-Brutalist Hull
          ctx.fillStyle = bomber.color;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(-bomber.width / 2, 0);
          ctx.lineTo(0, -bomber.height / 2);
          ctx.lineTo(bomber.width / 2, 0);
          ctx.lineTo(bomber.width * 0.25, bomber.height / 2);
          ctx.lineTo(-bomber.width * 0.25, bomber.height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Engine Thruster Glow
          ctx.fillStyle = '#FF0055';
          ctx.fillRect(-6, bomber.height / 2, 12, 4);

          ctx.restore();
        });

        // 13. Draw Boss Dreadnought Flagship
        const boss = bossRef.current;
        if (boss && boss.alive) {
          ctx.save();
          ctx.translate(boss.x, boss.y);

          // Boss Hull
          ctx.fillStyle = '#1A0B2E';
          ctx.strokeStyle = '#FF00EA';
          ctx.lineWidth = 3.5;

          ctx.beginPath();
          ctx.moveTo(-boss.width / 2, 0);
          ctx.lineTo(-boss.width * 0.35, -boss.height / 2);
          ctx.lineTo(boss.width * 0.35, -boss.height / 2);
          ctx.lineTo(boss.width / 2, 0);
          ctx.lineTo(boss.width * 0.25, boss.height / 2);
          ctx.lineTo(-boss.width * 0.25, boss.height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Boss Health Bar
          const barW = boss.width;
          const barH = 6;
          const hpPct = Math.max(0, boss.hp / boss.maxHp);
          ctx.fillStyle = '#000000';
          ctx.fillRect(-barW / 2, -boss.height / 2 - 14, barW, barH);
          ctx.fillStyle = '#FF0055';
          ctx.fillRect(-barW / 2, -boss.height / 2 - 14, barW * hpPct, barH);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.strokeRect(-barW / 2, -boss.height / 2 - 14, barW, barH);

          ctx.restore();
        }

        // 14. Draw Power-Up Drops
        powerUpsRef.current.forEach((pod) => {
          ctx.save();
          ctx.translate(pod.x, pod.y);

          // Glowing Parachute & Pod Box
          ctx.fillStyle =
            pod.type === 'shield'
              ? '#00F0FF'
              : pod.type === 'laser'
              ? '#FFE600'
              : pod.type === 'slowmo'
              ? '#A3E635'
              : pod.type === 'ammo'
              ? '#39FF14'
              : '#FF00EA';

          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.fillRect(-pod.radius, -pod.radius, pod.radius * 2, pod.radius * 2);
          ctx.strokeRect(-pod.radius, -pod.radius, pod.radius * 2, pod.radius * 2);

          // Parachute Canopy
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -pod.radius - 8, 14, Math.PI, 0);
          ctx.stroke();
          ctx.lineTo(-pod.radius, -pod.radius);
          ctx.moveTo(14, -pod.radius - 8);
          ctx.lineTo(pod.radius, -pod.radius);
          ctx.stroke();

          // Icon Label inside Box
          ctx.fillStyle = '#000000';
          ctx.font = '900 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            pod.type === 'shield'
              ? 'SH'
              : pod.type === 'laser'
              ? 'LZ'
              : pod.type === 'slowmo'
              ? 'TM'
              : pod.type === 'ammo'
              ? 'AM'
              : 'NK',
            0,
            4
          );

          ctx.restore();
        });

        // 15. Draw Interceptor Vapor Trails
        interceptorsRef.current.forEach((ic) => {
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(ic.startX, ic.startY);
          ctx.lineTo(ic.currentX, ic.currentY);
          ctx.stroke();

          // Interceptor Rocket Tip
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(ic.currentX, ic.currentY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Target Reticle Cross
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ic.targetX, ic.targetY, 6, 0, Math.PI * 2);
          ctx.moveTo(ic.targetX - 9, ic.targetY);
          ctx.lineTo(ic.targetX + 9, ic.targetY);
          ctx.moveTo(ic.targetX, ic.targetY - 9);
          ctx.lineTo(ic.targetX, ic.targetY + 9);
          ctx.stroke();
        });

        // 16. Draw Concentric Flak Shockwave Explosions
        explosionsRef.current.forEach((exp) => {
          if (!exp.alive || exp.radius <= 0.1) return;
          const safeRadius = Math.max(0.1, exp.radius);

          ctx.save();
          const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, safeRadius);
          grad.addColorStop(0, '#FFFFFF');
          grad.addColorStop(0.35, exp.color);
          grad.addColorStop(0.85, exp.color === '#00F0FF' ? '#0284C7' : '#D97706');
          grad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, safeRadius, 0, Math.PI * 2);
          ctx.fill();

          // Outer Neon Ring Ripple
          ctx.strokeStyle = exp.color;
          ctx.lineWidth = exp.isNuke ? 3.5 : 2.0;
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, safeRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });

        // 17. Draw Particles
        for (let pIdx = particlesRef.current.length - 1; pIdx >= 0; pIdx--) {
          const pt = particlesRef.current[pIdx];
          pt.x += pt.vx * timeScale;
          pt.y += pt.vy * timeScale;
          pt.life += timeScale;
          pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);

          if (pt.alpha <= 0) {
            particlesRef.current.splice(pIdx, 1);
            continue;
          }

          ctx.fillStyle = pt.color;
          ctx.globalAlpha = pt.alpha;
          ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
          ctx.globalAlpha = 1;
        }

        // 18. Draw Ground Baseline & Cyber Skyline
        ctx.fillStyle = '#080417';
        ctx.fillRect(0, VIRTUAL_GROUND_Y, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - VIRTUAL_GROUND_Y);

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, VIRTUAL_GROUND_Y);
        ctx.lineTo(VIRTUAL_WIDTH, VIRTUAL_GROUND_Y);
        ctx.stroke();

        // 19. Draw Defended Cyber Data Cities
        citiesRef.current.forEach((city) => {
          ctx.save();
          if (city.alive) {
            // Neon City Building Hull
            ctx.fillStyle = '#0284C7';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.fillRect(city.x, city.y, city.width, city.height);
            ctx.strokeRect(city.x, city.y, city.width, city.height);

            // Glowing Data Windows
            ctx.fillStyle = '#00F0FF';
            ctx.fillRect(city.x + 4, city.y + 4, city.width - 8, 4);
            ctx.fillStyle = '#FFE600';
            ctx.fillRect(city.x + 4, city.y + 11, city.width - 8, 4);
          } else {
            // Destroyed Rubble
            ctx.fillStyle = '#334155';
            ctx.fillRect(city.x, VIRTUAL_GROUND_Y - 6, city.width, 6);
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(city.x, VIRTUAL_GROUND_Y - 6, city.width, 6);
          }
          ctx.restore();
        });

        // 20. Draw Plasma Shield Barrier Dome (If Active)
        if (shieldRef.current) {
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.arc(VIRTUAL_WIDTH / 2, VIRTUAL_GROUND_Y, VIRTUAL_WIDTH * 0.44, Math.PI, 0);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // 21. Draw Anti-Missile Battery Silos
        batteriesRef.current.forEach((bat) => {
          ctx.save();
          const isSelected = selectedBattery === bat.id || (selectedBattery === 0 && bat.alive);

          if (bat.alive) {
            // Pyramid Fort Base
            ctx.fillStyle = selectedBattery === bat.id ? '#FFE600' : isSelected ? '#D97706' : '#94A3B8';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(bat.x - 22, VIRTUAL_GROUND_Y);
            ctx.lineTo(bat.x, bat.y - 12);
            ctx.lineTo(bat.x + 22, VIRTUAL_GROUND_Y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Turret Cannon Barrel
            ctx.fillStyle = selectedBattery === bat.id ? '#39FF14' : '#FFE600';
            ctx.fillRect(bat.x - 4, bat.y - 20, 8, 12);
            ctx.strokeRect(bat.x - 4, bat.y - 20, 8, 12);

            // Ammo Counter Badge
            ctx.fillStyle = '#000000';
            ctx.fillRect(bat.x - 16, VIRTUAL_GROUND_Y - 8, 32, 12);
            ctx.fillStyle = bat.ammo > 3 ? '#FFE600' : '#FF0055';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${bat.ammo}`, bat.x, VIRTUAL_GROUND_Y + 1);
          } else {
            // Destroyed Silo
            ctx.fillStyle = '#1E293B';
            ctx.beginPath();
            ctx.arc(bat.x, VIRTUAL_GROUND_Y, 14, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.stroke();
          }
          ctx.restore();
        });

        // 22. Draw Floating Combat Badges
        for (let bIdx = badgesRef.current.length - 1; bIdx >= 0; bIdx--) {
          const bd = badgesRef.current[bIdx];
          bd.y += bd.vy * timeScale;
          bd.alpha = Math.max(0, bd.alpha - 0.02 * timeScale);

          if (bd.alpha <= 0) {
            badgesRef.current.splice(bIdx, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = bd.alpha;
          ctx.font = '900 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#000000';
          ctx.fillText(bd.text, bd.x + 1, bd.y + 1);
          ctx.fillStyle = bd.color;
          ctx.fillText(bd.text, bd.x, bd.y);
          ctx.globalAlpha = 1;
          ctx.restore();
        }

        // 23. Custom Digital Targeting Crosshair with Predicted Blast Radius
        if (isPlayingRef.current && !isPausedRef.current) {
          const mx = mousePosRef.current.x;
          const my = mousePosRef.current.y;

          ctx.save();
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 1.8;

          // Blast Radius Ring Guide
          ctx.beginPath();
          ctx.arc(mx, my, 48, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
          ctx.stroke();

          // Digital Reticle
          ctx.strokeStyle = '#00F0FF';
          ctx.beginPath();
          ctx.arc(mx, my, 12, 0, Math.PI * 2);
          ctx.moveTo(mx - 18, my);
          ctx.lineTo(mx - 6, my);
          ctx.moveTo(mx + 6, my);
          ctx.lineTo(mx + 18, my);
          ctx.moveTo(mx, my - 18);
          ctx.lineTo(mx, my - 6);
          ctx.moveTo(mx, my + 6);
          ctx.lineTo(mx, my + 18);
          ctx.stroke();

          // Center Dot
          ctx.fillStyle = '#FFE600';
          ctx.beginPath();
          ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore(); // restore screen shake
        ctx.restore(); // restore viewport clip

        // 24. Draw Crisp Neo-Brutalist Border around the Virtual Screen
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        ctx.restore(); // restore full canvas transform
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    isPaused,
    isWaveIntermission,
    selectedBattery,
    handleGameOver,
    addExplosionParticles,
    addBadge,
    playSfx,
    startWave,
    spawnPowerUp,
    applyPowerUp
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col items-center justify-between bg-portal-bg select-none overflow-hidden font-sans ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-black w-screen h-screen' : 'p-2 sm:p-4'
      }`}
    >
      {/* Top Telemetry Header */}
      <header className="w-full max-w-5xl flex items-center justify-between gap-1.5 sm:gap-2 z-20 shrink-0">
        {/* Score & Multiplier */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-portal-card px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border-2 border-black shadow-neo-sm">
            <Trophy className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-portal-yellow stroke-[2.5]" />
            <span className="text-[10px] sm:text-xs font-black uppercase text-portal-text-muted">SCORE:</span>
            <span className="text-xs sm:text-sm font-black text-portal-yellow tracking-wide">{score}</span>
          </div>

          {comboStreak > 1 && (
            <div className="flex items-center gap-1 bg-portal-pink px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border-2 border-black shadow-neo-sm animate-pulse">
              <Flame className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white stroke-[2.5]" />
              <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">
                {Math.min(10, 1 + (comboStreak - 1) * 0.5).toFixed(1)}x
              </span>
            </div>
          )}

          {/* Active Buff Badges */}
          {shieldActive && (
            <div className="flex items-center gap-1 bg-portal-cyan px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xl border-2 border-black shadow-neo-sm text-black text-[10px] sm:text-[11px] font-black uppercase">
              <Shield className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-current" />
              <span className="hidden sm:inline">SHIELD</span>
            </div>
          )}

          {laserTimeLeft > 0 && (
            <div className="flex items-center gap-1 bg-portal-yellow px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xl border-2 border-black shadow-neo-sm text-black text-[10px] sm:text-[11px] font-black uppercase">
              <Zap className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-current" />
              <span>{laserTimeLeft.toFixed(0)}s</span>
            </div>
          )}

          {slowMoTimeLeft > 0 && (
            <div className="flex items-center gap-1 bg-portal-lime px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xl border-2 border-black shadow-neo-sm text-black text-[10px] sm:text-[11px] font-black uppercase">
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[2.5]" />
              <span>{slowMoTimeLeft.toFixed(0)}s</span>
            </div>
          )}
        </div>

        {/* Sector Wave & Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1 bg-portal-purple px-2 sm:px-2.5 py-1 rounded-xl text-white border-2 border-black text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-neo-sm">
            <Radio className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-portal-cyan stroke-[2.5]" />
            <span>SEC {wave}</span>
          </div>

          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-1 sm:p-1.5 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] text-portal-text transition-all cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-portal-text-muted" /> : <Volume2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-portal-cyan" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1 sm:p-1.5 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] text-portal-text transition-all cursor-pointer"
            title="Toggle Fullscreen [F]"
          >
            {isFullscreen ? <Minimize className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Maximize className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
          </button>
        </div>
      </header>

      {/* Main 2D Canvas Viewport */}
      <div className="relative w-full max-w-5xl flex-1 my-1 sm:my-2 flex items-center justify-center min-h-[260px] sm:min-h-[320px] rounded-2xl overflow-hidden border-3 border-black shadow-neo-lg bg-black touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => handleCanvasAction(e.clientX, e.clientY)}
          onMouseMove={handleMouseMove}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handleCanvasAction(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchMove={handleTouchMove}
          className="w-full h-full cursor-crosshair block select-none touch-none"
        />

        {/* Start / Launch Mission Overlay (Optimized for 9:16 Mobile & Desktop Aspect Ratio) */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 text-center">
            <div className="p-3 sm:p-5 rounded-2xl bg-portal-surface border-3 sm:border-4 border-black shadow-neo-xl max-w-sm sm:max-w-md w-full space-y-2 sm:space-y-3 max-h-[94%] flex flex-col justify-between overflow-y-auto">
              {/* Header Badge & Title */}
              <div className="flex flex-col items-center shrink-0">
                {highScore > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-1 rounded-full bg-portal-yellow/20 border border-portal-yellow text-portal-yellow text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                    <Trophy className="w-2.5 h-2.5 fill-portal-yellow" />
                    <span>RECORD: {highScore.toLocaleString()} PTS</span>
                  </div>
                )}

                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-portal-yellow border-2 sm:border-3 border-black shadow-neo flex items-center justify-center mb-1">
                  <Crosshair className="w-5 h-5 sm:w-8 sm:h-8 text-black stroke-[2.5]" />
                </div>

                <h2 className="text-base sm:text-2xl font-black text-portal-text uppercase tracking-tight">
                  NEON MISSILE DEFENSE
                </h2>
                <p className="text-[9px] sm:text-[11px] font-black text-portal-cyan uppercase tracking-wider">
                  TACTICAL CYBER FLAK SIMULATOR
                </p>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl sm:rounded-2xl bg-portal-bg border-2 border-black">
                <button
                  onClick={() => setMenuTab('intel')}
                  className={`py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                    menuTab === 'intel'
                      ? 'bg-portal-yellow text-black border-2 border-black shadow-neo-sm'
                      : 'text-portal-text-muted hover:text-portal-text'
                  }`}
                >
                  <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>INTEL</span>
                </button>

                <button
                  onClick={() => setMenuTab('arsenal')}
                  className={`py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                    menuTab === 'arsenal'
                      ? 'bg-portal-cyan text-black border-2 border-black shadow-neo-sm'
                      : 'text-portal-text-muted hover:text-portal-text'
                  }`}
                >
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>ARSENAL</span>
                </button>

                <button
                  onClick={() => setMenuTab('controls')}
                  className={`py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                    menuTab === 'controls'
                      ? 'bg-portal-pink text-white border-2 border-black shadow-neo-sm'
                      : 'text-portal-text-muted hover:text-portal-text'
                  }`}
                >
                  <Keyboard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>CONTROLS</span>
                </button>
              </div>

              {/* Tab 1: Tactical Intel */}
              {menuTab === 'intel' && (
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-portal-card border-2 border-black text-left space-y-2 text-xs text-portal-text animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-portal-yellow font-black text-xs">
                    <Target className="w-3.5 h-3.5 text-portal-yellow" />
                    <span className="uppercase">Mission Objective:</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] leading-relaxed text-portal-text-muted">
                    Defend your 6 Cyber Megacores against incoming ballistic warheads across escalating sectors. Tap / click anywhere in the sky to detonate flak clusters.
                  </p>

                  <div className="space-y-1 pt-1.5 border-t border-portal-border">
                    <span className="text-[9px] sm:text-[10px] font-black text-portal-cyan uppercase tracking-wider">THREAT PROFILES:</span>
                    <div className="grid grid-cols-2 gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono">
                      <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center gap-1 sm:gap-1.5">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-portal-pink animate-pulse shrink-0" />
                        <span className="text-portal-text font-bold truncate">ICBM Heavy</span>
                      </div>
                      <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center gap-1 sm:gap-1.5">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-400 shrink-0" />
                        <span className="text-portal-text font-bold truncate">MIRV Cluster</span>
                      </div>
                      <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center gap-1 sm:gap-1.5">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-portal-yellow shrink-0" />
                        <span className="text-portal-text font-bold truncate">Hypersonic</span>
                      </div>
                      <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center gap-1 sm:gap-1.5">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-portal-green shrink-0" />
                        <span className="text-portal-text font-bold truncate">Stealth Cruise</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Defense Arsenal & Power-Ups */}
              {menuTab === 'arsenal' && (
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-portal-card border-2 border-black text-left space-y-1.5 sm:space-y-2 text-xs text-portal-text animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-portal-cyan font-black text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-portal-cyan" />
                    <span className="uppercase">Tactical Superweapons & Pods:</span>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-[11px]">
                    <div className="flex items-start gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border">
                      <Shield className="w-3.5 h-3.5 text-portal-cyan shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black text-portal-cyan">QUANTUM SHIELD:</span>
                        <p className="text-[9px] sm:text-[10px] text-portal-text-muted">Total ground invulnerability absorbing warhead impacts.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border">
                      <Zap className="w-3.5 h-3.5 text-portal-yellow shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black text-portal-yellow">CIWS LASER GRID:</span>
                        <p className="text-[9px] sm:text-[10px] text-portal-text-muted">Automated laser turrets vaporize nearby incoming threats.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border">
                      <Clock className="w-3.5 h-3.5 text-portal-green shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black text-portal-green">CHRONO MATRIX:</span>
                        <p className="text-[9px] sm:text-[10px] text-portal-text-muted">Dilates time by 50% for maximum interception precision.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border">
                      <Bomb className="w-3.5 h-3.5 text-portal-pink shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black text-portal-pink">ORBITAL EMP NUKE [SPACE]:</span>
                        <p className="text-[9px] sm:text-[10px] text-portal-text-muted">Tactical screen-clearing blast neutralizing all threats.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Controls & Keybindings */}
              {menuTab === 'controls' && (
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-portal-card border-2 border-black text-left space-y-1.5 sm:space-y-2 text-xs text-portal-text animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-portal-pink font-black text-xs">
                    <Keyboard className="w-3.5 h-3.5 text-portal-pink" />
                    <span className="uppercase">Tactical Command Bindings:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-mono">
                    <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center justify-between">
                      <span className="text-portal-text-muted">Target & Flak</span>
                      <span className="font-black text-portal-yellow">CLICK / TAP</span>
                    </div>
                    <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center justify-between">
                      <span className="text-portal-text-muted">EMP Orbital Nuke</span>
                      <span className="font-black text-portal-pink">[SPACE] / NUKE BTN</span>
                    </div>
                    <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center justify-between">
                      <span className="text-portal-text-muted">Auto Silo Routing</span>
                      <span className="font-black text-portal-cyan">[0] AUTO</span>
                    </div>
                    <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center justify-between">
                      <span className="text-portal-text-muted">Manual Silos</span>
                      <span className="font-black text-portal-text">[1] [2] [3]</span>
                    </div>
                    <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center justify-between">
                      <span className="text-portal-text-muted">Reboot / Engage</span>
                      <span className="font-black text-portal-green">[R]</span>
                    </div>
                    <div className="p-1 sm:p-1.5 rounded-lg bg-portal-bg border border-portal-border flex items-center justify-between">
                      <span className="text-portal-text-muted">Mute / Fullscreen</span>
                      <span className="font-black text-portal-text">[M] / [F]</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={startNewGame}
                className="w-full py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-portal-yellow hover:bg-yellow-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-x-1 active:translate-y-1"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black stroke-black" />
                <span>ENGAGE DEFENSE GRID</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 text-center">
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-portal-surface border-3 sm:border-4 border-black shadow-neo-xl max-w-md w-full space-y-3.5 sm:space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-portal-pink border-3 border-black shadow-neo flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 sm:w-9 sm:h-9 text-white stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-portal-text uppercase tracking-tight">DEFENSE BREACHED</h2>
                <p className="text-[11px] sm:text-xs font-black text-portal-pink uppercase tracking-wider mt-0.5">
                  ALL CYBER MEGACORES OFFLINE
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-portal-card border-2 border-black">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-portal-text-muted">FINAL SCORE</span>
                  <span className="text-lg sm:text-xl font-black text-portal-yellow">{score}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-portal-text-muted">SECTOR REACHED</span>
                  <span className="text-lg sm:text-xl font-black text-portal-cyan">{wave}</span>
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="w-full py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-portal-yellow hover:bg-yellow-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-x-1 active:translate-y-1"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                <span>REBOOT DEFENSE GRID [R]</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tactical Battery Ammo & Super Weapon Command Bar */}
      <footer className="w-full max-w-5xl grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 z-20 shrink-0">
        {/* Smart AUTO Silo Selector */}
        <button
          onClick={() => setSelectedBattery(0)}
          className={`p-1.5 sm:p-2 rounded-xl border-2 border-black shadow-neo-sm flex flex-col sm:flex-row items-center justify-between transition-all cursor-pointer ${
            selectedBattery === 0 ? 'bg-portal-cyan text-black' : 'bg-portal-card text-portal-text'
          }`}
          title="Smart Auto-Routing: Closest available silo with ammo"
        >
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[2.5]" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">AUTO</span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-black">ON</span>
        </button>

        {/* Battery 1: ALPHA */}
        <button
          onClick={() => setSelectedBattery(1)}
          className={`p-1.5 sm:p-2 rounded-xl border-2 border-black shadow-neo-sm flex flex-col sm:flex-row items-center justify-between transition-all cursor-pointer ${
            selectedBattery === 1 ? 'bg-portal-yellow text-black' : 'bg-portal-card text-portal-text'
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">ALPHA</span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-black">{batteryAmmo.b1}</span>
        </button>

        {/* Battery 2: DELTA (CENTER) */}
        <button
          onClick={() => setSelectedBattery(2)}
          className={`p-1.5 sm:p-2 rounded-xl border-2 border-black shadow-neo-sm flex flex-col sm:flex-row items-center justify-between transition-all cursor-pointer ${
            selectedBattery === 2 ? 'bg-portal-yellow text-black' : 'bg-portal-card text-portal-text'
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">DELTA</span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-black">{batteryAmmo.b2}</span>
        </button>

        {/* Battery 3: OMEGA */}
        <button
          onClick={() => setSelectedBattery(3)}
          className={`p-1.5 sm:p-2 rounded-xl border-2 border-black shadow-neo-sm flex flex-col sm:flex-row items-center justify-between transition-all cursor-pointer ${
            selectedBattery === 3 ? 'bg-portal-yellow text-black' : 'bg-portal-card text-portal-text'
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">OMEGA</span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-black">{batteryAmmo.b3}</span>
        </button>

        {/* Super Weapon: EMP Tactical Nuke */}
        <button
          onClick={triggerNuke}
          disabled={nukeCharges <= 0 || !isPlaying}
          className={`col-span-4 sm:col-span-1 p-1.5 sm:p-2 rounded-xl border-2 border-black shadow-neo-sm flex items-center justify-between transition-all ${
            nukeCharges > 0 && isPlaying
              ? 'bg-portal-pink hover:bg-pink-400 text-white cursor-pointer active:translate-x-1 active:translate-y-1'
              : 'bg-portal-surface text-portal-text-muted cursor-not-allowed border-black opacity-60'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-current stroke-current" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">EMP NUKE</span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-black">{nukeCharges}x</span>
        </button>
      </footer>
    </div>
  );
}
