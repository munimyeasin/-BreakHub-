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
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import { audio } from '@/lib/audio';

export interface DeveloperProfile {
  id: string;
  name: string;
  role: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
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
}

export const DEVELOPERS: DeveloperProfile[] = [
  {
    id: 'tahida',
    name: 'Tahida',
    role: 'UI/UX & Frontend Engineer',
    badge: 'DESIGN & FRONTEND LEAD',
    badgeBg: 'bg-portal-pink',
    badgeText: 'text-white',
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
  {
    id: 'munim',
    name: 'Munim Yeasin',
    role: 'Full-Stack & System Architect',
    badge: 'SYSTEM ARCHITECT',
    badgeBg: 'bg-portal-yellow',
    badgeText: 'text-black',
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
  const [animDirection, setAnimDirection] = useState<'next' | 'prev'>('next');
  const [transitionKey, setTransitionKey] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Mobile Touch Swipe gesture recognition state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  const currentDev = DEVELOPERS[activeIndex] || DEVELOPERS[0];
  const avatarUrl = getAvatarUrl(currentDev.avatarSeed);

  const handleNext = () => {
    setAnimDirection('next');
    setActiveIndex(prev => (prev + 1) % DEVELOPERS.length);
    setTransitionKey(k => k + 1);
  };

  const handlePrev = () => {
    setAnimDirection('prev');
    setActiveIndex(prev => (prev - 1 + DEVELOPERS.length) % DEVELOPERS.length);
    setTransitionKey(k => k + 1);
  };

  const handleSelect = (idx: number) => {
    if (idx === activeIndex) return;
    setAnimDirection(idx > activeIndex ? 'next' : 'prev');
    setActiveIndex(idx);
    setTransitionKey(k => k + 1);
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
          try { audio.playClickSound(); } catch {}
        } else {
          handlePrev();
          try { audio.playClickSound(); } catch {}
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
      setAnimDirection('next');
      setActiveIndex(prev => (prev + 1) % DEVELOPERS.length);
      setTransitionKey(k => k + 1);
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

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes devSpotlightSlideNext {
          0% {
            opacity: 0;
            transform: translateX(18px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes devSpotlightSlidePrev {
          0% {
            opacity: 0;
            transform: translateX(-18px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .animate-dev-spotlight-next {
          animation: devSpotlightSlideNext 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-dev-spotlight-prev {
          animation: devSpotlightSlidePrev 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Top Header: Section Tag + Developer Quick Switcher */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b-3 border-black">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-portal-cyan text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Users className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>DEVELOPER SPOTLIGHT</span>
          </span>
          <span className="hidden xs:inline-block px-2 py-0.5 rounded-lg bg-portal-card border-2 border-black text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
            {activeIndex + 1} of {DEVELOPERS.length}
          </span>
        </div>

        {/* Developer Tabs & Nav Chevrons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              handlePrev();
              try { audio.playClickSound(); } catch {}
            }}
            className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-700 dark:text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
            title="Previous Developer"
            aria-label="Previous Developer"
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
                      ? 'bg-portal-yellow text-black border-black shadow-neo-sm font-black'
                      : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-portal-surface'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full border border-black" style={{
                    backgroundColor: dev.id === 'tahida' ? '#ec4899' : dev.id === 'marzia' ? '#06b6d4' : dev.id === 'rahul' ? '#a3e635' : '#fbbf24'
                  }} />
                  <span>{dev.name}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              handleNext();
              try { audio.playClickSound(); } catch {}
            }}
            className="p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-700 dark:text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
            title="Next Developer"
            aria-label="Next Developer"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE VIEW (< md): Touch Card Showcase                   */}
      {/* ========================================================= */}
      <div
        key={`mobile-${currentDev.id}-${transitionKey}`}
        className={`md:hidden relative z-10 space-y-3.5 ${
          animDirection === 'next' ? 'animate-dev-spotlight-next' : 'animate-dev-spotlight-prev'
        }`}
      >
        {/* Avatar & Header Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-portal-card border-3 border-black shadow-neo-sm">
          <div className="relative w-16 h-16 shrink-0 rounded-2xl bg-portal-surface border-3 border-black p-1 shadow-neo-sm overflow-hidden">
            <img
              src={avatarUrl}
              alt={currentDev.name}
              className="w-full h-full object-cover rounded-xl bg-slate-900"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border border-black shadow-neo-sm mb-1 ${currentDev.badgeBg} ${currentDev.badgeText}`}>
              {currentDev.badge}
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase truncate">
              {currentDev.name}
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-tight truncate">
              {currentDev.role}
            </p>
          </div>
        </div>

        {/* Bio Quote */}
        <div className="p-3 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
          <span className="text-portal-yellow font-black">“</span>
          {currentDev.bio}
          <span className="text-portal-yellow font-black">”</span>
        </div>

        {/* Key Contributions */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
            Key Engineering Modules
          </span>
          <div className="space-y-1">
            {currentDev.keyContributions.map((contrib, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm text-xs text-slate-900 dark:text-white font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-portal-lime stroke-[2.5] shrink-0" />
                <span className="truncate">{contrib}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
            Core Toolkit
          </span>
          <div className="flex flex-wrap gap-1.5">
            {currentDev.techStack.map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 rounded-md bg-portal-surface border border-black text-[10px] font-black text-portal-cyan uppercase shadow-neo-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP VIEW (≥ md): Dual-Pane Showcase Command Deck       */}
      {/* ========================================================= */}
      <div
        key={`desktop-${currentDev.id}-${transitionKey}`}
        className={`hidden md:grid relative z-10 grid-cols-12 gap-5 lg:gap-6 items-center ${
          animDirection === 'next' ? 'animate-dev-spotlight-next' : 'animate-dev-spotlight-prev'
        }`}
      >
        {/* Left Column (4 cols): Profile Visual & Key Stats */}
        <div className="col-span-4 flex flex-col items-center justify-center p-5 rounded-2xl bg-portal-card border-3 border-black shadow-neo-lg text-center space-y-3.5">
          {/* Avatar Visual */}
          <div className="relative w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-portal-surface border-4 border-black p-1.5 shadow-neo overflow-hidden">
            <img
              src={avatarUrl}
              alt={currentDev.name}
              className="w-full h-full object-cover rounded-2xl bg-slate-900"
            />
            <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-portal-lime border-2 border-black shadow-neo-sm" title="Active Core Engineer" />
          </div>

          <div>
            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border-2 border-black shadow-neo-sm mb-1.5 ${currentDev.badgeBg} ${currentDev.badgeText}`}>
              {currentDev.badge}
            </span>
            <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {currentDev.name}
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-tight mt-0.5">
              {currentDev.role}
            </p>
          </div>

          {/* Mini Stat Pills */}
          <div className="grid grid-cols-3 gap-1.5 w-full pt-1 border-t-2 border-black">
            {currentDev.stats.map((stat, i) => (
              <div key={i} className="p-1.5 rounded-lg bg-portal-surface border border-black text-center">
                <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-400 block">{stat.label}</span>
                <span className="text-[10px] font-black text-portal-yellow truncate block">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (8 cols): Bio, Key Contributions & Tech Stack */}
        <div className="col-span-8 flex flex-col justify-center space-y-4">
          {/* Focus & Bio Strip */}
          <div className="p-4 rounded-2xl bg-portal-card border-3 border-black shadow-neo-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-portal-purple text-white px-2 py-0.5 rounded border border-black shadow-neo-sm">
                PRIMARY DOMAIN
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white">{currentDev.focus}</span>
            </div>
            <p className="text-xs lg:text-sm text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
              <span className="text-portal-yellow font-black">“</span>
              {currentDev.bio}
              <span className="text-portal-yellow font-black">”</span>
            </p>
          </div>

          {/* Key Contributions 2x2 Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-portal-cyan stroke-[2.5]" />
              <span>Core Modules & Systems Engineered</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              {currentDev.keyContributions.map((contrib, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm text-xs text-slate-900 dark:text-white font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-portal-lime stroke-[2.5] shrink-0" />
                  <span className="truncate">{contrib}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Tech Toolkit */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mr-1">Toolkit:</span>
              {currentDev.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-lg bg-portal-surface border-2 border-black text-[10px] font-black text-portal-cyan uppercase shadow-neo-sm"
                >
                  {tech}
                </span>
              ))}
            </div>

            {onExploreGames && (
              <button
                onClick={onExploreGames}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all shrink-0"
              >
                <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Play Games</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
