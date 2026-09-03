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
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top HUD - Ultra Slim */}
      <div className="w-full flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md">
        {/* Timer */}
        <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
          <Timer className="w-3.5 h-3.5 text-portal-cyan" />
          <span className={`text-sm font-black ${timeLeft <= 4 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Taps count & CPS */}
        <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs font-black text-portal-cyan">{taps} Taps</span>
          {isPlaying && <span className="text-[10px] text-slate-400">({cps})</span>}
        </div>

        {/* Live Score */}
        <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
          <Trophy className="w-3.5 h-3.5 text-portal-gold" />
          <span className="text-xs font-black text-portal-gold">{taps * 120}</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 transition-all"
        >
          {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </div>

      {/* Main Core Viewport (9:16 Aspect Ratio Frame) */}
      <div className="relative w-full aspect-[9/16] bg-portal-bg rounded-2xl border-2 border-portal-border p-4 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
        {/* Background Energy Glow */}
        <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${isPlaying ? 'opacity-30 bg-gradient-to-tr from-rose-600 via-purple-600 to-cyan-500 blur-2xl' : 'opacity-5'}`} />

        {!isPlaying ? (
          <div className="text-center space-y-4 relative z-10 p-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-glow-purple">
              <Zap className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                {isFinished ? 'Rush Complete!' : 'Hyper Tapper'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-[220px] mx-auto">
                {isFinished
                  ? `Achieved ${taps} taps (${(taps / 15).toFixed(1)} CPS) with ${taps * 120} pts!`
                  : 'Tap the glowing quantum core as fast as you can in 15 seconds!'}
              </p>
            </div>

            <button
              onClick={handleStart}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-portal-cyan to-blue-600 text-black font-black text-sm shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all mx-auto"
            >
              {isFinished ? (
                <>
                  <RotateCcw className="w-4 h-4" /> RETRY RUSH
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" /> START TAP RUSH
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center my-auto">
            {/* Pulsing Core Button */}
            <button
              onPointerDown={handleTap}
              style={{ transform: `scale(${buttonScale})` }}
              className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tr from-rose-600 via-purple-600 to-portal-cyan border-4 border-white/50 shadow-glow-purple flex flex-col items-center justify-center cursor-pointer select-none touch-none active:brightness-125 transition-transform duration-75"
            >
              {/* Ripple Rings */}
              {ripples.map((ripple) => (
                <span
                  key={ripple.id}
                  style={{ left: ripple.x, top: ripple.y }}
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 animate-ping pointer-events-none"
                />
              ))}

              <Zap className="w-14 h-14 text-white drop-shadow-md" />
              <span className="text-3xl font-black text-white tracking-wider mt-1 drop-shadow-md">
                TAP!
              </span>
              <span className="text-xs text-white/90 font-bold bg-black/30 px-3 py-0.5 rounded-full mt-1">
                +120 PTS
              </span>
            </button>

            {/* Time progress bar */}
            <div className="w-48 bg-portal-surface h-2 rounded-full mt-6 overflow-hidden border border-portal-border/60">
              <div
                className="bg-portal-cyan h-full transition-all duration-200"
                style={{ width: `${(timeLeft / TOTAL_GAME_TIME) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500 font-bold mt-2 text-center">
        💡 Pro-Tip: Alternate with two fingers or jitter-click for ultra-high CPS!
      </p>
    </div>
  );
}
