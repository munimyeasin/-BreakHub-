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
  Flag,
  Timer,
  CheckCircle2,
  Car
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberDriftGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type TrackMode = 'circuit' | 'infinite';

const CANVAS_WIDTH = 360; // 9:16 Vertical Portrait Ratio (360x640)
const CANVAS_HEIGHT = 640;
const ROAD_HALF_WIDTH = 72; // Road total width ~ 144px
const SEGMENT_LENGTH = 32; // Distance between road spine nodes
const TOTAL_CIRCUIT_LAPS = 3; // 3 Laps for Grand Prix Circuit

// Handcrafted Grand Prix Circuit Waypoints
const CIRCUIT_WAYPOINTS = [
  { x: 0, y: 0 },          // Start/Finish Line (Grid Straight)
  { x: 0, y: -450 },       // Main Straightaway End / Turn 1 Braking Zone
  { x: 60, y: -660 },      // Turn 1 Entry (Right)
  { x: 240, y: -800 },     // Turn 1 Apex (High-Speed Sweeper)
  { x: 440, y: -740 },     // Turn 2 Apex / Exit
  { x: 560, y: -540 },     // East Straight Entry
  { x: 580, y: -340 },     // East Straight Mid
  { x: 480, y: -180 },     // Cyber Esse 1 (Left Apex)
  { x: 590, y: 0 },        // Cyber Esse 2 (Right Apex)
  { x: 640, y: 220 },      // South-East Sweeper Entry
  { x: 540, y: 440 },      // South-East Sweeper Apex
  { x: 340, y: 540 },      // South Straight Speed Trap
  { x: 140, y: 540 },      // South Straight / Hairpin Braking Zone
  { x: -100, y: 460 },     // Omega Hairpin Entry
  { x: -220, y: 300 },     // Omega Hairpin Mid (180° Left Drift)
  { x: -240, y: 80 },      // Omega Hairpin Exit
  { x: -180, y: -120 },    // West Chicane Entry (Left)
  { x: -240, y: -280 },    // West Chicane Exit (Right)
  { x: -180, y: -440 },    // Final Turn Entry
  { x: -70, y: -260 },     // Final Turn Apex into Pit Straight
  { x: 0, y: -90 },        // Straight Alignment onto Grid
];

