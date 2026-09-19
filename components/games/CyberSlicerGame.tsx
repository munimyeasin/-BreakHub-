'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Flame, Heart, Swords, Zap, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberSlicerGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Vertical Ratio (360x640)
const CANVAS_HEIGHT = 640;
const GRAVITY = 0.28;

type TargetKind = 'cyanCube' | 'rubyPrism' | 'solarCube' | 'emeraldPoly' | 'violetCore' | 'hazardBomb';

interface TargetConfig {
  name: string;
  faceColors: [string, string];
  sideColors: [string, string];
  specularColor: string;
  radius: number;
  points: number;
  geometry: 'cube' | 'prism' | 'solar' | 'poly' | 'core';
}

const TARGET_CONFIGS: Record<Exclude<TargetKind, 'hazardBomb'>, TargetConfig> = {
  cyanCube: {
    name: 'Cyan Quantum Cube',
    faceColors: ['#7DF9FF', '#00D0FF'],
    sideColors: ['#0099CC', '#006699'],
    specularColor: '#E0FFFF',
    radius: 23,
    points: 20,
    geometry: 'cube',
  },
  rubyPrism: {
    name: 'Ruby Energy Prism',
    faceColors: ['#FF63C6', '#FF007F'],
    sideColors: ['#BA005C', '#8A0044'],
    specularColor: '#FFE4E6',
    radius: 21,
    points: 15,
    geometry: 'prism',
  },
  solarCube: {
    name: 'Solar Power Module',
    faceColors: ['#FFF570', '#FFE600'],
    sideColors: ['#D49B00', '#805D00'],
    specularColor: '#FFFFE0',
    radius: 22,
    points: 25,
    geometry: 'solar',
  },
  emeraldPoly: {
    name: 'Emerald Kinetic Crystal',
    faceColors: ['#4ADE80', '#22C55E'],
    sideColors: ['#15803D', '#14532D'],
    specularColor: '#DCFCE7',
    radius: 20,
    points: 30,
    geometry: 'poly',
  },
  violetCore: {
    name: 'Violet Plasma Core',
    faceColors: ['#C084FC', '#9333EA'],
    sideColors: ['#7E22CE', '#581C87'],
    specularColor: '#F3E8FF',
    radius: 19,
    points: 35,
    geometry: 'core',
  },
};

interface TargetHalf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  cutAngle: number;
}

interface CyberTarget {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: TargetKind;
  rotation: number;
  vRot: number;
  sliced: boolean;
  half1?: TargetHalf;
  half2?: TargetHalf;
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
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isSpark?: boolean;
}

