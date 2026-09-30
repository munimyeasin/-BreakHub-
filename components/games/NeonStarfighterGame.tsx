'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Rocket,
  Zap,
  Shield,
  Sparkles,
  AlertTriangle,
  Tv,
  AlertCircle,
  Flame,
  Crosshair,
  Maximize2,
  Minimize2,
  Smartphone,
  RotateCw,
  Bomb,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NeonStarfighterGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type StarfighterDifficulty = 'cadet' | 'ace' | 'nightmare';

export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  isSpread?: boolean;
}

export const DIFFICULTY_CONFIGS: Record<StarfighterDifficulty, {
  name: string;
  tag: string;
  description: string;
  color: string;
  badgeBg: string;
  scoreMultiplier: number;
  enemySpeedMultiplier: number;
  enemySpawnRateMs: { base: number; min: number; waveReduction: number };
  enemyShootCadenceMs: { scout: number; heavy: number; drone?: number };
  bulletSpeed: number;
  meteorCadenceMs: number;
  blackHoleCadenceMs: number;
  enemyHp: { drone: number; scout: number; heavy: number };
}> = {
  cadet: {
    name: 'CADET',
    tag: 'NORMAL',
    description: 'Standard patrol waves & steady hazards.',
    color: '#00F0FF',
    badgeBg: 'bg-portal-cyan text-black',
    scoreMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    enemySpawnRateMs: { base: 800, min: 450, waveReduction: 25 },
    enemyShootCadenceMs: { scout: 0, heavy: 2800 },
    bulletSpeed: 3.8,
    meteorCadenceMs: 2600,
    blackHoleCadenceMs: 5500,
    enemyHp: { drone: 1, scout: 2, heavy: 4 },
  },
  ace: {
    name: 'ACE',
    tag: 'HARD',
    description: 'High-speed combat. Scouts & Heavies fire targeted laser salvos.',
    color: '#FFE600',
    badgeBg: 'bg-portal-yellow text-black',
    scoreMultiplier: 1.5,
    enemySpeedMultiplier: 1.35,
    enemySpawnRateMs: { base: 550, min: 280, waveReduction: 35 },
    enemyShootCadenceMs: { scout: 2000, heavy: 1400 },
    bulletSpeed: 4.8,
    meteorCadenceMs: 2000,
    blackHoleCadenceMs: 4200,
    enemyHp: { drone: 1, scout: 3, heavy: 6 },
  },
  nightmare: {
    name: 'NIGHTMARE',
    tag: 'BULLET HELL',
    description: 'Relentless aimed spread lasers, armored swarms & intense gravity.',
    color: '#FF0055',
    badgeBg: 'bg-portal-pink text-white animate-pulse',
    scoreMultiplier: 2.5,
    enemySpeedMultiplier: 1.65,
    enemySpawnRateMs: { base: 380, min: 180, waveReduction: 45 },
    enemyShootCadenceMs: { scout: 1200, heavy: 850, drone: 2400 },
    bulletSpeed: 6.0,
    meteorCadenceMs: 1500,
    blackHoleCadenceMs: 3200,
    enemyHp: { drone: 2, scout: 4, heavy: 8 },
  },
};

