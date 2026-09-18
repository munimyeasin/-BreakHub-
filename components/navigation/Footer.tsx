'use client';

import React from 'react';
import Link from 'next/link';
import { Gamepad2, Shield, FileText, Heart, Trophy, Sparkles, Terminal, ArrowUp, Cpu } from 'lucide-react';

interface FooterProps {
  onOpenLeaderboard?: () => void;
  onOpenQuests?: () => void;
  onOpenTrophies?: () => void;
  onSelectTab?: (tab: 'all' | 'favorites' | 'about-project' | 'about-devs') => void;
}

export default function Footer({
  onOpenLeaderboard,
  onOpenQuests,
  onOpenTrophies,
  onSelectTab,
}: FooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-16 bg-portal-card border-t-4 border-black text-slate-100 relative overflow-hidden">
      {/* Top Accent Stripe */}
      <div className="h-2 w-full bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Branding & Intro */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-portal-yellow text-black font-black flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_#000000]">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  STRESS <span className="text-portal-yellow">BUSTER</span>
                </h3>
                <p className="text-xs font-mono font-bold text-portal-cyan uppercase tracking-wider">
                  RETRO ARCADE MINI-GAME PORTAL
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
              Instant-play, retro-futuristic HTML5 arcade games designed for rapid stress relief, reflex sharpening, and competitive global leaderboard glory. Zero installs, pure arcade flow.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-portal-surface border-2 border-black text-[11px] font-mono font-bold text-portal-lime shadow-[2px_2px_0px_#000000]">
                <span className="w-2 h-2 rounded-full bg-portal-lime animate-ping" />
                <span>SERVER_STATUS: ONLINE (100%)</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-portal-surface border-2 border-black text-[11px] font-mono font-bold text-portal-yellow shadow-[2px_2px_0px_#000000]">
                <Cpu className="w-3.5 h-3.5" />
                <span>CANVAS 2D & WEB AUDIO</span>
              </div>
            </div>
          </div>

          {/* Col 2: Quick Navigation */}
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest text-portal-yellow mb-4 border-b-2 border-black pb-1">
              Arcade Modules
            </h4>
            <ul className="space-y-2 text-xs font-bold text-slate-300">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectTab) onSelectTab('all');
                    scrollToTop();
                  }}
                  className="hover:text-portal-cyan transition-colors text-left"
                >
                  ▶ All 20+ Mini-Games
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenLeaderboard}
                  className="hover:text-portal-cyan transition-colors text-left"
                >
                  ▶ Global Hall of Fame
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenQuests}
                  className="hover:text-portal-cyan transition-colors text-left"
                >
                  ▶ Daily Quests & Streak
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenTrophies}
                  className="hover:text-portal-cyan transition-colors text-left"
                >
                  ▶ Trophy Room & Badges
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectTab) onSelectTab('about-devs');
                    scrollToTop();
                  }}
                  className="hover:text-portal-cyan transition-colors text-left"
                >
                  ▶ Meet the Developers
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Security */}
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest text-portal-pink mb-4 border-b-2 border-black pb-1">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs font-bold text-slate-300">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-portal-pink transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-portal-lime" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-portal-pink transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-portal-yellow" />
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem('stressbuster_cookie_consent_v1');
                      window.location.reload();
                    } catch {}
                  }}
                  className="hover:text-portal-pink transition-colors text-left flex items-center gap-1.5 text-slate-400 hover:text-slate-200"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Cookie Preferences</span>
                </button>
              </li>
              <li className="pt-2">
                <a
                  href="https://github.com/munimyeasim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-portal-surface border-2 border-black text-xs font-black uppercase text-portal-yellow hover:text-white shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>Source GitHub</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 border-t-2 border-black/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} STRESS BUSTER.</span>
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-portal-pink inline" />
            <span>by Munim, Tahida, Marzia & Rahul.</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-portal-yellow text-black font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <span>TOP OF ARCADE</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