interface ActionBadge {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  vy: number;
  life: number;
  maxLife: number;
}

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

  const targetsRef = useRef<CyberTarget[]>([]);
  const bladeTrailRef = useRef<BladePoint[]>([]);
  const particlesRef = useRef<SplashParticle[]>([]);
  const actionBadgesRef = useRef<ActionBadge[]>([]);
  const isPointerDownRef = useRef(false);
  const lastSpawnTimeRef = useRef(0);
  const lastScoreSyncTimeRef = useRef(0);
  const screenShakeRef = useRef(0);
  const sliceComboCountRef = useRef(0);
  const lastSliceTimeRef = useRef(0);
  const lastBladePosRef = useRef<{ x: number; y: number; angle: number }>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    angle: -Math.PI / 4,
  });

  // Audio Synthesizer for Blade Swipes, Metallic Slices, Combos, and Hazard Detonations
  const playSfx = useCallback((type: 'swipe' | 'slice' | 'combo' | 'bomb' | 'miss' | 'powerup') => {
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
        // High-velocity metallic air whoosh
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.06);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'slice') {
        // Razor-sharp laser blade cut
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.09);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'combo') {
        // Harmonic power fanfare
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.22);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'bomb') {
        // Sub-bass detonation shockwave
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'miss') {
        // Strike miss buzzer
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.16);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      }
    } catch {}
  }, []);

  const addActionBadge = (x: number, y: number, text: string, color: string, scale = 1.0) => {
    if (actionBadgesRef.current.length > 6) actionBadgesRef.current.shift();
    actionBadgesRef.current.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      scale,
      vy: -1.6,
      life: 0,
      maxLife: 42,
    });
  };

  const spawnTargetWave = () => {
    const count = Math.floor(Math.random() * 3) + 1; // 1 to 3 targets in a wave
    const kinds: TargetKind[] = ['cyanCube', 'rubyPrism', 'solarCube', 'emeraldPoly', 'violetCore'];

    // Spawn 1 bomb occasionally (26% probability)
    const spawnBomb = Math.random() < 0.26;

    for (let i = 0; i < count; i++) {
      const isBomb = spawnBomb && i === 0;
      const startX = Math.random() * (CANVAS_WIDTH - 100) + 50;
      const targetX = CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 190;
      const flightDuration = 65 + Math.random() * 20;
      const vx = (targetX - startX) / flightDuration;
      const vy = -(Math.random() * 3.5 + 12.6); // Launch velocity upwards for 640px vertical space

      if (isBomb) {
        targetsRef.current.push({
          id: Math.random(),
          x: startX,
          y: CANVAS_HEIGHT + 30,
          vx,
          vy,
          radius: 22,
          kind: 'hazardBomb',
          rotation: 0,
          vRot: (Math.random() - 0.5) * 0.08,
          sliced: false,
        });
      } else {
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const cfg = TARGET_CONFIGS[kind as Exclude<TargetKind, 'hazardBomb'>];
        targetsRef.current.push({
          id: Math.random(),
          x: startX,
          y: CANVAS_HEIGHT + 30,
          vx,
          vy,
          radius: cfg.radius,
          kind,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.07,
          sliced: false,
        });
      }
    }
  };

  const startGame = () => {
    targetsRef.current = [];
    bladeTrailRef.current = [];
    particlesRef.current = [];
    actionBadgesRef.current = [];
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
    lastBladePosRef.current = { x: scaledX, y: scaledY, angle: -Math.PI / 4 };
    playSfx('swipe');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isDead || !isPointerDownRef.current) return;
    const target = e.currentTarget;
    const scaledX = (e.nativeEvent.offsetX / target.clientWidth) * CANVAS_WIDTH;
    const scaledY = (e.nativeEvent.offsetY / target.clientHeight) * CANVAS_HEIGHT;

    const now = performance.now();
    const trail = bladeTrailRef.current;
    const prevPt = trail.length > 0 ? trail[trail.length - 1] : { x: scaledX, y: scaledY };
    const swipeAngle = Math.atan2(scaledY - prevPt.y, scaledX - prevPt.x);

    lastBladePosRef.current = { x: scaledX, y: scaledY, angle: swipeAngle };
    trail.push({ x: scaledX, y: scaledY, time: now });
    if (trail.length > 14) trail.shift();

    // Check Slicing against active Cyber Targets
    if (trail.length >= 2) {
      const p1 = trail[trail.length - 2];
      const p2 = trail[trail.length - 1];

      targetsRef.current.forEach((t) => {
        if (t.sliced) return;

        if (checkLineIntersectsCircle(p1, p2, { x: t.x, y: t.y, radius: t.radius })) {
          t.sliced = true;

          if (t.kind === 'hazardBomb') {
            // Hit Spiked Hazard Bomb: Screen Shake & Instant Game Over
            playSfx('bomb');
            screenShakeRef.current = 26;

            // Massive red plasma detonation sparks & shockwaves
            for (let k = 0; k < 40; k++) {
              particlesRef.current.push({
                x: t.x,
                y: t.y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                size: Math.random() * 5 + 2.5,
                color: Math.random() < 0.6 ? '#FF0055' : '#FFE600',
                alpha: 1,
                life: 0,
                maxLife: 32,
                isSpark: true,
              });
            }

            addActionBadge(t.x, t.y - 20, 'HAZARD BREACH!', '#FF0055', 1.25);
            handleGameOver(true);
          } else {
            // Target Sliced Successfully with Katana Blade!
            playSfx('slice');
            const cfg = TARGET_CONFIGS[t.kind];

            // Split into two 3D tumbling halves along cutting plane
            const cutAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const perpX = Math.cos(cutAngle + Math.PI / 2);
            const perpY = Math.sin(cutAngle + Math.PI / 2);

            t.half1 = {
              x: t.x,
              y: t.y,
              vx: t.vx + perpX * 3.8,
              vy: t.vy + perpY * 3.8 - 1.8,
              rot: t.rotation,
              vRot: t.vRot - 0.09,
              cutAngle,
            };
            t.half2 = {
              x: t.x,
              y: t.y,
              vx: t.vx - perpX * 3.8,
              vy: t.vy - perpY * 3.8 - 1.8,
              rot: t.rotation,
              vRot: t.vRot + 0.09,
              cutAngle,
            };

            // Glowing Molten Plasma Juice & Circuit Splatter Particles
            for (let k = 0; k < 16; k++) {
              particlesRef.current.push({
                x: t.x,
                y: t.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 4 + 2,
                color: Math.random() < 0.5 ? '#FFE600' : cfg.faceColors[1],
                alpha: 1,
                life: 0,
                maxLife: 24,
                isSpark: Math.random() < 0.4,
              });
            }

            // Combo calculation
            if (now - lastSliceTimeRef.current < 280) {
              sliceComboCountRef.current++;
            } else {
              sliceComboCountRef.current = 1;
            }
            lastSliceTimeRef.current = now;

            const comboCount = sliceComboCountRef.current;
            const multiplier = comboCount >= 3 ? comboCount : 1;
            const pointsGained = cfg.points * multiplier;

            scoreRef.current += pointsGained;

            if (comboCount >= 4) {
              playSfx('combo');
              addActionBadge(t.x, t.y, `SLASH x${comboCount}! +${pointsGained}`, '#FFE600', 1.2);
            } else if (comboCount === 3) {
              playSfx('combo');
              addActionBadge(t.x, t.y, `PERFECT SLICE! +${pointsGained}`, '#00F0FF', 1.1);
            } else {
              addActionBadge(t.x, t.y, `+${pointsGained}`, cfg.faceColors[0], 0.95);
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

  // ==========================================
  // 3D ISOMETRIC VECTOR RENDERING FUNCTIONS
  // Matching public/thumbnails/cyber-slicer.svg
  // ==========================================

  // 1. Draw 3D Extruded Target (Whole)
  const draw3DTarget = (ctx: CanvasRenderingContext2D, t: CyberTarget) => {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.rotation);

    if (t.kind === 'hazardBomb') {
      // 3D Spiked Cyber Hazard Mine/Bomb
      const r = t.radius;

      // Drop shadow
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(3.5, 3.5, r, 0, Math.PI * 2);
      ctx.fill();

      // Outer Faceted Spikes (8 spikes)
      for (let s = 0; s < 8; s++) {
        const ang = (s * Math.PI) / 4;
        const spikeLen = r + 7;
        const x1 = Math.cos(ang) * spikeLen;
        const y1 = Math.sin(ang) * spikeLen;
        const x2 = Math.cos(ang + 0.25) * (r - 2);
        const y2 = Math.sin(ang + 0.25) * (r - 2);
        const x3 = Math.cos(ang - 0.25) * (r - 2);
        const y3 = Math.sin(ang - 0.25) * (r - 2);

        ctx.fillStyle = '#FF0055';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // Dark Faceted Chassis Base
      ctx.fillStyle = '#180210';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Hazard Inner Core Ring
      ctx.fillStyle = '#FF007F';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Warning Danger Skull / Spark Glyph
      ctx.fillStyle = '#FFE600';
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 0);
    } else {
      const cfg = TARGET_CONFIGS[t.kind];
      const r = t.radius;

      // Hard Drop Shadow
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.rect(-r + 3.5, -r + 3.5, r * 2, r * 2);
      ctx.fill();

      // 3D Extruded Side (Dark Shaded Facet)
      const sideGrad = ctx.createLinearGradient(-r, -r, r, r);
      sideGrad.addColorStop(0, cfg.sideColors[0]);
      sideGrad.addColorStop(1, cfg.sideColors[1]);
      ctx.fillStyle = sideGrad;
      ctx.beginPath();
      ctx.moveTo(r, -r);
      ctx.lineTo(r + 8, -r + 8);
      ctx.lineTo(r + 8, r + 8);
      ctx.lineTo(-r + 8, r + 8);
      ctx.lineTo(-r, r);
      ctx.lineTo(r, r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Main Front Face (Bright Glossy Facet)
      const faceGrad = ctx.createLinearGradient(-r, -r, r, r);
      faceGrad.addColorStop(0, cfg.faceColors[0]);
      faceGrad.addColorStop(1, cfg.faceColors[1]);
      ctx.fillStyle = faceGrad;
      ctx.beginPath();
      ctx.rect(-r, -r, r * 2, r * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Specular Reflection Highlight
      ctx.fillStyle = cfg.specularColor;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(-r + 4, -r + 4);
      ctx.lineTo(r - 4, -r + 4);
      ctx.lineTo(r - 10, -r + 10);
      ctx.lineTo(-r + 4, -r + 10);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Neo Circuit Center Node
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // 2. Draw 3D Sliced Tumbling Halves with Exposed Molten Energy Interior
  const draw3DTargetHalf = (
    ctx: CanvasRenderingContext2D,
    half: TargetHalf,
    kind: TargetKind,
    isUpper: boolean
  ) => {
    ctx.save();
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rot);

    if (kind === 'hazardBomb') {
      // Sliced Bomb Halves
      ctx.fillStyle = '#FF0055';
      ctx.beginPath();
      if (isUpper) {
        ctx.arc(0, 0, 20, 0, Math.PI);
      } else {
        ctx.arc(0, 0, 20, Math.PI, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      const cfg = TARGET_CONFIGS[kind];
      const r = cfg.radius;

      // Exposed Glowing Molten Core Face (Linear gradient: White -> Gold -> Magenta)
      const moltenGrad = ctx.createLinearGradient(-r, 0, r, 0);
      moltenGrad.addColorStop(0, '#FFFFFF');
      moltenGrad.addColorStop(0.4, '#FFE600');
      moltenGrad.addColorStop(1, '#FF007F');

      // 3D Extruded Shell Face
      const faceGrad = ctx.createLinearGradient(-r, -r, r, r);
      faceGrad.addColorStop(0, cfg.faceColors[0]);
      faceGrad.addColorStop(1, cfg.faceColors[1]);

      const sideGrad = ctx.createLinearGradient(-r, -r, r, r);
      sideGrad.addColorStop(0, cfg.sideColors[0]);
      sideGrad.addColorStop(1, cfg.sideColors[1]);

      if (isUpper) {
        // Upper Half: Top Polygon + Exposed Molten Slice Face
        // 3D Side Depth
        ctx.fillStyle = sideGrad;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(r + 6, 6);
        ctx.lineTo(-r + 6, 6);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Upper Shell
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(-r, -r);
        ctx.lineTo(r, -r);
        ctx.lineTo(r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.6;
        ctx.stroke();

        // Exposed Cut Molten Surface
        ctx.fillStyle = moltenGrad;
        ctx.beginPath();
        ctx.rect(-r + 2, -3, (r - 2) * 2, 6);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        // Lower Half
        ctx.fillStyle = sideGrad;
        ctx.beginPath();
        ctx.moveTo(r, r);
        ctx.lineTo(r + 6, r + 6);
        ctx.lineTo(-r + 6, r + 6);
        ctx.lineTo(-r, r);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(-r, r);
        ctx.lineTo(r, r);
        ctx.lineTo(r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.6;
        ctx.stroke();

        // Exposed Cut Molten Surface
        ctx.fillStyle = moltenGrad;
        ctx.beginPath();
        ctx.rect(-r + 2, -3, (r - 2) * 2, 6);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // 3. Draw 3D Cyber Katana Blade
  const draw3DKatanaBlade = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    scale = 0.55,
    alpha = 1.0
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    // Hard Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(6, 6, 8, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Blade Spine (Thick Dark Steel Polygon)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-6, -110);
    ctx.lineTo(0, -120);
    ctx.lineTo(0, 45);
    ctx.lineTo(-6, 40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Main Steel Bevel Face (Glossy Steel Gradient)
    const steelGrad = ctx.createLinearGradient(0, -120, 10, 45);
    steelGrad.addColorStop(0, '#FFFFFF');
    steelGrad.addColorStop(0.35, '#E2E8F0');
    steelGrad.addColorStop(0.7, '#94A3B8');
    steelGrad.addColorStop(1, '#475569');
    ctx.fillStyle = steelGrad;
    ctx.beginPath();
    ctx.moveTo(0, -120);
    ctx.lineTo(12, -100);
    ctx.lineTo(7, 45);
    ctx.lineTo(0, 45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Neon Laser Cutting Edge (Magenta -> Cyan Laser Core)
    const edgeGrad = ctx.createLinearGradient(12, -100, 10, 45);
    edgeGrad.addColorStop(0, '#FF3DF5');
    edgeGrad.addColorStop(0.5, '#FF007F');
    edgeGrad.addColorStop(1, '#00F0FF');
    ctx.fillStyle = edgeGrad;
    ctx.beginPath();
    ctx.moveTo(12, -100);
    ctx.lineTo(16, -90);
    ctx.lineTo(10, 45);
    ctx.lineTo(7, 45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Specular Reflection Glare Streak
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.moveTo(2, -110);
    ctx.lineTo(7, -90);
    ctx.lineTo(3, 35);
    ctx.lineTo(-1, 35);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha;

    // 3D Sword Guard (Tsuba)
    ctx.save();
    ctx.translate(3, 48);
    const tsubaGrad = ctx.createLinearGradient(-22, 0, 22, 0);
    tsubaGrad.addColorStop(0, '#FFF570');
    tsubaGrad.addColorStop(1, '#D49B00');

    // 3D Guard Depth
    ctx.fillStyle = '#805D00';
    ctx.beginPath();
    ctx.ellipse(0, 3.5, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Guard Face
    ctx.fillStyle = tsubaGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // 3D Handle (Tsuka) with Gold Diamond Wrap Lacing
    ctx.save();
    ctx.translate(3, 56);
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.rect(-6, 0, 12, 48);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Gold Diamond Ito Wraps
    const diamondGrad = ctx.createLinearGradient(-4, 0, 4, 0);
    diamondGrad.addColorStop(0, '#FFF570');
    diamondGrad.addColorStop(1, '#D49B00');
    ctx.fillStyle = diamondGrad;

    for (let d = 6; d <= 36; d += 12) {
      ctx.beginPath();
      ctx.moveTo(0, d);
      ctx.lineTo(4, d + 5);
      ctx.lineTo(0, d + 10);
      ctx.lineTo(-4, d + 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Pommel (Kashira)
    ctx.fillStyle = diamondGrad;
    ctx.beginPath();
    ctx.rect(-7, 46, 14, 6);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  };

  // 4. Draw 16-Point Neo-Brutalist Starburst Action Badge
  const drawStarburstBadge = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    scale: number,
    alpha: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, alpha);

    // Hard Drop Shadow
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    const points = 16;
    const outerR = 36;
    const innerR = 24;
    for (let p = 0; p < points * 2; p++) {
      const angle = (p * Math.PI) / points;
      const r = p % 2 === 0 ? outerR : innerR;
      const bx = Math.cos(angle) * r + 3;
      const by = Math.sin(angle) * r + 3;
      if (p === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fill();

    // Golden Starburst Body
    const badgeGrad = ctx.createLinearGradient(0, -outerR, 0, outerR);
    badgeGrad.addColorStop(0, '#FFF066');
    badgeGrad.addColorStop(1, '#FFE600');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    for (let p = 0; p < points * 2; p++) {
      const angle = (p * Math.PI) / points;
      const r = p % 2 === 0 ? outerR : innerR;
      const bx = Math.cos(angle) * r;
      const by = Math.sin(angle) * r;
      if (p === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Text Label
    ctx.fillStyle = '#000000';
    ctx.font = '900 11px Impact, "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);

    ctx.restore();
  };

  // 60-144+ FPS Idle Background Loop (Animated Cyber Dojo Start Screen)
  useEffect(() => {
    if (isPlaying && !isDead) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    // Ambient floating 3D targets for the start dojo
    const idleTargets: CyberTarget[] = [
      {
        id: 1,
        x: 75,
        y: 130,
        vx: 0,
        vy: 0,
        radius: 23,
        kind: 'cyanCube',
        rotation: 0.2,
        vRot: 0.015,
        sliced: false,
      },
      {
        id: 2,
        x: 285,
        y: 170,
        vx: 0,
        vy: 0,
        radius: 21,
        kind: 'rubyPrism',
        rotation: 0.8,
        vRot: -0.018,
        sliced: false,
      },
      {
        id: 3,
        x: 65,
        y: 470,
        vx: 0,
        vy: 0,
        radius: 22,
        kind: 'solarCube',
        rotation: 1.5,
        vRot: 0.02,
        sliced: false,
      },
      {
        id: 4,
        x: 295,
        y: 450,
        vx: 0,
        vy: 0,
        radius: 19,
        kind: 'violetCore',
        rotation: 2.2,
        vRot: -0.022,
        sliced: false,
      },
      {
        id: 5,
        x: 180,
        y: 550,
        vx: 0,
        vy: 0,
        radius: 20,
        kind: 'emeraldPoly',
        rotation: 0.5,
        vRot: 0.012,
        sliced: false,
      },
    ];

    // Ambient sparks
    const idleSparks = Array.from({ length: 24 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      vy: Math.random() * 0.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.7 + 0.3,
      color: Math.random() < 0.5 ? '#00F0FF' : Math.random() < 0.8 ? '#FF007F' : '#FFE600',
    }));

    // Ambient slash line state
    let nextSlashTime = performance.now() + 1200;
    let activeSlash: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      progress: number;
      particles: { x: number; y: number; vx: number; vy: number; alpha: number; color: string }[];
    } | null = null;

    let gridOffset = 0;

    const idleLoop = (timestamp: number) => {
      const rawDt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const dt = Math.min(rawDt, 0.045);
      const timeScale = dt * 60;

      // 1. Clear Dojo Background (Matching public/thumbnails/cyber-slicer.svg)
      ctx.fillStyle = '#18000F';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Cosmic Ambient Radial Glow
      const radGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT * 0.42,
        15,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT * 0.42,
        CANVAS_WIDTH * 0.75
      );
      if (isDead) {
        radGrad.addColorStop(0, 'rgba(255, 0, 85, 0.22)');
        radGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.08)');
        radGrad.addColorStop(1, 'rgba(24, 0, 15, 0)');
      } else {
        radGrad.addColorStop(0, 'rgba(255, 0, 127, 0.18)');
        radGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.1)');
        radGrad.addColorStop(1, 'rgba(24, 0, 15, 0)');
      }
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 3. Cyber Dojo Perspective Grid (Dashed Arena Grid)
      const horizonY = CANVAS_HEIGHT * 0.68;
      gridOffset = (gridOffset + 0.35 * timeScale) % 24;

      ctx.save();
      ctx.strokeStyle = '#3D1030';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);

      // Perspective vertical fan lines
      const vanishingX = CANVAS_WIDTH / 2;
      for (let x = -CANVAS_WIDTH; x <= CANVAS_WIDTH * 2; x += 40) {
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Moving horizontal grid lines with perspective spacing
      for (let y = horizonY + gridOffset; y < CANVAS_HEIGHT; y += 22) {
        const factor = (y - horizonY) / (CANVAS_HEIGHT - horizonY);
        ctx.strokeStyle = `rgba(255, 0, 127, ${factor * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // 4. Ambient Floating Sparks / Embers
      for (let i = 0; i < idleSparks.length; i++) {
        const sp = idleSparks[i];
        sp.y -= sp.vy * timeScale;
        sp.x += sp.vx * timeScale;
        if (sp.y < -10) {
          sp.y = CANVAS_HEIGHT + 10;
          sp.x = Math.random() * CANVAS_WIDTH;
        }
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.alpha * 0.7;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 5. Floating Ambient 3D Cyber Targets
      for (let i = 0; i < idleTargets.length; i++) {
        const t = idleTargets[i];
        t.rotation += t.vRot * timeScale;
        const baseY = i === 0 ? 130 : i === 1 ? 170 : i === 2 ? 470 : i === 3 ? 450 : 550;
        t.y = baseY + Math.sin(timestamp * 0.002 + i * 1.5) * 12;
        draw3DTarget(ctx, t);
      }

      // 6. Ambient Periodic Katana Slash Arc with 3D Cyber Blade
      if (timestamp >= nextSlashTime && !activeSlash) {
        nextSlashTime = timestamp + Math.random() * 2000 + 1800;
        const angle = (Math.random() - 0.5) * 1.2 - 0.4;
        const midY = Math.random() * (CANVAS_HEIGHT * 0.4) + CANVAS_HEIGHT * 0.25;
        const length = 230;
        const startX = CANVAS_WIDTH / 2 - Math.cos(angle) * (length / 2);
        const startY = midY - Math.sin(angle) * (length / 2);
        const endX = CANVAS_WIDTH / 2 + Math.cos(angle) * (length / 2);
        const endY = midY + Math.sin(angle) * (length / 2);

        const particles: { x: number; y: number; vx: number; vy: number; alpha: number; color: string }[] = [];
        for (let p = 0; p < 14; p++) {
          particles.push({
            x: (startX + endX) / 2 + (Math.random() - 0.5) * 60,
            y: (startY + endY) / 2 + (Math.random() - 0.5) * 60,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            alpha: 1,
            color: Math.random() < 0.6 ? '#00F0FF' : '#FFE600',
          });
        }

        activeSlash = { startX, startY, endX, endY, progress: 0, particles };
      }

      if (activeSlash) {
        activeSlash.progress += 0.055 * timeScale;
        const progress = activeSlash.progress;

        if (progress <= 1.0) {
          // Draw energetic katana blade stroke
          const curX = activeSlash.startX + (activeSlash.endX - activeSlash.startX) * progress;
          const curY = activeSlash.startY + (activeSlash.endY - activeSlash.startY) * progress;
          const slashAngle = Math.atan2(
            activeSlash.endY - activeSlash.startY,
            activeSlash.endX - activeSlash.startX
          );

          // Outer glowing gradient wave
          const waveGrad = ctx.createLinearGradient(
            activeSlash.startX,
            activeSlash.startY,
            curX,
            curY
          );
          waveGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
          waveGrad.addColorStop(0.5, 'rgba(255, 0, 127, 0.85)');
          waveGrad.addColorStop(1, '#FFFFFF');

          ctx.strokeStyle = waveGrad;
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(activeSlash.startX, activeSlash.startY);
          ctx.lineTo(curX, curY);
          ctx.stroke();

          // White razor core
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(activeSlash.startX, activeSlash.startY);
          ctx.lineTo(curX, curY);
          ctx.stroke();

          // Render 3D Katana blade moving along slash stroke
          draw3DKatanaBlade(ctx, curX, curY, slashAngle + Math.PI / 2, 0.48, 1.0);
        }

        // Draw Slash Sparks
        activeSlash.particles.forEach((pt) => {
          pt.x += pt.vx * timeScale;
          pt.y += pt.vy * timeScale;
          pt.alpha -= 0.04 * timeScale;
          if (pt.alpha > 0) {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = Math.max(0, pt.alpha);
            ctx.fillRect(pt.x | 0, pt.y | 0, 3, 3);
          }
        });
        ctx.globalAlpha = 1;

        if (progress > 1.4) {
          activeSlash = null;
        }
      }

      animId = requestAnimationFrame(idleLoop);
    };

    animId = requestAnimationFrame(idleLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDead]);

  // 60-144+ FPS Delta-Time Active Gameplay Loop
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
        spawnTargetWave();
      }

      // Update Cyber Targets
      for (let i = targetsRef.current.length - 1; i >= 0; i--) {
        const t = targetsRef.current[i];

        if (t.sliced) {
          // Animate split halves
          if (t.half1 && t.half2) {
            t.half1.x += t.half1.vx * timeScale;
            t.half1.y += t.half1.vy * timeScale;
            t.half1.vy += GRAVITY * timeScale;
            t.half1.rot += t.half1.vRot * timeScale;

            t.half2.x += t.half2.vx * timeScale;
            t.half2.y += t.half2.vy * timeScale;
            t.half2.vy += GRAVITY * timeScale;
            t.half2.rot += t.half2.vRot * timeScale;

            if (t.half1.y > CANVAS_HEIGHT + 70 && t.half2.y > CANVAS_HEIGHT + 70) {
              targetsRef.current.splice(i, 1);
            }
          }
        } else {
          t.x += t.vx * timeScale;
          t.y += t.vy * timeScale;
          t.vy += GRAVITY * timeScale;
          t.rotation += t.vRot * timeScale;

          // Missed target fell off screen
          if (t.y > CANVAS_HEIGHT + 50 && t.vy > 0) {
            if (t.kind !== 'hazardBomb') {
              playSfx('miss');
              livesRef.current -= 1;
              setLives(livesRef.current);
              addActionBadge(t.x, CANVAS_HEIGHT - 35, '❌ STRIKE', '#FF0055', 0.9);

              if (livesRef.current <= 0) {
                handleGameOver(false);
                cancelAnimationFrame(animId);
                return;
              }
            }
            targetsRef.current.splice(i, 1);
          }
        }
      }

      // Prune Old Blade Trail Points
      const now = performance.now();
      bladeTrailRef.current = bladeTrailRef.current.filter((pt) => now - pt.time < 130);

      // ==========================================
      // NEO-BRUTALISM CANVAS 2D RENDER PIPELINE
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

      // Deep Cyber Dojo Background
      ctx.fillStyle = '#18000F';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ambient radial lighting
      const dojoGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT * 0.45,
        20,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT * 0.45,
        CANVAS_WIDTH * 0.8
      );
      dojoGrad.addColorStop(0, 'rgba(255, 0, 127, 0.14)');
      dojoGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.08)');
      dojoGrad.addColorStop(1, 'rgba(24, 0, 15, 0)');
      ctx.fillStyle = dojoGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Neo-Brutalism Dojo Arena Grid Lines
      ctx.strokeStyle = '#3D1030';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
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

      // 1. Render Splash & Spark Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;
        p.life += timeScale;
        p.alpha = 1 - p.life / p.maxLife;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);

          if (p.isSpark) {
            // Diamond Sparkle
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - p.size);
            ctx.lineTo(p.x + p.size, p.y);
            ctx.lineTo(p.x, p.y + p.size);
            ctx.lineTo(p.x - p.size, p.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            // Comic Shard Square
            ctx.fillRect(p.x | 0, p.y | 0, p.size * 2, p.size * 2);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x | 0, p.y | 0, p.size * 2, p.size * 2);
          }
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;

      // 2. Render 3D Targets & Halves
      targetsRef.current.forEach((t) => {
        if (t.sliced) {
          if (t.half1 && t.half2) {
            draw3DTargetHalf(ctx, t.half1, t.kind, true);
            draw3DTargetHalf(ctx, t.half2, t.kind, false);
          }
        } else {
          draw3DTarget(ctx, t);
        }
      });

      // 3. Render High-Contrast 3D Katana Slash Wave Trail
      const trail = bladeTrailRef.current;
      if (trail.length >= 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer Black Drop Shadow
        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          const progress = i / trail.length;

          ctx.strokeStyle = '#000000';
          ctx.lineWidth = progress * 10;
          ctx.beginPath();
          ctx.moveTo(p1.x + 2.5, p1.y + 2.5);
          ctx.lineTo(p2.x + 2.5, p2.y + 2.5);
          ctx.stroke();

          // Neon Magenta-to-Cyan Energy Glow Wave
          ctx.strokeStyle = progress > 0.5 ? '#00F0FF' : '#FF007F';
          ctx.lineWidth = progress * 7;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Razor-sharp White Core Laser Edge
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = progress * 2.8;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // Render Active 3D Cyber Katana Blade at Head of Swipe
        const headPt = trail[trail.length - 1];
        draw3DKatanaBlade(
          ctx,
          headPt.x,
          headPt.y,
          lastBladePosRef.current.angle + Math.PI / 2,
          0.5,
          1.0
        );
      }

      // 4. Render Starburst Action Badges
      for (let i = actionBadgesRef.current.length - 1; i >= 0; i--) {
        const badge = actionBadgesRef.current[i];
        badge.y += badge.vy * timeScale;
        badge.life += timeScale;
        badge.alpha = 1 - badge.life / badge.maxLife;

        if (badge.life >= badge.maxLife) {
          actionBadgesRef.current.splice(i, 1);
        } else {
          drawStarburstBadge(ctx, badge.x, badge.y, badge.text, badge.scale, badge.alpha);
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
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center">
      {/* Top HUD - Neo Brutalism */}
      <div className="w-full max-w-[min(100%,calc(min(78vh,680px)*9/16))] flex items-center justify-between bg-portal-card px-3 py-1.5 rounded-xl border-2 border-black mb-1.5 shadow-neo shrink-0">
        {/* Score Pill */}
        <div className="flex items-center gap-2 bg-portal-surface px-2.5 py-0.5 rounded-lg border border-black shadow-neo-sm">
          <Swords className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
          <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Score</span>
          <span className="text-sm font-black text-portal-yellow tracking-wide">{displayScore}</span>
        </div>

        {/* Combo Multiplier Pill */}
        {combo >= 3 && (
          <div className="flex items-center gap-1.5 bg-portal-pink px-2.5 py-0.5 rounded-lg border border-black shadow-neo-sm animate-pulse">
            <Zap className="w-3.5 h-3.5 text-portal-yellow fill-portal-yellow stroke-[2.5]" />
            <span className="text-xs font-black text-white uppercase tracking-wider">{combo}X COMBO</span>
          </div>
        )}

        {/* Lives / Strikes */}
        <div className="flex items-center gap-1.5 bg-portal-surface px-2 py-0.5 rounded-lg border border-black shadow-neo-sm">
          {[1, 2, 3].map((heart) => (
            <Heart
              key={heart}
              className={`w-3.5 h-3.5 stroke-[2.5] transition-all ${
                heart <= lives ? 'text-portal-pink fill-portal-pink' : 'text-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-surface hover:bg-portal-pink text-white hover:text-black border border-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 transition-all"
          title={soundEnabled ? 'Mute audio' : 'Enable audio'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </button>
      </div>

      {/* Main Slicing Dojo Canvas (9:16 Ratio with Viewport Height Scaling) */}
      <div className="relative rounded-2xl overflow-hidden border-3 border-black shadow-neo-lg bg-[#18000F] touch-none cursor-crosshair w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] flex items-center justify-center shrink-0">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full object-contain block"
        />

        {/* Start / Game Over Overlay */}
        {!isPlaying && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 text-center transition-all ${
              isDead ? 'bg-black/75 backdrop-blur-[2px]' : 'bg-black/60 backdrop-blur-[2px]'
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
                  <Swords className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-lg bg-portal-pink text-white border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-neo-sm inline-block">
                    Dojo Run Ended
                  </span>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-1.5">
                    Score: {displayScore}
                  </h3>
                  <p className="text-xs font-bold text-portal-yellow uppercase tracking-wider mt-0.5">
                    Master the 3D Plasma Katana
                  </p>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan hover:bg-cyan-300 text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" /> RETRY BLADE RUN
                </button>
              </div>
            ) : (
              <div className="relative space-y-3.5 w-full max-w-[320px] bg-portal-card p-5 rounded-2xl border-3 border-black shadow-neo-lg animate-in fade-in zoom-in duration-200">
                {/* Figma Corner Nodes */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black rounded-sm shadow-neo-sm" />

                <div className="w-14 h-14 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mx-auto text-white shadow-neo">
                  <Swords className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Cyber Katana Slicer
                  </h3>
                  <p className="text-xs font-bold text-portal-cyan uppercase tracking-wider mt-0.5">
                    3D Isometric Blade Rush
                  </p>
                </div>

                {/* Dojo Rules */}
                <div className="bg-portal-surface p-3 rounded-xl border-2 border-black shadow-neo-sm text-[11px] text-slate-200 space-y-1.5 text-left font-bold">
                  <div className="flex items-center gap-2 text-portal-cyan">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    <span>Swipe to slash 3D cyber quantum cubes & prisms!</span>
                  </div>
                  <div className="flex items-center gap-2 text-portal-yellow">
                    <Flame className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    <span>Multi-Slice: 3+ targets in 1 stroke for Combos!</span>
                  </div>
                  <div className="flex items-center gap-2 text-portal-pink">
                    <span className="shrink-0 text-xs">💣</span>
                    <span>AVOID BOMBS: Slicing hazard mines causes instant breach!</span>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-pink hover:bg-pink-400 text-white font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                >
                  <Play className="w-4 h-4 fill-white stroke-[2.5]" /> ENTER DOJO
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Tips Strip */}
      <div className="mt-2 text-center">
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide bg-portal-card px-3 py-1 rounded-lg border-2 border-black shadow-neo-sm inline-block">
          Controls: Swipe or drag to wield your 3D plasma katana
        </span>
      </div>
    </div>
  );
}
