'use client';

import React, { useState, useEffect } from 'react';
import { User, Sparkles, Dices, ArrowRight, X, ShieldAlert } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';

interface UsernamePromptModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onConfirm: (username: string) => void;
  title?: string;
  subtitle?: string;
  confirmText?: string;
  initialUsername?: string;
}

const RANDOM_TAGS = [
  'NeonPhantom', 'ArcadePulse', 'QuantumRider', 'VortexHunter',
  'ZeroByte', 'ShadowBlade', 'PixelNova', 'AuraStriker',
  'HyperSpectre', 'BinaryGhost', 'TurboGlitch', 'MatrixRunner'
];

export default function UsernamePromptModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Update Gamer Tag',
  subtitle = 'Choose a player handle to record your high scores on the global leaderboard.',
  confirmText = 'SAVE HANDLE',
  initialUsername = ''
}: UsernamePromptModalProps) {
  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername(initialUsername || '');
      setError(null);
    }
  }, [isOpen, initialUsername]);

  if (!isOpen) return null;

  const handleRandomize = () => {
    const randomName = RANDOM_TAGS[Math.floor(Math.random() * RANDOM_TAGS.length)] + '_' + Math.floor(Math.random() * 90 + 10);
    setUsername(randomName);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    if (clean.length < 2) {
      setError('Handle must be at least 2 characters long.');
      return;
    }
    if (clean.length > 20) {
      setError('Handle cannot exceed 20 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(clean)) {
      setError('Use only letters, numbers, spaces, hyphens, and underscores.');
      return;
    }

    onConfirm(clean);
  };

  const currentSeed = username.trim() || 'GamerTag';
  const avatarUrl = getAvatarUrl(currentSeed);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-portal-surface border-4 border-black rounded-2xl p-6 sm:p-7 shadow-neo-lg flex flex-col space-y-5">
        {/* Top Decorative Color Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-cyan via-portal-yellow to-portal-pink border-b-2 border-black" />

        {/* Close button if optional */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-portal-card hover:bg-portal-pink text-white hover:text-black border-2 border-black shadow-neo-sm font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="relative mx-auto w-20 h-20 rounded-2xl bg-portal-card border-3 border-black p-1 shadow-neo">
            <img
              src={avatarUrl}
              alt="Player arcade avatar preview"
              className="w-full h-full rounded-xl object-cover bg-slate-900"
            />
            <div className="absolute -bottom-2 -right-2 p-1.5 bg-portal-yellow rounded-lg border-2 border-black text-black shadow-neo-sm">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase pt-2">{title}</h2>
          <p className="text-xs text-slate-300 font-bold leading-relaxed max-w-xs mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black uppercase text-slate-200 tracking-wider">
              <span>Player Handle</span>
              <button
                type="button"
                onClick={handleRandomize}
                className="px-2 py-0.5 rounded bg-portal-yellow text-black font-black border border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1 text-[11px]"
              >
                <Dices className="w-3.5 h-3.5 stroke-[2.5]" /> Randomize
              </button>
            </div>

            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-yellow stroke-[2.5]" />
              <input
                type="text"
                autoFocus
                maxLength={20}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter gamer tag (e.g. Munim Yeasin)"
                className="w-full pl-10 pr-4 py-3 bg-portal-card border-3 border-black rounded-xl text-sm text-white placeholder-slate-400 font-black focus:outline-none focus:bg-slate-900 focus:shadow-neo transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-portal-pink font-black flex items-center gap-1.5 pt-1">
                <ShieldAlert className="w-4 h-4 shrink-0 stroke-[2.5]" /> {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-portal-cyan text-black font-black text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <span>{confirmText}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 font-bold uppercase tracking-wider">
          Your score submissions will be credited to this name automatically.
        </p>
      </div>
    </div>
  );
}
