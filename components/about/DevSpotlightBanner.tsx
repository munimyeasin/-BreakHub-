'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Code2,
  Cpu,
  Layers,
  Palette,
  ShieldCheck,
  Gamepad2,
  Terminal,
  Zap,
  CheckCircle2,
  ExternalLink,
  Shuffle,
  Eye,
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import { audio } from '@/lib/audio';

const InstagramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export interface DeveloperProfile {
  id: string;
  name: string;
  role: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  accentBg: string;
  dotColor: string;
  avatarSeed: string;
  accentColor: string;
  bio: string;
  focus: string;
  keyContributions: string[];
  techStack: string[];
  stats: {
    label: string;
    value: string;
  }[];
  portfolioUrl?: string;
  instagramUrl?: string;
  instagramHandle?: string;
}

export const DEVELOPERS: DeveloperProfile[] = [
  {
    id: 'munim',
    name: 'Munim Yeasin',
    role: 'Full-Stack & System Architect',
    badge: 'SYSTEM ARCHITECT & LEAD',
    badgeBg: 'bg-portal-yellow',
    badgeText: 'text-black',
    accentBg: 'from-portal-yellow/20 via-portal-surface to-portal-card',
    dotColor: '#fbbf24',
    avatarSeed: 'MunimArchitect',
    accentColor: 'text-portal-yellow',
    bio: 'Architected the zero-asset procedural Web Audio synthesizer, full-stack Next.js API endpoints, database persistence, and gamification economy.',
    focus: 'Full-Stack Architecture, Web Audio & Gamification Suite',
    keyContributions: [
      'Zero-Asset Web Audio API Procedural Synthesizer',
      'Daily Quests, Play Streaks & Trophy Vault System',
      'Next.js 16 Server API Endpoints & Score Persistence',
      'Leaderboard Engine & Personal Best Tracking',
    ],
    techStack: ['Next.js 16', 'React 19', 'Web Audio API', 'TypeScript', 'JSON Store'],
    stats: [
      { label: 'Role', value: 'Architecture' },
      { label: 'Focus', value: 'Full-Stack' },
      { label: 'Status', value: 'Lead Dev' },
    ],
    portfolioUrl: '/portfolio.html',
    instagramUrl: 'https://instagram.com/__yeasin__0',
    instagramHandle: '@__yeasin__0',
  },
  {
    id: 'tahida',
    name: 'Tahida',
    role: 'UI/UX & Frontend Engineer',
    badge: 'DESIGN & FRONTEND LEAD',
    badgeBg: 'bg-portal-pink',
    badgeText: 'text-white',
    accentBg: 'from-portal-pink/20 via-portal-surface to-portal-card',
    dotColor: '#ec4899',
    avatarSeed: 'TahidaCyber',
    accentColor: 'text-portal-pink',
    bio: 'Crafted the bold high-contrast Neo-Brutalist design system, responsive mobile layouts, and theme engine across the entire Stress Buster platform.',
    focus: 'Neo-Brutalist UI/UX, Theme Engine & Responsive Layouts',
    keyContributions: [
      'Neo-Brutalist Theme System & Dark/Light Mode',
      'Mobile 4x3 Adaptive Game Grid & Sidebar Drawer',
      'Neon Candy Blast UI & Match-3 Animations',
      'Accessibility, Micro-Interactions & Badge Systems',
    ],
    techStack: ['React 19', 'Next.js 16', 'Tailwind CSS', 'TypeScript', 'Lucide Icons'],
    stats: [
      { label: 'Role', value: 'Frontend & UI' },
      { label: 'Focus', value: 'Design Systems' },
      { label: 'Status', value: 'Active Dev' },
    ],
  },
  {
    id: 'marzia',
    name: 'Marzia',
    role: 'Game Logic & QA Engineer',
    badge: 'LOGIC & QA SPECIALIST',
    badgeBg: 'bg-portal-cyan',
    badgeText: 'text-black',
    accentBg: 'from-portal-cyan/20 via-portal-surface to-portal-card',
    dotColor: '#06b6d4',
    avatarSeed: 'MarziaNeon',
    accentColor: 'text-portal-cyan',
    bio: 'Engineered deterministic game rules, mathematical puzzle state machines, minimax AI logic, and comprehensive collision quality assurance.',
    focus: 'Game Rule Engines, Deterministic Logic & QA Verification',
    keyContributions: [
      'Naval Grid Strike Fleet AI & Grid Calculations',
      'Multidimension XO Minimax Algorithm & Win Logic',
      'Cyber Katana Slicer Hitbox & Slice Math',
      'Deterministic Game Balancing & QA Playtesting',
    ],
    techStack: ['TypeScript', 'Canvas 2D API', 'State Machines', 'Game Math', 'QA Testing'],
    stats: [
      { label: 'Role', value: 'Game Logic' },
      { label: 'Focus', value: 'Math & QA' },
      { label: 'Status', value: 'Active Dev' },
    ],
  },
  {
    id: 'rahul',
    name: 'Rahul',
    role: 'Systems & Gameplay Developer',
    badge: 'CANVAS & GAMEPLAY DEV',
    badgeBg: 'bg-portal-lime',
    badgeText: 'text-black',
    accentBg: 'from-portal-lime/20 via-portal-surface to-portal-card',
    dotColor: '#a3e635',
    avatarSeed: 'RahulMatrix',
    accentColor: 'text-portal-lime',
    bio: 'Optimized high-performance 60 FPS HTML5 Canvas rendering loops, particle physics systems, and smooth mobile touch gamepad controls.',
    focus: 'Canvas 2D Engine, Particle Physics & Touch Controls',
    keyContributions: [
      'Neon Starfighter Nebula Stars & Shmup Engine',
      '60 FPS Canvas Physics & Particle Simulation Engine',
      'Singularity Horizon Gravity & Singularity Pull',
      'Responsive Mobile Virtual Touch Gamepad HUD',
    ],
    techStack: ['HTML5 Canvas', 'Vector Math', 'Particle Systems', 'Touch Gestures', 'TypeScript'],
    stats: [
      { label: 'Role', value: 'Gameplay' },
      { label: 'Focus', value: '60 FPS Canvas' },
      { label: 'Status', value: 'Active Dev' },
    ],
  },
];

