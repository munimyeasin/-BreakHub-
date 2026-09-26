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
  Zap
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

type ThreatType = 'standard' | 'mirv' | 'hypersonic' | 'bomber_drop';

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
  const [selectedBattery, setSelectedBattery] = useState<number>(2); // 1 = Alpha, 2 = Delta (Center), 3 = Omega

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

  // Entity Collections
  const batteriesRef = useRef<Battery[]>([]);
  const citiesRef = useRef<City[]>([]);
  const enemiesRef = useRef<EnemyMissile[]>([]);
  const interceptorsRef = useRef<Interceptor[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const bombersRef = useRef<Bomber[]>([]);
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
      audioCtxRef.current.resume();
    }
  }, []);

  const playSfx = useCallback((type: 'launch' | 'explode' | 'chain' | 'mirv' | 'nuke' | 'alarm' | 'victory' | 'lost' | 'gameover') => {
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

  // Launch Player Interceptor Missile
  const launchInterceptor = useCallback((targetX: number, targetY: number, preferredBatteryId?: number) => {
    if (!isPlayingRef.current || isPausedRef.current) return;

    if (targetY > VIRTUAL_GROUND_Y - 10) {
      targetY = VIRTUAL_GROUND_Y - 10; // Prevent targeting below ground baseline
    }

    const activeBatteries = batteriesRef.current.filter((b) => b.alive && b.ammo > 0);
    if (activeBatteries.length === 0) return;

    let selected: Battery | undefined;

    if (preferredBatteryId) {
      selected = activeBatteries.find((b) => b.id === preferredBatteryId);
    }

    // Auto-select nearest operational battery if preferred is unavailable or not specified
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
      speed: 16.5,
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
    screenShakeRef.current = 16;

    explosionsRef.current.push({
      id: idCounterRef.current++,
      x: VIRTUAL_WIDTH / 2,
      y: VIRTUAL_HEIGHT / 2,
      radius: 5,
      maxRadius: 750,
      color: '#00F0FF',
      expanding: true,
      alive: true,
      isNuke: true,
      isPlayerFlak: true
    });

    addBadge(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.35, '⚡ ORBITAL EMP BLAST CLEARED AIRSPACE! ⚡', '#00F0FF');
    playSfx('nuke');
  }, [playSfx, addBadge]);

  // Start New Sector Wave
  const startWave = useCallback((waveNum: number) => {
    waveRef.current = waveNum;
    setWave(waveNum);
    setIsWaveIntermission(false);

    // Calculate wave threat quotas
    waveEnemyCountRef.current = 12 + waveNum * 4;
    waveEnemiesSpawnedRef.current = 0;
    spawnIntervalRef.current = Math.max(380, 1100 - waveNum * 65);

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
      addBadge(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.45, '+1 ORBITAL EMP NUKE CHARGE ARMED!', '#FFE600');
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

    enemiesRef.current = [];
    interceptorsRef.current = [];
    explosionsRef.current = [];
    bombersRef.current = [];
    badgesRef.current = [];
    particlesRef.current = [];

    setScore(0);
    setNukeCharges(1);
    setComboStreak(0);
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
    screenShakeRef.current = 14;

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

      if (k === '1') {
        setSelectedBattery(1);
      } else if (k === '2') {
        setSelectedBattery(2);
      } else if (k === '3') {
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

  // Handle Canvas Click & Touch
  const handleCanvasAction = useCallback((clientX: number, clientY: number) => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    const { x, y } = getVirtualCoords(clientX, clientY);
    launchInterceptor(x, y, selectedBattery);
  }, [getVirtualCoords, launchInterceptor, selectedBattery]);

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
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;
      const timeScale = dt * 60;

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
        ctx.fillStyle = '#060214';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // Radar Scanning Sweep Arc
        radarAngleRef.current = (radarAngleRef.current + 0.015 * timeScale) % (Math.PI * 2);
        const centerRadarX = VIRTUAL_WIDTH / 2;
        const centerRadarY = VIRTUAL_GROUND_Y;

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerRadarX, centerRadarY, VIRTUAL_HEIGHT * 0.45, Math.PI, 0, false);
        ctx.arc(centerRadarX, centerRadarY, VIRTUAL_HEIGHT * 0.75, Math.PI, 0, false);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radar Sweep Line
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.beginPath();
        ctx.moveTo(centerRadarX, centerRadarY);
        ctx.lineTo(
          centerRadarX + Math.cos(radarAngleRef.current) * VIRTUAL_HEIGHT * 0.8,
          centerRadarY - Math.abs(Math.sin(radarAngleRef.current)) * VIRTUAL_HEIGHT * 0.8
        );
        ctx.stroke();

        // Stars & Background Matrix
        ctx.fillStyle = 'rgba(255, 230, 0, 0.4)';
        for (let i = 1; i <= 25; i++) {
          const sx = (i * 137.5) % VIRTUAL_WIDTH;
          const sy = (i * 73.1) % (VIRTUAL_HEIGHT * 0.65);
          ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        if (isPlayingRef.current && !isPausedRef.current) {
          // 2. SPAWN LOGIC
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
            let speed = (Math.random() * 0.6 + 0.95) * (1 + (currentWave - 1) * 0.1);
            let color = '#FF0055';
            let trailColor = 'rgba(255, 0, 85, 0.45)';
            let scoreVal = 100;

            if (currentWave >= 2 && rand < 0.28) {
              threatType = 'mirv';
              color = '#FF00EA';
              trailColor = 'rgba(255, 0, 234, 0.5)';
              speed *= 0.9;
              scoreVal = 250;
            } else if (currentWave >= 3 && rand > 0.78) {
              threatType = 'hypersonic';
              color = '#FFE600';
              trailColor = 'rgba(255, 230, 0, 0.6)';
              speed *= 1.55;
              scoreVal = 300;
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
              splitY: threatType === 'mirv' ? Math.random() * (VIRTUAL_HEIGHT * 0.35) + VIRTUAL_HEIGHT * 0.2 : undefined
            });
          }

          // 3. SPAWN BOMBER (Sector 4+)
          if (currentWave >= 4 && bombersRef.current.length === 0 && Math.random() < 0.004 * timeScale) {
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
            if (timestamp - bomber.lastBombTime > 1800) {
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

          // 4. UPDATE INTERCEPTORS
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
                maxRadius: 46,
                color: '#00F0FF',
                expanding: true,
                alive: true,
                isPlayerFlak: true
              });
              addExplosionParticles(ic.targetX, ic.targetY, '#00F0FF', 14);
              playSfx('explode');
              interceptorsRef.current.splice(i, 1);
            }
          }

          // 5. UPDATE EXPLOSIONS & FLAK CHAIN REACTIONS
          for (let eIdx = explosionsRef.current.length - 1; eIdx >= 0; eIdx--) {
            const exp = explosionsRef.current[eIdx];

            if (exp.expanding) {
              exp.radius += (exp.isNuke ? 18.0 : 2.4) * timeScale;
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
                  maxRadius: 36,
                  color: '#FFE600',
                  expanding: true,
                  alive: true,
                  isPlayerFlak: false
                });

                addExplosionParticles(m.currentX, m.currentY, '#FFE600', 16);

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

                addBadge(m.currentX, m.currentY - 10, `+${pointsEarned}`, streak > 2 ? '#FF00EA' : '#FFE600');
                playSfx(streak > 2 ? 'chain' : 'explode');

                enemiesRef.current.splice(mIdx, 1);
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

                  scoreRef.current += 500;
                  setScore(scoreRef.current);
                  addBadge(bomber.x, bomber.y, '+500 BOMBER DOWN!', '#FF0055');
                  playSfx('explode');
                  bombersRef.current.splice(bIdx, 1);
                }
              }
            }
          }

          // 6. UPDATE HOSTILE MISSILES & GROUND IMPACTS
          for (let mIdx = enemiesRef.current.length - 1; mIdx >= 0; mIdx--) {
            const m = enemiesRef.current[mIdx];
            const dx = m.targetX - m.startX;
            const dy = m.targetY - m.startY;
            const totalDist = Math.hypot(dx, dy);

            m.progress += (m.speed * timeScale) / totalDist;
            m.currentX = m.startX + dx * m.progress;
            m.currentY = m.startY + dy * m.progress;

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

          // 7. CHECK SECTOR WAVE COMPLETION
          if (
            waveEnemiesSpawnedRef.current >= waveEnemyCountRef.current &&
            enemiesRef.current.length === 0 &&
            bombersRef.current.length === 0 &&
            !isWaveIntermission
          ) {
            setIsWaveIntermission(true);

            // Calculate Ammo & City Bonuses
            let totalRemainingAmmo = 0;
            batteriesRef.current.forEach((b) => (totalRemainingAmmo += b.ammo));
            const liveCityCount = citiesRef.current.filter((c) => c.alive).length;

            const ammoBonus = totalRemainingAmmo * 15;
            const cityBonus = liveCityCount * 200;
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

        // 8. Draw Hostile Missile Vapor Trails & Warheads
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

        // 9. Draw Orbital Bomber Gunships
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

        // 10. Draw Interceptor Vapor Trails
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

        // 11. Draw Concentric Flak Shockwave Explosions
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

        // 12. Draw Particles
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

        // 13. Draw Ground Baseline & Cyber Skyline
        ctx.fillStyle = '#080417';
        ctx.fillRect(0, VIRTUAL_GROUND_Y, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - VIRTUAL_GROUND_Y);

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, VIRTUAL_GROUND_Y);
        ctx.lineTo(VIRTUAL_WIDTH, VIRTUAL_GROUND_Y);
        ctx.stroke();

        // 14. Draw Defended Cyber Data Cities
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

        // 15. Draw Anti-Missile Battery Silos
        batteriesRef.current.forEach((bat) => {
          ctx.save();
          const isSelected = selectedBattery === bat.id;

          if (bat.alive) {
            // Pyramid Fort Base
            ctx.fillStyle = isSelected ? '#FFE600' : '#D97706';
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
            ctx.fillStyle = isSelected ? '#39FF14' : '#FFE600';
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

        // 16. Draw Floating Combat Badges
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

        // 17. Custom Digital Targeting Crosshair
        if (isPlayingRef.current && !isPausedRef.current) {
          const mx = mousePosRef.current.x;
          const my = mousePosRef.current.y;

          ctx.save();
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 1.8;

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

        // 18. Draw Crisp Neo-Brutalist Border around the Virtual Screen
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        ctx.restore(); // restore full canvas transform
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isPaused, isWaveIntermission, selectedBattery, handleGameOver, addExplosionParticles, addBadge, playSfx, startWave]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col items-center justify-between bg-portal-bg select-none overflow-hidden font-sans ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-black w-screen h-screen' : 'p-2 sm:p-4'
      }`}
    >
      {/* Top Telemetry Header */}
      <header className="w-full max-w-5xl flex items-center justify-between gap-2 z-20 shrink-0">
        {/* Score & Multiplier */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-portal-card px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-sm">
            <Trophy className="w-4 h-4 text-portal-yellow stroke-[2.5]" />
            <span className="text-xs font-black uppercase text-slate-300">SCORE:</span>
            <span className="text-sm font-black text-portal-yellow tracking-wide">{score}</span>
          </div>

          {comboStreak > 1 && (
            <div className="flex items-center gap-1 bg-portal-pink px-2.5 py-1 rounded-xl border-2 border-black shadow-neo-sm animate-pulse">
              <Flame className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                {Math.min(10, 1 + (comboStreak - 1) * 0.5).toFixed(1)}x COMBO
              </span>
            </div>
          )}
        </div>

        {/* Sector Wave & Ammo Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 bg-portal-purple px-2.5 py-1 rounded-xl text-white border-2 border-black text-xs font-black uppercase tracking-wider shadow-neo-sm">
            <Radio className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
            <span>SECTOR {wave}</span>
          </div>

          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-1.5 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] text-white transition-all cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-portal-cyan" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] text-white transition-all cursor-pointer"
            title="Toggle Fullscreen [F]"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main 2D Canvas Viewport */}
      <div className="relative w-full max-w-5xl flex-1 my-1 sm:my-2 flex items-center justify-center min-h-[300px] rounded-2xl overflow-hidden border-3 border-black shadow-neo-lg bg-black">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => handleCanvasAction(e.clientX, e.clientY)}
          onMouseMove={handleMouseMove}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handleCanvasAction(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          className="w-full h-full cursor-crosshair block select-none"
        />

        {/* Start / Launch Mission Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="p-4 sm:p-6 rounded-3xl bg-portal-surface border-4 border-black shadow-neo-xl max-w-md w-full space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-portal-yellow border-3 border-black shadow-neo flex items-center justify-center mx-auto">
                <Crosshair className="w-9 h-9 text-black stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  NEON MISSILE DEFENSE
                </h2>
                <p className="text-xs font-black text-portal-cyan uppercase tracking-wider mt-1">
                  CYBER COMMAND FLAK ARTILLERY SIMULATOR
                </p>
              </div>

              <div className="p-3 rounded-xl bg-portal-card border-2 border-black text-left space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-portal-yellow font-black">
                  <Target className="w-4 h-4 text-portal-yellow" />
                  <span>MISSION OBJECTIVE:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Defend your 6 Cyber Megacores against incoming ballistic warheads, MIRV cluster bombs, and hypersonic rockets.
                </p>
                <div className="text-[10px] font-mono text-slate-400 space-y-1 pt-1 border-t border-slate-700">
                  <p>• CLICK / TAP anywhere to detonate flak shockwaves</p>
                  <p>• CHAIN REACTION: Enemies touching flak will detonate secondary blasts!</p>
                  <p>• [SPACE] to fire Orbital EMP Tactical Nuke</p>
                  <p>• [F] Fullscreen toggle with 0 distortion</p>
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="w-full py-3.5 px-6 rounded-2xl bg-portal-yellow hover:bg-yellow-300 text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-black stroke-black" />
                <span>ENGAGE DEFENSE GRID [R]</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="p-4 sm:p-6 rounded-3xl bg-portal-surface border-4 border-black shadow-neo-xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-portal-pink border-3 border-black shadow-neo flex items-center justify-center mx-auto">
                <AlertTriangle className="w-9 h-9 text-white stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">DEFENSE BREACHED</h2>
                <p className="text-xs font-black text-portal-pink uppercase tracking-wider mt-1">
                  ALL CYBER MEGACORES OFFLINE
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-portal-card border-2 border-black">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">FINAL SCORE</span>
                  <span className="text-xl font-black text-portal-yellow">{score}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">SECTOR REACHED</span>
                  <span className="text-xl font-black text-portal-cyan">{wave}</span>
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="w-full py-3.5 px-6 rounded-2xl bg-portal-yellow hover:bg-yellow-300 text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                <span>REBOOT DEFENSE GRID [R]</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tactical Battery Ammo & Super Weapon Command Bar */}
      <footer className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-4 gap-2 z-20 shrink-0">
        {/* Battery 1: ALPHA */}
        <button
          onClick={() => setSelectedBattery(1)}
          className={`p-2 rounded-xl border-2 border-black shadow-neo-sm flex items-center justify-between transition-all cursor-pointer ${
            selectedBattery === 1 ? 'bg-portal-yellow text-black' : 'bg-portal-card text-white'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider">[1] ALPHA</span>
          </div>
          <span className="text-xs font-mono font-black">{batteryAmmo.b1} RDS</span>
        </button>

        {/* Battery 2: DELTA (CENTER) */}
        <button
          onClick={() => setSelectedBattery(2)}
          className={`p-2 rounded-xl border-2 border-black shadow-neo-sm flex items-center justify-between transition-all cursor-pointer ${
            selectedBattery === 2 ? 'bg-portal-yellow text-black' : 'bg-portal-card text-white'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider">[2] DELTA</span>
          </div>
          <span className="text-xs font-mono font-black">{batteryAmmo.b2} RDS</span>
        </button>

        {/* Battery 3: OMEGA */}
        <button
          onClick={() => setSelectedBattery(3)}
          className={`p-2 rounded-xl border-2 border-black shadow-neo-sm flex items-center justify-between transition-all cursor-pointer ${
            selectedBattery === 3 ? 'bg-portal-yellow text-black' : 'bg-portal-card text-white'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider">[3] OMEGA</span>
          </div>
          <span className="text-xs font-mono font-black">{batteryAmmo.b3} RDS</span>
        </button>

        {/* Super Weapon: EMP Tactical Nuke */}
        <button
          onClick={triggerNuke}
          disabled={nukeCharges <= 0 || !isPlaying}
          className={`p-2 rounded-xl border-2 border-black shadow-neo-sm flex items-center justify-between transition-all ${
            nukeCharges > 0 && isPlaying
              ? 'bg-portal-cyan hover:bg-cyan-300 text-black cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-current stroke-current" />
            <span className="text-[10px] font-black uppercase tracking-wider">[SPACE] EMP NUKE</span>
          </div>
          <span className="text-xs font-mono font-black">{nukeCharges}x</span>
        </button>
      </footer>
    </div>
  );
}
