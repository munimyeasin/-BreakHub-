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
  rotation: number;
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
        gain.gain.setValueAtTime(0.35, now);
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
        gain.gain.setValueAtTime(0.1, now);
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
          // Emit orb ring particles in Neo Brutalist palette
          const orbColors = ['#FE90E8', '#F7CB46', '#C0F7FE'];
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            particlesRef.current.push({
              x: obs.x + obs.width / 2,
              y: obs.y + obs.height / 2,
              vx: Math.cos(angle) * 4,
              vy: Math.sin(angle) * 4,
              color: orbColors[i % orbColors.length],
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

      // Add ground dust particles in Neo Brutalist colors
      const dustColors = ['#F7CB46', '#FE90E8', '#C0F7FE'];
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: p.worldX + Math.random() * p.size,
          y: p.y + p.size,
          vx: (Math.random() - 0.5) * 3 - speedRef.current * 0.3,
          vy: -Math.random() * 2,
          color: dustColors[Math.floor(Math.random() * dustColors.length)],
          size: Math.random() * 3 + 2,
          alpha: 1,
        });
      }
    }
  };

  const handleDeath = () => {
    setIsDead(true);
    setIsPlaying(false);
    playSfx('crash');

    const p = playerRef.current;
    // Explode into square fragments with black borders
    const fragColors = ['#FE90E8', '#F7CB46', '#C0F7FE', '#99E885'];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particlesRef.current.push({
        x: p.worldX + p.size / 2,
        y: p.y + p.size / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: fragColors[i % fragColors.length],
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
                  color: '#F7CB46',
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
                  color: '#FE90E8',
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
            alpha: 0.7,
            size: p.size,
            rotation: p.rotation,
          });
          if (trailRef.current.length > 8) trailRef.current.shift();
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

      // ==========================================
      // 2. NEO-BRUTALIST CANVAS 2D RENDERING
      // ==========================================
      const camX = cameraXRef.current;

      // 1. Warm Ground Canvas
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Neo-Brutalist Dot Grid Texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let x = 12; x < CANVAS_WIDTH; x += 24) {
        for (let y = 12; y < GROUND_Y; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Ground Floor (Neo Butter + Black Stripes)
      ctx.fillStyle = '#FFDC8B';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Black Divider
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, GROUND_Y - 2, CANVAS_WIDTH, 4);

      // Moving Diagonal Hatch Pattern on Ground
      const stripeOffset = (camX * 1.0) % 24;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      for (let x = -stripeOffset - 24; x < CANVAS_WIDTH + 24; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 2);
        ctx.lineTo(x - 16, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // 4. DRAW OBSTACLES (Solid Swatches + 2.5px Black Borders + Offset Shadows)
      obstaclesRef.current.forEach(obs => {
        const screenX = obs.x - camX;
        if (screenX < -100 || screenX > CANVAS_WIDTH + 100) return;

        // 1. SPIKES (Neo Pink triangles)
        if (obs.type === 'spike' || obs.type === 'double_spike' || obs.type === 'triple_spike') {
          const spikeCount = obs.type === 'spike' ? 1 : obs.type === 'double_spike' ? 2 : 3;
          const singleW = obs.width / spikeCount;

          for (let s = 0; s < spikeCount; s++) {
            const spX = screenX + s * singleW;

            // Offset Drop Shadow
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(spX + 3, obs.y + obs.height + 2);
            ctx.lineTo(spX + singleW / 2 + 3, obs.y + 2);
            ctx.lineTo(spX + singleW + 3, obs.y + obs.height + 2);
            ctx.closePath();
            ctx.fill();

            // Spike Body
            ctx.fillStyle = '#FE90E8';
            ctx.beginPath();
            ctx.moveTo(spX, obs.y + obs.height);
            ctx.lineTo(spX + singleW / 2, obs.y);
            ctx.lineTo(spX + singleW, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();

            // 2.5px Black Stroke
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
          }
        }

        // 2. SOLID BLOCKS (Neo Ice Cyan Swatches)
        if (obs.type === 'block' || obs.type === 'tall_block') {
          // Hard Shadow
          ctx.fillStyle = '#000000';
          ctx.fillRect(screenX + 3, obs.y + 3, obs.width, obs.height);

          // Block Fill
          ctx.fillStyle = '#C0F7FE';
          ctx.fillRect(screenX, obs.y, obs.width, obs.height);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(screenX, obs.y, obs.width, obs.height);

          // Inner Neo Grid Pattern
          ctx.fillStyle = '#000000';
          ctx.fillRect(screenX + 4, obs.y + 4, 4, 4);
          ctx.fillRect(screenX + obs.width - 8, obs.y + 4, 4, 4);
          ctx.fillRect(screenX + 4, obs.y + obs.height - 8, 4, 4);
          ctx.fillRect(screenX + obs.width - 8, obs.y + obs.height - 8, 4, 4);
        }

        // 3. JUMP PADS (Neo Golden Launch Pads)
        if (obs.type === 'pad') {
          // Hard Shadow
          ctx.fillStyle = '#000000';
          ctx.fillRect(screenX + 2, obs.y + 2, obs.width, obs.height);

          // Pad Fill
          ctx.fillStyle = '#F7CB46';
          ctx.fillRect(screenX, obs.y, obs.width, obs.height);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(screenX, obs.y, obs.width, obs.height);

          // Arrow Up
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(screenX + obs.width / 2, obs.y + 1);
          ctx.lineTo(screenX + obs.width / 2 - 5, obs.y + obs.height - 2);
          ctx.lineTo(screenX + obs.width / 2 + 5, obs.y + obs.height - 2);
          ctx.closePath();
          ctx.fill();
        }

        // 4. JUMP ORBS (Neo Pink / Yellow Rings)
        if (obs.type === 'orb') {
          // Outer Ring Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(screenX + obs.width / 2 + 2, obs.y + obs.height / 2 + 2, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();

          // Outer Ring Fill
          ctx.fillStyle = '#F7CB46';
          ctx.beginPath();
          ctx.arc(screenX + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#000000';
          ctx.stroke();

          // Center Core
          ctx.fillStyle = '#FE90E8';
          ctx.beginPath();
          ctx.arc(screenX + obs.width / 2, obs.y + obs.height / 2, obs.width / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#000000';
          ctx.stroke();
        }

        // 5. SECRET GOLD COIN
        if (obs.type === 'coin' && !obs.collected) {
          const coinBounce = Math.sin(Date.now() / 200) * 3;
          const cy = obs.y + obs.height / 2 + coinBounce;
          const cx = screenX + obs.width / 2;

          // Shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(cx + 2, cy + 2, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();

          // Coin
          ctx.fillStyle = '#F7CB46';
          ctx.beginPath();
          ctx.arc(cx, cy, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#000000';
          ctx.stroke();

          // Star
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', cx, cy);
        }
      });

      // 5. DRAW PLAYER TRAIL (Pastel Ghost Blocks)
      trailRef.current.forEach(tn => {
        const sx = tn.x - camX;
        ctx.save();
        ctx.translate(sx + tn.size / 2, tn.y + tn.size / 2);
        ctx.rotate(tn.rotation);
        ctx.fillStyle = `rgba(254, 144, 232, ${tn.alpha * 0.4})`;
        ctx.fillRect(-tn.size / 2, -tn.size / 2, tn.size, tn.size);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(0, 0, 0, ${tn.alpha * 0.5})`;
        ctx.strokeRect(-tn.size / 2, -tn.size / 2, tn.size, tn.size);
        ctx.restore();
      });

      // 6. DRAW PLAYER CUBE (Neo-Brutalist Yellow Cube + Black Face)
      if (!isDead) {
        const screenPx = p.worldX - camX;
        ctx.save();
        ctx.translate(screenPx + p.size / 2, p.y + p.size / 2);
        ctx.rotate(p.rotation);

        // Hard Drop Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(-p.size / 2 + 3, -p.size / 2 + 3, p.size, p.size);

        // Yellow Cube Body
        ctx.fillStyle = '#F7CB46';
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);

        // Pixel Face (Eyes & Mouth)
        ctx.fillStyle = '#000000';
        ctx.fillRect(-8, -6, 5, 6);
        ctx.fillRect(3, -6, 5, 6);
        ctx.fillRect(-5, 4, 10, 3);

        ctx.restore();
      }

      // 7. DRAW PARTICLES (Hard Outlined Shapes)
      particlesRef.current.forEach(pt => {
        const sx = pt.x - camX;
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        if (pt.rotation !== undefined) {
          ctx.translate(sx, pt.y);
          ctx.rotate(pt.rotation);
          ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
        } else {
          ctx.beginPath();
          ctx.arc(sx, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#000000';
          ctx.stroke();
        }
        ctx.restore();
      });

      // 8. FINISH LINE BANNER
      const finishScreenX = TOTAL_LEVEL_LENGTH - camX;
      if (finishScreenX < CANVAS_WIDTH + 50 && finishScreenX > -50) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(finishScreenX + 3, 0, 8, GROUND_Y);
        ctx.fillStyle = '#99E885'; // Neo Green
        ctx.fillRect(finishScreenX, 0, 8, GROUND_Y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(finishScreenX, 0, 8, GROUND_Y);

        ctx.fillStyle = '#000000';
        ctx.font = '900 13px sans-serif';
        ctx.fillText('✦ FINISH ✦', finishScreenX - 35, 40);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isDead, isComplete]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* 1. Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2 shadow-neo-sm">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-portal-pink px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
            <Flame className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span className="text-[10px] uppercase tracking-wider">Att</span>
            <span className="text-xs font-black">{attempt}</span>
          </div>

          <div className="flex items-center gap-1 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
            <Award className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span className="text-xs font-black">{coinsCollected}/3</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-portal-cyan px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
            <span className="text-[10px] uppercase tracking-wider">Best</span>
            <span className="text-xs font-black">{highPercent}%</span>
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

      {/* 2. Neo-Brutalist Progress Bar */}
      <div className="w-full bg-white rounded-lg h-3.5 border-2 border-black overflow-hidden mb-2 p-0.5 shadow-neo-xs">
        <div
          className="h-full bg-portal-pink rounded-sm border-r-2 border-black transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3. Main Screen Canvas (9:16 Aspect Ratio Frame) with Figma Handles */}
      <div
        className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl border-4 border-black overflow-hidden shadow-neo-lg cursor-pointer flex items-center justify-center"
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
        {/* Figma Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {/* START OVERLAY */}
        {!isPlaying && !isDead && !isComplete && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-4 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div className="w-14 h-14 rounded-2xl bg-portal-yellow border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
                <Zap className="w-7 h-7 fill-black stroke-[2.5]" />
              </div>

              <div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                  • [ RHYTHM RUNNER ] •
                </div>
                <h3 className="text-xl font-black text-black tracking-tight uppercase">
                  Geometry Dash
                </h3>
                <p className="text-[11px] font-bold text-slate-700 mt-1">
                  Rhythm cube runner! Jump over spikes, launch off pads, and tap yellow gravity rings mid-air.
                </p>
              </div>

              <button
                type="button"
                onClick={() => initGame(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                <span>START RUN</span>
              </button>
            </div>
          </div>
        )}

        {/* DEATH OVERLAY */}
        {isDead && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div className="inline-block px-3 py-1 rounded-md bg-portal-pink border-2 border-black text-black text-[11px] font-black uppercase tracking-wider shadow-neo-xs">
                💥 CRASHED! 💥
              </div>

              <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Progress Reached</div>
                <div className="text-3xl font-black text-black tracking-tight">{progressPercent}%</div>
                <div className="text-[11px] font-bold text-slate-800">
                  Score: {progressPercent * 50 + coinsCollected * 500} PTS
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAttempt(prev => prev + 1);
                  initGame();
                }}
                className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[3]" />
                <span>RETRY (ATTEMPT {attempt + 1})</span>
              </button>
            </div>
          </div>
        )}

        {/* VICTORY OVERLAY */}
        {isComplete && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div className="w-14 h-14 rounded-2xl bg-portal-green border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
                <Trophy className="w-7 h-7 stroke-[2.5]" />
              </div>

              <div>
                <div className="inline-block px-3 py-1 rounded-md bg-portal-green border-2 border-black text-black text-[11px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                  🏆 100% LEVEL COMPLETE! 🏆
                </div>
                <h3 className="text-xl font-black text-black tracking-tight uppercase">
                  Perfect Run!
                </h3>
                <p className="text-[11px] font-bold text-slate-700 mt-1">
                  Completed in attempt {attempt} • Coins Collected: {coinsCollected}/3
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAttempt(1);
                  initGame(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[3]" />
                <span>PLAY AGAIN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch / Click hint */}
      <div className="text-[10px] text-slate-700 font-black uppercase tracking-wider text-center mt-2">
        🕹️ Tap screen or press <kbd className="px-1.5 py-0.5 rounded bg-white border-2 border-black text-black font-mono shadow-neo-xs">Space</kbd> to Jump
      </div>
    </div>
  );
}
