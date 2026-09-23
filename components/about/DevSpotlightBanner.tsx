'use client';

import React, { useState, useRef } from 'react';
import {
  Code2,
  CheckCircle2,
  ExternalLink,
  Gamepad2,
  Zap,
  Sparkles,
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';

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
    badge: 'CREATOR & LEAD ARCHITECT',
    badgeBg: 'bg-portal-yellow',
    badgeText: 'text-black',
    accentBg: 'from-portal-yellow/20 via-portal-surface to-portal-card',
    dotColor: '#fbbf24',
    avatarSeed: 'MunimArchitect',
    accentColor: 'text-portal-yellow',
    bio: 'Architected and engineered Break Hub from the ground up — including the zero-asset procedural Web Audio synthesizer, 18+ HTML5 Canvas game engines, Next.js 16 App Router full-stack APIs, Neo-Brutalist design system, and gamification economy.',
    focus: 'Full-Stack Architecture, Canvas 2D Physics & Web Audio Synthesis',
    keyContributions: [
      'Zero-Asset Web Audio API Procedural Synthesizer',
      '18+ Custom HTML5 Canvas 60 FPS Game Engines',
      'Daily Quests, Play Streaks & Trophy Vault System',
      'Next.js 16 Server API Endpoints & Live Leaderboards',
    ],
    techStack: ['Next.js 16', 'React 19', 'TypeScript', 'HTML5 Canvas', 'Web Audio API', 'Tailwind CSS'],
    stats: [
      { label: 'Role', value: 'Architect' },
      { label: 'Focus', value: 'Full-Stack' },
      { label: 'Status', value: 'Lead Dev' },
    ],
    portfolioUrl: '/portfolio.html',
    instagramUrl: 'https://instagram.com/__yeasin__0',
    instagramHandle: '@__yeasin__0',
  },
];

interface DevSpotlightBannerProps {
  onExploreGames?: () => void;
}

