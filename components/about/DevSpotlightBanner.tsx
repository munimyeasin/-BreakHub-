'use client';

import React from 'react';
import {
  Code2,
  CheckCircle2,
  ExternalLink,
  Gamepad2,
  Zap,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  Flame,
  Users,
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import { audio } from '@/lib/audio';

const CONTRIBUTORS = [
  {
    name: 'Munim Yeasin',
    role: 'Lead Architect & Full-Stack Engineer',
    tagline: 'Crafting high-velocity web systems, Canvas physics, & procedural audio synthesis.',
    badge: 'LEAD ARCHITECT',
    avatarUrl: getAvatarUrl('MunimArchitect'),
    color: 'bg-portal-yellow text-black',
  },
  {
    name: 'Tahida Begum',
    role: 'Core Engineer & UI/UX Systems Lead',
    tagline: 'Architecting neo-brutalist design tokens, responsive layout grids, & theme engines.',
    badge: 'CORE CONTRIBUTOR',
    avatarUrl: getAvatarUrl('TahidaBegum'),
    color: 'bg-portal-cyan text-black',
  },
  {
    name: 'Ruhana Begum',
    role: 'Frontend Developer & Gameplay Physics Lead',
    tagline: 'Building 60 FPS Canvas mini-game loops, collision solvers, & touch gamepads.',
    badge: 'CORE CONTRIBUTOR',
    avatarUrl: getAvatarUrl('RuhanaBegum'),
    color: 'bg-portal-pink text-black',
  },
  {
    name: 'Rahul Alam',
    role: 'Full-Stack Engineer & Audio/Gamification Lead',
    tagline: 'Developing Web Audio oscillator synthesizers, daily quests, & global leaderboards.',
    badge: 'CORE CONTRIBUTOR',
    avatarUrl: getAvatarUrl('RahulAlam'),
    color: 'bg-portal-lime text-black',
  },
];

const PLATFORM_DOMAINS = [
  {
    title: 'Full-Stack Architecture & APIs',
    desc: 'Next.js 16 App Router server actions, Supabase database synchronization, rate-limited leaderboards, and persistent storage.',
    tag: 'BACKEND & CORE',
    color: 'bg-portal-yellow text-black',
  },
  {
    title: 'Procedural Web Audio Engine',
    desc: 'Zero-asset procedural oscillator synthesizer with harmonic chords, arpeggios, and micro-timing.',
    tag: 'AUDIO SYNTH',
    color: 'bg-portal-pink text-black',
  },
  {
    title: '22+ Canvas 2D Physics Engines',
    desc: '60 FPS requestAnimationFrame rendering, vector collision solvers, Minimax AI for Chess, and particle emitters.',
    tag: 'GAME PHYSICS',
    color: 'bg-portal-cyan text-black',
  },
  {
    title: 'Neo-Brutalist UI/UX & Themes',
    desc: '5-theme engine (GameBoy DMG, Cyberpunk, Vaporwave, Neo Dark, Neo Light) with high-contrast brutalist design tokens.',
    tag: 'DESIGN SYSTEM',
    color: 'bg-portal-lime text-black',
  },
];

const SKILLS = [
  'Next.js 16',
  'React 19',
  'TypeScript',
  'HTML5 Canvas 2D',
  'Web Audio API',
  'Tailwind CSS',
  'Supabase',
  'Neo-Brutalism',
];

export default function DevSpotlightBanner({ onExploreGames }: { onExploreGames?: () => void }) {
  const handleSound = () => {
    try { audio.playClickSound(); } catch {}
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Main Team Command Card */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-portal-surface border-3 sm:border-4 border-black p-4 sm:p-6 md:p-8 shadow-neo-lg overflow-hidden">
        {/* Glowing Top Rainbow Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

        {/* Top Header Strip */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b-3 border-black">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>EQUAL CORE CONTRIBUTORS</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-portal-card border-2 border-black text-xs font-black uppercase text-slate-800 dark:text-slate-200 shadow-neo-sm">
              <Sparkles className="w-3.5 h-3.5 text-portal-cyan" />
              <span>DEVELOPER TEAM DOSSIER</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 bg-portal-card px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-portal-lime border border-black animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              STATUS: TEAM ACTIVE
            </span>
          </div>
        </div>

        {/* 4 Equal Contributors Grid */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2 border-b-2 border-black pb-2">
            <Users className="w-4 h-4 text-portal-yellow stroke-[2.5]" />
            <span>Core Development Team (Equal Contributors)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONTRIBUTORS.map((dev, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-portal-card border-3 border-black p-4 sm:p-5 shadow-neo flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-portal-surface border-3 border-black p-1 shadow-neo overflow-hidden">
                    <img
                      src={dev.avatarUrl}
                      alt={dev.name}
                      className="w-full h-full object-cover rounded-xl bg-slate-900"
                    />
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 bg-portal-yellow text-black p-1 rounded-lg border-2 border-black shadow-neo-sm">
                    <Cpu className="w-3 h-3 stroke-[2.5]" />
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-black shadow-neo-sm ${dev.color}`}>
                      {dev.badge}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {dev.name}
                  </h4>

                  <p className="text-[11px] font-mono font-bold text-portal-cyan uppercase tracking-wide">
                    {dev.role}
                  </p>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                    {dev.tagline}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Architectural Domains & Core Engineering Modules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-portal-yellow stroke-[2.5]" />
              <span>Architectural Modules & Core Systems</span>
            </h3>
            <span className="text-[10px] font-black uppercase bg-portal-pink text-black px-2 py-0.5 rounded-lg border border-black shadow-neo-sm">
              4 PILLARS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLATFORM_DOMAINS.map((domain, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-portal-card border-3 border-black p-4 space-y-2 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-black shadow-neo-sm ${domain.color}`}>
                    {domain.tag}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">MOD-0{idx + 1}</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                  {domain.title}
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                  {domain.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Skills & Tech Stack Matrix */}
          <div className="rounded-2xl bg-portal-card border-3 border-black p-4 space-y-3 shadow-neo-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-portal-cyan stroke-[2.5]" />
                <span>Technical Arsenal & Tooling</span>
              </span>
              <span className="text-[10px] font-black uppercase text-portal-lime bg-portal-surface px-2 py-0.5 rounded border border-black">
                60 FPS OPTIMIZED
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SKILLS.map((skill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-portal-surface border-2 border-black text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 shadow-neo-sm hover:bg-portal-yellow hover:text-black transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3 text-portal-lime stroke-[2.5]" />
                  <span>{skill}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Bottom CTA */}
          {onExploreGames && (
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-portal-surface via-portal-card to-portal-surface border-3 border-black shadow-neo flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-center sm:text-left">
                <div className="w-9 h-9 rounded-xl bg-portal-yellow text-black border-2 border-black flex items-center justify-center shadow-neo-sm shrink-0">
                  <Gamepad2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase">
                    Experience The Game Engines
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                    22+ custom retro mini-games ready to play in 60 FPS.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleSound();
                  onExploreGames();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all shrink-0"
              >
                PLAY NOW →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
