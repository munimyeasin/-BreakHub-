'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Gauge,
  Trophy,
  Flame,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield,
  Tv,
  AlertCircle,
  HelpCircle,
  Crosshair
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberDriftGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Vertical Portrait Ratio (360x640)
const CANVAS_HEIGHT = 640;
const ROAD_HALF_WIDTH = 72; // Road total width ~ 144px
const SEGMENT_LENGTH = 32; // Distance between road spine nodes

// Available Cyber Cars
export interface CyberCarConfig {
  id: string;
  name: string;
  model: string;
  color: string;
  accentColor: string;
  trailColor: string;
  topSpeed: number; // Max longitudinal speed (pixels/frame @ 60fps)
  accel: number;
  handling: number; // Steer agility
  driftGrip: number; // Slide friction (lower = slides wider)
  nitroPower: number; // Boost acceleration multiplier
  nitroColor: string;
  comboGraceBonus: number; // Seconds
  stats: { speed: number; drift: number; nitro: number; control: number };
}

const CARS: CyberCarConfig[] = [
  {
    id: 'phantom_gtr',
    name: 'CYBER GT-R',
    model: 'Phantom R34 Spec-V',
    color: '#00F0FF',
    accentColor: '#0066FF',
    trailColor: '#00F0FF',
    topSpeed: 9.0,
    accel: 0.18,
    handling: 0.052,
    driftGrip: 0.84,
    nitroPower: 1.45,
    nitroColor: '#00F0FF',
    comboGraceBonus: 0,
    stats: { speed: 85, drift: 80, nitro: 82, control: 88 }
  },
  {
    id: 'apex_rx7',
    name: 'APEX RX-7',
    model: 'Rotary Spirit 2077',
    color: '#FF00EA',
    accentColor: '#9D00FF',
    trailColor: '#FF00EA',
    topSpeed: 8.7,
    accel: 0.17,
    handling: 0.058,
    driftGrip: 0.78,
    nitroPower: 1.5,
    nitroColor: '#FF00EA',
    comboGraceBonus: 0.4,
    stats: { speed: 82, drift: 96, nitro: 85, control: 78 }
  },
  {
    id: 'midnight_86',
    name: 'MIDNIGHT 86',
    model: 'Apex Tofu Legend',
    color: '#FFE600',
    accentColor: '#FF6600',
    trailColor: '#FFE600',
    topSpeed: 8.4,
    accel: 0.16,
    handling: 0.056,
    driftGrip: 0.81,
    nitroPower: 1.38,
    nitroColor: '#FFE600',
    comboGraceBonus: 0.8,
    stats: { speed: 78, drift: 92, nitro: 76, control: 95 }
  },
  {
    id: 'hyperion_ev',
    name: 'HYPERION EV',
    model: 'Quantum Hypercar',
    color: '#39FF14',
    accentColor: '#00FF99',
    trailColor: '#39FF14',
    topSpeed: 9.8,
    accel: 0.22,
    handling: 0.048,
    driftGrip: 0.87,
    nitroPower: 1.7,
    nitroColor: '#39FF14',
    comboGraceBonus: -0.2,
    stats: { speed: 98, drift: 75, nitro: 98, control: 82 }
  }
];

// Road Spine Node
interface RoadPoint {
  x: number;
  y: number;
  angle: number; // Tangent angle (radians)
  width: number;
  curveType: 'straight' | 'left' | 'right' | 'hairpin_left' | 'hairpin_right' | 'chicane';
}

// Track Collectible / Apex Object
interface TrackObject {
  id: number;
  x: number;
  y: number;
  type: 'apex_pole' | 'energy_chip' | 'boost_pad';
  radius: number;
  active: boolean;
  pulse: number;
  points: number;
}

// Tire Skid Mark
interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  color: string;
}

// Particle
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxLife: number;
  life: number;
  type: 'smoke' | 'spark' | 'nitro';
}

// Floating Text
interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  scale: number;
}