export default function DevSpotlightBanner({ onExploreGames }: DevSpotlightBannerProps) {
  const dev = DEVELOPERS[0];
  const avatarUrl = getAvatarUrl(dev.avatarSeed);

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-portal-surface border-3 sm:border-4 border-black p-4 sm:p-5 md:p-6 shadow-neo-lg overflow-hidden">
      {/* Top Tri-Color Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

      {/* Top Header: Section Tag + Developer Badge */}
      <div className="relative z-40 flex flex-wrap items-center justify-between gap-2 mb-6 pb-3 border-b-3 border-black">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-portal-yellow text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>CREATOR & LEAD ARCHITECT</span>
          </span>
          <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-portal-card border-2 border-black text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 shadow-neo-sm">
            <Sparkles className="w-3 h-3 text-portal-cyan" />
            <span>CORE DEVELOPER</span>
          </span>
        </div>

        {/* Developer Quick Badge */}
        <div className="flex items-center gap-1.5 bg-portal-card px-3 py-1 rounded-xl border-2 border-black shadow-neo-sm">
          <span
            className="w-2.5 h-2.5 rounded-full border border-black animate-pulse"
            style={{ backgroundColor: dev.dotColor }}
          />
          <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
            {dev.name}
          </span>
        </div>
      </div>

      {/* Main Developer Spotlight Card */}
      <div className="relative w-full pt-2 pb-2">
        <div className="relative rounded-xl xs:rounded-2xl sm:rounded-3xl bg-portal-card border-2 sm:border-3 md:border-4 border-black p-3 xs:p-3.5 sm:p-4 md:p-5 lg:p-6 overflow-hidden ring-2 ring-portal-yellow/40 shadow-neo-lg">
          {/* Card Top Accent Strip */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5 sm:h-2 border-b-2 border-black"
            style={{ backgroundColor: dev.dotColor }}
          />

          {/* CARD CONTENT: RESPONSIVE DESKTOP & MOBILE DOSSIER */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 xs:gap-3 sm:gap-4 lg:gap-5 items-center pt-0.5">
            {/* Left Column (4 cols on desktop): Avatar & Profile Deck */}
            <div className="md:col-span-4 flex flex-row md:flex-col items-center justify-between md:justify-center p-2.5 xs:p-3 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl bg-portal-surface border-2 sm:border-3 border-black shadow-neo-sm text-left md:text-center gap-2.5 xs:gap-3 md:gap-0 md:space-y-2.5">
              {/* Avatar Visual & Identity Header */}
              <div className="flex items-center md:flex-col gap-2.5 xs:gap-3 md:gap-0 md:space-y-2 shrink-0">
                <div className="relative w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-xl sm:rounded-2xl md:rounded-3xl bg-portal-card border-2 sm:border-3 md:border-4 border-black p-0.5 sm:p-1 shadow-neo overflow-hidden shrink-0">
                  <img
                    src={avatarUrl}
                    alt={`${dev.name} - ${dev.role} developer profile portrait`}
                    className="w-full h-full object-cover rounded-lg sm:rounded-xl md:rounded-2xl bg-slate-900"
                  />
                  <div
                    className="absolute bottom-1 right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-1.5 sm:border-2 border-black shadow-neo-sm"
                    style={{ backgroundColor: dev.dotColor }}
                    title="Active Lead Architect"
                  />
                </div>

                <div className="text-left md:text-center">
                  <span className={`inline-block px-1.5 xs:px-2 py-0.5 rounded text-[8px] xs:text-[9px] font-black uppercase tracking-wider border border-black shadow-neo-sm mb-0.5 ${dev.badgeBg} ${dev.badgeText}`}>
                    {dev.badge}
                  </span>
                  <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[150px] xs:max-w-[180px] sm:max-w-none">
                    {dev.name}
                  </h2>
                  <p className="text-[9px] xs:text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 font-bold leading-tight">
                    {dev.role}
                  </p>
                </div>
              </div>

              {/* Mini Stat Pills */}
              <div className="hidden xs:grid grid-cols-3 gap-1 md:w-full md:pt-1.5 md:border-t-2 md:border-black shrink-0">
                {dev.stats.map((stat, i) => (
                  <div key={i} className="p-0.5 sm:p-1 rounded-md sm:rounded-lg bg-portal-card border border-black text-center min-w-[48px]">
                    <span className="text-[6px] xs:text-[7px] sm:text-[8px] font-black uppercase text-slate-600 dark:text-slate-400 block">{stat.label}</span>
                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-black text-portal-yellow truncate block">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column (8 cols on desktop): Bio, Key Contributions & Tech Stack */}
            <div className="md:col-span-8 flex flex-col justify-center space-y-2 xs:space-y-2.5 sm:space-y-3">
              {/* Focus & Bio Strip */}
              <div className="p-2 xs:p-2.5 sm:p-3 rounded-lg xs:rounded-xl sm:rounded-2xl bg-portal-surface border-2 border-black shadow-neo-sm space-y-1">
                <div className="flex items-center gap-1.5 xs:gap-2">
                  <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-portal-purple text-black px-1.5 py-0.2 rounded border border-black shadow-neo-sm shrink-0">
                    PRIMARY DOMAIN
                  </span>
                  <span className="text-[10px] xs:text-[11px] sm:text-xs font-black text-slate-900 dark:text-white truncate">{dev.focus}</span>
                </div>
                <p className="text-[11px] xs:text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-bold leading-snug sm:leading-relaxed">
                  <span className="text-portal-yellow font-black">“</span>
                  {dev.bio}
                  <span className="text-portal-yellow font-black">”</span>
                </p>
              </div>

              {/* Key Contributions 2x2 Grid */}
              <div className="space-y-1">
                <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Code2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-portal-cyan stroke-[2.5]" />
                  <span>Core Modules & Systems</span>
                </span>
                <div className="grid grid-cols-2 gap-1 xs:gap-1.5 sm:gap-2">
                  {dev.keyContributions.map((contrib, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 xs:gap-1.5 p-1 xs:p-1.5 sm:p-2 rounded-md xs:rounded-lg sm:rounded-xl bg-portal-surface border border-black sm:border-2 shadow-neo-sm text-[9px] xs:text-[10px] sm:text-xs text-slate-900 dark:text-white font-bold"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-portal-lime stroke-[2.5] shrink-0" />
                      <span className="truncate">{contrib}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Tech Toolkit & Action CTAs */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 xs:gap-2 pt-0.5">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[8px] xs:text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mr-0.5">Toolkit:</span>
                  {dev.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-1.5 xs:px-2 py-0.5 rounded bg-portal-surface border border-black text-[8px] xs:text-[9px] font-black text-portal-cyan uppercase shadow-neo-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Interactive Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {dev.portfolioUrl && (
                    <a
                      href={dev.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 xs:px-3 xs:py-1.5 rounded-lg xs:rounded-xl bg-portal-cyan text-black font-black text-[10px] xs:text-[11px] uppercase tracking-wider border border-black sm:border-2 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all shrink-0"
                    >
                      <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                      <span>Portfolio</span>
                    </a>
                  )}
                  {dev.instagramUrl && (
                    <a
                      href={dev.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 xs:px-3 xs:py-1.5 rounded-lg xs:rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[10px] xs:text-[11px] uppercase tracking-wider border border-black sm:border-2 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all shrink-0"
                      title={`Instagram: ${dev.instagramHandle || '@__yeasin__0'}`}
                    >
                      <InstagramIcon className="w-3 h-3" />
                      <span>{dev.instagramHandle || 'Instagram'}</span>
                    </a>
                  )}
                  {onExploreGames && (
                    <button
                      onClick={onExploreGames}
                      className="flex items-center gap-1 px-2.5 py-1 xs:px-3 xs:py-1.5 rounded-lg xs:rounded-xl bg-portal-yellow text-black font-black text-[10px] xs:text-[11px] uppercase tracking-wider border border-black sm:border-2 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all shrink-0"
                    >
                      <Gamepad2 className="w-3 h-3 stroke-[2.5]" />
                      <span>Play Games</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
