'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, Zap, Flame, Pause, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface CyberOutrunProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
}

// Particle pool item
interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'flame' | 'smoke' | 'spark' | 'debris';
}

// Floating notification badge (Near-Miss, Ram, Slipstream)
interface FloatingBanner {
  id: number;
  text: string;
  subText?: string;
  color: string;
  alpha: number;
  scale: number;
  life: number;
  maxLife: number;
}

// Asphalt Skid Mark
interface SkidMark {
  lx: number;
  rx: number;
  y: number;
  alpha: number;
  width: number;
}

// Traffic AI Entity
interface TrafficCar {
  id: number;
  lane: number; // 0, 1, 2, 3
  worldZ: number; // Distance in meters ahead/behind player
  xOffset: number; // Lateral offset [-1 to 1 across road]
  speedKmh: number;
  type: 'sedan' | 'truck' | 'speeder';
  color: string;
  bodyColor: string;
  accentColor: string;
  width: number;
  length: number;
  changingLane: boolean;
  targetLane: number;
  hasNearMissed: boolean;
  isBlownAway?: boolean;
  blowVx?: number;
  blowVy?: number;
  blowVz?: number;
  blowRot?: number;
  rot?: number;
}

const MAX_PARTICLES = 200;
const MAX_SKID_MARKS = 40;

