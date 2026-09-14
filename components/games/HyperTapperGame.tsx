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
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        {/* Timer */}
        <div className="flex items-center gap-1.5 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Timer className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className={`text-xs font-black ${timeLeft <= 4 ? 'text-rose-600 animate-pulse' : 'text-black'}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Taps count & CPS */}
        <div className="flex items-center gap-1.5 bg-portal-pink px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Flame className="w-3.5 h-3.5 text-black fill-black" />
          <span className="text-xs font-black text-black">{taps} Taps</span>
          {isPlaying && <span className="text-[10px] text-slate-800">({cps})</span>}
        </div>

        {/* Live Score */}
        <div className="flex items-center gap-1.5 bg-portal-cyan px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Trophy className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-xs font-black text-black">{taps * 120}</span>
        </div>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
          aria-label="Toggle sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />}
        </button>
      </div>

      {/* Main Core Viewport (9:16 Aspect Ratio Frame) with Figma Handles */}
      <div className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl border-4 border-black p-4 shadow-neo-lg flex flex-col items-center justify-between overflow-hidden">
        {/* Figma Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        {/* Top Tag */}
        <div className="w-full text-center py-1 z-10">
          <span className="text-[10px] font-black tracking-wider uppercase text-black bg-white border-2 border-black px-3 py-1 rounded-full shadow-neo-xs">
            {isPlaying ? '✦ SPEED RUSH IN PROGRESS ✦' : '• 15-SEC HYPER REFLEX •'}
          </span>
        </div>

        {!isPlaying ? (
          /* Pre-Game & Game Over Neo-Brutalist Card */
          <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-4 my-auto text-center z-10 animate-scaleIn text-black">
            {/* Figma Handles */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-portal-pink border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
              <Zap className="w-7 h-7 fill-black stroke-[2.5]" />
            </div>

            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-yellow border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                {isFinished ? '⚡ TIME EXPIRED ⚡' : '• [ SPEED TEST ] •'}
              </div>
              <h3 className="text-xl font-black text-black tracking-tight uppercase">
                {isFinished ? 'Rush Complete!' : 'Hyper Tapper'}
              </h3>
              <p className="text-[11px] font-bold text-slate-700 mt-1">
                {isFinished
                  ? `Achieved ${taps} taps (${(taps / 15).toFixed(1)} CPS) with ${taps * 120} pts!`
                  : 'Tap the quantum core as fast as possible in 15 seconds!'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
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
              type="button"
              onPointerDown={handleTap}
              style={{ transform: `scale(${buttonScale})` }}
              className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-portal-yellow active:bg-portal-pink border-4 border-black shadow-neo-xl flex flex-col items-center justify-center cursor-pointer select-none touch-none transition-transform duration-75 group"
            >
              {/* Concentric Grip Ring */}
              <div className="w-38 h-38 sm:w-42 sm:h-42 rounded-full border-3 border-dashed border-black flex flex-col items-center justify-center pointer-events-none">
                {/* Ripple Rings */}
                {ripples.map((ripple) => (
                  <span
                    key={ripple.id}
                    style={{ left: ripple.x, top: ripple.y }}
                    className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 animate-ping pointer-events-none"
                  />
                ))}

                <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-black fill-black stroke-[2.5]" />
                <span className="text-2xl sm:text-3xl font-black text-black tracking-widest uppercase mt-0.5">
                  TAP!
                </span>
                <span className="text-[10px] text-portal-yellow font-black bg-black px-2.5 py-0.5 rounded-md mt-1 border border-black shadow-neo-xs">
                  +120 PTS
                </span>
              </div>
            </button>

            {/* Time progress bar */}
            <div className="w-52 h-4 bg-white rounded-lg mt-6 overflow-hidden border-2 border-black p-0.5 shadow-neo-sm">
              <div
                className="bg-portal-pink h-full rounded-sm border-r-2 border-black transition-all duration-100"
                style={{ width: `${(timeLeft / TOTAL_GAME_TIME) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Bottom Helper Hint */}
        <div className="w-full text-center py-1 z-10">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-wider bg-white/80 border border-black/30 px-2 py-0.5 rounded inline-block">
            ⚡ Alternate with two fingers or jitter-click for max CPS!
          </p>
        </div>
      </div>
    </div>
  );
}
