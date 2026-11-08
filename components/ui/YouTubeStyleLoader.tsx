'use client';

import React, { useState, useEffect } from 'react';
import { Gamepad2, Zap } from 'lucide-react';

interface YouTubeStyleLoaderProps {
  onLoaded?: () => void;
  isLoadingData?: boolean;
}

export default function YouTubeStyleLoader({ onLoaded, isLoadingData = false }: YouTubeStyleLoaderProps) {
  const [progress, setProgress] = useState(10);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    // Smooth progress simulation that pauses slightly while waiting for real assets/API,
    // then rushes to 100% once ready.
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (isLoadingData) {
          // Slow down around 75% if data/assets are still loading
          if (prev >= 75) return 75;
        }
        if (prev >= 95) {
          return 95;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [isLoadingData]);

  // When data finishes loading or minimum time elapses, complete to 100%
  useEffect(() => {
    if (!isLoadingData && progress < 100) {
      setProgress(100);
      timer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsComplete(true);
          onLoaded?.();
        }, 300);
      }, 200);
    }
    return () => clearTimeout(timer);
  }, [isLoadingData, progress, onLoaded]);

  if (isComplete) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0B0819] flex flex-col items-center justify-center transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* YouTube-style cyber-cyan/pink loading bar at top of viewport */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-black/40 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-portal-cyan via-portal-pink to-portal-yellow transition-all duration-150 ease-out shadow-[0_0_12px_#00F0FF]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-portal-cyan border-3 border-black flex items-center justify-center shadow-neo mb-4 animate-bounce">
          <Gamepad2 className="w-8 h-8 sm:w-10 sm:h-10 text-black stroke-[2.5]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2">
          BREAK<span className="text-portal-cyan">HUB</span>
        </h1>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-portal-yellow bg-portal-surface px-4 py-1.5 rounded-xl border-2 border-black shadow-neo-sm">
          <Zap className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
          <span>{progress < 100 ? `Loading Arcade Assets (${progress}%)` : 'Ready!'}</span>
        </div>
      </div>
    </div>
  );
}
