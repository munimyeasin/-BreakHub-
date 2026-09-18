import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft, ShieldAlert, Award, Scale, AlertTriangle, Sparkles, Terminal, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Stress Buster Mini-Game Portal',
  description: 'Review the Terms of Service, Fair Play Anti-Cheat rules, and Acceptable Use guidelines for the Stress Buster Mini-Game Portal.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsOfServicePage() {
  const lastUpdated = 'September 18, 2026';

  return (
    <div className="min-h-screen bg-portal-bg text-slate-100 bg-neo-grid selection:bg-portal-pink selection:text-white py-8 px-4 sm:px-6 lg:px-8">
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-portal-surface border-2 border-black text-xs font-black uppercase tracking-wider text-portal-yellow shadow-[2px_2px_0px_#000000]">
            <FileText className="w-4 h-4 text-portal-yellow" />
            <span>Legal Agreement</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="bg-portal-card border-4 border-black p-6 sm:p-8 shadow-[6px_6px_0px_#000000] mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-portal-yellow/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-block px-3 py-1 bg-portal-yellow text-black font-black text-xs uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_#000000] mb-3">
              Rules of Engagement
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mb-3">
              Terms of <span className="text-portal-pink">Service</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
              Welcome to Stress Buster. By playing games, competing on leaderboards, or interacting with our arcade features, you agree to these Terms.
            </p>
            <div className="mt-4 pt-4 border-t-2 border-black/40 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-portal-lime" />
                Protocol 1.4.0
              </span>
              <span>•</span>
              <span className="text-portal-pink">Last Updated: {lastUpdated}</span>
            </div>
          </div>
        </div>

        {/* Terms Content Sections */}
        <div className="space-y-6">
          {/* Section 1: Acceptance */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-lime text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                1. Acceptance of Terms
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you and Stress Buster. By accessing our website, playing HTML5 mini-games, saving progress, or submitting scores, you confirm your acceptance of these Terms and our Privacy Policy.
              </p>
              <p>
                If you do not agree with any part of these Terms, you must discontinue use of the portal immediately.
              </p>
            </div>
          </section>

          {/* Section 2: Fair Play & Anti-Cheat */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-pink text-white font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                2. Fair Play & Anti-Cheat Policy
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                Stress Buster thrives on genuine skill, quick reflexes, and friendly arcade competition. To preserve fair leaderboards, the following actions are strictly prohibited:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="bg-portal-surface p-3 border-2 border-black flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-portal-pink shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">Using automated bot scripts, auto-clickers, or macro tools to artificially inflate scores.</span>
                </div>
                <div className="bg-portal-surface p-3 border-2 border-black flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-portal-pink shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">Intercepting or spoofing HTTP POST requests to the /api/scores endpoints.</span>
                </div>
                <div className="bg-portal-surface p-3 border-2 border-black flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-portal-pink shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">Exploiting game physics glitches or memory injection tools to register impossible scores.</span>
                </div>
                <div className="bg-portal-surface p-3 border-2 border-black flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-portal-pink shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">Denial-of-Service attacks or stress testing the public API infrastructure.</span>
                </div>
              </div>
              <p className="text-xs text-portal-yellow font-bold mt-2">
                Violation Notice: Scores detected as anomalous by our server-side sanity checks will be automatically rejected and removed from all global rankings.
              </p>
            </div>
          </section>

          {/* Section 3: Gamer Handles & Code of Conduct */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-yellow text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                3. Gamer Handles & Conduct
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                When creating a gamer tag on Stress Buster:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-200">
                <li>Gamer tags must be between 2 and 20 characters in length.</li>
                <li>Handles must not contain hate speech, profanity, harassment, impersonation of staff, or offensive slurs.</li>
                <li>We reserve the right to sanitize, reset, or purge inappropriate gamer tags from public leaderboards.</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Intellectual Property */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-cyan text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                4. Intellectual Property & Games
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                The Stress Buster portal code, branding, audio synthesizer engines, UI design tokens, and custom HTML5 canvas games are the intellectual property of the project creators or licensed under open-source standards.
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                Classic arcade tributes (such as Snake, 2048, Minesweeper, Battleship, and XO) are original indie implementations engineered for stress relief and educational purposes.
              </p>
            </div>
          </section>

          {/* Section 5: Disclaimer & Liability */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-purple text-white font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Scale className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                5. Disclaimer of Warranties
              </h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base space-y-3 leading-relaxed">
              <p>
                Stress Buster is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, either express or implied. We do not guarantee uninterrupted, bug-free, or error-free game sessions.
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                In no event shall the developers be liable for any indirect, incidental, or consequential damages resulting from your access to or inability to use the portal.
              </p>
            </div>
          </section>

          {/* Section 6: Contact */}
          <section className="bg-portal-card border-3 border-black p-6 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-portal-lime text-black font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                6. Contact & Inquiries
              </h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base mb-4 leading-relaxed">
              For questions regarding these Terms or to report unfair play, reach out via our open-source project repository.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/munimyeasim"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-portal-yellow text-black font-black uppercase text-xs tracking-wider border-2 border-black shadow-[3px_3px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Developer GitHub
              </a>
              <Link
                href="/privacy"
                className="px-4 py-2 bg-portal-surface text-portal-cyan font-black uppercase text-xs tracking-wider border-2 border-black shadow-[3px_3px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Read Privacy Policy
              </Link>
            </div>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
          © {new Date().getFullYear()} Stress Buster Mini-Game Portal • All Rights Reserved
        </div>
      </div>
    </div>
  );
}
