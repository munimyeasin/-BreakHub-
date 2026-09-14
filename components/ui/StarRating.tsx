'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, Check, Sparkles, X, Trophy, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StarRatingProps {
  gameId: string;
  gameTitle?: string;
  gameCategory?: string;
  thumbnailUrl?: string;
  rating?: number;
  ratingCount?: number;
  userRating?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCount?: boolean;
  interactive?: boolean;
  onRate?: (rating: number) => Promise<void> | void;
}

interface RatingQuality {
  label: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
}

const RATING_QUALITIES: Record<number, RatingQuality> = {
  1: {
    label: 'Needs Polish',
    description: 'Needs bug fixes, tuning or gameplay improvements.',
    badgeBg: 'bg-portal-cyan',
    badgeText: 'text-black',
    icon: '⚡'
  },
  2: {
    label: 'Fair Game',
    description: 'Decent arcade loop with potential.',
    badgeBg: 'bg-portal-purple',
    badgeText: 'text-black',
    icon: '🕹️'
  },
  3: {
    label: 'Good Fun',
    description: 'Solid mechanics and satisfying gameplay.',
    badgeBg: 'bg-portal-green',
    badgeText: 'text-black',
    icon: '👍'
  },
  4: {
    label: 'Great Experience!',
    description: 'Super addictive, smooth controls and great audio!',
    badgeBg: 'bg-portal-pink',
    badgeText: 'text-black',
    icon: '🔥'
  },
  5: {
    label: 'Legendary Masterpiece!',
    description: 'Top-tier stress buster! God-tier game loop!',
    badgeBg: 'bg-portal-yellow',
    badgeText: 'text-black',
    icon: '👑'
  }
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

      gain.gain.setValueAtTime(0.06, now);
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

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.31);
      }
    } catch {}
  }
}

const ratingAudio = new RatingAudioSynthesizer();