interface DevSpotlightBannerProps {
  onExploreGames?: () => void;
}

export default function DevSpotlightBanner({ onExploreGames }: DevSpotlightBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Mobile Touch Swipe gesture recognition state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  const handleNext = () => {
    setActiveIndex(prev => (prev + 1) % DEVELOPERS.length);
    try {
      audio.playClickSound();
    } catch {}
  };

  const handlePrev = () => {
    setActiveIndex(prev => (prev - 1 + DEVELOPERS.length) % DEVELOPERS.length);
    try {
      audio.playClickSound();
    } catch {}
  };

  const handleSelect = (idx: number) => {
    if (idx === activeIndex) return;
    setActiveIndex(idx);
    try {
      audio.playClickSound();
    } catch {}
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchDeltaX.current = 0;
      touchDeltaY.current = 0;
      isSwiping.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current || touchStartX.current === null || touchStartY.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    touchDeltaX.current = currentX - touchStartX.current;
    touchDeltaY.current = currentY - touchStartY.current;
  };

  const handleTouchEnd = () => {
    if (isSwiping.current && touchStartX.current !== null) {
      const dX = touchDeltaX.current;
      const dY = touchDeltaY.current;
      const absX = Math.abs(dX);
      const absY = Math.abs(dY);

      if (absX > 35 && absX > absY * 0.7) {
        if (dX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    isSwiping.current = false;

    setTimeout(() => setIsPaused(false), 5000);
  };

  // Auto-cycling rotation timer (7s)
  useEffect(() => {
    if (DEVELOPERS.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % DEVELOPERS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <div
      ref={bannerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full rounded-2xl sm:rounded-3xl bg-portal-surface border-3 sm:border-4 border-black p-4 sm:p-5 md:p-6 shadow-neo-lg overflow-hidden touch-pan-y"
    >
      {/* Top Tri-Color Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

      {/* Top Header: Section Tag + Developer Quick Switcher */}
      <div className="relative z-40 flex flex-wrap items-center justify-between gap-2 mb-6 pb-3 border-b-3 border-black">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-portal-cyan text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>DEVELOPER CARD STACK</span>
          </span>
          <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-portal-card border-2 border-black text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 shadow-neo-sm">
            <span>Card</span>
            <span className="text-portal-yellow font-black">{activeIndex + 1}</span>
            <span>of {DEVELOPERS.length}</span>
          </span>
        </div>

        {/* Developer Tabs & Nav Chevrons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-700 dark:text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
            title="Previous Card"
            aria-label="Previous Card"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* Quick Switcher Tabs */}
          <div className="flex items-center gap-1 bg-portal-card p-1 rounded-xl border-2 border-black shadow-neo-sm overflow-x-auto max-w-[280px] xs:max-w-[380px] sm:max-w-none">
            {DEVELOPERS.map((dev, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={dev.id}
                  onClick={() => handleSelect(idx)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all border uppercase shrink-0 ${
                    isActive
                      ? 'bg-portal-yellow text-black border-black shadow-neo-sm font-black scale-105'
                      : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-portal-surface'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full border border-black"
                    style={{ backgroundColor: dev.dotColor }}
                  />
                  <span>{dev.name}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNext}
            className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-700 dark:text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
            title="Next Card"
            aria-label="Next Card"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* Shuffle / Next Card Shortcut */}
          <button
            onClick={handleNext}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all ml-1"
            title="Cycle to next stacked card"
          >
            <Shuffle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3D STACKED CARD DECK CONTAINER (IMMERSIVE PEEKING DECK)    */}
      {/* ========================================================= */}
      <div className="relative w-full pt-10 sm:pt-12 pb-24 sm:pb-28 md:pb-32 lg:pb-36 px-2 sm:px-6 md:px-10">
        <div className="relative w-full min-h-[660px] xs:min-h-[620px] sm:min-h-[580px] md:min-h-[520px] lg:min-h-[480px]">
          {DEVELOPERS.map((dev, idx) => {
            // Compute relative index in stack (0 = Top Card, 1 = 1st Behind, 2 = 2nd Behind, 3 = 3rd Behind)
            const relIndex = (idx - activeIndex + DEVELOPERS.length) % DEVELOPERS.length;
            const isTop = relIndex === 0;
            const avatarUrl = getAvatarUrl(dev.avatarSeed);

            // Stack transformations & styles for balanced, prominent card peeking
            let transformClass = '';
            let zIndexStyle = 30;
            let opacityStyle = 1;
            let cursorClass = 'cursor-default';

            if (relIndex === 0) {
              zIndexStyle = 30;
              opacityStyle = 1;
              transformClass = 'translate-x-0 translate-y-0 scale-100 rotate-0 shadow-neo-lg';
            } else if (relIndex === 1) {
              zIndexStyle = 20;
              opacityStyle = 0.96;
              // Distinct right fan peek with subtle downward offset & clockwise tilt
              transformClass =
                'translate-x-3.5 sm:translate-x-6 md:translate-x-8 translate-y-4 sm:translate-y-5 scale-[0.985] rotate-[2.8deg] sm:rotate-[3.2deg] shadow-neo hover:translate-y-2 hover:translate-x-5 sm:hover:translate-x-9 hover:scale-[0.995] hover:rotate-[1.5deg] hover:opacity-100 hover:shadow-neo-lg';
              cursorClass = 'cursor-pointer group';
            } else if (relIndex === 2) {
              zIndexStyle = 10;
              opacityStyle = 0.90;
              // Distinct left fan peek with downward offset & counter-clockwise tilt
              transformClass =
                '-translate-x-3.5 sm:-translate-x-6 md:-translate-x-8 translate-y-8 sm:translate-y-10 scale-[0.965] -rotate-[2.8deg] sm:-rotate-[3.2deg] shadow-neo hover:translate-y-4 hover:-translate-x-5 sm:hover:-translate-x-9 hover:scale-[0.98] hover:-rotate-[1.5deg] hover:opacity-100 hover:shadow-neo-lg';
              cursorClass = 'cursor-pointer group';
            } else {
              zIndexStyle = 5;
              opacityStyle = 0.82;
              // Center depth peek with cascading vertical drop & subtle tilt
              transformClass =
                'translate-x-0 translate-y-12 sm:translate-y-16 scale-[0.94] rotate-[0.8deg] sm:rotate-[1.2deg] shadow-neo-sm hover:translate-y-8 hover:scale-[0.96] hover:opacity-100 hover:shadow-neo';
              cursorClass = 'cursor-pointer group';
            }

            return (
              <div
                key={dev.id}
                onClick={() => {
                  if (!isTop) {
                    handleSelect(idx);
                  }
                }}
                style={{
                  zIndex: zIndexStyle,
                  opacity: opacityStyle,
                }}
                className={`absolute inset-x-0 top-0 transition-all duration-300 ease-out select-none ${transformClass} ${cursorClass}`}
              >
                {/* ========================================================= */}
                {/* PROTRUDING PHYSICAL INDEX TAB (PEEKING ABOVE CARD)        */}
                {/* ========================================================= */}
                {!isTop && (
                  <div
                    className={`absolute z-40 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-t-xl sm:rounded-t-2xl bg-portal-card border-3 border-black border-b-0 shadow-neo-sm transition-all duration-200 group-hover:-translate-y-2 group-hover:shadow-neo ${
                      relIndex === 1
                        ? '-top-8 sm:-top-9 right-3 xs:right-6 sm:right-10 md:right-14'
                        : relIndex === 2
                        ? '-top-8 sm:-top-9 left-3 xs:left-6 sm:left-10 md:left-14'
                        : '-top-9 sm:-top-10 left-1/2 -translate-x-1/2'
                    }`}
                    style={{
                      borderTopColor: dev.dotColor,
                      borderTopWidth: '4px',
                    }}
                  >
                    <div className="relative w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden border border-black shrink-0">
                      <img src={avatarUrl} alt={dev.name} className="w-full h-full object-cover bg-slate-900" />
                    </div>
                    <span
                      className="w-2 h-2 rounded-full border border-black shrink-0"
                      style={{ backgroundColor: dev.dotColor }}
                    />
                    <span className="text-[10px] sm:text-xs font-black uppercase text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                      {dev.name}
                    </span>
                    <span
                      className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.2 rounded border border-black shadow-neo-sm hidden xs:inline-block ${dev.badgeBg} ${dev.badgeText}`}
                    >
                      {dev.badge.split('&')[0].trim()}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-black text-portal-yellow uppercase tracking-wider pl-0.5">
                      <Eye className="w-2.5 h-2.5 stroke-[2.5]" />
                      <span>Draw</span>
                    </span>
                  </div>
                )}

                {/* Physical Card Container */}
                <div
                  className={`relative rounded-2xl sm:rounded-3xl bg-portal-card border-3 sm:border-4 border-black p-4 sm:p-5 md:p-6 overflow-hidden transition-all duration-300 ${
                    isTop
                      ? 'ring-2 ring-portal-yellow/40 shadow-neo-lg'
                      : 'hover:border-portal-yellow group-hover:ring-2 group-hover:ring-portal-yellow/30'
                  }`}
                >
                  {/* Card Top Accent Strip */}
                  <div
                    className="absolute top-0 left-0 right-0 h-2 border-b-2 border-black"
                    style={{ backgroundColor: dev.dotColor }}
                  />

                  {/* Top-Right Quick Promotion Indicator on Background Cards */}
                  {!isTop && (
                    <div className="absolute top-3 right-3 sm:right-4 flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg bg-portal-surface border-2 border-black shadow-neo-sm text-[10px] font-black uppercase text-slate-900 dark:text-white group-hover:bg-portal-yellow group-hover:text-black transition-colors">
                      <span className="w-2 h-2 rounded-full border border-black" style={{ backgroundColor: dev.dotColor }} />
                      <span>{dev.name}</span>
                      <span className="hidden sm:inline-block font-bold text-slate-600 dark:text-slate-300 group-hover:text-black">
                        · Click to Draw to Top
                      </span>
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* CARD CONTENT: RESPONSIVE DESKTOP & MOBILE DOSSIER        */}
                  {/* ========================================================= */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-center pt-1">
                    {/* Left Column (4 cols on desktop): Avatar & Profile Deck */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm text-center space-y-2.5 sm:space-y-3">
                      {/* Avatar Visual */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl sm:rounded-3xl bg-portal-card border-3 sm:border-4 border-black p-1 shadow-neo overflow-hidden">
                        <img
                          src={avatarUrl}
                          alt={dev.name}
                          className="w-full h-full object-cover rounded-xl sm:rounded-2xl bg-slate-900"
                        />
                        <div
                          className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full border-2 border-black shadow-neo-sm"
                          style={{ backgroundColor: dev.dotColor }}
                          title="Active Core Engineer"
                        />
                      </div>

                      <div>
                        <span className={`inline-block px-2 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-2 border-black shadow-neo-sm mb-1 ${dev.badgeBg} ${dev.badgeText}`}>
                          {dev.badge}
                        </span>
                        <h2 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[220px]">
                          {dev.name}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-bold leading-tight mt-0.5">
                          {dev.role}
                        </p>
                      </div>

                      {/* Mini Stat Pills */}
                      <div className="grid grid-cols-3 gap-1 w-full pt-1 border-t-2 border-black">
                        {dev.stats.map((stat, i) => (
                          <div key={i} className="p-1 rounded-lg bg-portal-card border border-black text-center">
                            <span className="text-[7px] sm:text-[8px] font-black uppercase text-slate-600 dark:text-slate-400 block">{stat.label}</span>
                            <span className="text-[9px] sm:text-[10px] font-black text-portal-yellow truncate block">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column (8 cols on desktop): Bio, Key Contributions & Tech Stack */}
                    <div className="md:col-span-8 flex flex-col justify-center space-y-3 sm:space-y-3.5">
                      {/* Focus & Bio Strip */}
                      <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-portal-surface border-2 sm:border-3 border-black shadow-neo-sm space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-portal-purple text-white px-2 py-0.5 rounded border border-black shadow-neo-sm">
                            PRIMARY DOMAIN
                          </span>
                          <span className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white truncate">{dev.focus}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
                          <span className="text-portal-yellow font-black text-sm">“</span>
                          {dev.bio}
                          <span className="text-portal-yellow font-black text-sm">”</span>
                        </p>
                      </div>

                      {/* Key Contributions 2x2 Grid */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
                          <span>Core Modules & Systems Engineered</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                          {dev.keyContributions.map((contrib, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm text-[11px] sm:text-xs text-slate-900 dark:text-white font-bold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-portal-lime stroke-[2.5] shrink-0" />
                              <span className="truncate">{contrib}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Core Tech Toolkit & Action CTAs */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mr-1">Toolkit:</span>
                          {dev.techStack.map((tech) => (
                            <span
                              key={tech}
                              className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-portal-surface border border-black text-[9px] sm:text-[10px] font-black text-portal-cyan uppercase shadow-neo-sm"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>

                        {/* Interactive Buttons on Top Card */}
                        {isTop && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {dev.portfolioUrl && (
                              <a
                                href={dev.portfolioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-portal-cyan text-black font-black text-[11px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Portfolio</span>
                              </a>
                            )}
                            {dev.instagramUrl && (
                              <a
                                href={dev.instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all shrink-0"
                                title={`Instagram: ${dev.instagramHandle || '@__yeasin__0'}`}
                              >
                                <InstagramIcon className="w-3.5 h-3.5" />
                                <span>{dev.instagramHandle || 'Instagram'}</span>
                              </a>
                            )}
                            {onExploreGames && (
                              <button
                                onClick={onExploreGames}
                                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-portal-yellow text-black font-black text-[11px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all shrink-0"
                              >
                                <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Play Games</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
