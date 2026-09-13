'use client';

import React, { useState, useRef } from 'react';
import { Star, Check, Sparkles } from 'lucide-react';

interface StarRatingProps {
  gameId: string;
  gameTitle?: string;
  rating?: number;
  ratingCount?: number;
  userRating?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCount?: boolean;
  interactive?: boolean;
  onRate?: (rating: number) => Promise<void> | void;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 Star - Needs Polish',
  2: '2 Stars - Fair',
  3: '3 Stars - Good',
  4: '4 Stars - Great!',
  5: '5 Stars - Legendary!'
};

// Zero-dependency procedural Web Audio Synthesizer for Ratings
class RatingAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public playHoverTone(starIndex: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Ascending pleasant major scale tones
      const frequencies = [440, 493.88, 554.37, 659.25, 880];
      const freq = frequencies[Math.max(0, Math.min(4, starIndex - 1))] || 440;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  public playSubmitChime(stars: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      const count = Math.min(5, Math.max(2, stars));

      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreqs[i], startTime);

        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.26);
      }
    } catch {}
  }
}

const ratingAudio = new RatingAudioSynthesizer();

export default function StarRating({
  gameId,
  gameTitle,
  rating = 4.9,
  ratingCount = 0,
  userRating = null,
  size = 'sm',
  showCount = true,
  interactive = true,
  onRate
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [justRated, setJustRated] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const starSizeClass = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }[size];

  const handleStarClick = async (starVal: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive || isSubmitting) return;

    ratingAudio.playSubmitChime(starVal);
    setIsSubmitting(true);
    setJustRated(true);

    try {
      if (onRate) {
        await onRate(starVal);
      }
    } catch {}

    setTimeout(() => {
      setIsSubmitting(false);
    }, 400);

    setTimeout(() => {
      setJustRated(false);
      setIsOpen(false);
    }, 1600);
  };

  const handleMouseEnterStar = (starVal: number) => {
    if (!interactive) return;
    setHoverRating(starVal);
    ratingAudio.playHoverTone(starVal);
  };

  const effectiveRating = hoverRating !== null ? hoverRating : (userRating || rating);

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) {
            setIsOpen(prev => !prev);
          }
        }}
        className={`group/rate flex items-center gap-1 rounded-lg transition-all ${
          interactive
            ? 'cursor-pointer bg-portal-surface hover:bg-portal-yellow text-slate-200 hover:text-black px-1.5 py-0.5 border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1'
            : 'cursor-default px-1 py-0.5'
        }`}
        title={userRating ? `Your rating: ${userRating} ★ (Click to change)` : `Rating: ${rating.toFixed(1)} ★ (${ratingCount} reviews) - Click to rate!`}
      >
        <Star
          className={`${starSizeClass} fill-portal-yellow text-portal-yellow group-hover/rate:text-black group-hover/rate:fill-black stroke-[2.5] transition-colors`}
        />
        <span className="text-[10px] sm:text-[11px] font-black tracking-tight uppercase group-hover/rate:text-black">
          {rating.toFixed(1)}
        </span>

        {showCount && ratingCount > 0 && (
          <span className="text-[9px] sm:text-[10px] text-slate-400 group-hover/rate:text-black font-bold">
            ({ratingCount})
          </span>
        )}

        {userRating && (
          <span className="ml-0.5 px-1 py-0.2 rounded bg-portal-yellow text-black text-[8px] font-black uppercase tracking-wider border border-black shadow-neo-sm">
            {userRating}★
          </span>
        )}
      </button>

      {/* Interactive Rating Popover Dialog */}
      {isOpen && interactive && (
        <>
          {/* Backdrop overlay for closing */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-60 p-3.5 bg-portal-surface border-3 border-black rounded-2xl shadow-neo-lg flex flex-col items-center animate-fadeIn select-none overflow-hidden"
          >
            {/* Top Tri-Color Strip */}
            <div className="h-1.5 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black w-[calc(100%+1.75rem)] -mt-3.5 mb-2.5 shrink-0" />

            {/* Header */}
            <div className="w-full flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-portal-yellow flex items-center gap-1">
                <Sparkles className="w-3 h-3 stroke-[2.5]" />
                {userRating ? 'Update Your Rating' : 'Rate This Game'}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-5 h-5 flex items-center justify-center rounded-md bg-portal-card hover:bg-portal-pink text-white hover:text-black border border-black shadow-neo-sm text-xs font-black transition-all"
              >
                ✕
              </button>
            </div>

            {gameTitle && (
              <p className="text-xs font-black text-white uppercase line-clamp-1 mb-2 text-center w-full">
                {gameTitle}
              </p>
            )}

            {/* Interactive Stars Row */}
            <div
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-portal-card rounded-xl border-2 border-black shadow-neo-sm w-full mb-2.5"
              onMouseLeave={() => setHoverRating(null)}
            >
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isLit = (hoverRating !== null ? hoverRating : (userRating || 0)) >= starVal;
                const isUserCurrent = userRating === starVal && hoverRating === null;

                return (
                  <button
                    key={starVal}
                    type="button"
                    onClick={(e) => handleStarClick(starVal, e)}
                    onMouseEnter={() => handleMouseEnterStar(starVal)}
                    disabled={isSubmitting}
                    className="p-1 rounded-lg hover:bg-portal-yellow/20 active:translate-y-0.5 transition-all focus:outline-none"
                    title={RATING_LABELS[starVal]}
                  >
                    <Star
                      className={`w-5 h-5 stroke-[2.5] transition-all ${
                        isLit
                          ? 'fill-portal-yellow text-portal-yellow scale-110'
                          : 'fill-transparent text-slate-500 hover:text-portal-yellow'
                      } ${isUserCurrent ? 'drop-shadow-[0_0_4px_#FFE600]' : ''}`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Helper label / Submitting Feedback */}
            <div className="min-h-[18px] flex items-center justify-center text-center">
              {justRated ? (
                <span className="text-[10px] font-black text-black bg-portal-lime px-2 py-0.5 rounded-md border border-black shadow-neo-sm flex items-center gap-1 uppercase animate-bounce">
                  <Check className="w-3 h-3 stroke-[2.5]" /> Rating Saved!
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wide">
                  {hoverRating
                    ? RATING_LABELS[hoverRating]
                    : userRating
                    ? `You rated this ${userRating} Stars`
                    : 'Tap stars to rate (1-5)'}
                </span>
              )}
            </div>

            {/* Neo-Brutalist Arrow Pointer */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] w-3 h-3 bg-portal-surface border-r-3 border-b-3 border-black rotate-45" />
          </div>
        </>
      )}
    </div>
  );
}
