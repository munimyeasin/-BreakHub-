'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Flame,
  Pause,
  Play,
  Rocket,
  ShieldAlert,
  Plane,
  Award
} from 'lucide-react';

interface CyberAviatorGameProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface LeaderboardEntry {
  score: number;
  date: string;
  flights: number;
}

export default function CyberAviatorGame({ gameId = 'g_aviator_26', onGameOver }: CyberAviatorGameProps) {
  const CANVAS_WIDTH = 560;
  const CANVAS_HEIGHT = 340;
  const MAX_FLIGHTS = 5;

  const [state, setState] = useState<'idle' | 'flying' | 'crashed' | 'finished'>('idle');
  const [mult, setMult] = useState<number>(1.0);
  const [fuel, setFuel] = useState<number>(100);
  const [flight, setFlight] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Mutable Game Loop State
  const stateRef = useRef<'idle' | 'flying' | 'crashed' | 'finished'>('idle');
  const multRef = useRef<number>(1.0);
  const fuelRef = useRef<number>(100);
  const flightRef = useRef<number>(1);
  const scoreRef = useRef<number>(0);
  const crashPointRef = useRef<number>(1.01);
  const planeXRef = useRef<number>(40);
  const planeYRef = useRef<number>(220);
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);
  const particlesRef = useRef<Particle[]>([]);
  const timerRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);

  // Sync state refs
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Load High Score & Leaderboard
  useEffect(() => {
    try {
      const savedBest = localStorage.getItem('breakhub_aviator_best');
      if (savedBest) setHighScore(parseInt(savedBest, 10) || 0);
      const savedBoard = localStorage.getItem('breakhub_aviator_leaderboard');
      if (savedBoard) setLeaderboard(JSON.parse(savedBoard) || []);
    } catch {}
  }, []);

  // Web Audio Synthesizer
  const playSynthSound = useCallback((type: 'launch' | 'eject' | 'crash' | 'tick') => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      if (type === 'launch') {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(220, now); osc.frequency.exponentialRampToValueAtTime(480, now + 0.35);
        gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.5);
      } else if (type === 'eject') {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(520, now); osc.frequency.linearRampToValueAtTime(960, now + 0.18);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.25);
      } else if (type === 'crash') {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(320, now); osc.frequency.exponentialRampToValueAtTime(35, now + 0.45);
        gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.55);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(180 + multRef.current * 40, now);
        gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.06);
      }
    } catch {}
  }, []);

  // Reset Flight Round
  const resetRound = useCallback(() => {
    multRef.current = 1.0; setMult(1.0);
    fuelRef.current = 100; setFuel(100);
    planeXRef.current = 40; planeYRef.current = 220;
    trailRef.current = []; particlesRef.current = [];
    crashPointRef.current = Number((1.01 + Math.random() * 18.99).toFixed(2));
    timerRef.current = 0;
    setState('idle');
  }, []);

  // Launch Flight
  const startFlight = useCallback(() => {
    if (stateRef.current !== 'idle') return;
    stateRef.current = 'flying'; setState('flying');
    planeXRef.current = 40; planeYRef.current = 220;
    trailRef.current = []; particlesRef.current = [];
    playSynthSound('launch');
  }, [playSynthSound]);

  // Save Best / Leaderboard
  const saveResult = useCallback((finalScore: number) => {
    const entry: LeaderboardEntry = { score: finalScore, date: new Date().toISOString(), flights: MAX_FLIGHTS };
    try {
      const saved = localStorage.getItem('breakhub_aviator_leaderboard');
      const list: LeaderboardEntry[] = saved ? JSON.parse(saved) : [];
      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      const top5 = list.slice(0, 5);
      localStorage.setItem('breakhub_aviator_leaderboard', JSON.stringify(top5));
      setLeaderboard(top5);

      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('breakhub_aviator_best', String(finalScore));
      }
    } catch {}
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Eject / Parachute Action
  const eject = useCallback(() => {
    if (stateRef.current !== 'flying') return;
    playSynthSound('eject');
    const roundScore = Math.round(fuelRef.current * multRef.current);
    scoreRef.current += roundScore; setScore(scoreRef.current);

    // Ejection sparks
    for (let i = 0; i < 24; i++) {
      particlesRef.current.push({
        x: planeXRef.current + 12,
        y: planeYRef.current,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 4,
        radius: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#00FFCC' : '#FFDE59',
        alpha: 1.0, life: 0, maxLife: 25
      });
    }

    if (flightRef.current >= MAX_FLIGHTS) {
      stateRef.current = 'finished'; setState('finished');
      saveResult(scoreRef.current);
    } else {
      stateRef.current = 'crashed'; setState('crashed');
      setTimeout(() => {
        flightRef.current += 1; setFlight(flightRef.current);
        resetRound();
      }, 1000);
    }
  }, [playSynthSound, resetRound, saveResult]);

  // Crash Trigger
  const triggerCrash = useCallback(() => {
    playSynthSound('crash');
    stateRef.current = 'crashed'; setState('crashed');

    // Crash explosion
    for (let i = 0; i < 32; i++) {
      particlesRef.current.push({
        x: planeXRef.current, y: planeYRef.current,
        vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 2,
        radius: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#FF0055' : '#FF8800',
        alpha: 1.0, life: 0, maxLife: 30
      });
    }

    if (flightRef.current >= MAX_FLIGHTS) {
      stateRef.current = 'finished'; setState('finished');
      saveResult(scoreRef.current);
    } else {
      setTimeout(() => {
        flightRef.current += 1; setFlight(flightRef.current);
        resetRound();
      }, 1200);
    }
  }, [playSynthSound, resetRound, saveResult]);

  // Reset Full Game (5 Flights)
  const resetFullGame = useCallback(() => {
    flightRef.current = 1; setFlight(1);
    scoreRef.current = 0; setScore(0);
    resetRound();
  }, [resetRound]);

  // Physics & Animation Loop
  const updateAndRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_WIDTH * dpr || canvas.height !== CANVAS_HEIGHT * dpr) {
      canvas.width = CANVAS_WIDTH * dpr; canvas.height = CANVAS_HEIGHT * dpr;
    }
    ctx.resetTransform(); ctx.scale(dpr, dpr);

    // Update Kinematics if Flying
    if (stateRef.current === 'flying') {
      timerRef.current += 0.08;
      const t = timerRef.current;

      const newMult = Number((1 + Math.pow(t * 0.025, 1.8)).toFixed(2));
      multRef.current = newMult; setMult(newMult);

      planeYRef.current = Math.max(40, 220 - t * 3.6);
      planeXRef.current = Math.min(CANVAS_WIDTH - 60, 40 + t * 7.5);

      trailRef.current.push({ x: planeXRef.current, y: planeYRef.current });
      if (trailRef.current.length > 90) trailRef.current.shift();

      const newFuel = Math.max(0, Math.round(100 - t * 16));
      fuelRef.current = newFuel; setFuel(newFuel);

      if (Math.floor(t * 10) % 6 === 0) playSynthSound('tick');

      // Check Crash
      if (newMult >= crashPointRef.current) {
        triggerCrash();
      }
    }

    // Render Canvas
    ctx.fillStyle = '#060d14'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid Floor / Background Cyber Grid
    ctx.strokeStyle = '#12253b'; ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += 35) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 35) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    // Flight Path Arc Trail
    const trail = trailRef.current;
    if (trail.length > 1) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        if (i === 0) ctx.moveTo(trail[i].x, trail[i].y);
        else ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.strokeStyle = '#00FFCC';
      ctx.lineWidth = 3; ctx.shadowColor = '#00FFCC'; ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // Draw Plane (if active or flying)
    if (stateRef.current === 'idle' || stateRef.current === 'flying') {
      const px = planeXRef.current;
      const py = planeYRef.current;
      const rot = Math.min(Math.PI / 6, (multRef.current - 1) * 0.1);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-rot);

      // Fuselage (Vintage Red Cyber Jet)
      ctx.fillStyle = '#FF0055';
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();

      // Wings
      ctx.fillStyle = '#FF4077';
      ctx.fillRect(-12, -4, 5, 8);
      ctx.fillRect(10, -4, 5, 8);

      // Cockpit Glow
      ctx.fillStyle = '#7DF9FF';
      ctx.beginPath(); ctx.arc(-6, -1, 3, 0, Math.PI * 2); ctx.fill();

      // Propeller Spinner
      ctx.save(); ctx.translate(-18, 0);
      ctx.rotate(timerRef.current * 0.3);
      ctx.fillStyle = '#00FFCC'; ctx.fillRect(-1, -7, 2, 14);
      ctx.restore();

      ctx.restore();
    }

    // Render Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life++;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (p.life >= p.maxLife) particlesRef.current.splice(i, 1);
    }
  }, [playSynthSound, triggerCrash]);

  // Main Loop
  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      updateAndRender();
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(animationFrameRef.current); };
  }, [updateAndRender]);

  // Keyboard Space / Enter Launcher & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (stateRef.current === 'idle') startFlight();
        else if (stateRef.current === 'flying') eject();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault(); resetFullGame();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault(); setIsMuted(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eject, startFlight, resetFullGame]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto select-none p-1 sm:p-2">
      {/* Top Neo-Brutalist HUD Control Bar */}
      <div className="w-full bg-portal-card border-3 border-black rounded-xl p-2.5 sm:p-3 mb-2 shadow-neo flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-portal-surface border-2 border-black rounded-lg px-2.5 py-1 shadow-neo-sm">
            <div className="text-[10px] font-black text-portal-text-muted uppercase tracking-wider">FLIGHT</div>
            <div className="text-lg sm:text-xl font-black text-portal-cyan leading-none">{flight} / {MAX_FLIGHTS}</div>
          </div>

          <div className="bg-portal-surface border-2 border-black rounded-lg px-2.5 py-1 shadow-neo-sm">
            <div className="text-[10px] font-black text-portal-text-muted uppercase tracking-wider">FUEL</div>
            <div className="text-lg sm:text-xl font-black text-portal-yellow leading-none">{fuel}</div>
          </div>

          <div className="bg-portal-surface border-2 border-black rounded-lg px-2.5 py-1 shadow-neo-sm">
            <div className="text-[10px] font-black text-portal-text-muted uppercase tracking-wider">SCORE</div>
            <div className="text-lg sm:text-xl font-black text-portal-lime leading-none">{score}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="p-2 bg-portal-surface hover:bg-portal-yellow/30 text-portal-text rounded-lg border-2 border-black shadow-neo-sm font-black text-xs"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-portal-pink" /> : <Volume2 className="w-4 h-4 text-portal-lime" />}
          </button>

          <button
            onClick={resetFullGame}
            className="p-2 bg-portal-yellow hover:bg-portal-yellow/90 text-black rounded-lg border-2 border-black shadow-neo-sm font-black text-xs flex items-center gap-1"
            title="Restart 5-Flight Run"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Game Viewport */}
      <div className="relative w-full max-w-[560px] aspect-[560/340] bg-black rounded-2xl border-4 border-black shadow-neo-lg overflow-hidden flex flex-col items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block select-none" />

        {/* Live Multiplier Display */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono font-black text-4xl sm:text-5xl text-portal-cyan drop-shadow-[0_0_15px_rgba(0,255,204,0.5)] pointer-events-none">
          {mult.toFixed(2)}x
        </div>

        {/* Finished / Game Over Modal */}
        {state === 'finished' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4 text-center animate-fadeIn">
            <div className="bg-portal-pink border-3 border-black px-5 py-2 rounded-xl font-black text-black text-2xl uppercase shadow-neo mb-3">
              MISSION COMPLETE!
            </div>

            <div className="bg-portal-card border-3 border-black rounded-xl p-4 w-full max-w-xs shadow-neo mb-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-black text-portal-text-muted">
                <span>TOTAL COMBINED SCORE</span>
                <span className="text-xl font-black text-portal-cyan">{score}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black text-portal-text-muted border-t-2 border-black pt-2">
                <span>BEST RECORD</span>
                <span className="text-lg font-black text-portal-yellow">{highScore}</span>
              </div>
            </div>

            <button
              onClick={resetFullGame}
              className="bg-portal-yellow hover:bg-portal-yellow/90 text-black border-3 border-black font-black text-base px-8 py-3 rounded-xl shadow-neo transition-transform active:translate-y-0.5 flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.5]" /> PLAY 5 FLIGHTS AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Main Launch / Eject Action Deck */}
      <div className="w-full max-w-[560px] mt-2">
        {state === 'idle' && (
          <button
            onClick={startFlight}
            className="w-full bg-portal-lime hover:bg-portal-lime/90 text-black border-3 border-black rounded-xl py-3.5 font-black text-base uppercase tracking-wider shadow-neo flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            <Rocket className="w-5 h-5 stroke-[2.5]" /> LAUNCH FLIGHT {flight}
          </button>
        )}

        {state === 'flying' && (
          <button
            onClick={eject}
            className="w-full bg-portal-pink hover:bg-portal-pink/90 text-white border-3 border-black rounded-xl py-3.5 font-black text-base uppercase tracking-wider shadow-neo flex items-center justify-center gap-2 active:translate-y-0.5 animate-pulse"
          >
            <ShieldAlert className="w-5 h-5" /> EJECT / PARACHUTE NOW!
          </button>
        )}

        {state === 'crashed' && (
          <button
            disabled
            className="w-full bg-slate-800 text-slate-400 border-3 border-black rounded-xl py-3.5 font-black text-base uppercase tracking-wider shadow-neo cursor-wait opacity-80"
          >
            PREPARING NEXT FLIGHT...
          </button>
        )}
      </div>

      {/* Leaderboard Summary Deck */}
      {leaderboard.length > 0 && (
        <div className="w-full max-w-[560px] bg-portal-surface border-2 border-black rounded-xl p-3 mt-2 shadow-neo-sm text-xs">
          <div className="flex items-center gap-1.5 font-black text-portal-yellow uppercase tracking-wider mb-2">
            <Trophy className="w-4 h-4" /> LOCAL TOP 5 FLIGHT RUNS
          </div>
          <div className="space-y-1">
            {leaderboard.map((e, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-300 font-mono text-[11px] border-b border-black/40 pb-0.5">
                <span>#{idx + 1} FLIGHT RUN</span>
                <span className="font-bold text-portal-cyan">{e.score} PTS</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