export default function StarRating({
  gameId,
  gameTitle,
  gameCategory,
  thumbnailUrl,
  rating = 4.9,
  ratingCount = 0,
  userRating = null,
  size = 'sm',
  showCount = true,
  interactive = true,
  onRate
}: StarRatingProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedRating, setSelectedRating] = useState<number>(userRating || 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [justRated, setJustRated] = useState<boolean>(false);

  // Sync selectedRating if userRating changes
  useEffect(() => {
    if (userRating) {
      setSelectedRating(userRating);
    }
  }, [userRating]);

  // Handle keyboard navigation when rating modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const val = parseInt(e.key, 10);
        setSelectedRating(val);
        ratingAudio.playHoverTone(val);
      } else if (e.key === 'Enter' && !isSubmitting) {
        handleSubmit(selectedRating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedRating, isSubmitting]);

  const starSizeClass = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }[size];

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive) return;
    setSelectedRating(userRating || 5);
    setHoverRating(null);
    setJustRated(false);
    setIsOpen(true);
  };

  const handleStarHover = (starVal: number) => {
    setHoverRating(starVal);
    ratingAudio.playHoverTone(starVal);
  };

  const handleStarClick = (starVal: number) => {
    setSelectedRating(starVal);
    ratingAudio.playHoverTone(starVal);
  };

  const handleSubmit = async (starsToSubmit: number) => {
    if (isSubmitting) return;

    ratingAudio.playSubmitChime(starsToSubmit);
    setIsSubmitting(true);
    setJustRated(true);

    if (starsToSubmit >= 4) {
      try {
        confetti({
          particleCount: starsToSubmit === 5 ? 80 : 45,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }

    try {
      if (onRate) {
        await onRate(starsToSubmit);
      }
    } catch {}

    setTimeout(() => {
      setIsSubmitting(false);
    }, 400);

    setTimeout(() => {
      setJustRated(false);
      setIsOpen(false);
    }, 1200);
  };

  const activeDisplayVal = hoverRating !== null ? hoverRating : selectedRating;
  const currentQuality = RATING_QUALITIES[activeDisplayVal] || RATING_QUALITIES[5];

  return (
    <>
      {/* Compact Neo-Brutalist Trigger Button */}
      <button
        type="button"
        onClick={handleOpenModal}
        className={`group/rate inline-flex items-center gap-1.5 rounded-xl transition-all ${
          interactive
            ? 'cursor-pointer bg-white hover:bg-portal-yellow text-black px-2 py-1 border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none'
            : 'cursor-default px-1 py-0.5'
        }`}
        title={
          userRating
            ? `Your rating: ${userRating} ★ (Click to change)`
            : `Rating: ${rating.toFixed(1)} ★ (${ratingCount} reviews) - Click to rate!`
        }
      >
        <Star
          className={`${starSizeClass} fill-portal-yellow text-black stroke-[2.5] transition-colors`}
        />
        <span className="text-[10px] sm:text-[11px] font-black tracking-tight uppercase text-black">
          {rating.toFixed(1)}
        </span>

        {showCount && ratingCount > 0 && (
          <span className="text-[9px] sm:text-[10px] text-slate-600 font-bold">
            ({ratingCount})
          </span>
        )}

        {userRating && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-md bg-portal-yellow text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider border border-black shadow-neo-sm">
            {userRating}★
          </span>
        )}
      </button>

      {/* Full-Screen Neo-Brutalist Rating Modal Screen */}
      {isOpen && interactive && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
          onClick={(e) => {
            e.stopPropagation();
            if (!isSubmitting) setIsOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[390px] bg-white border-4 border-black rounded-2xl sm:rounded-3xl shadow-neo-xl overflow-hidden flex flex-col animate-scaleIn"
          >
            {/* Figma Selection Frame Transform Handles */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

            {/* Top Neo Tri-Color Stripe */}
            <div className="h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black shrink-0" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b-3 border-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-portal-yellow text-black border-2 border-black flex items-center justify-center shadow-neo-sm shrink-0">
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-black uppercase tracking-tight leading-tight">
                    {userRating ? 'Update Your Rating' : 'Rate & Review'}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-black font-black uppercase tracking-wider">
                    Community Player Feedback
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="w-7 h-7 rounded-lg bg-white hover:bg-portal-pink text-black border-2 border-black shadow-neo-sm flex items-center justify-center text-xs font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
                aria-label="Close Rating Screen"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Game Context Preview Strip */}
            {(gameTitle || thumbnailUrl) && (
              <div className="px-4 py-2.5 bg-slate-50 border-b-3 border-black flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {thumbnailUrl && (
                    <img
                      src={thumbnailUrl}
                      alt={gameTitle || 'Game'}
                      className="w-10 h-10 rounded-xl object-cover border-2 border-black shadow-neo-sm shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-black uppercase truncate">
                      {gameTitle || 'Arcade Game'}
                    </h4>
                    {gameCategory && (
                      <span className="inline-block text-[9px] font-black uppercase text-black bg-portal-cyan px-1.5 py-0.2 rounded border border-black tracking-wider">
                        {gameCategory}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-sm shrink-0">
                  <Star className="w-3.5 h-3.5 fill-portal-yellow text-black stroke-[2.5]" />
                  <span className="text-xs font-black text-black">{rating.toFixed(1)}</span>
                  <span className="text-[9px] text-slate-600 font-bold">({ratingCount})</span>
                </div>
              </div>
            )}

            {/* Rating Body Content */}
            <div className="p-4 sm:p-5 flex flex-col items-center text-center bg-white">
              <p className="text-xs font-black text-black uppercase tracking-wide mb-3">
                How would you rate this experience?
              </p>

              {/* 5 Big Tactile Star Blocks */}
              <div
                className="grid grid-cols-5 gap-2 w-full mb-4"
                onMouseLeave={() => setHoverRating(null)}
              >
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isSelected = selectedRating >= starVal;
                  const isHovered = hoverRating !== null && hoverRating >= starVal;
                  const isActiveState = hoverRating !== null ? isHovered : isSelected;

                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => handleStarClick(starVal)}
                      onMouseEnter={() => handleStarHover(starVal)}
                      disabled={isSubmitting}
                      className={`relative flex flex-col items-center justify-center py-3 rounded-2xl border-3 border-black transition-all ${
                        isActiveState
                          ? 'bg-portal-yellow text-black shadow-neo -translate-y-1 scale-105'
                          : 'bg-white text-slate-400 shadow-neo-sm hover:border-black hover:text-black'
                      }`}
                      title={RATING_QUALITIES[starVal].label}
                    >
                      <Star
                        className={`w-6 h-6 stroke-[2.5] transition-transform ${
                          isActiveState
                            ? 'fill-black text-black scale-110'
                            : 'fill-transparent text-slate-300'
                        }`}
                      />
                      <span className="text-xs font-black mt-1 uppercase text-black">
                        {starVal}★
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Quality Indicator Badge */}
              <div className="w-full bg-slate-50 border-2 border-black rounded-xl p-3 shadow-neo-sm mb-4">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border border-black shadow-neo-sm ${currentQuality.badgeBg} ${currentQuality.badgeText}`}>
                    {currentQuality.icon} {currentQuality.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-800 font-bold leading-tight">
                  {currentQuality.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(selectedRating)}
                  disabled={isSubmitting}
                  className={`w-full py-3.5 px-4 rounded-xl border-3 border-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    justRated
                      ? 'bg-portal-green text-black shadow-none translate-x-1 translate-y-1'
                      : 'bg-portal-yellow hover:bg-portal-cyan text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none'
                  }`}
                >
                  {justRated ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>RATING SUBMITTED! (+50 XP)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                      <span>SUBMIT {selectedRating}★ RATING</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 rounded-lg text-[10px] font-black uppercase text-slate-600 hover:text-black transition-colors"
                >
                  Cancel / Keep Browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
