'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Flame,
  HelpCircle,
  Pause,
  Play,
  Award,
  ChevronRight,
  ChevronLeft,
  ArrowDown
} from 'lucide-react';

interface CyberFruitMergeGameProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
}

// 11 Cyber Fruit Evolution Tiers
export interface FruitTierConfig {
  tier: number;
  name: string;
  symbol: string;
  radius: number;
  mass: number;
  scoreValue: number;
  color: string;
  glowColor: string;
  accentColor: string;
  label: string;
}

export const FRUIT_TIERS: FruitTierConfig[] = [
  {
    tier: 0,
    name: 'Cherry',
    symbol: '🍒',
    radius: 16,
    mass: 1.0,
    scoreValue: 2,
    color: '#FF0055',
    glowColor: '#FF3377',
    accentColor: '#FFAAC5',
    label: 'LV.1'
  },
  {
    tier: 1,
    name: 'Strawberry',
    symbol: '🍓',
    radius: 22,
    mass: 1.8,
    scoreValue: 4,
    color: '#FF007F',
    glowColor: '#FF409F',
    accentColor: '#FFB3D9',
    label: 'LV.2'
  },
  {
    tier: 2,
    name: 'Grape',
    symbol: '🍇',
    radius: 29,
    mass: 2.8,
    scoreValue: 8,
    color: '#9900FF',
    glowColor: '#B84DFF',
    accentColor: '#E6B8FF',
    label: 'LV.3'
  },
  {
    tier: 3,
    name: 'Dekopon',
    symbol: '🍊',
    radius: 36,
    mass: 4.0,
    scoreValue: 16,
    color: '#FF8800',
    glowColor: '#FFAA33',
    accentColor: '#FFE0B2',
    label: 'LV.4'
  },
  {
    tier: 4,
    name: 'Persimmon',
    symbol: '🍑',
    radius: 44,
    mass: 5.8,
    scoreValue: 32,
    color: '#FF5500',
    glowColor: '#FF7733',
    accentColor: '#FFCCAA',
    label: 'LV.5'
  },
  {
    tier: 5,
    name: 'Apple',
    symbol: '🍎',
    radius: 52,
    mass: 8.0,
    scoreValue: 64,
    color: '#FF0033',
    glowColor: '#FF3366',
    accentColor: '#FFA3B8',
    label: 'LV.6'
  },
  {
    tier: 6,
    name: 'Pear',
    symbol: '🍐',
    radius: 60,
    mass: 10.5,
    scoreValue: 128,
    color: '#00FF66',
    glowColor: '#33FF88',
    accentColor: '#B8FFD4',
    label: 'LV.7'
  },
  {
    tier: 7,
    name: 'Peach',
    symbol: '🍑',
    radius: 70,
    mass: 13.5,
    scoreValue: 256,
    color: '#FF66CC',
    glowColor: '#FF99DD',
    accentColor: '#FFE6F7',
    label: 'LV.8'
  },
  {
    tier: 8,
    name: 'Pineapple',
    symbol: '🍍',
    radius: 82,
    mass: 17.5,
    scoreValue: 512,
    color: '#FFDE59',
    glowColor: '#FFE885',
    accentColor: '#FFFCEB',
    label: 'LV.9'
  },
  {
    tier: 9,
    name: 'Melon',
    symbol: '🍈',
    radius: 96,
    mass: 22.5,
    scoreValue: 1024,
    color: '#00FFCC',
    glowColor: '#4DFFDB',
    accentColor: '#CCFFF5',
    label: 'LV.10'
  },
  {
    tier: 10,
    name: 'Watermelon',
    symbol: '🍉',
    radius: 112,
    mass: 29.0,
    scoreValue: 2048,
    color: '#7DF9FF',
    glowColor: '#00FF66',
    accentColor: '#FFFFFF',
    label: 'MAX'
  }
];

// Physical Fruit Instance
interface FruitBody {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  rotation: number;
  vRot: number;
  isMerging: boolean;
  spawnTime: number;
  isResting: boolean;
}

// Particle Shockwave Effect
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'spark' | 'ring';
}

// Floating Score Popups
interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

