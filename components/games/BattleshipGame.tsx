'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  Bot,
  Zap,
  Shield,
  Crosshair,
  Radar,
  RefreshCw,
  AlertTriangle,
  Award,
  CheckCircle2,
  HelpCircle,
  Play,
  Flame,
  Target,
  Navigation,
  Compass,
  Radio,
  Eye,
  Sliders,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BattleshipGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type GameMode = 'ai' | 'pvp';
export type AiDifficulty = 'cadet' | 'commander' | 'admiral';
export type Orientation = 'H' | 'V';

export interface ShipDefinition {
  id: string;
  name: string;
  code: string;
  size: number;
  color: string;
  accent: string;
  role: string;
}

export interface PlacedShip extends ShipDefinition {
  row: number;
  col: number;
  orientation: Orientation;
  positions: { r: number; c: number }[];
  hits: number;
  sunk: boolean;
}

const GRID_SIZE = 10;
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const FLEET_MANIFEST: ShipDefinition[] = [
  { id: 'carrier', name: 'Quantum Carrier', code: 'CV-99', size: 5, color: '#FFE600', accent: 'bg-yellow-400 text-black', role: 'Fleet Flagship / Air Wing Command' },
  { id: 'battleship', name: 'Neo Dreadnought', code: 'BB-77', size: 4, color: '#00F0FF', accent: 'bg-cyan-400 text-black', role: 'Heavy Armored Artillery Ship' },
  { id: 'cruiser', name: 'Laser Cruiser', code: 'CG-42', size: 3, color: '#FF4081', accent: 'bg-pink-500 text-white', role: 'Guided Missile Escort Vessel' },
  { id: 'submarine', name: 'Stealth Sub', code: 'SS-18', size: 3, color: '#A3E635', accent: 'bg-lime-400 text-black', role: 'Deep-Sea Hunter-Killer' },
  { id: 'destroyer', name: 'Plasma Destroyer', code: 'DD-09', size: 2, color: '#C084FC', accent: 'bg-purple-400 text-black', role: 'Fast Coastal Assault Destroyer' }
];

// =========================================================================
// MILITARY VECTOR GRAPHICS & TACTICAL SILHOUETTES
// =========================================================================

/**
 * Military Rank Insignia Component (Ensign, Commander, Admiral)
 */
function MilitaryRankBadge({ rank }: { rank: AiDifficulty }) {
  if (rank === 'cadet') {
    // O-1 Ensign: Gold Chevron
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 14L12 7L20 14" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-portal-lime" />
        <circle cx="12" cy="18" r="2" fill="#A3E635" />
      </svg>
    );
  }
  if (rank === 'commander') {
    // O-5 Commander: Triple Chevron
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 10L12 4L20 10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-portal-yellow" />
        <path d="M4 15L12 9L20 15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-portal-yellow" />
        <path d="M4 20L12 14L20 20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-portal-yellow" />
      </svg>
    );
  }
  // Admiral: 4-Star Command Starburst
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L14.5 8.5L21.5 9.5L16.5 14.5L18 21.5L12 18L6 21.5L7.5 14.5L2.5 9.5L9.5 8.5L12 2Z" fill="#FF4081" stroke="#000" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" fill="#FFE600" />
    </svg>
  );
}

/**
 * Top-down Military Warship Hull Segment for Grid Cells
 * Renders authentic naval ship sections: Bow (Prow), Mid Deck (Turrets/Island), Stern (Propulsion)
 */