const DESKTOP_WIDTH = 960; // 16:9 Widescreen Landscape for PC/Desktop (960x540)
const DESKTOP_HEIGHT = 540;
const MOBILE_WIDTH = 450;  // 9:16 Portrait for Mobile Screens (450x800)
const MOBILE_HEIGHT = 800;

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
  sideColor: string;
  type: 'drone' | 'scout' | 'heavy';
  rotation: number;
  lastShotTime?: number;
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
  isHyper?: boolean;
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

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface ActionBadge {
  x: number;
  y: number;
  text: string;
  alpha: number;
  scale: number;
  vy: number;
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<StarfighterDifficulty>('ace');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activePowerup, setActivePowerup] = useState<string | null>(null);
  const [adNotice, setAdNotice] = useState<string | null>(null);
  const [hasRevived, setHasRevived] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBoostActive, setIsBoostActive] = useState(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false);

  // Reference to game container for Web Fullscreen API
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pure refs for 60-144+ FPS game loop (zero React reconciliation lag)
  const difficultyRef = useRef<StarfighterDifficulty>('ace');
  const soundEnabledRef = useRef(true);
  const onGameOverRef = useRef(onGameOver);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const activePowerupRef = useRef<string | null>(null);
  const lastSyncedPowerupRef = useRef<string | null>(null);
  const hasRevivedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warpGridOffsetRef = useRef(0);

  // Synchronize fullscreen state across standard and vendor prefixes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFull = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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

  // Pre-allocated Starfield with Warp Depth
  const starsRef = useRef<Star[]>(
    Array.from({ length: 80 }, () => ({
      x: Math.random() * DESKTOP_WIDTH,
      y: Math.random() * MOBILE_HEIGHT,
      size: Math.random() > 0.8 ? 2.5 : Math.random() > 0.4 ? 1.5 : 1.0,
      speed: Math.random() * 2.8 + 1.2,
      color: Math.random() > 0.65 ? '#00F0FF' : Math.random() > 0.4 ? '#FF70D9' : Math.random() > 0.2 ? '#FFE600' : '#FFFFFF',
    }))
  );

  // Dynamic responsive resolution state and ref
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 768 || window.innerWidth > window.innerHeight;
    return true;
  });

  const canvasDimRef = useRef({
    width: typeof window !== 'undefined' && (window.innerWidth >= 768 || window.innerWidth > window.innerHeight) ? DESKTOP_WIDTH : MOBILE_WIDTH,
    height: typeof window !== 'undefined' && (window.innerWidth >= 768 || window.innerWidth > window.innerHeight) ? DESKTOP_HEIGHT : MOBILE_HEIGHT,
    playerBaseY: (typeof window !== 'undefined' && (window.innerWidth >= 768 || window.innerWidth > window.innerHeight) ? DESKTOP_HEIGHT : MOBILE_HEIGHT) - 75,
    isDesktop: typeof window !== 'undefined' ? (window.innerWidth >= 768 || window.innerWidth > window.innerHeight) : true,
  });

  // Synchronize dynamic canvas dimensions and orientation on window resize and orientation change
  useEffect(() => {
    const updateLayoutAndOrientation = () => {
      if (typeof window === 'undefined') return;
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 850;
      const isPortrait = window.innerHeight > window.innerWidth;
      const portraitMobile = isTouch && isPortrait && window.innerWidth < 768;
      setIsPortraitMobile(portraitMobile);

      const desktop = window.innerWidth >= 768 || window.innerWidth > window.innerHeight;
      setIsDesktop(desktop);
      const w = desktop ? DESKTOP_WIDTH : MOBILE_WIDTH;
      const h = desktop ? DESKTOP_HEIGHT : MOBILE_HEIGHT;
      canvasDimRef.current = {
        width: w,
        height: h,
        playerBaseY: h - 75,
        isDesktop: desktop,
      };

      // Clamp player into bounds
      const p = playerRef.current;
      p.y = h - 75;
      p.x = Math.max(0, Math.min(w - p.width, p.x));
    };

    updateLayoutAndOrientation();
    window.addEventListener('resize', updateLayoutAndOrientation);
    window.addEventListener('orientationchange', updateLayoutAndOrientation);
    return () => {
      window.removeEventListener('resize', updateLayoutAndOrientation);
      window.removeEventListener('orientationchange', updateLayoutAndOrientation);
    };
  }, []);

  // Player 3D Interceptor Starfighter state
  const playerRef = useRef({
    x: DESKTOP_WIDTH / 2 - 20,
    y: DESKTOP_HEIGHT - 75,
    width: 40,
    height: 42,
    speed: 10,
    roll: 0,
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
  const shockwavesRef = useRef<Shockwave[]>([]);
  const actionBadgesRef = useRef<ActionBadge[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef(0);

  const keysRef = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    boost: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  });

  const lastShotTimeRef = useRef(0);
  const lastSpawnEnemyTimeRef = useRef(0);
  const lastSpawnMeteorTimeRef = useRef(0);
  const lastSpawnBlackHoleTimeRef = useRef(0);
  const lastSpawnPowerupTimeRef = useRef(0);
  const lastScoreSyncTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const missionStartTimeRef = useRef(0);
  const [currentSpeedMult, setCurrentSpeedMult] = useState<number>(1.0);
  const [inventory, setInventory] = useState<PowerupType[]>([]);
  const inventoryRef = useRef<PowerupType[]>([]);

  // Tactical Powerup Activation Callback (On-demand hotkey & UI trigger)
  const activatePowerup = useCallback((slotIndex: number) => {
    if (!isPlayingRef.current || isDeadRef.current) return;
    if (slotIndex < 0 || slotIndex >= inventoryRef.current.length) return;
    const type = inventoryRef.current[slotIndex];
    inventoryRef.current.splice(slotIndex, 1);
    setInventory([...inventoryRef.current]);

    const p = playerRef.current;
    if (type === 'spread') {
      p.tripleShotTimer = 420;
      activePowerupRef.current = 'TRIPLE SPREAD LASER';
      setActivePowerup('TRIPLE SPREAD LASER');
      addActionBadge(p.x + p.width / 2, p.y - 20, 'TRIPLE LASERS ACTIVATED!');
      playSfxRef.current('powerup');
    } else if (type === 'shield') {
      p.hasShield = true;
      activePowerupRef.current = 'ENERGY SHIELD';
      setActivePowerup('ENERGY SHIELD');
      addActionBadge(p.x + p.width / 2, p.y - 20, 'ENERGY SHIELD ONLINE!');
      playSfxRef.current('powerup');
    } else if (type === 'nuke') {
      activePowerupRef.current = 'EMP NUKE BLAST';
      setActivePowerup('EMP NUKE BLAST');
      triggerNuke();
    } else if (type === 'hyper') {
      p.hyperTimer = 340;
      activePowerupRef.current = 'HYPERDRIVE OVERDRIVE';
      setActivePowerup('HYPERDRIVE OVERDRIVE');
      addActionBadge(p.x + p.width / 2, p.y - 20, 'HYPERDRIVE ENGAGED!');
      playSfxRef.current('hyper_start');
    }
  }, []);

  const activatePowerupRef = useRef(activatePowerup);
  activatePowerupRef.current = activatePowerup;

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

  const playSfx = useCallback((type: 'laser' | 'spread' | 'hyper_laser' | 'boom' | 'shield_hit' | 'powerup' | 'nuke' | 'deflect' | 'hyper_start') => {
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
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'hyper_laser') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'spread') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1150, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.06);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'boom') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(22, now + 0.22);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'shield_hit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.12);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'powerup' || type === 'hyper_start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(1050, now + 0.18);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'nuke') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 0.38);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'deflect') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.035);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.035);
        osc.start(now);
        osc.stop(now + 0.035);
      }
    } catch {}
  }, [initAudioCtx]);

  const playSfxRef = useRef(playSfx);
  useEffect(() => {
    playSfxRef.current = playSfx;
  }, [playSfx]);

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    if (floatingTextsRef.current.length > 8) floatingTextsRef.current.shift();
    floatingTextsRef.current.push({ x, y, text, color, alpha: 1, vy: -1.6 });
  };

  const addActionBadge = (x: number, y: number, text: string) => {
    if (actionBadgesRef.current.length > 3) actionBadgesRef.current.shift();
    actionBadgesRef.current.push({ x, y, text, alpha: 1, scale: 0.6, vy: -0.8 });
  };

  const addShockwave = (x: number, y: number, color = '#FF007F', maxRadius = 32) => {
    if (shockwavesRef.current.length > 6) shockwavesRef.current.shift();
    shockwavesRef.current.push({ x, y, radius: 4, maxRadius, color, alpha: 1 });
  };

  const createMeteor = (speedScale = 1.0): Meteor => {
    const radius = Math.random() * 14 + 16;
    const numPoints = 7;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const dist = radius * (0.8 + Math.random() * 0.4);
      points.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    }
    const curW = canvasDimRef.current.width;
    return {
      x: Math.random() * (curW - 60) + 30,
      y: -35,
      radius,
      vy: (Math.random() * 1.2 + 1.8) * speedScale,
      vx: (Math.random() - 0.5) * 1.0 * speedScale,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.035 * speedScale,
      points,
    };
  };

  const createBlackHole = (speedScale = 1.0): BlackHole => {
    const curW = canvasDimRef.current.width;
    return {
      x: Math.random() * (curW - 120) + 60,
      y: -45,
      radius: 20,
      pullRadius: Math.min(170, 135 + (speedScale - 1) * 30),
      vy: 1.2 * speedScale,
      angle: 0,
    };
  };

  const triggerNuke = () => {
    const curW = canvasDimRef.current.width;
    const curH = canvasDimRef.current.height;
    playSfx('nuke');
    screenShakeRef.current = 16;
    addShockwave(curW / 2, curH / 2, '#FF00EA', 120);

    enemiesRef.current.forEach((enemy) => {
      scoreRef.current += 150;
      addShockwave(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 28);
      for (let k = 0; k < 6; k++) {
        if (particlesRef.current.length < 40) {
          particlesRef.current.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            alpha: 1,
            color: enemy.color,
            size: 2.8,
            life: 0,
            maxLife: 20,
          });
        }
      }
    });
    enemiesRef.current = [];
    addActionBadge(curW / 2, curH / 2, 'EMP SCREEN CLEAR!');
  };

  const revivePlayer = () => {
    const curW = canvasDimRef.current.width;
    const curH = canvasDimRef.current.height;
    const baseY = canvasDimRef.current.playerBaseY;

    hasRevivedRef.current = true;
    setHasRevived(true);
    setAdNotice(null);

    // 1. Reset ship coordinates safely to base position
    playerRef.current = {
      ...playerRef.current,
      x: curW / 2 - 20,
      y: baseY,
      roll: 0,
      hasShield: true,
      tripleShotTimer: Math.max(playerRef.current.tripleShotTimer, 180),
    };

    // 2. Clear immediate threats near bottom
    enemiesRef.current = enemiesRef.current.filter((e) => e.y < curH * 0.4);
    meteorsRef.current = meteorsRef.current.filter((m) => m.y < curH * 0.35);
    blackHolesRef.current = [];

    // 3. Spawn revival shockwave & particle burst
    screenShakeRef.current = 16;
    addShockwave(curW / 2, baseY, '#00F0FF', 80);
    for (let k = 0; k < 25; k++) {
      particlesRef.current.push({
        x: curW / 2,
        y: baseY,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        alpha: 1,
        color: '#00F0FF',
        size: 3,
        life: 0,
        maxLife: 24,
      });
    }

    addActionBadge(curW / 2, baseY - 40, '⚡ SHIP REVIVED! ⚡');
    playSfx('powerup');

    // 4. Reset clock
    lastTimeRef.current = performance.now();
    lastShotTimeRef.current = performance.now();
    pointerRef.current = {
      active: false,
      lastX: 0,
      pendingDeltaX: 0,
    };

    // 5. Resume combat loop
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
    const curW = canvasDimRef.current.width;
    const curH = canvasDimRef.current.height;
    const baseY = canvasDimRef.current.playerBaseY;

    setAdNotice(null);
    setHasRevived(false);
    hasRevivedRef.current = false;
    playerRef.current = {
      x: curW / 2 - 20,
      y: baseY,
      width: 40,
      height: 42,
      speed: 10,
      roll: 0,
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
    shockwavesRef.current = [];
    actionBadgesRef.current = [];
    floatingTextsRef.current = [];
    lastShotTimeRef.current = 0;
    lastSpawnEnemyTimeRef.current = 0;
    lastSpawnMeteorTimeRef.current = 0;
    lastSpawnBlackHoleTimeRef.current = 0;
    lastSpawnPowerupTimeRef.current = 0;
    lastScoreSyncTimeRef.current = 0;
    lastTimeRef.current = performance.now();
    missionStartTimeRef.current = performance.now();
    scoreRef.current = 0;
    waveRef.current = 1;
    activePowerupRef.current = null;
    lastSyncedPowerupRef.current = null;
    screenShakeRef.current = 0;
    inventoryRef.current = [];
    setInventory([]);
    setDisplayScore(0);
    setCurrentSpeedMult(1.0);
    setWave(1);
    setActivePowerup(null);
    setIsDead(false);
    setIsPlaying(true);

    addActionBadge(curW / 2, curH * 0.45, 'MISSION LAUNCH!');
  };

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isDeadRef = useRef(isDead);
  isDeadRef.current = isDead;
  const startGameRef = useRef<() => void>(startGame);
  startGameRef.current = startGame;
  const handleWatchAdForReviveRef = useRef<() => void>(handleWatchAdForRevive);
  handleWatchAdForReviveRef.current = handleWatchAdForRevive;

  // Fullscreen API toggle with standard & vendor prefix support
  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    const container = containerRef.current || canvasRef.current;
    if (!container) return;

    const doc = document as any;
    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFull) {
      const el = container as any;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      if (screen.orientation && (screen.orientation as any).unlock) {
        try {
          (screen.orientation as any).unlock();
        } catch {}
      }
    }
  }, []);

  // Manual Trigger for Left-Click / Fire Button
  const triggerManualSalvo = useCallback(() => {
    if (!isPlayingRef.current || isDeadRef.current) {
      startGameRef.current();
      return;
    }
    const now = performance.now();
    const p = playerRef.current;
    const isHyp = p.hyperTimer > 0;
    lastShotTimeRef.current = now;

    if (p.tripleShotTimer > 0) {
      bulletsRef.current.push(
        { x: p.x + 4, y: p.y - 2, vx: -7, vy: -50, color: '#39FF14' },
        { x: p.x + p.width / 2 - 2, y: p.y - 6, vx: 0, vy: -55, color: '#00F0FF' },
        { x: p.x + p.width - 8, y: p.y - 2, vx: 7, vy: -38, color: '#39FF14' }
      );
      playSfxRef.current('spread');
    } else {
      bulletsRef.current.push(
        { x: p.x + 3, y: p.y - 2, vx: 0, vy: isHyp ? -55 : -48, color: isHyp ? '#FFE600' : '#00F0FF', isHyper: isHyp },
        { x: p.x + p.width - 7, y: p.y - 2, vx: 0, vy: isHyp ? -55 : -48, color: isHyp ? '#FFE600' : '#00F0FF', isHyper: isHyp }
      );
      playSfxRef.current(isHyp ? 'hyper_laser' : 'laser');
    }

    // Muzzle sparks
    for (let k = 0; k < 4; k++) {
      particlesRef.current.push({
        x: p.x + (k % 2 === 0 ? 4 : p.width - 4),
        y: p.y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4 - 2,
        alpha: 1,
        color: '#00F0FF',
        size: 2,
        life: 0,
        maxLife: 10,
      });
    }
  }, []);

  // Keyboard Event Handlers (Full 2D Flight, Combat Shortcuts & UI Controls)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default scrolling for arrow keys, space, etc.
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) ||
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
        e.preventDefault();
      }

      // Movement input mapping (WASD, Arrow Keys, Numpad 8/4/6/2)
      if (['ArrowLeft', 'KeyA', 'Numpad4'].includes(e.code) || ['ArrowLeft', 'a', 'A'].includes(e.key)) {
        keysRef.current.left = true;
      }
      if (['ArrowRight', 'KeyD', 'Numpad6'].includes(e.code) || ['ArrowRight', 'd', 'D'].includes(e.key)) {
        keysRef.current.right = true;
      }
      if (['ArrowUp', 'KeyW', 'Numpad8'].includes(e.code) || ['ArrowUp', 'w', 'W'].includes(e.key)) {
        keysRef.current.up = true;
      }
      if (['ArrowDown', 'KeyS', 'Numpad2'].includes(e.code) || ['ArrowDown', 's', 'S'].includes(e.key)) {
        keysRef.current.down = true;
      }

      // Shift -> Boost / Afterburners
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
        keysRef.current.boost = true;
        setIsBoostActive(true);
      }

      // Tactical Power-Up Vault Hotkeys: [1], [2], [3], [Q], [E], [X]
      if (e.code === 'Digit1' || e.key === '1' || e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q') {
        activatePowerupRef.current(0);
      }
      if (e.code === 'Digit2' || e.key === '2' || e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        activatePowerupRef.current(1);
      }
      if (e.code === 'Digit3' || e.key === '3' || e.code === 'KeyX' || e.key === 'x' || e.key === 'X') {
        activatePowerupRef.current(2);
      }

      // Space / Enter (double-space for slot 0) -> Start, Restart, Fire Salvo, or Powerup
      if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ' || e.key === 'Enter') {
        // Double-space guard: only when playing (not start/restart)
        if (!isPlayingRef.current || isDeadRef.current) {
          startGameRef.current();
          return;
        }
        const spaceLast = (window as any).__sf_space_last || 0;
        const nowSpace = performance.now();
        (window as any).__sf_space_last = nowSpace;
        if (nowSpace - spaceLast < 350 && inventoryRef.current[0]) {
          activatePowerupRef.current(0);
        } else {
          triggerManualSalvo();
        }
      }

      // 'R' -> Quick Restart Mission
      if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
        startGameRef.current();
      }

      // 'F' -> Toggle Fullscreen
      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }

      // 'M' -> Toggle Sound Mute
      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        setSoundEnabled((prev) => !prev);
      }

      // 'V' -> Watch Ad / Trigger Revive on Game Over
      if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
        if (isDeadRef.current) {
          handleWatchAdForReviveRef.current();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA', 'Numpad4'].includes(e.code) || ['ArrowLeft', 'a', 'A'].includes(e.key)) {
        keysRef.current.left = false;
      }
      if (['ArrowRight', 'KeyD', 'Numpad6'].includes(e.code) || ['ArrowRight', 'd', 'D'].includes(e.key)) {
        keysRef.current.right = false;
      }
      if (['ArrowUp', 'KeyW', 'Numpad8'].includes(e.code) || ['ArrowUp', 'w', 'W'].includes(e.key)) {
        keysRef.current.up = false;
      }
      if (['ArrowDown', 'KeyS', 'Numpad2'].includes(e.code) || ['ArrowDown', 's', 'S'].includes(e.key)) {
        keysRef.current.down = false;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
        keysRef.current.boost = false;
        setIsBoostActive(false);
      }
    };

    const handleBlur = () => {
      keysRef.current.left = false;
      keysRef.current.right = false;
      keysRef.current.up = false;
      keysRef.current.down = false;
      keysRef.current.boost = false;
      setIsBoostActive(false);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [setSoundEnabled, toggleFullscreen, triggerManualSalvo]);

  // Double-tap / double-click activates inventory slot 0 (powerup) via pointer or key (Space)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const now = performance.now();
    const dt = now - (pointerRef.current as any)._lastDownTime || Infinity;
    (pointerRef.current as any)._lastDownTime = now;

    if (dt < 350) {
      // Double-tap / double-click: activate first inventory slot if available
      if (inventoryRef.current[0]) {
        activatePowerupRef.current(0);
      }
      return;
    }

    if (!isPlaying || isDead) {
      startGame();
      return;
    }
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const curW = canvasDimRef.current.width;
    const rect = target.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaledX = (clientX / (rect.width || curW)) * curW;

    pointerRef.current.active = true;
    pointerRef.current.lastX = scaledX;
    pointerRef.current.pendingDeltaX = 0;

    // Instant plasma burst on tap/click
    triggerManualSalvo();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isDead || !pointerRef.current.active) return;
    const target = e.currentTarget;
    const curW = canvasDimRef.current.width;
    const rect = target.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaledX = (clientX / (rect.width || curW)) * curW;

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

  // Helper: Draw 3D Starburst Action Combo Badge matching neon-starfighter.svg
  const drawStarburstBadge = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, scale: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const pts: [number, number][] = [
      [0, -22], [8, -8], [24, -14], [16, -1], [30, 10], [14, 14], [18, 28],
      [4, 20], [-4, 28], [-2, 14], [-18, 18], [-12, 4], [-28, -2], [-14, -10],
      [-20, -24], [-6, -16]
    ];

    // Hard drop shadow
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px + 3.5, py + 3.5);
      else ctx.lineTo(px + 3.5, py + 3.5);
    });
    ctx.closePath();
    ctx.fill();

    // Gold fill
    ctx.fillStyle = '#FFE600';
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();

    // 2.5px solid black stroke
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'miter';
    ctx.stroke();

    // Badge text
    ctx.fillStyle = '#000000';
    ctx.font = '900 9px Impact, Arial Black, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);

    ctx.restore();
  };

  // Idle Background Loop (Exact in-game cosmos starfield & 3D space warp grid)
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

      const curW = canvasDimRef.current.width;
      const curH = canvasDimRef.current.height;

      // In-Game Background Clear (Deep Indigo Space Ground)
      const grad = ctx.createLinearGradient(0, 0, 0, curH);
      grad.addColorStop(0, '#030014');
      grad.addColorStop(0.5, '#0a0526');
      grad.addColorStop(1, '#021b2b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, curW, curH);

      // Perspective Space Warp Grid & Radiating Rays (from neon-starfighter.svg)
      ctx.save();
      ctx.strokeStyle = '#1E1548';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);

      // Perspective Rays
      const vpX = curW / 2;
      const vpY = -40;
      const numRays = 12;
      for (let i = 0; i <= numRays; i++) {
        const destX = (i / numRays) * (curW + 280) - 140;
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(destX, curH + 20);
        ctx.stroke();
      }

      // Moving Horizontal Speed Warp Bars
      warpGridOffsetRef.current = (warpGridOffsetRef.current + 1.2 * timeScale) % 50;
      for (let y = warpGridOffsetRef.current; y < curH; y += 50) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(curW, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Cosmic Atmosphere (Neo Pink on Death, Neo Cyan on Launch)
      const radGrad = ctx.createRadialGradient(
        curW / 2, curH * 0.45, 10,
        curW / 2, curH * 0.45, curW * 0.75
      );
      if (isDead) {
        radGrad.addColorStop(0, 'rgba(255, 0, 127, 0.22)');
        radGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.08)');
        radGrad.addColorStop(1, 'rgba(8, 4, 23, 0)');
      } else {
        radGrad.addColorStop(0, 'rgba(0, 240, 255, 0.16)');
        radGrad.addColorStop(0.5, 'rgba(255, 112, 217, 0.08)');
        radGrad.addColorStop(1, 'rgba(8, 4, 23, 0)');
      }
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, curW, curH);

      // In-Game Moving Starfield
      const stars = starsRef.current;
      for (let s = 0; s < stars.length; s++) {
        const star = stars[s];
        star.y += star.speed * timeScale;
        if (star.y > curH) {
          star.y = 0;
          star.x = Math.random() * curW;
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

      const curW = canvasDimRef.current.width;
      const curH = canvasDimRef.current.height;
      const playerBaseY = canvasDimRef.current.playerBaseY;

      const p = playerRef.current;

      // Dynamic Continuous Speed Multiplier: Starts at 1.0x (easy) and progressively scales with flight time / waves
      const elapsedTimeSec = Math.max(0, (timestamp - (missionStartTimeRef.current || timestamp)) / 1000);
      const waveBonus = (waveRef.current - 1) * 0.25;
      const timeSpeedScale = 1.0 * (1.0 + Math.min(elapsedTimeSec * 0.015 + waveBonus, 4.5));

      // Jet Strafe Agility: scales dynamically with flight speed
      p.speed = 18 + Math.min(12, (timeSpeedScale - 1.0) * 3.5);

      // Sync Wave, Score, and Speed Multiplier with React HUD periodically (every 120ms max)
      if (timestamp - lastScoreSyncTimeRef.current > 120) {
        lastScoreSyncTimeRef.current = timestamp;
        setDisplayScore(scoreRef.current);
        setCurrentSpeedMult(parseFloat(timeSpeedScale.toFixed(1)));

        const newWave = Math.floor(scoreRef.current / 1500) + 1;
        if (newWave !== waveRef.current) {
          waveRef.current = newWave;
          setWave(newWave);
          screenShakeRef.current = 8;
          addShockwave(curW / 2, curH * 0.35, '#FFE600', 70);
          addActionBadge(curW / 2, curH * 0.35, `SECTOR ${newWave} • SPEED ${timeSpeedScale.toFixed(1)}x!`);
          playSfxRef.current('powerup');
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

      // 1D Bottom-Locked Horizontal Strafe Kinematics (Fixed at bottom rail)
      p.y = playerBaseY;

      // Calculate gravitational pull from active black holes in X axis
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

          // Gravitational accretion sparks
          if (Math.random() < 0.35 && particlesRef.current.length < 45) {
            particlesRef.current.push({
              x: p.x + p.width / 2 + (Math.random() - 0.5) * 14,
              y: p.y + p.height / 2 + (Math.random() - 0.5) * 14,
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

      const boostMultiplier = keysRef.current.boost ? 1.65 : 1.0;
      const currentSpeed = (p.hyperTimer > 0 ? p.speed * 1.35 : p.speed) * boostMultiplier * timeScale;
      let targetRoll = 0;

      // Extra afterburner particles during active boost
      if (keysRef.current.boost && Math.random() < 0.6 && particlesRef.current.length < 50) {
        particlesRef.current.push({
          x: p.x + p.width / 2 + (Math.random() - 0.5) * 12,
          y: p.y + p.height + 4,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 4 + 5,
          alpha: 1,
          color: Math.random() > 0.4 ? '#FFE600' : '#FF0055',
          size: Math.random() * 2 + 2,
          life: 0,
          maxLife: 12,
        });
      }

      if (keysRef.current.left) {
        p.x = Math.max(0, p.x - currentSpeed);
        targetRoll = -0.28;
      } else if (keysRef.current.right) {
        p.x = Math.min(curW - p.width, p.x + currentSpeed);
        targetRoll = 0.28;
      } else if (pointerRef.current.active || pointerRef.current.pendingDeltaX !== 0) {
        const deltaX = pointerRef.current.pendingDeltaX;
        pointerRef.current.pendingDeltaX = 0;

        if (deltaX < -1.5) targetRoll = -0.25;
        else if (deltaX > 1.5) targetRoll = 0.25;

        const controlTraction = Math.max(0.12, 1 - Math.pow(strongestPullRatio, 1.1) * 0.88);
        p.x += deltaX * controlTraction;
      }

      // Smooth banking roll interpolation
      p.roll += (targetRoll - p.roll) * 0.25 * timeScale;

      // Apply horizontal gravitational force directly to ship
      if (totalGravityX !== 0) {
        p.x += totalGravityX;
      }
      p.x = Math.max(0, Math.min(curW - p.width, p.x));
      p.y = playerBaseY;

      // DUAL WINGTIP HIGH-VELOCITY 3X PLASMA LASER FIRING ENGINE (Matching neon-starfighter.svg)
      const fireIntervalMs = p.hyperTimer > 0 ? 55 : p.tripleShotTimer > 0 ? 75 : 90;
      if (timestamp - lastShotTimeRef.current >= fireIntervalMs) {
        lastShotTimeRef.current = timestamp;

        if (p.tripleShotTimer > 0) {
          // 3-Way Spread High-Speed Plasma Cannons
          bulletsRef.current.push(
            { x: p.x + 4, y: p.y - 2, vx: -7, vy: -38, color: '#39FF14' },
            { x: p.x + p.width / 2 - 2, y: p.y - 6, vx: 0, vy: -42, color: '#00F0FF' },
            { x: p.x + p.width - 8, y: p.y - 2, vx: 7, vy: -38, color: '#39FF14' }
          );
          playSfxRef.current('spread');
        } else {
          // Dual Wingtip High-Speed Synchronized Plasma Beams (from outer yellow wingtip rails)
          const isHyp = p.hyperTimer > 0;
          bulletsRef.current.push(
            { x: p.x + 3, y: p.y - 2, vx: 0, vy: isHyp ? -44 : -38, color: isHyp ? '#FFE600' : '#00F0FF', isHyper: isHyp },
            { x: p.x + p.width - 7, y: p.y - 2, vx: 0, vy: isHyp ? -44 : -38, color: isHyp ? '#FFE600' : '#00F0FF', isHyper: isHyp }
          );
          playSfxRef.current(isHyp ? 'hyper_laser' : 'laser');
        }
      }

      // SPAWN SYSTEM (High-Velocity 3x Scaling with Dynamic Time Progression)
      const enemyInterval = Math.max(220, 550 / (timeSpeedScale / 3.0));
      if (timestamp - lastSpawnEnemyTimeRef.current >= enemyInterval) {
        lastSpawnEnemyTimeRef.current = timestamp;
        const rand = Math.random();
        if (rand > 0.75) {
          enemiesRef.current.push({
            x: Math.random() * (curW - 44) + 6,
            y: -35,
            width: 38,
            height: 32,
            vx: (Math.random() - 0.5) * 1.6 * (timeSpeedScale / 3.0) * 3.0,
            vy: (Math.random() * 1.0 + 2.2) * timeSpeedScale,
            hp: 4,
            maxHp: 4,
            color: '#FF0055',
            sideColor: '#80002A',
            type: 'heavy',
            rotation: 0,
            lastShotTime: timestamp,
          });
        } else if (rand > 0.4) {
          enemiesRef.current.push({
            x: Math.random() * (curW - 32) + 6,
            y: -30,
            width: 28,
            height: 24,
            vx: (Math.random() - 0.5) * 2.2 * (timeSpeedScale / 3.0) * 3.0,
            vy: (Math.random() * 1.2 + 3.0) * timeSpeedScale,
            hp: 2,
            maxHp: 2,
            color: '#FF00EA',
            sideColor: '#800F2F',
            type: 'scout',
            rotation: 0,
            lastShotTime: timestamp,
          });
        } else {
          enemiesRef.current.push({
            x: Math.random() * (curW - 28) + 6,
            y: -25,
            width: 24,
            height: 20,
            vx: (Math.random() - 0.5) * 1.8 * (timeSpeedScale / 3.0) * 3.0,
            vy: (Math.random() * 1.2 + 3.6) * timeSpeedScale,
            hp: 1,
            maxHp: 1,
            color: '#FF4D6D',
            sideColor: '#800F2F',
            type: 'drone',
            rotation: 0,
            lastShotTime: timestamp,
          });
        }
      }

      // Spawn Meteors (Accelerated cadence & velocity)
      const meteorInterval = Math.max(750, 1800 / (timeSpeedScale / 3.0));
      if (timestamp - lastSpawnMeteorTimeRef.current >= meteorInterval) {
        lastSpawnMeteorTimeRef.current = timestamp;
        meteorsRef.current.push(createMeteor(timeSpeedScale));
      }

      // Spawn Black Holes (Dynamic gravity hazards)
      const blackHoleInterval = Math.max(3000, 5000 / (timeSpeedScale / 3.0));
      if (timestamp - lastSpawnBlackHoleTimeRef.current >= blackHoleInterval && blackHolesRef.current.length === 0) {
        lastSpawnBlackHoleTimeRef.current = timestamp;
        blackHolesRef.current.push(createBlackHole(timeSpeedScale));
      }

      // Spawn Powerups
      const powerupInterval = Math.max(2800, 4200 / (timeSpeedScale / 3.0));
      if (timestamp - lastSpawnPowerupTimeRef.current >= powerupInterval) {
        lastSpawnPowerupTimeRef.current = timestamp;
        const types: PowerupType[] = ['spread', 'shield', 'nuke', 'hyper'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        powerupsRef.current.push({
          x: Math.random() * (curW - 40) + 20,
          y: -20,
          type: chosen,
          vy: 4.5 * (timeSpeedScale / 3.0),
          radius: 13,
          pulse: 0,
        });
      }

      // UPDATE BULLETS
      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.x += b.vx * timeScale;
        b.y += b.vy * timeScale;
        if (b.y < -25 || b.x < -25 || b.x > curW + 25) {
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
          if (inventoryRef.current.length < 3) {
            inventoryRef.current.push(pow.type);
            setInventory([...inventoryRef.current]);
            const slotNum = inventoryRef.current.length;
            const typeLabel =
              pow.type === 'spread'
                ? 'SPREAD LASER'
                : pow.type === 'shield'
                ? 'SHIELD'
                : pow.type === 'nuke'
                ? 'EMP NUKE'
                : 'HYPERDRIVE';
            addActionBadge(pow.x, pow.y, `STORED: ${typeLabel} [${slotNum}]`);
          } else {
            // Vault full -> Auto-trigger immediately so power-up is not wasted
            if (pow.type === 'spread') {
              p.tripleShotTimer = 420;
              activePowerupRef.current = 'TRIPLE SPREAD LASER';
              setActivePowerup('TRIPLE SPREAD LASER');
              addActionBadge(pow.x, pow.y, 'TRIPLE LASERS!');
            } else if (pow.type === 'shield') {
              p.hasShield = true;
              activePowerupRef.current = 'ENERGY SHIELD';
              setActivePowerup('ENERGY SHIELD');
              addActionBadge(pow.x, pow.y, 'SHIELD ACTIVE!');
            } else if (pow.type === 'nuke') {
              triggerNuke();
            } else if (pow.type === 'hyper') {
              p.hyperTimer = 340;
              activePowerupRef.current = 'HYPERDRIVE OVERDRIVE';
              setActivePowerup('HYPERDRIVE OVERDRIVE');
              addActionBadge(pow.x, pow.y, 'HYPER DRIVE!');
              playSfxRef.current('hyper_start');
            }
          }

          scoreRef.current += 200;
          powerupsRef.current.splice(i, 1);
          continue;
        }

        if (pow.y > curH + 30) powerupsRef.current.splice(i, 1);
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
            addActionBadge(p.x + p.width / 2, p.y - 20, 'SHIELD CRUSHED!');
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

        if (bh.y > curH + 80) blackHolesRef.current.splice(i, 1);
      }

      // UPDATE METEORS
      for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const m = meteorsRef.current[i];
        m.y += m.vy * timeScale;
        m.x += m.vx * timeScale;
        m.rotation += m.rotSpeed * timeScale;

        if (m.x <= m.radius || m.x >= curW - m.radius) m.vx *= -1;

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
            addActionBadge(p.x + p.width / 2, p.y, 'SHIELD BROKEN!');
          } else {
            handlePlayerDeath();
            cancelAnimationFrame(animId);
            return;
          }
        }

        if (m.y > curH + 60) meteorsRef.current.splice(i, 1);
      }

      // UPDATE ENEMIES
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        enemy.y += enemy.vy * timeScale;
        enemy.x += enemy.vx * timeScale;

        if (enemy.x <= 0 || enemy.x >= curW - enemy.width) enemy.vx *= -1;

        // Check Bullet Collisions (Continuous Segment Sweep to prevent fast bullet tunneling)
        for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
          const b = bulletsRef.current[j];
          const prevY = b.y - b.vy * timeScale;
          const minY = Math.min(b.y, prevY);
          const maxY = Math.max(b.y, prevY);

          if (
            b.x >= enemy.x - 10 &&
            b.x <= enemy.x + enemy.width + 10 &&
            minY <= enemy.y + enemy.height + 10 &&
            maxY >= enemy.y - 10
          ) {
            bulletsRef.current.splice(j, 1);
            enemy.hp--;

            if (enemy.hp <= 0) {
              playSfxRef.current('boom');
              const mult = p.hyperTimer > 0 ? 2 : 1;
              const pointsEarned = (enemy.type === 'heavy' ? 300 : enemy.type === 'scout' ? 200 : 100) * mult;
              scoreRef.current += pointsEarned;
              addFloatingText(enemy.x + enemy.width / 2, enemy.y, `+${pointsEarned}`, enemy.color);

              // Circular Dashed Shockwave Ring (from neon-starfighter.svg)
              addShockwave(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, enemy.type === 'heavy' ? 42 : 28);

              if (enemy.type === 'heavy' || Math.random() < 0.25) {
                addActionBadge(enemy.x + enemy.width / 2, enemy.y - 10, 'TARGET LOCKED!');
              }

              if (particlesRef.current.length < 40) {
                for (let k = 0; k < 8; k++) {
                  particlesRef.current.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    alpha: 1,
                    color: enemy.color,
                    size: 2.5,
                    life: 0,
                    maxLife: 16,
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
          p.x + 6 < enemy.x + enemy.width &&
          p.x + p.width - 6 > enemy.x &&
          p.y + 6 < enemy.y + enemy.height &&
          p.y + p.height - 6 > enemy.y
        ) {
          if (p.hasShield) {
            p.hasShield = false;
            playSfxRef.current('shield_hit');
            screenShakeRef.current = 10;
            addShockwave(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#00F0FF', 36);
            enemiesRef.current.splice(i, 1);
            addActionBadge(p.x + p.width / 2, p.y, 'SHIELD BROKEN!');
          } else {
            handlePlayerDeath();
            cancelAnimationFrame(animId);
            return;
          }
        }

        if (enemy && enemy.y > curH + 30) enemiesRef.current.splice(i, 1);
      }

      function handlePlayerDeath() {
        setIsDead(true);
        setIsPlaying(false);
        playSfxRef.current('boom');
        screenShakeRef.current = 18;
        addShockwave(p.x + p.width / 2, p.y + p.height / 2, '#FF007F', 90);

        for (let k = 0; k < 25; k++) {
          particlesRef.current.push({
            x: p.x + p.width / 2,
            y: p.y + p.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            alpha: 1,
            color: '#00F0FF',
            size: 3,
            life: 0,
            maxLife: 22,
          });
        }

        const finalScore = scoreRef.current;
        setDisplayScore(finalScore);
        if (finalScore > 3000) confetti({ particleCount: 50, spread: 60 });
        setTimeout(() => onGameOverRef.current(finalScore), 0);
      }

      // ==========================================
      // 3D ISOMETRIC VECTOR CANVAS RENDER ENGINE
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

      // 1. Deep Space Canvas Gradient (from neon-starfighter.svg)
      const spaceGrad = ctx.createLinearGradient(0, 0, 0, curH);
      spaceGrad.addColorStop(0, '#030014');
      spaceGrad.addColorStop(0.5, '#0a0526');
      spaceGrad.addColorStop(1, '#021b2b');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, curW, curH);

      // 2. Perspective Space Warp Grid & Radiating Rays (from neon-starfighter.svg)
      ctx.save();
      ctx.strokeStyle = '#1E1548';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);

      const vpX = curW / 2;
      const vpY = -40;
      const numRays = 12;
      for (let i = 0; i <= numRays; i++) {
        const destX = (i / numRays) * (curW + 280) - 140;
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(destX, curH + 20);
        ctx.stroke();
      }

      // Moving Horizontal Speed Warp Bars (accelerates during Hyper Drive & scales with 3x base + timeSpeedScale)
      const speedMult = (p.hyperTimer > 0 ? 3.5 : 1.0) * timeSpeedScale;
      warpGridOffsetRef.current = (warpGridOffsetRef.current + 2.2 * speedMult * timeScale) % 50;
      for (let y = warpGridOffsetRef.current; y < curH; y += 50) {
        ctx.strokeStyle = p.hyperTimer > 0 ? 'rgba(255, 230, 0, 0.22)' : 'rgba(0, 240, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(curW, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // 3. Starfield & Cosmic Warp Streaks (accelerates with timeSpeedScale)
      const stars = starsRef.current;
      for (let s = 0; s < stars.length; s++) {
        const star = stars[s];
        const starSpeed = (p.hyperTimer > 0 ? star.speed * 3.8 : star.speed * (timeSpeedScale / 3.0 * 2.0)) * timeScale;
        star.y += starSpeed;
        if (star.y > curH) {
          star.y = 0;
          star.x = Math.random() * curW;
        }
        ctx.fillStyle = p.hyperTimer > 0 ? '#FFE600' : star.color;
        const lengthMultiplier = p.hyperTimer > 0 ? 5.5 : 2.2 * Math.min(3.0, timeSpeedScale / 3.0);
        ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size * lengthMultiplier);
      }

      // 4. Black Holes (Cosmic Singularity with Dual Swirling Rings)
      blackHolesRef.current.forEach((bh) => {
        // Gravitational Hazard Warning Ring
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, (bh.pullRadius * 0.75) | 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Dual Swirling Accretion Disk Rings
        ctx.save();
        ctx.translate(bh.x, bh.y);
        ctx.rotate(bh.angle);
        ctx.strokeStyle = '#FF007F';
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

        // Singularity Event Horizon Core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FF007F';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      });

      // 5. Meteors (Faceted Asteroids with Hard Drop Shadows)
      meteorsRef.current.forEach((m) => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rotation);

        // Hard Drop Shadow
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        m.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x + 3.5, pt.y + 3.5);
          else ctx.lineTo(pt.x + 3.5, pt.y + 3.5);
        });
        ctx.closePath();
        ctx.fill();

        // Asteroid Body
        ctx.fillStyle = '#381E54';
        ctx.beginPath();
        m.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();

        // Solid Black Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Crater Details
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

      // 6. Powerups (Tactile Neo-Brutalist Swatches)
      powerupsRef.current.forEach((pow) => {
        const pulseSize = pow.radius + Math.sin(pow.pulse) * 1.5;
        const color =
          pow.type === 'spread'
            ? '#39FF14'
            : pow.type === 'shield'
            ? '#00F0FF'
            : pow.type === 'nuke'
            ? '#FF007F'
            : '#FFE600';

        const size = pulseSize * 1.7;
        const x = pow.x - size / 2;
        const y = pow.y - size / 2;

        ctx.save();
        // Drop Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 3, y + 3, size, size);

        // Main Box
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);

        // Solid Black Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, size, size);

        // Figma Corner Accent Node
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 1, y - 1, 3, 3);

        // Crisp Text Label
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

      // 7. Bullets (Dual Wingtip Plasma Cannon Beams matching neon-starfighter.svg)
      bulletsRef.current.forEach((b) => {
        ctx.save();
        // Hard Offset Drop Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(b.x + 1.5, b.y + 1.5, 4, 16);

        // Plasma Laser Outer Fill
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, 4, 16);

        // Solid Black Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, 4, 16);

        // White Core Energy Beam Line
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(b.x + 1, b.y + 2, 2, 10);
        ctx.restore();
      });

      // 8. Enemies (3D Faceted Diving Drones & Aggressors matching neon-starfighter.svg)
      enemiesRef.current.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

        if (enemy.type === 'heavy') {
          // 3D Heavy Dreadnought
          // Hard Drop Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(0 + 3.5, 16 + 3.5);
          ctx.lineTo(-18 + 3.5, -14 + 3.5);
          ctx.lineTo(0 + 3.5, -4 + 3.5);
          ctx.lineTo(18 + 3.5, -14 + 3.5);
          ctx.closePath();
          ctx.fill();

          // Extruded Dark Bottom Hull
          ctx.fillStyle = enemy.sideColor;
          ctx.beginPath();
          ctx.moveTo(0, 16);
          ctx.lineTo(-18, -14);
          ctx.lineTo(-14, -14);
          ctx.lineTo(0, 2);
          ctx.lineTo(14, -14);
          ctx.lineTo(18, -14);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Main Armored Hull
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(0, 14);
          ctx.lineTo(-16, -12);
          ctx.lineTo(0, 0);
          ctx.lineTo(16, -12);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Twin Command Scanner Visors
          ctx.fillStyle = '#FFE600';
          ctx.fillRect(-10, -6, 6, 4);
          ctx.fillRect(4, -6, 6, 4);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-10, -6, 6, 4);
          ctx.strokeRect(4, -6, 6, 4);

          // HP Bar
          if (enemy.hp < enemy.maxHp) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(-16, -22, 32, 5);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(-16, -22, 32, 5);
            ctx.fillStyle = '#39FF14';
            ctx.fillRect(-16, -22, (enemy.hp / enemy.maxHp) * 32, 5);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-16, -22, 32, 5);
          }
        } else if (enemy.type === 'scout') {
          // 3D Scout Interceptor
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(0 + 2.5, 12 + 2.5);
          ctx.lineTo(-14 + 2.5, -10 + 2.5);
          ctx.lineTo(0 + 2.5, -2 + 2.5);
          ctx.lineTo(14 + 2.5, -10 + 2.5);
          ctx.closePath();
          ctx.fill();

          // Main Body
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(0, 12);
          ctx.lineTo(-14, -10);
          ctx.lineTo(0, -2);
          ctx.lineTo(14, -10);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Yellow Eye
          ctx.fillStyle = '#FFE600';
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          // 3D Diving Aggressor Drone (from neon-starfighter.svg)
          // Hard Drop Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(0 + 2.5, 10 + 2.5);
          ctx.lineTo(12 + 2.5, -2 + 2.5);
          ctx.lineTo(0 + 2.5, -10 + 2.5);
          ctx.lineTo(-12 + 2.5, -2 + 2.5);
          ctx.closePath();
          ctx.fill();

          // 3D Extruded Drone Hull Side Facet
          ctx.fillStyle = enemy.sideColor;
          ctx.beginPath();
          ctx.moveTo(-12, -2);
          ctx.lineTo(0, 10);
          ctx.lineTo(0, 14);
          ctx.lineTo(-12, 2);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(12, -2);
          ctx.lineTo(0, 10);
          ctx.lineTo(0, 14);
          ctx.lineTo(12, 2);
          ctx.closePath();
          ctx.fill();

          // Drone Core Face
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(0, 10);
          ctx.lineTo(12, -2);
          ctx.lineTo(0, -10);
          ctx.lineTo(-12, -2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Glowing Diamond Cyclops Eye (from neon-starfighter.svg)
          ctx.fillStyle = '#FFE600';
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.lineTo(5, 0);
          ctx.lineTo(0, 4);
          ctx.lineTo(-5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // White Specular Glint
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(-1, -2, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 9. Shockwave Plasma Explosion Rings (from neon-starfighter.svg Swarm 2)
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += 2.2 * timeScale;
        sw.alpha = 1 - sw.radius / sw.maxRadius;

        if (sw.radius >= sw.maxRadius) {
          shockwavesRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = Math.max(0, sw.alpha);
          ctx.strokeStyle = sw.color;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // ==========================================
      // 10. 3D HERO NEON STARFIGHTER INTERCEPTOR
      // (Directly translated from neon-starfighter.svg)
      // ==========================================
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(p.roll); // Dynamic Banking Roll Tilt

      const isHyp = p.hyperTimer > 0;
      const isTrip = p.tripleShotTimer > 0;

      // 10.1 Thruster Exhaust Jet Flames (3-Nozzle Engine Cluster)
      const flameOffset = Math.sin(timestamp * 0.04) * 4;
      const flameColor = isHyp ? '#FFE600' : isTrip ? '#39FF14' : '#00F0FF';

      // Center Main High-Energy Thruster
      ctx.fillStyle = flameColor;
      ctx.beginPath();
      ctx.moveTo(-5, 14);
      ctx.lineTo(0, 32 + flameOffset);
      ctx.lineTo(5, 14);
      ctx.closePath();
      ctx.fill();

      // White-Hot Inner Core Flame
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-2.5, 14);
      ctx.lineTo(0, 22 + flameOffset * 0.5);
      ctx.lineTo(2.5, 14);
      ctx.closePath();
      ctx.fill();

      // Left & Right Auxiliary Wingtip Thrusters
      ctx.fillStyle = flameColor;
      ctx.beginPath();
      ctx.moveTo(-18, 10);
      ctx.lineTo(-16, 20 + flameOffset * 0.7);
      ctx.lineTo(-14, 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(14, 10);
      ctx.lineTo(16, 20 + flameOffset * 0.7);
      ctx.lineTo(18, 10);
      ctx.closePath();
      ctx.fill();

      // 10.2 Hard Offset Drop Shadow (Neo-Brutalism)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(0 + 4, -22 + 4);
      ctx.lineTo(-24 + 4, 8 + 4);
      ctx.lineTo(-21 + 4, 16 + 4);
      ctx.lineTo(-7 + 4, 18 + 4);
      ctx.lineTo(0 + 4, 6 + 4);
      ctx.lineTo(7 + 4, 18 + 4);
      ctx.lineTo(21 + 4, 16 + 4);
      ctx.lineTo(24 + 4, 8 + 4);
      ctx.closePath();
      ctx.fill();

      // 10.3 3D Extruded Hull Facets (Dark Cyan Side Plates from SVG: #0369A1 / #0C4A6E)
      ctx.fillStyle = isHyp ? '#D49B00' : '#0369A1';
      // Left Fuselage Side Depth
      ctx.beginPath();
      ctx.moveTo(-23, 6);
      ctx.lineTo(-26, 12);
      ctx.lineTo(-7, 20);
      ctx.lineTo(-7, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Right Fuselage Side Depth
      ctx.beginPath();
      ctx.moveTo(23, 6);
      ctx.lineTo(26, 12);
      ctx.lineTo(7, 20);
      ctx.lineTo(7, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center Under-Belly Depth
      ctx.fillStyle = isHyp ? '#805D00' : '#0C4A6E';
      ctx.beginPath();
      ctx.moveTo(-7, 16);
      ctx.lineTo(-7, 20);
      ctx.lineTo(7, 20);
      ctx.lineTo(7, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 10.4 Main Swept Wings & Hull (Vibrant Cyan Armor Plates: #00F0FF)
      ctx.fillStyle = isHyp ? '#FFE600' : isTrip ? '#39FF14' : '#00F0FF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round';

      // Left Swept Wing
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(-23, 6);
      ctx.lineTo(-21, 15);
      ctx.lineTo(-7, 16);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Swept Wing
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(23, 6);
      ctx.lineTo(21, 15);
      ctx.lineTo(7, 16);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 10.5 Neon Yellow Wingtip Rails & Laser Cannon Barrels (#FFF570 / #FFE600)
      ctx.fillStyle = '#FFE600';
      // Left Wingtip Rail
      ctx.beginPath();
      ctx.moveTo(-23, 6);
      ctx.lineTo(-27, 8);
      ctx.lineTo(-21, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Wingtip Rail
      ctx.beginPath();
      ctx.moveTo(23, 6);
      ctx.lineTo(27, 8);
      ctx.lineTo(21, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Spoiler Ridges
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.lineTo(-16, 6);
      ctx.lineTo(-13, 9);
      ctx.lineTo(-6, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(16, 6);
      ctx.lineTo(13, 9);
      ctx.lineTo(6, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 10.6 Forward Nose Cone & Fuselage Spine
      ctx.fillStyle = isHyp ? '#FFF570' : '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(-6, -4);
      ctx.lineTo(0, 10);
      ctx.lineTo(6, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 10.7 Glowing 3D Cockpit Canopy (Neon Magenta with Specular Glint)
      ctx.fillStyle = '#FF70D9';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-4, -3);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FF007F';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(4, -3);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-4, -3);
      ctx.lineTo(0, 3);
      ctx.lineTo(4, -3);
      ctx.closePath();
      ctx.stroke();

      // Cockpit Specular Glint Highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-1, -12);
      ctx.lineTo(-3, -4);
      ctx.lineTo(-1, -4);
      ctx.closePath();
      ctx.fill();

      // Wing Lead Edge Gloss Highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(-20, 5);
      ctx.lineTo(-14, 3);
      ctx.lineTo(0, -10);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // 10.8 Energy Shield Bubble
      if (p.hasShield) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(2, 2, 32, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Floating Energy Shield Nodes
        const nodes = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        nodes.forEach((ang) => {
          const nx = Math.cos(ang + timestamp * 0.003) * 32;
          const ny = Math.sin(ang + timestamp * 0.003) * 32;
          ctx.fillStyle = '#FF007F';
          ctx.fillRect(nx - 3, ny - 3, 6, 6);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(nx - 3, ny - 3, 6, 6);
        });
      }

      ctx.restore();

      // 11. Render Action Starburst Combo Badges (from neon-starfighter.svg)
      for (let i = actionBadgesRef.current.length - 1; i >= 0; i--) {
        const ab = actionBadgesRef.current[i];
        ab.y += ab.vy * timeScale;
        ab.scale = Math.min(1.0, ab.scale + 0.08 * timeScale);
        ab.alpha -= 0.016 * timeScale;

        if (ab.alpha <= 0) {
          actionBadgesRef.current.splice(i, 1);
        } else {
          drawStarburstBadge(ctx, ab.x, ab.y, ab.text, ab.scale, ab.alpha);
        }
      }

      // 12. Render Particles
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

      // 13. Floating Score Texts
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

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none w-full justify-center transition-colors ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-black p-2 sm:p-4 h-screen max-h-screen overflow-hidden flex flex-col items-center justify-center'
          : 'max-w-full h-full flex-1'
      }`}
    >
      {/* Main Canvas - Adaptive Orientation (no rotate prompt) */}
      <div
        className={`relative rounded-2xl overflow-hidden border-3 border-black shadow-neo-lg bg-black touch-none cursor-crosshair flex items-center justify-center shrink-0 ${
          isDesktop
            ? 'aspect-[16/9] w-full max-w-5xl lg:max-w-6xl max-h-[72vh] md:max-h-[78vh] lg:max-h-[82vh]'
            : 'aspect-[9/16] w-full max-w-md max-h-[75vh]'
        } ${isFullscreen ? (isDesktop ? 'max-h-[78vh] sm:max-h-[82vh] w-auto h-full max-w-full' : 'max-h-[82vh] w-full h-auto') : ''}`}
      >
        <canvas
          ref={canvasRef}
          width={isDesktop ? DESKTOP_WIDTH : MOBILE_WIDTH}
          height={isDesktop ? DESKTOP_HEIGHT : MOBILE_HEIGHT}
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
                  <p className="text-xs font-bold text-portal-cyan uppercase tracking-wider mt-0.5">Reached Sector {wave}</p>
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
                  title={hasRevived ? 'Revive already used for this run' : 'Watch video transmission for emergency ship revive (Key: V)'}
                >
                  <Tv className="w-4 h-4 stroke-[2.5]" />
                  <span>{hasRevived ? 'REVIVE USED (1/RUN)' : 'WATCH AD TO REVIVE [V]'}</span>
                </button>

                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan hover:bg-cyan-300 text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" /> RESTART [SPACE / R]
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
                    A / D / ARROWS • 1.0X→5.0X ACCEL • [1][2][3] TACTICAL VAULT
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
                    <span>Vault: Collect & use powerups anytime with [1], [2], [3] (or Q/E/X).</span>
                  </div>
                  <div className="pt-1 border-t border-slate-700/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>[SPACE] LAUNCH</span>
                    <span>[M] MUTE</span>
                    <span>[R] RESTART</span>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan hover:bg-cyan-300 text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" /> LAUNCH MISSION [SPACE]
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
