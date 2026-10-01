"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, RotateCcw, Volume2, VolumeX, Zap, Shield, Sparkles } from "lucide-react";

interface FlappyCloneProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
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

export default function FlappyBirdClone({ gameId = "g_flappy_27", onGameOver }: FlappyCloneProps) {
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
  const PIPE_GAP = 165;
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

  // Spawn pipes
  useEffect(() => {
    if (!started || isOver) return;
    const id = setInterval(() => {
      const minTop = 70;
      const maxTop = H - PIPE_GAP - minTop - 90;
      const top = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
      const colors = ['#00FFCC', '#00F0FF', '#FF0055', '#FFE600'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      pipesRef.current.push({ x: W, top, gap: PIPE_GAP, passed: false, color });
    }, 1500);
    return () => clearInterval(id);
  }, [started, isOver, H, PIPE_GAP, W]);

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

      // Ground Line & Animated Cyber Tread
      ctx.fillStyle = "#FFDE59";
      ctx.fillRect(0, H - 24, W, 24);
      ctx.fillStyle = "#05020f";
      ctx.fillRect(0, H - 8, W, 8);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, H - 24, W, 24);

      // Animated scrolling hazard stripes on ground
      ctx.fillStyle = "#000000";
      const offset = (tickRef.current * 2) % 20;
      for (let x = -20; x < W + 20; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x + offset, H - 24);
        ctx.lineTo(x + 10 + offset, H - 24);
        ctx.lineTo(x + offset, H - 8);
        ctx.lineTo(x - 10 + offset, H - 8);
        ctx.closePath();
        ctx.fill();
      }

      // Render Particles
      for (const pt of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Floating Text
      for (const ft of floatingTextRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = "900 16px sans-serif";
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Cyber Jet Bird Render
      const bdraw = birdRef.current;
      ctx.save();
      ctx.translate(W / 3, bdraw.y);
      ctx.rotate(bdraw.angle);

      // Thruster Flame Trail
      if (started && !isOver) {
        ctx.fillStyle = "#00F0FF";
        ctx.beginPath();
        ctx.moveTo(-BIRD_R, 0);
        ctx.lineTo(-BIRD_R - 12 - Math.random() * 8, 0);
        ctx.lineTo(-BIRD_R, 6);
        ctx.closePath();
        ctx.fill();
      }

      // Bird Main Cyber Sphere Body
      ctx.fillStyle = "#FFDE59";
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Wing (Animated flapping)
      ctx.save();
      ctx.rotate(bdraw.wingAngle);
      ctx.fillStyle = "#FFE600";
      ctx.beginPath();
      ctx.ellipse(-4, 2, 9, 5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Cyber Visor / Eye
      ctx.fillStyle = "#00F0FF";
      ctx.beginPath();
      ctx.ellipse(BIRD_R * 0.3, -BIRD_R * 0.1, BIRD_R * 0.45, BIRD_R * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Visor Glow Specular Highlight
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(BIRD_R * 0.4, -BIRD_R * 0.2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = "#FF5500";
      ctx.beginPath();
      ctx.moveTo(BIRD_R - 2, 0);
      ctx.lineTo(BIRD_R * 1.55, 4);
      ctx.lineTo(BIRD_R - 2, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore(); // Restore Bird Transform
      ctx.restore(); // Restore Screen Shake Transform

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, isOver, onGameOver, best, playSound, W, H]);

  // Keyboard / touch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
        flap();
      }
      if (e.code === "KeyR") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap, reset]);

  return (
    <div className="flex flex-col items-center w-full max-w-full h-full flex-1 justify-center select-none p-2">
      {/* HUD */}
      <div className="w-full bg-portal-card border-3 border-black rounded-xl p-3 mb-3 shadow-neo flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-portal-surface border-2 border-black rounded-lg px-3 py-1 shadow-neo-sm">
            <div className="text-[10px] font-black text-portal-text-muted uppercase tracking-wider">SCORE</div>
            <div className="text-xl font-black text-portal-cyan leading-none">{score}</div>
          </div>
          <div className="bg-portal-surface border-2 border-black rounded-lg px-3 py-1 shadow-neo-sm">
            <div className="text-[10px] font-black text-portal-text-muted uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-portal-yellow" /> BEST
            </div>
            <div className="text-xl font-black text-portal-yellow leading-none">{best}</div>
          </div>
          {combo > 1 && (
            <div className="bg-portal-yellow border-2 border-black rounded-lg px-2 py-1 shadow-neo-sm hidden sm:flex items-center gap-1 animate-bounce">
              <Zap className="w-3 h-3 text-black" />
              <div className="text-xs font-black text-black leading-none">{combo}x STREAK</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="p-2 bg-portal-surface hover:bg-portal-yellow/30 text-portal-text rounded-lg border-2 border-black shadow-neo-sm font-black text-xs transition-transform active:translate-y-0.5"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-portal-pink" /> : <Volume2 className="w-4 h-4 text-portal-lime" />}
          </button>
          <button
            onClick={reset}
            className="p-2 bg-portal-yellow hover:bg-portal-yellow/90 text-black rounded-lg border-2 border-black shadow-neo-sm font-black text-xs transition-transform active:translate-y-0.5 flex items-center gap-1"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-portal-border shadow-2xl bg-portal-bg touch-none w-auto h-[min(74vh,620px)] max-w-full aspect-[9/16] flex items-center justify-center shrink-0">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-full block object-contain touch-none cursor-pointer"
          onClick={() => flap()}
          onTouchStart={(e) => {
            e.preventDefault();
            flap();
          }}
        />

        {!started && !isOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none p-4">
            <div className="bg-portal-card/95 border-3 border-black rounded-2xl p-6 shadow-neo text-center backdrop-blur-md max-w-xs w-full space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-portal-yellow border-3 border-black shadow-neo mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-portal-yellow uppercase tracking-wider">NEON FLAPPY</h2>
                <p className="text-[11px] font-bold text-portal-text-muted">Cyber-Arcade Vertical Flight</p>
              </div>
              <div className="bg-portal-surface p-2.5 rounded-xl border-2 border-black text-xs font-bold text-portal-cyan space-y-1">
                <p>Space / Click / Tap to Flap</p>
                <p className="text-[10px] text-portal-text-muted">Avoid Cyber Metallic Pipes</p>
              </div>
              <div className="text-[10px] font-black text-portal-yellow animate-pulse">
                TAP ANYWHERE TO START
              </div>
            </div>
          </div>
        )}

        {isOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/85 backdrop-blur-md p-4">
            <div className="bg-portal-card border-3 border-black rounded-2xl p-6 shadow-neo text-center max-w-xs w-full space-y-3">
              <div className="text-3xl font-black text-portal-pink uppercase tracking-wider">CRASH!</div>
              <div className="bg-portal-surface p-3 rounded-xl border-2 border-black">
                <div className="text-[10px] font-black text-portal-text-muted uppercase">FINAL SCORE</div>
                <div className="text-4xl font-black text-portal-cyan">{score}</div>
                <div className="text-xs font-bold text-portal-yellow mt-1">BEST: {best}</div>
              </div>
              <button
                onClick={reset}
                className="w-full bg-portal-yellow hover:bg-portal-yellow/90 text-black border-3 border-black font-black text-sm py-2.5 rounded-xl shadow-neo transition-transform active:translate-y-0.5 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control hint */}
      <div className="w-full max-w-[420px] mt-2 text-center text-[10px] font-bold text-portal-text-muted">
        Click canvas / Tap / Space to flap. R to restart.
      </div>
    </div>
  );
}
