"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, RotateCcw, Volume2, VolumeX, Zap, Flame } from "lucide-react";

interface FlappyCloneProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
}

export default function FlappyBirdClone({ gameId = "g_flappy_27", onGameOver }: FlappyCloneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isOver, setIsOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const rafRef = useRef<number>(0);

  const W = 420;
  const H = 620;

  // Bird state refs (mutable, animation loop reads these)
  const birdRef = useRef({ y: H / 2, vy: 0, angle: 0 });
  const pipesRef = useRef<{ x: number; top: number; gap: number; passed: boolean }[]>([]);
  const scoreRef = useRef(0);
  const tickRef = useRef(0);
  const overRef = useRef(false);

  const FLAP = -9;
  const GRAV = 0.35;
  const PIPE_SPEED = 2.4;
  const PIPE_GAP = 160;
  const PIPE_WIDTH = 56;
  const BIRD_R = 16;

  const loadBest = useCallback(() => {
    try {
      const s = localStorage.getItem("breakhub_flappy_high_score");
      if (s) setBest(parseInt(s, 10));
    } catch {}
  }, []);

  useEffect(() => { loadBest(); }, [loadBest]);

  const reset = useCallback(() => {
    birdRef.current = { y: H / 2, vy: 0, angle: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    tickRef.current = 0;
    overRef.current = false;
    setScore(0);
    setIsOver(false);
    setStarted(false);
  }, []);

  const startGame = useCallback(() => {
    reset();
    setStarted(true);
  }, [reset]);

  const flap = useCallback(() => {
    if (overRef.current) return;
    if (!started) { startGame(); return; }
    birdRef.current.vy = FLAP;
    birdRef.current.angle = -0.6;
  }, [started, startGame]);

  // Spawn pipes
  useEffect(() => {
    if (!started || isOver) return;
    const id = setInterval(() => {
      const minTop = 60;
      const maxTop = H - PIPE_GAP - minTop - 80;
      const top = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
      pipesRef.current.push({ x: W, top, gap: PIPE_GAP, passed: false });
    }, 1600);
    return () => clearInterval(id);
  }, [started, isOver]);

  // Game loop
  useEffect(() => {
    const loop = () => {
      if (!started || isOver) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      tickRef.current += 1;

      const b = birdRef.current;
      b.vy += GRAV;
      b.y += b.vy;
      b.angle = Math.min(0.9, b.angle + 0.04);

      // Move pipes
      for (const p of pipesRef.current) p.x -= PIPE_SPEED;

      // Score
      for (const p of pipesRef.current) {
        if (!p.passed && p.x + PIPE_WIDTH < BIRD_R) {
          p.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
      }

      // Collision
      const birdLeft = W / 3 - BIRD_R;
      const birdRight = W / 3 + BIRD_R;
      const birdTop = b.y - BIRD_R;
      const birdBottom = b.y + BIRD_R;

      if (birdTop < 0 || birdBottom > H - 20) {
        overRef.current = true;
        setIsOver(true);
        setStarted(false);
        if (scoreRef.current > best) {
          setBest(scoreRef.current);
          try { localStorage.setItem("breakhub_flappy_high_score", String(scoreRef.current)); } catch {}
        }
        if (onGameOver) onGameOver(scoreRef.current);
      }

      for (const p of pipesRef.current) {
        if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
          if (birdTop < p.top || birdBottom > p.top + p.gap) {
            overRef.current = true;
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

      // Render
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

      // Background
      ctx.fillStyle = "#0a0618";
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "#1a143a";
      ctx.lineWidth = 1;
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

      // Ground line
      ctx.fillStyle = "#FFDE59";
      ctx.fillRect(0, H - 20, W, 20);
      ctx.fillStyle = "#05020f";
      ctx.fillRect(0, H - 6, W, 6);

      // Pipes
      for (const p of pipesRef.current) {
        // Top pipe
        ctx.fillStyle = "#00FFCC";
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
        ctx.fillStyle = "#FF0055";
        ctx.fillRect(p.x - 3, p.top - 20, PIPE_WIDTH + 6, 20);

        // Bottom pipe
        const bottomY = p.top + p.gap;
        ctx.fillStyle = "#00FFCC";
        ctx.fillRect(p.x, bottomY, PIPE_WIDTH, H - 20 - bottomY);
        ctx.fillStyle = "#FF0055";
        ctx.fillRect(p.x - 3, bottomY, PIPE_WIDTH + 6, 20);
      }

      // Bird
      const bdraw = birdRef.current;
      ctx.save();
      ctx.translate(W / 3, bdraw.y);
      ctx.rotate(bdraw.angle);
      // Body
      ctx.fillStyle = "#FFDE59";
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Eye
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(BIRD_R * 0.35, -BIRD_R * 0.15, BIRD_R * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(BIRD_R * 0.4, -BIRD_R * 0.15, BIRD_R * 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Beak
      ctx.fillStyle = "#FF5500";
      ctx.beginPath();
      ctx.moveTo(BIRD_R, 0);
      ctx.lineTo(BIRD_R * 1.5, 4);
      ctx.lineTo(BIRD_R, 8);
      ctx.fill();
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, isOver, onGameOver, best]);

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
    <div className="flex flex-col items-center w-full max-w-xl mx-auto select-none p-2">
      {/* HUD */}
      <div className="w-full bg-portal-card border-3 border-black rounded-xl p-3 mb-3 shadow-neo flex items-center justify-between gap-3">
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
      <div className="relative w-full max-w-[420px] aspect-[420/620] bg-black rounded-2xl border-4 border-black shadow-neo-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-full block touch-none"
          onClick={flap}
          onTouchStart={(e) => { e.preventDefault(); flap(); }}
        />

        {!started && !isOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <div className="bg-portal-card/90 border-3 border-black rounded-2xl px-6 py-8 shadow-neo text-center backdrop-blur-md">
              <h2 className="text-3xl font-black text-portal-yellow uppercase tracking-wider mb-2">FLAPPY BIRD</h2>
              <p className="text-xs font-bold text-portal-text-muted mb-4">Cyber-Arcade Clone</p>
              <p className="text-sm font-black text-portal-cyan mb-1">Space / Click / Tap to Flap</p>
              <p className="text-[10px] text-portal-text-muted">Avoid neon pipes</p>
            </div>
          </div>
        )}

        {isOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80 backdrop-blur-md">
            <div className="bg-portal-card border-3 border-black rounded-2xl px-6 py-6 shadow-neo text-center max-w-xs">
              <div className="text-3xl font-black text-portal-pink uppercase mb-1">GAME OVER</div>
              <div className="text-5xl font-black text-portal-cyan mb-1">{score}</div>
              <div className="text-xs text-portal-text-muted mb-4">BEST: {best}</div>
              <button
                onClick={reset}
                className="bg-portal-yellow hover:bg-portal-yellow/90 text-black border-2 border-black font-black text-sm px-6 py-2 rounded-xl shadow-neo transition-transform active:translate-y-0.5"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile control hint */}
      <div className="w-full max-w-[420px] mt-2 text-center text-[10px] font-bold text-portal-text-muted">
        Click canvas / Tap / Space to flap. R to restart.
      </div>
    </div>
  );
}
