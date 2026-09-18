'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Zap, Flame, Trophy, Timer, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HyperTapperGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

const TOTAL_GAME_TIME = 15; // 15 seconds

interface TapRipple {
  id: number;
  x: number;
  y: number;
}

export default function HyperTapperGame({ onGameOver }: HyperTapperGameProps) {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_GAME_TIME);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ripples, setRipples] = useState<TapRipple[]>([]);
  const [buttonScale, setButtonScale] = useState(1);

  const tapsRef = useRef(0);
  const endTimeRef = useRef<number>(0);
  const onGameOverRef = useRef(onGameOver);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // Audio synthesizer for energetic clicks
  const playTapSound = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
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

      // Pitch scales slightly with higher taps for satisfying progression
      const freq = Math.min(1200, 420 + (tapsRef.current % 30) * 18);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.04);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }, [soundEnabled]);

  // Independent, Rock-Solid Timestamp-Based Countdown Loop
  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const interval = setInterval(() => {
      const remainingMs = endTimeRef.current - Date.now();
      const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(secondsLeft);

      if (remainingMs <= 0) {
        clearInterval(interval);
        setIsPlaying(false);
        setIsFinished(true);
        setTimeLeft(0);

        const finalScore = tapsRef.current * 120;
        if (tapsRef.current >= 45) {
          confetti({ particleCount: 75, spread: 70 });
        }
        setTimeout(() => onGameOverRef.current(finalScore), 0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isFinished]);

  const handleStart = () => {
    tapsRef.current = 0;
    setTaps(0);
    setTimeLeft(TOTAL_GAME_TIME);
    endTimeRef.current = Date.now() + TOTAL_GAME_TIME * 1000;
    setIsFinished(false);
    setIsPlaying(true);
    setRipples([]);
  };

  const handleTap = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPlaying || isFinished) return;

    tapsRef.current += 1;
    setTaps(tapsRef.current);
    playTapSound();

    // Pulse animation
    setButtonScale(0.91);
    setTimeout(() => setButtonScale(1), 60);

    // Ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple: TapRipple = { id: Date.now() + Math.random(), x, y };

    setRipples(prev => [...prev.slice(-4), newRipple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 450);
  };

  const cps = isPlaying && timeLeft < TOTAL_GAME_TIME ? (taps / Math.max(1, TOTAL_GAME_TIME - timeLeft)).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col items-center select-none w-full max-w-full h-full flex-1 justify-center">
      {/* Top HUD - Ultra Slim Neo-Brutalist Strip */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)*9/16))] flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md shrink-0">
        {/* Timer */}
        <div className="flex items-center gap-1.5 bg-portal-card px-2 py-0.5 rounded-lg border border-portal-border/60 text-[11px] font-black">
          <Timer className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
          <span className={`text-xs font-black ${timeLeft <= 4 ? 'text-portal-pink animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Taps count & CPS */}
        <div className="flex items-center gap-1.5 bg-portal-card px-2 py-0.5 rounded-lg border border-portal-border/60 text-[11px] font-black">
          <Flame className="w-3.5 h-3.5 text-portal-pink fill-portal-pink" />
          <span className="text-xs font-black text-portal-cyan">{taps} Taps</span>
          {isPlaying && <span className="text-[10px] text-slate-300">({cps})</span>}
        </div>

        {/* Live Score */}
        <div className="flex items-center gap-1.5 bg-portal-card px-2 py-0.5 rounded-lg border border-portal-border/60 text-[11px] font-black">
          <Trophy className="w-3.5 h-3.5 text-portal-yellow fill-portal-yellow" />
          <span className="text-xs font-black text-portal-yellow">{taps * 120}</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-card text-white hover:bg-portal-yellow hover:text-black border border-portal-border/60 font-black transition-all"
          aria-label="Toggle sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>
      </div>

      {/* Main Core Viewport (9:16 Aspect Ratio Frame) */}
      <div className="relative w-auto h-[min(76vh,640px)] max-w-full aspect-[9/16] bg-portal-bg bg-neo-dots rounded-2xl border-2 border-portal-border p-4 shadow-2xl flex flex-col items-center justify-center overflow-hidden shrink-0">
        {/* Subtle Decorative Grid Lines */}
        <div className="absolute inset-0 bg-neo-grid opacity-30 pointer-events-none" />

        {!isPlaying ? (
          <div className="text-center space-y-4 relative z-10 p-4">
            <div className="w-16 h-16 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
              <Zap className="w-8 h-8 fill-black stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                {isFinished ? 'Rush Complete!' : 'Hyper Tapper'}
              </h3>
              <p className="text-xs text-slate-300 font-bold mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                {isFinished
                  ? `Achieved ${taps} taps (${(taps / 15).toFixed(1)} CPS) with ${taps * 120} pts!`
                  : 'Tap the quantum core as fast as possible in 15 seconds!'}
              </p>
            </div>

            <button
              onClick={handleStart}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all mx-auto"
            >
              {isFinished ? (
                <>
                  <RotateCcw className="w-4 h-4 stroke-[3]" /> RETRY RUSH
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" /> START TAP RUSH
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center my-auto z-10">
            {/* Tactile Neo-Brutalist Core Puck */}
            <button
              onPointerDown={handleTap}
              style={{ transform: `scale(${buttonScale})` }}
              className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-portal-yellow active:bg-portal-pink border-4 border-black shadow-neo-xl flex flex-col items-center justify-center cursor-pointer select-none touch-none transition-transform duration-75 group"
            >
              {/* Concentric Grip Ring */}
              <div className="w-38 h-38 sm:w-44 sm:h-44 rounded-full border-3 border-dashed border-black flex flex-col items-center justify-center pointer-events-none">
                {/* Ripple Rings */}
                {ripples.map((ripple) => (
                  <span
                    key={ripple.id}
                    style={{ left: ripple.x, top: ripple.y }}
                    className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 animate-ping pointer-events-none"
                  />
                ))}

                <Zap className="w-12 h-12 sm:w-14 sm:h-14 text-black fill-black stroke-[2.5]" />
                <span className="text-2xl sm:text-3xl font-black text-black tracking-widest uppercase mt-1">
                  TAP!
                </span>
                <span className="text-[10px] sm:text-xs text-portal-yellow font-black bg-black px-2.5 py-0.5 rounded-md mt-1 border border-black shadow-neo-sm">
                  +120 PTS
                </span>
              </div>
            </button>

            {/* Time progress bar */}
            <div className="w-52 h-4 bg-black rounded-lg mt-6 overflow-hidden border-2 border-black p-0.5 shadow-neo-sm">
              <div
                className="bg-portal-pink h-full rounded-sm border-r-2 border-black transition-all duration-100"
                style={{ width: `${(timeLeft / TOTAL_GAME_TIME) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-2.5 text-center">
        ⚡ Pro-Tip: Alternate with two fingers or jitter-click for ultra-high CPS!
      </p>
    </div>
  );
}
