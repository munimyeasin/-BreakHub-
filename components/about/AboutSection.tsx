'use client';

import {
  Users,
  Gamepad2,
  Trophy,
  Zap,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Sparkles
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
    color: 'text-black',
    badgeBg: 'bg-portal-cyan text-black',
  },
  {
    icon: Trophy,
    title: 'Competitive Leaderboards',
    desc: 'Real-time score tracking, player handles, and global Hall of Fame rankings for friendly competition.',
    color: 'text-black',
    badgeBg: 'bg-portal-yellow text-black',
  },
  {
    icon: Zap,
    title: '60 FPS Native Performance',
    desc: 'Zero heavy external engines. Pure Canvas 2D math, responsive scaling, and instant loading on both mobile and desktop.',
    color: 'text-black',
    badgeBg: 'bg-portal-lime text-black',
  },
  {
    icon: ShieldCheck,
    title: 'Modern Tech Stack',
    desc: 'Powered by Next.js, React, TypeScript, and Tailwind CSS for robust typing, performance, and retro-arcade aesthetics.',
    color: 'text-white',
    badgeBg: 'bg-portal-purple text-white',
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
      <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-portal-surface border-4 border-black p-6 sm:p-10 shadow-neo-lg">
        {/* Top Decorative Color Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black" />

        <div className="relative z-10 max-w-3xl space-y-4 pt-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-portal-pink border-2 border-black text-white text-xs font-black tracking-wider uppercase shadow-neo-sm">
            <Users className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>INTERNSHIP PROJECT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-none">
            About <span className="text-portal-cyan">Stress Buster</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-bold leading-relaxed">
            Welcome to <strong className="text-white font-black">Stress Buster</strong>, an interactive web gaming platform collaboratively designed and developed as an internship project. The hub features 12 custom HTML5 Canvas games, high-contrast Neo-Brutalist aesthetics, responsive physics, and live competitive leaderboards.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {onExploreGames && (
              <button
                onClick={onExploreGames}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-portal-cyan text-black font-black text-xs sm:text-sm uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              >
                <Gamepad2 className="w-4 h-4 fill-black stroke-[2.5]" />
                <span>Play Games</span>
              </button>
            )}
            {onOpenLeaderboard && (
              <button
                onClick={onOpenLeaderboard}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-portal-card border-3 border-black text-portal-yellow hover:bg-portal-yellow hover:text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              >
                <Trophy className="w-4 h-4 stroke-[2.5]" />
                <span>View Leaderboards</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. MEET THE TEAM (CLEAN NAME & ROLE) */}
      <section className="space-y-6">
        <div className="border-b-3 border-black pb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Development Team
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-bold mt-1">
              Created and engineered collaboratively by our 4-member project team
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-portal-yellow text-black text-[10px] font-black uppercase border-2 border-black shadow-neo-sm">
            4 ENGINEERS
          </span>
        </div>

        {/* Clean, Uniform 2x2 Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {teamMembers.map((member) => {
            const avatarUrl = getAvatarUrl(member.avatarSeed || member.name);

            return (
              <div
                key={member.name}
                className="group relative rounded-2xl bg-portal-card border-3 border-black p-5 sm:p-6 flex items-center gap-4 sm:gap-5 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200"
              >
                {/* Avatar */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-portal-surface border-3 border-black p-1 flex items-center justify-center overflow-hidden shadow-neo-sm">
                  <img
                    src={avatarUrl}
                    alt={member.name}
                    className="w-full h-full object-cover rounded-xl bg-slate-900"
                  />
                </div>

                {/* Name & Role */}
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-portal-cyan transition-colors truncate uppercase">
                    {member.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-bold leading-snug">
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
        <div className="border-b-3 border-black pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            Platform Features
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
                <h3 className="text-sm font-black text-white uppercase">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-300 font-bold leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. TECH STACK */}
      <section className="rounded-2xl sm:rounded-3xl bg-portal-surface border-4 border-black p-6 sm:p-8 space-y-6 shadow-neo-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-3 border-black pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase flex items-center gap-2">
              <Cpu className="w-5 h-5 text-portal-cyan stroke-[2.5]" />
              <span>Technology Stack</span>
            </h3>
            <p className="text-xs text-slate-300 font-bold mt-0.5">
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
              <span className="text-xs font-black text-white uppercase">{tech.name}</span>
              <span className="text-[10px] text-portal-cyan uppercase tracking-wider font-black mt-1">
                {tech.category}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FOOTER CREDITS */}
      <footer className="rounded-2xl bg-portal-card border-3 border-black p-6 text-center space-y-3 shadow-neo-sm">
        <div className="flex items-center justify-center gap-2 text-portal-cyan">
          <Gamepad2 className="w-5 h-5 stroke-[2.5]" />
          <span className="font-black text-sm tracking-wider uppercase">Stress Buster</span>
        </div>
        <p className="text-xs text-slate-300 font-bold max-w-xl mx-auto leading-relaxed">
          Developed by{' '}
          <strong className="text-white font-black">Tahida</strong>,{' '}
          <strong className="text-white font-black">Marzia</strong>,{' '}
          <strong className="text-white font-black">Rahul</strong>, and{' '}
          <strong className="text-white font-black">Munim Yeasin</strong>.
        </p>
        <div className="text-[11px] text-slate-400 font-black uppercase tracking-wider">
          © {new Date().getFullYear()} Stress Buster. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
