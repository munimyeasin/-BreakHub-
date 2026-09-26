'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  ArrowDown,
  Shield,
  Trophy,
  Sparkles,
  Activity
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NeonFlipperPinballGameProps {
  gameId?: string;
  onGameOver?: (finalScore: number) => void;
  onScoreUpdate?: (score: number) => void;
}

// Coordinate & Dimension Standards (Virtual 9:16 Portrait Canvas)
const V_WIDTH = 360;
const V_HEIGHT = 640;

// Physics Constants
const GRAVITY = 0.28;
const AIR_FRICTION = 0.998;
const BALL_RADIUS = 7.5;
const MAX_VELOCITY = 19;
const FLIPPER_LENGTH = 54;
const FLIPPER_SPEED = 0.32; // Radians per frame rotation speed

// Flipper Geometry Defs
// Left Flipper
const L_PIVOT = { x: 106, y: 546 };
const L_REST_ANGLE = 0.48; // ~27.5 deg down
const L_UP_ANGLE = -0.48; // ~-27.5 deg up

// Right Flipper
const R_PIVOT = { x: 234, y: 546 };
const R_REST_ANGLE = Math.PI - 0.48; // ~152.5 deg down
const R_UP_ANGLE = Math.PI + 0.48; // ~207.5 deg up

// Drop Targets (C-Y-B-E-R)
interface DropTarget {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  dropped: boolean;
}

// Pop Bumpers (3 Cyber Cores)
interface PopBumper {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  score: number;
  hitPulse: number; // 0 to 1 for visual flash
  noteFreq: number; // Synth frequency
}

// Particle & Spark Entity
interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

// Floating Combat Score Badge
interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

// Pinball Ball Entity
interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
  active: boolean;
  lockedInChamber?: boolean;
}

// 2D Vector Physics Helper: Point to Segment Distance & Normal Projection
function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { dist: number; closestX: number; closestY: number; normalX: number; normalY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) {
    const dist = Math.hypot(px - x1, py - y1);
    const nx = dist > 0.0001 ? (px - x1) / dist : 0;
    const ny = dist > 0.0001 ? (py - y1) / dist : -1;
    return { dist, closestX: x1, closestY: y1, normalX: nx, normalY: ny };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const distX = px - closestX;
  const distY = py - closestY;
  const dist = Math.hypot(distX, distY);
  const normalX = dist > 0.0001 ? distX / dist : -dy / Math.sqrt(l2);
  const normalY = dist > 0.0001 ? distY / dist : dx / Math.sqrt(l2);
  return { dist, closestX, closestY, normalX, normalY };
}

