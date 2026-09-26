'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Flame,
  PlusCircle,
  ListFilter,
  Search,
  Gamepad2,
  Zap,
  Grid,
  Cpu,
  Layers,
  HelpCircle,
  Clock,
  CheckCircle2,
  ThumbsUp,
  User,
  Send,
  Loader2,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { GameRequest } from '@/lib/types';
import { censorText, hasProfanity } from '@/lib/censor';

interface GameRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerTag: string;
  onOpenUsernameModal: () => void;
}

const GENRES = [
  { id: 'ALL', label: 'All Genres', icon: Sparkles, color: 'text-portal-cyan' },
  { id: 'ARCADE', label: 'Arcade', icon: Gamepad2, color: 'text-portal-cyan' },
  { id: 'ACTION', label: 'Action', icon: Zap, color: 'text-portal-pink' },
  { id: 'PUZZLE', label: 'Puzzle', icon: Grid, color: 'text-portal-purple' },
  { id: 'STRATEGY', label: 'Strategy', icon: Cpu, color: 'text-portal-lime' },
  { id: 'CARD', label: 'Card / Board', icon: Layers, color: 'text-portal-yellow' },
  { id: 'OTHER', label: 'Other', icon: HelpCircle, color: 'text-slate-300' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  under_review: { label: 'Under Review', bg: 'bg-portal-yellow', text: 'text-black', icon: Clock },
  planned: { label: 'Planned', bg: 'bg-portal-purple', text: 'text-black', icon: Sparkles },
  in_development: { label: 'In Dev', bg: 'bg-portal-cyan', text: 'text-black', icon: Flame },
  completed: { label: 'Completed', bg: 'bg-portal-lime', text: 'text-black', icon: CheckCircle2 },
  declined: { label: 'Declined', bg: 'bg-slate-700', text: 'text-slate-300', icon: X },
};

export default function GameRequestModal({
  isOpen,
  onClose,
  playerTag,
  onOpenUsernameModal
}: GameRequestModalProps) {
  const [activeTab, setActiveTab] = useState<'wishlist' | 'submit'>('wishlist');
  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'upvotes' | 'recent'>('upvotes');

  // Form State
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<GameRequest['genre']>('ARCADE');
  const [description, setDescription] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Upvoting loading map
  const [upvotingIds, setUpvotingIds] = useState<Record<string, boolean>>({});

  // Audio synthesizer for UI feedback
  const playSound = (type: 'upvote' | 'submit' | 'tab') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'upvote') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'submit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.5, now + 0.24);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch {}
  };

  // Fetch requests from API
  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        if (data.requests) {
          setRequests(data.requests);
        }
      }
    } catch (err) {
      console.error('Failed to load game requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
      setSubmitSuccess(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  // Handle Upvote
  const handleUpvote = async (requestId: string) => {
    if (!playerTag) {
      onOpenUsernameModal();
      return;
    }

    if (upvotingIds[requestId]) return;

    setUpvotingIds(prev => ({ ...prev, [requestId]: true }));
    playSound('upvote');

    // Optimistic UI update
    setRequests(prev =>
      prev.map(r => {
        if (r.id === requestId) {
          const userKey = playerTag.toLowerCase();
          const hasUpvoted = r.upvoted_by?.includes(userKey);
          const newUpvotedBy = hasUpvoted
            ? (r.upvoted_by || []).filter(u => u !== userKey)
            : [...(r.upvoted_by || []), userKey];
          return {
            ...r,
            upvotes: hasUpvoted ? Math.max(0, r.upvotes - 1) : r.upvotes + 1,
            upvoted_by: newUpvotedBy
          };
        }
        return r;
      })
    );

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upvote',
          requestId,
          username: playerTag
        })
      });

      if (!res.ok) {
        // Rollback on server error
        fetchRequests();
      }
    } catch {
      fetchRequests();
    } finally {
      setUpvotingIds(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerTag) {
      onOpenUsernameModal();
      return;
    }

    if (title.trim().length < 3) {
      setSubmitError('Game title must be at least 3 characters.');
      return;
    }

    if (description.trim().length < 10) {
      setSubmitError('Please describe the game mechanics (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: title.trim(),
          genre,
          description: description.trim(),
          username: playerTag,
          hp_code: honeypot
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit request.');
        setIsSubmitting(false);
        return;
      }

      playSound('submit');
      setSubmitSuccess(true);
      setTitle('');
      setDescription('');
      // Refresh list
      fetchRequests();

      // Switch to wishlist after 1.5s
      setTimeout(() => {
        setActiveTab('wishlist');
        setSubmitSuccess(false);
      }, 1800);
    } catch (err: any) {
      setSubmitError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesSearch =
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requested_by.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGenre = selectedGenre === 'ALL' || req.genre === selectedGenre;
      const matchesStatus = selectedStatus === 'ALL' || req.status === selectedStatus;

      return matchesSearch && matchesGenre && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return b.upvotes - a.upvotes;
    });
  }, [requests, searchQuery, selectedGenre, selectedStatus, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-portal-surface border-4 border-black shadow-neo-lg rounded-2xl flex flex-col max-h-[90vh] text-white overflow-hidden">

        {/* Top Decorative Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-portal-pink via-portal-yellow to-portal-cyan border-b-2 border-black shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-3 border-black flex items-center justify-between bg-portal-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-portal-yellow border-2 border-black flex items-center justify-center shadow-neo-sm shrink-0">
              <Sparkles className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg uppercase tracking-tight text-white">
                  GAME REQUEST <span className="text-portal-yellow">LAB</span>
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-portal-pink text-black font-black text-[9px] uppercase border border-black shadow-neo-sm">
                  COMMUNITY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold">
                Suggest new mini-games, vote on top ideas & shape the arcade!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-portal-surface hover:bg-portal-pink border-2 border-black text-white hover:text-black font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 shadow-neo-sm"
            aria-label="Close Game Request Modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Navigation Tabs (Wishlist vs. Submit) */}
        <div className="grid grid-cols-2 p-2 gap-2 bg-portal-bg border-b-3 border-black shrink-0">
          <button
            onClick={() => {
              setActiveTab('wishlist');
              playSound('tab');
            }}
            className={`flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 border-black transition-all ${
              activeTab === 'wishlist'
                ? 'bg-portal-cyan text-black shadow-neo-sm'
                : 'bg-portal-card text-slate-300 hover:bg-portal-surface hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 stroke-[2.5]" />
            <span>Community Wishlist ({requests.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('submit');
              playSound('tab');
            }}
            className={`flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 border-black transition-all ${
              activeTab === 'submit'
                ? 'bg-portal-pink text-black shadow-neo-sm'
                : 'bg-portal-card text-slate-300 hover:bg-portal-surface hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Submit Idea</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 scrollbar-thin scrollbar-thumb-black">

          {/* TAB 1: COMMUNITY WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="space-y-3.5">
              {/* Search & Sort Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search game ideas or creators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-portal-card border-2 border-black rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 font-bold focus:outline-none focus:border-portal-cyan shadow-neo-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-black"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort Toggle */}
                <div className="flex items-center gap-1.5 bg-portal-card border-2 border-black rounded-xl p-1 shadow-neo-sm shrink-0">
                  <button
                    onClick={() => setSortBy('upvotes')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                      sortBy === 'upvotes'
                        ? 'bg-portal-yellow text-black border border-black shadow-neo-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔥 Top Voted
                  </button>
                  <button
                    onClick={() => setSortBy('recent')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                      sortBy === 'recent'
                        ? 'bg-portal-yellow text-black border border-black shadow-neo-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡ Newest
                  </button>
                </div>
              </div>

              {/* Genre Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {GENRES.map(g => {
                  const Icon = g.icon;
                  const isSelected = selectedGenre === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(g.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border-2 border-black shrink-0 transition-all ${
                        isSelected
                          ? 'bg-portal-cyan text-black shadow-neo-sm'
                          : 'bg-portal-card text-slate-300 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${isSelected ? 'text-black' : g.color}`} />
                      <span>{g.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Requests List */}
              {isLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-8 h-8 mx-auto text-portal-cyan animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syncing Game Requests...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-10 px-4 text-center bg-portal-card border-3 border-black rounded-2xl shadow-neo-sm space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-portal-surface border-2 border-black flex items-center justify-center mx-auto text-portal-yellow">
                    <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-white">No game requests match your filter</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Be the pioneer! Submit your dream arcade mini-game concept and rally community upvotes.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('submit');
                      playSound('tab');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-portal-pink text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>Submit Game Idea</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((req) => {
                    const userKey = (playerTag || '').toLowerCase();
                    const hasUpvoted = req.upvoted_by?.includes(userKey);
                    const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.under_review;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={req.id}
                        className="bg-portal-card border-3 border-black rounded-2xl p-3.5 sm:p-4 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
                      >
                        {/* Left Content Area */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                              {req.title}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-portal-surface text-portal-cyan text-[9px] font-black uppercase border border-black">
                              {req.genre}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-black ${statusConfig.bg} ${statusConfig.text}`}>
                              <StatusIcon className="w-2.5 h-2.5 stroke-[2.5]" />
                              {statusConfig.label}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed">
                            {req.description}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold pt-0.5">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-portal-yellow" />
                              <span className="text-slate-200">By {req.requested_by}</span>
                            </span>
                            <span>•</span>
                            <span>{new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>

                        {/* Right Upvote Button */}
                        <div className="self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleUpvote(req.id)}
                            disabled={upvotingIds[req.id]}
                            className={`flex sm:flex-col items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 border-black font-black uppercase transition-all shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 ${
                              hasUpvoted
                                ? 'bg-portal-yellow text-black'
                                : 'bg-portal-surface hover:bg-portal-yellow text-slate-200 hover:text-black'
                            }`}
                            title={hasUpvoted ? "Remove your upvote" : "Upvote this game request"}
                          >
                            <Flame className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] ${hasUpvoted ? 'fill-black text-black' : 'text-portal-yellow'}`} />
                            <span className="text-xs sm:text-sm">{req.upvotes}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUBMIT NEW GAME REQUEST */}
          {activeTab === 'submit' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitSuccess ? (
                <div className="p-6 bg-portal-lime/20 border-3 border-black rounded-2xl text-center space-y-2 animate-fadeIn">
                  <div className="w-12 h-12 rounded-xl bg-portal-lime border-2 border-black flex items-center justify-center mx-auto text-black shadow-neo-sm">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <h3 className="font-black text-base text-white uppercase tracking-tight">Idea Submitted Successfully!</h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    Your game request has been added to the Community Wishlist. Other players can now upvote your idea!
                  </p>
                </div>
              ) : (
                <>
                  {submitError && (
                    <div className="p-3 bg-red-500/20 border-2 border-black rounded-xl text-red-300 text-xs font-bold">
                      ⚠️ {submitError}
                    </div>
                  )}

                  {/* Gamer Tag Identity Info */}
                  <div className="flex items-center justify-between p-3 bg-portal-card border-2 border-black rounded-xl shadow-neo-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-portal-yellow border-2 border-black flex items-center justify-center text-black font-black text-xs">
                        <User className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-black uppercase">Submitting as</span>
                        <p className="text-xs font-black text-portal-cyan uppercase truncate">
                          {playerTag || 'Guest Player (Handle Required)'}
                        </p>
                      </div>
                    </div>
                    {!playerTag && (
                      <button
                        type="button"
                        onClick={onOpenUsernameModal}
                        className="px-2.5 py-1 rounded-lg bg-portal-cyan text-black font-black text-[10px] uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                      >
                        Set Gamer Tag
                      </button>
                    )}
                  </div>

                  {/* Game Title Field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase text-slate-200">
                        Game Title <span className="text-portal-pink">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-slate-400">{title.length}/60</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Neon Pinball Matrix, Synthwave Kart, Cyber Chess..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={60}
                      required
                      className="w-full px-3.5 py-2.5 bg-portal-card border-2 border-black rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-bold focus:outline-none focus:border-portal-pink shadow-neo-sm"
                    />
                  </div>

                  {/* Genre Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-200">
                      Genre / Category <span className="text-portal-pink">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {GENRES.filter(g => g.id !== 'ALL').map(g => {
                        const Icon = g.icon;
                        const isSelected = genre === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGenre(g.id as any)}
                            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-black uppercase border-2 border-black transition-all ${
                              isSelected
                                ? 'bg-portal-pink text-black shadow-neo-sm'
                                : 'bg-portal-card text-slate-300 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : g.color}`} />
                            <span>{g.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mechanics & Description Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase text-slate-200">
                        Gameplay Mechanics & Details <span className="text-portal-pink">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-slate-400">{description.length}/350</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Describe core mechanics, powerups, retro theme, controls, and why this would be fun on Break Hub..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={350}
                      required
                      className="w-full px-3.5 py-2.5 bg-portal-card border-2 border-black rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-bold focus:outline-none focus:border-portal-pink shadow-neo-sm resize-none"
                    />
                  </div>

                  {/* Honeypot hidden input for anti-spam bots */}
                  <input
                    type="text"
                    name="hp_code"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {/* Live Preview Card & Moderation Indicator */}
                  {title.trim() && (
                    <div className="p-3 bg-portal-bg border-2 border-dashed border-slate-700 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Live Wishlist Preview</span>
                        {(hasProfanity(title) || hasProfanity(description)) && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-portal-yellow">
                            <ShieldAlert className="w-3 h-3" />
                            Auto-Moderation Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-white uppercase">{censorText(title)}</span>
                          <span className="px-1.5 py-0.2 text-[8px] font-black uppercase rounded bg-portal-cyan text-black border border-black">
                            {genre}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-black bg-portal-yellow text-black rounded border border-black">
                          🔥 1 UPVOTE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 italic truncate">{censorText(description) || 'No description entered yet...'}</p>
                    </div>
                  )}

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !playerTag}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-portal-pink text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 stroke-[2.5]" />
                        <span>Submit Game Request</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

        </div>

        {/* Modal Footer Tip */}
        <div className="p-3 bg-portal-card border-t-2 border-black flex items-center justify-between text-[11px] text-slate-400 font-bold shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-portal-yellow" />
            Top upvoted concepts enter official development sprints!
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-portal-cyan">BREAK HUB ENGINE</span>
        </div>

      </div>
    </div>
  );
}
