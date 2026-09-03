'use client';

import {
  Users,
  Gamepad2,
  Trophy,
  Zap,
  ShieldCheck,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';

interface TeamMember {
  name: string;
  role: string;
  avatarSeed?: string;
}

const teamMembers: TeamMember[] = [
  {
    name: 'Tahida',
    role: 'UI/UX & Frontend Engineer',
    avatarSeed: 'TahidaCyber',
  },
  {
    name: 'Marzia',
    role: 'Game Logic & QA Engineer',
    avatarSeed: 'MarziaNeon',
  },
  {
    name: 'Rahul',
    role: 'Systems & Gameplay Developer',
    avatarSeed: 'RahulMatrix',
  },
  {
    name: 'Munim Yeasin',
    role: 'Full-Stack & System Architect',
    avatarSeed: 'MunimArchitect',
  },
];

const projectHighlights = [
  {
    icon: Gamepad2,
    title: '12 Custom Mini-Games',
    desc: 'From fast-paced space shooters, katana slicing, and rhythm games to territorial io conquests and deep strategic puzzles, all running smoothly on HTML5 Canvas.',
    color: 'text-portal-cyan',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
  },
  {
    icon: Trophy,
    title: 'Competitive Leaderboards',
    desc: 'Real-time score tracking, player handles, and global Hall of Fame rankings for friendly competition.',
    color: 'text-portal-gold',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  {
    icon: Zap,
    title: '60 FPS Native Performance',
    desc: 'Zero heavy external engines. Pure Canvas 2D math, responsive scaling, and instant loading on both mobile and desktop.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  {
    icon: ShieldCheck,
    title: 'Modern Tech Stack',
    desc: 'Powered by Next.js, React, TypeScript, and Tailwind CSS for robust typing, performance, and cyber aesthetics.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
];

const techStack = [
  { name: 'Next.js 15', category: 'Framework' },
  { name: 'React 18', category: 'Frontend Library' },
  { name: 'TypeScript', category: 'Type Safety' },
  { name: 'Tailwind CSS', category: 'Styling & Design' },
  { name: 'HTML5 Canvas API', category: 'Rendering Engine' },
  { name: 'Web Audio API', category: 'Dynamic Sound Engine' },
  { name: 'Lucide Icons', category: 'Iconography' },
  { name: 'Canvas Confetti', category: 'Victory Visuals' },
];

interface AboutSectionProps {
  onExploreGames?: () => void;
  onOpenLeaderboard?: () => void;
}

export default function AboutSection({
  onExploreGames,
  onOpenLeaderboard
}: AboutSectionProps) {
  return (
    <div className="space-y-10 animate-fadeIn">
      {/* 1. HERO BANNER */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-portal-surface via-portal-card to-portal-surface border border-portal-border p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-portal-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-portal-neon/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-portal-card border border-portal-border text-portal-cyan text-xs font-bold tracking-wider uppercase">
            <Users className="w-3.5 h-3.5" />
            <span>Internship Project</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            About <span className="text-portal-cyan">Stress Buster</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Welcome to <strong className="text-white">Stress Buster</strong>, an interactive web gaming platform collaboratively designed and developed as an internship project. The hub features 12 custom HTML5 Canvas games, dark-neon aesthetics, responsive physics, and live competitive leaderboards.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {onExploreGames && (
              <button
                onClick={onExploreGames}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-portal-cyan text-black font-bold text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-glow-cyan"
              >
                <Gamepad2 className="w-4 h-4 fill-black" />
                Play Games
              </button>
            )}
            {onOpenLeaderboard && (
              <button
                onClick={onOpenLeaderboard}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-portal-surface border border-portal-border hover:border-portal-gold/60 text-portal-gold font-bold text-xs sm:text-sm active:scale-95 transition-all"
              >
                <Trophy className="w-4 h-4 text-portal-gold" />
                View Leaderboards
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. MEET THE TEAM (CLEAN NAME & ROLE) */}
      <section className="space-y-6">
        <div className="border-b border-portal-border/60 pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Development Team
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Created and engineered collaboratively by our 4-member project team
          </p>
        </div>

        {/* Clean, Uniform 2x2 Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {teamMembers.map((member) => {
            const avatarUrl = getAvatarUrl(member.avatarSeed || member.name);

            return (
              <div
                key={member.name}
                className="group relative rounded-2xl bg-portal-surface border border-portal-border p-5 sm:p-6 flex items-center gap-4 sm:gap-5 hover:border-portal-cyan/60 hover:shadow-glow-cyan/20 transition-all duration-200"
              >
                {/* Avatar */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-portal-card border border-portal-border p-1.5 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 group-hover:border-portal-cyan/40 transition-transform">
                  <img
                    src={avatarUrl}
                    alt={member.name}
                    className="w-full h-full object-cover rounded-xl bg-slate-900"
                  />
                </div>

                {/* Name & Role */}
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-portal-cyan transition-colors truncate">
                    {member.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium leading-snug">
                    {member.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. PROJECT CAPABILITIES */}
      <section className="space-y-6">
        <div className="border-b border-portal-border/60 pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Platform Features
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projectHighlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-portal-surface border border-portal-border p-5 space-y-3 hover:border-portal-border/90 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.bg}`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. TECH STACK */}
      <section className="rounded-3xl bg-portal-surface border border-portal-border p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-portal-border/60 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-portal-cyan" />
              Technology Stack
            </h3>
            <p className="text-xs text-slate-400">
              Modern web engineering tools powering our arcade platform
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Production Ready
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="p-3 rounded-xl bg-portal-card border border-portal-border flex flex-col justify-between hover:border-portal-cyan/40 transition-colors"
            >
              <span className="text-xs font-bold text-white">{tech.name}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">
                {tech.category}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FOOTER CREDITS */}
      <footer className="rounded-2xl bg-portal-surface border border-portal-border p-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-portal-cyan">
          <Gamepad2 className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wider uppercase">Stress Buster</span>
        </div>
        <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
          Developed by{' '}
          <strong className="text-white font-bold">Tahida</strong>,{' '}
          <strong className="text-white font-bold">Marzia</strong>,{' '}
          <strong className="text-white font-bold">Rahul</strong>, and{' '}
          <strong className="text-white font-bold">Munim Yeasin</strong>.
        </p>
        <div className="text-[11px] text-slate-500 font-medium">
          © {new Date().getFullYear()} Stress Buster. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
