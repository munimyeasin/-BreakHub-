'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Shield, Trophy, Zap, Sparkles, Sword } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DungeonSliceGameProps {
  gameId?: string;
  onGameOver: (finalScore: number) => void;
  onScoreUpdate?: (score: number) => void;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;

interface Enemy {
  id: string;
  x: number;
  y: number;
  radius: number;
  speed: number;
  health: number;
  maxHealth: number;
  color: string;
  type: 'crawler' | 'phantom' | 'boss';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
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
  life: number;
}

interface SlashEffect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  color: string;
}

export default function DungeonSliceGame({ gameId = "g_dungeon_slice", onGameOver, onScoreUpdate }: DungeonSliceGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [coreHealth, setCoreHealth] = useState(100);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [slashRadiusLevel, setSlashRadiusLevel] = useState(1);

  const soundEnabledRef = useRef(true);
  const scoreRef = useRef(0);
  const coreHealthRef = useRef(100);
  const waveRef = useRef(1);
  const slashRadiusRef = useRef(45);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const slashesRef = useRef<SlashEffect[]>([]);
  const spawnTimerRef = useRef(0);
  const enemiesRemainingInWaveRef = useRef(10);

  const playSfx = useCallback((type: 'slash' | 'hit' | 'coreHit' | 'waveClear' | 'gameOver' | 'bossSpawn') => {
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

      if (type === 'slash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'coreHit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'waveClear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(450, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'gameOver') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'bossSpawn') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {}
  }, []);

  const startGame = () => {
    scoreRef.current = 0;
    coreHealthRef.current = 100;
    waveRef.current = 1;
    setScore(0);
    setCoreHealth(100);
    setWave(1);
    setSlashRadiusLevel(1);
    slashRadiusRef.current = 45;

    enemiesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    slashesRef.current = [];
    enemiesRemainingInWaveRef.current = 8;

    setIsDead(false);
    setIsPlaying(true);
  };

  const addParticles = (x: number, y: number, color: string, count = 15) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 15,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#FFE600') => {
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.5,
      life: 0,
    });
  };

  const spawnEnemy = () => {
    if (enemiesRemainingInWaveRef.current <= 0) return;
    enemiesRemainingInWaveRef.current--;

    const isBoss = waveRef.current % 5 === 0 && enemiesRemainingInWaveRef.current === 0;
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 320;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const x = cx + Math.cos(angle) * spawnDist;
    const y = cy + Math.sin(angle) * spawnDist;

    if (isBoss) {
      playSfx('bossSpawn');
      addFloatingText(cx, cy - 80, `⚠️ WAVE ${waveRef.current} BOSS SPAWNED! ⚠️`, '#FF0055');
      enemiesRef.current.push({
        id: `boss_${Date.now()}`,
        x,
        y,
        radius: 34,
        speed: 0.8,
        health: 12 + waveRef.current * 2,
        maxHealth: 12 + waveRef.current * 2,
        color: '#FF0055',
        type: 'boss',
      });
    } else {
      const type = Math.random() < 0.35 ? 'phantom' : 'crawler';
      const speed = type === 'phantom' ? 2.2 : 1.5;
      const radius = type === 'phantom' ? 14 : 18;
      const color = type === 'phantom' ? '#00F0FF' : '#A3E635';

      enemiesRef.current.push({
        id: `enemy_${Date.now()}_${Math.random()}`,
        x,
        y,
        radius,
        speed: speed + waveRef.current * 0.08,
        health: type === 'phantom' ? 1 : 2,
        maxHealth: type === 'phantom' ? 1 : 2,
        color,
        type,
      });
    }
  };

  const handleSlash = (clientX: number, clientY: number) => {
    if (!isPlaying || isDead || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    playSfx('slash');

    // Add visual slash ray
    slashesRef.current.push({
      x1: CANVAS_WIDTH / 2,
      y1: CANVAS_HEIGHT / 2,
      x2: x,
      y2: y,
      alpha: 1.0,
      color: '#00F0FF',
    });

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const radius = slashRadiusRef.current;

    // Check collision with enemies along the click point or swipe radius
    let hitAny = false;
    enemiesRef.current.forEach((enemy) => {
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Also check distance from center core to click ray
      if (dist <= enemy.radius + radius || Math.hypot(enemy.x - cx, enemy.y - cy) < radius + enemy.radius) {
        enemy.health -= 1;
        hitAny = true;
        playSfx('hit');
        addParticles(enemy.x, enemy.y, enemy.color, 10);

        if (enemy.health <= 0) {
          const pts = enemy.type === 'boss' ? 300 : 50;
          scoreRef.current += pts;
          setScore(scoreRef.current);
          onScoreUpdate?.(scoreRef.current);
          addFloatingText(enemy.x, enemy.y, `+${pts}`, '#FFE600');
          addParticles(enemy.x, enemy.y, '#FFE600', 25);
        }
      }
    });

    if (!hitAny) {
      addParticles(x, y, '#00F0FF', 6);
    }
  };

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying || isDead) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Dojo Background
      ctx.fillStyle = '#090014';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const bgGlow = ctx.createRadialGradient(cx, cy, 30, cx, cy, CANVAS_WIDTH * 0.8);
      bgGlow.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
      bgGlow.addColorStop(0.5, 'rgba(255, 0, 127, 0.06)');
      bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cyber Grid
      ctx.strokeStyle = '#260021';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < CANVAS_WIDTH; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let gy = 0; gy < CANVAS_HEIGHT; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(CANVAS_WIDTH, gy);
        ctx.stroke();
      }

      // 2. Spawning Logic
      spawnTimerRef.current += 1;
      const spawnInterval = Math.max(35, 90 - waveRef.current * 5);
      if (spawnTimerRef.current >= spawnInterval && enemiesRemainingInWaveRef.current > 0) {
        spawnTimerRef.current = 0;
        spawnEnemy();
      }

      // Wave Clear check
      if (enemiesRemainingInWaveRef.current <= 0 && enemiesRef.current.length === 0) {
        playSfx('waveClear');
        waveRef.current += 1;
        setWave(waveRef.current);
        enemiesRemainingInWaveRef.current = 8 + waveRef.current * 2;
        coreHealthRef.current = Math.min(100, coreHealthRef.current + 25);
        setCoreHealth(coreHealthRef.current);
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
        addFloatingText(cx, cy - 100, `WAVE ${waveRef.current} START!`, '#FFE600');
      }

      // 3. Render Central Glowing Neon Core
      const corePulse = Math.sin(Date.now() * 0.008) * 4;
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28 + corePulse);
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.4, '#00F0FF');
      coreGrad.addColorStop(1, '#7928CA');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 24 + corePulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Core Shield Ring
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 38 + Math.sin(Date.now() * 0.005) * 3, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Update & Render Enemies
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        const dx = cx - enemy.x;
        const dy = cy - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 30) {
          enemy.x += (dx / dist) * enemy.speed;
          enemy.y += (dy / dist) * enemy.speed;
        } else {
          // Reached core! Deal damage
          coreHealthRef.current = Math.max(0, coreHealthRef.current - (enemy.type === 'boss' ? 35 : 12));
          setCoreHealth(coreHealthRef.current);
          playSfx('coreHit');
          addParticles(cx, cy, '#FF0055', 20);
          enemiesRef.current.splice(i, 1);

          if (coreHealthRef.current <= 0) {
            setIsDead(true);
            setIsPlaying(false);
            playSfx('gameOver');
            onGameOver(scoreRef.current);
          }
          continue;
        }

        if (enemy.health <= 0) {
          addParticles(enemy.x, enemy.y, enemy.color, 20);
          enemiesRef.current.splice(i, 1);
          continue;
        }

        // Draw Enemy
        ctx.save();
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner core symbol
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Boss Health Bar
        if (enemy.type === 'boss') {
          const bw = 50;
          const bh = 6;
          ctx.fillStyle = '#000000';
          ctx.fillRect(enemy.x - bw / 2, enemy.y - enemy.radius - 14, bw, bh);
          ctx.fillStyle = '#FF0055';
          ctx.fillRect(enemy.x - bw / 2, enemy.y - enemy.radius - 14, bw * (enemy.health / enemy.maxHealth), bh);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(enemy.x - bw / 2, enemy.y - enemy.radius - 14, bw, bh);
        }
      }

      // 5. Render Slash Ray Effects
      for (let i = slashesRef.current.length - 1; i >= 0; i--) {
        const s = slashesRef.current[i];
        s.alpha -= 0.1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
        ctx.restore();

        if (s.alpha <= 0) {
          slashesRef.current.splice(i, 1);
        }
      }

      // 6. Particles & Floating Text
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.life += 1;
        ft.alpha = 1 - ft.life / 35;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '900 15px monospace';
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.life < 35);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isDead, playSfx, onGameOver]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black select-none overflow-hidden">
      {/* Top HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between px-4 py-2 rounded-2xl bg-portal-card border-3 border-black shadow-neo-sm text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-portal-cyan stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider text-portal-cyan">
              CORE: {coreHealth}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-portal-pink stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider text-portal-pink">
              WAVE {wave}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-portal-yellow stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider text-portal-yellow">
              {score} PTS
            </span>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-xl bg-portal-surface border-2 border-black text-white hover:text-portal-cyan transition-all shadow-neo-sm"
          title="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 stroke-[2.5]" /> : <VolumeX className="w-4 h-4 stroke-[2.5]" />}
        </button>
      </div>

      {/* Canvas Arcade Container */}
      <div
        className="relative cursor-crosshair touch-none"
        onClick={(e) => handleSlash(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches[0]) handleSlash(e.touches[0].clientX, e.touches[0].clientY);
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-[360px] h-[480px] sm:w-[420px] sm:h-[560px] rounded-2xl border-4 border-black shadow-neo bg-[#090014]"
        />

        {/* Start / Game Over Overlay */}
        {(!isPlaying || isDead) && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-30 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-portal-cyan border-3 border-black flex items-center justify-center shadow-neo mb-4">
              <Sword className="w-8 h-8 text-black stroke-[3]" />
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
              {isDead ? "CORE BREACHED" : "DUNGEON SLICE"}
            </h2>
            <p className="text-xs font-bold text-portal-cyan mb-6">
              {isDead ? `Final Score: ${score}` : "Tap or Click anywhere to Slice Creeping Shadow Creatures"}
            </p>

            {isDead && (
              <div className="bg-portal-surface border-3 border-black rounded-xl p-4 mb-6 w-full max-w-xs shadow-neo-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-slate-400">SCORE</span>
                  <span className="text-portal-yellow text-sm">{score}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-slate-400">WAVE REACHED</span>
                  <span className="text-portal-cyan text-sm">{wave}</span>
                </div>
              </div>
            )}

            <button
              onClick={startGame}
              className="px-6 py-3 bg-portal-cyan text-black font-black uppercase text-xs rounded-xl border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              {isDead ? "Try Again" : "Start Defense"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
