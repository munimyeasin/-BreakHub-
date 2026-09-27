'use client';

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Trophy,
  Zap,
  ShieldCheck,
  Cpu,
  Sparkles,
  Flame,
  Award,
  Target,
  ArrowRight,
  Terminal,
  Volume2,
  Play,
  Layers,
  CheckCircle2,
  Code2,
  Activity,
  Users,
} from 'lucide-react';
import DevSpotlightBanner from './DevSpotlightBanner';
import { audio } from '@/lib/audio';

export interface AboutSectionProps {
  initialView?: 'project' | 'devs';
  onExploreGames?: () => void;
  onOpenLeaderboard?: () => void;
  onViewChange?: (view: 'project' | 'devs') => void;
}

type AboutTab = 'project' | 'devs' | 'lab';

const PLATFORM_PILLARS = [
  {
    icon: Zap,
    title: '60 FPS Native Physics',
    desc: 'Zero bloated game engines. Pure Canvas 2D vector math, delta-time compensation, continuous collision detection, and 9:16 adaptive scaling.',
    badge: 'ENGINE',
    color: 'bg-portal-lime text-black',
  },
  {
    icon: Volume2,
    title: 'Procedural Web Audio',
    desc: 'Zero external audio files. 100% procedural oscillator synthesizer with smooth exponential gain ramps, pentatonic chimes, and bass drops.',
    badge: 'AUDIO',
    color: 'bg-portal-pink text-black',
  },
  {
    icon: Award,
    title: 'Gamification Suite',
    desc: 'Date-hashed daily quests, consecutive streak preservation, 14 cyber rank titles, and 22 holographic trophies with XP payouts.',
    badge: 'REWARDS',
    color: 'bg-portal-yellow text-black',
  },
  {
    icon: Trophy,
    title: 'Live Global Hall of Fame',
    desc: 'Real-time score recording, personal best tracking, automated rate-limiting, and anti-cheat threshold verification.',
    badge: 'RANKS',
    color: 'bg-portal-cyan text-black',
  },
  {
    icon: Layers,
    title: '5 Cyber Visual Themes',
    desc: 'Instant theme switching across GameBoy DMG Retro, Cyberpunk Neon, 80s Vaporwave, Neo Dark, and Neo Light design tokens.',
    badge: 'THEMES',
    color: 'bg-portal-purple text-black',
  },
  {
    icon: ShieldCheck,
    title: 'Instant Zero-Install Web Flow',
    desc: 'Zero sign-up friction, instant mobile touch gamepad, localStorage persistence, and sub-millisecond route transitions.',
    badge: 'ACCESS',
    color: 'bg-portal-yellow text-black',
  },
];

const PLATFORM_STATS = [
  { label: 'Custom Mini-Games', value: '22+' },
  { label: 'Render Target', value: '60 FPS' },
  { label: 'Audio Asset Size', value: '0 MB' },
  { label: 'Cyber Ranks', value: '14 Titles' },
  { label: 'Trophy Vault', value: '22 Badges' },
  { label: 'Visual Themes', value: '5 Modes' },
];

const TECH_SPECS = [
  { name: 'Next.js 16', category: 'Framework (App Router)', tag: 'CORE' },
  { name: 'React 19', category: 'UI Component Layer', tag: 'UI' },
  { name: 'TypeScript', category: 'Type Safety & Contracts', tag: 'LANG' },
  { name: 'Tailwind CSS', category: 'Neo-Brutalist Tokens', tag: 'STYLES' },
  { name: 'HTML5 Canvas 2D', category: 'Physics & Rendering', tag: 'ENGINE' },
  { name: 'Web Audio API', category: 'Procedural Synthesizer', tag: 'AUDIO' },
  { name: 'Minimax AI', category: 'Chess Alpha-Beta Engine', tag: 'AI' },
  { name: 'Lucide Icons', category: 'Vector Iconography', tag: 'ASSETS' },
];

