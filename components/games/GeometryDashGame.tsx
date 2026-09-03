'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Zap, Flame, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GeometryDashGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const CANVAS_WIDTH = 360; // 9:16 Vertical Portrait Ratio (360x640)
const CANVAS_HEIGHT = 640;
const GROUND_Y = 520;
const TOTAL_LEVEL_LENGTH = 7500; // in world X distance

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  rotation?: number;
  vRot?: number;
}

interface TrailNode {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

interface Obstacle {
  x: number;
  y: number;
  type: 'spike' | 'double_spike' | 'triple_spike' | 'block' | 'tall_block' | 'pad' | 'orb' | 'coin';
  width: number;
  height: number;
  collected?: boolean;
}

export default function GeometryDashGame({ gameId, onGameOver }: GeometryDashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [progressPercent, setProgressPercent] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highPercent, setHighPercent] = useState(0);

  // Audio Context ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Core Game State Refs
  const cameraXRef = useRef(0);
  const speedRef = useRef(5.5);
  const isHoldingJumpRef = useRef(false);

  // Player state
  const playerRef = useRef({
    x: 100, // screen X relative offset
    worldX: 100,
    y: GROUND_Y - 28,
    size: 28,
    vy: 0,
    isGrounded: true,
    rotation: 0,
    targetRotation: 0,
    currentPlatformY: GROUND_Y,
  });

  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<TrailNode[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);

