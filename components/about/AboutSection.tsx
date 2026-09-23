'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Gamepad2,
  Trophy,
  Zap,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Sparkles,
  Layers,
  Code2,
  Target,
  Award,
  Volume2,
  Flame,
  ArrowRight,
} from 'lucide-react';
import DevSpotlightBanner from './DevSpotlightBanner';
import { audio } from '@/lib/audio';

const projectHighlights = [
  {
    icon: Gamepad2,
    title: '18 Custom Mini-Games',
    desc: 'From fast-paced space shooters, katana slicing, and match-3 puzzles to naval grid warfare and multi-board strategy, all running on HTML5 Canvas.',
    color: 'text-black',
    badgeBg: 'bg-portal-cyan text-black',
  },
  {
    icon: Trophy,
    title: 'Competitive Leaderboards',
    desc: 'Real-time score tracking, player gamer tags, personal bests, and global Hall of Fame rankings for friendly arcade competition.',
    color: 'text-black',
    badgeBg: 'bg-portal-yellow text-black',
  },
  {
    icon: Zap,
    title: '60 FPS Native Performance',
    desc: 'Zero heavy external engines. Pure Canvas 2D vector math, 9:16 portrait viewport scaling, and instant loading on both mobile and desktop.',
    color: 'text-black',
    badgeBg: 'bg-portal-lime text-black',
  },
  {
    icon: ShieldCheck,
    title: 'Modern Tech Stack',
    desc: 'Powered by Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS for robust typing, performance, and retro-arcade aesthetics.',
    color: 'text-black',
    badgeBg: 'bg-portal-purple text-black',
  },
];

const gamificationFeatures = [
  {
    icon: Flame,
    title: 'Daily Play Streaks',
    desc: 'Consecutive calendar day tracking with streak preservation, rollover checks, and XP flame bonuses.',
    badge: 'STREAKS',
    color: 'text-portal-pink',
  },
  {
    icon: Zap,
    title: '14 Cyber Rank Titles',
    desc: 'Exponential XP leveling curve from Novice Netrunner to Apex Cybernetic Deity with rank titles.',
    badge: 'LEVELING',
    color: 'text-portal-cyan',
  },
  {
    icon: Target,
    title: 'Deterministic Daily Quests',
    desc: '3 daily missions generated per calendar day with date hashing, midnight timers, and Master Bonus rewards.',
    badge: 'MISSIONS',
    color: 'text-portal-yellow',
  },
  {
    icon: Award,
    title: '22 Holographic Trophies',
    desc: 'Tiered achievements across Bronze, Silver, Gold, and Platinum rarity with unlock tracking and XP payouts.',
    badge: 'VAULT',
    color: 'text-portal-lime',
  },
];

const techStack = [
  { name: 'Next.js 16', category: 'Framework (App Router)' },
  { name: 'React 19', category: 'UI Component Library' },
  { name: 'TypeScript', category: 'Static Type Safety' },
  { name: 'Tailwind CSS', category: 'Styling & Neo-Brutal Themes' },
  { name: 'HTML5 Canvas API', category: '60 FPS 2D Physics Engine' },
  { name: 'Web Audio API', category: 'Procedural Audio Synthesizer' },
  { name: 'Lucide Icons', category: 'Vector Iconography' },
  { name: 'Canvas Confetti', category: 'Victory Celebration Engine' },
];

const engineeringDomains = [
  {
    title: 'Full-Stack & Web Audio Systems',
    lead: 'Munim Yeasin',
    desc: 'Zero-asset procedural oscillator audio engine, REST API persistence, score migration, and gamification economy.',
    color: 'border-portal-yellow text-portal-yellow',
    badgeBg: 'bg-portal-yellow text-black',
  },
  {
    title: 'UI/UX & Design Architecture',
    lead: 'Munim Yeasin',
    desc: 'High-contrast Neo-Brutalist design tokens, 4x3 responsive mobile game grids, slide bar navigation, and multi-theme engine.',
    color: 'border-portal-pink text-portal-pink',
    badgeBg: 'bg-portal-pink text-black',
  },
  {
    title: 'Game Logic & Deterministic QA',
    lead: 'Munim Yeasin',
    desc: 'Mathematical puzzle state machines, Minimax AI game algorithms, fleet grid coordinate logic, and collision verification.',
    color: 'border-portal-cyan text-portal-cyan',
    badgeBg: 'bg-portal-cyan text-black',
  },
  {
    title: 'HTML5 Canvas & Particle Physics',
    lead: 'Munim Yeasin',
    desc: 'High-performance 60 FPS requestAnimationFrame rendering, vector normal rebounds, parallax starfields, and mobile touch gamepads.',
    color: 'border-portal-lime text-portal-lime',
    badgeBg: 'bg-portal-lime text-black',
  },
];

