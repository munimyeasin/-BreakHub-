'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Activity, Radio } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChromaReflexGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type ColorId = 'cyan' | 'magenta' | 'gold' | 'emerald';

const PADS: { id: ColorId; label: string; icon: string; bg: string; activeBg: string; freq: number }[] = [
  { id: 'cyan', label: 'CYAN', icon: '✦', bg: 'bg-portal-cyan/30 text-black', activeBg: 'bg-portal-cyan text-black shadow-neo scale-105 ring-4 ring-black', freq: 440 },
  { id: 'magenta', label: 'PINK', icon: '★', bg: 'bg-portal-pink/30 text-black', activeBg: 'bg-portal-pink text-black shadow-neo scale-105 ring-4 ring-black', freq: 554 },
  { id: 'gold', label: 'GOLD', icon: '⚡', bg: 'bg-portal-yellow/30 text-black', activeBg: 'bg-portal-yellow text-black shadow-neo scale-105 ring-4 ring-black', freq: 659 },
  { id: 'emerald', label: 'GREEN', icon: '◆', bg: 'bg-portal-green/30 text-black', activeBg: 'bg-portal-green text-black shadow-neo scale-105 ring-4 ring-black', freq: 880 },
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
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        <div className="flex items-center gap-1.5 bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <Activity className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span className="text-[10px] uppercase tracking-wider">Round</span>
          <span className="text-xs font-black">{round}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-portal-cyan px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs text-[11px] font-black text-black">
          <span className="text-[10px] uppercase tracking-wider">Score</span>
          <span className="text-xs font-black">{score}</span>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
          title="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />}
        </button>
      </div>

      {/* Screen / Pad Matrix (9:16 Standard Aspect Ratio Frame) with Figma Handles */}
      <div className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl border-4 border-black p-4 shadow-neo-lg flex flex-col items-center justify-between overflow-hidden">
        {/* Figma Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        {/* Status prompt */}
        <div className="w-full text-center py-1 z-10">
          {isPlaying && (
            <span className="text-[10px] font-black tracking-wider uppercase text-black bg-white border-2 border-black px-3 py-1 rounded-full shadow-neo-xs">
              {isShowingSequence ? '👀 WATCH SEQUENCE...' : '👉 REPEAT THE PATTERN!'}
            </span>
          )}
        </div>

        {!isPlaying && !isDead ? (
          /* Pre-Game Neo-Brutalist Card */
          <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-4 my-auto text-center z-10 animate-scaleIn text-black">
            {/* Figma Handles */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-portal-yellow border-3 border-black flex items-center justify-center mx-auto text-black shadow-neo">
              <Radio className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-neo-xs">
                • [ PATTERN MEMORY ] •
              </div>
              <h3 className="text-xl font-black text-black tracking-tight uppercase">
                Chroma Reflex
              </h3>
              <p className="text-[11px] font-bold text-slate-700 mt-1">
                Memorize the glowing color sequence and repeat it accurately!
              </p>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="w-full py-3.5 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black stroke-[2.5]" />
              <span>START REFLEX</span>
            </button>
          </div>
        ) : (
          /* Active Neo-Brutalist 2x2 Pad Arena */
          <div className="grid grid-cols-2 gap-3.5 w-full max-w-[320px] aspect-square my-auto p-3 bg-white rounded-2xl border-3 border-black shadow-neo">
            {PADS.map(pad => {
              const isActive = activePad === pad.id;
              return (
                <button
                  key={pad.id}
                  type="button"
                  onClick={() => handlePadClick(pad)}
                  disabled={isShowingSequence}
                  className={`rounded-2xl border-3 border-black flex flex-col items-center justify-center font-black transition-all duration-150 select-none ${
                    isActive
                      ? pad.activeBg
                      : `${pad.bg} shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none`
                  }`}
                >
                  <span className="text-2xl mb-1">{pad.icon}</span>
                  <span className="text-xs uppercase tracking-wider font-black">{pad.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom hint */}
        <div className="w-full text-center py-1 z-10">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-wider bg-white/80 border border-black/30 px-2 py-0.5 rounded inline-block">
            • SIMON-SAYS AUDIO REFLEX ENGINE •
          </p>
        </div>

        {/* Game Over Modal */}
        {isDead && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div className="inline-block px-3 py-1 rounded-md bg-portal-pink border-2 border-black text-black text-[11px] font-black uppercase tracking-wider shadow-neo-xs">
                ⚡ SEQUENCE BROKEN ⚡
              </div>

              <div className="bg-portal-yellow border-3 border-black rounded-xl p-3 shadow-neo-sm space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Final Score</div>
                <div className="text-3xl font-black text-black tracking-tight">{score}</div>
              </div>

              <button
                type="button"
                onClick={startGame}
                className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[3]" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