// Available Retro Cars
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
    name: 'NEO GT-R',
    model: 'Phantom Spec-V',
    color: '#C0F7FE',
    accentColor: '#000000',
    trailColor: '#000000',
    topSpeed: 9.0,
    accel: 0.18,
    handling: 0.052,
    driftGrip: 0.84,
    nitroPower: 1.45,
    nitroColor: '#FE90E8',
    comboGraceBonus: 0,
    stats: { speed: 85, drift: 80, nitro: 82, control: 88 }
  },
  {
    id: 'apex_rx7',
    name: 'APEX RX-7',
    model: 'Rotary Spirit 2077',
    color: '#FE90E8',
    accentColor: '#000000',
    trailColor: '#000000',
    topSpeed: 8.7,
    accel: 0.17,
    handling: 0.058,
    driftGrip: 0.78,
    nitroPower: 1.5,
    nitroColor: '#F7CB46',
    comboGraceBonus: 0.4,
    stats: { speed: 82, drift: 96, nitro: 85, control: 78 }
  },
  {
    id: 'midnight_86',
    name: 'SPRINTER 86',
    model: 'Apex Tofu Legend',
    color: '#F7CB46',
    accentColor: '#000000',
    trailColor: '#000000',
    topSpeed: 8.4,
    accel: 0.16,
    handling: 0.056,
    driftGrip: 0.81,
    nitroPower: 1.38,
    nitroColor: '#99E885',
    comboGraceBonus: 0.8,
    stats: { speed: 78, drift: 92, nitro: 76, control: 95 }
  },
  {
    id: 'hyperion_ev',
    name: 'HYPERION EV',
    model: 'Quantum Hypercar',
    color: '#99E885',
    accentColor: '#000000',
    trailColor: '#000000',
    topSpeed: 9.8,
    accel: 0.22,
    handling: 0.048,
    driftGrip: 0.87,
    nitroPower: 1.7,
    nitroColor: '#C0F7FE',
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
  const [trackMode, setTrackMode] = useState<TrackMode>('circuit');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [isRaceFinished, setIsRaceFinished] = useState(false);
  const [currentLap, setCurrentLap] = useState(1);
  const [lapTimer, setLapTimer] = useState(0);
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  const [lapTimes, setLapTimes] = useState<number[]>([]);
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
    longestDrift: 0,
    totalRaceTime: 0
  });

  // Hot Loop Refs (Zero React Reconciliation Overhead)
  const trackModeRef = useRef<TrackMode>('circuit');
  const isPlayingRef = useRef(false);
  const isRaceFinishedRef = useRef(false);
  const currentLapRef = useRef(1);
  const currentLapTimeRef = useRef(0);
  const bestLapTimeRef = useRef<number | null>(null);
  const lapTimesRef = useRef<number[]>([]);
  const checkpointsHitRef = useRef<number[]>([0]); // Sector tracking
  const totalCheckpointsRef = useRef(4); // 4 sectors around circuit
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

  // Synchronize state changes with refs
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    trackModeRef.current = trackMode;
  }, [trackMode]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    selectedCarRef.current = CARS[selectedCarIndex] || CARS[0];
  }, [selectedCarIndex]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds * 100) % 100);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
  };

  // Web Audio Synthesizer
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

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

  const playSfx = useCallback((type: 'apex' | 'chip' | 'nitro' | 'turbo' | 'bank' | 'crash' | 'hit' | 'checkpoint' | 'lap' | 'victory') => {
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
        const freqs = [587.33, 739.99, 880, 1174.66];
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
      } else if (type === 'checkpoint') {
        const notes = [587.33, 880];
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.06);
          gain.gain.setValueAtTime(0.14, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.22);
        });
      } else if (type === 'lap') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.07);
          gain.gain.setValueAtTime(0.16, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.32);
        });
      } else if (type === 'victory') {
        const chords = [
          [523.25, 659.25, 783.99],
          [587.33, 739.99, 880],
          [659.25, 830.61, 987.77],
          [783.99, 987.77, 1174.66, 1567.98]
        ];
        chords.forEach((chord, step) => {
          chord.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + step * 0.12);
            gain.gain.setValueAtTime(0.12, now + step * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + step * 0.12 + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + step * 0.12);
            osc.stop(now + step * 0.12 + 0.48);
          });
        });
      }
    } catch {}
  }, [initAudio]);

  // Circuit Generator
  const generateFixedCircuitTrack = useCallback(() => {
    const rawPoints: { x: number; y: number }[] = [];
    const points: RoadPoint[] = [];
    const objects: TrackObject[] = [];
    nextObjectIdRef.current = 1;

    const M = CIRCUIT_WAYPOINTS.length;

    for (let i = 0; i < M; i++) {
      const p0 = CIRCUIT_WAYPOINTS[(i - 1 + M) % M];
      const p1 = CIRCUIT_WAYPOINTS[i];
      const p2 = CIRCUIT_WAYPOINTS[(i + 1) % M];
      const p3 = CIRCUIT_WAYPOINTS[(i + 2) % M];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(3, Math.round(dist / SEGMENT_LENGTH));

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
          2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        const y = 0.5 * (
          2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        rawPoints.push({ x, y });
      }
    }

    const N = rawPoints.length;

    for (let i = 0; i < N; i++) {
      const p = rawPoints[i];
      const nextP = rawPoints[(i + 1) % N];
      const prevP = rawPoints[(i - 1 + N) % N];

      const headingAngle = Math.atan2(nextP.y - prevP.y, nextP.x - prevP.x);
      const nextAngle = Math.atan2(rawPoints[(i + 2) % N].y - p.y, rawPoints[(i + 2) % N].x - p.x);
      let angleDiff = nextAngle - headingAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      let curveType: RoadPoint['curveType'] = 'straight';
      if (Math.abs(angleDiff) > 0.07) {
        curveType = angleDiff > 0 ? 'right' : 'left';
      }

      points.push({
        x: p.x,
        y: p.y,
        angle: headingAngle,
        width: ROAD_HALF_WIDTH * 2,
        curveType
      });
    }

    // Place Track Objects
    for (let i = 0; i < N; i++) {
      const pt = points[i];
      const normalAngle = pt.angle + Math.PI / 2;

      if ((i === 6 || i === Math.floor(N * 0.28) || i === Math.floor(N * 0.56)) && i < N) {
        objects.push({
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

      if (pt.curveType !== 'straight' && i % 8 === 0) {
        const isLeft = pt.curveType.includes('left');
        const apexOffset = (isLeft ? -1 : 1) * (ROAD_HALF_WIDTH - 14);
        objects.push({
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

      if (i % 3 === 0 && i !== 0 && i !== Math.floor(N * 0.25) && i !== Math.floor(N * 0.5) && i !== Math.floor(N * 0.75)) {
        const lateralScatter = ((i % 5) - 2) * (ROAD_HALF_WIDTH * 0.25);
        objects.push({
          id: nextObjectIdRef.current++,
          x: pt.x + Math.cos(normalAngle) * lateralScatter,
          y: pt.y + Math.sin(normalAngle) * lateralScatter,
          type: 'energy_chip',
          radius: 8,
          active: true,
          pulse: 0,
          points: 100
        });
      }
    }

    roadPointsRef.current = points;
    trackObjectsRef.current = objects;
  }, []);

  // Procedural Endless Track Generator
  const generateInitialTrack = useCallback(() => {
    const points: RoadPoint[] = [];
    const objects: TrackObject[] = [];
    nextObjectIdRef.current = 1;

    let currentX = 0;
    let currentY = 0;
    let currentAngle = -Math.PI / 2;

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

    appendProceduralTrackSegments(40);
  }, []);

  const appendProceduralTrackSegments = (count: number) => {
    const points = roadPointsRef.current;
    if (points.length === 0) return;

    let lastPt = points[points.length - 1];
    let curX = lastPt.x;
    let curY = lastPt.y;
    let curAngle = lastPt.angle;

    const curvePatterns: Array<{ type: RoadPoint['curveType']; deltaAngle: number; length: number }> = [
      { type: 'straight', deltaAngle: 0, length: 14 },
      { type: 'left', deltaAngle: -0.065, length: 16 },
      { type: 'right', deltaAngle: 0.065, length: 16 },
      { type: 'hairpin_left', deltaAngle: -0.11, length: 14 },
      { type: 'hairpin_right', deltaAngle: 0.11, length: 14 },
      { type: 'chicane', deltaAngle: 0.08, length: 8 }
    ];

    let segmentsRemaining = count;

    while (segmentsRemaining > 0) {
      const pattern = curvePatterns[Math.floor(Math.random() * curvePatterns.length)];
      const runLength = Math.min(segmentsRemaining, pattern.length);

      for (let s = 0; s < runLength; s++) {
        curAngle += pattern.deltaAngle;
        curX += Math.cos(curAngle) * SEGMENT_LENGTH;
        curY += Math.sin(curAngle) * SEGMENT_LENGTH;

        const newPoint: RoadPoint = {
          x: curX,
          y: curY,
          angle: curAngle,
          width: ROAD_HALF_WIDTH * 2,
          curveType: pattern.type
        };
        points.push(newPoint);

        const normalAngle = curAngle + Math.PI / 2;

        if (pattern.type !== 'straight' && s === Math.floor(runLength / 2)) {
          const isLeft = pattern.type.includes('left');
          const apexOffset = (isLeft ? -1 : 1) * (ROAD_HALF_WIDTH - 14);
          trackObjectsRef.current.push({
            id: nextObjectIdRef.current++,
            x: curX + Math.cos(normalAngle) * apexOffset,
            y: curY + Math.sin(normalAngle) * apexOffset,
            type: 'apex_pole',
            radius: 12,
            active: true,
            pulse: 0,
            points: 500
          });
        } else if (s % 3 === 0 && Math.random() < 0.65) {
          const lateralScatter = (Math.random() - 0.5) * (ROAD_HALF_WIDTH * 0.7);
          trackObjectsRef.current.push({
            id: nextObjectIdRef.current++,
            x: curX + Math.cos(normalAngle) * lateralScatter,
            y: curY + Math.sin(normalAngle) * lateralScatter,
            type: 'energy_chip',
            radius: 8,
            active: true,
            pulse: 0,
            points: 100
          });
        }
      }
      segmentsRemaining -= runLength;
    }
  };

  const projectOntoTrack = (px: number, py: number) => {
    const pts = roadPointsRef.current;
    if (pts.length === 0) return { lateralDist: 0, closestIndex: 0, trackAngle: 0 };

    let minDistSq = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const dx = px - pt.x;
      const dy = py - pt.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestIndex = i;
      }
    }

    const closest = pts[closestIndex];
    const dx = px - closest.x;
    const dy = py - closest.y;

    const normalAngle = closest.angle + Math.PI / 2;
    const normalX = Math.cos(normalAngle);
    const normalY = Math.sin(normalAngle);

    const lateralDist = dx * normalX + dy * normalY;

    return {
      lateralDist,
      closestIndex,
      trackAngle: closest.angle
    };
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, scale = 1.0) => {
    if (floatingTextsRef.current.length > 12) floatingTextsRef.current.shift();
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      alpha: 1.0,
      vy: -1.4,
      scale
    });
  };

  const spawnDriftSmoke = (x: number, y: number, color: string, intensity: number) => {
    const count = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length > 150) particlesRef.current.shift();
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 4 + 3,
        color: '#000000',
        alpha: Math.min(0.7, 0.35 + intensity * 0.3),
        maxLife: 22,
        life: 0,
        type: 'smoke'
      });
    }
  };

  const spawnSparks = (x: number, y: number, count = 8, color = '#F7CB46') => {
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length > 150) particlesRef.current.shift();
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color,
        alpha: 1.0,
        maxLife: 16,
        life: 0,
        type: 'spark'
      });
    }
  };

  const startGame = () => {
    initAudio();
    const isCircuit = trackModeRef.current === 'circuit';

    if (isCircuit) {
      generateFixedCircuitTrack();
    } else {
      generateInitialTrack();
    }

    const startPt = roadPointsRef.current[0] || { x: 0, y: 0, angle: -Math.PI / 2 };

    carStateRef.current = {
      x: startPt.x,
      y: startPt.y,
      heading: startPt.angle,
      steerAngle: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      slipAngle: 0,
      isDrifting: false,
      driftDuration: 0,
      currentDriftPoints: 0,
      nitroActive: false,
      nitroAmount: 100,
      shieldTimer: 60,
      health: 100
    };

    cameraRef.current = {
      x: startPt.x,
      y: startPt.y,
      angle: startPt.angle
    };

    skidMarksRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];

    scoreRef.current = 0;
    comboMultiplierRef.current = 1;
    maxComboRef.current = 1;
    comboTimerRef.current = 0;
    apexClipsCountRef.current = 0;
    longestDriftRef.current = 0;
    totalDistanceRef.current = 0;
    screenShakeRef.current = 0;

    currentLapRef.current = 1;
    currentLapTimeRef.current = 0;
    lapTimesRef.current = [];
    bestLapTimeRef.current = null;
    checkpointsHitRef.current = [0];

    setCurrentLap(1);
    setLapTimer(0);
    setBestLapTime(null);
    setLapTimes([]);
    setScore(0);
    setNitroFuel(100);
    setSpeedKmh(0);
    setDisplayMultiplier(1);
    setDriftTier('');
    setHasRevived(false);
    setAdNotice(null);
    setIsDead(false);
    setIsRaceFinished(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    isRaceFinishedRef.current = false;
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') keysRef.current.left = true;
      if (code === 'ArrowRight' || code === 'KeyD') keysRef.current.right = true;
      if (code === 'ArrowUp' || code === 'KeyW') keysRef.current.up = true;
      if (code === 'ArrowDown' || code === 'KeyS') keysRef.current.down = true;
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') keysRef.current.handbrake = true;
      if (code === 'KeyE' || code === 'KeyB' || code === 'KeyN') keysRef.current.nitro = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') keysRef.current.left = false;
      if (code === 'ArrowRight' || code === 'KeyD') keysRef.current.right = false;
      if (code === 'ArrowUp' || code === 'KeyW') keysRef.current.up = false;
      if (code === 'ArrowDown' || code === 'KeyS') keysRef.current.down = false;
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') keysRef.current.handbrake = false;
      if (code === 'KeyE' || code === 'KeyB' || code === 'KeyN') keysRef.current.nitro = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleWatchAdForRevive = () => {
    if (hasRevived) return;
    setAdNotice('Connecting to sponsored ad network...');
    if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);

    adTimeoutRef.current = setTimeout(() => {
      setHasRevived(true);
      setAdNotice(null);
      setIsDead(false);
      setIsPlaying(true);
      isPlayingRef.current = true;

      const state = carStateRef.current;
      state.shieldTimer = 120;
      state.nitroAmount = 100;
      state.speed = 4.0;
      state.vx = Math.cos(state.heading) * 4.0;
      state.vy = Math.sin(state.heading) * 4.0;

      addFloatingText(state.x, state.y - 30, 'REVIVED WITH 100% NITRO!', '#99E885', 1.3);
      playSfx('nitro');
    }, 1800);
  };

  // Main 60-144+ FPS Delta-Time Game Loop
  useEffect(() => {
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
      const frameScale = dt * 60;

      if (isPlayingRef.current && !isRaceFinishedRef.current) {
        const car = selectedCarRef.current;
        const state = carStateRef.current;
        const keys = keysRef.current;

        // Steering & Throttle
        let steerInput = 0;
        if (keys.left) steerInput -= 1;
        if (keys.right) steerInput += 1;
        if (touchSteerRef.current !== 0) steerInput = touchSteerRef.current;

        const isHandbrake = keys.handbrake || touchHandbrakeRef.current;
        const isNitro = (keys.nitro || touchNitroRef.current) && state.nitroAmount > 0;
        const isGas = keys.up;
        const isBrake = keys.down;

        const targetSteer = steerInput * car.handling;
        state.steerAngle += (targetSteer - state.steerAngle) * Math.min(1, 0.22 * frameScale);

        let accelForce = (isGas ? car.accel * 1.3 : car.accel) * frameScale;
        if (isNitro && state.nitroAmount > 0) {
          accelForce *= car.nitroPower;
          state.nitroAmount = Math.max(0, state.nitroAmount - 28 * dt);
          state.nitroActive = true;
          if (Math.random() > 0.4) playSfx('nitro');
        } else {
          state.nitroActive = false;
        }

        const currentTopSpeed = isNitro ? car.topSpeed * 1.38 : car.topSpeed;

        const forwardX = Math.cos(state.heading);
        const forwardY = Math.sin(state.heading);
        const rightX = -Math.sin(state.heading);
        const rightY = Math.cos(state.heading);

        let vLong = state.vx * forwardX + state.vy * forwardY;
        let vLat = state.vx * rightX + state.vy * rightY;

        if (isGas && vLong < currentTopSpeed) {
          vLong += accelForce;
        } else if (!isGas && !isBrake && !isHandbrake && vLong < car.topSpeed * 0.75) {
          vLong += car.accel * 0.6 * frameScale;
        }

        if (isBrake) {
          vLong = Math.max(-2.5, vLong - car.accel * 1.8 * frameScale);
        }

        const currentSpeed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
        state.speed = currentSpeed;
        totalDistanceRef.current += currentSpeed * dt * 3.5;

        state.slipAngle = Math.atan2(vLat, Math.max(1.2, Math.abs(vLong)));
        const absSlipAngleDeg = (Math.abs(state.slipAngle) * 180) / Math.PI;

        const isDriftingNow = (Math.abs(vLat) > 1.2 || isHandbrake) && currentSpeed > 2.5;
        state.isDrifting = isDriftingNow;

        let lateralGrip = car.driftGrip;
        if (isHandbrake) {
          lateralGrip *= 0.68;
          vLong *= Math.pow(0.975, frameScale);
        } else if (isDriftingNow) {
          lateralGrip *= 0.88;
        }

        const isCounterSteer = steerInput * -Math.sign(vLat) > 0;
        const counterSteerBonus = isCounterSteer ? 1.35 : 1.0;
        const speedFactor = Math.min(1.2, currentSpeed / (car.topSpeed * 0.75));
        state.heading += state.steerAngle * speedFactor * counterSteerBonus * frameScale;

        const longDecay = Math.pow(0.992, frameScale);
        const latDecay = Math.pow(lateralGrip, frameScale);

        vLong *= longDecay;
        vLat *= latDecay;

        state.vx = forwardX * vLong + rightX * vLat;
        state.vy = forwardY * vLong + rightY * vLat;

        state.x += state.vx * frameScale;
        state.y += state.vy * frameScale;

        if (state.shieldTimer > 0) state.shieldTimer -= frameScale;

        updateScreechAudio(isDriftingNow, absSlipAngleDeg / 40);

        // Drift Scoring
        if (isDriftingNow && absSlipAngleDeg > 8) {
          state.driftDuration += dt;
          if (state.driftDuration > longestDriftRef.current) {
            longestDriftRef.current = state.driftDuration;
          }

          let tierLabel = 'NICE SLIDE';
          let tierColor = '#000000';
          if (absSlipAngleDeg > 42 || comboMultiplierRef.current >= 6) {
            tierLabel = 'APEX DRIFT KING';
            tierColor = '#F7CB46';
          } else if (absSlipAngleDeg > 28 || comboMultiplierRef.current >= 4) {
            tierLabel = 'HYPER DRIFT';
            tierColor = '#FE90E8';
          } else if (absSlipAngleDeg > 15 || comboMultiplierRef.current >= 2) {
            tierLabel = 'SICK SLIDE';
            tierColor = '#99E885';
          }
          setDriftTier(tierLabel);

          const driftPointsThisFrame = (absSlipAngleDeg * 1.8 * currentSpeed * comboMultiplierRef.current * dt) | 0;
          state.currentDriftPoints += driftPointsThisFrame;
          scoreRef.current += driftPointsThisFrame;

          const rearWheelOffset = 18;
          const leftTireX = state.x - forwardX * rearWheelOffset + rightX * 8;
          const leftTireY = state.y - forwardY * rearWheelOffset + rightY * 8;
          const rightTireX = state.x - forwardX * rearWheelOffset - rightX * 8;
          const rightTireY = state.y - forwardY * rearWheelOffset - rightY * 8;

          spawnDriftSmoke(leftTireX, leftTireY, car.trailColor, absSlipAngleDeg / 35);
          spawnDriftSmoke(rightTireX, rightTireY, car.trailColor, absSlipAngleDeg / 35);

          if (skidMarksRef.current.length < 180) {
            skidMarksRef.current.push({
              x1: leftTireX,
              y1: leftTireY,
              x2: leftTireX - state.vx * 0.9,
              y2: leftTireY - state.vy * 0.9,
              alpha: 0.65,
              color: '#000000'
            });
            skidMarksRef.current.push({
              x1: rightTireX,
              y1: rightTireY,
              x2: rightTireX - state.vx * 0.9,
              y2: rightTireY - state.vy * 0.9,
              alpha: 0.65,
              color: '#000000'
            });
          }

          state.nitroAmount = Math.min(100, state.nitroAmount + 8 * dt);

          if (state.driftDuration > 1.2 && comboMultiplierRef.current < 10) {
            comboMultiplierRef.current = Math.min(10, comboMultiplierRef.current + 1);
            setDisplayMultiplier(comboMultiplierRef.current);
            if (comboMultiplierRef.current > maxComboRef.current) {
              maxComboRef.current = comboMultiplierRef.current;
            }
            state.driftDuration = 0.4;
            addFloatingText(state.x, state.y - 25, `${comboMultiplierRef.current}X COMBO!`, tierColor, 1.2);
          }

          comboTimerRef.current = 1.6 + car.comboGraceBonus;
        } else {
          if (comboTimerRef.current > 0) {
            comboTimerRef.current -= dt;
            if (comboTimerRef.current <= 0) {
              if (state.currentDriftPoints > 0) {
                playSfx('bank');
                addFloatingText(state.x, state.y - 20, `+${state.currentDriftPoints} BANKED!`, '#F7CB46', 1.1);
                state.currentDriftPoints = 0;
              }
              comboMultiplierRef.current = 1;
              setDisplayMultiplier(1);
              setDriftTier('');
            }
          }
          state.driftDuration = 0;
        }

        setScore(scoreRef.current);
        setNitroFuel(state.nitroAmount | 0);
        setSpeedKmh(Math.floor(currentSpeed * 22));

        // Track Progression & Laps
        const trackProj = projectOntoTrack(state.x, state.y);
        const maxAllowedLateral = ROAD_HALF_WIDTH - 10;
        const pts = roadPointsRef.current;
        const isCircuit = trackModeRef.current === 'circuit';

        if (isCircuit) {
          currentLapTimeRef.current += dt;
          setLapTimer(currentLapTimeRef.current);

          const currentIdx = trackProj.closestIndex;
          const totalPoints = pts.length;
          const sec1Idx = Math.floor(totalPoints * 0.25);
          const sec2Idx = Math.floor(totalPoints * 0.50);
          const sec3Idx = Math.floor(totalPoints * 0.75);

          if (currentIdx >= sec1Idx && currentIdx < sec1Idx + 15 && !checkpointsHitRef.current.includes(1)) {
            checkpointsHitRef.current.push(1);
            playSfx('checkpoint');
            addFloatingText(state.x, state.y - 25, 'SECTOR 1 CLEAR', '#C0F7FE', 1.1);
          }
          if (currentIdx >= sec2Idx && currentIdx < sec2Idx + 15 && !checkpointsHitRef.current.includes(2)) {
            checkpointsHitRef.current.push(2);
            playSfx('checkpoint');
            addFloatingText(state.x, state.y - 25, 'SECTOR 2 CLEAR', '#99E885', 1.1);
          }
          if (currentIdx >= sec3Idx && currentIdx < sec3Idx + 15 && !checkpointsHitRef.current.includes(3)) {
            checkpointsHitRef.current.push(3);
            playSfx('checkpoint');
            addFloatingText(state.x, state.y - 25, 'SECTOR 3 CLEAR', '#F7CB46', 1.1);
          }

          if (
            checkpointsHitRef.current.includes(1) &&
            checkpointsHitRef.current.includes(2) &&
            checkpointsHitRef.current.includes(3) &&
            (currentIdx <= 8 || currentIdx >= totalPoints - 8)
          ) {
            const completedLapTime = currentLapTimeRef.current;
            lapTimesRef.current.push(completedLapTime);
            setLapTimes([...lapTimesRef.current]);

            setBestLapTime((prev) => (prev === null || completedLapTime < prev ? completedLapTime : prev));

            if (currentLapRef.current < TOTAL_CIRCUIT_LAPS) {
              currentLapRef.current += 1;
              setCurrentLap(currentLapRef.current);
              currentLapTimeRef.current = 0;
              checkpointsHitRef.current = [0];

              playSfx('lap');
              const lapBonus = 3000 * comboMultiplierRef.current;
              scoreRef.current += lapBonus;
              state.nitroAmount = Math.min(100, state.nitroAmount + 50);
              addFloatingText(state.x, state.y - 30, `LAP ${currentLapRef.current}/${TOTAL_CIRCUIT_LAPS}! +${lapBonus}`, '#FE90E8', 1.4);
              confetti({ particleCount: 40, spread: 60 });
            } else {
              isRaceFinishedRef.current = true;
              setIsRaceFinished(true);
              setIsPlaying(false);
              isPlayingRef.current = false;
              updateScreechAudio(false, 0);

              playSfx('victory');
              confetti({ particleCount: 150, spread: 100 });

              const totalRaceTime = lapTimesRef.current.reduce((a, b) => a + b, 0);
              const victoryBonus = Math.max(5000, 25000 - Math.floor(totalRaceTime * 300));
              scoreRef.current += victoryBonus;
              setScore(scoreRef.current);

              setRunStats({
                distance: Math.floor(totalDistanceRef.current),
                maxCombo: maxComboRef.current,
                apexClips: apexClipsCountRef.current,
                longestDrift: Number(longestDriftRef.current.toFixed(1)),
                totalRaceTime: Number(totalRaceTime.toFixed(2))
              });

              setTimeout(() => onGameOverRef.current(scoreRef.current), 500);
            }
          }
        } else {
          if (pts.length - trackProj.closestIndex < 100) {
            appendProceduralTrackSegments(40);
          }
        }

        // Track Objects Collisions
        trackObjectsRef.current.forEach((obj) => {
          if (!obj.active) return;
          const dx = state.x - obj.x;
          const dy = state.y - obj.y;
          const dist = Math.hypot(dx, dy);

          if (obj.type === 'apex_pole') {
            if (dist < obj.radius + 18) {
              obj.active = false;
              apexClipsCountRef.current += 1;
              const apexPts = obj.points * comboMultiplierRef.current;
              scoreRef.current += apexPts;
              state.nitroAmount = Math.min(100, state.nitroAmount + 25);
              playSfx('apex');
              spawnSparks(obj.x, obj.y, 14, '#F7CB46');
              addFloatingText(obj.x, obj.y - 20, `APEX CLIP! +${apexPts}`, '#F7CB46', 1.3);
            }
          } else if (obj.type === 'energy_chip') {
            if (dist < obj.radius + 16) {
              obj.active = false;
              const chipPts = obj.points * comboMultiplierRef.current;
              scoreRef.current += chipPts;
              state.nitroAmount = Math.min(100, state.nitroAmount + 15);
              playSfx('chip');
              spawnSparks(obj.x, obj.y, 8, '#C0F7FE');
              addFloatingText(obj.x, obj.y - 15, `+${chipPts}`, '#C0F7FE', 1.0);
            }
          } else if (obj.type === 'boost_pad') {
            if (dist < obj.radius + 16) {
              vLong = Math.min(car.topSpeed * 1.6, vLong + 4.5);
              state.nitroAmount = Math.min(100, state.nitroAmount + 35);
              playSfx('turbo');
              spawnSparks(state.x, state.y, 18, '#99E885');
              addFloatingText(state.x, state.y - 20, 'BOOST PAD!', '#99E885', 1.3);
            }
          }
        });

        // Off-Road Wall Crash
        if (Math.abs(trackProj.lateralDist) > maxAllowedLateral) {
          if (state.shieldTimer <= 0) {
            handlePlayerCrash();
          } else {
            vLong *= 0.8;
            playSfx('hit');
            spawnSparks(state.x, state.y, 6, '#FE90E8');
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
        spawnSparks(carStateRef.current.x, carStateRef.current.y, 25, '#FE90E8');

        setRunStats({
          distance: Math.floor(totalDistanceRef.current),
          maxCombo: maxComboRef.current,
          apexClips: apexClipsCountRef.current,
          longestDrift: Number(longestDriftRef.current.toFixed(1)),
          totalRaceTime: 0
        });

        const finalScore = scoreRef.current;
        if (finalScore > 3500) {
          confetti({ particleCount: 60, spread: 70 });
        }
        setTimeout(() => onGameOverRef.current(finalScore), 0);
      }

      // ==========================================
      // CANVAS 2D RENDER ENGINE (NEO-BRUTALISM)
      // ==========================================
      const state = carStateRef.current;
      const car = selectedCarRef.current;
      const cam = cameraRef.current;
      const lookAhead = Math.min(90, state.speed * 10);
      const targetCamX = state.x + Math.cos(state.heading) * lookAhead;
      const targetCamY = state.y + Math.sin(state.heading) * lookAhead;

      cam.x += (targetCamX - cam.x) * Math.min(1, 8 * dt);
      cam.y += (targetCamY - cam.y) * Math.min(1, 8 * dt);

      let angleDiff = state.heading - cam.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      cam.angle += angleDiff * Math.min(1, 5.0 * dt);

      ctx.save();

      let shakeX = 0;
      let shakeY = 0;
      if (screenShakeRef.current > 0) {
        shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.88;
        if (screenShakeRef.current < 0.4) screenShakeRef.current = 0;
      }

      ctx.translate(CANVAS_WIDTH / 2 + shakeX, CANVAS_HEIGHT * 0.7 + shakeY);
      ctx.rotate(-cam.angle - Math.PI / 2);
      ctx.translate(-cam.x, -cam.y);

      // 1. Warm Ground Clear
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(cam.x - 700, cam.y - 700, 1400, 1400);

      // 2. Dot Matrix Ground Grid
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      const startGridX = Math.floor((cam.x - 700) / 24) * 24;
      const endGridX = cam.x + 700;
      const startGridY = Math.floor((cam.y - 700) / 24) * 24;
      const endGridY = cam.y + 700;

      for (let gx = startGridX; gx < endGridX; gx += 24) {
        for (let gy = startGridY; gy < endGridY; gy += 24) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Render Road Surface & High-Contrast Asphalt
      const isCircuitMode = trackModeRef.current === 'circuit';
      const roadPts = roadPointsRef.current;
      const totalPoints = roadPts.length;

      const trackProj = projectOntoTrack(state.x, state.y);
      const startIdx = isCircuitMode ? 0 : Math.max(0, trackProj.closestIndex - 18);
      const endIdx = isCircuitMode ? totalPoints : Math.min(totalPoints - 1, trackProj.closestIndex + 85);

      const sec1Idx = Math.floor(totalPoints * 0.25);
      const sec2Idx = Math.floor(totalPoints * 0.50);
      const sec3Idx = Math.floor(totalPoints * 0.75);

      for (let i = startIdx; i < endIdx; i++) {
        const p1 = roadPts[i];
        const nextI = isCircuitMode ? (i + 1) % totalPoints : i + 1;
        if (!isCircuitMode && nextI >= totalPoints) break;
        const p2 = roadPts[nextI];

        const n1X = -Math.sin(p1.angle) * ROAD_HALF_WIDTH;
        const n1Y = Math.cos(p1.angle) * ROAD_HALF_WIDTH;
        const n2X = -Math.sin(p2.angle) * ROAD_HALF_WIDTH;
        const n2Y = Math.cos(p2.angle) * ROAD_HALF_WIDTH;

        // Road Hard Drop Shadow (+4, +4)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(p1.x + n1X + 4, p1.y + n1Y + 4);
        ctx.lineTo(p1.x - n1X + 4, p1.y - n1Y + 4);
        ctx.lineTo(p2.x - n2X + 4, p2.y - n2Y + 4);
        ctx.lineTo(p2.x + n2X + 4, p2.y + n2Y + 4);
        ctx.closePath();
        ctx.fill();

        // White Crisp Asphalt Body
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(p1.x + n1X, p1.y + n1Y);
        ctx.lineTo(p1.x - n1X, p1.y - n1Y);
        ctx.lineTo(p2.x - n2X, p2.y - n2Y);
        ctx.lineTo(p2.x + n2X, p2.y + n2Y);
        ctx.closePath();
        ctx.fill();

        // Solid Black Outer Perimeter Curbs
        ctx.strokeStyle = '#000000';
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

        // Alternating Pastel Curbs on corners
        const curbColor = i % 2 === 0 ? '#FE90E8' : '#C0F7FE';
        ctx.fillStyle = curbColor;
        ctx.beginPath();
        ctx.arc(p1.x + n1X, p1.y + n1Y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p1.x - n1X, p1.y - n1Y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Center Dashed Lane Marker
        if (i % 2 === 0) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // Start/Finish Line & Sector Gates in Circuit Mode
        if (isCircuitMode) {
          if (i === 0) {
            // Checkered Start/Finish Line
            const checkCount = 8;
            for (let c = 0; c < checkCount; c++) {
              const t1 = c / checkCount;
              const t2 = (c + 1) / checkCount;
              const cx1 = p1.x + n1X * (1 - 2 * t1);
              const cy1 = p1.y + n1Y * (1 - 2 * t1);
              const cx2 = p1.x + n1X * (1 - 2 * t2);
              const cy2 = p1.y + n1Y * (1 - 2 * t2);

              ctx.strokeStyle = c % 2 === 0 ? '#000000' : '#F7CB46';
              ctx.lineWidth = 7;
              ctx.beginPath();
              ctx.moveTo(cx1, cy1);
              ctx.lineTo(cx2, cy2);
              ctx.stroke();
            }
          } else if (i === sec1Idx) {
            ctx.strokeStyle = '#C0F7FE';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(p1.x + n1X, p1.y + n1Y);
            ctx.lineTo(p1.x - n1X, p1.y - n1Y);
            ctx.stroke();
          } else if (i === sec2Idx) {
            ctx.strokeStyle = '#99E885';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(p1.x + n1X, p1.y + n1Y);
            ctx.lineTo(p1.x - n1X, p1.y - n1Y);
            ctx.stroke();
          } else if (i === sec3Idx) {
            ctx.strokeStyle = '#F7CB46';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(p1.x + n1X, p1.y + n1Y);
            ctx.lineTo(p1.x - n1X, p1.y - n1Y);
            ctx.stroke();
          }
        }
      }

      // 4. Render Skid Marks
      for (let i = skidMarksRef.current.length - 1; i >= 0; i--) {
        const sm = skidMarksRef.current[i];
        sm.alpha -= 0.003 * frameScale;
        if (sm.alpha <= 0) {
          skidMarksRef.current.splice(i, 1);
        } else {
          ctx.strokeStyle = '#000000';
          ctx.globalAlpha = sm.alpha;
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(sm.x1, sm.y1);
          ctx.lineTo(sm.x2, sm.y2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;

      // 5. Render Track Objects (Apex Poles, Chips, Boost Pads)
      trackObjectsRef.current.forEach((obj) => {
        if (!obj.active) return;
        obj.pulse = (obj.pulse + 0.08 * frameScale) % (Math.PI * 2);

        if (obj.type === 'apex_pole') {
          // Hard Drop Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(obj.x + 2.5, obj.y + 2.5, obj.radius, 0, Math.PI * 2);
          ctx.fill();

          // Apex Pylon
          ctx.fillStyle = '#F7CB46';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // White Center Cap
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (obj.type === 'energy_chip') {
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.rotate(obj.pulse);

          // Hard Drop Shadow
          ctx.fillStyle = '#000000';
          ctx.fillRect(-6 + 2, -6 + 2, 12, 12);

          // Diamond Body
          ctx.fillStyle = '#C0F7FE';
          ctx.fillRect(-6, -6, 12, 12);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(-6, -6, 12, 12);
          ctx.restore();
        } else if (obj.type === 'boost_pad') {
          // Hard Drop Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(obj.x + 3, obj.y + 3, obj.radius, 0, Math.PI * 2);
          ctx.fill();

          // Boost Chevron Pad
          ctx.fillStyle = '#99E885';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = '900 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('▲', obj.x, obj.y);
        }
      });

      // 6. Render Particles (Chunky Square Sparks & Smoke)
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
          ctx.fillRect(pt.x | 0, pt.y | 0, pt.size * 2, pt.size * 2);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(pt.x | 0, pt.y | 0, pt.size * 2, pt.size * 2);
        }
      }
      ctx.globalAlpha = 1.0;

      // 7. Render Player Car Sprite
      renderCarSprite(ctx, state.x, state.y, state.heading, state.steerAngle, car, state.nitroActive);

      // 8. Render Floating Reward Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * frameScale;
        ft.alpha -= 0.025 * frameScale;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.translate(ft.x, ft.y);
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = `900 ${Math.floor(13 * ft.scale)}px sans-serif`;
          ctx.textAlign = 'center';

          // Shadow
          ctx.fillStyle = '#000000';
          ctx.fillText(ft.text, 2, 2);

          // Front text
          ctx.fillStyle = ft.color;
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
  }, [playSfx, updateScreechAudio]);

  // Neo-Brutalist Car Sprite Renderer
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

    // Hard Drop Shadow (+3.5, +3.5)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(-18 + 3.5, -10 + 3.5);
    ctx.lineTo(16 + 3.5, -10 + 3.5);
    ctx.lineTo(24 + 3.5, -5 + 3.5);
    ctx.lineTo(26 + 3.5, 0 + 3.5);
    ctx.lineTo(24 + 3.5, 5 + 3.5);
    ctx.lineTo(16 + 3.5, 10 + 3.5);
    ctx.lineTo(-18 + 3.5, 10 + 3.5);
    ctx.closePath();
    ctx.fill();

    // Nitro Exhaust Flames when boosting
    if (nitroActive) {
      ctx.fillStyle = '#FE90E8';
      ctx.beginPath();
      ctx.moveTo(-20, -6);
      ctx.lineTo(-38 - Math.random() * 12, 0);
      ctx.lineTo(-20, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 4 Wheels (Black blocks with Solid Borders)
    ctx.fillStyle = '#000000';
    ctx.fillRect(-16, -15, 10, 5);
    ctx.fillRect(-16, 10, 10, 5);

    // Front Left Wheel (Steered)
    ctx.save();
    ctx.translate(14, -13);
    ctx.rotate(steerAngle * 2.5);
    ctx.fillRect(-5, -2.5, 10, 5);
    ctx.restore();

    // Front Right Wheel (Steered)
    ctx.save();
    ctx.translate(14, 13);
    ctx.rotate(steerAngle * 2.5);
    ctx.fillRect(-5, -2.5, 10, 5);
    ctx.restore();

    // Car Main Body Chassis (Pastel Swatch with 3px Solid Black Outline)
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
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Carbon Hood & Cabin Roof
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-8, -7, 18, 14);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -7, 18, 14);

    // Windshield
    ctx.fillStyle = '#C0F7FE';
    ctx.beginPath();
    ctx.moveTo(3, -5);
    ctx.lineTo(10, -4);
    ctx.lineTo(10, 4);
    ctx.lineTo(3, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rear Spoiler Wing
    ctx.fillStyle = '#000000';
    ctx.fillRect(-22, -12, 4, 24);

    // Twin Projector Headlights
    ctx.fillStyle = '#F7CB46';
    ctx.fillRect(23, -8, 3, 4);
    ctx.fillRect(23, 4, 3, 4);

    // Tail Brake Lights
    ctx.fillStyle = '#FE90E8';
    ctx.fillRect(-19, -8, 2, 16);

    ctx.restore();
  };

  const selectedCar = CARS[selectedCarIndex] || CARS[0];

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2 shadow-neo-sm">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-portal-yellow px-2 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
            <Gauge className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[10px] uppercase tracking-wider">Score</span>
            <span className="text-xs font-black">{score}</span>
          </div>

          {displayMultiplier > 1 && (
            <span className="px-1.5 py-0.5 rounded-md bg-portal-pink text-black border-2 border-black text-[10px] font-black shadow-neo-xs animate-pulse">
              {displayMultiplier}X
            </span>
          )}

          {isPlaying && (
            <span className="px-2 py-1 rounded-lg bg-portal-butter border-2 border-black shadow-neo-xs text-[10px] font-black text-black">
              {speedKmh} <span className="text-[8px] uppercase">KM/H</span>
            </span>
          )}
        </div>

        {/* Track Mode / Lap & Sector Counter */}
        {isPlaying && (
          <div className="flex items-center gap-1 text-[10px] font-black">
            {trackMode === 'circuit' ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-portal-cyan border-2 border-black shadow-neo-xs text-black">
                <Trophy className="w-3 h-3 stroke-[2.5]" />
                <span>LAP {currentLap}/{TOTAL_CIRCUIT_LAPS}</span>
                <span className="text-slate-700 text-[9px] font-mono font-bold">
                  {formatTime(lapTimer)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-portal-green border-2 border-black shadow-neo-xs text-black">
                <span>♾️ FREEWAY</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {/* Nitro Fuel Bar */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] px-2 py-1 rounded-lg border-2 border-black shadow-neo-xs">
            <Zap className={`w-3.5 h-3.5 stroke-[2.5] ${nitroFuel > 25 ? 'text-black fill-black' : 'text-slate-400'}`} />
            <div className="w-12 h-2 rounded-full bg-white border border-black overflow-hidden">
              <div
                className="h-full bg-portal-yellow transition-all duration-75 border-r border-black"
                style={{ width: `${nitroFuel}%` }}
              />
            </div>
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
      </div>

      {/* Active Drift Tier Banner */}
      {driftTier && (
        <div className="w-full mb-2 px-3 py-1 rounded-xl bg-portal-yellow border-3 border-black shadow-neo-sm flex items-center justify-center gap-1.5 text-xs font-black text-black uppercase tracking-wider animate-pulse">
          <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{driftTier}</span>
        </div>
      )}

      {/* Main Game Screen Canvas (9:16 Vertical Portrait Ratio) with Figma Corner Handles */}
      <div className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl border-4 border-black p-0 overflow-hidden shadow-neo-lg flex items-center justify-center touch-none cursor-crosshair">
        {/* Figma Corner Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block select-none"
        />

        {/* Start / Garage Screen Overlay */}
        {!isPlaying && !isDead && !isRaceFinished && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-between p-3.5 text-center animate-fadeIn z-10">
            {/* Header Title */}
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1 shadow-neo-xs">
                • [ RETRO GRAND PRIX ] •
              </div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                Cyber Drift 2077
              </h2>
            </div>

            {/* Track Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white border-3 border-black shadow-neo-sm">
              <button
                type="button"
                onClick={() => setTrackMode('circuit')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 border-2 transition-all ${
                  trackMode === 'circuit'
                    ? 'bg-portal-yellow text-black border-black shadow-neo-xs'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-black'
                }`}
              >
                <Trophy className="w-3 h-3 stroke-[2.5]" />
                <span>CYBER RING (3 LAPS)</span>
              </button>
              <button
                type="button"
                onClick={() => setTrackMode('infinite')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 border-2 transition-all ${
                  trackMode === 'infinite'
                    ? 'bg-portal-pink text-black border-black shadow-neo-xs'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-black'
                }`}
              >
                <span>♾️ FREEWAY (ENDLESS)</span>
              </button>
            </div>

            {/* Garage Car Selector Carousel */}
            <div className="bg-white border-3 border-black rounded-2xl p-2.5 my-1 shadow-neo-sm">
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCarIndex(prev => (prev - 1 + CARS.length) % CARS.length)}
                  className="p-1.5 rounded-lg bg-portal-butter border-2 border-black text-black shadow-neo-xs hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none transition-all"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[3]" />
                </button>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: selectedCar.color === '#FFFFFF' ? '#000000' : selectedCar.color }}>
                    {selectedCar.name}
                  </h4>
                  <p className="text-[9px] text-slate-700 font-bold">{selectedCar.model}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCarIndex(prev => (prev + 1) % CARS.length)}
                  className="p-1.5 rounded-lg bg-portal-butter border-2 border-black text-black shadow-neo-xs hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none transition-all"
                >
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Vehicle Stats Bars */}
              <div className="space-y-1 text-[9px] text-slate-800 font-black text-left">
                <div className="flex items-center justify-between">
                  <span>Top Speed</span>
                  <div className="w-24 h-2 rounded-full bg-slate-100 border border-black overflow-hidden">
                    <div className="h-full bg-portal-cyan" style={{ width: `${selectedCar.stats.speed}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Drift Angle</span>
                  <div className="w-24 h-2 rounded-full bg-slate-100 border border-black overflow-hidden">
                    <div className="h-full bg-portal-pink" style={{ width: `${selectedCar.stats.drift}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nitro Boost</span>
                  <div className="w-24 h-2 rounded-full bg-slate-100 border border-black overflow-hidden">
                    <div className="h-full bg-portal-yellow" style={{ width: `${selectedCar.stats.nitro}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Agility</span>
                  <div className="w-24 h-2 rounded-full bg-slate-100 border border-black overflow-hidden">
                    <div className="h-full bg-portal-green" style={{ width: `${selectedCar.stats.control}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={startGame}
                className="w-full py-3 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                <span>{trackMode === 'circuit' ? 'START 3-LAP GRAND PRIX' : 'START ENDLESS DRIFT'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowControlsGuide(!showControlsGuide)}
                className="text-[9px] text-white hover:text-portal-yellow flex items-center justify-center gap-1 mx-auto font-bold underline"
              >
                <HelpCircle className="w-3 h-3" /> {showControlsGuide ? 'Hide Controls' : 'How to Play & Controls'}
              </button>

              {showControlsGuide && (
                <div className="p-2 rounded-xl bg-white border-2 border-black text-[9px] text-slate-800 text-left space-y-0.5 font-bold shadow-neo-xs animate-fadeIn">
                  <p>• <strong>Steer</strong>: A/D or Left/Right Arrow keys</p>
                  <p>• <strong>E-Brake Drift</strong>: Space or Shift key</p>
                  <p>• <strong>Nitro Boost</strong>: E, B, or N key</p>
                  <p>• <strong>Apex Clips</strong>: Drift close to golden apex beacons for +500 PTS!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grand Prix Championship Victory Screen Overlay */}
        {isRaceFinished && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fadeIn z-20">
            <div className="relative bg-white border-4 border-black rounded-2xl p-4 sm:p-5 shadow-neo-xl w-full max-w-[300px] space-y-3 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div>
                <span className="inline-block px-3 py-0.5 rounded-md bg-portal-yellow border-2 border-black text-black text-[10px] font-black uppercase tracking-wider shadow-neo-xs">
                  🏆 GRAND PRIX CHAMPION
                </span>
                <h3 className="text-xl font-black text-black mt-1 uppercase">CIRCUIT VICTORY!</h3>
                <p className="text-xs text-slate-700 font-black">Score: {score}</p>
              </div>

              {/* Lap Times Breakdown */}
              <div className="p-2 rounded-xl bg-[#FAF8F5] border-2 border-black text-[10px] text-slate-800 font-bold space-y-1 shadow-neo-xs">
                <div className="flex items-center justify-between border-b border-black/20 pb-1 text-slate-600 font-black">
                  <span>LAP</span>
                  <span>TIME</span>
                </div>
                {lapTimes.map((lt, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-slate-800">LAP {idx + 1}</span>
                    <span className="font-mono text-black font-black">{formatTime(lt)}</span>
                  </div>
                ))}
                {bestLapTime !== null && (
                  <div className="flex items-center justify-between pt-1 border-t border-black/20 text-black font-black">
                    <span>BEST LAP</span>
                    <span className="font-mono">{formatTime(bestLapTime)}</span>
                  </div>
                )}
              </div>

              {/* Performance Stats Breakdown */}
              <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-[#FAF8F5] border-2 border-black text-[10px] text-slate-800 font-bold shadow-neo-xs">
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Max Combo</p>
                  <p className="text-black font-black text-xs">{runStats.maxCombo}X Multiplier</p>
                </div>
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Apex Clips</p>
                  <p className="text-black font-black text-xs">{runStats.apexClips} Hits</p>
                </div>
              </div>

              <button
                type="button"
                onClick={startGame}
                className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
                <span>RACE AGAIN</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen Overlay */}
        {isDead && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fadeIn z-20">
            <div className="relative bg-white border-4 border-black rounded-2xl p-4 sm:p-5 shadow-neo-xl w-full max-w-[300px] space-y-3 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div>
                <span className="inline-block px-3 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase tracking-wider shadow-neo-xs">
                  ⚡ VEHICLE TOTALED ⚡
                </span>
                <h3 className="text-2xl font-black text-black mt-1">Score: {score}</h3>
              </div>

              {/* Performance Stats Breakdown */}
              <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-[#FAF8F5] border-2 border-black text-[10px] text-slate-800 font-bold shadow-neo-xs">
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Max Combo</p>
                  <p className="text-black font-black text-xs">{runStats.maxCombo}X</p>
                </div>
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Apex Clips</p>
                  <p className="text-black font-black text-xs">{runStats.apexClips} Hits</p>
                </div>
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Longest Slide</p>
                  <p className="text-black font-black text-xs">{runStats.longestDrift}s</p>
                </div>
                <div className="p-1 text-left">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Distance</p>
                  <p className="text-black font-black text-xs">{runStats.distance}m</p>
                </div>
              </div>

              {/* Ad Revive Notice Alert */}
              {adNotice && (
                <div className="p-2 rounded-xl bg-portal-butter border-2 border-black text-black text-xs font-bold shadow-neo-xs animate-fadeIn">
                  <div className="flex items-center justify-center gap-1 mb-0.5 font-black text-[10px]">
                    <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>AD NETWORK NOTICE</span>
                  </div>
                  <p className="text-[10px] text-slate-800">{adNotice}</p>
                </div>
              )}

              {/* Emergency Revive Action */}
              <button
                type="button"
                onClick={handleWatchAdForRevive}
                disabled={hasRevived}
                className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl font-black text-xs border-3 border-black shadow-neo transition-all ${
                  hasRevived
                    ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-portal-butter hover:bg-portal-yellow text-black hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none'
                }`}
              >
                <Tv className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{hasRevived ? 'REVIVE USED (1/RUN)' : 'WATCH AD TO REVIVE'}</span>
              </button>

              <button
                type="button"
                onClick={startGame}
                className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
                <span>RESTART RUN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Touch Controls for Mobile Devices */}
      {isPlaying && (
        <div className="w-full mt-2.5 flex items-center justify-between px-1 gap-2 select-none">
          {/* Left & Right Steering Touch Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
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
              className="w-13 h-12 rounded-xl bg-white border-3 border-black text-black font-black text-base flex items-center justify-center shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all touch-none"
            >
              ◀
            </button>
            <button
              type="button"
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
              className="w-13 h-12 rounded-xl bg-white border-3 border-black text-black font-black text-base flex items-center justify-center shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all touch-none"
            >
              ▶
            </button>
          </div>

          {/* E-Brake & Nitro Touch Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
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
              className="px-3.5 h-12 rounded-xl bg-portal-pink border-3 border-black text-black font-black text-xs flex items-center justify-center gap-1 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all touch-none"
            >
              <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>DRIFT</span>
            </button>

            <button
              type="button"
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
              className="px-3.5 h-12 rounded-xl bg-portal-yellow border-3 border-black text-black font-black text-xs flex items-center justify-center gap-1 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all touch-none"
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>NITRO</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