export default function CyberOutrunGame({ onGameOver, onScoreUpdate }: CyberOutrunProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game UI State (Throttled for 60-120 FPS Rendering Performance)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [rpmRatio, setRpmRatio] = useState(0);
  const [nitroEnergy, setNitroEnergy] = useState(100);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isNitroActive, setIsNitroActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nearMissCount, setNearMissCount] = useState(0);

  // Internal Engine State Refs (60-120 FPS Non-blocking)
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isGameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const speedRef = useRef(0); // km/h
  const nitroRef = useRef(100);
  const nitroActiveRef = useRef(false);
  const multiplierRef = useRef(1);
  const multiplierTimerRef = useRef(0);
  const nearMissCountRef = useRef(0);
  const draftingRef = useRef(false);
  const draftTimerRef = useRef(0);
  const skidTimerRef = useRef(0);
  const screenShakeRef = useRef(0);

  // Dynamic Vehicle Kinematics & 3D Suspension Physics
  const playerXRef = useRef(0); // -1.0 (far left curb) to +1.0 (far right curb)
  const targetXRef = useRef(0);
  const playerBankRef = useRef(0); // chassis roll angle
  const chassisPitchRef = useRef(0); // vertical squat/dive
  const wheelSpinAngleRef = useRef(0); // rotating rim spokes angle
  const suspensionBounceRef = useRef(0); // dynamic road chatter
  const reflectionPhaseRef = useRef(0); // moving light reflections across glass

  // Input States
  const throttleInputRef = useRef(false);
  const brakeInputRef = useRef(false);
  const steerLeftInputRef = useRef(false);
  const steerRightInputRef = useRef(false);
  const isPointerSteeringRef = useRef(false);

  // Road Curve & Perspective
  const roadCurveRef = useRef(0);
  const targetCurveRef = useRef(0);
  const curveTimerRef = useRef(0);

  // Entities & Memory Pools
  const trafficRef = useRef<TrafficCar[]>([]);
  const particlesPoolRef = useRef<Particle[]>([]);
  const skidMarksRef = useRef<SkidMark[]>([]);
  const bannersRef = useRef<FloatingBanner[]>([]);
  const idGenRef = useRef(1);
  const lastFrameTimeRef = useRef(0);
  const lastUiSyncRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);

  // DPI / Screen Scaling
  const dprRef = useRef(1);
  const logicalSizeRef = useRef({ w: 800, h: 600 });

  // Procedural Web Audio Nodes Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const engineFilterRef = useRef<BiquadFilterNode | null>(null);
  const draftOscRef = useRef<OscillatorNode | null>(null);
  const draftGainRef = useRef<GainNode | null>(null);

  // Initialize Particle & Skid Pools
  useEffect(() => {
    const pool: Particle[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        color: '#00F0FF',
        alpha: 1,
        decay: 0.04,
        type: 'spark'
      });
    }
    particlesPoolRef.current = pool;
    skidMarksRef.current = [];
  }, []);

  // --------------------------------------------------------------------------
  // AUDIO SYNTHESIZER ENGINE (Zero Assets)
  // --------------------------------------------------------------------------
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const master = ctx.createGain();
      master.gain.value = isMuted ? 0 : 0.35;
      master.connect(ctx.destination);

      // 1. Dual Engine Synth (Sawtooth + Low-pass filter)
      const engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.setValueAtTime(55, ctx.currentTime);

      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.setValueAtTime(350, ctx.currentTime);

      const engineGain = ctx.createGain();
      engineGain.gain.setValueAtTime(0, ctx.currentTime);

      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();

      // 2. Slipstream Drafting Hum (Low Sub-Bass)
      const draftOsc = ctx.createOscillator();
      draftOsc.type = 'sine';
      draftOsc.frequency.setValueAtTime(62, ctx.currentTime);

      const draftGain = ctx.createGain();
      draftGain.gain.setValueAtTime(0, ctx.currentTime);

      draftOsc.connect(draftGain);
      draftGain.connect(master);
      draftOsc.start();

      audioCtxRef.current = ctx;
      masterGainRef.current = master;
      engineOscRef.current = engineOsc;
      engineGainRef.current = engineGain;
      engineFilterRef.current = engineFilter;
      draftOscRef.current = draftOsc;
      draftGainRef.current = draftGain;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }, [isMuted]);

  // Complete Audio Teardown to prevent background audio leaks on modal close
  const cleanupAudio = useCallback(() => {
    try {
      if (engineGainRef.current && audioCtxRef.current) {
        try {
          engineGainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
          engineGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        } catch {}
      }
      if (draftGainRef.current && audioCtxRef.current) {
        try {
          draftGainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
          draftGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        } catch {}
      }
      if (engineOscRef.current) {
        try {
          engineOscRef.current.stop();
          engineOscRef.current.disconnect();
        } catch {}
        engineOscRef.current = null;
      }
      if (draftOscRef.current) {
        try {
          draftOscRef.current.stop();
          draftOscRef.current.disconnect();
        } catch {}
        draftOscRef.current = null;
      }
      if (masterGainRef.current) {
        try {
          masterGainRef.current.disconnect();
        } catch {}
        masterGainRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close().catch(() => {});
        } catch {}
        audioCtxRef.current = null;
      }
    } catch {}
  }, []);

  // Unmount Teardown Hook
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Update Engine Pitch with Speed / RPM
  const updateEngineAudio = useCallback((speed: number, maxSpeed: number, isThrottle: boolean, isNitro: boolean) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !engineOscRef.current || !engineGainRef.current || !engineFilterRef.current) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const shouldPlay = isPlayingRef.current && !isGameOverRef.current && !isPausedRef.current && !isMuted;
    if (!shouldPlay) {
      try {
        engineGainRef.current.gain.setTargetAtTime(0, t, 0.04);
        if (draftGainRef.current) {
          draftGainRef.current.gain.setTargetAtTime(0, t, 0.04);
        }
      } catch {}
      return;
    }

    const ratio = Math.max(0, Math.min(1, speed / maxSpeed));
    // Dynamic Gear shifting emulation (6 virtual gears)
    const gearFraction = (ratio * 5) % 1;
    const baseFreq = isNitro ? 140 + gearFraction * 140 : 55 + gearFraction * 110 + ratio * 45;
    const filterFreq = isNitro ? 2400 : 350 + ratio * 1400;
    const targetVolume = isThrottle ? 0.22 : 0.12;

    engineOscRef.current.frequency.setTargetAtTime(baseFreq, t, 0.05);
    engineFilterRef.current.frequency.setTargetAtTime(filterFreq, t, 0.05);
    engineGainRef.current.gain.setTargetAtTime(targetVolume, t, 0.08);

    // Drafting hum
    if (draftGainRef.current) {
      const draftVol = draftingRef.current ? 0.28 : 0;
      draftGainRef.current.gain.setTargetAtTime(draftVol, t, 0.1);
    }
  }, [isMuted]);

  // Near Miss Doppler Sound Effect
  const playNearMissSound = useCallback((panValue: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current || isMuted) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.2);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 4.0;
      filter.frequency.setValueAtTime(panValue < 0 ? 900 : 1200, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      if (panner) {
        noise.connect(filter).connect(panner).connect(gain).connect(masterGainRef.current);
      } else {
        noise.connect(filter).connect(gain).connect(masterGainRef.current);
      }

      noise.start(now);
    } catch {
      // Audio fallback
    }
  }, [isMuted]);

  // Nitro Ignition Roar
  const playNitroSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current || isMuted) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.35);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(3200, now + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(filter).connect(gain).connect(masterGainRef.current);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Audio fallback
    }
  }, [isMuted]);

  // Crash Explosion Sound
  const playCrashSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current || isMuted) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.55);

      const bufferSize = Math.floor(ctx.sampleRate * 0.45);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

      osc.connect(gain);
      noise.connect(gain);
      gain.connect(masterGainRef.current);

      osc.start(now);
      noise.start(now);
      osc.stop(now + 0.55);
    } catch {
      // Audio fallback
    }
  }, [isMuted]);

  // Ram Shatter Sound
  const playRamShatterSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current || isMuted) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain).connect(masterGainRef.current);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio fallback
    }
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (masterGainRef.current) {
        masterGainRef.current.gain.value = next ? 0 : 0.35;
      }
      return next;
    });
  }, []);

  // Toggle Pause with Audio Mute
  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      if (next && engineGainRef.current && audioCtxRef.current) {
        try {
          engineGainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
          engineGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
          if (draftGainRef.current) {
            draftGainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
            draftGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
          }
        } catch {}
      }
      return next;
    });
  }, []);

  // --------------------------------------------------------------------------
  // SPAWNERS & ENTITY MANAGEMENT
  // --------------------------------------------------------------------------
  const spawnInitialTraffic = useCallback(() => {
    const list: TrafficCar[] = [];
    const colors = [
      { body: '#0E7490', accent: '#00F0FF' }, // Teal Sedan
      { body: '#4C1D95', accent: '#FF007F' }, // Purple Speeder
      { body: '#78350F', accent: '#FFE600' }, // Hauler Yellow
      { body: '#14532D', accent: '#39FF14' }, // Green Speeder
      { body: '#831843', accent: '#FF0055' }, // Crimson Sedan
    ];

    for (let i = 0; i < 7; i++) {
      const lane = Math.floor(Math.random() * 4);
      const isTruck = i % 3 === 0;
      const isSpeeder = !isTruck && Math.random() > 0.5;
      const palette = colors[i % colors.length];

      list.push({
        id: idGenRef.current++,
        lane,
        worldZ: 120 + i * 140 + Math.random() * 60,
        xOffset: (lane - 1.5) * 0.52,
        speedKmh: isTruck ? 85 + Math.random() * 20 : isSpeeder ? 190 + Math.random() * 40 : 130 + Math.random() * 30,
        type: isTruck ? 'truck' : isSpeeder ? 'speeder' : 'sedan',
        color: palette.accent,
        bodyColor: palette.body,
        accentColor: palette.accent,
        width: isTruck ? 54 : 38,
        length: isTruck ? 95 : 56,
        changingLane: false,
        targetLane: lane,
        hasNearMissed: false
      });
    }

    trafficRef.current = list;
    bannersRef.current = [];
    skidMarksRef.current = [];

    // Clear active particles in pool
    if (particlesPoolRef.current) {
      for (const p of particlesPoolRef.current) {
        p.active = false;
      }
    }
  }, []);

  // Recycle / Spawn New Traffic Car at Horizon
  const recycleCar = useCallback((car: TrafficCar) => {
    let maxZ = 800;
    for (const c of trafficRef.current) {
      if (c.worldZ > maxZ) maxZ = c.worldZ;
    }

    const lane = Math.floor(Math.random() * 4);
    const rand = Math.random();
    const isTruck = rand < 0.35;
    const isSpeeder = !isTruck && rand > 0.65;

    const colors = [
      { body: '#0E7490', accent: '#00F0FF' },
      { body: '#4C1D95', accent: '#FF007F' },
      { body: '#78350F', accent: '#FFE600' },
      { body: '#14532D', accent: '#39FF14' },
      { body: '#831843', accent: '#FF0055' }
    ];
    const palette = colors[Math.floor(Math.random() * colors.length)];

    car.lane = lane;
    car.worldZ = maxZ + 120 + Math.random() * 100;
    car.xOffset = (lane - 1.5) * 0.52;
    car.type = isTruck ? 'truck' : isSpeeder ? 'speeder' : 'sedan';
    car.speedKmh = isTruck ? 80 + Math.random() * 25 : isSpeeder ? 180 + Math.random() * 45 : 125 + Math.random() * 35;
    car.color = palette.accent;
    car.bodyColor = palette.body;
    car.accentColor = palette.accent;
    car.width = isTruck ? 54 : 38;
    car.length = isTruck ? 95 : 56;
    car.changingLane = false;
    car.targetLane = lane;
    car.hasNearMissed = false;
    car.isBlownAway = false;
    car.rot = 0;
  }, []);

  // Spawn Particle from pre-allocated object pool
  const spawnParticle = useCallback((opts: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    size?: number;
    color?: string;
    decay?: number;
    type?: 'flame' | 'smoke' | 'spark' | 'debris';
  }) => {
    const pool = particlesPoolRef.current;
    if (!pool || pool.length === 0) return;

    let pt: Particle | null = null;
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].active) {
        pt = pool[i];
        break;
      }
    }
    if (!pt) pt = pool[0];

    pt.active = true;
    pt.x = opts.x;
    pt.y = opts.y;
    pt.vx = opts.vx ?? (Math.random() - 0.5) * 4;
    pt.vy = opts.vy ?? (Math.random() - 0.5) * 4;
    pt.size = opts.size ?? (3 + Math.random() * 4);
    pt.color = opts.color ?? '#00F0FF';
    pt.alpha = 1.0;
    pt.decay = opts.decay ?? 0.04;
    pt.type = opts.type ?? 'spark';
  }, []);

  // Add Notification Banner
  const addBanner = useCallback((text: string, subText: string, color = '#FFE600') => {
    bannersRef.current.push({
      id: idGenRef.current++,
      text,
      subText,
      color,
      alpha: 1.0,
      scale: 1.3,
      life: 0,
      maxLife: 60
    });
    if (bannersRef.current.length > 5) bannersRef.current.shift();
  }, []);

  // --------------------------------------------------------------------------
  // GAME START / REBOOT / GAME OVER
  // --------------------------------------------------------------------------
  const startGame = useCallback(() => {
    initAudio();
    setIsPlaying(true);
    setIsPaused(false);
    setIsGameOver(false);
    isPlayingRef.current = true;
    isPausedRef.current = false;
    isGameOverRef.current = false;

    scoreRef.current = 0;
    distanceRef.current = 0;
    speedRef.current = 80;
    nitroRef.current = 100;
    nitroActiveRef.current = false;
    multiplierRef.current = 1;
    multiplierTimerRef.current = 0;
    nearMissCountRef.current = 0;
    draftingRef.current = false;
    draftTimerRef.current = 0;
    playerXRef.current = 0;
    targetXRef.current = 0;
    playerBankRef.current = 0;
    chassisPitchRef.current = 0;
    roadCurveRef.current = 0;
    targetCurveRef.current = 0;
    screenShakeRef.current = 0;
    lastFrameTimeRef.current = performance.now();
    lastUiSyncRef.current = performance.now();

    throttleInputRef.current = true; // Auto-engage throttle on start
    brakeInputRef.current = false;
    steerLeftInputRef.current = false;
    steerRightInputRef.current = false;
    isPointerSteeringRef.current = false;

    setScore(0);
    setDistanceMeters(0);
    setSpeedKmh(80);
    setNitroEnergy(100);
    setMultiplier(1);
    setIsDrafting(false);
    setIsNitroActive(false);
    setNearMissCount(0);

    spawnInitialTraffic();
  }, [initAudio, spawnInitialTraffic]);

  const handleGameOver = useCallback(() => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    isPlayingRef.current = false;
    setIsGameOver(true);
    setIsPlaying(false);

    // Immediately silence ongoing engine and drafting tones
    if (engineGainRef.current && audioCtxRef.current) {
      try {
        engineGainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        engineGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      } catch {}
    }
    if (draftGainRef.current && audioCtxRef.current) {
      try {
        draftGainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        draftGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      } catch {}
    }

    playCrashSound();
    screenShakeRef.current = 28;

    const finalScore = scoreRef.current;
    if (onGameOver) onGameOver(finalScore);

    // Save High Score
    try {
      const saved = localStorage.getItem('break_hub_outrun_high');
      const currentHigh = saved ? parseInt(saved, 10) : 0;
      if (finalScore > currentHigh) {
        localStorage.setItem('break_hub_outrun_high', finalScore.toString());
      }
    } catch {
      // Ignore
    }

    // Spawn massive crash particle burst
    const { w: W, h: H } = logicalSizeRef.current;
    for (let i = 0; i < 45; i++) {
      spawnParticle({
        x: W * 0.5 + playerXRef.current * 120,
        y: H * 0.86,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 18,
        color: Math.random() > 0.5 ? '#FF0055' : '#FFE600',
        size: 4 + Math.random() * 6,
        decay: 0.025,
        type: 'debris'
      });
    }
  }, [onGameOver, playCrashSound, spawnParticle]);

  // Activate Nitro Hyper Overdrive
  const activateNitro = useCallback(() => {
    if (nitroRef.current < 15 || nitroActiveRef.current || !isPlayingRef.current || isGameOverRef.current) return;
    nitroActiveRef.current = true;
    setIsNitroActive(true);
    playNitroSound();
    screenShakeRef.current = 6;

    addBanner('⚡ NITRO OVERDRIVE! ⚡', 'INVULNERABLE RAM SHIELD ENGAGED', '#00F0FF');
  }, [addBanner, playNitroSound]);

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // --------------------------------------------------------------------------
  // POINTER & TOUCH CANVAS DRAG STEERING
  // --------------------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlayingRef.current) return;
    isPointerSteeringRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const normalizedX = (e.clientX - rect.left) / rect.width;
    targetXRef.current = Math.max(-0.95, Math.min(0.95, (normalizedX - 0.5) * 2.2));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerSteeringRef.current || !isPlayingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normalizedX = (e.clientX - rect.left) / rect.width;
    targetXRef.current = Math.max(-0.95, Math.min(0.95, (normalizedX - 0.5) * 2.2));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerSteeringRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  // --------------------------------------------------------------------------
  // KEYBOARD CONTROLS HOOK
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (k === 'a' || e.key === 'ArrowLeft') steerLeftInputRef.current = true;
      if (k === 'd' || e.key === 'ArrowRight') steerRightInputRef.current = true;
      if (k === 'w' || e.key === 'ArrowUp') throttleInputRef.current = true;
      if (k === 's' || e.key === 'ArrowDown') brakeInputRef.current = true;

      if (e.key === 'Shift' || e.key === ' ' || k === 'space') activateNitro();
      if (k === 'r') startGame();
      if (k === 'f') toggleFullscreen();
      if (k === 'm') toggleMute();
      if (k === 'p') togglePause();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft') steerLeftInputRef.current = false;
      if (k === 'd' || e.key === 'ArrowRight') steerRightInputRef.current = false;
      if (k === 'w' || e.key === 'ArrowUp') throttleInputRef.current = false;
      if (k === 's' || e.key === 'ArrowDown') brakeInputRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activateNitro, startGame, toggleFullscreen, toggleMute, togglePause]);

  // --------------------------------------------------------------------------
  // MAIN GAME LOOP (60-120 FPS High-Performance Engine)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.064) || 0.016;
      lastFrameTimeRef.current = timestamp;

      const dpr = dprRef.current;
      const { w: W, h: H } = logicalSizeRef.current;

      // 1. UPDATE GAME PHYSICS & DYNAMIC SUSPENSION KINEMATICS
      if (isPlayingRef.current && !isPausedRef.current && !isGameOverRef.current) {
        // --- Speed Dynamics ---
        const isNitro = nitroActiveRef.current;
        const maxBaseSpeed = draftingRef.current ? 260 : 220;
        const maxSpeed = isNitro ? 360 : maxBaseSpeed;
        const accelRate = isNitro ? 160 : throttleInputRef.current ? 75 : 0;
        const decelRate = brakeInputRef.current ? 180 : 35;

        if (throttleInputRef.current || isNitro) {
          speedRef.current = Math.min(maxSpeed, speedRef.current + accelRate * dt);
        } else if (brakeInputRef.current) {
          speedRef.current = Math.max(0, speedRef.current - decelRate * dt);
        } else {
          speedRef.current = Math.max(30, speedRef.current - decelRate * 0.4 * dt);
        }

        // --- Rotating Wheel Spokes & Asphalt Chatter ---
        wheelSpinAngleRef.current = (wheelSpinAngleRef.current + (speedRef.current * dt * 0.38)) % (Math.PI * 2);
        reflectionPhaseRef.current = (reflectionPhaseRef.current + (speedRef.current * dt * 0.08)) % 200;

        // Realistic Road Vibration & Suspension Harmonics
        suspensionBounceRef.current = Math.sin(distanceRef.current * 0.5) * Math.min(2.8, speedRef.current * 0.014) +
          (Math.random() - 0.5) * (speedRef.current > 200 ? 1.4 : 0.5);

        // Chassis Pitch: Squat on Nitro/Acceleration, Dive on Braking
        const targetPitch = isNitro ? -4.5 : throttleInputRef.current ? -2.5 : brakeInputRef.current ? 4.0 : 0;
        chassisPitchRef.current += (targetPitch - chassisPitchRef.current) * 10 * dt;

        // --- Nitro Energy Consumption / Regeneration ---
        if (isNitro) {
          nitroRef.current = Math.max(0, nitroRef.current - 28 * dt);
          if (nitroRef.current <= 0) {
            nitroActiveRef.current = false;
            setIsNitroActive(false);
          }
        } else {
          if (speedRef.current > 160) {
            nitroRef.current = Math.min(100, nitroRef.current + 3.5 * dt);
          }
        }

        // --- Distance & Score Update ---
        const distDelta = (speedRef.current / 3.6) * dt; // meters
        distanceRef.current += distDelta;

        const scoreGain = Math.round((speedRef.current * 0.15 + (draftingRef.current ? 35 : 0)) * multiplierRef.current * dt);
        scoreRef.current += scoreGain;

        // --- Combo Multiplier Decay ---
        if (multiplierRef.current > 1) {
          multiplierTimerRef.current = Math.max(0, multiplierTimerRef.current - dt);
          if (multiplierTimerRef.current <= 0) {
            multiplierRef.current = 1;
            setMultiplier(1);
          }
        }

        // --- Steering & Dynamic Chassis Lean ---
        let steerDir = 0;
        if (!isPointerSteeringRef.current) {
          let steerSpeed = 1.4 * (speedRef.current / 180 + 0.35);
          if (skidTimerRef.current > 0) {
            skidTimerRef.current -= dt;
            steerSpeed *= 0.3;
          }

          if (steerLeftInputRef.current) steerDir -= 1;
          if (steerRightInputRef.current) steerDir += 1;

          targetXRef.current += steerDir * steerSpeed * dt;
          targetXRef.current = Math.max(-0.95, Math.min(0.95, targetXRef.current));
        } else {
          const deltaSteer = targetXRef.current - playerXRef.current;
          steerDir = Math.max(-1, Math.min(1, deltaSteer * 4));
        }

        // Smooth interpolation towards target lateral position
        playerXRef.current += (targetXRef.current - playerXRef.current) * 12 * dt;

        // Chassis Dynamic Roll Angle (Inertial body banking)
        const targetBank = steerDir * 0.18;
        playerBankRef.current += (targetBank - playerBankRef.current) * 14 * dt;

        // --- Road Curvature Dynamics ---
        curveTimerRef.current += dt;
        if (curveTimerRef.current > 4.5) {
          curveTimerRef.current = 0;
          targetCurveRef.current = (Math.random() - 0.5) * 1.8;
        }
        roadCurveRef.current += (targetCurveRef.current - roadCurveRef.current) * 0.6 * dt;

        // --- Audio Hook ---
        updateEngineAudio(speedRef.current, maxSpeed, throttleInputRef.current, isNitro);

        // --- Screen Shake Decay ---
        if (screenShakeRef.current > 0) {
          screenShakeRef.current = Math.max(0, screenShakeRef.current - 24 * dt);
        }

        // --- Tire Friction Sparks, Smoke & Skid Marks ---
        const playerScreenX = W * (0.5 + playerXRef.current * 0.36);
        const playerScreenY = H * 0.86 + suspensionBounceRef.current + chassisPitchRef.current;

        const isHardSteer = Math.abs(playerBankRef.current) > 0.08 && speedRef.current > 120;
        const isHardBrake = brakeInputRef.current && speedRef.current > 100;

        if (isHardSteer || isHardBrake) {
          // Record asphalt rubber skid marks
          if (skidMarksRef.current.length < MAX_SKID_MARKS) {
            skidMarksRef.current.push({
              lx: playerScreenX - 44,
              rx: playerScreenX + 44,
              y: playerScreenY + 28,
              alpha: 0.6,
              width: 10
            });
          }

          // Tire friction smoke/sparks
          if (Math.random() < 0.6) {
            spawnParticle({
              x: playerScreenX + (playerBankRef.current > 0 ? -45 : 45) + (Math.random() - 0.5) * 6,
              y: playerScreenY + 28,
              vx: (Math.random() - 0.5) * 6,
              vy: 2 + Math.random() * 4,
              color: Math.random() > 0.4 ? '#00F0FF' : '#FFE600',
              size: 2.5,
              decay: 0.06,
              type: 'spark'
            });
          }
        }

        // --- Player Exhaust Flame & Smoke Particles ---
        if (Math.random() < (isNitro ? 0.95 : 0.45)) {
          // Left thruster flame
          spawnParticle({
            x: playerScreenX - 30 + (Math.random() - 0.5) * 4,
            y: playerScreenY + 30,
            vx: (Math.random() - 0.5) * 3,
            vy: 8 + Math.random() * 8,
            color: isNitro ? '#00F0FF' : Math.random() > 0.4 ? '#FF007F' : '#FFE600',
            size: isNitro ? 4.5 : 2.8,
            decay: isNitro ? 0.05 : 0.07,
            type: 'flame'
          });
          // Right thruster flame
          spawnParticle({
            x: playerScreenX + 30 + (Math.random() - 0.5) * 4,
            y: playerScreenY + 30,
            vx: (Math.random() - 0.5) * 3,
            vy: 8 + Math.random() * 8,
            color: isNitro ? '#00F0FF' : Math.random() > 0.4 ? '#FF007F' : '#FFE600',
            size: isNitro ? 4.5 : 2.8,
            decay: isNitro ? 0.05 : 0.07,
            type: 'flame'
          });
        }

        // --- Traffic AI Physics & Collision Detection ---
        let draftingFound = false;

        for (const car of trafficRef.current) {
          if (car.isBlownAway) {
            car.worldZ += (car.blowVz || 0) * dt;
            car.xOffset += (car.blowVx || 0) * dt;
            car.rot = (car.rot || 0) + (car.blowRot || 0) * dt;
            if (car.worldZ < -100 || car.worldZ > 1200) recycleCar(car);
            continue;
          }

          const relSpeedMs = (speedRef.current - car.speedKmh) / 3.6;
          car.worldZ -= relSpeedMs * dt * 2.8;

          const targetOffset = (car.lane - 1.5) * 0.52;
          car.xOffset += (targetOffset - car.xOffset) * 4.0 * dt;

          if (car.type === 'speeder' && !car.changingLane && Math.random() < 0.008) {
            car.changingLane = true;
            const dir = Math.random() > 0.5 ? 1 : -1;
            car.lane = Math.max(0, Math.min(3, car.lane + dir));
          }

          // Slipstream Drafting Behind Heavy Hauler Trucks
          if (car.type === 'truck' && car.worldZ > 20 && car.worldZ < 95) {
            const latDist = Math.abs(playerXRef.current - car.xOffset);
            if (latDist < 0.22) {
              draftingFound = true;
              draftTimerRef.current += dt;
              if (Math.random() < 0.4) {
                spawnParticle({
                  x: W * (0.5 + car.xOffset * 0.36) + (Math.random() - 0.5) * 40,
                  y: H * 0.75,
                  vx: (playerXRef.current - car.xOffset) * 10,
                  vy: 12 + Math.random() * 8,
                  color: '#00F0FF',
                  size: 2,
                  decay: 0.05,
                  type: 'spark'
                });
              }
            }
          }

          // Collision & Near-Miss Detection at Player Plane (worldZ ~ 0)
          if (car.worldZ > -15 && car.worldZ < 30) {
            const latDist = Math.abs(playerXRef.current - car.xOffset);

            if (latDist < 0.24) {
              if (isNitro) {
                // Invulnerable Ramming Shield! Smashes traffic vehicle
                car.isBlownAway = true;
                car.blowVx = (playerXRef.current > car.xOffset ? -1 : 1) * (1.8 + Math.random() * 2);
                car.blowVy = -8;
                car.blowVz = 120;
                car.blowRot = 6 + Math.random() * 6;

                playRamShatterSound();
                screenShakeRef.current = 14;

                const earned = 1000 * multiplierRef.current;
                scoreRef.current += earned;
                addBanner('💥 RAM SHATTER! +1000', `MULTIPLIER x${multiplierRef.current}`, '#FF0055');

                for (let k = 0; k < 20; k++) {
                  spawnParticle({
                    x: W * (0.5 + car.xOffset * 0.36),
                    y: H * 0.82,
                    vx: (Math.random() - 0.5) * 16,
                    vy: (Math.random() - 0.5) * 16,
                    color: Math.random() > 0.5 ? '#FFE600' : '#FF0055',
                    size: 3 + Math.random() * 4,
                    decay: 0.04,
                    type: 'debris'
                  });
                }
              } else {
                handleGameOver();
                break;
              }
            } else if (latDist >= 0.24 && latDist < 0.44 && !car.hasNearMissed && speedRef.current > car.speedKmh + 30) {
              car.hasNearMissed = true;
              nearMissCountRef.current += 1;

              multiplierRef.current = Math.min(8, multiplierRef.current + 1);
              multiplierTimerRef.current = 5.0;

              nitroRef.current = Math.min(100, nitroRef.current + 22);

              const bonus = 250 * multiplierRef.current;
              scoreRef.current += bonus;

              const pan = (car.xOffset - playerXRef.current) * 2;
              playNearMissSound(pan);
              addBanner(`⚡ NEAR MISS! +${bonus}`, `COMBO MULTIPLIER x${multiplierRef.current}`, '#FFE600');
            }
          }

          if (car.worldZ < -80) {
            recycleCar(car);
          }
        }

        draftingRef.current = draftingFound;

        // Throttled UI State Dispatch (Runs at ~12-15 Hz to eliminate React re-render bottleneck)
        if (timestamp - lastUiSyncRef.current > 75) {
          lastUiSyncRef.current = timestamp;
          setScore(scoreRef.current);
          setDistanceMeters(Math.floor(distanceRef.current));
          setSpeedKmh(Math.floor(speedRef.current));
          setRpmRatio(speedRef.current / maxSpeed);
          setNitroEnergy(Math.floor(nitroRef.current));
          setMultiplier(multiplierRef.current);
          setIsDrafting(draftingFound);
          setNearMissCount(nearMissCountRef.current);

          if (onScoreUpdate) onScoreUpdate(scoreRef.current);
        }
      }

      // ----------------------------------------------------------------------
      // 2. HIGH-DPI HARDWARE-ACCELERATED RENDER PIPELINE
      // ----------------------------------------------------------------------
      ctx.save();
      ctx.scale(dpr, dpr);

      // Screen Shake
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
      }

      // Synthwave Twilight Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
      skyGrad.addColorStop(0, '#020014');
      skyGrad.addColorStop(0.5, '#160438');
      skyGrad.addColorStop(0.85, '#4a0e4e');
      skyGrad.addColorStop(1, '#7928ca');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Distant Synthwave Sun
      const sunCenterX = W * 0.5 + roadCurveRef.current * 40;
      const sunCenterY = H * 0.32;
      const sunRadius = Math.min(W, H) * 0.16;

      const sunGrad = ctx.createLinearGradient(0, sunCenterY - sunRadius, 0, sunCenterY + sunRadius);
      sunGrad.addColorStop(0, '#FFE600');
      sunGrad.addColorStop(0.4, '#FF5E00');
      sunGrad.addColorStop(0.8, '#FF007F');
      sunGrad.addColorStop(1, '#7928ca');

      ctx.save();
      ctx.beginPath();
      ctx.arc(sunCenterX, sunCenterY, sunRadius, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.fill();

      // Sun Horizontal Slices (Blinds)
      ctx.fillStyle = '#160438';
      for (let s = 1; s <= 6; s++) {
        const sliceY = sunCenterY - sunRadius * 0.1 + (s * sunRadius * 0.28) - 10;
        const sliceH = s * 1.6;
        ctx.fillRect(sunCenterX - sunRadius, sliceY, sunRadius * 2, sliceH);
      }
      ctx.restore();

      // Parallax Cyber Skyline Silhouettes
      const horizonY = H * 0.38;
      const skylineOffset = (distanceRef.current * 0.04) % 120;
      ctx.fillStyle = '#0a0118';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let bx = -120; bx < W + 120; bx += 50) {
        const buildingX = bx - skylineOffset;
        const buildingW = 42;
        const buildingH = 35 + ((Math.abs(Math.sin(bx * 0.1)) * 65) % 65);
        ctx.lineTo(buildingX, horizonY - buildingH);
        ctx.lineTo(buildingX + buildingW, horizonY - buildingH);
        ctx.lineTo(buildingX + buildingW, horizonY);
      }
      ctx.lineTo(W, horizonY);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();

      // Skyline Window Beacon Dots
      ctx.fillStyle = '#FFE600';
      for (let bx = -120; bx < W + 120; bx += 100) {
        const buildingX = bx - skylineOffset;
        const buildingH = 45 + ((Math.abs(Math.sin(bx * 0.1)) * 65) % 65);
        if ((bx / 100) % 2 === 0) {
          ctx.fillRect(buildingX + 15, horizonY - buildingH - 12, 2, 12);
          ctx.beginPath();
          ctx.arc(buildingX + 16, horizonY - buildingH - 14, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ground Perspective Grid Floors
      const roadTopW = W * 0.08;
      const roadBottomW = W * 0.84;
      const roadBottomY = H * 0.98;

      // 3. PERSPECTIVE ROAD SEGMENTS RENDERING
      const segmentsCount = 26;
      const speedOffset = (distanceRef.current * 0.3) % 1;

      for (let i = segmentsCount - 1; i >= 0; i--) {
        const t1 = (i + speedOffset) / segmentsCount;
        const t2 = (i + 1 + speedOffset) / segmentsCount;

        if (t1 > 1.0) continue;

        const p1 = Math.pow(Math.max(0, t1), 2.2);
        const p2 = Math.pow(Math.min(1, t2), 2.2);

        const y1 = horizonY + (roadBottomY - horizonY) * p1;
        const y2 = horizonY + (roadBottomY - horizonY) * p2;

        const curve1 = roadCurveRef.current * (1 - p1) * 80;
        const curve2 = roadCurveRef.current * (1 - p2) * 80;

        const w1 = roadTopW + (roadBottomW - roadTopW) * p1;
        const w2 = roadTopW + (roadBottomW - roadTopW) * p2;

        const cx1 = W * 0.5 + curve1;
        const cx2 = W * 0.5 + curve2;

        const isEven = (Math.floor((distanceRef.current * 0.3) + i)) % 2 === 0;

        // Road Surface Polygon
        ctx.fillStyle = isEven ? '#0c0422' : '#060214';
        ctx.beginPath();
        ctx.moveTo(cx1 - w1 * 0.5, y1);
        ctx.lineTo(cx1 + w1 * 0.5, y1);
        ctx.lineTo(cx2 + w2 * 0.5, y2);
        ctx.lineTo(cx2 - w2 * 0.5, y2);
        ctx.fill();

        // Neon Glowing Guardrails (Cyan edge strips)
        ctx.fillStyle = isEven ? '#00F0FF' : '#0284C7';
        const curbW1 = 8 * p1;
        const curbW2 = 8 * p2;

        // Left Guardrail
        ctx.beginPath();
        ctx.moveTo(cx1 - w1 * 0.5 - curbW1, y1);
        ctx.lineTo(cx1 - w1 * 0.5, y1);
        ctx.lineTo(cx2 - w2 * 0.5, y2);
        ctx.lineTo(cx2 - w2 * 0.5 - curbW2, y2);
        ctx.fill();

        // Right Guardrail
        ctx.beginPath();
        ctx.moveTo(cx1 + w1 * 0.5, y1);
        ctx.lineTo(cx1 + w1 * 0.5 + curbW1, y1);
        ctx.lineTo(cx2 + w2 * 0.5 + curbW2, y2);
        ctx.lineTo(cx2 + w2 * 0.5, y2);
        ctx.fill();

        // 4 Lanes (3 Dashed Neon Lane Divider Lines)
        if (isEven) {
          for (let l = 1; l <= 3; l++) {
            const laneFrac = l / 4;
            const lx1 = cx1 - w1 * 0.5 + w1 * laneFrac;
            const lx2 = cx2 - w2 * 0.5 + w2 * laneFrac;
            const lineWidth = (l === 2 ? 3.5 : 2.0) * p1;

            ctx.strokeStyle = l === 2 ? '#00F0FF' : '#FFE600';
            ctx.lineWidth = Math.max(1, lineWidth);
            ctx.beginPath();
            ctx.moveTo(lx1, y1);
            ctx.lineTo(lx2, y2);
            ctx.stroke();
          }
        }
      }

      // 4. ASPHALT RUBBER SKID MARKS RENDERING
      const skids = skidMarksRef.current;
      for (let sm = skids.length - 1; sm >= 0; sm--) {
        const mark = skids[sm];
        mark.y += (speedRef.current / 30) * 1.5;
        mark.alpha -= 0.015;

        if (mark.alpha <= 0 || mark.y > H + 50) {
          skids.splice(sm, 1);
          continue;
        }

        ctx.fillStyle = `rgba(0, 240, 255, ${mark.alpha * 0.35})`;
        ctx.fillRect(mark.lx - mark.width * 0.5, mark.y, mark.width, 10);
        ctx.fillRect(mark.rx - mark.width * 0.5, mark.y, mark.width, 10);
      }

      // 5. DEPTH-SORTED TRAFFIC RENDERING
      const trafficList = trafficRef.current;
      for (let i = 0; i < trafficList.length - 1; i++) {
        for (let j = i + 1; j < trafficList.length; j++) {
          if (trafficList[i].worldZ < trafficList[j].worldZ) {
            const temp = trafficList[i];
            trafficList[i] = trafficList[j];
            trafficList[j] = temp;
          }
        }
      }

      for (const car of trafficList) {
        if (car.worldZ < -15 || car.worldZ > 750) continue;

        const t = Math.max(0, Math.min(1, 1 - (car.worldZ / 750)));
        const p = Math.pow(t, 2.2);

        const roadY = horizonY + (roadBottomY - horizonY) * p;
        const roadW = roadTopW + (roadBottomW - roadTopW) * p;
        const roadCenter = W * 0.5 + roadCurveRef.current * (1 - p) * 80;

        const carX = roadCenter + (car.xOffset * roadW * 0.5);
        const carY = roadY;
        const carScale = Math.max(0.12, p * 1.25);

        ctx.save();
        ctx.translate(carX, carY);
        ctx.scale(carScale, carScale);

        if (car.rot) ctx.rotate(car.rot);

        // Draw Car Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, 8, car.width * 0.65, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        if (car.type === 'truck') {
          // Heavy Hauler Truck Render
          if (t > 0.4) {
            ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
            ctx.beginPath();
            ctx.moveTo(-car.width * 0.4, 0);
            ctx.lineTo(car.width * 0.4, 0);
            ctx.lineTo(car.width * 0.75, 90);
            ctx.lineTo(-car.width * 0.75, 90);
            ctx.fill();
          }

          // Truck Cargo Container
          ctx.fillStyle = car.bodyColor;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.fillRect(-car.width * 0.5, -car.length * 0.7, car.width, car.length * 0.7);
          ctx.strokeRect(-car.width * 0.5, -car.length * 0.7, car.width, car.length * 0.7);

          // Yellow Hazard Stripes on rear
          ctx.fillStyle = '#FFE600';
          ctx.fillRect(-car.width * 0.45, -car.length * 0.15, car.width * 0.9, 12);
          ctx.fillStyle = '#000000';
          for (let zx = -car.width * 0.4; zx < car.width * 0.4; zx += 12) {
            ctx.fillRect(zx, -car.length * 0.15, 6, 12);
          }

          // Rear Heavy Dual Tires
          ctx.fillStyle = '#0a0a0f';
          ctx.fillRect(-car.width * 0.55, -12, 8, 22);
          ctx.fillRect(car.width * 0.55 - 8, -12, 8, 22);

          // Rear Brake Lights
          ctx.fillStyle = '#FF0055';
          ctx.fillRect(-car.width * 0.45, -6, 12, 8);
          ctx.fillRect(car.width * 0.45 - 12, -6, 12, 8);
        } else {
          // Sedan / Speeder Car Render
          // Wheels
          ctx.fillStyle = '#0b0c14';
          ctx.fillRect(-car.width * 0.54, -car.length * 0.2, 6, 16);
          ctx.fillRect(car.width * 0.54 - 6, -car.length * 0.2, 6, 16);

          ctx.fillStyle = car.bodyColor;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-car.width * 0.5, -car.length * 0.5, car.width, car.length, 6);
          ctx.fill();
          ctx.stroke();

          // Cockpit Roof
          ctx.fillStyle = '#020014';
          ctx.fillRect(-car.width * 0.35, -car.length * 0.3, car.width * 0.7, car.length * 0.4);

          // Rear LED Lightbar
          ctx.fillStyle = car.accentColor;
          ctx.fillRect(-car.width * 0.4, car.length * 0.35, car.width * 0.8, 5);
        }

        ctx.restore();
      }

      // ----------------------------------------------------------------------
      // 6. MULTI-LAYER 3D VECTOR SUPERCAR WITH SUSPENSION DYNAMICS
      // ----------------------------------------------------------------------
      const playerX = W * (0.5 + playerXRef.current * 0.36);
      const playerY = H * 0.86 + suspensionBounceRef.current + chassisPitchRef.current;
      const isNitro = nitroActiveRef.current;
      const rollAngle = playerBankRef.current;
      const yawOffset = rollAngle * 28; // Dynamic 3D perspective side facet offset
      const isBraking = brakeInputRef.current;

      ctx.save();
      ctx.translate(playerX, playerY);

      // (A) ASPHALT CONTACT PATCH SHADOW & ROAD REFLECTIONS
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.ellipse(0, 28, 64, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // (B) NEON UNDERGLOW ILLUMINATION (Ground Projection)
      const underglowGrad = ctx.createRadialGradient(0, 20, 10, 0, 20, 85);
      underglowGrad.addColorStop(0, isNitro ? 'rgba(0, 240, 255, 0.85)' : 'rgba(0, 240, 255, 0.45)');
      underglowGrad.addColorStop(0.6, isNitro ? 'rgba(255, 0, 127, 0.5)' : 'rgba(147, 51, 234, 0.25)');
      underglowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = underglowGrad;
      ctx.beginPath();
      ctx.ellipse(0, 22, 85, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // (C) NITRO INVULNERABILITY RAM SHIELD SPHERE
      if (isNitro) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 75, 52, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 230, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 68, 46, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // (D) ROTATING WIDE REAR TIRES (Deep Rubber + Neon Rim Spokes)
      const renderTire = (side: -1 | 1) => {
        const tireX = side * 50 - yawOffset * 0.4;
        const tireY = 16 - (side * rollAngle * 12);
        const tireW = 16;
        const tireH = 34;

        ctx.save();
        ctx.translate(tireX, tireY);

        // Dark Rubber Body
        ctx.fillStyle = '#07080e';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-tireW * 0.5, -tireH * 0.5, tireW, tireH, 4);
        ctx.fill();
        ctx.stroke();

        // Tire Rubber Treads (Scrolling with wheel spin)
        ctx.strokeStyle = '#1a1c29';
        ctx.lineWidth = 1.5;
        for (let tr = -12; tr <= 12; tr += 6) {
          const treadY = ((tr + (wheelSpinAngleRef.current * 4)) % 24) - 12;
          ctx.beginPath();
          ctx.moveTo(-tireW * 0.45, treadY);
          ctx.lineTo(tireW * 0.45, treadY);
          ctx.stroke();
        }

        // Glowing Neon Hub Rim Center
        ctx.fillStyle = isNitro ? '#00F0FF' : '#FFE600';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Draw Tires
      renderTire(-1); // Left Tire
      renderTire(1);  // Right Tire

      // (E) 3D PERSPECTIVE BODY SHELL (With Roll Banking & Yaw Shearing)
      ctx.save();
      ctx.rotate(rollAngle);

      // (1) 3D Perspective Side Quarter Panel (Reveals when turning)
      if (Math.abs(yawOffset) > 2) {
        const isLeftTurn = yawOffset < 0;
        ctx.fillStyle = '#0f101d';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        if (isLeftTurn) {
          // Right Quarter Panel visible
          ctx.moveTo(52, 28);
          ctx.lineTo(52 - yawOffset * 0.8, -12);
          ctx.lineTo(44 - yawOffset * 0.6, -34);
          ctx.lineTo(32, -34);
          ctx.lineTo(46, -6);
          ctx.lineTo(52, 28);
        } else {
          // Left Quarter Panel visible
          ctx.moveTo(-52, 28);
          ctx.lineTo(-52 - yawOffset * 0.8, -12);
          ctx.lineTo(-44 - yawOffset * 0.6, -34);
          ctx.lineTo(-32, -34);
          ctx.lineTo(-46, -6);
          ctx.lineTo(-52, 28);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // (2) Rear Carbon Aerodynamic Diffuser & Fins
      ctx.fillStyle = '#06060c';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-54, 30);
      ctx.lineTo(54, 30);
      ctx.lineTo(44, 42);
      ctx.lineTo(-44, 42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Diffuser Strakes (Vertical aerodynamic fins)
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      for (const fx of [-36, -14, 14, 36]) {
        ctx.beginPath();
        ctx.moveTo(fx - yawOffset * 0.2, 30);
        ctx.lineTo(fx - yawOffset * 0.3, 42);
        ctx.stroke();
      }

      // (3) Dual Cylindrical Exhaust Afterburners
      const renderExhaustThruster = (exX: number) => {
        const exY = 32;
        // Outer Metallic Exhaust Bell
        ctx.fillStyle = '#14141f';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(exX, exY, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Exhaust Core (Orange / Cyan heat glow)
        ctx.fillStyle = isNitro ? '#00F0FF' : '#FF5E00';
        ctx.beginPath();
        ctx.ellipse(exX, exY, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(exX, exY, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      };

      renderExhaustThruster(-28 - yawOffset * 0.1);
      renderExhaustThruster(28 - yawOffset * 0.1);

      // (4) Main Wedge Supercar Rear Body Panels
      const carBodyGrad = ctx.createLinearGradient(-60, 0, 60, 0);
      carBodyGrad.addColorStop(0, '#111221');
      carBodyGrad.addColorStop(0.5, '#25273d');
      carBodyGrad.addColorStop(1, '#111221');

      ctx.fillStyle = carBodyGrad;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-60, 10);
      ctx.lineTo(-50, 30);
      ctx.lineTo(50, 30);
      ctx.lineTo(60, 10);
      ctx.lineTo(46, -8);
      ctx.lineTo(-46, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cyber Neon Body Trim Lines (Contour Grooves)
      ctx.strokeStyle = isNitro ? '#00F0FF' : '#38BDF8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-52, 12);
      ctx.lineTo(-24, 2);
      ctx.moveTo(52, 12);
      ctx.lineTo(24, 2);
      ctx.stroke();

      // (5) Active Aerodynamic Rear Wing / Spoiler
      const spoilerTilt = isBraking ? -8 : isNitro ? 2 : 0;
      ctx.save();
      ctx.translate(0, -18 + spoilerTilt);

      // Dual Strut Mounts
      ctx.fillStyle = '#080811';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(-34, 0, 6, 12);
      ctx.fillRect(28, 0, 6, 12);

      // Carbon Wing Blade
      ctx.fillStyle = '#0b0c16';
      ctx.strokeStyle = isBraking ? '#FF0055' : isNitro ? '#00F0FF' : '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-66, -6, 132, 10, 3);
      ctx.fill();
      ctx.stroke();

      // Wing Endplates (Downforce fins)
      ctx.fillStyle = isNitro ? '#00F0FF' : '#FFE600';
      ctx.fillRect(-66, -10, 4, 16);
      ctx.fillRect(62, -10, 4, 16);

      ctx.restore();

      // (6) Cockpit Roof & Tinted Louvered Glass
      const glassGrad = ctx.createLinearGradient(0, -32, 0, 0);
      glassGrad.addColorStop(0, '#00F0FF');
      glassGrad.addColorStop(1, '#050314');

      ctx.fillStyle = glassGrad;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-36 - yawOffset * 0.2, -6);
      ctx.lineTo(-24 - yawOffset * 0.4, -30);
      ctx.lineTo(24 - yawOffset * 0.4, -30);
      ctx.lineTo(36 - yawOffset * 0.2, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dynamic Specular Light Sheen Sweeping Across Glass
      const sweepX = ((reflectionPhaseRef.current * 0.6) % 70) - 35;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(sweepX - 10, -28);
      ctx.lineTo(sweepX + 6, -28);
      ctx.lineTo(sweepX + 16, -8);
      ctx.lineTo(sweepX, -8);
      ctx.closePath();
      ctx.fill();

      // Rear Louver Slats (Cyberpunk slotted engine cover)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-22 - yawOffset * 0.3, -24);
      ctx.lineTo(22 - yawOffset * 0.3, -24);
      ctx.moveTo(-26 - yawOffset * 0.25, -17);
      ctx.lineTo(26 - yawOffset * 0.25, -17);
      ctx.moveTo(-30 - yawOffset * 0.2, -10);
      ctx.lineTo(30 - yawOffset * 0.2, -10);
      ctx.stroke();

      // (7) Continuous Full-Width LED Laser Lightbar
      ctx.fillStyle = '#FF0055';
      ctx.fillRect(-46, 6, 92, isBraking ? 8 : 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-40, 8, 80, 2);

      // (8) Cyber License Plate
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-20, 16, 40, 10);
      ctx.fillRect(-20, 16, 40, 10);
      ctx.fillStyle = '#00F0FF';
      ctx.font = '900 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OUTRUN 77', 0, 24);

      ctx.restore(); // Restore car rotation & styling
      ctx.restore(); // Restore player position transform

      // 7. PARTICLES RENDERING FROM POOL
      const pool = particlesPoolRef.current;
      if (pool) {
        for (let p = 0; p < pool.length; p++) {
          const pt = pool[p];
          if (!pt.active) continue;

          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.alpha -= pt.decay;

          if (pt.alpha <= 0) {
            pt.active = false;
            continue;
          }

          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 8. FLOATING BANNERS RENDERING
      for (let b = bannersRef.current.length - 1; b >= 0; b--) {
        const bn = bannersRef.current[b];
        bn.life += 1;
        bn.scale = Math.max(1.0, 1.3 - (bn.life / 20) * 0.3);
        bn.alpha = Math.max(0, 1 - bn.life / bn.maxLife);

        if (bn.life >= bn.maxLife) {
          bannersRef.current.splice(b, 1);
          continue;
        }

        const bannerY = H * 0.22 - bn.life * 0.6;
        ctx.save();
        ctx.globalAlpha = bn.alpha;
        ctx.translate(W * 0.5, bannerY);
        ctx.scale(bn.scale, bn.scale);

        // Neo-Brutalist Badge Box
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = bn.color;
        ctx.lineWidth = 3;
        ctx.fillRect(-120, -18, 240, 36);
        ctx.strokeRect(-120, -18, 240, 36);

        ctx.fillStyle = bn.color;
        ctx.font = '900 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bn.text, 0, -1);

        if (bn.subText) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '800 10px monospace';
          ctx.fillText(bn.subText, 0, 12);
        }

        ctx.restore();
      }

      // 9. SPEED WARP TUNNEL LINES (Nitro Boost FX)
      if (isNitro) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 2;
        for (let sl = 0; sl < 12; sl++) {
          const randAngle = Math.random() * Math.PI * 2;
          const r1 = 80 + Math.random() * 80;
          const r2 = r1 + 80 + Math.random() * 120;
          const sx1 = W * 0.5 + Math.cos(randAngle) * r1;
          const sy1 = H * 0.5 + Math.sin(randAngle) * r1;
          const sx2 = W * 0.5 + Math.cos(randAngle) * r2;
          const sy2 = H * 0.5 + Math.sin(randAngle) * r2;

          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        }
      }

      ctx.restore(); // Restore high-DPI scaling & screen shake

      animId = requestAnimationFrame(gameLoop);
      animFrameIdRef.current = animId;
    };

    animId = requestAnimationFrame(gameLoop);
    animFrameIdRef.current = animId;

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [handleGameOver, recycleCar, updateEngineAudio, spawnParticle]);

  // Responsive High-DPI Canvas Resize Observer
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const targetW = Math.floor(rect.width) || 800;
      const targetH = Math.floor(rect.height) || 540;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      logicalSizeRef.current = { w: targetW, h: targetH };

      canvasRef.current.width = Math.floor(targetW * dpr);
      canvasRef.current.height = Math.floor(targetH * dpr);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[580px] md:h-[640px] bg-black text-white font-mono select-none overflow-hidden flex flex-col items-center justify-center border-4 border-black shadow-neo-lg"
    >
      {/* Background 60-120 FPS High-DPI HTML5 Canvas with Drag Steering */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 w-full h-full block cursor-ew-resize touch-none"
      />

      {/* Retro CRT Scanline Filter Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/60" />
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.6) 50%)',
          backgroundSize: '100% 4px'
        }}
      />

      {/* TOP NEO-BRUTALIST TELEMETRY HUD OVERLAY */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-2 z-20">
        {/* Speedometer & Gear Indicator */}
        <div className="flex items-center gap-2 bg-black/90 border-2 border-cyan-400 px-3 py-1.5 shadow-neo rounded-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-400 font-black tracking-widest">VELOCITY</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl md:text-3xl font-black text-cyan-300 font-mono tracking-tight leading-none">
                {speedKmh}
              </span>
              <span className="text-xs font-bold text-cyan-400/80">KM/H</span>
            </div>
          </div>

          {/* RPM Arc Bar */}
          <div className="w-1.5 h-9 bg-gray-800 rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-cyan-400/40">
            <div
              className={`w-full transition-all duration-75 rounded-sm ${
                rpmRatio > 0.85 ? 'bg-rose-500 animate-pulse' : rpmRatio > 0.6 ? 'bg-yellow-400' : 'bg-cyan-400'
              }`}
              style={{ height: `${Math.min(100, rpmRatio * 100)}%` }}
            />
          </div>
        </div>

        {/* Center Multiplier & Slipstream Status */}
        <div className="flex items-center gap-2">
          {multiplier > 1 && (
            <div className="bg-yellow-400 text-black border-2 border-black px-2.5 py-1 shadow-neo font-black text-xs md:text-sm flex items-center gap-1 animate-bounce">
              <Flame className="w-4 h-4 text-rose-600 fill-current" />
              <span>COMBO {multiplier}x</span>
            </div>
          )}

          {isDrafting && (
            <div className="bg-cyan-400 text-black border-2 border-black px-2.5 py-1 shadow-neo font-black text-xs md:text-sm flex items-center gap-1 animate-pulse">
              <Zap className="w-4 h-4 fill-current text-yellow-900" />
              <span>DRAFTING +40 KM/H</span>
            </div>
          )}
        </div>

        {/* Right Telemetry: Score, Distance & Nitro Battery */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end bg-black/90 border-2 border-yellow-400 px-3 py-1 shadow-neo rounded-md">
            <span className="text-[10px] text-yellow-400 font-black tracking-widest">SCORE</span>
            <span className="text-lg md:text-xl font-black text-yellow-300 font-mono tracking-wider leading-none">
              {score.toLocaleString()}
            </span>
            <span className="text-[9px] text-gray-400 font-semibold">{distanceMeters}m</span>
          </div>

          {/* Nitro Energy Battery Gauge */}
          <div className="flex flex-col items-center bg-black/90 border-2 border-rose-500 px-2.5 py-1 shadow-neo rounded-md min-w-[70px]">
            <span className="text-[9px] text-rose-400 font-black tracking-widest flex items-center gap-1">
              <Zap className="w-3 h-3 text-rose-400 fill-current" /> NITRO
            </span>
            <div className="w-full h-2.5 bg-gray-900 border border-rose-500/60 rounded-sm overflow-hidden p-0.5 mt-0.5">
              <div
                className={`h-full transition-all duration-100 ${
                  isNitroActive
                    ? 'bg-cyan-300 animate-pulse'
                    : nitroEnergy >= 15
                    ? 'bg-gradient-to-r from-rose-500 to-yellow-400'
                    : 'bg-gray-600'
                }`}
                style={{ width: `${nitroEnergy}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TOP RIGHT UTILITY BUTTONS (Sound, Pause, Fullscreen) */}
      <div className="absolute top-16 right-3 flex items-center gap-1.5 z-20">
        <button
          onClick={toggleMute}
          className="p-1.5 bg-black/80 text-cyan-300 border-2 border-cyan-400 shadow-neo hover:bg-cyan-400 hover:text-black transition-all rounded"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={togglePause}
          className="p-1.5 bg-black/80 text-yellow-400 border-2 border-yellow-400 shadow-neo hover:bg-yellow-400 hover:text-black transition-all rounded"
          title="Pause / Resume"
        >
          <Pause className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-1.5 bg-black/80 text-pink-400 border-2 border-pink-400 shadow-neo hover:bg-pink-400 hover:text-black transition-all rounded"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* START SCREEN OVERLAY */}
      {!isPlaying && !isGameOver && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <div className="inline-block bg-yellow-400 text-black px-3 py-0.5 text-xs font-black tracking-widest border-2 border-black shadow-neo mb-3">
            SYNTHWAVE // ARCADE HIGHWAY RACER
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-yellow-300 to-pink-500 drop-shadow-[0_4px_10px_rgba(0,240,255,0.4)] mb-2 font-mono">
            CYBER OUTRUN 2077
          </h1>

          <p className="max-w-md text-xs md:text-sm text-gray-300 mb-6 leading-relaxed">
            Pilot your Cyber Sports Car across 4 high-speed neon lanes. Overtake traffic with razor-thin Near-Misses to
            charge your Nitro Core, draft behind Heavy Haulers, and trigger 350+ km/h hyper overdrive!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-gray-300 mb-6 max-w-lg w-full">
            <div className="bg-black/80 border border-cyan-400/60 p-2 rounded shadow-neo">
              <span className="text-cyan-400 font-bold block mb-0.5">A / D or Drag Canvas</span>
              <span>Steer & Lane Shift</span>
            </div>
            <div className="bg-black/80 border border-yellow-400/60 p-2 rounded shadow-neo">
              <span className="text-yellow-400 font-bold block mb-0.5">W / S or ↑ / ↓</span>
              <span>Throttle & Brake</span>
            </div>
            <div className="bg-black/80 border border-rose-400/60 p-2 rounded shadow-neo col-span-2 md:col-span-1">
              <span className="text-rose-400 font-bold block mb-0.5">Shift / Space</span>
              <span>Nitro Boost</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="group relative bg-cyan-400 text-black font-black text-lg md:text-xl px-8 py-3.5 border-3 border-black shadow-neo-lg hover:bg-yellow-400 hover:shadow-neo hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 rounded-md"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>IGNITE ENGINE</span>
          </button>
        </div>
      )}

      {/* GAME OVER SCREEN OVERLAY */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <div className="inline-block bg-rose-600 text-white px-4 py-1 text-xs font-black tracking-widest border-2 border-black shadow-neo mb-2">
            CRITICAL VEHICLE CRASH
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-rose-500 mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(255,0,85,0.6)]">
            GRIDLOCK TERMINATED
          </h2>

          <div className="bg-black/90 border-3 border-yellow-400 p-5 rounded-md shadow-neo-lg max-w-sm w-full mb-6 text-center">
            <div className="text-xs text-yellow-400 font-bold uppercase mb-1">FINAL RUN SCORE</div>
            <div className="text-4xl font-black text-white font-mono tracking-wider mb-3">
              {score.toLocaleString()}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-800 pt-3">
              <div>
                <span className="text-gray-400 block">Distance</span>
                <span className="font-bold text-cyan-400">{distanceMeters} METERS</span>
              </div>
              <div>
                <span className="text-gray-400 block">Near Misses</span>
                <span className="font-bold text-pink-400">{nearMissCount} GRAZES</span>
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="bg-yellow-400 text-black font-black text-lg px-8 py-3 border-3 border-black shadow-neo-lg hover:bg-cyan-400 hover:shadow-neo hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 rounded-md"
          >
            <RotateCcw className="w-5 h-5" />
            <span>REBOOT RUN [R]</span>
          </button>
        </div>
      )}

      {/* MOBILE / ON-SCREEN TOUCH CONTROL ACTION BAR */}
      {isPlaying && !isGameOver && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
          {/* Left / Right Steering Buttons */}
          <div className="flex items-center gap-2">
            <button
              onTouchStart={() => { steerLeftInputRef.current = true; }}
              onTouchEnd={() => { steerLeftInputRef.current = false; }}
              onMouseDown={() => { steerLeftInputRef.current = true; }}
              onMouseUp={() => { steerLeftInputRef.current = false; }}
              className="w-14 h-14 bg-black/80 active:bg-cyan-400 active:text-black border-2 border-cyan-400 text-cyan-300 font-black text-xl rounded-lg shadow-neo flex items-center justify-center transition-all touch-none select-none"
              title="Steer Left"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>

            <button
              onTouchStart={() => { steerRightInputRef.current = true; }}
              onTouchEnd={() => { steerRightInputRef.current = false; }}
              onMouseDown={() => { steerRightInputRef.current = true; }}
              onMouseUp={() => { steerRightInputRef.current = false; }}
              className="w-14 h-14 bg-black/80 active:bg-cyan-400 active:text-black border-2 border-cyan-400 text-cyan-300 font-black text-xl rounded-lg shadow-neo flex items-center justify-center transition-all touch-none select-none"
              title="Steer Right"
            >
              <ArrowRight className="w-7 h-7" />
            </button>
          </div>

          {/* Center BIG Nitro Button */}
          <button
            onClick={activateNitro}
            onTouchStart={activateNitro}
            className={`px-5 h-14 border-3 border-black font-black text-sm md:text-base rounded-lg shadow-neo flex items-center gap-1.5 transition-all touch-none select-none ${
              isNitroActive
                ? 'bg-cyan-400 text-black animate-pulse'
                : nitroEnergy >= 15
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-gray-800 text-gray-500 opacity-60'
            }`}
          >
            <Zap className="w-5 h-5 fill-current" />
            <span>NITRO</span>
          </button>

          {/* Gas & Brake Pedals */}
          <div className="flex items-center gap-2">
            <button
              onTouchStart={() => { brakeInputRef.current = true; }}
              onTouchEnd={() => { brakeInputRef.current = false; }}
              onMouseDown={() => { brakeInputRef.current = true; }}
              onMouseUp={() => { brakeInputRef.current = false; }}
              className="w-14 h-14 bg-black/80 active:bg-rose-500 active:text-white border-2 border-rose-500 text-rose-400 font-black text-sm rounded-lg shadow-neo flex flex-col items-center justify-center transition-all touch-none select-none"
              title="Brake"
            >
              <ArrowDown className="w-5 h-5" />
              <span className="text-[9px] font-bold">BRAKE</span>
            </button>

            <button
              onTouchStart={() => { throttleInputRef.current = true; }}
              onTouchEnd={() => { throttleInputRef.current = false; }}
              onMouseDown={() => { throttleInputRef.current = true; }}
              onMouseUp={() => { throttleInputRef.current = false; }}
              className="w-14 h-14 bg-black/80 active:bg-yellow-400 active:text-black border-2 border-yellow-400 text-yellow-300 font-black text-sm rounded-lg shadow-neo flex flex-col items-center justify-center transition-all touch-none select-none"
              title="Gas / Accelerate"
            >
              <ArrowUp className="w-5 h-5" />
              <span className="text-[9px] font-bold">GAS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
