'use client';

import React, { useState, useEffect } from 'react';
import { Gamepad2, Zap } from 'lucide-react';

export default function YouTubeStyleLoader({ onLoaded }: { onLoaded?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Quick, smooth YouTube style progress bar simulation
    // Finishes within 600-800ms so it never ruins user experience.
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 25) + 15;
      if (current >= 100) {
        current = 100;
        setProgress(100);
        clearInterval(interval);

        // Brief pause at 100% before fade out
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsComplete(true);
            onLoaded?.();
          }, 300);
        }, 200);
      } else {
        setProgress(current);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [onLoaded]);

  if (isComplete) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0B0819] flex flex-col items-center justify-center transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* YouTube-style red / cyber-cyan loading bar at top of viewport */}
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
          <span>Loading Arcade Assets ({progress}%)</span>
        </div>
      </div>
    </div>
  );
}
