"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, RotateCcw, Volume2, VolumeX, Zap, Shield, Sparkles } from "lucide-react";

interface FlappyCloneProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
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
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export default function FlappyBirdClone({ gameId = "g_flappy_27", onGameOver, onScoreUpdate }: FlappyCloneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isOver, setIsOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [combo, setCombo] = useState(0);
  const rafRef = useRef<number>(0);

  const W = 420;
  const H = 620;

  // Sound Synth via Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'flap' | 'score' | 'hit' | 'start') => {
    if (muted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'flap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'score') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {}
  }, [muted]);

  // Bird state refs
  const birdRef = useRef({ y: H / 2, vy: 0, angle: 0, wingAngle: 0 });
  const pipesRef = useRef<{ x: number; top: number; gap: number; passed: boolean; color: string }[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextRef = useRef<FloatingText[]>([]);
  const starsRef = useRef<Star[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const tickRef = useRef(0);
  const overRef = useRef(false);
  const shakeRef = useRef(0);

  const FLAP = -8.5;
  const GRAV = 0.36;
  const PIPE_SPEED = 2.5;
  const STANDARD_PIPE_GAP = 165;
  const PIPE_WIDTH = 60;
  const BIRD_R = 17;

  // Initialize stars once
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (H - 40),
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
    starsRef.current = stars;
  }, [W, H]);

  const loadBest = useCallback(() => {
    try {
      const s = localStorage.getItem("breakhub_flappy_high_score");
      if (s) setBest(parseInt(s, 10));
    } catch {}
  }, []);

  useEffect(() => { loadBest(); }, [loadBest]);

  const reset = useCallback(() => {
    birdRef.current = { y: H / 2, vy: 0, angle: 0, wingAngle: 0 };
    pipesRef.current = [];
    particlesRef.current = [];
    floatingTextRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    tickRef.current = 0;
    overRef.current = false;
    shakeRef.current = 0;
    setScore(0);
    setCombo(0);
    setIsOver(false);
    setStarted(false);
  }, [H]);

  const startGame = useCallback(() => {
    reset();
    setStarted(true);
    playSound('start');
  }, [reset, playSound]);

  const triggerParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 15,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#00F0FF') => {
    floatingTextRef.current.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.5,
    });
  };

  const flap = useCallback(() => {
    if (overRef.current) return;
    if (!started) { startGame(); return; }
    birdRef.current.vy = FLAP;
    birdRef.current.angle = -0.55;
    playSound('flap');

    // Thruster spark particles
    triggerParticles(W / 3 - 10, birdRef.current.y + 5, '#00F0FF', 8);
  }, [started, startGame, playSound, W, FLAP]);

  // Spawn pipes with wider gap for the first 3 pipes (score < 3)
  useEffect(() => {
    if (!started || isOver) return;
    const id = setInterval(() => {
      const currentScore = scoreRef.current;
      const gap = currentScore < 3 ? 220 : STANDARD_PIPE_GAP;
      const minTop = 60;
      const maxTop = H - gap - minTop - 80;
      const top = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
      const colors = ['#00FFCC', '#00F0FF', '#FF0055', '#FFE600'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      pipesRef.current.push({ x: W, top, gap, passed: false, color });
    }, 1600);
    return () => clearInterval(id);
  }, [started, isOver, H, STANDARD_PIPE_GAP, W]);

  // Game loop
  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // DPR scaling for HiDPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      if (started && !isOver) {
        tickRef.current += 1;

        const b = birdRef.current;
        b.vy += GRAV;
        b.y += b.vy;
        b.angle = Math.min(0.85, b.angle + 0.035);
        b.wingAngle = Math.sin(tickRef.current * 0.3) * 0.4;

        // Move stars for background parallax
        for (const s of starsRef.current) {
          s.x -= s.speed;
          if (s.x < 0) s.x = W;
        }

        // Move pipes
        for (const p of pipesRef.current) p.x -= PIPE_SPEED;

        // Score check & combo
        for (const p of pipesRef.current) {
          if (!p.passed && p.x + PIPE_WIDTH < W / 3) {
            p.passed = true;
            scoreRef.current += 1;
            comboRef.current += 1;
            setScore(scoreRef.current);
            setCombo(comboRef.current);
            onScoreUpdate?.(scoreRef.current);
            playSound('score');

            // Floating text popup
            addFloatingText(W / 3 + 30, b.y - 20, comboRef.current > 1 ? `+1 (x${comboRef.current})` : '+1', '#FFE600');
            triggerParticles(p.x + PIPE_WIDTH, p.top + p.gap / 2, '#00FFCC', 16);
          }
        }

        // Collision logic
        const birdLeft = W / 3 - BIRD_R + 3;
        const birdRight = W / 3 + BIRD_R - 3;
        const birdTop = b.y - BIRD_R + 3;
        const birdBottom = b.y + BIRD_R - 3;

        // Ground / Ceiling crash
        if (birdTop < 0 || birdBottom > H - 24) {
          overRef.current = true;
          shakeRef.current = 15;
          playSound('hit');
          triggerParticles(W / 3, b.y, '#FF0055', 25);
          setIsOver(true);
          setStarted(false);
          if (scoreRef.current > best) {
            setBest(scoreRef.current);
            try { localStorage.setItem("breakhub_flappy_high_score", String(scoreRef.current)); } catch {}
          }
          if (onGameOver) onGameOver(scoreRef.current);
        }

        // Pipe crash
        for (const p of pipesRef.current) {
          if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
            if (birdTop < p.top || birdBottom > p.top + p.gap) {
              overRef.current = true;
              shakeRef.current = 15;
              playSound('hit');
              triggerParticles(W / 3, b.y, '#FF0055', 30);
              setIsOver(true);
              setStarted(false);
              if (scoreRef.current > best) {
                setBest(scoreRef.current);
                try { localStorage.setItem("breakhub_flappy_high_score", String(scoreRef.current)); } catch {}
              }
              if (onGameOver) onGameOver(scoreRef.current);
            }
          }
        }

        // Clean off-screen pipes
        pipesRef.current = pipesRef.current.filter((p) => p.x + PIPE_WIDTH > 0);
      }

      // Update Particles
      for (const pt of particlesRef.current) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life += 1;
        pt.alpha = 1 - pt.life / pt.maxLife;
      }
      particlesRef.current = particlesRef.current.filter((pt) => pt.life < pt.maxLife);

      // Update Floating Text
      for (const ft of floatingTextRef.current) {
        ft.y += ft.vy;
        ft.alpha -= 0.02;
      }
      floatingTextRef.current = floatingTextRef.current.filter((ft) => ft.alpha > 0);

      // --- RENDER SECTION ---
      ctx.save();

      // Screen Shake
      if (shakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * shakeRef.current;
        const dy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(dx, dy);
        shakeRef.current *= 0.85;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
      }

      // Deep Cyber Space Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#050212");
      bgGrad.addColorStop(0.5, "#0d0628");
      bgGrad.addColorStop(1, "#180738");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Parallax Stars
      for (const s of starsRef.current) {
        ctx.fillStyle = "#FFFFFF";
        ctx.globalAlpha = s.alpha;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.globalAlpha = 1.0;

      // Cyber Grid Lines (Perspective glow)
      ctx.strokeStyle = "#00F0FF";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.08;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // Cyber City Horizon Silhouettes (Background Art)
      ctx.fillStyle = "#09041d";
      for (let i = 0; i < 8; i++) {
        const bx = ((i * 60) - (tickRef.current * 0.4) % 60);
        const bh = 70 + (i % 3) * 25;
        ctx.fillRect(bx, H - 24 - bh, 45, bh);
        // Window lights on buildings
        ctx.fillStyle = (i % 2 === 0) ? "#00F0FF22" : "#FF005522";
        ctx.fillRect(bx + 10, H - 24 - bh + 15, 10, 12);
        ctx.fillStyle = "#09041d";
      }

      // Neon Pipes with Cyber Metallic Texture
      for (const p of pipesRef.current) {
        // Top Pipe Body
        const topGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
        topGrad.addColorStop(0, "#004D40");
        topGrad.addColorStop(0.5, p.color);
        topGrad.addColorStop(1, "#00251A");
        ctx.fillStyle = topGrad;
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.top);

        // Top Pipe Cap (Glow rim)
        ctx.fillStyle = "#FF0055";
        ctx.fillRect(p.x - 4, p.top - 22, PIPE_WIDTH + 8, 22);
        ctx.strokeRect(p.x - 4, p.top - 22, PIPE_WIDTH + 8, 22);

        // Bottom Pipe Body
        const bottomY = p.top + p.gap;
        const bottomGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
        bottomGrad.addColorStop(0, "#004D40");
        bottomGrad.addColorStop(0.5, p.color);
        bottomGrad.addColorStop(1, "#00251A");
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(p.x, bottomY, PIPE_WIDTH, H - 24 - bottomY);
        ctx.strokeRect(p.x, bottomY, PIPE_WIDTH, H - 24 - bottomY);

        // Bottom Pipe Cap (Glow rim)
        ctx.fillStyle = "#FF0055";
        ctx.fillRect(p.x - 4, bottomY, PIPE_WIDTH + 8, 22);
        ctx.strokeRect(p.x - 4, bottomY, PIPE_WIDTH + 8, 22);
      }

      // Ground Floor Strip
      ctx.fillStyle = "#1a0b36";
      ctx.fillRect(0, H - 24, W, 24);
      ctx.strokeStyle = "#00F0FF";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, H - 24);
      ctx.lineTo(W, H - 24);
      ctx.stroke();

      // Ground Neon Grid Pattern
      ctx.strokeStyle = "#FF0055";
      ctx.lineWidth = 1.5;
      const groundOffset = (tickRef.current * PIPE_SPEED) % 30;
      for (let gx = -groundOffset; gx <= W; gx += 30) {
        ctx.beginPath();
        ctx.moveTo(gx, H - 24);
        ctx.lineTo(gx - 10, H);
        ctx.stroke();
      }

      // Render Particles
      for (const pt of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.restore();
      }

      // Render Floating Text Popups
      for (const ft of floatingTextRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '900 13px system-ui, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Render an original red battle-bird with chunky transforming-robot armor.
      const bx = W / 3;
      const by = birdRef.current.y;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(birdRef.current.angle);

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.ellipse(0, BIRD_R + 5, BIRD_R * 0.9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      const exhaustFlicker = 2 + Math.sin(tickRef.current * 0.45);
      ctx.fillStyle = "#D62828";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2;
      for (const featherY of [-6, 1, 8]) {
        ctx.beginPath();
        ctx.moveTo(-11, featherY);
        ctx.lineTo(-25 - exhaustFlicker, featherY - 5);
        ctx.lineTo(-17, featherY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#00F0FF";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-14, -3);
      ctx.lineTo(-29 - exhaustFlicker, 0);
      ctx.lineTo(-14, 3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Angry-bird silhouette: broad red body, sharp brow, and golden beak.
      const bodyGrad = ctx.createRadialGradient(-7, -8, 2, 0, 0, BIRD_R + 4);
      bodyGrad.addColorStop(0, "#FF5A36");
      bodyGrad.addColorStop(0.55, "#D62828");
      bodyGrad.addColorStop(1, "#68151E");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Blue shoulder wing and silver robot faceplate.
      ctx.save();
      ctx.rotate(birdRef.current.wingAngle);
      ctx.fillStyle = "#1554A6";
      ctx.beginPath();
      ctx.moveTo(-2, 1);
      ctx.lineTo(-19, 6);
      ctx.lineTo(-12, 15);
      ctx.lineTo(4, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#48D9FF";
      ctx.fillRect(-13, 7, 9, 2);
      ctx.restore();

      ctx.fillStyle = "#B9C7D0";
      ctx.beginPath();
      ctx.arc(2, 7, 9, 0.15, Math.PI - 0.15);
      ctx.lineTo(-7, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#71808D";
      ctx.fillRect(-4, 8, 12, 2);

      // Helmet crest and heavy blue brow give the bird a robot commander profile.
      ctx.fillStyle = "#D7E0E5";
      ctx.beginPath();
      ctx.moveTo(-9, -12);
      ctx.lineTo(-5, -19);
      ctx.lineTo(0, -13);
      ctx.lineTo(6, -19);
      ctx.lineTo(9, -7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#123F82";
      ctx.beginPath();
      ctx.moveTo(-14, -7);
      ctx.lineTo(10, -10);
      ctx.lineTo(14, -3);
      ctx.lineTo(-10, -1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#C8FBFF";
      ctx.shadowColor = "#00F0FF";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(1, -5);
      ctx.lineTo(8, -7);
      ctx.lineTo(7, -2);
      ctx.lineTo(1, -1);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#FFC928";
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(26, 4);
      ctx.lineTo(11, 9);
      ctx.lineTo(7, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FFF0A8";
      ctx.fillRect(13, 3, 9, 1.5);

      // Chest grille and glowing reactor core.
      ctx.strokeStyle = "#8ADFFF";
      ctx.lineWidth = 1;
      for (let grilleY = 7; grilleY <= 10; grilleY += 3) {
        ctx.beginPath();
        ctx.moveTo(-5, grilleY);
        ctx.lineTo(5, grilleY - 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#00F0FF";
      ctx.shadowColor = "#00F0FF";
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(0, 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      // HUD Score Overlay on Canvas
      if (started) {
        ctx.save();
        ctx.font = '900 36px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.strokeText(String(score), W / 2, 60);
        ctx.fillText(String(score), W / 2, 60);
        ctx.restore();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, isOver, H, W, best, onGameOver, onScoreUpdate, playSound, score]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    flap();
  };

  return (
    <div className="relative w-full max-w-[420px] mx-auto aspect-[420/620] bg-black border-4 border-black rounded-2xl overflow-hidden shadow-neo select-none touch-none flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="w-full h-full cursor-pointer block"
      />

      {/* Start / Game Over Overlay */}
      {(!started || isOver) && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-portal-cyan border-3 border-black flex items-center justify-center shadow-neo mb-4">
            <Zap className="w-8 h-8 text-black stroke-[3]" />
          </div>

          <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
            {isOver ? "CRASH DETECTED" : "CYBER FLAP 2077"}
          </h2>
          <p className="text-xs font-bold text-portal-cyan mb-6">
            {isOver ? `Final Score: ${score}` : "Tap or Press Space to Launch Drone"}
          </p>

          {isOver && (
            <div className="bg-portal-surface border-3 border-black rounded-xl p-4 mb-6 w-full max-w-xs shadow-neo-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-slate-400">SCORE</span>
                <span className="text-portal-yellow text-sm">{score}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-slate-400">BEST RECORD</span>
                <span className="text-portal-cyan text-sm">{best}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3 bg-portal-cyan text-black font-black uppercase text-xs rounded-xl border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              {isOver ? "Play Again" : "Start Mission"}
            </button>
            <button
              onClick={() => setMuted(!muted)}
              className="p-3 bg-portal-card text-white rounded-xl border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              title={muted ? "Unmute Audio" : "Mute Audio"}
            >
              {muted ? <VolumeX className="w-4 h-4 stroke-[2.5]" /> : <Volume2 className="w-4 h-4 stroke-[2.5]" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
