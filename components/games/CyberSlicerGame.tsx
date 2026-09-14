'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Flame, Heart, Swords } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberSlicerGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Vertical Ratio (360x640)
const CANVAS_HEIGHT = 640;
const GRAVITY = 0.28;

type FruitKind = 'watermelon' | 'orange' | 'apple' | 'banana' | 'strawberry' | 'bomb';

interface Fruit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: FruitKind;
  rotation: number;
  vRot: number;
  sliced: boolean;
  color: string;
  innerColor: string;
  points: number;
  half1?: { x: number; y: number; vx: number; vy: number; rot: number; vRot: number };
  half2?: { x: number; y: number; vx: number; vy: number; rot: number; vRot: number };
}

interface BladePoint {
  x: number;
  y: number;
  time: number;
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
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
}

const FRUIT_CONFIGS: Record<Exclude<FruitKind, 'bomb'>, { color: string; innerColor: string; radius: number; points: number; name: string }> = {
  watermelon: { color: '#99E885', innerColor: '#FE90E8', radius: 24, points: 20, name: 'Retro Melon' },
  orange: { color: '#F7CB46', innerColor: '#FFDC8B', radius: 20, points: 15, name: 'Golden Orange' },
  apple: { color: '#C0F7FE', innerColor: '#FFFFFF', radius: 19, points: 15, name: 'Cyan Apple' },
  banana: { color: '#FFDC8B', innerColor: '#FAF8F5', radius: 18, points: 25, name: 'Butter Banana' },
  strawberry: { color: '#FE90E8', innerColor: '#FFFFFF', radius: 16, points: 30, name: 'Pink Berry' },
};