export default function AboutSection({
  initialView = 'project',
  onExploreGames,
  onOpenLeaderboard,
  onViewChange,
}: AboutSectionProps) {
  const [tab, setTab] = useState<AboutTab>(initialView === 'devs' ? 'devs' : 'project');
  const [lastSoundPlayed, setLastSoundPlayed] = useState<string | null>(null);

  useEffect(() => {
    if (initialView === 'devs' || initialView === 'project') {
      setTab(initialView);
    }
  }, [initialView]);

  const switchTab = (nextTab: AboutTab) => {
    setTab(nextTab);
    if (nextTab === 'devs' || nextTab === 'project') {
      onViewChange?.(nextTab);
    }
    try { audio.playClickSound(); } catch {}
  };

  const playSoundEffect = (type: string) => {
    setLastSoundPlayed(type);
    try {
      if (type === 'click') audio.playClickSound();
      else if (type === 'xp') audio.playXpGainSound(1);
      else if (type === 'level') audio.playLevelUpSound();
      else if (type === 'quest') audio.playQuestCompleteSound();
      else if (type === 'trophy') audio.playTrophyUnlockSound();
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. TOP SEGMENTED VIEW SWITCHER & CONTROL BAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-2.5 rounded-2xl bg-portal-surface border-3 sm:border-4 border-black shadow-neo">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => switchTab('project')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-2 border-black ${
              tab === 'project'
                ? 'bg-portal-cyan text-black shadow-neo-sm translate-x-0.5 translate-y-0.5'
                : 'bg-portal-card text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-portal-card/80'
            }`}
          >
            <Gamepad2 className="w-4 h-4 stroke-[2.5]" />
            <span>Project Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab('devs')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-2 border-black ${
              tab === 'devs'
                ? 'bg-portal-yellow text-black shadow-neo-sm translate-x-0.5 translate-y-0.5'
                : 'bg-portal-card text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-portal-card/80'
            }`}
          >
            <Users className="w-4 h-4 stroke-[2.5]" />
            <span>Lead Architect</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab('lab')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-2 border-black ${
              tab === 'lab'
                ? 'bg-portal-pink text-black shadow-neo-sm translate-x-0.5 translate-y-0.5'
                : 'bg-portal-card text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-portal-card/80'
            }`}
          >
            <Volume2 className="w-4 h-4 stroke-[2.5]" />
            <span>Audio & Engine Lab</span>
          </button>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2">
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={() => {
                try { audio.playClickSound(); } catch {}
                onOpenLeaderboard();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow hover:text-black border-2 border-black text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider shadow-neo-sm transition-all"
            >
              <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">Ranks</span>
            </button>
          )}

          {onExploreGames && (
            <button
              type="button"
              onClick={() => {
                try { audio.playClickSound(); } catch {}
                onExploreGames();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-portal-yellow text-black border-2 border-black text-xs font-black uppercase tracking-wider shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all"
            >
              <span>Play Games</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* 2. TAB: LEAD ARCHITECT & CREATOR DOSSIER */}
      {tab === 'devs' && (
        <div className="space-y-6 animate-fadeIn">
          <DevSpotlightBanner onExploreGames={onExploreGames} />
        </div>
      )}

      {/* 3. TAB: PROJECT MATRIX */}
      {tab === 'project' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Hero Showcase */}
          <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-portal-surface border-3 sm:border-4 border-black p-6 sm:p-8 shadow-neo-lg">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

            <div className="relative z-10 max-w-4xl space-y-4 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-portal-pink border-2 border-black text-black text-xs font-black tracking-wider uppercase shadow-neo-sm">
                <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>NEXT-GEN RETRO ARCADE PORTAL</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">
                Architected for <span className="text-portal-cyan">Instant Stress Relief</span> & 60 FPS Flow.
              </h1>

              <p className="text-xs sm:text-sm sm:leading-relaxed text-slate-700 dark:text-slate-300 font-bold max-w-3xl">
                Break Hub is an open, instant-play web gaming portal engineered with 22 custom HTML5 Canvas engines, procedural Web Audio synthesis, multi-theme Neo-Brutalism, and a deterministic gamification economy. Zero installs, zero sign-up walls, pure arcade flow.
              </p>

              {/* Quick Jump Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {onExploreGames && (
                  <button
                    type="button"
                    onClick={() => {
                      try { audio.playClickSound(); } catch {}
                      onExploreGames();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current stroke-[2.5]" />
                    <span>Launch Arcade Games</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => switchTab('lab')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-portal-card border-2 border-black text-slate-900 dark:text-white hover:bg-portal-yellow hover:text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <Volume2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Interactive Audio Lab</span>
                </button>
              </div>
            </div>
          </section>

          {/* Platform Performance Metrics Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {PLATFORM_STATS.map((stat, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm text-center space-y-0.5"
              >
                <span className="text-[10px] font-black uppercase text-slate-500 block truncate">
                  {stat.label}
                </span>
                <span className="text-sm sm:text-base font-black text-portal-yellow block">
                  {stat.value}
                </span>
              </div>
            ))}
          </section>

          {/* Platform Architectural Pillars */}
          <section className="space-y-3">
            <div className="border-b-3 border-black pb-2 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <Cpu className="w-5 h-5 text-portal-cyan stroke-[2.5]" />
                <span>Core Architectural Pillars</span>
              </h2>
              <span className="px-2.5 py-1 rounded-lg bg-portal-yellow text-black text-[10px] font-black uppercase border-2 border-black shadow-neo-sm">
                6 SYSTEMS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PLATFORM_PILLARS.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-portal-card border-3 border-black p-4 space-y-2 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 border-black shadow-neo-sm ${pillar.color}`}>
                        <Icon className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-portal-surface text-slate-700 dark:text-slate-300 border border-black shadow-neo-sm">
                        {pillar.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tech Stack Matrix */}
          <section className="rounded-2xl sm:rounded-3xl bg-portal-surface border-3 sm:border-4 border-black p-5 sm:p-6 space-y-4 shadow-neo-lg">
            <div className="flex items-center justify-between border-b-3 border-black pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-portal-pink stroke-[2.5]" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase">
                  Technology Stack & System Specs
                </h3>
              </div>
              <span className="text-[10px] font-black text-black bg-portal-lime px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-sm flex items-center gap-1 uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> PRODUCTION READY
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TECH_SPECS.map((tech) => (
                <div key={tech.name} className="p-3 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase block truncate">
                      {tech.name}
                    </span>
                    <span className="text-[8px] font-mono font-bold bg-portal-surface text-portal-cyan px-1 py-0.2 rounded border border-black">
                      {tech.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block">
                    {tech.category}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 4. TAB: AUDIO & ENGINE LAB */}
      {tab === 'lab' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Lab Header */}
          <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-portal-surface border-3 sm:border-4 border-black p-6 sm:p-8 shadow-neo-lg">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-pink via-portal-cyan to-portal-yellow border-b-2 border-black" />

            <div className="relative z-10 max-w-3xl space-y-3 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-portal-lime border-2 border-black text-black text-xs font-black tracking-wider uppercase shadow-neo-sm">
                <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>INTERACTIVE PROCEDURAL ENGINE</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Web Audio <span className="text-portal-pink">Procedural Lab</span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                Break Hub uses zero external audio files. Every sound effect — from high-register XP chirps to triumphant level-up fanfares — is synthesized on-the-fly using the native Web Audio API with mathematical frequency formulas. Test them live below.
              </p>
            </div>
          </section>

          {/* Interactive Synthesizer Test Pad */}
          <section className="rounded-2xl sm:rounded-3xl bg-portal-card border-3 sm:border-4 border-black p-5 sm:p-6 shadow-neo-lg space-y-4">
            <div className="flex items-center justify-between border-b-3 border-black pb-3">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-portal-yellow stroke-[2.5]" />
                <span>Live Audio Synthesizer Pad</span>
              </h2>
              {lastSoundPlayed && (
                <span className="text-[10px] font-mono font-black text-black bg-portal-yellow px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-sm animate-pulse uppercase">
                  PLAYED: {lastSoundPlayed}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => playSoundEffect('click')}
                className="p-4 rounded-2xl bg-portal-surface border-3 border-black text-left shadow-neo-sm hover:bg-portal-yellow hover:text-black transition-all group flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-black">01 • UI</span>
                  <Activity className="w-4 h-4 text-portal-cyan group-hover:text-black" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-black uppercase">
                    Tactile Click
                  </h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-black font-bold">
                    800Hz exponential burst
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('xp')}
                className="p-4 rounded-2xl bg-portal-surface border-3 border-black text-left shadow-neo-sm hover:bg-portal-cyan hover:text-black transition-all group flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-black">02 • XP</span>
                  <Zap className="w-4 h-4 text-portal-yellow group-hover:text-black" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-black uppercase">
                    XP Surge Chirp
                  </h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-black font-bold">
                    520Hz-830Hz double sine
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('level')}
                className="p-4 rounded-2xl bg-portal-surface border-3 border-black text-left shadow-neo-sm hover:bg-portal-lime hover:text-black transition-all group flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-black">03 • LEVEL</span>
                  <Flame className="w-4 h-4 text-portal-pink group-hover:text-black" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-black uppercase">
                    Level Up Fanfare
                  </h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-black font-bold">
                    5-Note C-major arpeggio
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('quest')}
                className="p-4 rounded-2xl bg-portal-surface border-3 border-black text-left shadow-neo-sm hover:bg-portal-yellow hover:text-black transition-all group flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-black">04 • QUEST</span>
                  <Target className="w-4 h-4 text-portal-lime group-hover:text-black" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-black uppercase">
                    Quest Chime
                  </h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-black font-bold">
                    A5-D6-G6 coin triad
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('trophy')}
                className="p-4 rounded-2xl bg-portal-surface border-3 border-black text-left shadow-neo-sm hover:bg-portal-pink hover:text-black transition-all group flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-black">05 • VAULT</span>
                  <Award className="w-4 h-4 text-portal-yellow group-hover:text-black" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-black uppercase">
                    Trophy Resonance
                  </h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-black font-bold">
                    Sub-bass drop + high chime
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* Engine Physics Specs & Viewport Architecture */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-portal-surface border-3 border-black shadow-neo space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-portal-cyan stroke-[2.5]" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                  9:16 Responsive Canvas Projection
                </h3>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                Standardized 360x640 virtual resolution dynamically projected onto any device screen using window devicePixelRatio for crisp retina resolution and uniform physics across all screen sizes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-portal-surface border-3 border-black shadow-neo space-y-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-portal-yellow stroke-[2.5]" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                  Continuous Collision & Math Solvers
                </h3>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                Custom vector reflection algorithms, circle-line segment intersections, and Minimax alpha-beta search engines deliver zero-lag responsiveness with zero external physics libraries.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
