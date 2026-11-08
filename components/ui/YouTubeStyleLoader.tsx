'use client';

import React, { useState, useEffect } from 'react';
import { Gamepad2, Zap, ShieldAlert, Sparkles, Cpu } from 'lucide-react';

interface YouTubeStyleLoaderProps {
  onLoaded?: () => void;
  isLoadingData?: boolean;
}

const ARCADE_TIPS = [
  "Initializing Cybernetic Neural Networks…",
  "Calibrating Neo-Brutalist Physics Engine…",
  "Loading High-Score Leaderboard Crystals…",
  "Polishing Plasma Lasers & Pixel Blades…",
  "Almost ready! Preparing the ultimate arcade..."
];

export default function YouTubeStyleLoader({ onLoaded, isLoadingData = false }: YouTubeStyleLoaderProps) {
  const [progress, setProgress] = useState(10);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Track elapsed time to show slow connection warnings / tips
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate arcade tips every 2.5s
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex(i => (i + 1) % ARCADE_TIPS.length);
    }, 2500);
    return () => clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (isLoadingData) {
            return 90;
          }
          return 100;
        }
        return prev + 20;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isLoadingData]);

  useEffect(() => {
    if (!isLoadingData && progress >= 90 && progress < 100) {
      setProgress(100);
    }
  }, [isLoadingData, progress]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const fadeTimer = setTimeout(() => {
          setIsComplete(true);
          onLoaded?.();
        }, 300);
        return () => clearTimeout(fadeTimer);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [progress, onLoaded]);

  if (isComplete) return null;

  const isTakingLong = elapsedSeconds >= 3;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-busy="true"
      className={`fixed inset-0 z-50 bg-[#0B0819] flex flex-col items-center justify-center transition-opacity duration-300 p-4 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Cyber-cyan/pink loading progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/50 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-portal-cyan via-portal-pink to-portal-yellow shadow-[0_0_16px_#00F0FF] transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-col items-center max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
        {/* Animated Icon Container */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-portal-cyan via-portal-pink to-portal-yellow rounded-3xl blur opacity-60 animate-pulse"></div>
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-portal-cyan border-4 border-black flex items-center justify-center shadow-neo animate-bounce">
            <Gamepad2 className="w-10 h-10 sm:w-12 sm:h-12 text-black stroke-[2.5]" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2">
          BREAK<span className="text-portal-cyan">HUB</span>
        </h1>

        {/* Dynamic Rotating Tip / Status */}
        <div className="min-h-[28px] mb-6 flex items-center justify-center">
          <p className="text-xs sm:text-sm font-bold text-portal-yellow tracking-wide transition-all duration-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-portal-pink animate-spin shrink-0" />
            <span>{ARCADE_TIPS[tipIndex]}</span>
          </p>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-portal-surface px-5 py-2.5 rounded-2xl border-3 border-black shadow-neo-sm mb-4">
          <Cpu className="w-4 h-4 text-portal-cyan animate-pulse stroke-[2.5]" />
          <span>{progress < 100 ? `Loading Arcade Assets & Database (${progress}%)` : 'Ready! Launching Hub...'}</span>
        </div>

        {/* Slow connection notice if loading takes over 3 seconds */}
        {isTakingLong && (
          <div className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-300 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Connecting to live arcade servers… Hang tight!</span>
          </div>
        )}
      </div>
    </div>
  );
}