export default function CyberSlicerGame({ gameId, onGameOver }: CyberSlicerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
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

  const fruitsRef = useRef<Fruit[]>([]);
  const bladeTrailRef = useRef<BladePoint[]>([]);
  const particlesRef = useRef<SplashParticle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const isPointerDownRef = useRef(false);
  const lastSpawnTimeRef = useRef(0);
  const lastScoreSyncTimeRef = useRef(0);
  const screenShakeRef = useRef(0);
  const sliceComboCountRef = useRef(0);
  const lastSliceTimeRef = useRef(0);

  // Audio Synthesizer for Blade Swipes, Slices, Combos, and Bombs
  const playSfx = useCallback((type: 'swipe' | 'slice' | 'combo' | 'bomb' | 'miss') => {
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

      if (type === 'swipe') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'slice') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'combo') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.22);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'bomb') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.45);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'miss') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {}
  }, []);

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    if (floatingTextsRef.current.length > 8) floatingTextsRef.current.shift();
    floatingTextsRef.current.push({ x, y, text, color, alpha: 1, vy: -1.8 });
  };

  const spawnFruitGroup = () => {
    const count = Math.floor(Math.random() * 3) + 1; // 1 to 3 fruits in a wave
    const kinds: FruitKind[] = ['watermelon', 'orange', 'apple', 'banana', 'strawberry'];

    // Spawn 1 bomb occasionally
    const spawnBomb = Math.random() < 0.28;

    for (let i = 0; i < count; i++) {
      const isBomb = spawnBomb && i === 0;
      const startX = Math.random() * (CANVAS_WIDTH - 100) + 50;
      const targetX = CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 180;
      const flightDuration = 65 + Math.random() * 20;
      const vx = (targetX - startX) / flightDuration;
      const vy = -(Math.random() * 3.5 + 12.5); // launch velocity upwards for 640px vertical space

      if (isBomb) {
        fruitsRef.current.push({
          id: Math.random(),
          x: startX,
          y: CANVAS_HEIGHT + 30,
          vx,
          vy,
          radius: 20,
          kind: 'bomb',
          rotation: 0,
          vRot: (Math.random() - 0.5) * 0.08,
          sliced: false,
          color: '#FE90E8',
          innerColor: '#000000',
          points: 0,
        });
      } else {
        const kind = kinds[Math.floor(Math.random() * kinds.length)] as Exclude<FruitKind, 'bomb'>;
        const cfg = FRUIT_CONFIGS[kind];
        fruitsRef.current.push({
          id: Math.random(),
          x: startX,
          y: CANVAS_HEIGHT + 30,
          vx,
          vy,
          radius: cfg.radius,
          kind,
          rotation: 0,
          vRot: (Math.random() - 0.5) * 0.06,
          sliced: false,
          color: cfg.color,
          innerColor: cfg.innerColor,
          points: cfg.points,
        });
      }
    }
  };

  const startGame = () => {
    fruitsRef.current = [];
    bladeTrailRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    sliceComboCountRef.current = 0;
    lastSliceTimeRef.current = 0;
    lastSpawnTimeRef.current = performance.now();
    lastScoreSyncTimeRef.current = 0;
    screenShakeRef.current = 0;
    setDisplayScore(0);
    setLives(3);
    setCombo(0);
    setIsDead(false);
    setIsPlaying(true);
  };

  // Line segment to Circle Intersection Math (Blade Slicing collision)
  const checkLineIntersectsCircle = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    circle: { x: number; y: number; radius: number }
  ) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return Math.hypot(p1.x - circle.x, p1.y - circle.y) < circle.radius;

    const u = ((circle.x - p1.x) * dx + (circle.y - p1.y) * dy) / (len * len);
    const clampedU = Math.max(0, Math.min(1, u));
    const nearestX = p1.x + clampedU * dx;
    const nearestY = p1.y + clampedU * dy;
    const dist = Math.hypot(nearestX - circle.x, nearestY - circle.y);
    return dist <= circle.radius;
  };

  // Pointer Events (Mouse / Touch Slicing Blade)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isDead) return;
    isPointerDownRef.current = true;
    const target = e.currentTarget;
    const scaledX = (e.nativeEvent.offsetX / target.clientWidth) * CANVAS_WIDTH;
    const scaledY = (e.nativeEvent.offsetY / target.clientHeight) * CANVAS_HEIGHT;
    bladeTrailRef.current = [{ x: scaledX, y: scaledY, time: performance.now() }];
    playSfx('swipe');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isDead || !isPointerDownRef.current) return;
    const target = e.currentTarget;
    const scaledX = (e.nativeEvent.offsetX / target.clientWidth) * CANVAS_WIDTH;
    const scaledY = (e.nativeEvent.offsetY / target.clientHeight) * CANVAS_HEIGHT;

    const now = performance.now();
    const trail = bladeTrailRef.current;
    trail.push({ x: scaledX, y: scaledY, time: now });
    if (trail.length > 12) trail.shift();

    // Check Slicing against active Fruits
    if (trail.length >= 2) {
      const p1 = trail[trail.length - 2];
      const p2 = trail[trail.length - 1];

      fruitsRef.current.forEach((fruit) => {
        if (fruit.sliced) return;

        if (checkLineIntersectsCircle(p1, p2, { x: fruit.x, y: fruit.y, radius: fruit.radius })) {
          fruit.sliced = true;

          if (fruit.kind === 'bomb') {
            // Hit Bomb: Screen Shake & Instant Game Over
            playSfx('bomb');
            screenShakeRef.current = 24;

            // Massive explosion particles
            for (let k = 0; k < 35; k++) {
              particlesRef.current.push({
                x: fruit.x,
                y: fruit.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                radius: Math.random() * 4 + 2,
                color: '#FE90E8',
                alpha: 1,
                life: 0,
                maxLife: 28,
              });
            }

            handleGameOver(true);
          } else {
            // Fruit Sliced Successfully!
            playSfx('slice');

            // Split into two halves
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const perpX = Math.cos(angle + Math.PI / 2);
            const perpY = Math.sin(angle + Math.PI / 2);

            fruit.half1 = {
              x: fruit.x,
              y: fruit.y,
              vx: fruit.vx + perpX * 3.5,
              vy: fruit.vy + perpY * 3.5 - 1.5,
              rot: fruit.rotation,
              vRot: fruit.vRot - 0.08,
            };
            fruit.half2 = {
              x: fruit.x,
              y: fruit.y,
              vx: fruit.vx - perpX * 3.5,
              vy: fruit.vy - perpY * 3.5 - 1.5,
              rot: fruit.rotation,
              vRot: fruit.vRot + 0.08,
            };

            // Splatter retro square particles
            for (let k = 0; k < 14; k++) {
              particlesRef.current.push({
                x: fruit.x,
                y: fruit.y,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,
                radius: Math.random() * 3 + 2,
                color: fruit.color,
                alpha: 1,
                life: 0,
                maxLife: 20,
              });
            }

            // Combo calculation
            if (now - lastSliceTimeRef.current < 260) {
              sliceComboCountRef.current++;
            } else {
              sliceComboCountRef.current = 1;
            }
            lastSliceTimeRef.current = now;

            const comboCount = sliceComboCountRef.current;
            const multiplier = comboCount >= 3 ? comboCount : 1;
            const pointsGained = fruit.points * multiplier;

            scoreRef.current += pointsGained;

            if (comboCount >= 3) {
              playSfx('combo');
              addFloatingText(fruit.x, fruit.y, `${comboCount}X COMBO! +${pointsGained}`, '#F7CB46');
            } else {
              addFloatingText(fruit.x, fruit.y, `+${pointsGained}`, '#000000');
            }
          }
        }
      });
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    bladeTrailRef.current = [];
  };

  const handleGameOver = (hitBomb = false) => {
    setIsDead(true);
    setIsPlaying(false);
    const finalScore = scoreRef.current;
    setDisplayScore(finalScore);
    if (finalScore >= 1000) confetti({ particleCount: 75, spread: 70 });
    setTimeout(() => onGameOverRef.current(finalScore), 0);
  };

  // 60-144+ FPS Idle Background Loop (Neo-Brutalist Warm Ground + Floating Retro Swatch Fruits)
  useEffect(() => {
    if (isPlaying && !isDead) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    // Ambient floating retro fruits for the start dojo
    const idleFruits = [
      { x: 70, baseY: 130, radius: 22, color: '#99E885', innerColor: '#FE90E8', phase: 0, rot: 0, rotSpeed: 0.015 },
      { x: 290, baseY: 170, radius: 18, color: '#C0F7FE', innerColor: '#FFFFFF', phase: 1.5, rot: 1, rotSpeed: -0.018 },
      { x: 60, baseY: 480, radius: 19, color: '#F7CB46', innerColor: '#FFDC8B', phase: 3.0, rot: 2, rotSpeed: 0.02 },
      { x: 295, baseY: 450, radius: 16, color: '#FE90E8', innerColor: '#FFFFFF', phase: 4.5, rot: 3, rotSpeed: -0.022 },
      { x: 180, baseY: 560, radius: 17, color: '#FFDC8B', innerColor: '#FAF8F5', phase: 2.2, rot: 0.5, rotSpeed: 0.012 },
    ];

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

      // 3. Floating Ambient Neo Fruits
      for (let i = 0; i < idleFruits.length; i++) {
        const f = idleFruits[i];
        f.rot += f.rotSpeed * timeScale;
        const curY = f.baseY + Math.sin(timestamp * 0.002 + f.phase) * 12;

        ctx.save();
        ctx.translate(f.x, curY);
        ctx.rotate(f.rot);

        // Hard Drop Shadow
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(3, 3, f.radius, 0, Math.PI * 2);
        ctx.fill();

        // Fruit Body
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner Core
        ctx.fillStyle = f.innerColor;
        ctx.beginPath();
        ctx.arc(-f.radius * 0.28, -f.radius * 0.28, f.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(idleLoop);
    };

    animId = requestAnimationFrame(idleLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead]);

  // 60-144+ FPS Delta-Time Game Loop
  useEffect(() => {
    if (!isPlaying || isDead) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (timestamp: number) => {
      const rawDt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const dt = Math.min(rawDt, 0.045);
      const timeScale = dt * 60;

      // Sync React HUD
      if (timestamp - lastScoreSyncTimeRef.current > 120) {
        lastScoreSyncTimeRef.current = timestamp;
        setDisplayScore(scoreRef.current);
        setLives(livesRef.current);
        setCombo(sliceComboCountRef.current >= 3 ? sliceComboCountRef.current : 0);
      }

      // Spawning Waves
      if (timestamp - lastSpawnTimeRef.current >= 2100) {
        lastSpawnTimeRef.current = timestamp;
        spawnFruitGroup();
      }

      // Update Fruits
      for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
        const fruit = fruitsRef.current[i];

        if (fruit.sliced) {
          // Animate split halves
          if (fruit.half1 && fruit.half2) {
            fruit.half1.x += fruit.half1.vx * timeScale;
            fruit.half1.y += fruit.half1.vy * timeScale;
            fruit.half1.vy += GRAVITY * timeScale;
            fruit.half1.rot += fruit.half1.vRot * timeScale;

            fruit.half2.x += fruit.half2.vx * timeScale;
            fruit.half2.y += fruit.half2.vy * timeScale;
            fruit.half2.vy += GRAVITY * timeScale;
            fruit.half2.rot += fruit.half2.vRot * timeScale;

            if (fruit.half1.y > CANVAS_HEIGHT + 60 && fruit.half2.y > CANVAS_HEIGHT + 60) {
              fruitsRef.current.splice(i, 1);
            }
          }
        } else {
          fruit.x += fruit.vx * timeScale;
          fruit.y += fruit.vy * timeScale;
          fruit.vy += GRAVITY * timeScale;
          fruit.rotation += fruit.vRot * timeScale;

          // Missed fruit fell off screen
          if (fruit.y > CANVAS_HEIGHT + 50 && fruit.vy > 0) {
            if (fruit.kind !== 'bomb') {
              playSfx('miss');
              livesRef.current -= 1;
              setLives(livesRef.current);
              addFloatingText(fruit.x, CANVAS_HEIGHT - 30, '❌ MISS', '#FE90E8');

              if (livesRef.current <= 0) {
                handleGameOver(false);
                cancelAnimationFrame(animId);
                return;
              }
            }
            fruitsRef.current.splice(i, 1);
          }
        }
      }

      // Prune Old Blade Trail Points
      const now = performance.now();
      bladeTrailRef.current = bladeTrailRef.current.filter((pt) => now - pt.time < 120);

      // ==========================================
      // CANVAS 2D RENDER PIPELINE
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

      // 3. Render Splash Particles (Retro Square Sparks)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;
        p.life += timeScale;
        p.alpha = 1 - p.life / p.maxLife;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(p.x | 0, p.y | 0, p.radius * 2, p.radius * 2);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(p.x | 0, p.y | 0, p.radius * 2, p.radius * 2);
        }
      }
      ctx.globalAlpha = 1;

      // 4. Render Fruits & Bombs
      fruitsRef.current.forEach((fruit) => {
        if (fruit.sliced) {
          // Draw Halves
          if (fruit.half1 && fruit.half2) {
            // Half 1
            ctx.save();
            ctx.translate(fruit.half1.x, fruit.half1.y);
            ctx.rotate(fruit.half1.rot);

            // Shadow
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(3, 3, fruit.radius, 0, Math.PI);
            ctx.closePath();
            ctx.fill();

            // Outer
            ctx.fillStyle = fruit.color;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius, 0, Math.PI);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Inner
            ctx.fillStyle = fruit.innerColor;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius * 0.7, 0, Math.PI);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Half 2
            ctx.save();
            ctx.translate(fruit.half2.x, fruit.half2.y);
            ctx.rotate(fruit.half2.rot);

            // Shadow
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(3, 3, fruit.radius, Math.PI, Math.PI * 2);
            ctx.closePath();
            ctx.fill();

            // Outer
            ctx.fillStyle = fruit.color;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius, Math.PI, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Inner
            ctx.fillStyle = fruit.innerColor;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius * 0.7, Math.PI, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        } else {
          // Whole Fruit / Bomb
          ctx.save();
          ctx.translate(fruit.x, fruit.y);
          ctx.rotate(fruit.rotation);

          if (fruit.kind === 'bomb') {
            // Hard Drop Shadow
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(3, 3, fruit.radius, 0, Math.PI * 2);
            ctx.fill();

            // Bomb Body
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FE90E8';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Fuse Spark
            ctx.fillStyle = '#FE90E8';
            ctx.fillRect(-2, -fruit.radius - 5, 4, 4);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(-2, -fruit.radius - 5, 4, 4);

            // Danger Label
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', 0, 0);
          } else {
            // Hard Drop Shadow
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(3, 3, fruit.radius, 0, Math.PI * 2);
            ctx.fill();

            // Neo Fruit Body
            ctx.fillStyle = fruit.color;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Core highlight
            ctx.fillStyle = fruit.innerColor;
            ctx.beginPath();
            ctx.arc(-fruit.radius * 0.28, -fruit.radius * 0.28, fruit.radius * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          ctx.restore();
        }
      });

      // 5. Render Katana Blade Trail with Solid High-Contrast Edge
      const trail = bladeTrailRef.current;
      if (trail.length >= 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          const progress = i / trail.length;

          // Outer Black Stroke
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = progress * 7;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Bright Core Blade (Pink / Cyan / White)
          ctx.strokeStyle = '#FE90E8';
          ctx.lineWidth = progress * 3.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // 6. Floating Score / Combo Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * timeScale;
        ft.alpha -= 0.025 * timeScale;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = '900 13px sans-serif';
          ctx.textAlign = 'center';

          // Shadow
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
  }, [isPlaying, isDead, playSfx]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        {/* Score */}
        <div className="flex items-center gap-1.5 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Swords className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] uppercase tracking-wider">Score</span>
          <span className="text-xs font-black">{displayScore}</span>
        </div>

        {/* Combo */}
        {combo >= 3 && (
          <div className="flex items-center gap-1 bg-portal-green px-2 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[10px] font-black text-black animate-pulse">
            <Flame className="w-3 h-3 text-black stroke-[2.5]" />
            <span>{combo}X COMBO</span>
          </div>
        )}

        {/* Lives / Strikes */}
        <div className="flex items-center gap-1 bg-portal-pink px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs">
          {[1, 2, 3].map((heart) => (
            <Heart
              key={heart}
              className={`w-3.5 h-3.5 stroke-[2.5] transition-all ${
                heart <= lives ? 'text-black fill-black' : 'text-black/30 fill-transparent'
              }`}
            />
          ))}
        </div>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
          title="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />}
        </button>
      </div>

      {/* Main Slicing Dojo Canvas (9:16 Ratio) with Figma Handles */}
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
                  ⚡ DOJO RUN ENDED ⚡
                </div>

                <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Final Slice Score</div>
                  <div className="text-3xl font-black text-black tracking-tight">{displayScore}</div>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3]" />
                  <span>RETRY BLADE RUN</span>
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
                  <Swords className="w-7 h-7 stroke-[2.5]" />
                </div>

                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                    • [ RETRO KATANA DOJO ] •
                  </div>
                  <h3 className="text-xl font-black text-black tracking-tight uppercase">
                    Cyber Slicer
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">
                    Swipe or Drag across screen to slash fruits!
                  </p>
                </div>

                {/* Dojo Rules */}
                <div className="bg-[#FAF8F5] p-3 rounded-xl border-2 border-black text-[10px] text-slate-800 space-y-1.5 text-left font-bold shadow-neo-xs">
                  <div className="flex items-center gap-1.5 text-black">
                    <Sparkles className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
                    <span>Swipe / Drag to slash flying fruits!</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-black">
                    <Flame className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
                    <span>Multi-Slice: 3+ fruits in 1 swipe for Combos!</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-black">
                    <span className="shrink-0 text-xs">💣</span>
                    <span>AVOID BOMBS: Slicing a bomb is instant death!</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                  <span>ENTER DOJO</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider mt-2.5 text-center">
        Controls: Swipe or drag to wield your blade
      </p>
    </div>
  );
}
