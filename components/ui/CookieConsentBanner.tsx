'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, Shield, Check, X, SlidersHorizontal, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'stressbuster_cookie_consent_v1';

export interface ConsentPreferences {
  essential: boolean; // always true
  analytics: boolean;
  timestamp: string;
}

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        // Small delay before showing so page loads cleanly
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors in private modes
    }
  }, []);

  const saveConsent = (analytics: boolean) => {
    const consent: ConsentPreferences = {
      essential: true,
      analytics,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {}

    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fadeIn"
    >
      <div className="bg-portal-card border-3 border-black p-5 shadow-[6px_6px_0px_#000000] text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-portal-yellow text-black flex items-center justify-center border-2 border-black font-black shadow-[2px_2px_0px_#000000]">
              <Cookie className="w-4 h-4" />
            </div>
            <span className="font-black uppercase text-xs tracking-wider text-white">
              Cookie & Data Preferences
            </span>
          </div>

          <button
            onClick={() => saveConsent(false)}
            aria-label="Decline non-essential cookies"
            className="text-slate-400 hover:text-white p-1 hover:bg-portal-surface border border-transparent hover:border-black transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!isCustomizing ? (
          <>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Stress Buster uses essential local storage to save your game scores, XP progress, and unlocked badges. We also use privacy-first analytics to monitor site performance.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] font-bold">
              <Link
                href="/privacy"
                className="text-portal-cyan hover:underline inline-flex items-center gap-1"
              >
                <span>Read Privacy Policy</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <button
                onClick={() => saveConsent(true)}
                className="flex-1 px-4 py-2 bg-portal-lime text-black font-black uppercase text-xs tracking-wider border-2 border-black shadow-[3px_3px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000000] transition-all"
              >
                Accept All
              </button>

              <button
                onClick={() => saveConsent(false)}
                className="px-3 py-2 bg-portal-surface text-slate-200 font-bold uppercase text-xs tracking-wider border-2 border-black shadow-[3px_3px_0px_#000000] hover:bg-portal-card transition-all"
              >
                Essential Only
              </button>

              <button
                onClick={() => setIsCustomizing(true)}
                aria-label="Customize cookie settings"
                className="px-2.5 py-2 bg-portal-surface text-portal-yellow hover:text-white border-2 border-black shadow-[3px_3px_0px_#000000] transition-all flex items-center justify-center"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          /* Customization view */
          <div className="space-y-3">
            <div className="bg-portal-surface p-2.5 border-2 border-black flex items-center justify-between">
              <div>
                <div className="font-black text-xs text-white uppercase">Essential Local Storage</div>
                <div className="text-[10px] text-slate-400">Game progress, gamer tag, themes, sound settings</div>
              </div>
              <span className="px-2 py-0.5 bg-portal-lime/20 text-portal-lime border border-portal-lime text-[10px] font-bold uppercase">
                Required
              </span>
            </div>

            <div className="bg-portal-surface p-2.5 border-2 border-black flex items-center justify-between">
              <div>
                <div className="font-black text-xs text-white uppercase">Performance Analytics</div>
                <div className="text-[10px] text-slate-400">Vercel Web Vitals & aggregate error telemetry</div>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                className={`w-10 h-6 border-2 border-black p-0.5 transition-colors ${
                  analyticsEnabled ? 'bg-portal-cyan' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-black transform transition-transform ${
                    analyticsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => saveConsent(analyticsEnabled)}
                className="flex-1 px-4 py-2 bg-portal-yellow text-black font-black uppercase text-xs tracking-wider border-2 border-black shadow-[3px_3px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Save Preferences
              </button>

              <button
                onClick={() => setIsCustomizing(false)}
                className="px-3 py-2 bg-portal-surface text-slate-300 font-bold uppercase text-xs border-2 border-black"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