export default function CyberDriftGame({ gameId, onGameOver }: CyberDriftGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [score, setScore] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [displayMultiplier, setDisplayMultiplier] = useState(1);
  const [driftTier, setDriftTier] = useState<string>('');
  const [nitroFuel, setNitroFuel] = useState(100);
  const [selectedCarIndex, setSelectedCarIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasRevived, setHasRevived] = useState(false);
  const [adNotice, setAdNotice] = useState<string | null>(null);
  const [showControlsGuide, setShowControlsGuide] = useState(false);

  // Performance Run Stats
  const [runStats, setRunStats] = useState({
    distance: 0,
    maxCombo: 1,
    apexClips: 0,
    longestDrift: 0
  });

  // Hot Loop Refs (Zero React Reconciliation Overhead)
  const isPlayingRef = useRef(false);
  const soundEnabledRef = useRef(true);
  const onGameOverRef = useRef(onGameOver);
  const selectedCarRef = useRef<CyberCarConfig>(CARS[0]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const screechGainRef = useRef<GainNode | null>(null);
  const screechSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nextObjectIdRef = useRef(1);

  // Input states
  const keysRef = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    handbrake: boolean;
    nitro: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
    handbrake: false,
    nitro: false
  });

  // Touch controls input
  const touchSteerRef = useRef<number>(0); // -1 (left) to +1 (right)
  const touchHandbrakeRef = useRef<boolean>(false);
  const touchNitroRef = useRef<boolean>(false);

  // Car Physics Simulation State
  const carStateRef = useRef({
    x: 0,
    y: 0,
    heading: -Math.PI / 2, // Facing upwards initially
    steerAngle: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    slipAngle: 0,
    isDrifting: false,
    driftDuration: 0,
    currentDriftPoints: 0,
    nitroActive: false,
    nitroAmount: 100, // 0 - 100%
    shieldTimer: 0,
    health: 100
  });

  // Smooth Camera Follow Ref
  const cameraRef = useRef({
    x: 0,
    y: 0,
    angle: -Math.PI / 2
  });

  // Track & Road Data
  const roadPointsRef = useRef<RoadPoint[]>([]);
  const trackObjectsRef = useRef<TrackObject[]>([]);
  const skidMarksRef = useRef<SkidMark[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Scoring & Combo System
  const scoreRef = useRef(0);
  const comboMultiplierRef = useRef(1);
  const maxComboRef = useRef(1);
  const comboTimerRef = useRef(0); // Grace countdown
  const apexClipsCountRef = useRef(0);
  const longestDriftRef = useRef(0);
  const totalDistanceRef = useRef(0);
  const screenShakeRef = useRef(0);

  // Idle Screen Demo Animation State
  const demoAngleRef = useRef(0);

  // Synchronize state changes with refs
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    selectedCarRef.current = CARS[selectedCarIndex] || CARS[0];
  }, [selectedCarIndex]);

  // ==========================================
  // PROCEDURAL WEB AUDIO SYNTHESIZER
  // ==========================================
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Create continuous looping screech noise node
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Bandpass filter for tire screech tone
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1600;
      filter.Q.value = 3.0;

      const gain = ctx.createGain();
      gain.gain.value = 0.0001;

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      try {
        noiseSource.start();
        screechSourceRef.current = noiseSource;
        screechGainRef.current = gain;
      } catch {}
    } catch {}
  }, []);

  const updateScreechAudio = useCallback((isDrifting: boolean, intensity: number) => {
    if (!soundEnabledRef.current || !screechGainRef.current || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const targetGain = isDrifting ? Math.min(0.18, intensity * 0.15) : 0.0001;
      screechGainRef.current.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
    } catch {}
  }, []);

  const playSfx = useCallback((type: 'apex' | 'chip' | 'nitro' | 'turbo' | 'bank' | 'crash' | 'hit') => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'suspended') {
      ctx?.resume();
      if (!ctx) return;
    }

    try {
      const now = ctx.currentTime;

      if (type === 'apex') {
        // High-tech ascending crystal arpeggio for Apex Clipping
        const freqs = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.12, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.24);
        });
      } else if (type === 'chip') {
        // Dual cyber pickup chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'turbo') {
        // Turbo blow-off valve pop & hiss
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.21);
      } else if (type === 'nitro') {
        // Deep warp boost whoosh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.3);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'bank') {
        // Combo points banked chime (Major triad)
        const notes = [440, 554.37, 659.25];
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.05);
          gain.gain.setValueAtTime(0.12, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.28);
        });
      } else if (type === 'crash') {
        // Low rumble crash explosion
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      } else if (type === 'hit') {
        // Soft wall scrape bump
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.09);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.11);
      }
    } catch {}
  }, [initAudio]);

  // ==========================================
  // PROCEDURAL TRACK GENERATOR
  // ==========================================
  const generateInitialTrack = useCallback(() => {
    const points: RoadPoint[] = [];
    const objects: TrackObject[] = [];
    nextObjectIdRef.current = 1;

    let currentX = 0;
    let currentY = 0;
    let currentAngle = -Math.PI / 2; // Straight up

    // 1. Initial Launch Straightaway
    for (let i = 0; i < 18; i++) {
      points.push({
        x: currentX,
        y: currentY,
        angle: currentAngle,
        width: ROAD_HALF_WIDTH * 2,
        curveType: 'straight'
      });
      currentX += Math.cos(currentAngle) * SEGMENT_LENGTH;
      currentY += Math.sin(currentAngle) * SEGMENT_LENGTH;
    }

    // Add initial quantum chips along straightaway
    for (let i = 5; i < 15; i += 2) {
      objects.push({
        id: nextObjectIdRef.current++,
        x: points[i].x,
        y: points[i].y,
        type: 'energy_chip',
        radius: 8,
        active: true,
        pulse: 0,
        points: 150
      });
    }

    roadPointsRef.current = points;
    trackObjectsRef.current = objects;

    // Append future procedural chunks ahead
    appendProceduralTrackSegments(30);
  }, []);

  const appendProceduralTrackSegments = (count: number) => {
    const points = roadPointsRef.current;
    if (points.length === 0) return;

    let lastPoint = points[points.length - 1];
    let currentX = lastPoint.x;
    let currentY = lastPoint.y;
    let currentAngle = lastPoint.angle;

    const curvePatterns: Array<{
      type: RoadPoint['curveType'];
      segments: number;
      deltaAngle: number;
      hasApex: boolean;
      hasBoost: boolean;
    }> = [
      { type: 'straight', segments: 8, deltaAngle: 0, hasApex: false, hasBoost: true },
      { type: 'left', segments: 10, deltaAngle: -0.08, hasApex: true, hasBoost: false },
      { type: 'right', segments: 10, deltaAngle: 0.08, hasApex: true, hasBoost: false },
      { type: 'hairpin_left', segments: 12, deltaAngle: -0.13, hasApex: true, hasBoost: false },
      { type: 'hairpin_right', segments: 12, deltaAngle: 0.13, hasApex: true, hasBoost: false },
      { type: 'chicane', segments: 14, deltaAngle: 0.07, hasApex: true, hasBoost: false }
    ];

    let chunksAdded = 0;
    while (chunksAdded < count) {
      const pattern = curvePatterns[Math.floor(Math.random() * curvePatterns.length)];

      let patternDeltaAngle = pattern.deltaAngle;
      if (pattern.type === 'chicane') {
        patternDeltaAngle = (Math.random() > 0.5 ? 1 : -1) * 0.08;
      }

      const startIndex = points.length;

      for (let s = 0; s < pattern.segments; s++) {
        if (pattern.type === 'chicane' && s > pattern.segments / 2) {
          currentAngle -= patternDeltaAngle * 1.8;
        } else {
          currentAngle += patternDeltaAngle;
        }

        currentX += Math.cos(currentAngle) * SEGMENT_LENGTH;
        currentY += Math.sin(currentAngle) * SEGMENT_LENGTH;

        points.push({
          x: currentX,
          y: currentY,
          angle: currentAngle,
          width: ROAD_HALF_WIDTH * 2,
          curveType: pattern.type
        });
      }

      // Add Apex Clipping Beacon on the inside apex of curves
      if (pattern.hasApex) {
        const midIdx = startIndex + Math.floor(pattern.segments / 2);
        if (midIdx < points.length) {
          const pt = points[midIdx];
          const isLeft = pattern.deltaAngle < 0 || pattern.type.includes('left');
          const normalAngle = pt.angle + (isLeft ? -Math.PI / 2 : Math.PI / 2);
          const apexOffset = ROAD_HALF_WIDTH - 14;

          trackObjectsRef.current.push({
            id: nextObjectIdRef.current++,
            x: pt.x + Math.cos(normalAngle) * apexOffset,
            y: pt.y + Math.sin(normalAngle) * apexOffset,
            type: 'apex_pole',
            radius: 12,
            active: true,
            pulse: 0,
            points: 500
          });
        }
      }

      // Add Speed Boost Pad on long straightaways
      if (pattern.hasBoost && Math.random() > 0.4) {
        const boostIdx = startIndex + Math.floor(pattern.segments / 2);
        if (boostIdx < points.length) {
          const pt = points[boostIdx];
          trackObjectsRef.current.push({
            id: nextObjectIdRef.current++,
            x: pt.x,
            y: pt.y,
            type: 'boost_pad',
            radius: 16,
            active: true,
            pulse: 0,
            points: 200
          });
        }
      }

      // Add Quantum Energy Chips along the racing line
      for (let k = startIndex; k < points.length; k += 2) {
        if (Math.random() > 0.35) {
          const pt = points[k];
          const offset = (Math.random() - 0.5) * (ROAD_HALF_WIDTH * 0.7);
          const normalAngle = pt.angle + Math.PI / 2;

          trackObjectsRef.current.push({
            id: nextObjectIdRef.current++,
            x: pt.x + Math.cos(normalAngle) * offset,
            y: pt.y + Math.sin(normalAngle) * offset,
            type: 'energy_chip',
            radius: 8,
            active: true,
            pulse: 0,
            points: 100
          });
        }
      }

      chunksAdded++;
    }
  };

  // ==========================================
  // FLOATING TEXT & PARTICLES
  // ==========================================
  const addFloatingText = (x: number, y: number, text: string, color: string, scale = 1.0) => {
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      alpha: 1.0,
      vy: -1.8,
      scale
    });
  };

  const spawnDriftSmoke = (x: number, y: number, color: string, intensity: number) => {
    if (particlesRef.current.length > 100) return;
    const count = Math.min(3, Math.ceil(intensity * 2.5));
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 4 + 3.5,
        color,
        alpha: 0.6,
        life: 0,
        maxLife: Math.random() * 16 + 12,
        type: 'smoke'
      });
    }
  };

  const spawnSparks = (x: number, y: number, count = 8, color = '#FFE600') => {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 3.5 + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: Math.random() * 2 + 1.2,
        color,
        alpha: 1.0,
        life: 0,
        maxLife: Math.random() * 12 + 8,
        type: 'spark'
      });
    }
  };

  // ==========================================
  // GAME START / RESET / REVIVE
  // ==========================================
  const startGame = () => {
    initAudio();
    setIsPlaying(true);
    isPlayingRef.current = true;
    setIsDead(false);
    setHasRevived(false);
    setAdNotice(null);

    scoreRef.current = 0;
    setScore(0);
    comboMultiplierRef.current = 1;
    setDisplayMultiplier(1);
    maxComboRef.current = 1;
    apexClipsCountRef.current = 0;
    longestDriftRef.current = 0;
    totalDistanceRef.current = 0;
    setNitroFuel(100);

    generateInitialTrack();

    const firstPt = roadPointsRef.current[0];
    const initialHeading = firstPt.angle;

    carStateRef.current = {
      x: firstPt.x,
      y: firstPt.y,
      heading: initialHeading,
      steerAngle: 0,
      vx: Math.cos(initialHeading) * 2.0,
      vy: Math.sin(initialHeading) * 2.0,
      speed: 2.0,
      slipAngle: 0,
      isDrifting: false,
      driftDuration: 0,
      currentDriftPoints: 0,
      nitroActive: false,
      nitroAmount: 100,
      shieldTimer: 60, // 1 sec spawn shield
      health: 100
    };

    cameraRef.current = {
      x: firstPt.x,
      y: firstPt.y,
      angle: initialHeading
    };

    skidMarksRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
  };

  const handleWatchAdForRevive = () => {
    if (hasRevived) return;
    setAdNotice('Connecting to Cyber Ad Network...');

    if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
    adTimeoutRef.current = setTimeout(() => {
      setAdNotice('Ad Verified! Emergency Energy Shield Deployed!');

      setTimeout(() => {
        setHasRevived(true);
        setIsDead(false);
        setIsPlaying(true);
        isPlayingRef.current = true;
        setAdNotice(null);

        // Revive on track with Energy Shield & +60% Nitro
        const p = carStateRef.current;
        p.shieldTimer = 180; // 3 sec shield
        p.health = 100;
        p.nitroAmount = Math.min(100, p.nitroAmount + 60);
        p.speed = selectedCarRef.current.topSpeed * 0.65;
        p.vx = Math.cos(p.heading) * p.speed;
        p.vy = Math.sin(p.heading) * p.speed;

        playSfx('turbo');
        addFloatingText(p.x, p.y - 30, 'REVIVED! SHIELD ACTIVE', '#00F0FF', 1.3);
      }, 1000);
    }, 1200);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
      if (e.key === ' ' || e.key === 'Shift') keysRef.current.handbrake = true;
      if (e.key === 'e' || e.key === 'E' || e.key === 'b' || e.key === 'B' || e.key === 'n' || e.key === 'N') keysRef.current.nitro = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
      if (e.key === ' ' || e.key === 'Shift') keysRef.current.handbrake = false;
      if (e.key === 'e' || e.key === 'E' || e.key === 'b' || e.key === 'B' || e.key === 'n' || e.key === 'N') keysRef.current.nitro = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // ==========================================
  // MAIN HIGH-PERFORMANCE 60-144 FPS PHYSICS & RENDER LOOP
  // ==========================================
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Mathematically robust segment projection onto track spine
    const projectOntoTrack = (px: number, py: number) => {
      const pts = roadPointsRef.current;
      if (pts.length < 2) {
        return {
          projX: px,
          projY: py,
          angle: -Math.PI / 2,
          lateralOffset: 0,
          closestIndex: 0
        };
      }

      let minDistanceSq = Infinity;
      let closestIdx = 0;
      let bestProjX = px;
      let bestProjY = py;
      let bestAngle = pts[0].angle;
      let bestLateral = 0;

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];

        const segX = p2.x - p1.x;
        const segY = p2.y - p1.y;
        const segLenSq = segX * segX + segY * segY;

        if (segLenSq < 0.0001) continue;

        // Vector p1 -> P
        const apX = px - p1.x;
        const apY = py - p1.y;

        // Clamped projection parameter t in [0, 1]
        const t = Math.max(0, Math.min(1, (apX * segX + apY * segY) / segLenSq));
        const projX = p1.x + t * segX;
        const projY = p1.y + t * segY;

        const distSq = (px - projX) * (px - projX) + (py - projY) * (py - projY);
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestIdx = i;
          bestProjX = projX;
          bestProjY = projY;

          // Segment tangent angle
          bestAngle = Math.atan2(segY, segX);

          // Normal vector (-sin, cos)
          const normalX = -Math.sin(bestAngle);
          const normalY = Math.cos(bestAngle);
          bestLateral = (px - projX) * normalX + (py - projY) * normalY;
        }
      }

      return {
        projX: bestProjX,
        projY: bestProjY,
        angle: bestAngle,
        lateralOffset: bestLateral,
        closestIndex: closestIdx
      };
    };

    const loop = (currentTimestamp: number) => {
      // Calculate delta-time and normalize to 60fps frameScale
      const dt = Math.min((currentTimestamp - lastTimestamp) / 1000, 0.05); // Cap at 50ms
      lastTimestamp = currentTimestamp;
      const frameScale = dt * 60; // 1.0 @ 60fps, 0.416 @ 144fps

      // ==========================================
      // A. LIVE ANIMATED IDLE DEMO LOOP (WHEN NOT PLAYING)
      // ==========================================
      if (!isPlayingRef.current) {
        demoAngleRef.current += 1.2 * dt;
        const car = selectedCarRef.current;

        // Clear canvas
        ctx.fillStyle = '#060214';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Synthwave Background Grid
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 1;
        const gridSize = 28;
        const gridOffsetY = (currentTimestamp * 0.04) % gridSize;
        for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = gridOffsetY; y < CANVAS_HEIGHT; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }

        // Animated Drifting Donuts Demonstration
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2 - 25;
        const donutRadius = 75;
        const demoCarX = centerX + Math.cos(demoAngleRef.current) * donutRadius;
        const demoCarY = centerY + Math.sin(demoAngleRef.current) * donutRadius * 0.65;
        const demoCarHeading = demoAngleRef.current + Math.PI / 2 + 0.55; // High drift angle!

        // Draw Donut Skid Marks
        ctx.strokeStyle = car.trailColor;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, donutRadius, donutRadius * 0.65, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Draw Demo Smoke Puffs
        if (Math.random() > 0.3) {
          particlesRef.current.push({
            x: demoCarX + (Math.random() - 0.5) * 8,
            y: demoCarY + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            size: Math.random() * 5 + 3,
            color: car.trailColor,
            alpha: 0.6,
            life: 0,
            maxLife: 20,
            type: 'smoke'
          });
        }

        // Render demo particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const pt = particlesRef.current[i];
          pt.life += 1;
          pt.alpha = 1 - pt.life / pt.maxLife;
          if (pt.life >= pt.maxLife) {
            particlesRef.current.splice(i, 1);
          } else {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = Math.max(0, pt.alpha * 0.5);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1.0;

        // Render Demo Car Sprite
        renderCarSprite(ctx, demoCarX, demoCarY, demoCarHeading, 0.4, car, true);

        animId = requestAnimationFrame(loop);
        return;
      }

      // ==========================================
      // B. ACTIVE GAMEPLAY SIMULATION & FRAME-RATE INDEPENDENT PHYSICS
      // ==========================================
      const car = selectedCarRef.current;
      const state = carStateRef.current;
      const keys = keysRef.current;

      // Handle Inputs (Steering + Throttle + E-Brake + Nitro)
      let steerInput = 0;
      if (keys.left) steerInput -= 1;
      if (keys.right) steerInput += 1;
      if (touchSteerRef.current !== 0) steerInput = touchSteerRef.current;

      const isHandbrake = keys.down || keys.handbrake || touchHandbrakeRef.current;
      const isNitro = (keys.nitro || touchNitroRef.current) && state.nitroAmount > 0;
      const isGas = keys.up;

      // Smooth Steer Angle interpolation with frameScale
      const targetSteer = steerInput * car.handling;
      state.steerAngle += (targetSteer - state.steerAngle) * Math.min(1, 0.22 * frameScale);

      // Longitudinal Acceleration & Throttle
      let accelForce = (isGas ? car.accel * 1.3 : car.accel) * frameScale;
      if (isNitro && state.nitroAmount > 0) {
        accelForce *= car.nitroPower;
        state.nitroAmount = Math.max(0, state.nitroAmount - 28 * dt);
        state.nitroActive = true;
        if (Math.random() > 0.4) playSfx('nitro');
      } else {
        state.nitroActive = false;
      }

      // Max speed threshold
      const currentTopSpeed = isNitro ? car.topSpeed * 1.38 : car.topSpeed;

      // Forward and Normal Direction Vectors
      const forwardX = Math.cos(state.heading);
      const forwardY = Math.sin(state.heading);
      const rightX = -Math.sin(state.heading);
      const rightY = Math.cos(state.heading);

      // Decompose current velocity into longitudinal and lateral components
      let vLong = state.vx * forwardX + state.vy * forwardY;
      let vLat = state.vx * rightX + state.vy * rightY;

      // Accelerate forward if below top speed
      if (vLong < currentTopSpeed) {
        vLong += accelForce;
      }

      // Brake / Reverse
      if (keys.down && !isHandbrake) {
        vLong = Math.max(-2.0, vLong - car.accel * 1.5 * frameScale);
      }

      const currentSpeed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
      state.speed = currentSpeed;
      totalDistanceRef.current += currentSpeed * dt * 3.5;

      // Calculate Slip Angle (degrees & radians)
      state.slipAngle = Math.atan2(vLat, Math.max(1.2, Math.abs(vLong)));
      const absSlipAngleDeg = (Math.abs(state.slipAngle) * 180) / Math.PI;

      // Drift State Detection
      const isDriftingNow = (Math.abs(vLat) > 1.2 || isHandbrake) && currentSpeed > 2.5;
      state.isDrifting = isDriftingNow;

      // Dynamic friction simulation (frame-rate independent exponential decay)
      let lateralGrip = car.driftGrip;
      if (isHandbrake) {
        lateralGrip *= 0.68; // Handbrake whips the tail out
        vLong *= Math.pow(0.975, frameScale); // Handbrake deceleration
      } else if (isDriftingNow) {
        lateralGrip *= 0.88; // Dynamic slide friction
      }

      // Counter-steering torque physics: turning into the slide stabilizes and extends drift!
      const counterSteerBonus = steerInput * -Math.sign(vLat) > 0 ? 1.3 : 1.0;
      state.heading += state.steerAngle * (currentSpeed / car.topSpeed) * counterSteerBonus * frameScale;

      // Apply rolling resistance and lateral grip decay
      const longDecay = Math.pow(0.992, frameScale);
      const latDecay = Math.pow(lateralGrip, frameScale);

      vLong *= longDecay;
      vLat *= latDecay;

      // Reconstruct adjusted world velocity
      state.vx = forwardX * vLong + rightX * vLat;
      state.vy = forwardY * vLong + rightY * vLat;

      // Update position with frameScale
      state.x += state.vx * frameScale;
      state.y += state.vy * frameScale;

      if (state.shieldTimer > 0) state.shieldTimer -= frameScale;

      // Update procedural tire screech audio
      updateScreechAudio(isDriftingNow, absSlipAngleDeg / 40);

      // ==========================================
      // C. DRIFT SCORING & COMBO SYSTEM
      // ==========================================
      if (isDriftingNow && absSlipAngleDeg > 8) {
        state.driftDuration += dt;
        if (state.driftDuration > longestDriftRef.current) {
          longestDriftRef.current = state.driftDuration;
        }

        // Tiers
        let tierLabel = 'NICE SLIDE';
        let tierColor = '#00F0FF';
        if (absSlipAngleDeg > 42 || comboMultiplierRef.current >= 6) {
          tierLabel = 'APEX DRIFT KING';
          tierColor = '#FFE600';
        } else if (absSlipAngleDeg > 28 || comboMultiplierRef.current >= 4) {
          tierLabel = 'HYPER DRIFT';
          tierColor = '#FF00EA';
        } else if (absSlipAngleDeg > 15 || comboMultiplierRef.current >= 2) {
          tierLabel = 'SICK SLIDE';
          tierColor = '#39FF14';
        }
        setDriftTier(tierLabel);

        // Drift Point Accrual
        const driftPointsThisFrame = (absSlipAngleDeg * 1.8 * currentSpeed * comboMultiplierRef.current * dt) | 0;
        state.currentDriftPoints += driftPointsThisFrame;
        scoreRef.current += driftPointsThisFrame;

        // Spawn Tire Smoke & Skid Marks
        const rearWheelOffset = 18;
        const leftTireX = state.x - forwardX * rearWheelOffset + rightX * 8;
        const leftTireY = state.y - forwardY * rearWheelOffset + rightY * 8;
        const rightTireX = state.x - forwardX * rearWheelOffset - rightX * 8;
        const rightTireY = state.y - forwardY * rearWheelOffset - rightY * 8;

        spawnDriftSmoke(leftTireX, leftTireY, car.trailColor, absSlipAngleDeg / 35);
        spawnDriftSmoke(rightTireX, rightTireY, car.trailColor, absSlipAngleDeg / 35);

        // Record persistent skid marks
        if (skidMarksRef.current.length < 180) {
          skidMarksRef.current.push({
            x1: leftTireX,
            y1: leftTireY,
            x2: leftTireX - state.vx * 0.9,
            y2: leftTireY - state.vy * 0.9,
            alpha: 0.65,
            color: car.trailColor
          });
          skidMarksRef.current.push({
            x1: rightTireX,
            y1: rightTireY,
            x2: rightTireX - state.vx * 0.9,
            y2: rightTireY - state.vy * 0.9,
            alpha: 0.65,
            color: car.trailColor
          });
        }

        // Slowly recharge nitro while drifting
        state.nitroAmount = Math.min(100, state.nitroAmount + 8 * dt);

        // Advance combo tier when maintaining long drift
        if (state.driftDuration > 1.2 && comboMultiplierRef.current < 10) {
          comboMultiplierRef.current = Math.min(10, comboMultiplierRef.current + 1);
          setDisplayMultiplier(comboMultiplierRef.current);
          if (comboMultiplierRef.current > maxComboRef.current) {
            maxComboRef.current = comboMultiplierRef.current;
          }
          state.driftDuration = 0.4;
          addFloatingText(state.x, state.y - 25, `${comboMultiplierRef.current}X COMBO!`, tierColor, 1.2);
        }

        // Reset grace timer
        comboTimerRef.current = 1.6 + car.comboGraceBonus;
      } else {
        // Not currently in a slide
        if (comboTimerRef.current > 0) {
          comboTimerRef.current -= dt;
          if (comboTimerRef.current <= 0) {
            // Smooth combo bank
            if (state.currentDriftPoints > 0) {
              playSfx('bank');
              addFloatingText(state.x, state.y - 20, `+${state.currentDriftPoints} BANKED!`, '#FFE600', 1.1);
              state.currentDriftPoints = 0;
            }
            comboMultiplierRef.current = 1;
            setDisplayMultiplier(1);
            setDriftTier('');
          }
        }
        state.driftDuration = 0;
      }

      // Sync state to UI
      setScore(scoreRef.current);
      setNitroFuel(state.nitroAmount | 0);
      setSpeedKmh(Math.floor(currentSpeed * 22));

      // ==========================================
      // D. TRACK COLLISION & ROAD BOUNDARY CHECK
      // ==========================================
      const trackProj = projectOntoTrack(state.x, state.y);
      const maxAllowedLateral = ROAD_HALF_WIDTH - 10;

      // If close to the end of generated road, append more procedural chunks!
      if (roadPointsRef.current.length - trackProj.closestIndex < 20) {
        appendProceduralTrackSegments(20);
      }

      // Clean up old road points behind the player
      if (trackProj.closestIndex > 40) {
        roadPointsRef.current.splice(0, 15);
      }

      // Boundary Wall Collision & Soft Repulsion
      if (Math.abs(trackProj.lateralOffset) > maxAllowedLateral) {
        const sideSign = Math.sign(trackProj.lateralOffset);
        const normalX = -Math.sin(trackProj.angle);
        const normalY = Math.cos(trackProj.angle);

        // Smoothly position car back on the legal track boundary
        state.x = trackProj.projX + normalX * (maxAllowedLateral * sideSign);
        state.y = trackProj.projY + normalY * (maxAllowedLateral * sideSign);

        // Soft elastic rebound
        state.vx *= 0.8;
        state.vy *= 0.8;
        screenShakeRef.current = Math.min(10, screenShakeRef.current + 4);
        spawnSparks(state.x, state.y, 8, '#FF0055');
        playSfx('hit');

        // Wall scrape damage only if hitting walls at high lateral angle without energy shield
        if (absSlipAngleDeg > 75 && currentSpeed > car.topSpeed * 0.9 && state.shieldTimer <= 0) {
          state.health -= 35 * dt;
          if (state.health <= 0) {
            handlePlayerCrash();
            cancelAnimationFrame(animId);
            return;
          }
        }
      }

      // ==========================================
      // E. INTERACTIVE TRACK OBJECTS & APEX CLIPPING
      // ==========================================
      for (let i = trackObjectsRef.current.length - 1; i >= 0; i--) {
        const obj = trackObjectsRef.current[i];
        if (!obj.active) continue;

        const dx = state.x - obj.x;
        const dy = state.y - obj.y;
        const distSq = dx * dx + dy * dy;

        if (obj.type === 'apex_pole') {
          // Apex Clipping Zone (Drift close to pylon without hitting head-on!)
          if (distSq < 36 * 36 && state.isDrifting) {
            obj.active = false;
            apexClipsCountRef.current += 1;
            const pts = 500 * comboMultiplierRef.current;
            scoreRef.current += pts;
            state.nitroAmount = Math.min(100, state.nitroAmount + 25);
            screenShakeRef.current = 4;
            spawnSparks(obj.x, obj.y, 14, '#FFE600');
            playSfx('apex');
            addFloatingText(obj.x, obj.y - 25, `APEX CLIP! +${pts}`, '#FFE600', 1.3);
          }
        } else if (obj.type === 'energy_chip') {
          if (distSq < 24 * 24) {
            obj.active = false;
            const pts = 150 * comboMultiplierRef.current;
            scoreRef.current += pts;
            state.nitroAmount = Math.min(100, state.nitroAmount + 14);
            spawnSparks(obj.x, obj.y, 8, '#00F0FF');
            playSfx('chip');
            addFloatingText(obj.x, obj.y - 15, `+${pts}`, '#00F0FF', 1.0);
          }
        } else if (obj.type === 'boost_pad') {
          if (distSq < 28 * 28) {
            // Speed Boost launch pad!
            state.vx += forwardX * 4.0;
            state.vy += forwardY * 4.0;
            state.nitroAmount = Math.min(100, state.nitroAmount + 35);
            screenShakeRef.current = 6;
            spawnSparks(state.x, state.y, 14, '#39FF14');
            playSfx('nitro');
            addFloatingText(state.x, state.y - 30, 'WARP BOOST!', '#39FF14', 1.3);
          }
        }
      }

      function handlePlayerCrash() {
        setIsDead(true);
        setIsPlaying(false);
        isPlayingRef.current = false;
        playSfx('crash');
        updateScreechAudio(false, 0);
        screenShakeRef.current = 18;
        spawnSparks(state.x, state.y, 25, '#FF0055');

        setRunStats({
          distance: Math.floor(totalDistanceRef.current),
          maxCombo: maxComboRef.current,
          apexClips: apexClipsCountRef.current,
          longestDrift: Number(longestDriftRef.current.toFixed(1))
        });

        const finalScore = scoreRef.current;
        if (finalScore > 3500) {
          confetti({ particleCount: 60, spread: 70 });
        }
        setTimeout(() => onGameOverRef.current(finalScore), 0);
      }

      // ==========================================
      // F. RENDER ENGINE & CAMERA TRANSFORMATION
      // ==========================================
      const cam = cameraRef.current;
      const lookAhead = Math.min(90, currentSpeed * 10);
      const targetCamX = state.x + Math.cos(state.heading) * lookAhead;
      const targetCamY = state.y + Math.sin(state.heading) * lookAhead;

      // Smooth camera position interpolation
      cam.x += (targetCamX - cam.x) * Math.min(1, 8 * dt);
      cam.y += (targetCamY - cam.y) * Math.min(1, 8 * dt);

      // Smooth camera angle lag (allows player to see car drift angle on screen!)
      let angleDiff = state.heading - cam.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      cam.angle += angleDiff * Math.min(1, 5.0 * dt);

      ctx.save();

      // Screen Shake
      let shakeX = 0;
      let shakeY = 0;
      if (screenShakeRef.current > 0) {
        shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.88;
        if (screenShakeRef.current < 0.4) screenShakeRef.current = 0;
      }

      // Center camera on screen
      ctx.translate(CANVAS_WIDTH / 2 + shakeX, CANVAS_HEIGHT * 0.7 + shakeY);
      // Align viewport with smooth camera heading
      ctx.rotate(-cam.angle - Math.PI / 2);
      ctx.translate(-cam.x, -cam.y);

      // 1. Background Grid Ground
      ctx.fillStyle = '#060212';
      ctx.fillRect(cam.x - 700, cam.y - 700, 1400, 1400);

      // 2. Render Road Surface & Curved Polygonal Asphalt
      const roadPts = roadPointsRef.current;
      const startIdx = Math.max(0, trackProj.closestIndex - 12);
      const endIdx = Math.min(roadPts.length - 1, trackProj.closestIndex + 35);

      for (let i = startIdx; i < endIdx; i++) {
        const p1 = roadPts[i];
        const p2 = roadPts[i + 1];

        const n1X = -Math.sin(p1.angle) * ROAD_HALF_WIDTH;
        const n1Y = Math.cos(p1.angle) * ROAD_HALF_WIDTH;
        const n2X = -Math.sin(p2.angle) * ROAD_HALF_WIDTH;
        const n2Y = Math.cos(p2.angle) * ROAD_HALF_WIDTH;

        // Asphalt Base
        ctx.fillStyle = '#0d0722';
        ctx.beginPath();
        ctx.moveTo(p1.x + n1X, p1.y + n1Y);
        ctx.lineTo(p1.x - n1X, p1.y - n1Y);
        ctx.lineTo(p2.x - n2X, p2.y - n2Y);
        ctx.lineTo(p2.x + n2X, p2.y + n2Y);
        ctx.closePath();
        ctx.fill();

        // Glowing Neon Outer Curbs
        const curbColor = i % 2 === 0 ? '#00F0FF' : '#FF00EA';
        ctx.strokeStyle = curbColor;
        ctx.lineWidth = 3.5;
        // Left Curb
        ctx.beginPath();
        ctx.moveTo(p1.x + n1X, p1.y + n1Y);
        ctx.lineTo(p2.x + n2X, p2.y + n2Y);
        ctx.stroke();
        // Right Curb
        ctx.beginPath();
        ctx.moveTo(p1.x - n1X, p1.y - n1Y);
        ctx.lineTo(p2.x - n2X, p2.y - n2Y);
        ctx.stroke();

        // Center Dashed Lane Marker
        if (i % 2 === 0) {
          ctx.strokeStyle = 'rgba(255, 230, 0, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // 3. Render Skid Marks
      for (let i = skidMarksRef.current.length - 1; i >= 0; i--) {
        const sm = skidMarksRef.current[i];
        sm.alpha -= 0.003 * frameScale;
        if (sm.alpha <= 0) {
          skidMarksRef.current.splice(i, 1);
        } else {
          ctx.strokeStyle = sm.color;
          ctx.globalAlpha = sm.alpha;
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(sm.x1, sm.y1);
          ctx.lineTo(sm.x2, sm.y2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;

      // 4. Render Track Objects (Apex Poles, Chips, Boost Pads)
      trackObjectsRef.current.forEach((obj) => {
        if (!obj.active) return;
        obj.pulse = (obj.pulse + 0.08 * frameScale) % (Math.PI * 2);

        if (obj.type === 'apex_pole') {
          // Neon Apex Pylon
          const pulseR = obj.radius + Math.sin(obj.pulse) * 3;
          ctx.fillStyle = '#FFE600';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, pulseR, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, pulseR + 4, 0, Math.PI * 2);
          ctx.stroke();
        } else if (obj.type === 'energy_chip') {
          // Rotating Quantum Chip
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.rotate(obj.pulse);
          ctx.fillStyle = '#00F0FF';
          ctx.fillRect(-6, -6, 12, 12);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-6, -6, 12, 12);
          ctx.restore();
        } else if (obj.type === 'boost_pad') {
          // Speed Boost Chevron Pad
          ctx.fillStyle = '#39FF14';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 5. Render Particles (Smoke, Sparks, Nitro Flames)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx * frameScale;
        pt.y += pt.vy * frameScale;
        pt.life += frameScale;
        pt.alpha = 1 - pt.life / pt.maxLife;

        if (pt.life >= pt.maxLife) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = Math.max(0, pt.alpha);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      // 6. Render Player Car Sprite
      renderCarSprite(ctx, state.x, state.y, state.heading, state.steerAngle, car, state.nitroActive);

      // 7. Render Floating Reward Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * frameScale;
        ft.alpha -= 0.025 * frameScale;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.translate(ft.x, ft.y);
          ctx.fillStyle = ft.color;
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = `900 ${Math.floor(13 * ft.scale)}px Impact, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(ft.text, 0, 0);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1.0;

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ==========================================
  // CAR SPRITE RENDER HELPER (CYBERPUNK VEHICLE)
  // ==========================================
  const renderCarSprite = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    heading: number,
    steerAngle: number,
    car: CyberCarConfig,
    nitroActive: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);

    // Neon Underglow Aura
    ctx.fillStyle = car.color;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Nitro Exhaust Flames when boosting
    if (nitroActive) {
      ctx.fillStyle = car.nitroColor;
      ctx.beginPath();
      ctx.moveTo(-20, -5);
      ctx.lineTo(-38 - Math.random() * 12, 0);
      ctx.lineTo(-20, 5);
      ctx.closePath();
      ctx.fill();
    }

    // 4 Wheels
    // Rear Left & Right Wheels
    ctx.fillStyle = '#111';
    ctx.strokeStyle = car.color;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-16, -15, 10, 5);
    ctx.strokeRect(-16, -15, 10, 5);
    ctx.fillRect(-16, 10, 10, 5);
    ctx.strokeRect(-16, 10, 10, 5);

    // Front Left Wheel (Steered)
    ctx.save();
    ctx.translate(14, -13);
    ctx.rotate(steerAngle * 2.5);
    ctx.fillRect(-5, -2.5, 10, 5);
    ctx.strokeRect(-5, -2.5, 10, 5);
    ctx.restore();

    // Front Right Wheel (Steered)
    ctx.save();
    ctx.translate(14, 13);
    ctx.rotate(steerAngle * 2.5);
    ctx.fillRect(-5, -2.5, 10, 5);
    ctx.strokeRect(-5, -2.5, 10, 5);
    ctx.restore();

    // Car Main Body Chassis
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(16, -10);
    ctx.lineTo(24, -5);
    ctx.lineTo(26, 0);
    ctx.lineTo(24, 5);
    ctx.lineTo(16, 10);
    ctx.lineTo(-18, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Carbon Hood & Cabin Roof
    ctx.fillStyle = '#080516';
    ctx.fillRect(-8, -7, 18, 14);

    // Windshield (Cyan Tinted Glass)
    ctx.fillStyle = '#00F0FF';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(3, -6);
    ctx.lineTo(11, -5);
    ctx.lineTo(11, 5);
    ctx.lineTo(3, 6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Cyber GT Spoiler / Rear Wing
    ctx.fillStyle = car.accentColor;
    ctx.fillRect(-22, -12, 4, 24);

    // Twin Projector Headlights
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(23, -8, 3, 4);
    ctx.fillRect(23, 4, 3, 4);

    // Tail LED Strip
    ctx.fillStyle = '#FF0055';
    ctx.fillRect(-19, -8, 2, 16);

    ctx.restore();
  };

  const selectedCar = CARS[selectedCarIndex] || CARS[0];

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Drift HUD - Single Line Compact Bar */}
      <div className="w-full flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-portal-cyan" />
            <span className="text-[10px] text-slate-400 font-black uppercase">Score</span>
            <span className="text-sm font-black text-portal-gold">{score}</span>
          </div>

          {displayMultiplier > 1 && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-portal-gold border border-amber-500/40 text-[10px] font-black animate-pulse">
              {displayMultiplier}X
            </span>
          )}

          {isPlaying && (
            <span className="text-[10px] font-black text-slate-400">
              {speedKmh} <span className="text-[8px] text-slate-500">KM/H</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Nitro Fuel Bar */}
          <div className="flex items-center gap-1">
            <Zap className={`w-3 h-3 ${nitroFuel > 25 ? 'text-portal-cyan' : 'text-slate-500'}`} />
            <div className="w-14 h-2 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75"
                style={{ width: `${nitroFuel}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 transition-all"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Active Drift Tier Banner */}
      {driftTier && (
        <div className="w-full mb-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center gap-1.5 text-[10px] font-black text-portal-cyan animate-pulse">
          <Flame className="w-3 h-3 text-amber-400" />
          <span>{driftTier}</span>
        </div>
      )}

      {/* Main Game Screen Canvas (9:16 Vertical Portrait Ratio) */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-portal-border shadow-2xl bg-portal-bg touch-none w-full aspect-[9/16] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block select-none"
        />

        {/* Start / Garage Screen Overlay */}
        {!isPlaying && !isDead && (
          <div className="absolute inset-0 flex flex-col justify-between p-4 bg-black/60 backdrop-blur-[2px] text-center animate-in fade-in duration-200">
            {/* Header Title */}
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-portal-cyan border border-cyan-500/40 text-[9px] font-black uppercase tracking-widest">
                INFINITE CYBER ARCADE
              </span>
              <h2 className="text-2xl font-black text-white mt-0.5 tracking-wider">
                CYBER <span className="text-portal-cyan">DRIFT</span> <span className="text-portal-pink">2077</span>
              </h2>
            </div>

            {/* Garage Car Selector Carousel */}
            <div className="bg-portal-surface/90 border border-portal-border rounded-2xl p-3 my-auto shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSelectedCarIndex(prev => (prev - 1 + CARS.length) % CARS.length)}
                  className="p-1.5 rounded-xl bg-portal-card border border-portal-border text-slate-300 hover:text-white active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div>
                  <h4 className="text-sm font-black text-white" style={{ color: selectedCar.color }}>
                    {selectedCar.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold">{selectedCar.model}</p>
                </div>

                <button
                  onClick={() => setSelectedCarIndex(prev => (prev + 1) % CARS.length)}
                  className="p-1.5 rounded-xl bg-portal-card border border-portal-border text-slate-300 hover:text-white active:scale-95 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Vehicle Stats Bars */}
              <div className="space-y-1.5 text-[10px] text-slate-300 font-bold">
                <div className="flex items-center justify-between">
                  <span>Top Speed</span>
                  <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-portal-cyan" style={{ width: `${selectedCar.stats.speed}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Drift Angle</span>
                  <div className="w-28 h-1.5 rounded-full bg-portal-pink" style={{ width: `${selectedCar.stats.drift}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Nitro Boost</span>
                  <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-portal-gold" style={{ width: `${selectedCar.stats.nitro}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Agility</span>
                  <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${selectedCar.stats.control}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="space-y-2">
              <button
                onClick={startGame}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 text-black font-black text-sm shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-black" /> START DRIFTING
              </button>

              <button
                onClick={() => setShowControlsGuide(!showControlsGuide)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto underline"
              >
                <HelpCircle className="w-3 h-3" /> {showControlsGuide ? 'Hide Controls' : 'How to Play & Controls'}
              </button>

              {showControlsGuide && (
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-[10px] text-slate-300 text-left space-y-1 animate-in fade-in">
                  <p>• <strong>Steer</strong>: A/D or Left/Right Arrow keys</p>
                  <p>• <strong>E-Brake Drift</strong>: Space or Shift key</p>
                  <p>• <strong>Nitro Boost</strong>: E, B, or N key</p>
                  <p>• <strong>Apex Clips</strong>: Drift close to golden apex beacons for +500 PTS!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game Over Screen Overlay */}
        {isDead && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-rose-950/30 via-black/55 to-black/80 backdrop-blur-[2px] text-center animate-in fade-in duration-200">
            <div className="space-y-3 w-full max-w-xs bg-portal-bg/95 backdrop-blur-md p-4 rounded-2xl border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.25)]">
              <div>
                <span className="px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider">
                  Vehicle Totaled
                </span>
                <h3 className="text-2xl font-black text-white mt-1">Score: {score}</h3>
              </div>

              {/* Performance Stats Breakdown */}
              <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-portal-border text-[10px] text-slate-300 font-bold">
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase">Max Combo</p>
                  <p className="text-portal-gold font-black text-xs">{runStats.maxCombo}X Multiplier</p>
                </div>
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase">Apex Clips</p>
                  <p className="text-portal-cyan font-black text-xs">{runStats.apexClips} Hits</p>
                </div>
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase">Longest Slide</p>
                  <p className="text-portal-pink font-black text-xs">{runStats.longestDrift}s</p>
                </div>
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase">Distance</p>
                  <p className="text-emerald-400 font-black text-xs">{runStats.distance}m</p>
                </div>
              </div>

              {/* Ad Revive Notice Alert */}
              {adNotice && (
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 text-xs font-bold animate-in fade-in">
                  <div className="flex items-center justify-center gap-1 mb-0.5 text-portal-gold font-black text-[10px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>AD NETWORK NOTICE</span>
                  </div>
                  <p className="text-[10px] text-slate-300">{adNotice}</p>
                </div>
              )}

              {/* Emergency Revive Action */}
              <button
                onClick={handleWatchAdForRevive}
                disabled={hasRevived}
                className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl font-black text-xs transition-all ${
                  hasRevived
                    ? 'bg-slate-800/60 border border-slate-700/60 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-400/80 hover:border-amber-300 text-amber-300 hover:text-white shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-glow-gold active:scale-95'
                }`}
              >
                <Tv className={`w-3.5 h-3.5 ${hasRevived ? 'text-slate-500' : 'text-portal-gold animate-pulse'}`} />
                <span>{hasRevived ? 'REVIVE USED (1/RUN)' : 'WATCH AD TO REVIVE'}</span>
              </button>

              <button
                onClick={startGame}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-portal-cyan text-black font-black text-xs shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> RESTART RUN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Touch Controls for Mobile Devices */}
      {isPlaying && (
        <div className="w-full mt-2 flex items-center justify-between px-1 gap-2 select-none">
          {/* Left & Right Steering Touch Buttons */}
          <div className="flex items-center gap-2">
            <button
              onPointerDown={() => {
                touchSteerRef.current = -1;
              }}
              onPointerUp={() => {
                touchSteerRef.current = 0;
              }}
              onPointerCancel={() => {
                touchSteerRef.current = 0;
              }}
              onPointerLeave={() => {
                touchSteerRef.current = 0;
              }}
              className="w-13 h-12 rounded-xl bg-portal-surface border border-portal-border active:bg-cyan-500/30 text-white font-black text-base flex items-center justify-center active:scale-90 transition-transform shadow-md touch-none"
            >
              ◀
            </button>
            <button
              onPointerDown={() => {
                touchSteerRef.current = 1;
              }}
              onPointerUp={() => {
                touchSteerRef.current = 0;
              }}
              onPointerCancel={() => {
                touchSteerRef.current = 0;
              }}
              onPointerLeave={() => {
                touchSteerRef.current = 0;
              }}
              className="w-13 h-12 rounded-xl bg-portal-surface border border-portal-border active:bg-cyan-500/30 text-white font-black text-base flex items-center justify-center active:scale-90 transition-transform shadow-md touch-none"
            >
              ▶
            </button>
          </div>

          {/* E-Brake & Nitro Touch Buttons */}
          <div className="flex items-center gap-2">
            <button
              onPointerDown={() => {
                touchHandbrakeRef.current = true;
              }}
              onPointerUp={() => {
                touchHandbrakeRef.current = false;
              }}
              onPointerCancel={() => {
                touchHandbrakeRef.current = false;
              }}
              onPointerLeave={() => {
                touchHandbrakeRef.current = false;
              }}
              className="px-3.5 h-12 rounded-xl bg-portal-surface border border-pink-500/40 active:bg-pink-500/30 text-portal-pink font-black text-xs flex items-center justify-center gap-1 active:scale-90 transition-transform shadow-md touch-none"
            >
              <Flame className="w-3.5 h-3.5 text-portal-pink" /> DRIFT
            </button>

            <button
              onPointerDown={() => {
                touchNitroRef.current = true;
              }}
              onPointerUp={() => {
                touchNitroRef.current = false;
              }}
              onPointerCancel={() => {
                touchNitroRef.current = false;
              }}
              onPointerLeave={() => {
                touchNitroRef.current = false;
              }}
              className="px-3.5 h-12 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/50 active:bg-cyan-500/40 text-portal-cyan font-black text-xs flex items-center justify-center gap-1 active:scale-90 transition-transform shadow-glow-cyan touch-none"
            >
              <Zap className="w-3.5 h-3.5 text-portal-cyan" /> NITRO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