export interface AboutSectionProps {
  initialView?: 'project' | 'devs';
  onExploreGames?: () => void;
  onOpenLeaderboard?: () => void;
  onViewChange?: (view: 'project' | 'devs') => void;
}

export default function AboutSection({
  initialView = 'project',
  onExploreGames,
  onOpenLeaderboard,
  onViewChange,
}: AboutSectionProps) {
  const [currentView, setCurrentView] = useState<'project' | 'devs'>(initialView);

  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  const handleSwitchView = (view: 'project' | 'devs') => {
    setCurrentView(view);
    onViewChange?.(view);
    try {
      audio.playClickSound();
    } catch {}
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. TOP DUAL-SECTION NAVIGATION SWITCHER */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-2 sm:p-2.5 rounded-2xl bg-portal-surface border-3 border-black shadow-neo">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-2 hidden xs:inline-block">
            ABOUT SECTION:
          </span>
          <div className="flex items-center gap-1.5">
            {/* About Project Tab */}
            <button
              onClick={() => handleSwitchView('project')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-2 border-black ${
                currentView === 'project'
                  ? 'bg-portal-cyan text-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5'
                  : 'bg-portal-card text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4 stroke-[2.5]" />
              <span>About Project</span>
            </button>

            {/* About Developer Tab */}
            <button
              onClick={() => handleSwitchView('devs')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-2 border-black ${
                currentView === 'devs'
                  ? 'bg-portal-yellow text-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5'
                  : 'bg-portal-card text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 stroke-[2.5]" />
              <span>About Developer</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-portal-pink text-black border border-black shadow-neo-sm font-black hidden sm:inline-block">
                SPOTLIGHT
              </span>
            </button>
          </div>
        </div>

        {/* Quick Shortcut to Games */}
        {onExploreGames && (
          <button
            onClick={onExploreGames}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow hover:text-black border-2 border-black text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider transition-all shadow-neo-sm"
          >
            <span>Play Games</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* VIEW A: ABOUT DEVELOPER (SPOTLIGHT & ARCHITECT)           */}
      {/* ========================================================= */}
      {currentView === 'devs' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Devs Hero Header */}
          <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-portal-surface border-4 border-black p-6 sm:p-8 shadow-neo-lg">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-pink via-portal-cyan to-portal-yellow border-b-2 border-black" />

            <div className="relative z-10 max-w-3xl space-y-3 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-portal-purple border-2 border-black text-black text-xs font-black tracking-wider uppercase shadow-neo-sm">
                <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>CREATOR & LEAD ARCHITECT</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">
                Meet The <span className="text-portal-yellow">Developer</span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                Break Hub is architected and engineered from the ground up by Munim Yeasin. Explore the interactive Developer Spotlight below to view the architectural dossier, core systems engineered, tech stack, and full-stack modules.
              </p>
            </div>
          </section>

          {/* Interactive Developer Spotlight Banner */}
          <section className="space-y-3">
            <DevSpotlightBanner onExploreGames={onExploreGames} />
          </section>

          {/* Engineering Pillars & Architecture */}
          <section className="space-y-4">
            <div className="border-b-3 border-black pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-portal-cyan stroke-[2.5]" />
                  <span>Engineering Architecture & Core Modules</span>
                </h2>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mt-0.5">
                  How Munim Yeasin architected and engineered the Break Hub platform
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-portal-cyan text-black text-[10px] font-black uppercase border-2 border-black shadow-neo-sm">
                CORE ARCHITECTURE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {engineeringDomains.map((domain, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-portal-card border-3 border-black p-4 sm:p-5 space-y-2.5 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-black shadow-neo-sm ${domain.badgeBg}`}>
                      {domain.lead}
                    </span>
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      MODULE 0{idx + 1}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                    {domain.title}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                    {domain.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Dev View Footer */}
          <footer className="rounded-2xl bg-portal-surface border-3 border-black p-5 sm:p-6 text-center space-y-2 shadow-neo-sm">
            <div className="flex items-center justify-center gap-2 text-portal-yellow">
              <Users className="w-5 h-5 stroke-[2.5]" />
              <span className="font-black text-sm tracking-wider uppercase">Break Hub Lead Architect</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold max-w-xl mx-auto leading-relaxed">
              Munim Yeasin • Creator & Full-Stack Architect
            </p>
          </footer>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW B: ABOUT PROJECT (PORTAL & ARCHITECTURE)             */}
      {/* ========================================================= */}
      {currentView === 'project' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Project Hero Header */}
          <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-portal-surface border-4 border-black p-6 sm:p-8 shadow-neo-lg">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

            <div className="relative z-10 max-w-3xl space-y-4 pt-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-portal-pink border-2 border-black text-black text-xs font-black tracking-wider uppercase shadow-neo-sm">
                <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>INTERNSHIP PROJECT PLATFORM</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">
                About <span className="text-portal-cyan">Break Hub</span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                Welcome to <strong className="text-slate-900 dark:text-white font-black">Break Hub</strong>, an interactive web gaming platform designed and engineered by Munim Yeasin. The hub features 18 custom HTML5 Canvas games, high-contrast Retro Neo-Brutalist aesthetics, responsive physics, zero-asset procedural Web Audio, and live competitive leaderboards.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onExploreGames && (
                  <button
                    onClick={onExploreGames}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  >
                    <Gamepad2 className="w-4 h-4 fill-black stroke-[2.5]" />
                    <span>Play Mini-Games</span>
                  </button>
                )}
                {onOpenLeaderboard && (
                  <button
                    onClick={onOpenLeaderboard}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-portal-card border-3 border-black text-portal-yellow hover:bg-portal-yellow hover:text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  >
                    <Trophy className="w-4 h-4 stroke-[2.5]" />
                    <span>View Leaderboards</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Platform Capabilities */}
          <section className="space-y-4">
            <div className="border-b-3 border-black pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Platform Architecture & Features
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {projectHighlights.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-portal-card border-3 border-black p-5 space-y-3 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-black shadow-neo-sm ${item.badgeBg}`}>
                      <Icon className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Behavioral UX & Gamification Architecture */}
          <section className="space-y-4">
            <div className="border-b-3 border-black pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-portal-yellow stroke-[2.5]" />
                  <span>Gamification & Retention Suite</span>
                </h2>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mt-0.5">
                  UX behavioral engagement engine powered by procedural audio
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-portal-lime text-black text-[10px] font-black uppercase border-2 border-black shadow-neo-sm">
                ACTIVE SUITE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {gamificationFeatures.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-portal-card border-3 border-black p-5 space-y-2.5 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-portal-surface border-2 border-black flex items-center justify-center shadow-neo-sm">
                        <Icon className={`w-4 h-4 stroke-[2.5] ${item.color}`} />
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-portal-surface text-slate-700 dark:text-slate-300 border border-black">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Technology Stack Matrix */}
          <section className="rounded-2xl sm:rounded-3xl bg-portal-surface border-4 border-black p-6 sm:p-8 space-y-6 shadow-neo-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-3 border-black pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-portal-cyan stroke-[2.5]" />
                  <span>Technology Stack</span>
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mt-0.5">
                  Modern web engineering tools powering our arcade platform
                </p>
              </div>
              <span className="text-xs font-black text-black bg-portal-lime px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-sm flex items-center gap-1.5 uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> Production Ready
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {techStack.map((tech) => (
                <div
                  key={tech.name}
                  className="p-3 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm flex flex-col justify-between hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{tech.name}</span>
                  <span className="text-[10px] text-portal-cyan uppercase tracking-wider font-black mt-1">
                    {tech.category}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Project View Footer */}
          <footer className="rounded-2xl bg-portal-card border-3 border-black p-6 text-center space-y-2 shadow-neo-sm">
            <div className="flex items-center justify-center gap-2 text-portal-cyan">
              <Gamepad2 className="w-5 h-5 stroke-[2.5]" />
              <span className="font-black text-sm tracking-wider uppercase">Break Hub Arcade Portal</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold max-w-xl mx-auto leading-relaxed">
              An interactive open-source web arcade platform engineered with Next.js, React, TypeScript, and HTML5 Canvas.
            </p>
            <div className="text-[11px] text-slate-400 font-black uppercase tracking-wider">
              © {new Date().getFullYear()} Break Hub. All rights reserved.
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
