'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Gamepad2,
  Home,
  Zap,
  Terminal,
  AlertTriangle,
  Trophy,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Radio,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export default function OfflineClientView() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Mini-game physics state refs
  const gameStateRef = useRef({
    player: {
      x: 40,
      y: 140,
      width: 24,
      height: 28,
      vy: 0,
      jumpForce: -10.5,
      gravity: 0.52,
      groundY: 140,
      isGrounded: true,
      legAnim: 0,
    },
    obstacles: [] as Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      type: 'spike' | 'firewall' | 'drone';
      color: string;
    }>,
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      maxLife: number;
    }>,
    stars: [] as Array<{ x: number; y: number; speed: number; size: number }>,
    groundOffset: 0,
    speed: 4.2,
    score: 0,
    nextSpawn: 80,
    isAlive: true,
    lastTime: 0,
  });

  // Load high score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('breakhub_offline_highscore');
      if (saved) {
        setHighScore(parseInt(saved, 10) || 0);
      }
    } catch {
      // Ignore storage errors in private browsing
    }

    // Check initial online status
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        setPingStatus('success');
        playSfx('reconnect');
      };

      const handleOffline = () => {
        setIsOnline(false);
        setPingStatus('idle');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Web Audio Synth for offline retro sound effects
  const playSfx = useCallback(
    (type: 'jump' | 'score' | 'gameover' | 'reconnect' | 'click') => {
      if (!soundEnabled || typeof window === 'undefined') return;

      try {
        if (!audioCtxRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            audioCtxRef.current = new AudioCtx();
          }
        }

        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const now = ctx.currentTime;

        if (type === 'jump') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(480, now + 0.12);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'score') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880, now + 0.08); // A5
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.18);
        } else if (type === 'gameover') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'reconnect') {
          // Cheerful victory arpeggio: C5 -> E5 -> G5 -> C6
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.15, now + idx * 0.07);
            gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.07 + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.14);
          });
        } else if (type === 'click') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(700, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        }
      } catch {
        // Ignore audio failures
      }
    },
    [soundEnabled]
  );

  // Jump Action
  const triggerJump = useCallback(() => {
    const s = gameStateRef.current;
    if (!gameStarted || gameOver) {
      // Start/Restart Game
      startMiniGame();
      return;
    }

    if (s.player.isGrounded && s.isAlive) {
      s.player.vy = s.player.jumpForce;
      s.player.isGrounded = false;
      playSfx('jump');

      // Add jump puff particles
      for (let i = 0; i < 6; i++) {
        s.particles.push({
          x: s.player.x + 12 + (Math.random() - 0.5) * 12,
          y: s.player.groundY + s.player.height,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 2,
          size: Math.random() * 3 + 2,
          color: Math.random() > 0.5 ? '#00F0FF' : '#FFE600',
          life: 0,
          maxLife: 15,
        });
      }
    }
  }, [gameStarted, gameOver, playSfx]);

  // Keyboard handler for jump & restart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        triggerJump();
      } else if (e.code === 'KeyR' && gameOver) {
        startMiniGame();
      } else if (e.code === 'KeyM') {
        setSoundEnabled((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerJump, gameOver]);

  // Start / Reset Mini-Game
  const startMiniGame = () => {
    const s = gameStateRef.current;
    s.player.y = 140;
    s.player.vy = 0;
    s.player.isGrounded = true;
    s.obstacles = [];
    s.particles = [];
    s.speed = 4.5;
    s.score = 0;
    s.nextSpawn = 60;
    s.isAlive = true;
    s.lastTime = performance.now();

    // Initialize starry backdrop
    if (s.stars.length === 0) {
      for (let i = 0; i < 30; i++) {
        s.stars.push({
          x: Math.random() * 560,
          y: Math.random() * 150,
          speed: Math.random() * 0.8 + 0.4,
          size: Math.random() * 2 + 1,
        });
      }
    }

    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    playSfx('click');
  };

  // Canvas Game Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = (time: number) => {
      if (!running) return;

      const s = gameStateRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const groundY = 168;
      s.player.groundY = groundY - s.player.height;

      // Clear Canvas
      ctx.fillStyle = '#0B0819';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Starfield Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      s.stars.forEach((star) => {
        if (s.isAlive && gameStarted) {
          star.x -= star.speed * (s.speed / 4);
          if (star.x < 0) star.x = width;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // 2. Draw Retro Cyber Grid Horizon
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let x = (s.groundOffset % 30); x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x - 20, height);
        ctx.stroke();
      }

      // Ground Line (Neon Cyan Glowing Wire)
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // Ground Base Fill
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#130F26';
      ctx.fillRect(0, groundY + 2, width, height - groundY);

      // Update Game Logic if Playing
      if (gameStarted && s.isAlive) {
        s.groundOffset -= s.speed;
        s.score += 0.15;
        const currentScore = Math.floor(s.score);
        setScore(currentScore);

        // Gradually increase speed
        s.speed = 4.5 + Math.min(s.score * 0.008, 5.0);

        // Milestone audio chime
        if (currentScore > 0 && currentScore % 100 === 0 && Math.floor(s.score - 0.15) % 100 !== 0) {
          playSfx('score');
        }

        // Apply Gravity & Player Jump Kinematics
        s.player.vy += s.player.gravity;
        s.player.y += s.player.vy;

        if (s.player.y >= s.player.groundY) {
          s.player.y = s.player.groundY;
          s.player.vy = 0;
          s.player.isGrounded = true;
        }

        // Spawn Obstacles
        s.nextSpawn--;
        if (s.nextSpawn <= 0) {
          const rand = Math.random();
          let type: 'spike' | 'firewall' | 'drone' = 'spike';
          let obsW = 18;
          let obsH = 26;
          let obsY = groundY - obsH;
          let color = '#FF0055';

          if (rand > 0.65) {
            type = 'firewall';
            obsW = 24;
            obsH = 34;
            obsY = groundY - obsH;
            color = '#FFE600';
          } else if (rand > 0.4 && s.score > 120) {
            type = 'drone';
            obsW = 22;
            obsH = 18;
            obsY = groundY - 50 - Math.random() * 20; // Flying drone
            color = '#9D00FF';
          }

          s.obstacles.push({
            x: width + 20,
            y: obsY,
            width: obsW,
            height: obsH,
            type,
            color,
          });

          // Randomize next spawn interval based on speed
          s.nextSpawn = Math.floor(Math.random() * 45 + 55 - Math.min(s.speed * 2, 25));
        }

        // Move Obstacles & Collision Check
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const obs = s.obstacles[i];
          obs.x -= s.speed;

          // AABB Collision Detection with small forgiving hitbox
          const px = s.player.x + 4;
          const py = s.player.y + 4;
          const pw = s.player.width - 8;
          const ph = s.player.height - 6;

          if (
            px < obs.x + obs.width &&
            px + pw > obs.x &&
            py < obs.y + obs.height &&
            py + ph > obs.y
          ) {
            // Collision! Game Over
            s.isAlive = false;
            setGameOver(true);
            playSfx('gameover');

            // Spawn explosion sparks
            for (let p = 0; p < 24; p++) {
              s.particles.push({
                x: s.player.x + s.player.width / 2,
                y: s.player.y + s.player.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 2,
                size: Math.random() * 4 + 2,
                color: Math.random() > 0.5 ? '#FF0055' : '#FFE600',
                life: 0,
                maxLife: 28,
              });
            }

            // Update high score
            if (currentScore > highScore) {
              setHighScore(currentScore);
              try {
                localStorage.setItem('breakhub_offline_highscore', currentScore.toString());
              } catch {
                // Ignore storage error
              }
            }
            break;
          }

          // Remove offscreen obstacles
          if (obs.x + obs.width < -30) {
            s.obstacles.splice(i, 1);
          }
        }
      }

      // 3. Draw Obstacles
      s.obstacles.forEach((obs) => {
        ctx.save();
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = obs.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        if (obs.type === 'spike') {
          // Retro Triangle Spike
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.lineTo(obs.x, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (obs.type === 'firewall') {
          // Double Warning Tower
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
          // Glitch lines
          ctx.fillStyle = '#000000';
          ctx.fillRect(obs.x + 3, obs.y + 6, obs.width - 6, 4);
          ctx.fillRect(obs.x + 3, obs.y + 16, obs.width - 6, 4);
        } else if (obs.type === 'drone') {
          // Cyber Drone
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
          // Red sensor eye
          ctx.fillStyle = '#FF0055';
          ctx.fillRect(obs.x + 4, obs.y + 4, 6, 6);
        }
        ctx.restore();
      });

      // 4. Draw Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity on particles
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;

        if (p.life >= p.maxLife) {
          s.particles.splice(i, 1);
        }
      }

      // 5. Draw Cyber Runner Player Sprite
      if (s.isAlive) {
        ctx.save();
        const px = s.player.x;
        const py = s.player.y;
        s.player.legAnim = (s.player.legAnim + 0.25) % (Math.PI * 2);

        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = s.player.isGrounded ? 4 : 10;

        // Player Body (Cyberpunk Runner Robot)
        ctx.fillStyle = '#00F0FF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        // Head / Helmet
        ctx.fillRect(px + 4, py, 16, 12);
        ctx.strokeRect(px + 4, py, 16, 12);

        // Neon Visor
        ctx.fillStyle = '#FFE600';
        ctx.fillRect(px + 12, py + 3, 8, 4);

        // Torso
        ctx.fillStyle = '#1C1635';
        ctx.fillRect(px + 4, py + 12, 16, 10);
        ctx.strokeRect(px + 4, py + 12, 16, 10);

        // Core Reactor Dot
        ctx.fillStyle = '#FF0055';
        ctx.fillRect(px + 9, py + 15, 6, 4);

        // Animated Running Legs
        ctx.fillStyle = '#00F0FF';
        if (s.player.isGrounded && gameStarted) {
          const legOffset = Math.sin(s.player.legAnim) * 5;
          // Left Leg
          ctx.fillRect(px + 5, py + 22, 5, 6 + legOffset);
          // Right Leg
          ctx.fillRect(px + 14, py + 22, 5, 6 - legOffset);
        } else {
          // Jumping pose
          ctx.fillRect(px + 4, py + 22, 6, 4);
          ctx.fillRect(px + 14, py + 22, 6, 4);
        }

        ctx.restore();
      }

      // 6. Draw HUD & Prompts
      if (!gameStarted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#FFE600';
        ctx.font = '900 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ BREAK HUB: CYBER RUNNER ⚡', width / 2, height / 2 - 24);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 12px sans-serif';
        ctx.fillText('PRESS SPACE OR TAP TO JUMP', width / 2, height / 2 + 6);

        ctx.fillStyle = '#00F0FF';
        ctx.font = '800 11px monospace';
        ctx.fillText('OFFLINE MINI-GAME ACTIVE', width / 2, height / 2 + 30);
      } else if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#FF0055';
        ctx.font = '900 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SYSTEM CRASH // GAME OVER', width / 2, height / 2 - 20);

        ctx.fillStyle = '#FFE600';
        ctx.font = '800 14px monospace';
        ctx.fillText(`SCORE: ${Math.floor(s.score)}  |  BEST: ${highScore}`, width / 2, height / 2 + 6);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 12px sans-serif';
        ctx.fillText('PRESS SPACE OR TAP TO RESTART [R]', width / 2, height / 2 + 32);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, highScore, playSfx]);

  // Network connection test ping
  const handleTestConnection = async () => {
    setIsChecking(true);
    setPingStatus('idle');
    playSfx('click');

    try {
      // Ping cache-busted endpoint
      const response = await fetch(`/api/games?t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });

      if (response.ok) {
        setIsOnline(true);
        setPingStatus('success');
        playSfx('reconnect');
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      } else {
        setIsOnline(false);
        setPingStatus('failed');
      }
    } catch {
      setIsOnline(false);
      setPingStatus('failed');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-portal-bg text-slate-100 bg-neo-dots selection:bg-portal-yellow selection:text-black flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Reconnection Toast (Shown if connection recovered) */}
      {isOnline && (
        <div className="w-full max-w-3xl mb-4 bg-portal-lime border-3 border-black p-3.5 rounded-xl shadow-neo flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 text-black">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span className="font-black text-xs sm:text-sm uppercase tracking-wide">
              SIGNAL RESTORED! INTERNET CONNECTION ACTIVE.
            </span>
          </div>
          <Link
            href="/"
            className="px-4 py-1.5 bg-black text-portal-lime font-black text-xs uppercase tracking-wider rounded-lg border-2 border-black hover:bg-slate-900 transition-all shadow-neo-sm"
          >
            ENTER ARCADE
          </Link>
        </div>
      )}

      {/* Main Terminal Container */}
      <div className="max-w-3xl w-full bg-portal-card border-4 border-black p-5 sm:p-8 rounded-2xl shadow-[8px_8px_0px_#000000] relative">
        {/* Figma Corner Neo-Brutalist Nodes */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-black rounded-sm shadow-neo-sm" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-black rounded-sm shadow-neo-sm" />

        {/* Top Status Strip */}
        <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-4 mb-6 gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 border-black ${
                isOnline ? 'bg-portal-lime animate-pulse' : 'bg-portal-pink animate-ping'
              }`}
            />
            <span className="font-mono text-xs sm:text-sm font-black uppercase text-portal-pink tracking-widest flex items-center gap-1.5">
              <Radio className="w-4 h-4 stroke-[2.5]" />
              {isOnline ? 'ONLINE // READY' : 'PROTOCOL // OFFLINE_MODE'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-1.5 rounded-lg bg-portal-surface border-2 border-black hover:bg-portal-yellow hover:text-black transition-all text-slate-300"
              title={soundEnabled ? 'Mute 8-Bit Audio' : 'Unmute 8-Bit Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <span className="font-mono text-xs font-bold text-slate-300 bg-portal-surface px-2.5 py-1 border-2 border-black rounded-md">
              PORTAL: CACHED
            </span>
          </div>
        </div>

        {/* Header Title Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-portal-yellow text-black font-mono text-xs font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_#000000] mb-3">
            <WifiOff className="w-3.5 h-3.5 stroke-[2.5]" />
            NO INTERNET DETECTED
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-[2px_2px_0px_#000000]">
            TRANSMISSION <span className="text-portal-pink">SEVERED</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-2 leading-relaxed font-medium">
            Your connection went down, but the fun doesn't have to stop! Play our built-in offline Cyber Runner mini-game below while we scan for a signal.
          </p>
        </div>

        {/* 100% Offline Interactive Canvas Mini-Game */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-portal-cyan">
              <Gamepad2 className="w-4 h-4" />
              <span>Cyber Runner [Offline Arcade]</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs font-bold">
              <span className="text-portal-yellow flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                SCORE: {score}
              </span>
              <span className="text-portal-lime flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                BEST: {highScore}
              </span>
            </div>
          </div>

          <div
            onClick={triggerJump}
            onTouchStart={(e) => {
              e.preventDefault();
              triggerJump();
            }}
            className="relative w-full aspect-[21/9] sm:aspect-[24/9] rounded-xl overflow-hidden border-3 border-black shadow-[4px_4px_0px_#000000] cursor-pointer group select-none touch-none"
            title="Click or Tap anywhere to Jump!"
          >
            <canvas
              ref={canvasRef}
              width={560}
              height={210}
              className="w-full h-full object-cover block"
            />

            {/* Tap/Jump Mobile Visual Hint */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 border border-white/20 text-[10px] font-mono text-slate-300 pointer-events-none">
              SPACE / TAP TO JUMP
            </div>
          </div>
        </div>

        {/* Interactive Action Control Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {/* 1. Retry Connection Button */}
          <button
            onClick={handleTestConnection}
            disabled={isChecking}
            className={`flex items-center justify-center gap-2 px-4 py-3 bg-portal-yellow text-black font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black shadow-[4px_4px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all ${
              isChecking ? 'opacity-80 cursor-wait' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'SCANNING...' : 'RETRY SIGNAL'}</span>
          </button>

          {/* 2. Reload Cached Home */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-portal-cyan text-black font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black shadow-[4px_4px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all text-center"
          >
            <Home className="w-4 h-4" />
            <span>HOME (CACHED)</span>
          </Link>

          {/* 3. Restart Mini-Game Button */}
          <button
            onClick={startMiniGame}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-portal-pink text-white font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black shadow-[4px_4px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY RUNNER</span>
          </button>
        </div>

        {/* Signal Diagnostic Notice Banner */}
        {pingStatus === 'failed' && (
          <div className="p-3 bg-portal-surface border-2 border-portal-pink rounded-xl text-portal-pink font-bold text-xs flex items-center gap-2 mb-6 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Host ping failed. Please check Wi-Fi/cellular connection or airplane mode toggle.</span>
          </div>
        )}

        {/* Offline Troubleshooting Guide Accordion */}
        <div className="bg-portal-surface p-4 rounded-xl border-2 border-black shadow-neo-sm text-xs space-y-2">
          <div className="flex items-center gap-2 text-portal-yellow font-black uppercase">
            <Terminal className="w-4 h-4" />
            <span>Tactical Connection Intel</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[11px] font-medium pt-1">
            <div className="flex items-start gap-1.5">
              <span className="text-portal-cyan font-bold">•</span>
              <span>All 20+ mini-games support offline cache once previously loaded.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-portal-lime font-bold">•</span>
              <span>Local XP and offline high scores are preserved in device storage.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-portal-pink font-bold">•</span>
              <span>Online leaderboards sync automatically as soon as Wi-Fi reconnects.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-portal-yellow font-bold">•</span>
              <span>Press [Space] or [Tap] anytime to jump over glitch firewalls.</span>
            </div>
          </div>
        </div>

        {/* Bottom Diagnostics Footer */}
        <div className="mt-6 pt-4 border-t-2 border-black/40 flex flex-wrap items-center justify-between text-[10px] sm:text-xs font-mono text-slate-400 gap-2">
          <span className="flex items-center gap-1 text-portal-lime font-bold">
            <Zap className="w-3 h-3 text-portal-lime" />
            CLIENT_ENGINE: V1.4_OFFLINE_READY
          </span>
          <span className="text-slate-400 font-bold">
            PWA_SERVICE_CACHE // ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
}