function ShipHullSegment({
  shipId,
  segmentIndex,
  totalSize,
  orientation,
  isDamaged,
  isSunk,
  color
}: {
  shipId: string;
  segmentIndex: number;
  totalSize: number;
  orientation: Orientation;
  isDamaged: boolean;
  isSunk: boolean;
  color: string;
}) {
  const isBow = segmentIndex === 0;
  const isStern = segmentIndex === totalSize - 1;
  const isMid = !isBow && !isStern;

  // Rotation transform for vertical vs horizontal
  const rotationDeg = orientation === 'V' ? 90 : 0;

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full"
        style={{ transform: `rotate(${rotationDeg}deg)` }}
      >
        <defs>
          <linearGradient id={`hullGrad_${shipId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color={isSunk ? '#331019' : isDamaged ? '#451a1a' : '#1e293b'} />
            <stop offset="50%" stop-color={isSunk ? '#1f080e' : isDamaged ? '#2a0e0e' : '#0f172a'} />
            <stop offset="100%" stop-color={isSunk ? '#0f0205' : isDamaged ? '#180505' : '#020617'} />
          </linearGradient>
        </defs>

        {/* 1. HULL PLATING BASE */}
        {isBow && (
          // Pointed / Streamlined Naval Bow
          <path
            d="M 4 20 Q 14 6 38 6 L 38 34 Q 14 34 4 20 Z"
            fill={`url(#hullGrad_${shipId})`}
            stroke={isSunk ? '#ff4081' : isDamaged ? '#ff4081' : color}
            strokeWidth="2"
          />
        )}

        {isMid && (
          // Armored Midsection
          <rect
            x="0"
            y="6"
            width="40"
            height="28"
            fill={`url(#hullGrad_${shipId})`}
            stroke={isSunk ? '#ff4081' : isDamaged ? '#ff4081' : color}
            strokeWidth="2"
          />
        )}

        {isStern && (
          // Tapered Naval Stern with Rudder Fins
          <path
            d="M 2 6 L 28 6 Q 36 6 36 20 Q 36 34 28 34 L 2 34 Z"
            fill={`url(#hullGrad_${shipId})`}
            stroke={isSunk ? '#ff4081' : isDamaged ? '#ff4081' : color}
            strokeWidth="2"
          />
        )}

        {/* 2. SPECIFIC SHIP CLASS HARDWARE & TURRETS */}
        {shipId === 'carrier' && (
          // Flight Deck Runway & Arresting Wires
          <g>
            <line x1="2" y1="20" x2="38" y2="20" stroke={color} strokeWidth="2" strokeDasharray="4,4" opacity="0.9" />
            {isMid && segmentIndex === 2 && (
              // Island Superstructure Tower
              <rect x="14" y="8" width="12" height="6" rx="1" fill={color} stroke="#000" strokeWidth="1" />
            )}
            {isStern && (
              // Arresting cable bars
              <g stroke="#ffffff" strokeWidth="1.5" opacity="0.7">
                <line x1="10" y1="10" x2="10" y2="30" />
                <line x1="18" y1="10" x2="18" y2="30" />
              </g>
            )}
          </g>
        )}

        {shipId === 'battleship' && (
          // Heavy Naval Gun Turrets
          <g>
            {isBow && (
              // Forward Main Artillery Turret
              <g transform="translate(24, 20)">
                <circle cx="0" cy="0" r="6" fill={color} stroke="#000" strokeWidth="1.5" />
                <line x1="0" y1="-2" x2="-14" y2="-2" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="0" y1="2" x2="-14" y2="2" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}
            {isMid && segmentIndex === 1 && (
              // Bridge Tower & Fire Radar
              <g transform="translate(20, 20)">
                <rect x="-8" y="-7" width="16" height="14" rx="2" fill="#334155" stroke={color} strokeWidth="1.5" />
                <circle cx="0" cy="0" r="3" fill={color} />
              </g>
            )}
            {isMid && segmentIndex === 2 && (
              // Secondary Dual Turret
              <g transform="translate(18, 20)">
                <circle cx="0" cy="0" r="5" fill={color} stroke="#000" strokeWidth="1.5" />
                <line x1="0" y1="-1.5" x2="12" y2="-1.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="1.5" x2="12" y2="1.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
            {isStern && (
              // Aft Dual Turret
              <g transform="translate(14, 20)">
                <circle cx="0" cy="0" r="5" fill={color} stroke="#000" strokeWidth="1.5" />
                <line x1="0" y1="-1.5" x2="12" y2="-1.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="1.5" x2="12" y2="1.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
          </g>
        )}

        {shipId === 'cruiser' && (
          // Guided Missile Silos & Phased Array
          <g>
            {isBow && (
              // VLS Vertical Launch System Grid
              <g transform="translate(18, 12)">
                <rect x="0" y="0" width="12" height="16" fill="#0f172a" stroke={color} strokeWidth="1" />
                <line x1="4" y1="0" x2="4" y2="16" stroke={color} strokeWidth="1" />
                <line x1="8" y1="0" x2="8" y2="16" stroke={color} strokeWidth="1" />
                <line x1="0" y1="8" x2="12" y2="8" stroke={color} strokeWidth="1" />
              </g>
            )}
            {isMid && (
              // Phased Array Pyramid Mast
              <polygon points="12,20 28,12 28,28" fill={color} stroke="#000" strokeWidth="1.5" />
            )}
            {isStern && (
              // Helipad Landing Circle
              <g transform="translate(18, 20)">
                <circle cx="0" cy="0" r="6" fill="none" stroke={color} strokeWidth="1.5" />
                <text x="0" y="3.5" fill={color} fontSize="9" fontWeight="900" textAnchor="middle">H</text>
              </g>
            )}
          </g>
        )}

        {shipId === 'submarine' && (
          // Hydrodynamic Sonar Dome & Sail
          <g>
            {isBow && (
              // Active Sonar Dome & Forward Torpedo Tubes
              <g transform="translate(14, 20)">
                <circle cx="0" cy="0" r="7" fill={color} stroke="#000" strokeWidth="1.5" />
                <circle cx="-1" cy="-3" r="1.5" fill="#000" />
                <circle cx="-1" cy="3" r="1.5" fill="#000" />
              </g>
            )}
            {isMid && (
              // Conning Tower Sail & Periscope
              <g transform="translate(12, 14)">
                <rect x="0" y="0" width="16" height="12" rx="3" fill={color} stroke="#000" strokeWidth="1.5" />
                <line x1="6" y1="6" x2="12" y2="6" stroke="#000" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
            {isStern && (
              // X-Plane Rudder Stabilizers
              <g stroke={color} strokeWidth="2.5" strokeLinecap="round">
                <line x1="16" y1="10" x2="30" y2="30" />
                <line x1="16" y1="30" x2="30" y2="10" />
              </g>
            )}
          </g>
        )}

        {shipId === 'destroyer' && (
          // Fast Attack Prow Gun & Depth Launchers
          <g>
            {isBow && (
              <g transform="translate(22, 20)">
                <circle cx="0" cy="0" r="5" fill={color} stroke="#000" strokeWidth="1.5" />
                <line x1="0" y1="0" x2="-14" y2="0" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}
            {isStern && (
              // Dual Torpedo Launcher Tubes
              <g transform="translate(14, 13)">
                <rect x="0" y="0" width="12" height="5" rx="1" fill={color} stroke="#000" strokeWidth="1" />
                <rect x="0" y="9" width="12" height="5" rx="1" fill={color} stroke="#000" strokeWidth="1" />
              </g>
            )}
          </g>
        )}

        {/* 3. BALLISTIC IMPACT DAMAGE OVERLAY */}
        {isDamaged && (
          <g>
            {/* Shrapnel puncture & thermal breach */}
            <circle cx="20" cy="20" r="10" fill="#ff4081" fillOpacity="0.4" />
            <circle cx="20" cy="20" r="6" fill="#ffe600" stroke="#ff4081" strokeWidth="2" />
            <path d="M12 12 L28 28 M12 28 L28 12" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Tactical Ballistic Impact Blast Vector (Hit on Enemy Radar)
 */
function BallisticImpactBlast({ isSunk }: { isSunk: boolean }) {
  return (
    <svg viewBox="0 0 36 36" className="w-full h-full p-1 animate-scaleIn">
      <defs>
        <radialGradient id="blastCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#ffe600" />
          <stop offset="70%" stopColor="#ff4081" />
          <stop offset="100%" stopColor="#7a0026" />
        </radialGradient>
      </defs>

      {/* Outer blast shockwave */}
      <circle cx="18" cy="18" r="15" fill="none" stroke="#ff4081" strokeWidth="2" strokeDasharray="4,2" opacity="0.8" />

      {/* Thermal Core */}
      <circle cx="18" cy="18" r={isSunk ? 10 : 8} fill="url(#blastCore)" />

      {/* Crossed Ballistic Fracture Lines */}
      <path
        d="M 8 8 L 28 28 M 8 28 L 28 8"
        stroke="#000000"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 8 8 L 28 28 M 8 28 L 28 8"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {isSunk && (
        <circle cx="18" cy="18" r="3" fill="#ffffff" />
      )}
    </svg>
  );
}

/**
 * Tactical Hydro-Acoustic Splash Marker (Miss Salvo)
 */
function WaterSplashMarker() {
  return (
    <svg viewBox="0 0 32 32" className="w-5 h-5 opacity-70">
      {/* Concentric sonar depth ripples */}
      <circle cx="16" cy="16" r="11" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.4" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="#00f0ff" strokeWidth="2" opacity="0.7" />
      <circle cx="16" cy="16" r="2.5" fill="#00f0ff" />
    </svg>
  );
}

/**
 * Blueprint Technical Wireframe Card for Fleet Manifest
 */
function ShipBlueprintCard({
  ship,
  isPlaced,
  isSelected,
  onClick
}: {
  ship: ShipDefinition;
  isPlaced: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between text-left ${
        isSelected
          ? 'bg-portal-card border-portal-cyan shadow-neo-sm translate-x-1'
          : isPlaced
          ? 'bg-slate-950/70 border-black/80 opacity-90'
          : 'bg-portal-card/40 border-black hover:border-slate-600'
      }`}
    >
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0 border border-black"
            style={{ backgroundColor: ship.color }}
          />
          <span className="font-black text-xs text-white uppercase truncate tracking-wider">
            {ship.name}
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
            {ship.code}
          </span>
        </div>

        {/* 2D Hull Silhouettes Preview */}
        <div className="flex items-center gap-1 my-1">
          {Array(ship.size)
            .fill(null)
            .map((_, idx) => (
              <div
                key={idx}
                className="w-6 h-5 rounded-sm border border-black overflow-hidden bg-slate-900"
              >
                <ShipHullSegment
                  shipId={ship.id}
                  segmentIndex={idx}
                  totalSize={ship.size}
                  orientation="H"
                  isDamaged={false}
                  isSunk={false}
                  color={isPlaced ? ship.color : '#64748b'}
                />
              </div>
            ))}
          <span className="text-[10px] text-slate-400 font-mono ml-2 font-bold">
            {ship.size} NODES
          </span>
        </div>

        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
          {ship.role}
        </p>
      </div>

      <div className="shrink-0">
        {isPlaced ? (
          <span className="flex items-center gap-1 text-[10px] font-black text-portal-lime bg-black/50 px-2 py-1 rounded-lg border border-portal-lime/50 shadow-neo-sm">
            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> DEPLOYED
          </span>
        ) : (
          <span className="text-[10px] font-black text-portal-yellow bg-black/50 px-2 py-1 rounded-lg border border-portal-yellow/50 shadow-neo-sm">
            AWAITING DOCK
          </span>
        )}
      </div>
    </button>
  );
}

// =========================================================================
// MAIN RETRO BATTLESHIP GAME COMPONENT
// =========================================================================

export default function BattleshipGame({ gameId, onGameOver }: BattleshipGameProps) {
  // Game Configuration
  const [mode, setMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('commander');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Phases: 'setup' | 'battle' | 'pvp-pass' | 'gameover'
  const [phase, setPhase] = useState<'setup' | 'battle' | 'pvp-pass' | 'gameover'>('setup');
  const [activePlayer, setActivePlayer] = useState<'P1' | 'P2'>('P1');
  const [pvpSetupPlayer, setPvpSetupPlayer] = useState<'P1' | 'P2'>('P1');

  // Placement State
  const [selectedShipIndex, setSelectedShipIndex] = useState<number>(0);
  const [placementOrientation, setPlacementOrientation] = useState<Orientation>('H');
  const [hoverCoord, setHoverCoord] = useState<{ r: number; c: number } | null>(null);

  // Fleet Boards
  const [p1Ships, setP1Ships] = useState<PlacedShip[]>([]);
  const [p2Ships, setP2Ships] = useState<PlacedShip[]>([]); // Used in PvP or AI
  const [p1Shots, setP1Shots] = useState<{ [key: string]: 'hit' | 'miss' }>({}); // Shots fired by P1 at P2
  const [p2Shots, setP2Shots] = useState<{ [key: string]: 'hit' | 'miss' }>({}); // Shots fired by P2 at P1

  // Tactical Recon Scanner Ability (1 scan per match)
  const [p1SonarAvailable, setP1SonarAvailable] = useState<boolean>(true);
  const [p2SonarAvailable, setP2SonarAvailable] = useState<boolean>(true);
  const [isSonarActive, setIsSonarActive] = useState<boolean>(false);
  const [scannedSector, setScannedSector] = useState<{ r: number; c: number; found: boolean } | null>(null);

  // Combat Telemetry & Feedback
  const [turn, setTurn] = useState<'P1' | 'P2'>('P1');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [lastActionLog, setLastActionLog] = useState<string>('Tactical Combat System Ready. Assign coordinates to your 5 war vessels.');
  const [streakCount, setStreakCount] = useState<number>(0);
  const [winner, setWinner] = useState<'P1' | 'P2' | null>(null);
  const [matchStartTime, setMatchStartTime] = useState<number>(Date.now());
  const [matchDurationSec, setMatchDurationSec] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);

  // Mobile View Tab (Radar vs Fleet)
  const [mobileTab, setMobileTab] = useState<'radar' | 'fleet'>('radar');

  // AI Target Tracking Memory (Hunt & Target Engine)
  const aiHuntQueueRef = useRef<{ r: number; c: number }[]>([]);
  const aiHitHistoryRef = useRef<{ r: number; c: number }[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio Synthesizer
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback((type: 'click' | 'sonar' | 'launch' | 'hit' | 'miss' | 'sunk' | 'victory' | 'defeat' | 'rotate') => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (type === 'click' || type === 'rotate') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(type === 'rotate' ? 620 : 480, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'sonar') {
        // High-pitch tactical submarine ping with reverberation
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(850, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'launch') {
        // Ballistic artillery shell launch whoosh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'hit') {
        // Heavy armor-piercing explosion impact
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.28);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'miss') {
        // Ocean water splash plunge
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'sunk') {
        // Naval emergency alert klaxon
        [0, 0.18].forEach(delay => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(740, now + delay);
          osc.frequency.setValueAtTime(520, now + delay + 0.08);
          gain.gain.setValueAtTime(0.25, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.14);
        });
      } else if (type === 'victory') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.1;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);
          gain.gain.setValueAtTime(0.2, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + (idx === notes.length - 1 ? 0.6 : 0.2));
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.6);
        });
      } else if (type === 'defeat') {
        const notes = [440, 415.3, 392, 349.2];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.14;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, noteTime);
          gain.gain.setValueAtTime(0.22, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.25);
        });
      }
    } catch {}
  }, [soundEnabled, getAudioContext]);

  // Check if ship coordinates are valid and non-overlapping
  const isValidPlacement = useCallback((
    row: number,
    col: number,
    size: number,
    orientation: Orientation,
    existingShips: PlacedShip[],
    excludeShipId?: string
  ): boolean => {
    for (let i = 0; i < size; i++) {
      const r = orientation === 'H' ? row : row + i;
      const c = orientation === 'H' ? col + i : col;

      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
        return false;
      }

      // Check collision with already placed ships
      for (const ship of existingShips) {
        if (excludeShipId && ship.id === excludeShipId) continue;
        for (const pos of ship.positions) {
          if (pos.r === r && pos.c === c) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  // Generate random placement for a complete fleet (Used for AI and Auto-Deploy)
  const generateRandomFleet = useCallback((): PlacedShip[] => {
    const placed: PlacedShip[] = [];

    for (const def of FLEET_MANIFEST) {
      let placedSuccessfully = false;
      let attempts = 0;

      while (!placedSuccessfully && attempts < 200) {
        attempts++;
        const orientation: Orientation = Math.random() > 0.5 ? 'H' : 'V';
        const maxR = orientation === 'V' ? GRID_SIZE - def.size : GRID_SIZE - 1;
        const maxC = orientation === 'H' ? GRID_SIZE - def.size : GRID_SIZE - 1;

        const r = Math.floor(Math.random() * (maxR + 1));
        const c = Math.floor(Math.random() * (maxC + 1));

        if (isValidPlacement(r, c, def.size, orientation, placed)) {
          const positions: { r: number; c: number }[] = [];
          for (let i = 0; i < def.size; i++) {
            positions.push({
              r: orientation === 'H' ? r : r + i,
              c: orientation === 'H' ? c + i : c
            });
          }

          placed.push({
            ...def,
            row: r,
            col: c,
            orientation,
            positions,
            hits: 0,
            sunk: false
          });
          placedSuccessfully = true;
        }
      }
    }

    return placed;
  }, [isValidPlacement]);

  // Handle auto-deploying current player's fleet
  const handleAutoDeploy = () => {
    playSound('click');
    const randomized = generateRandomFleet();
    if (phase === 'setup') {
      if (mode === 'ai' || pvpSetupPlayer === 'P1') {
        setP1Ships(randomized);
      } else {
        setP2Ships(randomized);
      }
    }
    setLastActionLog('Tactical Auto-Deploy: Naval squadron deployed in optimal spread formation.');
  };

  // Clear current placement
  const handleResetPlacement = () => {
    playSound('click');
    if (phase === 'setup') {
      if (mode === 'ai' || pvpSetupPlayer === 'P1') {
        setP1Ships([]);
      } else {
        setP2Ships([]);
      }
      setSelectedShipIndex(0);
    }
    setLastActionLog('Dock Clear: Reassign oceanic coordinates to your fleet.');
  };

  // Rotate Ship orientation
  const handleRotate = () => {
    playSound('rotate');
    setPlacementOrientation(prev => (prev === 'H' ? 'V' : 'H'));
  };

  // Keyboard shortcut listener for tactical hotkeys [R], [S], [A], [M]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing if user is inside an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === 'r') {
        e.preventDefault();
        handleRotate();
      } else if (key === 'a' && phase === 'setup') {
        e.preventDefault();
        handleAutoDeploy();
      } else if (key === 's' && phase === 'battle') {
        e.preventDefault();
        handleActivateSonar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isSonarActive, p1SonarAvailable, p2SonarAvailable, turn]);

  // Place or adjust a ship on grid click
  const handleCellPlacementClick = (r: number, c: number) => {
    if (phase !== 'setup') return;

    const currentPlacedShips = (mode === 'ai' || pvpSetupPlayer === 'P1') ? p1Ships : p2Ships;
    const targetShipDef = FLEET_MANIFEST[selectedShipIndex];

    if (!targetShipDef) return;

    // Check if clicked cell already contains a ship (to select/move it)
    const existingAtCell = currentPlacedShips.find(s => s.positions.some(p => p.r === r && p.c === c));
    if (existingAtCell && existingAtCell.id !== targetShipDef.id) {
      const foundIndex = FLEET_MANIFEST.findIndex(m => m.id === existingAtCell.id);
      if (foundIndex !== -1) {
        playSound('click');
        setSelectedShipIndex(foundIndex);
        setPlacementOrientation(existingAtCell.orientation);
        return;
      }
    }

    // Validate placement
    const canPlace = isValidPlacement(
      r,
      c,
      targetShipDef.size,
      placementOrientation,
      currentPlacedShips,
      targetShipDef.id
    );

    if (!canPlace) {
      playSound('miss');
      setLastActionLog(`COLLISION WARNING: Cannot place ${targetShipDef.name} at sector ${ROW_LABELS[r]}${COL_LABELS[c]}!`);
      return;
    }

    playSound('click');

    const positions: { r: number; c: number }[] = [];
    for (let i = 0; i < targetShipDef.size; i++) {
      positions.push({
        r: placementOrientation === 'H' ? r : r + i,
        c: placementOrientation === 'H' ? c + i : c
      });
    }

    const newPlacedShip: PlacedShip = {
      ...targetShipDef,
      row: r,
      col: c,
      orientation: placementOrientation,
      positions,
      hits: 0,
      sunk: false
    };

    const updatedFleet = currentPlacedShips.filter(s => s.id !== targetShipDef.id).concat(newPlacedShip);

    if (mode === 'ai' || pvpSetupPlayer === 'P1') {
      setP1Ships(updatedFleet);
    } else {
      setP2Ships(updatedFleet);
    }

    setLastActionLog(`${targetShipDef.name} [${targetShipDef.code}] secured at sector ${ROW_LABELS[r]}${COL_LABELS[c]}.`);

    // Advance to next unplaced ship
    const nextUnplacedIndex = FLEET_MANIFEST.findIndex(m => !updatedFleet.some(s => s.id === m.id));
    if (nextUnplacedIndex !== -1) {
      setSelectedShipIndex(nextUnplacedIndex);
    }
  };

  // Launch Battle Phase once fleet is ready
  const handleCommenceBattle = () => {
    playSound('launch');

    if (mode === 'ai') {
      // Auto generate AI fleet
      const aiFleet = generateRandomFleet();
      setP2Ships(aiFleet);
      setPhase('battle');
      setTurn('P1');
      setMatchStartTime(Date.now());
      setLastActionLog('HOSTILE CONTACT CONFIRMED: Enemy warfleet in sector. Engage at will.');
    } else {
      // 2P Pass & Play mode
      if (pvpSetupPlayer === 'P1') {
        setPvpSetupPlayer('P2');
        setSelectedShipIndex(0);
        setLastActionLog('PLAYER 2 BRIEFING: Assign coordinates to Player 2 squadron.');
      } else {
        setPhase('battle');
        setTurn('P1');
        setActivePlayer('P1');
        setMatchStartTime(Date.now());
        setLastActionLog('PLAYER 1 ENGAGE: Tactical radar online. Fire when ready.');
      }
    }
  };

  // Activate Sonar Recon Ability
  const handleActivateSonar = () => {
    const isP1 = turn === 'P1';
    const isAvailable = isP1 ? p1SonarAvailable : p2SonarAvailable;

    if (!isAvailable || isAiThinking || phase !== 'battle') {
      playSound('miss');
      return;
    }

    playSound('sonar');
    setIsSonarActive(prev => !prev);
    if (!isSonarActive) {
      setLastActionLog('TACTICAL SONAR ARMED: Select any 3x3 sector coordinate on the hostile radar.');
    } else {
      setLastActionLog('Sonar Recon disarmed. Returning to main artillery battery.');
    }
  };

  // =========================================================================
  // PROBABILITY DENSITY MATRIX AI TARGETING ENGINE
  // =========================================================================
  const calculateAiTargetProbability = (
    opponentShips: PlacedShip[],
    opponentShots: { [key: string]: 'hit' | 'miss' }
  ): { r: number; c: number } => {
    const aliveShips = opponentShips.filter(s => !s.sunk);
    const aliveSizes = aliveShips.map(s => s.size);

    const probGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));

    for (const size of aliveSizes) {
      // Test Horizontal fits
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE - size; c++) {
          let canFit = true;
          let hitCount = 0;
          for (let i = 0; i < size; i++) {
            const shot = opponentShots[`${r},${c + i}`];
            if (shot === 'miss') {
              canFit = false;
              break;
            } else if (shot === 'hit') {
              hitCount++;
            }
          }
          if (canFit) {
            const weight = 1 + hitCount * 15;
            for (let i = 0; i < size; i++) {
              if (!opponentShots[`${r},${c + i}`]) {
                probGrid[r][c + i] += weight;
              }
            }
          }
        }
      }

      // Test Vertical fits
      for (let c = 0; c < GRID_SIZE; c++) {
        for (let r = 0; r <= GRID_SIZE - size; r++) {
          let canFit = true;
          let hitCount = 0;
          for (let i = 0; i < size; i++) {
            const shot = opponentShots[`${r + i},${c}`];
            if (shot === 'miss') {
              canFit = false;
              break;
            } else if (shot === 'hit') {
              hitCount++;
            }
          }
          if (canFit) {
            const weight = 1 + hitCount * 15;
            for (let i = 0; i < size; i++) {
              if (!opponentShots[`${r + i},${c}`]) {
                probGrid[r + i][c] += weight;
              }
            }
          }
        }
      }
    }

    // Parity filtering (checkerboard parity based on smallest remaining ship)
    const minShipSize = aliveSizes.length > 0 ? Math.min(...aliveSizes) : 2;
    let maxVal = -1;
    let candidates: { r: number; c: number }[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!opponentShots[`${r},${c}`]) {
          let val = probGrid[r][c];
          if ((r + c) % minShipSize === 0) {
            val += 2;
          }
          if (val > maxVal) {
            maxVal = val;
            candidates = [{ r, c }];
          } else if (val === maxVal) {
            candidates.push({ r, c });
          }
        }
      }
    }

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Fallback: search any unshot coordinate
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!opponentShots[`${r},${c}`]) {
          return { r, c };
        }
      }
    }

    return { r: 0, c: 0 };
  };

  // AI Turn Execution
  const triggerAiTurn = useCallback((
    currentP1Ships: PlacedShip[],
    currentP2Shots: { [key: string]: 'hit' | 'miss' }
  ) => {
    setIsAiThinking(true);

    setTimeout(() => {
      let r = 0;
      let c = 0;

      if (difficulty === 'admiral') {
        const bestCoord = calculateAiTargetProbability(currentP1Ships, currentP2Shots);
        r = bestCoord.r;
        c = bestCoord.c;
      } else if (difficulty === 'commander') {
        // Hunt & Target algorithm with queue
        let targetFound = false;
        while (aiHuntQueueRef.current.length > 0) {
          const next = aiHuntQueueRef.current.shift()!;
          if (!currentP2Shots[`${next.r},${next.c}`]) {
            r = next.r;
            c = next.c;
            targetFound = true;
            break;
          }
        }
        if (!targetFound) {
          // Check checkerboard parity
          const available: { r: number; c: number }[] = [];
          for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
              if (!currentP2Shots[`${row},${col}`] && (row + col) % 2 === 0) {
                available.push({ r: row, c: col });
              }
            }
          }
          if (available.length > 0) {
            const picked = available[Math.floor(Math.random() * available.length)];
            r = picked.r;
            c = picked.c;
          } else {
            // Pick any
            const anyAvailable: { r: number; c: number }[] = [];
            for (let row = 0; row < GRID_SIZE; row++) {
              for (let col = 0; col < GRID_SIZE; col++) {
                if (!currentP2Shots[`${row},${col}`]) anyAvailable.push({ r: row, c: col });
              }
            }
            const picked = anyAvailable[Math.floor(Math.random() * anyAvailable.length)];
            r = picked.r;
            c = picked.c;
          }
        }
      } else {
        // Ensign: Random targeting
        const unshot: { r: number; c: number }[] = [];
        for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
            if (!currentP2Shots[`${row},${col}`]) unshot.push({ r: row, c: col });
          }
        }
        const picked = unshot[Math.floor(Math.random() * unshot.length)];
        r = picked.r;
        c = picked.c;
      }

      // Execute AI Shot
      const key = `${r},${c}`;
      let isHit = false;
      let hitShip: PlacedShip | null = null;

      const updatedP1Ships = currentP1Ships.map(ship => {
        const match = ship.positions.find(p => p.r === r && p.c === c);
        if (match) {
          isHit = true;
          const newHits = ship.hits + 1;
          const sunk = newHits >= ship.size;
          hitShip = { ...ship, hits: newHits, sunk };
          return hitShip;
        }
        return ship;
      });

      const updatedP2Shots = {
        ...currentP2Shots,
        [key]: (isHit ? 'hit' : 'miss') as 'hit' | 'miss'
      };

      setP1Ships(updatedP1Ships);
      setP2Shots(updatedP2Shots);
      setIsAiThinking(false);

      if (isHit) {
        playSound('hit');
        aiHitHistoryRef.current.push({ r, c });

        if (hitShip && (hitShip as PlacedShip).sunk) {
          playSound('sunk');
          setLastActionLog(`CRITICAL DAMAGE: Hostile artillery sunk your ${(hitShip as PlacedShip).name}!`);
          aiHuntQueueRef.current = [];
        } else {
          setLastActionLog(`WARNING: Hostile artillery struck your fleet at sector ${ROW_LABELS[r]}${COL_LABELS[c]}!`);
          const neighbors = [
            { r: r - 1, c },
            { r: r + 1, c },
            { r, c: c - 1 },
            { r, c: c + 1 }
          ].filter(
            n => n.r >= 0 && n.r < GRID_SIZE && n.c >= 0 && n.c < GRID_SIZE && !updatedP2Shots[`${n.r},${n.c}`]
          );
          aiHuntQueueRef.current.push(...neighbors);
        }

        // Check Defeat
        const allSunk = updatedP1Ships.every(s => s.sunk);
        if (allSunk) {
          handleGameOver('P2');
          return;
        }
      } else {
        playSound('miss');
        setLastActionLog(`Hostile salvo splashed into ocean waters at sector ${ROW_LABELS[r]}${COL_LABELS[c]}.`);
      }

      setTurn('P1');
    }, 650);
  }, [difficulty, playSound]);

  // Execute Player Shot at Enemy Grid
  const handleFireSalvo = (r: number, c: number) => {
    if (phase !== 'battle' || isAiThinking) return;

    const isP1 = turn === 'P1';
    const activeShots = isP1 ? p1Shots : p2Shots;
    const targetShips = isP1 ? p2Ships : p1Ships;
    const key = `${r},${c}`;

    // If Sonar mode is active, run 3x3 ping instead of standard shot
    if (isSonarActive) {
      handleExecuteSonarScan(r, c);
      return;
    }

    // Prevent shooting already targeted sector
    if (activeShots[key]) {
      playSound('click');
      return;
    }

    playSound('launch');

    // Check hit
    let isHit = false;
    let sunkShipName: string | null = null;

    const updatedTargetShips = targetShips.map(ship => {
      const match = ship.positions.find(p => p.r === r && p.c === c);
      if (match) {
        isHit = true;
        const newHits = ship.hits + 1;
        const isNowSunk = newHits >= ship.size;
        if (isNowSunk) {
          sunkShipName = ship.name;
        }
        return { ...ship, hits: newHits, sunk: isNowSunk };
      }
      return ship;
    });

    const updatedShots = {
      ...activeShots,
      [key]: (isHit ? 'hit' : 'miss') as 'hit' | 'miss'
    };

    if (isP1) {
      setP2Ships(updatedTargetShips);
      setP1Shots(updatedShots);
    } else {
      setP1Ships(updatedTargetShips);
      setP2Shots(updatedShots);
    }

    if (isHit) {
      playSound('hit');
      setStreakCount(prev => prev + 1);

      if (sunkShipName) {
        playSound('sunk');
        setLastActionLog(`DIRECT HIT & DESTROYED: Hostile ${sunkShipName} has been sunk!`);
        confetti({
          particleCount: 35,
          spread: 50,
          origin: { y: 0.6 }
        });
      } else {
        setLastActionLog(`DIRECT HIT: Heavy armor damage inflicted on enemy hull at ${ROW_LABELS[r]}${COL_LABELS[c]}!`);
      }

      // Check Victory Condition
      const allSunk = updatedTargetShips.every(s => s.sunk);
      if (allSunk) {
        handleGameOver(isP1 ? 'P1' : 'P2');
        return;
      }
    } else {
      playSound('miss');
      setStreakCount(0);
      setLastActionLog(`Salvo plunged into open ocean coordinates ${ROW_LABELS[r]}${COL_LABELS[c]}.`);
    }

    // Turn Hand-off
    if (mode === 'ai') {
      setTurn('P2');
      triggerAiTurn(p1Ships, p2Shots);
    } else {
      // 2P Mode: toggle turn
      const nextTurn = isP1 ? 'P2' : 'P1';
      setTurn(nextTurn);
      setActivePlayer(nextTurn);
      setLastActionLog(`Salvo complete. Hand control terminal to Player ${nextTurn === 'P1' ? '1' : '2'}.`);
    }
  };

  // Sonar Scan Implementation
  const handleExecuteSonarScan = (centerR: number, centerC: number) => {
    const isP1 = turn === 'P1';
    const targetShips = isP1 ? p2Ships : p1Ships;

    let shipFound = false;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = centerR + dr;
        const nc = centerC + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          for (const ship of targetShips) {
            if (ship.positions.some(p => p.r === nr && p.c === nc)) {
              shipFound = true;
              break;
            }
          }
        }
      }
    }

    playSound('sonar');
    setIsSonarActive(false);
    if (isP1) {
      setP1SonarAvailable(false);
    } else {
      setP2SonarAvailable(false);
    }

    setScannedSector({ r: centerR, c: centerC, found: shipFound });

    if (shipFound) {
      setLastActionLog(`SONAR CONTACT DETECTED: Hostile warship presence confirmed in 3x3 sector ${ROW_LABELS[centerR]}${COL_LABELS[centerC]}!`);
    } else {
      setLastActionLog(`SONAR SCAN CLEAR: No enemy naval vessels in 3x3 sector ${ROW_LABELS[centerR]}${COL_LABELS[centerC]}.`);
    }
  };

  // Calculate High Score & Game Over Handling
  const handleGameOver = (winningPlayer: 'P1' | 'P2') => {
    setWinner(winningPlayer);
    setPhase('gameover');
    const duration = Math.round((Date.now() - matchStartTime) / 1000);
    setMatchDurationSec(duration);

    if (winningPlayer === 'P1') {
      playSound('victory');
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });

      // Scoring formula
      const totalShots = Object.keys(p1Shots).length;
      const hitCount = Object.values(p1Shots).filter(v => v === 'hit').length;
      const accuracy = totalShots > 0 ? Math.round((hitCount / totalShots) * 100) : 100;
      const shotEfficiencyBonus = Math.max(0, (100 - totalShots) * 80);
      const speedBonus = Math.max(0, (300 - duration) * 20);
      const diffMultiplier = difficulty === 'admiral' ? 2.4 : difficulty === 'commander' ? 1.6 : 1.0;

      const calculatedScore = Math.round(
        (5000 + accuracy * 50 + shotEfficiencyBonus + speedBonus) * diffMultiplier
      );

      setFinalScore(calculatedScore);
      onGameOver(calculatedScore);
      setLastActionLog(`MISSION ACCOMPLISHED: Hostile fleet neutralized in ${totalShots} salvos with ${accuracy}% precision.`);
    } else {
      playSound('defeat');
      setFinalScore(1200);
      onGameOver(1200);
      setLastActionLog(`TACTICAL CASUALTY: Naval fleet destroyed by hostile artillery fire.`);
    }
  };

  // Reset / New Match
  const handleStartNewMatch = () => {
    playSound('click');
    setP1Ships([]);
    setP2Ships([]);
    setP1Shots({});
    setP2Shots({});
    setP1SonarAvailable(true);
    setP2SonarAvailable(true);
    setIsSonarActive(false);
    setScannedSector(null);
    setStreakCount(0);
    setWinner(null);
    setPhase('setup');
    setPvpSetupPlayer('P1');
    setActivePlayer('P1');
    setTurn('P1');
    setSelectedShipIndex(0);
    setLastActionLog('Tactical Combat System Ready. Assign coordinates to your 5 war vessels.');
  };

  // Fleet Health Metrics
  const p1AliveCount = p1Ships.filter(s => !s.sunk).length;
  const p2AliveCount = p2Ships.filter(s => !s.sunk).length;

  const p1TotalHits = Object.values(p1Shots).filter(v => v === 'hit').length;
  const p1TotalShots = Object.keys(p1Shots).length;
  const p1Accuracy = p1TotalShots > 0 ? Math.round((p1TotalHits / p1TotalShots) * 100) : 0;

  const p2TotalHits = Object.values(p2Shots).filter(v => v === 'hit').length;
  const p2TotalShots = Object.keys(p2Shots).length;
  const p2Accuracy = p2TotalShots > 0 ? Math.round((p2TotalHits / p2TotalShots) * 100) : 0;
  const formattedDuration = `${Math.floor(matchDurationSec / 60)}m ${matchDurationSec % 60}s`;

  // Viewport Perspective Mapping (In AI mode, viewer is ALWAYS Player 1)
  const viewerPlayer: 'P1' | 'P2' = mode === 'ai' ? 'P1' : turn;
  const friendlyShips = viewerPlayer === 'P1' ? p1Ships : p2Ships;
  const incomingHostileShots = viewerPlayer === 'P1' ? p2Shots : p1Shots;
  const enemyTargetShips = viewerPlayer === 'P1' ? p2Ships : p1Ships;
  const activePlayerShots = viewerPlayer === 'P1' ? p1Shots : p2Shots;
  const viewerSonarAvailable = viewerPlayer === 'P1' ? p1SonarAvailable : p2SonarAvailable;
  const friendlyAliveCount = viewerPlayer === 'P1' ? p1AliveCount : p2AliveCount;
  const enemyAliveCount = viewerPlayer === 'P1' ? p2AliveCount : p1AliveCount;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center select-none text-white animate-fadeIn pb-4 font-sans">
      {/* Neo-Brutalist HUD Header Bar */}
      <div className="w-full bg-portal-card border-3 border-black rounded-2xl p-2 min-[360px]:p-2.5 sm:p-4 mb-2.5 sm:mb-4 shadow-neo-md flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5">
        {/* Left: Mode & Military Difficulty Selector */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <div className="flex items-center bg-black/50 border-2 border-black rounded-xl p-0.5 shadow-neo-sm">
            <button
              onClick={() => {
                if (phase === 'setup') {
                  playSound('click');
                  setMode('ai');
                }
              }}
              disabled={phase !== 'setup'}
              className={`px-2 min-[360px]:px-2.5 py-1 rounded-lg font-black text-[11px] sm:text-xs uppercase transition-all flex items-center gap-1 sm:gap-1.5 ${
                mode === 'ai'
                  ? 'bg-portal-cyan text-black shadow-neo-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 stroke-[2.5]" /> VS AI
            </button>
            <button
              onClick={() => {
                if (phase === 'setup') {
                  playSound('click');
                  setMode('pvp');
                }
              }}
              disabled={phase !== 'setup'}
              className={`px-2 min-[360px]:px-2.5 py-1 rounded-lg font-black text-[11px] sm:text-xs uppercase transition-all flex items-center gap-1 sm:gap-1.5 ${
                mode === 'pvp'
                  ? 'bg-portal-pink text-white shadow-neo-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 stroke-[2.5]" /> 2P PASS
            </button>
          </div>

          {/* AI Difficulty Selector with Military Insignia */}
          {mode === 'ai' && (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-black/50 border-2 border-black rounded-xl p-0.5 shadow-neo-sm">
              <button
                onClick={() => {
                  playSound('click');
                  setDifficulty('cadet');
                }}
                disabled={phase !== 'setup'}
                className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] min-[360px]:text-[10px] font-black uppercase transition-all flex items-center gap-0.5 sm:gap-1 ${
                  difficulty === 'cadet'
                    ? 'bg-portal-lime text-black shadow-neo-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Cadet / Ensign AI: Randomized target trajectory"
              >
                <MilitaryRankBadge rank="cadet" />
                <span className="hidden min-[400px]:inline">ENSIGN</span>
                <span className="min-[400px]:hidden">ENS</span>
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setDifficulty('commander');
                }}
                disabled={phase !== 'setup'}
                className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] min-[360px]:text-[10px] font-black uppercase transition-all flex items-center gap-0.5 sm:gap-1 ${
                  difficulty === 'commander'
                    ? 'bg-portal-yellow text-black shadow-neo-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Commander AI: Checkerboard Parity & Hunt-Target Engine"
              >
                <MilitaryRankBadge rank="commander" />
                <span className="hidden min-[400px]:inline">COMMANDER</span>
                <span className="min-[400px]:hidden">CMD</span>
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setDifficulty('admiral');
                }}
                disabled={phase !== 'setup'}
                className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] min-[360px]:text-[10px] font-black uppercase transition-all flex items-center gap-0.5 sm:gap-1 ${
                  difficulty === 'admiral'
                    ? 'bg-portal-pink text-white shadow-neo-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Admiral AI: Probability Density Heatmap AI"
              >
                <MilitaryRankBadge rank="admiral" />
                <span className="hidden min-[400px]:inline">ADMIRAL</span>
                <span className="min-[400px]:hidden">ADM</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Sonar Recon & System Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {phase === 'battle' && (
            <button
              onClick={handleActivateSonar}
              disabled={!viewerSonarAvailable || isAiThinking}
              className={`px-2 min-[360px]:px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border-2 border-black text-[10px] min-[360px]:text-xs font-black uppercase transition-all flex items-center gap-1 sm:gap-1.5 shadow-neo-sm ${
                isSonarActive
                  ? 'bg-portal-yellow text-black animate-pulse shadow-neo-md'
                  : viewerSonarAvailable
                  ? 'bg-portal-cyan/20 hover:bg-portal-cyan text-portal-cyan hover:text-black border-portal-cyan'
                  : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'
              }`}
              title="Activate 3x3 Tactical Sonar Recon Radar Scan"
            >
              <Radar className={`w-3.5 h-3.5 ${isSonarActive ? 'animate-spin' : ''}`} />
              <span className="hidden min-[420px]:inline">SONAR RECON</span>
              <span className="min-[420px]:hidden">SONAR</span>
              <span className="text-[9px] min-[360px]:text-[10px]">[{viewerSonarAvailable ? 'ON' : 'OFF'}]</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1 min-[360px]:p-1.5 sm:p-2 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm hover:bg-portal-yellow hover:text-black transition-all"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
          </button>

          <button
            onClick={handleStartNewMatch}
            className="px-2 min-[360px]:px-2.5 py-1 sm:py-1.5 rounded-xl bg-portal-surface hover:bg-portal-pink hover:text-white border-2 border-black shadow-neo-sm text-[10px] min-[360px]:text-xs font-black uppercase transition-all flex items-center gap-1"
            title="Reset Match"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden min-[360px]:inline">RESET</span>
          </button>
        </div>
      </div>

      {/* Military Telemetry & Tactical Intelligence Ribbon */}
      <div className="w-full bg-slate-950/90 border-2 border-black rounded-xl px-3 py-1.5 mb-3 flex items-center justify-between text-xs font-mono shadow-neo-sm">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2.5 h-2.5 rounded-full bg-portal-cyan animate-pulse shrink-0 border border-black" />
          <span className="text-slate-300 truncate text-[11px] sm:text-xs">
            <strong className="text-portal-yellow uppercase tracking-wider font-sans font-black">INTEL BRIEFING: </strong>
            {lastActionLog}
          </span>
        </div>
        {phase === 'battle' && (
          <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] font-black uppercase text-slate-300">
            <span className="text-portal-cyan">PRECISION: {p1Accuracy}%</span>
            <span className="text-portal-yellow">SALVOS: {p1TotalShots}</span>
            {streakCount >= 2 && (
              <span className="text-portal-pink bg-portal-pink/20 border border-portal-pink px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                <Target className="w-3 h-3 stroke-[2.5]" />
                BARRAGE x{streakCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PHASE 1: FLEET DEPLOYMENT & SETUP STAGE */}
      {/* ========================================================================= */}
      {phase === 'setup' && (
        <div className="w-full flex flex-col items-center">
          {/* Header instructions */}
          <div className="w-full bg-gradient-to-r from-portal-surface via-portal-card to-portal-surface border-3 border-black rounded-2xl p-4 mb-4 shadow-neo-md text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Crosshair className="w-5 h-5 text-portal-yellow stroke-[2.5]" />
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                {mode === 'pvp' && pvpSetupPlayer === 'P2' ? 'PLAYER 2 FLEET DOCK ASSIGNMENT' : 'TACTICAL FLEET DEPLOYMENT'}
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Assign strategic oceanic coordinates to your 5 war vessels. Click to place, press <strong className="text-portal-yellow font-black">[R]</strong> to rotate hull orientation.
            </p>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left/Main Placement Grid (10x10) */}
            <div className="lg:col-span-8 flex flex-col items-center bg-portal-surface border-3 border-black rounded-2xl p-2 min-[360px]:p-3 sm:p-5 shadow-neo-md w-full overflow-hidden">
              <div className="flex items-center justify-between w-full mb-2.5 sm:mb-3 px-1 text-[11px] sm:text-xs">
                <span className="font-black uppercase text-portal-cyan flex items-center gap-1 sm:gap-1.5 truncate">
                  <Radar className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" /> SECTOR: {ROW_LABELS[0]}1-{ROW_LABELS[9]}10
                </span>
                <span className="font-black uppercase text-portal-yellow truncate">
                  AXIS: <strong className="underline">{placementOrientation === 'H' ? 'HORIZ (→)' : 'VERT (↓)'}</strong>
                </span>
              </div>

              {/* 10x10 Grid View */}
              <div className="relative p-1.5 min-[360px]:p-2 bg-slate-950 border-3 border-black rounded-xl shadow-neo-sm overflow-x-auto max-w-full">
                {/* Column Headers */}
                <div className="flex ml-4 min-[360px]:ml-5 min-[380px]:ml-6 sm:ml-7 mb-1 gap-0.5 min-[380px]:gap-1">
                  {COL_LABELS.map(col => (
                    <div key={col} className="w-[23px] h-4 min-[360px]:w-[26px] min-[360px]:h-5 min-[380px]:w-7 min-[380px]:h-5 sm:w-8 sm:h-6 flex items-center justify-center text-[9px] min-[360px]:text-[10px] sm:text-xs font-mono font-black text-slate-400">
                      {col}
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="flex flex-col gap-0.5 min-[380px]:gap-1">
                  {ROW_LABELS.map((rowLabel, r) => (
                    <div key={rowLabel} className="flex items-center gap-0.5 min-[380px]:gap-1">
                      {/* Row Label */}
                      <div className="w-4 min-[360px]:w-5 min-[380px]:w-6 sm:w-6 flex items-center justify-center text-[9px] min-[360px]:text-[10px] sm:text-xs font-mono font-black text-slate-400">
                        {rowLabel}
                      </div>

                      {/* 10 Cells */}
                      {COL_LABELS.map((_, c) => {
                        const currentPlacedShips = (mode === 'ai' || pvpSetupPlayer === 'P1') ? p1Ships : p2Ships;
                        const occupyingShip = currentPlacedShips.find(s => s.positions.some(p => p.r === r && p.c === c));

                        // Placement preview highlight
                        let isHoveredPreview = false;
                        let isValidHover = true;

                        if (hoverCoord && selectedShipIndex !== -1) {
                          const def = FLEET_MANIFEST[selectedShipIndex];
                          if (def) {
                            for (let i = 0; i < def.size; i++) {
                              const hr = placementOrientation === 'H' ? hoverCoord.r : hoverCoord.r + i;
                              const hc = placementOrientation === 'H' ? hoverCoord.c + i : hoverCoord.c;
                              if (hr === r && hc === c) {
                                isHoveredPreview = true;
                              }
                            }
                            isValidHover = isValidPlacement(
                              hoverCoord.r,
                              hoverCoord.c,
                              def.size,
                              placementOrientation,
                              currentPlacedShips.filter(s => s.id !== def.id)
                            );
                          }
                        }

                        // Determine hull segment index if occupied
                        let segmentIndex = 0;
                        if (occupyingShip) {
                          const posIdx = occupyingShip.positions.findIndex(p => p.r === r && p.c === c);
                          segmentIndex = posIdx !== -1 ? posIdx : 0;
                        }

                        return (
                          <button
                            key={c}
                            onClick={() => handleCellPlacementClick(r, c)}
                            onMouseEnter={() => setHoverCoord({ r, c })}
                            onMouseLeave={() => setHoverCoord(null)}
                            className={`w-[23px] h-[23px] min-[360px]:w-[26px] min-[360px]:h-[26px] min-[380px]:w-7 min-[380px]:h-7 sm:w-8 sm:h-8 rounded-md min-[380px]:rounded-lg border sm:border-2 transition-all flex items-center justify-center font-mono font-black text-[10px] sm:text-xs relative overflow-hidden ${
                              isHoveredPreview
                                ? isValidHover
                                  ? 'bg-portal-lime/40 border-portal-lime shadow-neo-sm scale-95'
                                  : 'bg-portal-pink/40 border-portal-pink shadow-neo-sm'
                                : occupyingShip
                                ? 'bg-slate-900 border-black shadow-neo-sm'
                                : 'bg-slate-900/80 border-slate-800 hover:border-portal-cyan/60 hover:bg-slate-800/80'
                            }`}
                          >
                            {occupyingShip && (
                              <ShipHullSegment
                                shipId={occupyingShip.id}
                                segmentIndex={segmentIndex}
                                totalSize={occupyingShip.size}
                                orientation={occupyingShip.orientation}
                                isDamaged={false}
                                isSunk={false}
                                color={occupyingShip.color}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Placement Tools Controls */}
              <div className="flex flex-wrap items-center justify-between w-full mt-3 sm:mt-4 gap-2">
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                  <button
                    onClick={handleRotate}
                    className="px-2.5 min-[360px]:px-3 py-1.5 sm:py-2 rounded-xl bg-portal-yellow text-black border-2 border-black font-black text-[11px] sm:text-xs uppercase shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-1 sm:gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" /> ROTATE [R]
                  </button>
                  <button
                    onClick={handleAutoDeploy}
                    className="px-2.5 min-[360px]:px-3 py-1.5 sm:py-2 rounded-xl bg-portal-cyan text-black border-2 border-black font-black text-[11px] sm:text-xs uppercase shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-1 sm:gap-1.5"
                  >
                    <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" /> AUTO [A]
                  </button>
                  <button
                    onClick={handleResetPlacement}
                    className="px-2 min-[360px]:px-2.5 py-1.5 sm:py-2 rounded-xl bg-portal-surface hover:bg-portal-pink hover:text-white border-2 border-black font-black text-[11px] sm:text-xs uppercase shadow-neo-sm transition-all"
                  >
                    CLEAR
                  </button>
                </div>

                {/* Launch Button */}
                {((mode === 'ai' || pvpSetupPlayer === 'P1') ? p1Ships : p2Ships).length === 5 && (
                  <button
                    onClick={handleCommenceBattle}
                    className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-portal-lime text-black border-3 border-black font-black text-xs sm:text-sm uppercase shadow-neo-md hover:translate-x-1 hover:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 animate-bounce"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    {mode === 'pvp' && pvpSetupPlayer === 'P1' ? 'SAVE & PASS TO PLAYER 2' : 'COMMENCE COMBAT'}
                  </button>
                )}
              </div>
            </div>

            {/* Right: Fleet Manifest Selector Drawer */}
            <div className="lg:col-span-4 flex flex-col bg-portal-surface border-3 border-black rounded-2xl p-4 shadow-neo-md divide-y-2 divide-black/40">
              <div className="pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-portal-yellow mb-1 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 stroke-[2.5]" /> SQUADRON MANIFEST
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select each vessel to customize its dock coordinates:
                </p>
              </div>

              <div className="py-3 flex flex-col gap-2.5 flex-1">
                {FLEET_MANIFEST.map((ship, idx) => {
                  const currentPlacedShips = (mode === 'ai' || pvpSetupPlayer === 'P1') ? p1Ships : p2Ships;
                  const isPlaced = currentPlacedShips.some(s => s.id === ship.id);
                  const isSelected = selectedShipIndex === idx;

                  return (
                    <ShipBlueprintCard
                      key={ship.id}
                      ship={ship}
                      isPlaced={isPlaced}
                      isSelected={isSelected}
                      onClick={() => {
                        playSound('click');
                        setSelectedShipIndex(idx);
                      }}
                    />
                  );
                })}
              </div>

              {/* Tactical Quick Tip */}
              <div className="pt-3 text-[11px] text-slate-400 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-portal-cyan shrink-0 mt-0.5" />
                <span>
                  <strong>TACTICAL RULE:</strong> Disperse warships across different sector quadrants to avoid cluster artillery damage.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2 & 3: ACTIVE COMBAT STAGE & POST-MATCH BATTLEFIELD INSPECTOR */}
      {/* ========================================================================= */}
      {(phase === 'battle' || phase === 'gameover') && (
        <div className="w-full flex flex-col items-center animate-fadeIn">
          {/* POST-MATCH TACTICAL DEBRIEFING CARD (When phase === 'gameover') */}
          {phase === 'gameover' && (
            <div className="w-full bg-portal-card border-4 border-black rounded-3xl p-4 sm:p-6 mb-4 shadow-neo-lg text-center animate-scaleIn">
              {/* Header Badge Crest & Title */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mb-2 rounded-2xl bg-portal-surface border-3 border-black flex items-center justify-center shadow-neo-md">
                  {winner === 'P1' ? (
                    <Award className="w-8 h-8 sm:w-9 sm:h-9 text-portal-yellow stroke-[2.5]" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 sm:w-9 sm:h-9 text-portal-pink stroke-[2.5]" />
                  )}
                </div>

                <div className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 bg-black/60 border border-slate-700">
                  {winner === 'P1' ? (
                    <span className="text-portal-lime flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> MISSION ACCOMPLISHED // SECTOR SECURED
                    </span>
                  ) : (
                    <span className="text-portal-pink flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> FLEET CASUALTY REPORT // MISSION FAILED
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-2">
                  {winner === 'P1'
                    ? mode === 'ai'
                      ? 'TACTICAL NAVAL VICTORY'
                      : 'PLAYER 1 VICTORIOUS'
                    : mode === 'ai'
                    ? 'FLEET SQUADRON DESTROYED'
                    : 'PLAYER 2 VICTORIOUS'}
                </h2>

                {/* Tactical Narrative Debrief Analysis */}
                <div className="w-full max-w-2xl bg-portal-surface/90 border-2 border-black rounded-xl p-3 mb-4 text-left shadow-neo-sm">
                  <div className="flex items-center gap-2 mb-1.5 border-b border-black/40 pb-1">
                    <Radio className="w-3.5 h-3.5 text-portal-cyan animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-portal-cyan">
                      TACTICAL COMBAT DEBRIEF // AFTER-ACTION REVIEW
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {winner === 'P1' ? (
                      <>
                        Hostile naval squadron completely neutralized across{' '}
                        <strong className="text-portal-lime font-black">{p1TotalShots} salvos</strong> with{' '}
                        <strong className="text-portal-cyan font-black">{p1Accuracy}% targeting accuracy</strong>. All 5 enemy warships sunk in{' '}
                        <strong className="text-portal-yellow font-black">{formattedDuration}</strong> while preserving{' '}
                        <strong className="text-portal-lime font-black">{p1AliveCount} friendly vessel{p1AliveCount !== 1 ? 's' : ''}</strong>. Strategic ocean sector has been locked down under your command.
                      </>
                    ) : (
                      <>
                        Friendly squadron sustained catastrophic hull breaches after{' '}
                        <strong className="text-portal-pink font-black">{p2TotalShots} incoming artillery strikes</strong> ({p2Accuracy}% hostile accuracy). All friendly warships were neutralized over{' '}
                        <strong className="text-portal-yellow font-black">{formattedDuration}</strong>. Hostile battle-group preserved{' '}
                        <strong className="text-portal-pink font-black">{p2AliveCount} hidden warship{p2AliveCount !== 1 ? 's' : ''}</strong>.
                      </>
                    )}
                  </p>
                </div>

                {/* Combat Telemetry Statistics Grid */}
                <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">SCORE</span>
                    <span className="text-base sm:text-lg font-black text-portal-yellow font-mono">{finalScore}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">PRECISION</span>
                    <span className="text-base sm:text-lg font-black text-portal-cyan font-mono">{p1Accuracy}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">SALVOS</span>
                    <span className="text-base sm:text-lg font-black text-portal-lime font-mono">{p1TotalShots}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">SURVIVORS</span>
                    <span className="text-base sm:text-lg font-black text-portal-pink font-mono">{p1AliveCount}/5</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">TIME</span>
                    <span className="text-base sm:text-lg font-black text-portal-cyan font-mono">{formattedDuration}</span>
                  </div>
                </div>

                {/* Rematch / Replay Button */}
                <div className="w-full max-w-md">
                  <button
                    onClick={handleStartNewMatch}
                    className="w-full py-3.5 rounded-2xl bg-portal-yellow text-black border-3 border-black font-black text-sm uppercase shadow-neo-md hover:translate-x-1 hover:translate-y-1 active:translate-x-2 active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 stroke-[3]" /> DEPLOY FRESH SQUADRON / REMATCH
                  </button>
                </div>

                {/* Battlefield Reconnaissance Notification */}
                <div className="mt-3 text-xs text-portal-yellow font-black uppercase flex items-center gap-1.5 bg-portal-yellow/10 border border-portal-yellow/30 px-3 py-1.5 rounded-lg">
                  <Eye className="w-4 h-4 text-portal-yellow shrink-0" />
                  <span>BATTLEFIELD RECONNAISSANCE ACTIVE: Fog of War lifted on both radar grids below for tactical review.</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Turn & Phase Status Banner */}
          <div className="w-full bg-portal-card border-3 border-black rounded-2xl p-2 min-[360px]:p-2.5 sm:p-3 mb-2.5 sm:mb-4 shadow-neo-md flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 min-[360px]:gap-2.5 truncate max-w-full">
              <div
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 rounded-full border-2 border-black ${
                  phase === 'gameover'
                    ? 'bg-portal-yellow'
                    : turn === 'P1'
                    ? 'bg-portal-cyan animate-ping'
                    : 'bg-portal-pink animate-ping'
                }`}
              />
              <span className="font-black text-[11px] min-[360px]:text-xs sm:text-sm uppercase tracking-wider text-white flex items-center gap-1.5 truncate">
                {phase === 'gameover' ? (
                  <>
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-portal-yellow stroke-[2.5] shrink-0" />
                    <span className="truncate">BATTLEFIELD INSPECTOR // ALL HOSTILE VESSELS REVEALED</span>
                  </>
                ) : turn === 'P1' ? (
                  <>
                    <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-portal-cyan stroke-[2.5] shrink-0" />
                    <span className="truncate">{mode === 'ai' ? 'YOUR SALVO // TARGET RADAR' : 'PLAYER 1 SALVO // TARGET RADAR'}</span>
                  </>
                ) : (
                  <>
                    <Radar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-portal-pink stroke-[2.5] animate-spin shrink-0" />
                    <span className="truncate">{mode === 'ai' ? 'HOSTILE SALVO INCOMING...' : 'PLAYER 2 SALVO // TARGET RADAR'}</span>
                  </>
                )}
              </span>
            </div>

            {/* Mobile View Toggle Buttons */}
            <div className="flex md:hidden items-center bg-black/50 border-2 border-black rounded-xl p-0.5 shadow-neo-sm shrink-0">
              <button
                onClick={() => setMobileTab('radar')}
                className={`px-2.5 py-1 rounded-lg text-[10px] min-[360px]:text-xs font-black uppercase transition-all ${
                  mobileTab === 'radar' ? 'bg-portal-yellow text-black shadow-neo-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                RADAR
              </button>
              <button
                onClick={() => setMobileTab('fleet')}
                className={`px-2.5 py-1 rounded-lg text-[10px] min-[360px]:text-xs font-black uppercase transition-all ${
                  mobileTab === 'fleet' ? 'bg-portal-cyan text-black shadow-neo-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                FLEET
              </button>
            </div>

            {/* Fleet Status Counts */}
            <div className="hidden sm:flex items-center gap-3 text-xs font-black uppercase">
              <span className="text-portal-cyan flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> FRIENDLY: {friendlyAliveCount}/5 OPERATIONAL
              </span>
              <span className="text-portal-pink flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" /> HOSTILE: {enemyAliveCount}/5 REMAINING
              </span>
            </div>
          </div>

          {/* Dual Radar Viewport (Side by Side on Desktop, Tabbed on Mobile) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* 1. ENEMY TARGETING RADAR (Primary Attack View / Post-Match Fog of War Lifted View) */}
            <div
              className={`flex flex-col items-center bg-portal-surface border-3 border-black rounded-2xl p-2 min-[360px]:p-3 sm:p-4 shadow-neo-md w-full overflow-hidden ${
                mobileTab === 'fleet' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2 px-1 text-[11px] sm:text-xs">
                <span className="font-black uppercase text-portal-pink flex items-center gap-1 sm:gap-1.5 truncate">
                  <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-portal-pink stroke-[2.5] shrink-0" />
                  <span className="truncate">
                    {phase === 'gameover' ? 'HOSTILE SECTOR (REVEALED)' : 'HOSTILE TARGETING RADAR'}
                  </span>
                </span>
                <span className="text-[9px] min-[360px]:text-[10px] font-mono font-bold text-slate-400 uppercase bg-black/50 px-1.5 min-[360px]:px-2 py-0.5 rounded border border-slate-800 shrink-0">
                  {phase === 'gameover'
                    ? `${5 - enemyAliveCount}/5 SUNK`
                    : `${enemyAliveCount} DETECTED`}
                </span>
              </div>

              {/* 10x10 Enemy Targeting Radar Grid */}
              <div className="relative p-1.5 min-[360px]:p-2 bg-slate-950 border-3 border-black rounded-xl shadow-neo-sm overflow-x-auto max-w-full">
                {/* Column Headers */}
                <div className="flex ml-4 min-[360px]:ml-5 min-[380px]:ml-6 sm:ml-7 mb-1 gap-0.5 min-[380px]:gap-1">
                  {COL_LABELS.map(col => (
                    <div key={col} className="w-[23px] h-4 min-[360px]:w-[26px] min-[360px]:h-5 min-[380px]:w-7 min-[380px]:h-5 sm:w-8 sm:h-6 flex items-center justify-center text-[9px] min-[360px]:text-[10px] sm:text-xs font-mono font-black text-slate-400">
                      {col}
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="flex flex-col gap-0.5 min-[380px]:gap-1">
                  {ROW_LABELS.map((rowLabel, r) => (
                    <div key={rowLabel} className="flex items-center gap-0.5 min-[380px]:gap-1">
                      {/* Row Label */}
                      <div className="w-4 min-[360px]:w-5 min-[380px]:w-6 sm:w-6 flex items-center justify-center text-[9px] min-[360px]:text-[10px] sm:text-xs font-mono font-black text-slate-400">
                        {rowLabel}
                      </div>

                      {/* 10 Target Cells */}
                      {COL_LABELS.map((_, c) => {
                        const shotKey = `${r},${c}`;
                        const shotStatus = activePlayerShots[shotKey];
                        const occupyingEnemyShip = enemyTargetShips.find(s =>
                          s.positions.some(p => p.r === r && p.c === c)
                        );

                        let enemySegmentIndex = 0;
                        if (occupyingEnemyShip) {
                          const posIdx = occupyingEnemyShip.positions.findIndex(p => p.r === r && p.c === c);
                          enemySegmentIndex = posIdx !== -1 ? posIdx : 0;
                        }

                        const isSunkShipCell = Boolean(occupyingEnemyShip && occupyingEnemyShip.sunk);
                        const isGameOver = phase === 'gameover';
                        const isRevealedIntactEnemyShip = isGameOver && occupyingEnemyShip && !occupyingEnemyShip.sunk && !shotStatus;

                        // Sonar highlight
                        const isSonarSector =
                          scannedSector &&
                          Math.abs(scannedSector.r - r) <= 1 &&
                          Math.abs(scannedSector.c - c) <= 1;

                        return (
                          <button
                            key={c}
                            onClick={() => handleFireSalvo(r, c)}
                            disabled={Boolean(shotStatus) || isAiThinking || (mode === 'ai' && turn !== 'P1') || isGameOver}
                            className={`w-[23px] h-[23px] min-[360px]:w-[26px] min-[360px]:h-[26px] min-[380px]:w-7 min-[380px]:h-7 sm:w-8 sm:h-8 rounded-md min-[380px]:rounded-lg border sm:border-2 transition-all flex items-center justify-center font-mono font-black text-[10px] sm:text-xs relative overflow-hidden ${
                              isSunkShipCell
                                ? 'bg-portal-pink/30 text-white border-portal-pink shadow-neo-sm'
                                : isRevealedIntactEnemyShip
                                ? 'bg-slate-900 border-portal-yellow ring-1 ring-portal-yellow/60 shadow-neo-sm'
                                : shotStatus === 'hit'
                                ? 'bg-portal-yellow/20 text-black border-portal-yellow shadow-neo-sm'
                                : shotStatus === 'miss'
                                ? 'bg-slate-900 text-slate-400 border-slate-800'
                                : isSonarSector
                                ? scannedSector.found
                                  ? 'bg-portal-cyan/30 border-portal-cyan'
                                  : 'bg-slate-900 border-slate-800 opacity-60'
                                : isGameOver
                                ? 'bg-slate-900/60 border-slate-800 cursor-default'
                                : 'bg-slate-900/90 border-slate-800 hover:border-portal-pink hover:bg-portal-pink/20 active:scale-95'
                            }`}
                          >
                            {occupyingEnemyShip && (isSunkShipCell || isGameOver || shotStatus === 'hit') ? (
                              <ShipHullSegment
                                shipId={occupyingEnemyShip.id}
                                segmentIndex={enemySegmentIndex}
                                totalSize={occupyingEnemyShip.size}
                                orientation={occupyingEnemyShip.orientation}
                                isDamaged={shotStatus === 'hit' || occupyingEnemyShip.sunk}
                                isSunk={occupyingEnemyShip.sunk}
                                color={occupyingEnemyShip.color}
                              />
                            ) : shotStatus === 'hit' ? (
                              <BallisticImpactBlast isSunk={false} />
                            ) : shotStatus === 'miss' ? (
                              <WaterSplashMarker />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Enemy Fleet Manifest Status Drawer */}
              <div className="w-full mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                {enemyTargetShips.map(ship => (
                  <div
                    key={ship.id}
                    className={`px-1.5 min-[360px]:px-2 py-0.5 min-[360px]:py-1 rounded-lg border text-[9px] min-[360px]:text-[10px] font-black uppercase flex items-center gap-1 sm:gap-1.5 ${
                      ship.sunk
                        ? 'bg-portal-pink/20 border-portal-pink text-portal-pink line-through opacity-70'
                        : phase === 'gameover'
                        ? 'bg-portal-lime/20 border-portal-lime text-portal-lime font-black'
                        : 'bg-black/50 border-black text-slate-300'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 min-[360px]:w-2 min-[360px]:h-2 rounded-sm"
                      style={{ backgroundColor: ship.sunk ? '#FF4081' : ship.color }}
                    />
                    {ship.code} [{ship.hits}/{ship.size}] {phase === 'gameover' && !ship.sunk ? '✓ SURVIVED' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. FRIENDLY OCEAN FLEET (Defense & Casualty View) */}
            <div
              className={`flex flex-col items-center bg-portal-surface border-3 border-black rounded-2xl p-2 min-[360px]:p-3 sm:p-4 shadow-neo-md w-full overflow-hidden ${
                mobileTab === 'radar' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2 px-1 text-[11px] sm:text-xs">
                <span className="font-black uppercase text-portal-cyan flex items-center gap-1 sm:gap-1.5 truncate">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-portal-cyan stroke-[2.5] shrink-0" />
                  <span className="truncate">
                    {phase === 'gameover' ? 'FRIENDLY SQUADRON (CASUALTY REVIEW)' : 'FRIENDLY OCEAN FLEET'}
                  </span>
                </span>
                <span className="text-[9px] min-[360px]:text-[10px] font-mono font-bold text-slate-400 uppercase bg-black/50 px-1.5 min-[360px]:px-2 py-0.5 rounded border border-slate-800 shrink-0">
                  {friendlyAliveCount} OPERATIONAL
                </span>
              </div>

              {/* 10x10 Friendly Ocean Grid */}
              <div className="relative p-1.5 min-[360px]:p-2 bg-slate-950 border-3 border-black rounded-xl shadow-neo-sm overflow-x-auto max-w-full">
                {/* Column Headers */}
                <div className="flex ml-4 min-[360px]:ml-5 min-[380px]:ml-6 sm:ml-7 mb-1 gap-0.5 min-[380px]:gap-1">
                  {COL_LABELS.map(col => (
                    <div key={col} className="w-[23px] h-4 min-[360px]:w-[26px] min-[360px]:h-5 min-[380px]:w-7 min-[380px]:h-5 sm:w-8 sm:h-6 flex items-center justify-center text-[9px] min-[360px]:text-[10px] sm:text-xs font-mono font-black text-slate-400">
                      {col}
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="flex flex-col gap-0.5 min-[380px]:gap-1">
                  {ROW_LABELS.map((rowLabel, r) => (
                    <div key={rowLabel} className="flex items-center gap-0.5 min-[380px]:gap-1">
                      {/* Row Label */}
                      <div className="w-4 min-[360px]:w-5 min-[380px]:w-6 sm:w-6 flex items-center justify-center text-[9px] min-[360px]:text-[10px] sm:text-xs font-mono font-black text-slate-400">
                        {rowLabel}
                      </div>

                      {/* 10 Ocean Cells */}
                      {COL_LABELS.map((_, c) => {
                        const shotKey = `${r},${c}`;
                        const shotStatus = incomingHostileShots[shotKey];

                        const occupyingShip = friendlyShips.find(s =>
                          s.positions.some(p => p.r === r && p.c === c)
                        );

                        let segmentIndex = 0;
                        if (occupyingShip) {
                          const posIdx = occupyingShip.positions.findIndex(p => p.r === r && p.c === c);
                          segmentIndex = posIdx !== -1 ? posIdx : 0;
                        }

                        return (
                          <div
                            key={c}
                            className={`w-[23px] h-[23px] min-[360px]:w-[26px] min-[360px]:h-[26px] min-[380px]:w-7 min-[380px]:h-7 sm:w-8 sm:h-8 rounded-md min-[380px]:rounded-lg border sm:border-2 flex items-center justify-center font-mono font-black text-[10px] sm:text-xs relative overflow-hidden ${
                              occupyingShip
                                ? shotStatus === 'hit'
                                  ? 'bg-portal-pink/30 border-portal-pink shadow-neo-sm animate-pulse'
                                  : 'bg-slate-900 border-black shadow-neo-sm'
                                : shotStatus === 'miss'
                                ? 'bg-slate-900 text-slate-400 border-slate-800'
                                : 'bg-slate-900/80 border-slate-800'
                            }`}
                          >
                            {occupyingShip ? (
                              <ShipHullSegment
                                shipId={occupyingShip.id}
                                segmentIndex={segmentIndex}
                                totalSize={occupyingShip.size}
                                orientation={occupyingShip.orientation}
                                isDamaged={shotStatus === 'hit' || occupyingShip.sunk}
                                isSunk={occupyingShip.sunk}
                                color={occupyingShip.color}
                              />
                            ) : shotStatus === 'miss' ? (
                              <WaterSplashMarker />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Friendly Fleet Manifest Status Drawer */}
              <div className="w-full mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                {friendlyShips.map(ship => (
                  <div
                    key={ship.id}
                    className={`px-1.5 min-[360px]:px-2 py-0.5 min-[360px]:py-1 rounded-lg border text-[9px] min-[360px]:text-[10px] font-black uppercase flex items-center gap-1 sm:gap-1.5 ${
                      ship.sunk
                        ? 'bg-portal-pink/20 border-portal-pink text-portal-pink line-through opacity-70'
                        : 'bg-black/50 border-black text-slate-300'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 min-[360px]:w-2 min-[360px]:h-2 rounded-sm"
                      style={{ backgroundColor: ship.sunk ? '#FF4081' : ship.color }}
                    />
                    {ship.code} [{ship.hits}/{ship.size}] {phase === 'gameover' && !ship.sunk ? '✓ SURVIVED' : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
