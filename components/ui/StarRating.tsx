'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Star, Check, Sparkles, X, MessageSquare, ThumbsUp } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface StarRatingProps {
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
  onRate?: (rating: number, review?: string, tags?: string[]) => Promise<void> | void;
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
    badgeBg: 'bg-portal-lime',
    badgeText: 'text-black',
    icon: '👍'
  },
  4: {
    label: 'Great Experience!',
    description: 'Super addictive, smooth controls and great audio!',
    badgeBg: 'bg-portal-orange',
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

const REVIEW_TAGS = [
  '🕹️ Smooth Controls',
  '⚡ Addictive Loop',
  '🎨 Great Graphics',
  '🎵 Awesome Audio',
  '🧠 Big Brain',
  '☕ Chill Vibes',
  '🔥 Hardcore Challenge',
  '✨ Clean Physics'
];

// Zero-dependency Web Audio Synthesizer for Ratings
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

      const frequencies = [440, 493.88, 554.37, 659.25, 880];
      const freq = frequencies[Math.max(0, Math.min(4, starIndex - 1))] || 440;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.05, now);
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
      const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      const count = Math.min(5, Math.max(2, stars));

      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreqs[i], startTime);

        gain.gain.setValueAtTime(0.1, startTime);
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
  rating = 0,
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [justRated, setJustRated] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Optimistic UI states
  const [displayRating, setDisplayRating] = useState<number>(rating);
  const [displayCount, setDisplayCount] = useState<number>(ratingCount);
  const [displayUserRating, setDisplayUserRating] = useState<number | null>(userRating);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDisplayRating(rating);
  }, [rating]);

  useEffect(() => {
    setDisplayCount(ratingCount);
  }, [ratingCount]);

  useEffect(() => {
    setDisplayUserRating(userRating);
    if (userRating) {
      setSelectedRating(userRating);
    }
  }, [userRating]);

  // Keyboard navigation when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const val = parseInt(e.key, 10);
        setSelectedRating(val);
        ratingAudio.playHoverTone(val);
      } else if (e.key === 'Enter' && !isSubmitting && e.target instanceof HTMLInputElement === false) {
        handleSubmit(selectedRating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedRating, isSubmitting, selectedTags, reviewNote]);

  const starSizeClass = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }[size];

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!interactive) return;
    setSelectedRating(userRating || 5);
    setHoverRating(null);
    setJustRated(false);
    setSelectedTags([]);
    setReviewNote('');
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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (starsToSubmit: number) => {
    if (isSubmitting) return;

    ratingAudio.playSubmitChime(starsToSubmit);
    setIsSubmitting(true);
    setJustRated(true);

    // Optimistic UI calculation
    const prevCount = displayCount;
    const isNewRating = !displayUserRating;
    const nextCount = isNewRating ? prevCount + 1 : prevCount;
    const prevTotal = displayRating * prevCount;
    const prevUserVal = displayUserRating || 0;
    const nextSum = prevTotal - prevUserVal + starsToSubmit;
    const nextAvg = nextCount > 0 ? Number((nextSum / nextCount).toFixed(1)) : starsToSubmit;

    setDisplayUserRating(starsToSubmit);
    setDisplayCount(nextCount);
    setDisplayRating(Math.min(5, Math.max(1, nextAvg)));

    if (starsToSubmit >= 4) {
      try {
        confetti({
          particleCount: starsToSubmit === 5 ? 75 : 40,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }

    try {
      if (onRate) {
        await onRate(starsToSubmit, reviewNote.trim() || undefined, selectedTags);
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
    }, 400);

    setTimeout(() => {
      setJustRated(false);
      setIsOpen(false);
    }, 1100);
  };

  const activeDisplayVal = hoverRating !== null ? hoverRating : selectedRating;
  const currentQuality = RATING_QUALITIES[activeDisplayVal] || RATING_QUALITIES[5];

  // Render modal content through portal to document.body
  const modalContent = isOpen && interactive && mounted && typeof document !== 'undefined' ? (
    createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm select-none"
        onClick={(e) => {
          e.stopPropagation();
          if (!isSubmitting) setIsOpen(false);
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Rate and Review Game"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[420px] bg-portal-surface border-4 border-black rounded-2xl sm:rounded-3xl shadow-neo-xl overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto"
        >
          {/* Top Neo Rainbow Stripe */}
          <div className="h-2.5 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black shrink-0" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-portal-surface border-b-3 border-black">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-portal-yellow text-black border-2 border-black flex items-center justify-center shadow-neo-sm shrink-0">
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-tight">
                  {userRating ? 'Update Your Review' : 'Rate & Review'}
                </h3>
                <p className="text-[9px] sm:text-[10px] text-portal-yellow font-black uppercase tracking-wider">
                  Community Player Score
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="w-7 h-7 rounded-lg bg-portal-card hover:bg-portal-pink text-white hover:text-black border-2 border-black shadow-neo-sm flex items-center justify-center text-xs font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
              aria-label="Close Rating Screen"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Game Preview Strip */}
          {(gameTitle || thumbnailUrl) && (
            <div className="px-4 py-2.5 bg-portal-card border-b-3 border-black flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt={`${gameTitle || 'Game'} thumbnail`}
                    className="w-10 h-10 rounded-xl object-cover border-2 border-black shadow-neo-sm shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white uppercase truncate">
                    {gameTitle || 'Arcade Game'}
                  </h4>
                  {gameCategory && (
                    <span className="inline-block text-[9px] font-black uppercase text-portal-cyan tracking-wider">
                      {gameCategory}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 bg-portal-surface px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-sm shrink-0">
                <Star className="w-3.5 h-3.5 fill-portal-yellow text-portal-yellow stroke-[2.5]" />
                <span className="text-xs font-black text-white">{displayRating.toFixed(1)}</span>
                <span className="text-[9px] text-slate-400 font-bold">({displayCount})</span>
              </div>
            </div>
          )}

          {/* Rating Body Content */}
          <div className="p-4 sm:p-5 flex flex-col items-center text-center">
            <p className="text-xs font-black text-slate-300 uppercase tracking-wide mb-3">
              How would you rate this experience?
            </p>

            {/* 5 Big Star Blocks */}
            <div
              className="grid grid-cols-5 gap-2 w-full mb-3.5"
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
                    className={`relative flex flex-col items-center justify-center py-2.5 sm:py-3 rounded-2xl border-3 border-black transition-all cursor-pointer ${
                      isActiveState
                        ? 'bg-portal-yellow text-black shadow-neo -translate-y-1 scale-105'
                        : 'bg-portal-card text-slate-400 shadow-neo-sm hover:border-portal-yellow hover:text-white'
                    }`}
                    title={RATING_QUALITIES[starVal].label}
                  >
                    <Star
                      className={`w-6 h-6 stroke-[2.5] transition-transform ${
                        isActiveState
                          ? 'fill-black text-black scale-110'
                          : 'fill-transparent text-slate-500'
                      }`}
                    />
                    <span className="text-[11px] font-black mt-1 uppercase">
                      {starVal}★
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quality Indicator Badge */}
            <div className="w-full bg-portal-card border-2 border-black rounded-xl p-2.5 shadow-neo-sm mb-3">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border border-black shadow-neo-sm ${currentQuality.badgeBg} ${currentQuality.badgeText}`}>
                  {currentQuality.icon} {currentQuality.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-bold leading-tight">
                {currentQuality.description}
              </p>
            </div>

            {/* Review / Vibe Chips */}
            <div className="w-full mb-3 text-left">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ThumbsUp className="w-3 h-3 text-portal-cyan" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                  Quick Review Tags (Optional)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REVIEW_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border-2 border-black transition-all ${
                        isSelected
                          ? 'bg-portal-cyan text-black shadow-neo-sm translate-x-0.5 translate-y-0.5'
                          : 'bg-portal-card text-slate-300 hover:text-white hover:bg-portal-surface shadow-neo-sm'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Review Input */}
            <div className="w-full mb-4 text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3 h-3 text-portal-yellow" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                  Player Note (Optional)
                </span>
              </div>
              <input
                type="text"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value.slice(0, 100))}
                placeholder="Share a tip or feedback for other gamers..."
                maxLength={100}
                className="w-full bg-portal-card border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-portal-yellow shadow-neo-sm"
              />
            </div>

            {/* Submit & Cancel Actions */}
            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit(selectedRating)}
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-xl border-3 border-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  justRated
                    ? 'bg-portal-lime text-black shadow-none translate-x-1 translate-y-1'
                    : 'bg-portal-yellow hover:bg-portal-cyan text-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none'
                }`}
              >
                {justRated ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>REVIEW SUBMITTED! (+50 XP)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    <span>SUBMIT {selectedRating}★ REVIEW</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="w-full py-1.5 text-center text-[11px] font-black text-slate-400 hover:text-white uppercase transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  ) : null;

  return (
    <>
      {/* Compact Neo-Brutalist Trigger Button */}
      <button
        type="button"
        onClick={handleOpenModal}
        className={`group/rate inline-flex items-center gap-1.5 rounded-xl transition-all ${
          interactive
            ? 'cursor-pointer bg-portal-surface hover:bg-portal-yellow text-slate-200 hover:text-black px-2 py-1 border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none'
            : 'cursor-default px-1 py-0.5'
        }`}
        title={
          displayUserRating
            ? `Your rating: ${displayUserRating} ★ (Click to review)`
            : `Rating: ${displayRating.toFixed(1)} ★ (${displayCount} reviews) - Click to review!`
        }
      >
        <Star
          className={`${starSizeClass} fill-portal-yellow text-portal-yellow group-hover/rate:text-black group-hover/rate:fill-black stroke-[2.5] transition-colors`}
        />
        <span className="text-[10px] sm:text-[11px] font-black tracking-tight uppercase group-hover/rate:text-black">
          {displayRating.toFixed(1)}
        </span>

        {showCount && displayCount > 0 && (
          <span className="text-[9px] sm:text-[10px] text-slate-400 group-hover/rate:text-black font-bold">
            ({displayCount})
          </span>
        )}

        {displayUserRating && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-md bg-portal-yellow text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider border border-black shadow-neo-sm">
            {displayUserRating}★
          </span>
        )}
      </button>

      {/* Portal Modal */}
      {modalContent}
    </>
  );
}
