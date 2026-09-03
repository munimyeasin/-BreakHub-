'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Activity } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChromaReflexGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type ColorId = 'cyan' | 'magenta' | 'gold' | 'emerald';

const PADS: { id: ColorId; label: string; bg: string; activeBg: string; border: string; glow: string; freq: number }[] = [
  { id: 'cyan', label: 'CYAN', bg: 'bg-cyan-950/60', activeBg: 'bg-portal-cyan text-black', border: 'border-cyan-500/40', glow: 'shadow-glow-cyan', freq: 440 },
  { id: 'magenta', label: 'NEON', bg: 'bg-fuchsia-950/60', activeBg: 'bg-fuchsia-500 text-black', border: 'border-fuchsia-500/40', glow: 'shadow-glow-purple', freq: 554 },
  { id: 'gold', label: 'GOLD', bg: 'bg-amber-950/60', activeBg: 'bg-amber-400 text-black', border: 'border-amber-500/40', glow: 'shadow-glow-gold', freq: 659 },
  { id: 'emerald', label: 'ACID', bg: 'bg-emerald-950/60', activeBg: 'bg-emerald-400 text-black', border: 'border-emerald-500/40', glow: 'shadow-glow-cyan', freq: 880 },
];

export default function ChromaReflexGame({ gameId, onGameOver }: ChromaReflexGameProps) {
  const [sequence, setSequence] = useState<ColorId[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [activePad, setActivePad] = useState<ColorId | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playTone = useCallback((freq: number) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, [soundEnabled]);

  const flashPad = (padId: ColorId, freq: number) => {
    setActivePad(padId);
    playTone(freq);
    setTimeout(() => setActivePad(null), 280);
  };

  const playSequence = useCallback((seq: ColorId[]) => {
    setIsShowingSequence(true);
    let idx = 0;

    const interval = setInterval(() => {
      if (idx >= seq.length) {
        clearInterval(interval);
        setIsShowingSequence(false);
        return;
      }
      const item = PADS.find(p => p.id === seq[idx]);
      if (item) flashPad(item.id, item.freq);
      idx++;
    }, 480);
  }, [playTone]);

  const nextRound = (currentSeq: ColorId[]) => {
    const randomPad = PADS[Math.floor(Math.random() * PADS.length)].id;
    const nextSeq = [...currentSeq, randomPad];
    setSequence(nextSeq);
    setPlayerIndex(0);
    setRound(nextSeq.length);

    setTimeout(() => {
      playSequence(nextSeq);
    }, 600);
  };

  const startGame = () => {
    setScore(0);
    setIsDead(false);
    setIsPlaying(true);
    nextRound([]);
  };

  const handlePadClick = (pad: typeof PADS[0]) => {
    if (!isPlaying || isShowingSequence || isDead) return;

    flashPad(pad.id, pad.freq);

    if (pad.id === sequence[playerIndex]) {
      // Correct input
      const nextIdx = playerIndex + 1;
      const added = 100 * round;
      setScore(s => s + added);

      if (nextIdx === sequence.length) {
        // Round Completed
        if (round >= 5) confetti({ particleCount: 50, spread: 60 });
        setTimeout(() => nextRound(sequence), 400);
      } else {
        setPlayerIndex(nextIdx);
      }
    } else {
      // Wrong input - Game Over
      setIsDead(true);
      setIsPlaying(false);
      setTimeout(() => onGameOver(score), 0);
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* HUD - Ultra Slim */}
      <div className="w-full flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-portal-cyan" />
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Round</span>
          <span className="text-sm font-black text-portal-cyan">{round}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Score</span>
          <span className="text-sm font-black text-portal-gold">{score}</span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60"
        >
          {soundEnabled ? <Volume2 className="w-3 h-3 text-portal-cyan" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </div>

      {/* Screen / Pad Matrix (9:16 Standard Aspect Ratio Frame) */}
      <div className="relative w-full aspect-[9/16] bg-portal-bg rounded-2xl border-2 border-portal-border p-4 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
        {/* Status prompt */}
        <div className="w-full text-center py-1">
          {isPlaying && (
            <span className="text-[11px] font-black tracking-wider uppercase text-portal-cyan bg-portal-surface/80 border border-portal-border px-3 py-1 rounded-full">
              {isShowingSequence ? '👀 Watch Sequence...' : '👉 Your Turn!'}
            </span>
          )}
        </div>

        {!isPlaying ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 shadow-glow-purple">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Chroma Reflex</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">Memorize the glowing cyber sequence and repeat it!</p>
            </div>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-sm shadow-glow-cyan active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-black" /> START REFLEX
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 w-full max-w-[320px] aspect-square my-auto">
            {PADS.map(pad => {
              const isActive = activePad === pad.id;
              return (
                <button
                  key={pad.id}
                  onClick={() => handlePadClick(pad)}
                  disabled={isShowingSequence}
                  className={`rounded-2xl border flex flex-col items-center justify-center font-black text-sm transition-all duration-150 active:scale-95 ${
                    isActive
                      ? `${pad.activeBg} ${pad.glow} scale-105 border-white`
                      : `${pad.bg} ${pad.border} text-slate-400 hover:border-white/40`
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider">{pad.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom hint */}
        <div className="w-full text-center py-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Simon-Says Style Audio Memory
          </p>
        </div>

        {isDead && (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-3 animate-scaleIn">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase">
              Sequence Broken
            </span>
            <h3 className="text-2xl font-black text-white">Score: {score}</h3>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-portal-cyan text-black font-black text-xs shadow-glow-cyan active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