export default function CyberFruitMergeGame({ gameId = 'g_merge_25', onGameOver }: CyberFruitMergeGameProps) {
  // Canvas & Physics Configuration
  const CANVAS_WIDTH = 420;
  const CANVAS_HEIGHT = 620;
  const WALL_LEFT = 20;
  const WALL_RIGHT = CANVAS_WIDTH - 20;
  const FLOOR_Y = CANVAS_HEIGHT - 20;
  const DANGER_LINE_Y = 115;
  const DROPPER_Y = 55;
  const GRAVITY = 0.28;
  const RESTITUTION = 0.22;
  const DAMPING_X = 0.992;
  const DAMPING_Y = 0.996;
  const DAMPING_ROT = 0.98;
  const DANGER_MAX_TIME = 3.0; // seconds above line before game over

  // Game States
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [nextTier, setNextTier] = useState(0);
  const [showEvolutionChart, setShowEvolutionChart] = useState(false);
  const [dangerSeconds, setDangerSeconds] = useState(0);
  const [watermelonsCreated, setWatermelonsCreated] = useState(0);

  // References for Animation & Physics Loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const physicsAccumulatorRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);

  const fruitsRef = useRef<FruitBody[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextFruitIdRef = useRef<number>(1);
  const nextTextIdRef = useRef<number>(1);

  const dropperXRef = useRef<number>(CANVAS_WIDTH / 2);
  const currentDropperTierRef = useRef<number>(0);
  const nextDropperTierRef = useRef<number>(0);
  const canDropRef = useRef<boolean>(true);
  const dropCooldownTimerRef = useRef<number>(0);

  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const lastMergeTimeRef = useRef<number>(0);
  const dangerTimerRef = useRef<number>(0);
  const isGameOverRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);

  // Initialize random drop tier (Tiers 0 - 3 for fairness: Cherry, Strawberry, Grape, Dekopon)
  const getRandomSpawnTier = useCallback((): number => {
    const r = Math.random();
    if (r < 0.45) return 0; // 45% Cherry
    if (r < 0.75) return 1; // 30% Strawberry
    if (r < 0.92) return 2; // 17% Grape
    return 3; // 8% Dekopon
  }, []);

  // Sync mute state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('breakhub_cyber_fruit_high_score');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) setHighScore(val);
      }
    } catch {}
  }, []);

  // Web Audio Synthesizer
  const playSynthSound = useCallback((type: 'drop' | 'merge' | 'combo' | 'danger' | 'gameover' | 'watermelon', tier = 0) => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'drop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280 + tier * 30, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (type === 'merge') {
        // Ascending harmonic chime based on tier
        const baseFreq = 260 + tier * 70;
        [0, 4, 7].forEach((semi, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const freq = baseFreq * Math.pow(2, semi / 12);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.03);
          gain.gain.setValueAtTime(0.25, now + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.03);
          osc.stop(now + 0.3);
        });
      } else if (type === 'combo') {
        // High energy cyber sparkle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.22);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (type === 'danger') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(320, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'watermelon') {
        // Grand victory chord for creating the ultimate Singularity Watermelon
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.06);
          gain.gain.setValueAtTime(0.35, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + 0.75);
        });
      } else if (type === 'gameover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.5);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      }
    } catch {}
  }, []);

  // Spawn Particle Explosion
  const createExplosion = (x: number, y: number, color: string, radius: number, count = 16) => {
    // Ring shockwave
    particlesRef.current.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: radius * 0.5,
      color,
      alpha: 1.0,
      life: 0,
      maxLife: 24,
      shape: 'ring'
    });

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 2.0 + Math.random() * 4.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3.5,
        color,
        alpha: 1.0,
        life: 0,
        maxLife: 20 + Math.floor(Math.random() * 15),
        shape: Math.random() > 0.4 ? 'circle' : 'spark'
      });
    }
  };

  // Add Floating Score Text
  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: nextTextIdRef.current++,
      x,
      y,
      text,
      color,
      alpha: 1.0,
      scale: 1.3
    });
  };

  // Drop Active Fruit
  const dropFruit = useCallback(() => {
    if (!canDropRef.current || isGameOverRef.current || isPausedRef.current) return;

    const tier = currentDropperTierRef.current;
    const config = FRUIT_TIERS[tier];
    const clampedX = Math.max(WALL_LEFT + config.radius, Math.min(WALL_RIGHT - config.radius, dropperXRef.current));

    const newFruit: FruitBody = {
      id: nextFruitIdRef.current++,
      tier,
      x: clampedX,
      y: DROPPER_Y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1.5,
      radius: config.radius,
      mass: config.mass,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.05,
      isMerging: false,
      spawnTime: performance.now(),
      isResting: false
    };

    fruitsRef.current.push(newFruit);
    playSynthSound('drop', tier);

    // Prepare next fruit
    currentDropperTierRef.current = nextDropperTierRef.current;
    const nextRandom = getRandomSpawnTier();
    nextDropperTierRef.current = nextRandom;
    setNextTier(nextRandom);

    // Cooldown lock (350ms)
    canDropRef.current = false;
    dropCooldownTimerRef.current = 22; // ~350ms at 60fps
  }, [getRandomSpawnTier, playSynthSound]);

  // Reset / Start Game
  const resetGame = useCallback(() => {
    fruitsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    nextFruitIdRef.current = 1;
    nextTextIdRef.current = 1;

    scoreRef.current = 0;
    setScore(0);
    comboRef.current = 0;
    setCombo(0);
    dangerTimerRef.current = 0;
    setDangerSeconds(0);
    setWatermelonsCreated(0);

    isGameOverRef.current = false;
    setIsGameOver(false);
    isPausedRef.current = false;
    setIsPaused(false);

    dropperXRef.current = CANVAS_WIDTH / 2;
    currentDropperTierRef.current = getRandomSpawnTier();
    const nextRandom = getRandomSpawnTier();
    nextDropperTierRef.current = nextRandom;
    setNextTier(nextRandom);
    canDropRef.current = true;
    dropCooldownTimerRef.current = 0;
  }, [getRandomSpawnTier]);

  // Handle Game Over
  const triggerGameOver = useCallback(() => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsGameOver(true);
    playSynthSound('gameover');

    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        localStorage.setItem('breakhub_cyber_fruit_high_score', finalScore.toString());
      } catch {}
    }

    if (onGameOver) {
      onGameOver(finalScore);
    }
  }, [highScore, onGameOver, playSynthSound]);

  // Main Physics Engine & Merge Resolution Loop
  const updatePhysics = useCallback(() => {
    if (isGameOverRef.current || isPausedRef.current) return;

    // Manage drop cooldown
    if (!canDropRef.current) {
      dropCooldownTimerRef.current -= 1;
      if (dropCooldownTimerRef.current <= 0) {
        canDropRef.current = true;
      }
    }

    // Reset combo if inactive for > 2.5 seconds
    const now = performance.now();
    if (comboRef.current > 0 && now - lastMergeTimeRef.current > 2500) {
      comboRef.current = 0;
      setCombo(0);
    }

    const fruits = fruitsRef.current;

    // 1. Integrate Velocity & Gravity
    for (let i = 0; i < fruits.length; i++) {
      const f = fruits[i];
      f.vy += GRAVITY;
      f.vx *= DAMPING_X;
      f.vy *= DAMPING_Y;
      f.x += f.vx;
      f.y += f.vy;
      f.vRot *= DAMPING_ROT;
      f.rotation += f.vRot;
    }

    // 2. Multi-step Constraint & Collision Resolution (8 sub-steps for smooth circle physics)
    const SUB_STEPS = 8;
    for (let step = 0; step < SUB_STEPS; step++) {
      // Wall and Floor Constraints
      for (let i = 0; i < fruits.length; i++) {
        const f = fruits[i];

        // Floor boundary
        if (f.y + f.radius > FLOOR_Y) {
          f.y = FLOOR_Y - f.radius;
          if (f.vy > 0) {
            f.vy = -f.vy * RESTITUTION;
            // Floor rolling friction imparts angular velocity
            f.vRot += f.vx * 0.015;
            f.vx *= 0.88;
          }
        }

        // Left Wall
        if (f.x - f.radius < WALL_LEFT) {
          f.x = WALL_LEFT + f.radius;
          if (f.vx < 0) {
            f.vx = -f.vx * RESTITUTION;
            f.vRot -= f.vy * 0.01;
          }
        }

        // Right Wall
        if (f.x + f.radius > WALL_RIGHT) {
          f.x = WALL_RIGHT - f.radius;
          if (f.vx > 0) {
            f.vx = -f.vx * RESTITUTION;
            f.vRot += f.vy * 0.01;
          }
        }
      }

      // Circle vs Circle Intersections & Physics Resolution
      for (let i = 0; i < fruits.length; i++) {
        for (let j = i + 1; j < fruits.length; j++) {
          const f1 = fruits[i];
          const f2 = fruits[j];

          const dx = f2.x - f1.x;
          const dy = f2.y - f1.y;
          const minDist = f1.radius + f2.radius;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Unmatched tier — do NOT separate (prevent bounce/jump), but allow merge check below
            const tiersUnmatched = f1.tier !== f2.tier;

            // Check Identical Tier Merge Event! (only once, not per sub-step)
            if (f1.tier === f2.tier) {
              f1.isMerging = true;
              f2.isMerging = true;
              continue;
            }

            // Skip impulse for merging pairs (no separation/jump while merging)
            if (f1.isMerging || f2.isMerging) continue;

            // Skip separation impulse when tiers differ (prevent unmatched bounce/jump)
            if (!tiersUnmatched) {
              // Normal Positional Separation based on mass
              const totalMass = f1.mass + f2.mass;
              const m1Ratio = f2.mass / totalMass;
              const m2Ratio = f1.mass / totalMass;

              f1.x -= nx * overlap * m1Ratio;
              f1.y -= ny * overlap * m1Ratio;
              f2.x += nx * overlap * m2Ratio;
              f2.y += ny * overlap * m2Ratio;

              // Velocity Impulse Response
              const kx = f1.vx - f2.vx;
              const ky = f1.vy - f2.vy;
              const p = 2 * (nx * kx + ny * ky) / totalMass;

              f1.vx -= p * f2.mass * nx * (1 + RESTITUTION);
              f1.vy -= p * f2.mass * ny * (1 + RESTITUTION);
              f2.vx += p * f1.mass * nx * (1 + RESTITUTION);
              f2.vy += p * f1.mass * ny * (1 + RESTITUTION);
            }

            // Tangential Friction & Spin
            const tx = -ny;
            const ty = nx;
            const tangentRelVel = kx * tx + ky * ty;
            const frictionImpulse = tangentRelVel * 0.15;
            f1.vRot -= frictionImpulse / f1.radius;
            f2.vRot += frictionImpulse / f2.radius;
          }
        }
      }
    }

    // 3. Process Merges
    const newFruitsToSpawn: FruitBody[] = [];
    const remainingFruits: FruitBody[] = [];

    // Find merged pairs
    const mergedList = fruits.filter(f => f.isMerging);
    const nonMergedList = fruits.filter(f => !f.isMerging);

    for (let i = 0; i < mergedList.length; i += 2) {
      const f1 = mergedList[i];
      const f2 = mergedList[i + 1];
      if (!f1 || !f2) continue;
      if (f1.tier !== f2.tier) {
        f1.isMerging = false; f2.isMerging = false;
        remainingFruits.push(f1, f2);
        continue;
      }

      if (!f2) {
        // Orphaned (single merge flag) — shouldn't happen with tier guard, but safe
        f1.isMerging = false;
        remainingFruits.push(f1);
        continue;
      }

      // Midpoint coordinates for the evolved fruit
      const midX = (f1.x + f2.x) / 2;
      const midY = (f1.y + f2.y) / 2;
      const nextTierIndex = f1.tier + 1;

      // Update Combo Counter & Multipliers
      lastMergeTimeRef.current = performance.now();
      const currentCombo = comboRef.current + 1;
      comboRef.current = currentCombo;
      setCombo(currentCombo);

      const comboMultiplier = Math.min(currentCombo, 10);
      const tierConfig = FRUIT_TIERS[f1.tier];
      const pointsEarned = tierConfig.scoreValue * comboMultiplier;

      scoreRef.current += pointsEarned;
      setScore(scoreRef.current);

      // Trigger Visual & Audio Celebrations
      createExplosion(midX, midY, tierConfig.glowColor, tierConfig.radius * 1.5, 20);
      const comboText = comboMultiplier > 1 ? `+${pointsEarned} (x${comboMultiplier})` : `+${pointsEarned}`;
      addFloatingText(midX, midY - 15, comboText, tierConfig.glowColor);

      if (f1.tier === 10) {
        // Ultimate Watermelon Fusion!
        setWatermelonsCreated(prev => prev + 1);
        playSynthSound('watermelon');
        addFloatingText(midX, midY - 35, 'SINGULARITY FUSION! +10,000', '#7DF9FF');
        scoreRef.current += 10000;
        setScore(scoreRef.current);
        createExplosion(midX, midY, '#7DF9FF', 150, 48);
      } else {
        // Evolve to next tier
        const nextConfig = FRUIT_TIERS[nextTierIndex];
        newFruitsToSpawn.push({
          id: nextFruitIdRef.current++,
          tier: nextTierIndex,
          x: midX,
          y: midY,
          vx: (f1.vx + f2.vx) * 0.4,
          vy: -2.0, // slight upward pop on merge
          radius: nextConfig.radius,
          mass: nextConfig.mass,
          rotation: (f1.rotation + f2.rotation) / 2,
          vRot: (Math.random() - 0.5) * 0.08,
          isMerging: false,
          spawnTime: performance.now(),
          isResting: false
        });

        if (nextTierIndex === 10) {
          setWatermelonsCreated(prev => prev + 1);
          playSynthSound('watermelon');
        } else if (comboMultiplier > 2) {
          playSynthSound('combo', nextTierIndex);
        } else {
          playSynthSound('merge', nextTierIndex);
        }
      }
    }

    fruitsRef.current = [...nonMergedList, ...remainingFruits, ...newFruitsToSpawn];

    // 4. Danger Overflow & Game Over Check
    let hasFruitInDangerZone = false;
    for (const f of fruitsRef.current) {
      // Must have spawned more than 1.2s ago to allow initial drop through launcher
      if (now - f.spawnTime > 1200) {
        if (f.y - f.radius < DANGER_LINE_Y) {
          hasFruitInDangerZone = true;
          break;
        }
      }
    }

    if (hasFruitInDangerZone) {
      dangerTimerRef.current += 1 / 60;
      setDangerSeconds(Math.min(DANGER_MAX_TIME, dangerTimerRef.current));
      if (Math.floor(dangerTimerRef.current * 4) % 2 === 0) {
        playSynthSound('danger');
      }
      if (dangerTimerRef.current >= DANGER_MAX_TIME) {
        triggerGameOver();
      }
    } else {
      if (dangerTimerRef.current > 0) {
        dangerTimerRef.current = Math.max(0, dangerTimerRef.current - 2 / 60);
        setDangerSeconds(dangerTimerRef.current);
      }
    }

    // 5. Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life++;
      if (p.shape === 'ring') {
        p.radius += 2.2;
        p.alpha = 1.0 - p.life / p.maxLife;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // particle gravity
        p.vx *= 0.96;
        p.alpha = 1.0 - p.life / p.maxLife;
      }
      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
      }
    }

    // 6. Update Floating Score Popups
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
      const ft = floatingTextsRef.current[i];
      ft.y -= 1.2;
      ft.alpha -= 0.024;
      ft.scale = Math.max(1.0, ft.scale - 0.015);
      if (ft.alpha <= 0) {
        floatingTextsRef.current.splice(i, 1);
      }
    }
  }, [triggerGameOver, playSynthSound]);

  // Main Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI Backing store scaling
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_WIDTH * dpr || canvas.height !== CANVAS_HEIGHT * dpr) {
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
    }
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // 1. Dark Cyberpunk Matrix Background
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid Floor / Background Scanlines
    ctx.strokeStyle = '#1a103c';
    ctx.lineWidth = 1;
    for (let x = WALL_LEFT; x <= WALL_RIGHT; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FLOOR_Y);
      ctx.stroke();
    }
    for (let y = 0; y <= FLOOR_Y; y += 30) {
      ctx.beginPath();
      ctx.moveTo(WALL_LEFT, y);
      ctx.lineTo(WALL_RIGHT, y);
      ctx.stroke();
    }

    // 2. Container Cyber Walls & Floor with Neo-Brutalist Border
    ctx.fillStyle = '#05020f';
    // Left border zone
    ctx.fillRect(0, 0, WALL_LEFT, CANVAS_HEIGHT);
    // Right border zone
    ctx.fillRect(WALL_RIGHT, 0, CANVAS_WIDTH - WALL_RIGHT, CANVAS_HEIGHT);
    // Bottom border zone
    ctx.fillRect(0, FLOOR_Y, CANVAS_WIDTH, CANVAS_HEIGHT - FLOOR_Y);

    // Container Outline
    ctx.strokeStyle = '#FFDE59';
    ctx.lineWidth = 4;
    ctx.strokeRect(WALL_LEFT, 0, WALL_RIGHT - WALL_LEFT, FLOOR_Y);

    // Neo-Brutalist Solid Outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(WALL_LEFT - 2, -2, WALL_RIGHT - WALL_LEFT + 4, FLOOR_Y + 4);

    // 3. Danger Overflow Threshold Line
    const isDangerActive = dangerTimerRef.current > 0;
    const pulseFactor = Math.sin(performance.now() * 0.01) * 0.5 + 0.5;

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = isDangerActive
      ? `rgba(255, 0, 85, ${0.6 + pulseFactor * 0.4})`
      : 'rgba(255, 0, 85, 0.4)';
    ctx.lineWidth = isDangerActive ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(WALL_LEFT, DANGER_LINE_Y);
    ctx.lineTo(WALL_RIGHT, DANGER_LINE_Y);
    ctx.stroke();
    ctx.restore();

    // Danger Line HUD Warning Text
    if (isDangerActive) {
      const remainingTime = Math.max(0, DANGER_MAX_TIME - dangerTimerRef.current).toFixed(1);
      ctx.fillStyle = '#FF0055';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`⚠️ DANGER: OVERFLOW IN ${remainingTime}s`, WALL_RIGHT - 8, DANGER_LINE_Y - 8);
    } else {
      ctx.fillStyle = 'rgba(255, 0, 85, 0.45)';
      ctx.font = '800 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('CRITICAL LIMIT', WALL_RIGHT - 8, DANGER_LINE_Y - 6);
    }

    // 4. Dropper Aim Laser Projection Guide Line
    if (canDropRef.current && !isGameOverRef.current && !isPausedRef.current) {
      const tier = currentDropperTierRef.current;
      const config = FRUIT_TIERS[tier];
      const clampedX = Math.max(WALL_LEFT + config.radius, Math.min(WALL_RIGHT - config.radius, dropperXRef.current));

      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = `${config.glowColor}66`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(clampedX, DROPPER_Y + config.radius);
      ctx.lineTo(clampedX, FLOOR_Y);
      ctx.stroke();
      ctx.restore();

      // Draw Hanging Dropper Fruit at top
      drawFruit(ctx, clampedX, DROPPER_Y, config, 0, true);
    }

    // 5. Draw Active Fruits on Board
    for (const fruit of fruitsRef.current) {
      const config = FRUIT_TIERS[fruit.tier];
      drawFruit(ctx, fruit.x, fruit.y, config, fruit.rotation, false);
    }

    // 6. Draw Shockwave Particles
    for (const p of particlesRef.current) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'ring') {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 7. Draw Floating Score Text
    for (const ft of floatingTextsRef.current) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `900 ${Math.round(14 * ft.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }, [canDropRef]);

  // Render High-Detail Neo-Brutalist Fruit Sphere
  const drawFruit = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    config: FruitTierConfig,
    rotation: number,
    isHanging: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const r = config.radius;

    // Glowing Neon Shadow
    ctx.shadowColor = config.glowColor;
    ctx.shadowBlur = isHanging ? 8 : 12;

    // Base Radial Gradient Sphere
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    grad.addColorStop(0, config.accentColor);
    grad.addColorStop(0.45, config.color);
    grad.addColorStop(1, '#05020f');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Solid Neo-Brutalist 3px Outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2.5, r * 0.07);
    ctx.stroke();

    // Inner Cyberpunk Circuit Decal
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, -0.6, 1.2);
    ctx.stroke();

    // Top Gloss Highlight Arc
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Center Fruit Icon / Level Indicator
    ctx.rotate(-rotation); // Counter-rotate so text/icon stays upright
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (r >= 22) {
      // Draw Fruit Emoji Icon
      ctx.font = `${Math.round(r * 0.75)}px sans-serif`;
      ctx.fillText(config.symbol, 0, r > 35 ? -r * 0.12 : 0);
    }

    if (r >= 38) {
      // Tier Level Badge
      ctx.fillStyle = '#000000';
      ctx.font = `900 ${Math.max(9, Math.round(r * 0.24))}px sans-serif`;
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 4;
      ctx.fillText(config.label, 0, r * 0.52);
    }

    ctx.restore();
  };

  // Render Next Fruit Preview Mini Canvas
  useEffect(() => {
    const nextCanvas = nextCanvasRef.current;
    if (!nextCanvas) return;
    const ctx = nextCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    nextCanvas.width = 64 * dpr;
    nextCanvas.height = 64 * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, 64, 64);
    const config = FRUIT_TIERS[nextTier];
    if (config) {
      // Scale radius down so it fits nicely inside 64x64 radar
      const scale = Math.min(1, 24 / config.radius);
      const scaledConfig = { ...config, radius: config.radius * scale };
      drawFruit(ctx, 32, 32, scaledConfig, 0, false);
    }
  }, [nextTier]);

  // Main Game Loop Handler
  useEffect(() => {
    let active = true;

    const loop = (time: number) => {
      if (!active) return;
      if (!lastTimestampRef.current) lastTimestampRef.current = time;

      updatePhysics();
      renderCanvas();

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [updatePhysics, renderCanvas]);

  // Mouse & Touch Input Handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const clientX = e.clientX - rect.left;
    dropperXRef.current = clientX * scaleX;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerMove(e);
    dropFruit();
  };

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const MOVE_STEP = 24;

      if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        dropperXRef.current = Math.max(WALL_LEFT + 20, dropperXRef.current - MOVE_STEP);
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        dropperXRef.current = Math.min(WALL_RIGHT - 20, dropperXRef.current + MOVE_STEP);
      } else if (key === ' ' || key === 'arrowdown' || key === 's' || key === 'enter') {
        e.preventDefault();
        dropFruit();
      } else if (key === 'p') {
        e.preventDefault();
        setIsPaused(prev => {
          isPausedRef.current = !prev;
          return !prev;
        });
      } else if (key === 'r') {
        e.preventDefault();
        resetGame();
      } else if (key === 'm') {
        e.preventDefault();
        setIsMuted(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropFruit, resetGame]);

  // Start initial game
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-full md:max-w-4xl lg:max-w-5xl mx-auto md:max-h-[90vh] h-[100dvh] select-none p-1 sm:p-2">
      {/* Top Neo-Brutalist HUD Control Bar */}
      <div className="w-full bg-portal-card border-3 border-black rounded-xl p-2.5 sm:p-3 mb-2 shadow-neo flex items-center justify-between gap-2">
        {/* Score & Combo */}
        <div className="flex items-center gap-3">
          <div className="bg-portal-surface border-2 border-black rounded-lg px-2.5 py-1 shadow-neo-sm">
            <div className="text-[10px] font-black text-portal-text-muted uppercase tracking-wider">SCORE</div>
            <div className="text-lg sm:text-xl font-black text-portal-cyan leading-none">{score}</div>
          </div>

          <div className="bg-portal-surface border-2 border-black rounded-lg px-2.5 py-1 shadow-neo-sm">
            <div className="text-[10px] font-black text-portal-text-muted uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-portal-yellow" /> BEST
            </div>
            <div className="text-lg sm:text-xl font-black text-portal-yellow leading-none">{highScore}</div>
          </div>

          {combo > 1 && (
            <div className="animate-bounce bg-portal-pink border-2 border-black rounded-lg px-2 py-1 shadow-neo-sm flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-portal-yellow fill-portal-yellow" />
              <span className="text-xs font-black text-black">x{combo}</span>
            </div>
          )}
        </div>

        {/* Next Fruit Preview Radar & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Next Fruit Radar */}
          <div className="bg-portal-surface border-2 border-black rounded-lg p-1 shadow-neo-sm flex flex-col items-center justify-center w-12 h-12 relative group" title="Next Fruit in Queue">
            <div className="text-[8px] font-black text-portal-text-muted uppercase tracking-tighter leading-none mb-0.5">NEXT</div>
            <canvas ref={nextCanvasRef} className="w-full h-full object-contain w-7 h-7 object-contain" />
          </div>

          {/* Evolution Chart Toggle */}
          <button
            onClick={() => setShowEvolutionChart(prev => !prev)}
            className={`p-2 rounded-lg border-2 border-black shadow-neo-sm font-black text-xs transition-transform active:translate-y-0.5 ${
              showEvolutionChart ? 'bg-portal-cyan text-black' : 'bg-portal-surface hover:bg-portal-cyan/30 text-portal-text'
            }`}
            title="Fruit Evolution Chart"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="p-2 bg-portal-surface hover:bg-portal-yellow/30 text-portal-text rounded-lg border-2 border-black shadow-neo-sm font-black text-xs transition-transform active:translate-y-0.5"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-portal-pink" /> : <Volume2 className="w-4 h-4 text-portal-lime" />}
          </button>

          {/* Pause / Resume */}
          <button
            onClick={() => {
              setIsPaused(prev => {
                isPausedRef.current = !prev;
                return !prev;
              });
            }}
            className="p-2 bg-portal-surface hover:bg-portal-pink/30 text-portal-text rounded-lg border-2 border-black shadow-neo-sm font-black text-xs transition-transform active:translate-y-0.5"
            title={isPaused ? 'Resume Game' : 'Pause Game'}
          >
            {isPaused ? <Play className="w-4 h-4 text-portal-cyan" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Restart */}
          <button
            onClick={resetGame}
            className="p-2 bg-portal-yellow hover:bg-portal-yellow/90 text-black rounded-lg border-2 border-black shadow-neo-sm font-black text-xs transition-transform active:translate-y-0.5 flex items-center gap-1"
            title="Restart Match"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Evolution Chart Modal Overlay */}
      {showEvolutionChart && (
        <div className="w-full bg-portal-card border-3 border-black rounded-xl p-3 mb-2 shadow-neo animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-portal-yellow uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> CYBER SYNTHESIS EVOLUTION CYCLE
            </div>
            <button
              onClick={() => setShowEvolutionChart(false)}
              className="text-xs font-black text-portal-text-muted hover:text-portal-pink uppercase"
            >
              [CLOSE]
            </button>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 py-1">
            {FRUIT_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="flex flex-col items-center bg-portal-surface border-2 border-black rounded-lg p-1 text-center shadow-neo-sm"
              >
                <span className="text-base sm:text-lg">{tier.symbol}</span>
                <span className="text-[9px] font-black text-portal-text leading-tight mt-0.5">{tier.label}</span>
                <span className="text-[8px] font-bold text-portal-cyan leading-none">+{tier.scoreValue}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-portal-text-muted font-bold text-center mt-2">
            Collide two identical fruits to synthesize the next level! Merge two MAX Watermelons for 10,000 Singularity Points!
          </div>
        </div>
      )}

      {/* Main Game Canvas Viewport */}
      <div className="relative w-full max-w-full max-h-[100dvh] aspect-[420/620] bg-black rounded-2xl border-4 border-black shadow-neo-lg overflow-hidden flex items-center justify-center mx-auto">
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          className="w-full h-full cursor-crosshair touch-none select-none"
        />

        {/* Danger Warning Banner Overlay */}
        {dangerSeconds > 0 && !isGameOver && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-portal-pink border-2 border-black rounded-lg px-3 py-1 shadow-neo-sm animate-pulse z-20 flex items-center gap-1.5 pointer-events-none">
            <Zap className="w-4 h-4 text-portal-yellow fill-portal-yellow" />
            <span className="text-xs font-black text-black uppercase tracking-wider">
              CRITICAL OVERFLOW: {(DANGER_MAX_TIME - dangerSeconds).toFixed(1)}s
            </span>
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && !isGameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-4 text-center animate-fadeIn">
            <div className="bg-portal-yellow border-3 border-black px-4 py-1.5 rounded-lg font-black text-black text-xl uppercase shadow-neo mb-3">
              PAUSED
            </div>
            <p className="text-xs font-bold text-portal-text-muted mb-4 max-w-xs">
              Matrix simulation suspended. Click resume or press [P] to continue.
            </p>
            <button
              onClick={() => {
                setIsPaused(false);
                isPausedRef.current = false;
              }}
              className="bg-portal-cyan hover:bg-portal-cyan/90 text-black border-3 border-black font-black text-sm px-6 py-2 rounded-xl shadow-neo transition-transform active:translate-y-0.5 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" /> RESUME SIMULATION
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4 text-center animate-fadeIn">
            <div className="bg-portal-pink border-3 border-black px-5 py-2 rounded-xl font-black text-black text-2xl uppercase shadow-neo mb-3">
              MATRIX OVERFLOW
            </div>

            <div className="bg-portal-card border-3 border-black rounded-xl p-4 w-full max-w-xs shadow-neo mb-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-black text-portal-text-muted">
                <span>FINAL SCORE</span>
                <span className="text-lg font-black text-portal-cyan">{score}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black text-portal-text-muted">
                <span>WATERMELONS MERGED</span>
                <span className="text-base font-black text-portal-lime">{watermelonsCreated} 🍉</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black text-portal-text-muted border-t-2 border-black pt-2">
                <span>BEST RECORD</span>
                <span className="text-lg font-black text-portal-yellow">{highScore}</span>
              </div>
            </div>

            <button
              onClick={resetGame}
              className="bg-portal-yellow hover:bg-portal-yellow/90 text-black border-3 border-black font-black text-base px-8 py-3 rounded-xl shadow-neo transition-transform active:translate-y-0.5 flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.5]" /> PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Action Button Deck */}
      <div className="w-full max-w-[420px] grid grid-cols-3 gap-2 mt-2">
        <button
          onClick={() => {
            dropperXRef.current = Math.max(WALL_LEFT + 20, dropperXRef.current - 35);
          }}
          className="bg-portal-surface hover:bg-portal-cyan/30 text-portal-text border-2 border-black rounded-xl py-2.5 font-black text-xs shadow-neo-sm flex items-center justify-center gap-1 active:translate-y-0.5"
        >
          <ChevronLeft className="w-4 h-4" /> LEFT
        </button>

        <button
          onClick={dropFruit}
          className="bg-portal-lime hover:bg-portal-lime/90 text-black border-2 border-black rounded-xl py-2.5 font-black text-xs shadow-neo-sm flex items-center justify-center gap-1 active:translate-y-0.5"
        >
          <ArrowDown className="w-4 h-4 stroke-[3]" /> DROP
        </button>

        <button
          onClick={() => {
            dropperXRef.current = Math.min(WALL_RIGHT - 20, dropperXRef.current + 35);
          }}
          className="bg-portal-surface hover:bg-portal-cyan/30 text-portal-text border-2 border-black rounded-xl py-2.5 font-black text-xs shadow-neo-sm flex items-center justify-center gap-1 active:translate-y-0.5"
        >
          RIGHT <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