  // Sound Synthesizer using Web Audio API
  const playSfx = useCallback((type: 'jump' | 'pad' | 'orb' | 'coin' | 'crash' | 'win' | 'beat') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'pad' || type === 'orb') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        osc.frequency.setValueAtTime(1174, now + 0.16);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.15);
        osc.frequency.setValueAtTime(783, now + 0.3);
        osc.frequency.setValueAtTime(1046, now + 0.45);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (type === 'beat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {}
  }, [soundEnabled]);

  // Generate Geometry Dash Level Layout
  const generateLevel = () => {
    const list: Obstacle[] = [];
    const pushObstacle = (x: number, y: number, type: Obstacle['type'], width: number, height: number) => {
      list.push({ x, y, type, width, height });
    };

    // 1. Initial warm-up
    pushObstacle(500, GROUND_Y - 26, 'spike', 24, 26);
    pushObstacle(750, GROUND_Y - 26, 'spike', 24, 26);
    pushObstacle(1000, GROUND_Y - 26, 'double_spike', 48, 26);

    // 2. First block platforms
    pushObstacle(1250, GROUND_Y - 32, 'block', 32, 32);
    pushObstacle(1400, GROUND_Y - 32, 'block', 32, 32);
    pushObstacle(1432, GROUND_Y - 32, 'block', 32, 32);
    pushObstacle(1416, GROUND_Y - 26 - 32, 'coin', 20, 20); // Coin 1 above blocks

    pushObstacle(1650, GROUND_Y - 26, 'double_spike', 48, 26);

    // 3. Jump Pad sequence
    pushObstacle(1900, GROUND_Y - 10, 'pad', 30, 10);
    pushObstacle(2050, GROUND_Y - 26, 'triple_spike', 72, 26);
    pushObstacle(2150, GROUND_Y - 60, 'block', 64, 30);

    // 4. Stepping blocks with spikes beneath
    pushObstacle(2400, GROUND_Y - 26, 'double_spike', 48, 26);
    pushObstacle(2400, GROUND_Y - 64, 'block', 64, 28);
    pushObstacle(2600, GROUND_Y - 96, 'block', 64, 28);
    pushObstacle(2800, GROUND_Y - 64, 'block', 64, 28);
    pushObstacle(2820, GROUND_Y - 26, 'spike', 24, 26);

    // 5. Jump Orb Section
    pushObstacle(3100, GROUND_Y - 26, 'triple_spike', 72, 26);
    pushObstacle(3136, GROUND_Y - 80, 'orb', 28, 28);
    pushObstacle(3350, GROUND_Y - 26, 'double_spike', 48, 26);
    pushObstacle(3374, GROUND_Y - 80, 'orb', 28, 28);
    pushObstacle(3550, GROUND_Y - 40, 'block', 60, 40);
    pushObstacle(3570, GROUND_Y - 75, 'coin', 20, 20); // Coin 2

    // 6. Rapid rhythm section
    pushObstacle(3850, GROUND_Y - 26, 'spike', 24, 26);
    pushObstacle(4050, GROUND_Y - 26, 'double_spike', 48, 26);
    pushObstacle(4250, GROUND_Y - 10, 'pad', 30, 10);
    pushObstacle(4400, GROUND_Y - 80, 'block', 90, 28);
    pushObstacle(4430, GROUND_Y - 106, 'spike', 24, 26); // Spike on top of block!
    pushObstacle(4600, GROUND_Y - 26, 'triple_spike', 72, 26);

    // 7. High altitude stair climb
    pushObstacle(4850, GROUND_Y - 32, 'block', 32, 32);
    pushObstacle(4980, GROUND_Y - 64, 'block', 32, 32);
    pushObstacle(5110, GROUND_Y - 96, 'block', 32, 32);
    pushObstacle(5240, GROUND_Y - 128, 'block', 48, 32);
    pushObstacle(5250, GROUND_Y - 165, 'coin', 20, 20); // Coin 3 (Secret high coin)
    pushObstacle(5400, GROUND_Y - 26, 'triple_spike', 72, 26);

    // 8. Final Climax Gauntlet
    pushObstacle(5650, GROUND_Y - 10, 'pad', 30, 10);
    pushObstacle(5800, GROUND_Y - 90, 'orb', 28, 28);
    pushObstacle(6000, GROUND_Y - 90, 'orb', 28, 28);
    pushObstacle(6200, GROUND_Y - 40, 'block', 80, 40);
    pushObstacle(6400, GROUND_Y - 26, 'double_spike', 48, 26);
    pushObstacle(6600, GROUND_Y - 26, 'triple_spike', 72, 26);
    pushObstacle(6800, GROUND_Y - 26, 'double_spike', 48, 26);
    pushObstacle(7000, GROUND_Y - 26, 'spike', 24, 26);

    return list;
  };

  const initGame = (resetAttempts = false) => {
    playerRef.current = {
      x: 100,
      worldX: 100,
      y: GROUND_Y - 28,
      size: 28,
      vy: 0,
      isGrounded: true,
      rotation: 0,
      targetRotation: 0,
      currentPlatformY: GROUND_Y,
    };
    cameraXRef.current = 0;
    particlesRef.current = [];
    trailRef.current = [];
    obstaclesRef.current = generateLevel();
    setIsDead(false);
    setIsComplete(false);
    setProgressPercent(0);
    setCoinsCollected(0);
    if (resetAttempts) setAttempt(1);
    setIsPlaying(true);
  };

  // Jump trigger
  const triggerJump = () => {
    const p = playerRef.current;
    if (isDead || isComplete) return;

    // Check if near an orb
    let hitOrb = false;
    obstaclesRef.current.forEach(obs => {
      if (obs.type === 'orb') {
        const dx = (p.worldX + p.size / 2) - (obs.x + obs.width / 2);
        const dy = (p.y + p.size / 2) - (obs.y + obs.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 42) {
          hitOrb = true;
          p.vy = -10.5;
          p.isGrounded = false;
          playSfx('orb');
          // Emit orb ring particles
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            particlesRef.current.push({
              x: obs.x + obs.width / 2,
              y: obs.y + obs.height / 2,
              vx: Math.cos(angle) * 4,
              vy: Math.sin(angle) * 4,
              color: '#FFD700',
              size: 4,
              alpha: 1,
            });
          }
        }
      }
    });

    if (hitOrb) return;

    if (p.isGrounded) {
      p.vy = -9.8;
      p.isGrounded = false;
      playSfx('jump');

      // Add ground dust particles
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: p.worldX + Math.random() * p.size,
          y: p.y + p.size,
          vx: (Math.random() - 0.5) * 3 - speedRef.current * 0.3,
          vy: -Math.random() * 2,
          color: '#00F0FF',
          size: Math.random() * 3 + 2,
          alpha: 0.8,
        });
      }
    }
  };

  const handleDeath = () => {
    setIsDead(true);
    setIsPlaying(false);
    playSfx('crash');

    const p = playerRef.current;
    // Explode into square fragments
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particlesRef.current.push({
        x: p.worldX + p.size / 2,
        y: p.y + p.size / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 3 === 0 ? '#00F0FF' : i % 3 === 1 ? '#FFD700' : '#FF0055',
        size: Math.random() * 6 + 3,
        alpha: 1,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.4,
      });
    }

    const currentPercent = Math.min(100, Math.floor((p.worldX / TOTAL_LEVEL_LENGTH) * 100));
    const finalScore = currentPercent * 50 + coinsCollected * 500;
    setHighPercent(prev => Math.max(prev, currentPercent));
    setTimeout(() => onGameOver(finalScore), 0);
  };

  const handleVictory = () => {
    setIsComplete(true);
    setIsPlaying(false);
    playSfx('win');
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

    const finalScore = 100 * 50 + coinsCollected * 500 + 2000;
    setHighPercent(100);
    setTimeout(() => onGameOver(finalScore), 0);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        isHoldingJumpRef.current = true;
        if (!isPlaying && (isDead || isComplete)) {
          setAttempt(prev => prev + 1);
          initGame();
        } else if (!isPlaying && !isDead) {
          initGame();
        } else {
          triggerJump();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        isHoldingJumpRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isDead, isComplete]);

  // Main Canvas Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let beatCounter = 0;

    const render = () => {
      const p = playerRef.current;

      // 1. UPDATE GAME LOGIC
      if (isPlaying && !isDead && !isComplete) {
        // Horizontal Movement
        p.worldX += speedRef.current;
        cameraXRef.current = p.worldX - 100;

        // Progress Calculation
        const curPercent = Math.min(100, Math.floor((p.worldX / TOTAL_LEVEL_LENGTH) * 100));
        setProgressPercent(curPercent);

        if (p.worldX >= TOTAL_LEVEL_LENGTH) {
          handleVictory();
          return;
        }

        // Jump continuous hold
        if (isHoldingJumpRef.current && p.isGrounded) {
          triggerJump();
        }

        // Gravity & Physics
        const GRAVITY = 0.58;
        p.vy += GRAVITY;
        p.y += p.vy;

        // Platform & Obstacle Collisions
        let onAnyPlatform = false;
        let highestLandY = GROUND_Y;

        for (const obs of obstaclesRef.current) {
          // Optimization: skip far obstacles
          if (obs.x > p.worldX + 500 || obs.x + obs.width < p.worldX - 200) continue;

          // COIN COLLECTION
          if (obs.type === 'coin' && !obs.collected) {
            const dx = (p.worldX + p.size / 2) - (obs.x + obs.width / 2);
            const dy = (p.y + p.size / 2) - (obs.y + obs.height / 2);
            if (Math.hypot(dx, dy) < 26) {
              obs.collected = true;
              setCoinsCollected(c => c + 1);
              playSfx('coin');
              for (let i = 0; i < 10; i++) {
                particlesRef.current.push({
                  x: obs.x + 10,
                  y: obs.y + 10,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  color: '#FFD700',
                  size: 3,
                  alpha: 1,
                });
              }
            }
          }

          // JUMP PAD TRIGGER
          if (obs.type === 'pad') {
            if (
              p.worldX + p.size > obs.x &&
              p.worldX < obs.x + obs.width &&
              p.y + p.size >= obs.y &&
              p.y + p.size <= obs.y + obs.height + 10 &&
              p.vy > 0
            ) {
              p.y = obs.y - p.size;
              p.vy = -13.5; // Super launch jump
              p.isGrounded = false;
              playSfx('pad');
              for (let i = 0; i < 8; i++) {
                particlesRef.current.push({
                  x: obs.x + obs.width / 2,
                  y: obs.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -Math.random() * 5 - 2,
                  color: '#FF00FF',
                  size: 3,
                  alpha: 1,
                });
              }
            }
          }

          // SOLID BLOCKS
          if (obs.type === 'block' || obs.type === 'tall_block') {
            const playerBox = {
              left: p.worldX + 2,
              right: p.worldX + p.size - 2,
              top: p.y + 2,
              bottom: p.y + p.size,
            };
            const obsBox = {
              left: obs.x,
              right: obs.x + obs.width,
              top: obs.y,
              bottom: obs.y + obs.height,
            };

            // Check if player lands on top of block
            if (
              playerBox.right > obsBox.left + 5 &&
              playerBox.left < obsBox.right - 5 &&
              playerBox.bottom >= obsBox.top &&
              playerBox.bottom <= obsBox.top + 16 &&
              p.vy >= 0
            ) {
              onAnyPlatform = true;
              highestLandY = obsBox.top;
              p.y = obsBox.top - p.size;
              p.vy = 0;
              p.isGrounded = true;
            } else if (
              // Side or bottom crash into block = DEAD
              playerBox.right > obsBox.left &&
              playerBox.left < obsBox.right &&
              playerBox.bottom > obsBox.top + 6 &&
              playerBox.top < obsBox.bottom
            ) {
              handleDeath();
              return;
            }
          }

          // SPIKE LETHAL COLLISION
          if (obs.type === 'spike' || obs.type === 'double_spike' || obs.type === 'triple_spike') {
            // Triangle hitbox approximation
            const padH = 6;
            const padV = 5;
            if (
              p.worldX + p.size - padH > obs.x + padH &&
              p.worldX + padH < obs.x + obs.width - padH &&
              p.y + p.size > obs.y + padV &&
              p.y < obs.y + obs.height
            ) {
              handleDeath();
              return;
            }
          }
        }

        // Ground collision
        if (!onAnyPlatform) {
          if (p.y >= GROUND_Y - p.size) {
            p.y = GROUND_Y - p.size;
            p.vy = 0;
            p.isGrounded = true;
          } else {
            p.isGrounded = false;
          }
        }

        // Rotation physics: Rotate 90° smoothly while airborne
        if (!p.isGrounded) {
          p.rotation += 0.16;
        } else {
          // Snap rotation to nearest 90 degrees (Math.PI / 2)
          const step = Math.PI / 2;
          p.rotation = Math.round(p.rotation / step) * step;
        }

        // Trail emission
        beatCounter++;
        if (beatCounter % 3 === 0) {
          trailRef.current.push({
            x: p.worldX,
            y: p.y,
            alpha: 0.6,
            size: p.size,
          });
          if (trailRef.current.length > 12) trailRef.current.shift();
        }

        // Rhythmic background beat
        if (beatCounter % 30 === 0) {
          playSfx('beat');
        }
      }

      // Update Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.025;
        if (pt.rotation !== undefined && pt.vRot !== undefined) {
          pt.rotation += pt.vRot;
        }
        if (pt.alpha <= 0) particlesRef.current.splice(i, 1);
      }

      // 2. DRAW RENDERING
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const camX = cameraXRef.current;

      // Dynamic Gradient Background based on level progress
      const hueShift = Math.floor((p.worldX / TOTAL_LEVEL_LENGTH) * 160);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, `hsl(${220 + hueShift}, 60%, 8%)`);
      bgGrad.addColorStop(1, `hsl(${260 + hueShift}, 70%, 14%)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cyber Grid lines (Parallax)
      ctx.strokeStyle = `hsla(${200 + hueShift}, 80%, 60%, 0.12)`;
      ctx.lineWidth = 1;
      const gridOffset = (camX * 0.4) % 40;
      for (let x = -gridOffset; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GROUND_Y);
        ctx.stroke();
      }
      for (let y = 0; y < GROUND_Y; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Ground Floor
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, '#0E0922');
      groundGrad.addColorStop(1, '#05030A');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Neon Top Border of Ground
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Ground Hazard Stripes (Moving)
      const stripeOffset = (camX * 1.0) % 30;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 3;
      for (let x = -stripeOffset - 30; x < CANVAS_WIDTH + 30; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x + 20, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // DRAW OBSTACLES
      obstaclesRef.current.forEach(obs => {
        const screenX = obs.x - camX;
        if (screenX < -100 || screenX > CANVAS_WIDTH + 100) return;

        // 1. SPIKES
        if (obs.type === 'spike' || obs.type === 'double_spike' || obs.type === 'triple_spike') {
          const spikeCount = obs.type === 'spike' ? 1 : obs.type === 'double_spike' ? 2 : 3;
          const singleW = obs.width / spikeCount;

          for (let s = 0; s < spikeCount; s++) {
            const spX = screenX + s * singleW;
            ctx.fillStyle = 'rgba(255, 0, 85, 0.25)';
            ctx.beginPath();
            ctx.moveTo(spX, obs.y + obs.height);
            ctx.lineTo(spX + singleW / 2, obs.y);
            ctx.lineTo(spX + singleW, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();

            // Neon glowing outline
            ctx.strokeStyle = '#FF0055';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#FF0055';
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Inner core
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(spX + singleW / 2, obs.y + 4);
            ctx.lineTo(spX + singleW / 2 - 2, obs.y + 12);
            ctx.lineTo(spX + singleW / 2 + 2, obs.y + 12);
            ctx.closePath();
            ctx.fill();
          }
        }

        // 2. SOLID BLOCKS
        if (obs.type === 'block' || obs.type === 'tall_block') {
          ctx.fillStyle = '#1A1438';
          ctx.fillRect(screenX, obs.y, obs.width, obs.height);

          // Neon Border
          ctx.strokeStyle = '#9D00FF';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#9D00FF';
          ctx.shadowBlur = 6;
          ctx.strokeRect(screenX, obs.y, obs.width, obs.height);
          ctx.shadowBlur = 0;

          // Inner cross pattern
          ctx.strokeStyle = 'rgba(157, 0, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(screenX + 4, obs.y + 4);
          ctx.lineTo(screenX + obs.width - 4, obs.y + obs.height - 4);
          ctx.moveTo(screenX + obs.width - 4, obs.y + 4);
          ctx.lineTo(screenX + 4, obs.y + obs.height - 4);
          ctx.stroke();
        }

        // 3. JUMP PADS (Neon Pink launch pads)
        if (obs.type === 'pad') {
          ctx.fillStyle = '#FF00FF';
          ctx.shadowColor = '#FF00FF';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.ellipse(screenX + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Glowing upward arrow
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(screenX + obs.width / 2, obs.y - 2);
          ctx.lineTo(screenX + obs.width / 2 - 6, obs.y + 6);
          ctx.lineTo(screenX + obs.width / 2 + 6, obs.y + 6);
          ctx.closePath();
          ctx.fill();
        }

        // 4. JUMP ORBS (Yellow Gravity Rings)
        if (obs.type === 'orb') {
          const oscScale = Math.sin(Date.now() / 150) * 2;
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(screenX + obs.width / 2, obs.y + obs.height / 2, obs.width / 2 + oscScale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
          ctx.beginPath();
          ctx.arc(screenX + obs.width / 2, obs.y + obs.height / 2, obs.width / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // 5. SECRET GOLD COIN
        if (obs.type === 'coin' && !obs.collected) {
          const coinBounce = Math.sin(Date.now() / 200) * 3;
          ctx.fillStyle = '#FFD700';
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(screenX + obs.width / 2, obs.y + obs.height / 2 + coinBounce, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', screenX + obs.width / 2, obs.y + obs.height / 2 + coinBounce);
          ctx.shadowBlur = 0;
        }
      });

      // DRAW PLAYER TRAIL
      trailRef.current.forEach(tn => {
        const sx = tn.x - camX;
        ctx.save();
        ctx.fillStyle = `rgba(0, 240, 255, ${tn.alpha * 0.4})`;
        ctx.fillRect(sx, tn.y, tn.size, tn.size);
        ctx.restore();
      });

      // DRAW PLAYER CUBE
      if (!isDead) {
        const screenPx = p.worldX - camX;
        ctx.save();
        ctx.translate(screenPx + p.size / 2, p.y + p.size / 2);
        ctx.rotate(p.rotation);

        // Outer Neon Cube Body
        ctx.fillStyle = '#00F0FF';
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 14;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.shadowBlur = 0;

        // Inner Dark Border
        ctx.fillStyle = '#0B0819';
        ctx.fillRect(-p.size / 2 + 3, -p.size / 2 + 3, p.size - 6, p.size - 6);

        // Core Glowing Eyes / Face
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-6, -6, 4, 6);
        ctx.fillRect(2, -6, 4, 6);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(-4, 3, 8, 3);

        ctx.restore();
      }

      // DRAW PARTICLES
      particlesRef.current.forEach(pt => {
        const sx = pt.x - camX;
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        if (pt.rotation !== undefined) {
          ctx.translate(sx, pt.y);
          ctx.rotate(pt.rotation);
          ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
        } else {
          ctx.beginPath();
          ctx.arc(sx, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // FINISH LINE BANNER
      const finishScreenX = TOTAL_LEVEL_LENGTH - camX;
      if (finishScreenX < CANVAS_WIDTH + 50 && finishScreenX > -50) {
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00FF66';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(finishScreenX, 0);
        ctx.lineTo(finishScreenX, GROUND_Y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#00FF66';
        ctx.font = 'black 14px sans-serif';
        ctx.fillText('FINISH', finishScreenX - 25, 40);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isDead, isComplete]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* 1. HUD & STATS - Ultra Slim */}
      <div className="w-full flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md text-xs font-bold text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-portal-cyan font-black flex items-center gap-1 text-[11px]">
            <Flame className="w-3 h-3 text-portal-cyan animate-pulse" />
            ATTEMPT {attempt}
          </span>
          <span className="text-amber-400 font-bold flex items-center gap-0.5 text-[11px]">
            <Award className="w-3 h-3" />
            {coinsCollected}/3
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px]">
            Best: <strong className="text-portal-gold">{highPercent}%</strong>
          </span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60"
          >
            {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 2. PROGRESS BAR - Ultra Slim */}
      <div className="w-full bg-portal-card rounded-full h-2 border border-portal-border/80 overflow-hidden mb-1.5 relative">
        <div
          className="h-full bg-gradient-to-r from-portal-cyan via-purple-500 to-emerald-400 transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3. MAIN CANVAS CONTAINER (9:16 Portrait) */}
      <div
        className="relative w-full aspect-[9/16] bg-portal-bg rounded-2xl border-2 border-portal-border overflow-hidden shadow-2xl cursor-pointer flex items-center justify-center"
        onMouseDown={(e) => {
          e.preventDefault();
          isHoldingJumpRef.current = true;
          if (!isPlaying && (isDead || isComplete)) {
            setAttempt(prev => prev + 1);
            initGame();
          } else if (!isPlaying && !isDead) {
            initGame();
          } else {
            triggerJump();
          }
        }}
        onMouseUp={() => { isHoldingJumpRef.current = false; }}
        onTouchStart={(e) => {
          e.preventDefault();
          isHoldingJumpRef.current = true;
          if (!isPlaying && (isDead || isComplete)) {
            setAttempt(prev => prev + 1);
            initGame();
          } else if (!isPlaying && !isDead) {
            initGame();
          } else {
            triggerJump();
          }
        }}
        onTouchEnd={() => { isHoldingJumpRef.current = false; }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {/* START OVERLAY */}
        {!isPlaying && !isDead && !isComplete && (
          <div className="absolute inset-0 bg-portal-bg/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-portal-cyan/20 border-2 border-portal-cyan flex items-center justify-center shadow-glow-cyan">
              <Zap className="w-8 h-8 text-portal-cyan fill-portal-cyan" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                GEOMETRY <span className="text-portal-cyan">DASH</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                Rhythm cube runner! Jump over neon spikes, launch off jump pads, and tap yellow rings mid-air.
              </p>
            </div>
            <button
              onClick={() => initGame(true)}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-portal-cyan to-blue-600 text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-black" /> START RUN
            </button>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Spacebar / Click / Touch to Jump
            </p>
          </div>
        )}

        {/* DEATH OVERLAY */}
        {isDead && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 animate-scaleIn">
            <div className="text-rose-500 font-black text-3xl tracking-wider uppercase">
              💥 CRASHED!
            </div>
            <div className="text-base font-black text-slate-200">
              Progress: <span className="text-portal-cyan text-lg">{progressPercent}%</span>
            </div>
            <p className="text-xs text-slate-400">
              Score: <strong className="text-portal-gold">{progressPercent * 50 + coinsCollected * 500} PTS</strong>
            </p>
            <button
              onClick={() => {
                setAttempt(prev => prev + 1);
                initGame();
              }}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-portal-cyan text-black font-black text-xs shadow-glow-cyan active:scale-95 transition-all mt-2"
            >
              <RotateCcw className="w-4 h-4" /> RETRY (ATTEMPT {attempt + 1})
            </button>
          </div>
        )}

        {/* VICTORY OVERLAY */}
        {isComplete && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-scaleIn">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(52,211,153,0.5)]">
              <Trophy className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-emerald-400 tracking-tight">
                100% LEVEL COMPLETE! 🏆
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Attempt {attempt} • Coins Collected: {coinsCollected}/3
              </p>
            </div>
            <button
              onClick={() => {
                setAttempt(1);
                initGame(true);
              }}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black text-xs shadow-glow-cyan active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Touch / Click hint */}
      <div className="text-[11px] text-slate-500 text-center mt-2 font-semibold">
        🕹️ Tap screen or press <kbd className="px-1.5 py-0.5 rounded bg-portal-card border border-portal-border text-portal-cyan font-mono">Space</kbd> to Jump
      </div>
    </div>
  );
}
