import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Cookie, Database, Eye, Terminal, CheckCircle2, UserCheck, RefreshCw, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Stress Buster Mini-Game Portal',
  description: 'Learn how Stress Buster protects your privacy, manages local game data, and ensures a secure, retro-arcade experience with zero invasive tracking.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'September 18, 2026';

  return (
    <div className="min-h-screen bg-portal-bg text-slate-100 bg-neo-grid selection:bg-portal-cyan selection:text-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-portal-card border-2 border-black font-black uppercase text-xs sm:text-sm tracking-wider shadow-[3px_3px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#000000] transition-all text-portal-yellow hover:text-portal-cyan"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portal</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-portal-surface border-2 border-black text-xs font-black uppercase tracking-wider text-portal-lime shadow-[2px_2px_0px_#000000]">
            <Shield className="w-4 h-4 text-portal-lime" />
            <span>Official Policy</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="bg-portal-card border-4 border-black p-6 sm:p-8 shadow-[6px_6px_0px_#000000] mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-portal-pink/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-block px-3 py-1 bg-portal-pink text-white font-black text-xs uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_#000000] mb-3">
              Data Protection & Privacy
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mb-3">
              Privacy <span className="text-portal-yellow">Policy</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
              Stress Buster is committed to transparent, privacy-first gaming. We do not sell your personal data, profile you across the web, or require intrusive sign-ups.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-black/40 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-portal-cyan" />
                Version 1.4.0
              </span>
              <span>•</span>
              <span className="text-portal-yellow">Last Updated: {lastUpdated}</span>
            </div>
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="space-y-6">
          {/* Section 1: Overview */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-cyan text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                1. Core Privacy Philosophy
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                Stress Buster was engineered as an instant-access, lightweight arcade portal. We believe that playing games online should not require sacrificing personal privacy.
              </p>
              <ul className="grid sm:grid-cols-2 gap-3 mt-4">
                <li className="flex items-start gap-2 bg-portal-surface p-3 border-2 border-black">
                  <CheckCircle2 className="w-5 h-5 text-portal-lime shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">No passwords or real-world email addresses required to play.</span>
                </li>
                <li className="flex items-start gap-2 bg-portal-surface p-3 border-2 border-black">
                  <CheckCircle2 className="w-5 h-5 text-portal-lime shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">Zero third-party advertising tracking or behavior profiling.</span>
                </li>
                <li className="flex items-start gap-2 bg-portal-surface p-3 border-2 border-black">
                  <CheckCircle2 className="w-5 h-5 text-portal-lime shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">Local-first gameplay data stored directly on your browser.</span>
                </li>
                <li className="flex items-start gap-2 bg-portal-surface p-3 border-2 border-black">
                  <CheckCircle2 className="w-5 h-5 text-portal-lime shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">High-score telemetry is pseudonymous and gamer-tag based.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: Data Collection */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-yellow text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                2. Information We Process
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-4 leading-relaxed">
              <div>
                <h3 className="text-base font-black text-portal-yellow uppercase mb-1">A. Gamer Profiles & Handles</h3>
                <p>
                  When you customize your profile, you choose a pseudonymous gamer tag (e.g., <em>CYBER_NINJA</em>) and select an 8-bit or pixel avatar generated via the open DiceBear API. We do not collect your real name, phone number, address, or billing details.
                </p>
              </div>

              <div>
                <h3 className="text-base font-black text-portal-yellow uppercase mb-1">B. Game Performance & Global Leaderboards</h3>
                <p>
                  When you achieve a game score, the portal transmits your game ID, gamer handle, and numerical score to our leaderboards service. This telemetry allows us to maintain fair global rankings, rank tiers, and weekly competitive ladders.
                </p>
              </div>

              <div>
                <h3 className="text-base font-black text-portal-yellow uppercase mb-1">C. Ratings & Community Hype</h3>
                <p>
                  Star ratings (1 to 5 stars) and game hype upvotes submitted for arcade titles are tabulated anonymously to compute community quality metrics.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Browser Storage & State */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-lime text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                3. Local Storage & Offline Cache
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                Stress Buster relies on browser <code className="bg-black/60 px-1.5 py-0.5 text-portal-lime border border-black font-mono text-xs">localStorage</code> and <code className="bg-black/60 px-1.5 py-0.5 text-portal-lime border border-black font-mono text-xs">sessionStorage</code> to deliver instant loading, persistent gameplay, and offline capability:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div className="bg-portal-surface p-3 border-2 border-black">
                  <div className="font-black text-xs text-portal-cyan uppercase mb-1">XP, Level & Quests</div>
                  <div className="text-xs text-slate-300">Tracks your daily streak, quest completions, trophies, and unlock progression.</div>
                </div>
                <div className="bg-portal-surface p-3 border-2 border-black">
                  <div className="font-black text-xs text-portal-cyan uppercase mb-1">Theme & Audio Controls</div>
                  <div className="text-xs text-slate-300">Remembers your chosen theme (Neo-Dark, Neo-Light, Cyberpunk, GameBoy, Vaporwave) and sound toggles.</div>
                </div>
                <div className="bg-portal-surface p-3 border-2 border-black">
                  <div className="font-black text-xs text-portal-cyan uppercase mb-1">Favorite Games</div>
                  <div className="text-xs text-slate-300">Pins your most-played arcade games to your personal quick-access tray.</div>
                </div>
                <div className="bg-portal-surface p-3 border-2 border-black">
                  <div className="font-black text-xs text-portal-cyan uppercase mb-1">Active Route Recovery</div>
                  <div className="text-xs text-slate-300">Saves your active modal and game state so accidental page refreshes do not lose your place.</div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Cookies & Analytics */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-pink text-white font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Cookie className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                4. Cookies & Performance Analytics
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                We do not use advertising or tracking cookies. We utilize privacy-friendly, aggregate analytics via <strong>Vercel Analytics</strong> and <strong>Vercel Speed Insights</strong> to monitor web vitals, error rates, and load performance.
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                These telemetry tools do not collect personally identifiable information (PII) or track you across external domains. You may manage your analytics preferences anytime via our Cookie Consent banner.
              </p>
            </div>
          </section>

          {/* Section 5: Anti-Cheat & Security */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-purple text-white font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                5. Fair Play & Security Safeguards
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                To maintain the integrity of global leaderboards, our backend performs server-side sanity checks, score upper-bound validation, rate limiting, and anti-spam verification. All data in transit is encrypted using modern <strong>TLS 1.3 / HTTPS</strong> with HSTS preloading.
              </p>
            </div>
          </section>

          {/* Section 6: User Rights & Data Deletion */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-yellow text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                6. Your Rights & Data Deletion
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                Because your gamer data is primarily stored locally on your device, you have complete control:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-200">
                <li><strong>Clear All Game Data:</strong> Clear your browser storage or site cookies at any time to reset your gamer tag, XP, favorites, and unlocked badges.</li>
                <li><strong>Change Gamer Tag:</strong> You can change your display handle anytime directly from the portal sidebar.</li>
                <li><strong>Leaderboard Inquiries:</strong> Contact our team if you wish to request deletion of a specific submitted leaderboard entry.</li>
              </ul>
            </div>
          </section>

          {/* Section 7: Contact Info */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-cyan text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                7. Contact Us
              </h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base mb-4 leading-relaxed">
              Have questions, feedback, or security inquiries regarding this Privacy Policy? Reach out to the Stress Buster development team.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/munimyeasim"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-portal-yellow text-black font-black uppercase text-xs tracking-wider border-2 border-black shadow-[3px_3px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                GitHub Developer Portal
              </a>
              <Link
                href="/terms"
                className="px-4 py-2 bg-portal-surface text-portal-pink font-black uppercase text-xs tracking-wider border-2 border-black shadow-[3px_3px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                View Terms of Service
              </Link>
            </div>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
          © {new Date().getFullYear()} Stress Buster Mini-Game Portal • Built with Privacy by Design
        </div>
      </div>
    </div>
  );
}