export default function NeonFlipperPinballGame({
  onGameOver,
  onScoreUpdate
}: NeonFlipperPinballGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // High-Level Game State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentBallNum, setCurrentBallNum] = useState(1);
  const [multiplier, setMultiplier] = useState(1);
  const [ballSaveTimer, setBallSaveTimer] = useState(0);
  const [isMultiBallActive, setIsMultiBallActive] = useState(false);
  const [plungerCompression, setPlungerCompression] = useState(0);
  const [tiltWarnings, setTiltWarnings] = useState(0);
  const [isTilted, setIsTilted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Engine Refs (60 FPS Performance Loop)
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isGameOverRef = useRef(false);
  const isTiltedRef = useRef(false);
  const tiltTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const multiplierRef = useRef(1);
  const ballSaveTimerRef = useRef(0);
  const ballsRef = useRef<Ball[]>([]);
  const nextBallIdRef = useRef(1);
  const currentBallNumRef = useRef(1);
  const sparksRef = useRef<SparkParticle[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const shakeIntensityRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const matrixLockCountRef = useRef(0);
  const orbitCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Flipper Angle & Solenoid Control Refs
  const leftFlipperAngleRef = useRef(L_REST_ANGLE);
  const rightFlipperAngleRef = useRef(R_REST_ANGLE);
  const leftFlipperPressedRef = useRef(false);
  const rightFlipperPressedRef = useRef(false);
  const plungerPressedRef = useRef(false);
  const plungerChargeRef = useRef(0); // 0 to 1

  // Pop Bumpers Ref
  const popBumpersRef = useRef<PopBumper[]>([
    { id: 1, x: 170, y: 135, radius: 22, color: '#FFDE59', glowColor: '#FFE600', score: 350, hitPulse: 0, noteFreq: 587.33 }, // D5
    { id: 2, x: 115, y: 195, radius: 20, color: '#00F0FF', glowColor: '#38BDF8', score: 250, hitPulse: 0, noteFreq: 440.00 }, // A4
    { id: 3, x: 225, y: 195, radius: 20, color: '#FF007F', glowColor: '#FF70D9', score: 250, hitPulse: 0, noteFreq: 659.25 }  // E5
  ]);

  // Drop Targets (C - Y - B - E - R) Ref
  const dropTargetsRef = useRef<DropTarget[]>([
    { id: 1, label: 'C', x: 62, y: 110, width: 9, height: 16, color: '#00F0FF', dropped: false },
    { id: 2, label: 'Y', x: 74, y: 128, width: 9, height: 16, color: '#FF007F', dropped: false },
    { id: 3, label: 'B', x: 86, y: 146, width: 9, height: 16, color: '#FFDE59', dropped: false },
    { id: 4, label: 'E', x: 98, y: 164, width: 9, height: 16, color: '#00F0FF', dropped: false },
    { id: 5, label: 'R', x: 110, y: 182, width: 9, height: 16, color: '#FF007F', dropped: false }
  ]);

  // Slingshots Left & Right
  const slingshotPulseLeftRef = useRef(0);
  const slingshotPulseRightRef = useRef(0);

  // Load High Score on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('breakhub_neon_pinball_highscore');
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Web Audio Procedural Synthesizer
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  const playSynthSound = useCallback((type: 'flipper' | 'bumper' | 'slingshot' | 'target' | 'launch' | 'drain' | 'multiball' | 'nudge' | 'orbit', freq = 440) => {
    if (isMuted) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'flipper') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'bumper') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'slingshot') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'target') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(784, now); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.09); // C6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'launch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'orbit') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.linearRampToValueAtTime(1046.5, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'multiball') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          gain.gain.setValueAtTime(0.25, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.2);
        });
      } else if (type === 'drain') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'nudge') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch {}
  }, [isMuted, initAudio]);

  // Clean Audio Context on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Spawn a Pinball in Plunger Lane
  const spawnBall = useCallback((autolaunch = false) => {
    const newBall: Ball = {
      id: nextBallIdRef.current++,
      x: 343,
      y: 575,
      vx: 0,
      vy: autolaunch ? -23 : 0,
      radius: BALL_RADIUS,
      trail: [],
      active: true
    };
    ballsRef.current.push(newBall);
    ballSaveTimerRef.current = 10; // 10s Ball Save Protection
    setBallSaveTimer(10);
    if (autolaunch) {
      playSynthSound('launch');
    }
  }, [playSynthSound]);

  // Add Dynamic Score & Floating Label
  const addScore = useCallback((pts: number, x: number, y: number, text?: string, color = '#FFDE59') => {
    const total = pts * multiplierRef.current;
    scoreRef.current += total;
    setScore(scoreRef.current);
    if (onScoreUpdate) onScoreUpdate(scoreRef.current);

    // Spawn floating score particle
    floatingScoresRef.current.push({
      id: Math.random(),
      x,
      y,
      text: text || `+${total.toLocaleString()}`,
      color,
      alpha: 1,
      scale: 1
    });

    // Particle burst
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 3.5;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        size: 2 + Math.random() * 2,
        alpha: 1,
        decay: 0.03 + Math.random() * 0.03
      });
    }
  }, [onScoreUpdate]);

  // Trigger Table Nudge
  const handleNudge = useCallback((dir: 'left' | 'right' | 'up') => {
    if (!isPlayingRef.current || isPausedRef.current || isTiltedRef.current) return;
    initAudio();

    setTiltWarnings(prev => {
      const next = prev + 1;
      if (next >= 4) {
        // TILT TRIGGERED!
        isTiltedRef.current = true;
        tiltTimerRef.current = 4; // 4 seconds tilt penalty
        setIsTilted(true);
        playSynthSound('drain');
        shakeIntensityRef.current = 15;
        return 0;
      }
      playSynthSound('nudge');
      shakeIntensityRef.current = 6;
      return next;
    });

    // Impart impulse to active balls
    ballsRef.current.forEach(ball => {
      if (dir === 'left') ball.vx += 2.2;
      else if (dir === 'right') ball.vx -= 2.2;
      else ball.vy -= 2.5;
    });
  }, [initAudio, playSynthSound]);

  // Start / Restart Game Session
  const startGame = useCallback(() => {
    initAudio();
    setIsPlaying(true);
    isPlayingRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    setIsGameOver(false);
    isGameOverRef.current = false;
    setIsTilted(false);
    isTiltedRef.current = false;
    setTiltWarnings(0);

    scoreRef.current = 0;
    setScore(0);
    multiplierRef.current = 1;
    setMultiplier(1);
    currentBallNumRef.current = 1;
    setCurrentBallNum(1);
    setIsMultiBallActive(false);
    matrixLockCountRef.current = 0;
    orbitCountRef.current = 0;

    // Reset drop targets
    dropTargetsRef.current.forEach(t => (t.dropped = false));

    // Clear particles
    sparksRef.current = [];
    floatingScoresRef.current = [];
    ballsRef.current = [];

    // Spawn 1st Ball
    spawnBall(false);
  }, [initAudio, spawnBall]);

  // End Game Lifecycle
  const triggerGameOver = useCallback(() => {
    isPlayingRef.current = false;
    isGameOverRef.current = true;
    setIsPlaying(false);
    setIsGameOver(true);

    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        localStorage.setItem('breakhub_neon_pinball_highscore', finalScore.toString());
      } catch {}
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    if (onGameOver) {
      onGameOver(finalScore);
    }
  }, [highScore, onGameOver]);

  // Global Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat && e.key !== ' ' && e.key !== 'ArrowDown') return;

      // Flipper Left: A, Left Arrow, Z
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft' || e.key === 'z' || e.key === 'Z') {
        if (!isTiltedRef.current) {
          leftFlipperPressedRef.current = true;
          playSynthSound('flipper');
        }
      }
      // Flipper Right: D, Right Arrow, /, Slash
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight' || e.key === '/' || e.key === '.') {
        if (!isTiltedRef.current) {
          rightFlipperPressedRef.current = true;
          playSynthSound('flipper');
        }
      }
      // Plunger: Space, Down Arrow, Enter
      if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        plungerPressedRef.current = true;
      }
      // Nudge: W, X, C, Up Arrow
      if (e.key === 'w' || e.key === 'W' || e.key === 'x' || e.key === 'X' || e.key === 'ArrowUp') {
        handleNudge('up');
      }
      if (e.key === 'q' || e.key === 'Q') {
        handleNudge('left');
      }
      if (e.key === 'e' || e.key === 'E') {
        handleNudge('right');
      }
      // Pause: P, Escape
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (isPlayingRef.current && !isGameOverRef.current) {
          setIsPaused(prev => {
            isPausedRef.current = !prev;
            return !prev;
          });
        }
      }
      // Restart: R
      if (e.key === 'r' || e.key === 'R') {
        if (isGameOverRef.current || !isPlayingRef.current) {
          startGame();
        }
      }
      // Mute: M
      if (e.key === 'm' || e.key === 'M') {
        setIsMuted(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft' || e.key === 'z' || e.key === 'Z') {
        leftFlipperPressedRef.current = false;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight' || e.key === '/' || e.key === '.') {
        rightFlipperPressedRef.current = false;
      }
      if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        // Release Plunger
        if (plungerPressedRef.current) {
          plungerPressedRef.current = false;
          // Launch any ball residing in plunger lane
          const launchPower = 14 + plungerChargeRef.current * 14;
          ballsRef.current.forEach(ball => {
            if (ball.x > 328 && ball.y > 450) {
              ball.vy = -launchPower;
              ball.vx = -1.2;
              playSynthSound('launch');
              shakeIntensityRef.current = 4;
            }
          });
          plungerChargeRef.current = 0;
          setPlungerCompression(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleNudge, playSynthSound, startGame]);

  // Main 60 FPS Physics & Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      // Handle Tilt Timer
      if (isTiltedRef.current) {
        tiltTimerRef.current -= dt;
        if (tiltTimerRef.current <= 0) {
          isTiltedRef.current = false;
          setIsTilted(false);
        }
      }

      // Handle Ball Save Timer
      if (ballSaveTimerRef.current > 0) {
        ballSaveTimerRef.current = Math.max(0, ballSaveTimerRef.current - dt);
        setBallSaveTimer(Math.ceil(ballSaveTimerRef.current));
      }

      // Handle Plunger Compression Gauge
      if (plungerPressedRef.current) {
        plungerChargeRef.current = Math.min(1, plungerChargeRef.current + dt * 1.8);
        setPlungerCompression(plungerChargeRef.current);
      }

      // Smooth Flipper Angle Interpolation
      const targetLeftAngle = (!isTiltedRef.current && leftFlipperPressedRef.current) ? L_UP_ANGLE : L_REST_ANGLE;
      const targetRightAngle = (!isTiltedRef.current && rightFlipperPressedRef.current) ? R_UP_ANGLE : R_REST_ANGLE;

      leftFlipperAngleRef.current += (targetLeftAngle - leftFlipperAngleRef.current) * FLIPPER_SPEED;
      rightFlipperAngleRef.current += (targetRightAngle - rightFlipperAngleRef.current) * FLIPPER_SPEED;

      // Pulse decay
      popBumpersRef.current.forEach(b => {
        if (b.hitPulse > 0) b.hitPulse = Math.max(0, b.hitPulse - dt * 4);
      });
      if (slingshotPulseLeftRef.current > 0) slingshotPulseLeftRef.current = Math.max(0, slingshotPulseLeftRef.current - dt * 5);
      if (slingshotPulseRightRef.current > 0) slingshotPulseRightRef.current = Math.max(0, slingshotPulseRightRef.current - dt * 5);

      // --- 1. PHYSICS UPDATE (Only when playing & unpaused) ---
      if (isPlayingRef.current && !isPausedRef.current) {
        const balls = ballsRef.current;

        for (let bIdx = balls.length - 1; bIdx >= 0; bIdx--) {
          const ball = balls[bIdx];
          if (!ball.active) continue;

          // Apply Gravity & Friction
          ball.vy += GRAVITY;
          ball.vx *= AIR_FRICTION;
          ball.vy *= AIR_FRICTION;

          // Clamp max velocity
          const curSpeed = Math.hypot(ball.vx, ball.vy);
          if (curSpeed > MAX_VELOCITY) {
            ball.vx = (ball.vx / curSpeed) * MAX_VELOCITY;
            ball.vy = (ball.vy / curSpeed) * MAX_VELOCITY;
          }

          // Advance Position
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Update Motion Trail
          ball.trail.unshift({ x: ball.x, y: ball.y, alpha: 0.7 });
          if (ball.trail.length > 8) ball.trail.pop();
          ball.trail.forEach(t => (t.alpha *= 0.8));

          // === COLLISION: OUTER BOUNDARIES ===
          // Top Arch Curve (Circular Dome at top)
          const archCenter = { x: 180, y: 150 };
          const archRadius = 150;
          const distToArch = Math.hypot(ball.x - archCenter.x, ball.y - archCenter.y);
          if (ball.y < 160 && distToArch > archRadius - ball.radius) {
            const nx = (archCenter.x - ball.x) / distToArch;
            const ny = (archCenter.y - ball.y) / distToArch;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 2 * dot * nx) * 0.88;
            ball.vy = (ball.vy - 2 * dot * ny) * 0.88;
            ball.x = archCenter.x - nx * (archRadius - ball.radius);
            ball.y = archCenter.y - ny * (archRadius - ball.radius);

            // Orbit Detection
            if (ball.y < 80 && Math.abs(ball.vx) > 5) {
              orbitCountRef.current++;
              addScore(1000 * orbitCountRef.current, ball.x, ball.y, `ORBIT LOOP x${orbitCountRef.current}!`, '#00F0FF');
              playSynthSound('orbit');
            }
          }

          // Left Outer Wall (x = 22)
          if (ball.x - ball.radius < 22) {
            ball.x = 22 + ball.radius;
            ball.vx = Math.abs(ball.vx) * 0.85;
          }

          // Right Outer Wall (x = 356)
          if (ball.x + ball.radius > 356) {
            ball.x = 356 - ball.radius;
            ball.vx = -Math.abs(ball.vx) * 0.85;
          }

          // Top Wall (y = 12)
          if (ball.y - ball.radius < 12) {
            ball.y = 12 + ball.radius;
            ball.vy = Math.abs(ball.vy) * 0.85;
          }

          // Plunger Lane Divider (x = 328 from y = 140 to 600)
          if (ball.y > 130) {
            // Ball inside plunger lane (x > 328)
            if (ball.x > 328) {
              if (ball.x - ball.radius < 330 && ball.vx < 0) {
                ball.x = 330 + ball.radius;
                ball.vx = Math.abs(ball.vx) * 0.5;
              }
            } else {
              // Ball in main table colliding with left side of divider
              if (ball.x + ball.radius > 326 && ball.vx > 0) {
                ball.x = 326 - ball.radius;
                ball.vx = -Math.abs(ball.vx) * 0.75;
              }
            }
          }

          // One-way Gate at Top of Plunger Lane (Prevents ball from draining back into plunger)
          if (ball.x > 328 && ball.y < 90 && ball.vy < 0) {
            // Escapes into main playfield towards left
            ball.vx = -7;
            ball.vy = -3;
          }

          // Bottom Drain Troughs & Outlanes
          // Left Gutter Diagonal (From (22, 450) to (105, 545))
          const lg_x1 = 22, lg_y1 = 450, lg_x2 = 95, lg_y2 = 525;
          const distLG = pointToSegmentDistance(ball.x, ball.y, lg_x1, lg_y1, lg_x2, lg_y2);
          if (distLG.dist < ball.radius) {
            const nx = distLG.normalX, ny = distLG.normalY;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 1.8 * dot * nx) * 0.85;
            ball.vy = (ball.vy - 1.8 * dot * ny) * 0.85;
            ball.x += nx * (ball.radius - distLG.dist);
            ball.y += ny * (ball.radius - distLG.dist);
          }

          // Right Gutter Diagonal (From (326, 450) to (245, 525))
          const rg_x1 = 326, rg_y1 = 450, rg_x2 = 245, rg_y2 = 525;
          const distRG = pointToSegmentDistance(ball.x, ball.y, rg_x1, rg_y1, rg_x2, rg_y2);
          if (distRG.dist < ball.radius) {
            const nx = distRG.normalX, ny = distRG.normalY;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 1.8 * dot * nx) * 0.85;
            ball.vy = (ball.vy - 1.8 * dot * ny) * 0.85;
            ball.x += nx * (ball.radius - distRG.dist);
            ball.y += ny * (ball.radius - distRG.dist);
          }

          // === COLLISION: FLIPPERS ===
          // Left Flipper Segment
          const lTipX = L_PIVOT.x + Math.cos(leftFlipperAngleRef.current) * FLIPPER_LENGTH;
          const lTipY = L_PIVOT.y + Math.sin(leftFlipperAngleRef.current) * FLIPPER_LENGTH;
          const lDist = pointToSegmentDistance(ball.x, ball.y, L_PIVOT.x, L_PIVOT.y, lTipX, lTipY);
          if (lDist.dist < ball.radius + 4) {
            const nx = lDist.normalX;
            const ny = lDist.normalY;
            const dot = ball.vx * nx + ball.vy * ny;

            // Angular velocity kick from flipper stroke
            const isMovingUp = leftFlipperPressedRef.current && leftFlipperAngleRef.current > L_UP_ANGLE + 0.1;
            const kickSpeed = isMovingUp ? 14 : 2;

            ball.vx = (ball.vx - 1.9 * dot * nx) * 0.85 + nx * kickSpeed * 0.4;
            ball.vy = (ball.vy - 1.9 * dot * ny) * 0.85 + ny * kickSpeed;
            ball.x += nx * (ball.radius + 4 - lDist.dist);
            ball.y += ny * (ball.radius + 4 - lDist.dist);

            if (isMovingUp) {
              playSynthSound('flipper');
              shakeIntensityRef.current = 3;
            }
          }

          // Right Flipper Segment
          const rTipX = R_PIVOT.x + Math.cos(rightFlipperAngleRef.current) * FLIPPER_LENGTH;
          const rTipY = R_PIVOT.y + Math.sin(rightFlipperAngleRef.current) * FLIPPER_LENGTH;
          const rDist = pointToSegmentDistance(ball.x, ball.y, R_PIVOT.x, R_PIVOT.y, rTipX, rTipY);
          if (rDist.dist < ball.radius + 4) {
            const nx = rDist.normalX;
            const ny = rDist.normalY;
            const dot = ball.vx * nx + ball.vy * ny;

            const isMovingUp = rightFlipperPressedRef.current && rightFlipperAngleRef.current < R_UP_ANGLE - 0.1;
            const kickSpeed = isMovingUp ? 14 : 2;

            ball.vx = (ball.vx - 1.9 * dot * nx) * 0.85 + nx * kickSpeed * 0.4;
            ball.vy = (ball.vy - 1.9 * dot * ny) * 0.85 + ny * kickSpeed;
            ball.x += nx * (ball.radius + 4 - rDist.dist);
            ball.y += ny * (ball.radius + 4 - rDist.dist);

            if (isMovingUp) {
              playSynthSound('flipper');
              shakeIntensityRef.current = 3;
            }
          }

          // === COLLISION: POP BUMPERS ===
          popBumpersRef.current.forEach(bumper => {
            const dx = ball.x - bumper.x;
            const dy = ball.y - bumper.y;
            const dist = Math.hypot(dx, dy);
            const minDist = bumper.radius + ball.radius;

            if (dist < minDist) {
              const nx = dx / dist;
              const ny = dy / dist;
              const impulse = 12.5;

              ball.vx = nx * impulse;
              ball.vy = ny * impulse;
              ball.x = bumper.x + nx * minDist;
              ball.y = bumper.y + ny * minDist;

              bumper.hitPulse = 1;
              addScore(bumper.score, bumper.x, bumper.y - 12, `+${bumper.score}`, bumper.color);
              playSynthSound('bumper', bumper.noteFreq);
              shakeIntensityRef.current = 4;
            }
          });

          // === COLLISION: SLINGSHOTS ===
          // Left Slingshot: (72, 420) -> (96, 485)
          const lSling = pointToSegmentDistance(ball.x, ball.y, 72, 420, 96, 485);
          if (lSling.dist < ball.radius + 3) {
            const nx = lSling.normalX, ny = lSling.normalY;
            ball.vx = nx * 13;
            ball.vy = ny * 13;
            ball.x += nx * (ball.radius + 3 - lSling.dist);
            ball.y += ny * (ball.radius + 3 - lSling.dist);
            slingshotPulseLeftRef.current = 1;
            addScore(150, 84, 450, '+150', '#00F0FF');
            playSynthSound('slingshot');
            shakeIntensityRef.current = 3.5;
          }

          // Right Slingshot: (268, 420) -> (244, 485)
          const rSling = pointToSegmentDistance(ball.x, ball.y, 268, 420, 244, 485);
          if (rSling.dist < ball.radius + 3) {
            const nx = rSling.normalX, ny = rSling.normalY;
            ball.vx = nx * 13;
            ball.vy = ny * 13;
            ball.x += nx * (ball.radius + 3 - rSling.dist);
            ball.y += ny * (ball.radius + 3 - rSling.dist);
            slingshotPulseRightRef.current = 1;
            addScore(150, 256, 450, '+150', '#FF007F');
            playSynthSound('slingshot');
            shakeIntensityRef.current = 3.5;
          }

          // === COLLISION: DROP TARGETS (C-Y-B-E-R) ===
          dropTargetsRef.current.forEach(target => {
            if (target.dropped) return;
            if (
              ball.x + ball.radius > target.x &&
              ball.x - ball.radius < target.x + target.width &&
              ball.y + ball.radius > target.y &&
              ball.y - ball.radius < target.y + target.height
            ) {
              target.dropped = true;
              ball.vx = -ball.vx * 0.8 + 2;
              ball.vy = -ball.vy * 0.8;
              addScore(500, target.x, target.y - 10, target.label, target.color);
              playSynthSound('target');

              // Check if all targets dropped (CYBER OVERDRIVE BONUS!)
              const allDropped = dropTargetsRef.current.every(t => t.dropped);
              if (allDropped) {
                multiplierRef.current = Math.min(5, multiplierRef.current + 1);
                setMultiplier(multiplierRef.current);
                addScore(10000, 180, 280, '★ CYBER OVERDRIVE +10,000 ★', '#FFE600');
                playSynthSound('multiball');
                confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });

                // Reset targets after delay
                setTimeout(() => {
                  dropTargetsRef.current.forEach(t => (t.dropped = false));
                }, 4000);
              }
            }
          });

          // === MATRIX CORE SCOOP / MULTI-BALL LOCK CHAMBER ===
          // Chamber at (180, 56)
          const distToChamber = Math.hypot(ball.x - 180, ball.y - 56);
          if (distToChamber < 16 && !ball.lockedInChamber) {
            ball.lockedInChamber = true;
            matrixLockCountRef.current++;
            addScore(2000 * matrixLockCountRef.current, 180, 60, `MATRIX LOCK ${matrixLockCountRef.current}/3!`, '#00F0FF');
            playSynthSound('target');

            if (matrixLockCountRef.current >= 3) {
              // TRIGGER 3-BALL MULTI-BALL FRENZY!
              matrixLockCountRef.current = 0;
              setIsMultiBallActive(true);
              addScore(25000, 180, 200, '⚡ 3-BALL MULTI-BALL FRENZY! ⚡', '#FFE600');
              playSynthSound('multiball');
              confetti({ particleCount: 90, spread: 80, origin: { y: 0.4 } });

              // Eject locked ball and spawn 2 extra balls
              ball.lockedInChamber = false;
              ball.vx = (Math.random() - 0.5) * 6;
              ball.vy = 12;

              for (let i = 0; i < 2; i++) {
                const extraBall: Ball = {
                  id: nextBallIdRef.current++,
                  x: 170 + i * 20,
                  y: 70,
                  vx: (i === 0 ? -4 : 4),
                  vy: 11,
                  radius: BALL_RADIUS,
                  trail: [],
                  active: true
                };
                ballsRef.current.push(extraBall);
              }
            } else {
              // Eject ball downwards with boost
              setTimeout(() => {
                if (ball.active) {
                  ball.lockedInChamber = false;
                  ball.vx = (Math.random() - 0.5) * 4;
                  ball.vy = 10;
                  playSynthSound('launch');
                }
              }, 600);
            }
          }

          // === DRAIN BOTTOM HOLE (y > 630) ===
          if (ball.y > 630) {
            ball.active = false;
            balls.splice(bIdx, 1);

            // Ball Save Check
            if (ballSaveTimerRef.current > 0) {
              addScore(0, 180, 500, 'BALL SAVED!', '#00F0FF');
              playSynthSound('launch');
              spawnBall(true);
            } else if (balls.length === 0) {
              // Lost life
              playSynthSound('drain');
              if (currentBallNumRef.current < 3) {
                currentBallNumRef.current++;
                setCurrentBallNum(currentBallNumRef.current);
                spawnBall(false);
              } else {
                // Game Over
                triggerGameOver();
              }
            }
          }
        }
      }

      // Update Sparks
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const s = sparksRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;
        if (s.alpha <= 0) sparksRef.current.splice(i, 1);
      }

      // Update Floating Scores
      for (let i = floatingScoresRef.current.length - 1; i >= 0; i--) {
        const fs = floatingScoresRef.current[i];
        fs.y -= 0.9;
        fs.alpha -= 0.022;
        fs.scale = Math.min(1.2, fs.scale + 0.01);
        if (fs.alpha <= 0) floatingScoresRef.current.splice(i, 1);
      }

      // Screen Shake Dampening
      let shakeX = 0, shakeY = 0;
      if (shakeIntensityRef.current > 0) {
        shakeX = (Math.random() - 0.5) * shakeIntensityRef.current;
        shakeY = (Math.random() - 0.5) * shakeIntensityRef.current;
        shakeIntensityRef.current = Math.max(0, shakeIntensityRef.current - dt * 16);
      }

      // --- 2. CANVAS RENDERING PIPELINE ---
      ctx.save();
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);
      ctx.translate(shakeX, shakeY);

      // Playfield Dark Vector Background
      const bgGrad = ctx.createLinearGradient(0, 0, V_WIDTH, V_HEIGHT);
      bgGrad.addColorStop(0, '#0a0322');
      bgGrad.addColorStop(0.5, '#120738');
      bgGrad.addColorStop(1, '#040114');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Cyber Matrix Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < V_WIDTH; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, V_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < V_HEIGHT; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(V_WIDTH, y);
        ctx.stroke();
      }

      // Top Orbit Wireform Visual Guide
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(180, 150, 150, Math.PI, 0);
      ctx.stroke();

      // Plunger Lane Outer Guide
      ctx.strokeStyle = '#FFE600';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(328, 140);
      ctx.lineTo(328, 620);
      ctx.stroke();

      // Slingshots (Neo-Brutalist Polygonal Kickers)
      // Left Slingshot
      ctx.save();
      ctx.fillStyle = slingshotPulseLeftRef.current > 0 ? '#FFE600' : '#00F0FF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(70, 415);
      ctx.lineTo(100, 485);
      ctx.lineTo(60, 495);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Slingshot Inner Core
      ctx.fillStyle = '#080320';
      ctx.beginPath();
      ctx.moveTo(74, 425);
      ctx.lineTo(92, 475);
      ctx.lineTo(68, 485);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Right Slingshot
      ctx.save();
      ctx.fillStyle = slingshotPulseRightRef.current > 0 ? '#FFE600' : '#FF007F';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(270, 415);
      ctx.lineTo(240, 485);
      ctx.lineTo(280, 495);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Slingshot Inner Core
      ctx.fillStyle = '#080320';
      ctx.beginPath();
      ctx.moveTo(266, 425);
      ctx.lineTo(248, 475);
      ctx.lineTo(272, 485);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Drop Targets (C-Y-B-E-R)
      dropTargetsRef.current.forEach(t => {
        if (!t.dropped) {
          ctx.save();
          ctx.fillStyle = t.color;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.fillRect(t.x, t.y, t.width, t.height);
          ctx.strokeRect(t.x, t.y, t.width, t.height);
          // Label Letter
          ctx.fillStyle = '#000000';
          ctx.font = '900 10px "Impact", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(t.label, t.x + t.width / 2, t.y + 12);
          ctx.restore();
        } else {
          // Dropped target silhouette
          ctx.fillStyle = '#1c0e3a';
          ctx.fillRect(t.x, t.y + 4, t.width, t.height - 8);
        }
      });

      // Pop Bumpers (3 Cyber Cores)
      popBumpersRef.current.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);

        // Neon Glow Shockwave on Hit
        if (b.hitPulse > 0) {
          ctx.beginPath();
          ctx.arc(0, 0, b.radius + b.hitPulse * 16, 0, Math.PI * 2);
          ctx.strokeStyle = b.glowColor;
          ctx.lineWidth = 3;
          ctx.globalAlpha = b.hitPulse;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Bumper Outer Rim
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.hitPulse > 0 ? '#FFFFFF' : b.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        // Bumper Inner Core
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#040114';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Core Center Dot
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        ctx.restore();
      });

      // Matrix Lock Scoop Chamber (Top Center)
      ctx.save();
      ctx.fillStyle = '#0a0322';
      ctx.strokeStyle = matrixLockCountRef.current > 0 ? '#FFE600' : '#00F0FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(180, 56, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Chamber Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`LOCK ${matrixLockCountRef.current}/3`, 180, 59);
      ctx.restore();

      // Lower Gutters & Outlane Rails
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(22, 450);
      ctx.lineTo(95, 525);
      ctx.stroke();

      ctx.strokeStyle = '#FF007F';
      ctx.beginPath();
      ctx.moveTo(326, 450);
      ctx.lineTo(245, 525);
      ctx.stroke();

      // Flippers
      // Left Flipper
      ctx.save();
      ctx.translate(L_PIVOT.x, L_PIVOT.y);
      ctx.rotate(leftFlipperAngleRef.current);
      // Flipper Bat Shape
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(FLIPPER_LENGTH, -3);
      ctx.arc(FLIPPER_LENGTH, 0, 3, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fillStyle = '#00F0FF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
      // Pivot Cap
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Right Flipper
      ctx.save();
      ctx.translate(R_PIVOT.x, R_PIVOT.y);
      ctx.rotate(rightFlipperAngleRef.current);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(FLIPPER_LENGTH, -3);
      ctx.arc(FLIPPER_LENGTH, 0, 3, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fillStyle = '#FF007F';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
      // Pivot Cap
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Plunger Spring Graphic
      ctx.save();
      const plungerY = 575 + plungerCompression * 35;
      ctx.strokeStyle = '#FFE600';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(343, 620);
      ctx.lineTo(343, plungerY);
      ctx.stroke();
      // Plunger Tip Block
      ctx.fillStyle = '#FF007F';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(334, plungerY - 6, 18, 10);
      ctx.strokeRect(334, plungerY - 6, 18, 10);
      ctx.restore();

      // Active Balls & Motion Trails
      ballsRef.current.forEach(ball => {
        if (!ball.active) return;

        // Draw Motion Blur Trail
        ball.trail.forEach(t => {
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.radius * 0.85, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 240, 255, ${t.alpha * 0.5})`;
          ctx.fill();
        });

        // Chrome Steel Pinball
        const ballGrad = ctx.createRadialGradient(
          ball.x - 2,
          ball.y - 2,
          1,
          ball.x,
          ball.y,
          ball.radius
        );
        ballGrad.addColorStop(0, '#FFFFFF');
        ballGrad.addColorStop(0.35, '#E2E8F0');
        ballGrad.addColorStop(0.7, '#94A3B8');
        ballGrad.addColorStop(1, '#334155');

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ballGrad;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Specular Glint Reflection
        ctx.beginPath();
        ctx.arc(ball.x - 2.5, ball.y - 2.5, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      });

      // Spark Particles
      sparksRef.current.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Floating Score Badges
      floatingScoresRef.current.forEach(fs => {
        ctx.save();
        ctx.font = `900 ${Math.floor(13 * fs.scale)}px "Impact", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = fs.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.globalAlpha = fs.alpha;
        ctx.strokeText(fs.text, fs.x, fs.y);
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      });

      // TILT Overlay Warning
      if (isTiltedRef.current) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
        ctx.font = '900 36px "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF007F';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.strokeText('TILT LOCKOUT', V_WIDTH / 2, V_HEIGHT / 2);
        ctx.fillText('TILT LOCKOUT', V_WIDTH / 2, V_HEIGHT / 2);
        ctx.restore();
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [plungerCompression]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col items-center justify-center select-none bg-slate-950 font-sans text-slate-100 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4' : 'max-w-4xl mx-auto p-2'
      }`}
    >
      {/* Neo-Brutalist Arcade Pinball Frame */}
      <div className="relative w-full max-w-[420px] flex flex-col items-center bg-[#07021c] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl overflow-hidden">

        {/* Top Header Marquee HUD */}
        <div className="w-full bg-[#110538] border-b-4 border-black px-3 py-2 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#00F0FF] animate-pulse border border-black" />
            <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-yellow-400">
              NEON FLIPPER
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Multiplier Badge */}
            <div className="flex items-center gap-1 bg-yellow-400 text-black border-2 border-black px-2 py-0.5 rounded font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Zap className="w-3 h-3" />
              <span>{multiplier}X</span>
            </div>

            {/* Ball Save Indicator */}
            {ballSaveTimer > 0 && (
              <div className="flex items-center gap-1 bg-[#00F0FF] text-black border-2 border-black px-2 py-0.5 rounded font-black text-xs animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Shield className="w-3 h-3" />
                <span>SAVE: {ballSaveTimer}s</span>
              </div>
            )}

            {/* Mute Toggle */}
            <button
              onClick={() => setIsMuted(prev => !prev)}
              className="p-1 bg-slate-800 hover:bg-slate-700 border-2 border-black rounded text-slate-200"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Tactical Scoreboard Panel */}
        <div className="w-full bg-[#0a0322] px-4 py-2 border-b-4 border-black flex items-center justify-between z-20">
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Score</div>
            <div className="font-mono text-xl sm:text-2xl font-black text-yellow-400 tracking-tight drop-shadow-[0_2px_4px_rgba(255,222,89,0.3)]">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">High Score</div>
              <div className="font-mono text-xs sm:text-sm font-bold text-slate-300">
                {Math.max(score, highScore).toLocaleString()}
              </div>
            </div>

            {/* Ball Counter */}
            <div className="bg-[#1c0847] border-2 border-black px-2.5 py-1 rounded text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[9px] font-black uppercase text-pink-400">BALL</div>
              <div className="font-mono text-sm font-black text-white">{currentBallNum}/3</div>
            </div>
          </div>
        </div>

        {/* Main Canvas Playfield Viewport */}
        <div className="relative w-full aspect-[9/16] max-h-[600px] flex items-center justify-center bg-black overflow-hidden">
          <canvas
            ref={canvasRef}
            width={V_WIDTH}
            height={V_HEIGHT}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* On-Screen Touch / Click Zones for Flippers & Plunger */}
          <div className="absolute inset-0 z-10 flex">
            {/* Left Flipper Touch Area (Left 50%) */}
            <button
              className="w-1/2 h-full opacity-0 active:opacity-10 bg-cyan-400 transition-opacity touch-manipulation cursor-pointer"
              onTouchStart={e => {
                e.preventDefault();
                initAudio();
                if (!isTiltedRef.current) {
                  leftFlipperPressedRef.current = true;
                  playSynthSound('flipper');
                }
              }}
              onTouchEnd={e => {
                e.preventDefault();
                leftFlipperPressedRef.current = false;
              }}
              onMouseDown={() => {
                initAudio();
                if (!isTiltedRef.current) {
                  leftFlipperPressedRef.current = true;
                  playSynthSound('flipper');
                }
              }}
              onMouseUp={() => {
                leftFlipperPressedRef.current = false;
              }}
              aria-label="Left Flipper"
            />

            {/* Right Flipper Touch Area (Right 50%) */}
            <button
              className="w-1/2 h-full opacity-0 active:opacity-10 bg-pink-400 transition-opacity touch-manipulation cursor-pointer"
              onTouchStart={e => {
                e.preventDefault();
                initAudio();
                if (!isTiltedRef.current) {
                  rightFlipperPressedRef.current = true;
                  playSynthSound('flipper');
                }
              }}
              onTouchEnd={e => {
                e.preventDefault();
                rightFlipperPressedRef.current = false;
              }}
              onMouseDown={() => {
                initAudio();
                if (!isTiltedRef.current) {
                  rightFlipperPressedRef.current = true;
                  playSynthSound('flipper');
                }
              }}
              onMouseUp={() => {
                rightFlipperPressedRef.current = false;
              }}
              aria-label="Right Flipper"
            />
          </div>

          {/* Start Screen Overlay */}
          {!isPlaying && !isGameOver && (
            <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-400 border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 animate-bounce">
                <Zap className="w-10 h-10 text-black fill-black" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black uppercase text-yellow-400 tracking-wider mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                NEON FLIPPER
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-300 max-w-xs mb-6">
                Real-time 2D vector pinball physics, reactive solenoids, Cyber pop bumpers, and Multi-Ball Matrix!
              </p>

              <button
                onClick={startGame}
                className="w-full max-w-xs bg-yellow-400 hover:bg-yellow-300 text-black border-4 border-black py-3 px-6 rounded-xl font-black text-base uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-black" />
                LAUNCH BALL
              </button>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
                <span className="bg-slate-800 border border-black px-2 py-0.5 rounded text-white">A / ← Left</span>
                <span className="bg-slate-800 border border-black px-2 py-0.5 rounded text-white">D / → Right</span>
                <span className="bg-slate-800 border border-black px-2 py-0.5 rounded text-white">SPACE Plunger</span>
                <span className="bg-slate-800 border border-black px-2 py-0.5 rounded text-white">W / X Nudge</span>
              </div>
            </div>
          )}

          {/* Game Over Modal */}
          {isGameOver && (
            <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-pink-500 border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3">
                <Trophy className="w-8 h-8 text-black fill-yellow-300" />
              </div>

              <h2 className="text-2xl font-black uppercase text-pink-400 tracking-wider mb-1">
                BALL 3 DRAINED!
              </h2>
              <p className="text-xs font-bold text-slate-400 mb-4">GAME OVER</p>

              <div className="bg-[#140636] border-3 border-black p-4 rounded-xl w-full max-w-xs mb-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black uppercase text-slate-400">Final Score</div>
                <div className="font-mono text-2xl sm:text-3xl font-black text-yellow-400">
                  {score.toLocaleString()}
                </div>
                {score >= highScore && score > 0 && (
                  <div className="mt-1 text-[11px] font-black text-green-400 uppercase tracking-wide flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> NEW HIGH SCORE!
                  </div>
                )}
              </div>

              <button
                onClick={startGame}
                className="w-full max-w-xs bg-yellow-400 hover:bg-yellow-300 text-black border-4 border-black py-3 px-6 rounded-xl font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN (R)
              </button>
            </div>
          )}

          {/* Pause Modal */}
          {isPaused && !isGameOver && (
            <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-2xl font-black uppercase text-yellow-400 tracking-wider mb-4">
                GAME PAUSED
              </h2>
              <button
                onClick={() => {
                  isPausedRef.current = false;
                  setIsPaused(false);
                }}
                className="bg-yellow-400 text-black border-3 border-black py-2 px-6 rounded-lg font-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                RESUME (P)
              </button>
            </div>
          )}
        </div>

        {/* Bottom Mobile Action Bar (Tactical Touch Buttons) */}
        <div className="w-full bg-[#0f0430] border-t-4 border-black p-2.5 flex items-center justify-between gap-2 z-20">
          {/* Nudge Button */}
          <button
            onClick={() => handleNudge('up')}
            disabled={!isPlaying || isPaused || isTilted}
            className="flex-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 disabled:opacity-40 text-slate-200 border-2 border-black py-2 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <Activity className="w-3.5 h-3.5 text-yellow-400" />
            <span>NUDGE</span>
          </button>

          {/* Plunger Pull & Release Button */}
          <button
            onTouchStart={e => {
              e.preventDefault();
              initAudio();
              plungerPressedRef.current = true;
            }}
            onTouchEnd={e => {
              e.preventDefault();
              if (plungerPressedRef.current) {
                plungerPressedRef.current = false;
                const launchPower = 14 + plungerChargeRef.current * 14;
                ballsRef.current.forEach(ball => {
                  if (ball.x > 328 && ball.y > 450) {
                    ball.vy = -launchPower;
                    ball.vx = -1.2;
                    playSynthSound('launch');
                    shakeIntensityRef.current = 4;
                  }
                });
                plungerChargeRef.current = 0;
                setPlungerCompression(0);
              }
            }}
            onMouseDown={() => {
              initAudio();
              plungerPressedRef.current = true;
            }}
            onMouseUp={() => {
              if (plungerPressedRef.current) {
                plungerPressedRef.current = false;
                const launchPower = 14 + plungerChargeRef.current * 14;
                ballsRef.current.forEach(ball => {
                  if (ball.x > 328 && ball.y > 450) {
                    ball.vy = -launchPower;
                    ball.vx = -1.2;
                    playSynthSound('launch');
                    shakeIntensityRef.current = 4;
                  }
                });
                plungerChargeRef.current = 0;
                setPlungerCompression(0);
              }
            }}
            disabled={!isPlaying || isPaused}
            className="flex-1 bg-pink-500 hover:bg-pink-400 active:bg-pink-600 disabled:opacity-40 text-white border-2 border-black py-2 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>PULL SPRING</span>
          </button>
        </div>
      </div>
    </div>
  );
}
