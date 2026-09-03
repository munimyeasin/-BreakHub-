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
  'NeonPhantom', 'CyberPulse', 'QuantumRider', 'VortexHunter',
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
      <div className="relative w-full max-w-md bg-portal-bg border border-portal-border rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col space-y-5">

        {/* Close button if optional */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-portal-surface text-slate-400 hover:text-white border border-portal-border"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="relative mx-auto w-20 h-20 rounded-2xl bg-portal-surface border-2 border-portal-cyan p-1 shadow-glow-cyan">
            <img
              src={avatarUrl}
              alt="Player Avatar"
              className="w-full h-full rounded-xl object-cover bg-slate-900"
            />
            <div className="absolute -bottom-2 -right-2 p-1.5 bg-portal-neon rounded-full border border-white text-white shadow-glow-purple">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight pt-2">{title}</h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center justify-between">
              <span>Player Handle</span>
              <button
                type="button"
                onClick={handleRandomize}
                className="text-[11px] text-portal-cyan font-bold hover:underline flex items-center gap-1"
              >
                <Dices className="w-3.5 h-3.5" /> Randomize
              </button>
            </label>

            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                className="w-full pl-10 pr-4 py-3 bg-portal-surface border border-portal-border rounded-xl text-sm text-white placeholder-slate-500 font-bold focus:outline-none focus:border-portal-cyan focus:ring-1 focus:ring-portal-cyan transition-all"
              />
            </div>

            {error && (
              <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1 pt-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-portal-cyan to-blue-600 text-black font-black text-sm shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>{confirmText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-500 font-medium">
          Your score submissions will be credited to this name automatically.
        </p>
      </div>
    </div>
  );
}
