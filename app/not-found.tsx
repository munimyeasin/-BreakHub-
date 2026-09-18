import Link from 'next/link';
import { Gamepad2, Home, RotateCcw, Sparkles, Terminal, AlertTriangle, Trophy } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-portal-bg text-slate-100 bg-neo-dots selection:bg-portal-yellow selection:text-black flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl w-full bg-portal-card border-4 border-black p-6 sm:p-10 shadow-[8px_8px_0px_#000000] relative text-center">
        {/* Top Status Strip */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-portal-pink animate-ping" />
            <span className="font-mono text-xs font-black uppercase text-portal-pink tracking-widest">
              SYSTEM_ALERT // 404_NOT_FOUND
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-slate-400 bg-portal-surface px-2 py-0.5 border border-black">
            LIVES: 0
          </span>
        </div>

        {/* 404 Glitch Badge */}
        <div className="inline-block px-4 py-1.5 bg-portal-pink text-black font-mono text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_#000000] mb-4">
          STAGE NOT FOUND
        </div>

        {/* Large 404 Header */}
        <div className="relative mb-4">
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-portal-yellow drop-shadow-[4px_4px_0px_#000000]">
            404
          </h1>
          <div className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mt-2">
            GAME OVER // CORRUPTED SECTOR
          </div>
        </div>

        {/* Arcade Message */}
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-8 leading-relaxed">
          The coordinates you entered led to an uncharted arcade zone. The pixels have scattered, but the main portal is running at full power!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-portal-yellow text-black font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black shadow-[4px_4px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all"
          >
            <Home className="w-4 h-4" />
            <span>INSERT COIN (HOME)</span>
          </Link>

          <Link
            href="/?tab=all"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-portal-cyan text-black font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black shadow-[4px_4px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>BROWSE ARCADE</span>
          </Link>
        </div>

        {/* Bottom Diagnostics Footer */}
        <div className="mt-8 pt-4 border-t-2 border-black/40 flex items-center justify-between text-[10px] sm:text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 text-portal-lime font-bold">
            <Terminal className="w-3 h-3" />
            STATUS: 404_PAGE_MISSING
          </span>
          <span className="text-slate-400">
            ERR_ROUTE_UNKNOWN
          </span>
        </div>
      </div>
    </div>
  );
}
