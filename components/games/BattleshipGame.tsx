'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Trophy,
  Users,
  Bot,
  Zap,
  Shield,
  Flame,
  Crosshair,
  Radar,
  Radio,
  RefreshCw,
  Compass,
  AlertTriangle,
  Award,
  Eye,
  CheckCircle2,
  Anchor,
  HelpCircle,
  Play
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
}

export interface PlacedShip extends ShipDefinition {
  row: number;
  col: number;
  orientation: Orientation;
  positions: { r: number; c: number }[];
  hits: number;
  sunk: boolean;
}

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'scanned';

const GRID_SIZE = 10;
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const FLEET_MANIFEST: ShipDefinition[] = [
  { id: 'carrier', name: 'Quantum Carrier', code: 'CV-99', size: 5, color: '#FFE600', accent: 'bg-yellow-400 text-black' },
  { id: 'battleship', name: 'Neo Dreadnought', code: 'BB-77', size: 4, color: '#00F0FF', accent: 'bg-cyan-400 text-black' },
  { id: 'cruiser', name: 'Laser Cruiser', code: 'CG-42', size: 3, color: '#FF4081', accent: 'bg-pink-500 text-white' },
  { id: 'submarine', name: 'Stealth Sub', code: 'SS-18', size: 3, color: '#A3E635', accent: 'bg-lime-400 text-black' },
  { id: 'destroyer', name: 'Plasma Destroyer', code: 'DD-09', size: 2, color: '#C084FC', accent: 'bg-purple-400 text-black' }
];

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

  // Tactical Recon Scanner Ability (1 scan per match or earned)
  const [p1SonarAvailable, setP1SonarAvailable] = useState<boolean>(true);
  const [p2SonarAvailable, setP2SonarAvailable] = useState<boolean>(true);
  const [isSonarActive, setIsSonarActive] = useState<boolean>(false);
  const [scannedSector, setScannedSector] = useState<{ r: number; c: number; found: boolean } | null>(null);

  // Combat Telemetry & Feedback
  const [turn, setTurn] = useState<'P1' | 'P2'>('P1');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [lastActionLog, setLastActionLog] = useState<string>('System Calibrated. Place your fleet on the tactical ocean grid.');
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
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.35);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'launch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'hit') {
        // Deep explosive blast with noise
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'miss') {
        // Water splash plunge
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'sunk') {
        // Double warning klaxon
        [0, 0.18].forEach(delay => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(740, now + delay);
          osc.frequency.setValueAtTime(520, now + delay + 0.08);
          gain.gain.setValueAtTime(0.2, now + delay);
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
          gain.gain.setValueAtTime(0.18, noteTime);
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
    setLastActionLog('Fleet auto-deployed with tactical spread pattern.');
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
    setLastActionLog('Placement cleared. Reassign naval grid positions.');
  };

  // Rotate placement orientation
  const handleRotate = () => {
    playSound('rotate');
    setPlacementOrientation(prev => (prev === 'H' ? 'V' : 'H'));
  };

  // Place ship at coordinate
  const handleCellPlacementClick = (r: number, c: number) => {
    const currentShips = (mode === 'ai' || pvpSetupPlayer === 'P1') ? p1Ships : p2Ships;
    const currentShipDef = FLEET_MANIFEST[selectedShipIndex];
    if (!currentShipDef) return;

    // If ship already placed, we can relocate it
    const filteredShips = currentShips.filter(s => s.id !== currentShipDef.id);

    if (isValidPlacement(r, c, currentShipDef.size, placementOrientation, filteredShips)) {
      playSound('click');
      const positions: { r: number; c: number }[] = [];
      for (let i = 0; i < currentShipDef.size; i++) {
        positions.push({
          r: placementOrientation === 'H' ? r : r + i,
          c: placementOrientation === 'H' ? c + i : c
        });
      }

      const newPlacedShip: PlacedShip = {
        ...currentShipDef,
        row: r,
        col: c,
        orientation: placementOrientation,
        positions,
        hits: 0,
        sunk: false
      };

      const updatedFleet = [...filteredShips, newPlacedShip];
      if (mode === 'ai' || pvpSetupPlayer === 'P1') {
        setP1Ships(updatedFleet);
      } else {
        setP2Ships(updatedFleet);
      }

      // Automatically select next unplaced ship
      const nextUnplacedIndex = FLEET_MANIFEST.findIndex(
        def => !updatedFleet.some(s => s.id === def.id)
      );
      if (nextUnplacedIndex !== -1) {
        setSelectedShipIndex(nextUnplacedIndex);
      }
      setLastActionLog(`${currentShipDef.name} deployed at ${ROW_LABELS[r]}${COL_LABELS[c]}.`);
    } else {
      playSound('miss');
      setLastActionLog(`Invalid placement sector! Check boundary limits & fleet clearance.`);
    }
  };

  // Keyboard shortcut listener for PC Controls (Rotate [R], Sonar [S], Mode [M], Auto-Deploy [A])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const k = e.key.toLowerCase();
      if (k === 'r') {
        if (phase === 'setup') {
          handleRotate();
        } else if (phase === 'gameover') {
          handleStartNewMatch();
        }
      } else if (k === 's') {
        if (phase === 'battle') {
          handleActivateSonar();
        }
      } else if (k === 'm') {
        if (phase === 'setup') {
          playSound('click');
          setMode(prev => (prev === 'ai' ? 'pvp' : 'ai'));
        }
      } else if (k === 'a') {
        if (phase === 'setup') {
          handleAutoDeploy();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isSonarActive, p1SonarAvailable, p2SonarAvailable, turn, isAiThinking, mode, pvpSetupPlayer, p1Ships, p2Ships]);

  // Launch Combat Phase after setup
  const handleCommenceBattle = () => {
    playSound('launch');
    if (mode === 'ai') {
      // Generate AI Fleet
      const aiFleet = generateRandomFleet();
      setP2Ships(aiFleet);
      setP1Shots({});
      setP2Shots({});
      setTurn('P1');
      setPhase('battle');
      setMatchStartTime(Date.now());
      setLastActionLog('All systems online. Firing solutions ready. Select enemy radar sector to fire!');
    } else {
      // 2P Pass & Play
      if (pvpSetupPlayer === 'P1') {
        setPvpSetupPlayer('P2');
        setLastActionLog('Player 1 fleet saved. Pass terminal to Player 2 for secret deployment.');
      } else {
        setP1Shots({});
        setP2Shots({});
        setTurn('P1');
        setActivePlayer('P1');
        setPhase('battle');
        setMatchStartTime(Date.now());
        setLastActionLog('Combat engaged! Player 1, launch initial artillery salvo.');
      }
    }
  };

  // Trigger Sonar Recon
  const handleActivateSonar = () => {
    const isP1 = turn === 'P1';
    const isAvailable = isP1 ? p1SonarAvailable : p2SonarAvailable;
    if (!isAvailable) return;

    playSound('sonar');
    setIsSonarActive(prev => !prev);
    setLastActionLog(
      !isSonarActive
        ? 'Recon Sonar Activated! Click any 3x3 sector on radar to scan for enemy presence.'
        : 'Sonar Recon Standby.'
    );
  };

  // AI Probability Density Heatmap Algorithm (Admiral Boss)
  const calculateAiTargetProbability = (
    opponentShips: PlacedShip[],
    opponentShots: { [key: string]: 'hit' | 'miss' }
  ): { r: number; c: number } => {
    // 1. Calculate remaining alive ship sizes
    const aliveShips = opponentShips.filter(s => !s.sunk);
    const aliveSizes = aliveShips.map(s => s.size);

    // Probability grid
    const probGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));

    // For every remaining alive ship length, test every valid horizontal and vertical placement
    for (const size of aliveSizes) {
      // Test Horizontal
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
              // If this cell was hit but is already part of a sunk ship, check if we should avoid
              hitCount++;
            }
          }

          if (canFit) {
            const weight = 1 + hitCount * 15; // Heavily boost cells aligned with known unsunk hits
            for (let i = 0; i < size; i++) {
              const key = `${r},${c + i}`;
              if (!opponentShots[key]) {
                probGrid[r][c + i] += weight;
              }
            }
          }
        }
      }

      // Test Vertical
      for (let r = 0; r <= GRID_SIZE - size; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
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
              const key = `${r + i},${c}`;
              if (!opponentShots[key]) {
                probGrid[r + i][c] += weight;
              }
            }
          }
        }
      }
    }

    // Parity Checkerboard hunting bonus for Commander/Admiral
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!opponentShots[`${r},${c}`]) {
          if ((r + c) % 2 === 0) {
            probGrid[r][c] += 2;
          }
        }
      }
    }

    // Find highest probability unshot cell
    let maxVal = -1;
    let candidates: { r: number; c: number }[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!opponentShots[`${r},${c}`]) {
          const val = probGrid[r][c];
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

    // Fallback: pick any random unshot cell
    const unshot: { r: number; c: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!opponentShots[`${r},${c}`]) {
          unshot.push({ r, c });
        }
      }
    }
    return unshot[Math.floor(Math.random() * unshot.length)];
  };

  // AI Turn Execution
  const triggerAiTurn = useCallback((
    currentP1Ships: PlacedShip[],
    currentP2Shots: { [key: string]: 'hit' | 'miss' }
  ) => {
    setIsAiThinking(true);
    setLastActionLog('AI Admiral calculating radar telemetry & firing solution...');

    setTimeout(() => {
      let target: { r: number; c: number } | null = null;

      if (difficulty === 'cadet') {
        // Ensign: simple random targeting with basic neighbor follow-up
        if (aiHuntQueueRef.current.length > 0) {
          target = aiHuntQueueRef.current.shift()!;
          while (target && currentP2Shots[`${target.r},${target.c}`]) {
            target = aiHuntQueueRef.current.shift() || null;
          }
        }
        if (!target) {
          const unshot: { r: number; c: number }[] = [];
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              if (!currentP2Shots[`${r},${c}`]) {
                unshot.push({ r, c });
              }
            }
          }
          if (unshot.length > 0) {
            target = unshot[Math.floor(Math.random() * unshot.length)];
          }
        }
      } else if (difficulty === 'commander') {
        // Commander: Parity hunting & directional hunt
        if (aiHuntQueueRef.current.length > 0) {
          target = aiHuntQueueRef.current.shift()!;
          while (target && currentP2Shots[`${target.r},${target.c}`]) {
            target = aiHuntQueueRef.current.shift() || null;
          }
        }
        if (!target) {
          // Check checkerboard parity
          const parityUnshot: { r: number; c: number }[] = [];
          const allUnshot: { r: number; c: number }[] = [];
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              if (!currentP2Shots[`${r},${c}`]) {
                allUnshot.push({ r, c });
                if ((r + c) % 2 === 0) {
                  parityUnshot.push({ r, c });
                }
              }
            }
          }
          const pool = parityUnshot.length > 0 ? parityUnshot : allUnshot;
          target = pool[Math.floor(Math.random() * pool.length)];
        }
      } else {
        // Admiral: Full Probability Density Map
        target = calculateAiTargetProbability(currentP1Ships, currentP2Shots);
      }

      if (!target) {
        setIsAiThinking(false);
        return;
      }

      const { r, c } = target;
      const key = `${r},${c}`;

      // Check if hit P1 ship
      let isHit = false;
      let hitShip: PlacedShip | null = null;

      const updatedP1Ships = currentP1Ships.map(ship => {
        const hitPos = ship.positions.find(p => p.r === r && p.c === c);
        if (hitPos) {
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
          setLastActionLog(`CRITICAL DAMAGE! AI Admiral sunk your ${(hitShip as PlacedShip).name}!`);
          // Clear hunt queue since ship sunk
          aiHuntQueueRef.current = [];
        } else {
          setLastActionLog(`WARNING! Enemy artillery struck your fleet at sector ${ROW_LABELS[r]}${COL_LABELS[c]}!`);
          // Add adjacent 4 neighbors to hunt queue
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

        // Check if all P1 ships are sunk (Defeat)
        const allSunk = updatedP1Ships.every(s => s.sunk);
        if (allSunk) {
          handleGameOver('P2');
          return;
        }
      } else {
        playSound('miss');
        setLastActionLog(`Enemy salvo splashed harmlessly into ocean sector ${ROW_LABELS[r]}${COL_LABELS[c]}.`);
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
        setLastActionLog(`DIRECT HIT & DESTROYED! Enemy ${sunkShipName} has been sunk!`);
        confetti({
          particleCount: 30,
          spread: 45,
          origin: { y: 0.6 }
        });
      } else {
        setLastActionLog(`DIRECT HIT! Heavy damage inflicted on enemy vessel at ${ROW_LABELS[r]}${COL_LABELS[c]}!`);
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
      setLastActionLog(`Salvo splashed into open waters at sector ${ROW_LABELS[r]}${COL_LABELS[c]}.`);
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
      setLastActionLog(`Salvo complete. Pass terminal to Player ${nextTurn === 'P1' ? '1' : '2'}.`);
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
      setLastActionLog(`SONAR CONTACT DETECTED! Enemy vessel located in 3x3 sector near ${ROW_LABELS[centerR]}${COL_LABELS[centerC]}!`);
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
      setLastActionLog(`MISSION ACCOMPLISHED! Enemy fleet destroyed in ${totalShots} shots with ${accuracy}% accuracy!`);
    } else {
      playSound('defeat');
      setFinalScore(1200);
      onGameOver(1200);
      setLastActionLog(`TACTICAL DEFEAT. Your naval fleet has been destroyed by the enemy Admiral.`);
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
    setLastActionLog('New battle initialized. Deploy your fleet to battle stations.');
  };

  // Total Fleet Health Metrics
  const p1AliveCount = p1Ships.filter(s => !s.sunk).length;
  const p2AliveCount = p2Ships.filter(s => !s.sunk).length;

  const p1TotalHits = Object.values(p1Shots).filter(v => v === 'hit').length;
  const p1TotalShots = Object.keys(p1Shots).length;
  const p1Accuracy = p1TotalShots > 0 ? Math.round((p1TotalHits / p1TotalShots) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center select-none text-white animate-fadeIn pb-4">
      {/* Neo-Brutalist HUD Header Bar */}
      <div className="w-full bg-portal-card border-3 border-black rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-neo-md flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Mode & Difficulty Selector */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-black/40 border-2 border-black rounded-xl p-0.5 shadow-neo-sm">
            <button
              onClick={() => {
                if (phase === 'setup') {
                  playSound('click');
                  setMode('ai');
                }
              }}
              disabled={phase !== 'setup'}
              className={`px-2.5 py-1 rounded-lg font-black text-xs uppercase transition-all flex items-center gap-1.5 ${
                mode === 'ai'
                  ? 'bg-portal-cyan text-black shadow-neo-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" /> VS AI
            </button>
            <button
              onClick={() => {
                if (phase === 'setup') {
                  playSound('click');
                  setMode('pvp');
                }
              }}
              disabled={phase !== 'setup'}
              className={`px-2.5 py-1 rounded-lg font-black text-xs uppercase transition-all flex items-center gap-1.5 ${
                mode === 'pvp'
                  ? 'bg-portal-pink text-white shadow-neo-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> 2P PASS
            </button>
          </div>

          {/* AI Difficulty Selector */}
          {mode === 'ai' && (
            <div className="flex items-center gap-1 bg-black/40 border-2 border-black rounded-xl p-0.5 shadow-neo-sm">
              <button
                onClick={() => {
                  playSound('click');
                  setDifficulty('cadet');
                }}
                disabled={phase !== 'setup'}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  difficulty === 'cadet'
                    ? 'bg-portal-lime text-black shadow-neo-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ENSIGN
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setDifficulty('commander');
                }}
                disabled={phase !== 'setup'}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  difficulty === 'commander'
                    ? 'bg-portal-yellow text-black shadow-neo-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                COMMANDER
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setDifficulty('admiral');
                }}
                disabled={phase !== 'setup'}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                  difficulty === 'admiral'
                    ? 'bg-portal-pink text-white shadow-neo-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-2.5 h-2.5 text-portal-yellow" /> ADMIRAL
              </button>
            </div>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {phase === 'battle' && (
            <button
              onClick={handleActivateSonar}
              disabled={!(turn === 'P1' ? p1SonarAvailable : p2SonarAvailable) || isAiThinking}
              className={`px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black uppercase transition-all flex items-center gap-1.5 shadow-neo-sm ${
                isSonarActive
                  ? 'bg-portal-yellow text-black animate-pulse shadow-neo-md'
                  : (turn === 'P1' ? p1SonarAvailable : p2SonarAvailable)
                  ? 'bg-portal-cyan/20 hover:bg-portal-cyan text-portal-cyan hover:text-black border-portal-cyan'
                  : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'
              }`}
              title="Activate 3x3 Sonar Recon Radar Scan"
            >
              <Radar className="w-3.5 h-3.5" />
              SONAR RECON [{(turn === 'P1' ? p1SonarAvailable : p2SonarAvailable) ? 'READY' : 'DEPLETED'}]
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1.5 sm:p-2 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm hover:bg-portal-yellow hover:text-black transition-all"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={handleStartNewMatch}
            className="px-2.5 py-1.5 rounded-xl bg-portal-surface hover:bg-portal-pink hover:text-white border-2 border-black shadow-neo-sm text-xs font-black uppercase transition-all flex items-center gap-1"
            title="Reset Match"
          >
            <RotateCcw className="w-3.5 h-3.5" /> RESET
          </button>
        </div>
      </div>

      {/* Tactical Telemetry Ribbon */}
      <div className="w-full bg-black/80 border-2 border-black rounded-xl px-3 py-1.5 mb-3 flex items-center justify-between text-xs font-mono shadow-neo-sm">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-portal-cyan animate-ping shrink-0" />
          <span className="text-slate-300 truncate">
            <strong className="text-portal-yellow uppercase tracking-wider">INTEL: </strong>
            {lastActionLog}
          </span>
        </div>
        {phase === 'battle' && (
          <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] font-black uppercase text-slate-300">
            <span className="text-portal-cyan">ACCURACY: {p1Accuracy}%</span>
            <span className="text-portal-yellow">SALVOS: {p1TotalShots}</span>
            {streakCount >= 2 && (
              <span className="text-portal-pink animate-pulse">🔥 {streakCount}X STREAK</span>
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
              <Anchor className="w-5 h-5 text-portal-yellow" />
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                {mode === 'pvp' && pvpSetupPlayer === 'P2' ? 'PLAYER 2 FLEET DEPLOYMENT' : 'TACTICAL FLEET DEPLOYMENT'}
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Assign strategic oceanic coordinates to your 5 vessels. Click to place, press <strong className="text-portal-yellow">[R]</strong> to rotate orientation.
            </p>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left/Main Placement Grid (10x10) */}
            <div className="lg:col-span-8 flex flex-col items-center bg-portal-surface border-3 border-black rounded-2xl p-3 sm:p-5 shadow-neo-md">
              <div className="flex items-center justify-between w-full mb-3 px-1">
                <span className="text-xs font-black uppercase text-portal-cyan flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4" /> SECTOR GRID: {ROW_LABELS[0]}1 - {ROW_LABELS[9]}10
                </span>
                <span className="text-xs font-black uppercase text-portal-yellow">
                  ORIENTATION: <strong className="underline">{placementOrientation === 'H' ? 'HORIZONTAL (→)' : 'VERTICAL (↓)'}</strong>
                </span>
              </div>

              {/* 10x10 Grid View */}
              <div className="relative p-2 bg-slate-950 border-3 border-black rounded-xl shadow-neo-sm overflow-x-auto max-w-full">
                {/* Column Headers */}
                <div className="flex ml-6 sm:ml-7 mb-1 gap-1">
                  {COL_LABELS.map(col => (
                    <div key={col} className="w-7 h-5 sm:w-8 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-mono font-black text-slate-400">
                      {col}
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="flex flex-col gap-1">
                  {ROW_LABELS.map((rowLabel, r) => (
                    <div key={rowLabel} className="flex items-center gap-1">
                      {/* Row Label */}
                      <div className="w-5 sm:w-6 flex items-center justify-center text-[10px] sm:text-xs font-mono font-black text-slate-400">
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

                        return (
                          <button
                            key={c}
                            onClick={() => handleCellPlacementClick(r, c)}
                            onMouseEnter={() => setHoverCoord({ r, c })}
                            onMouseLeave={() => setHoverCoord(null)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 transition-all flex items-center justify-center font-mono font-black text-xs relative ${
                              isHoveredPreview
                                ? isValidHover
                                  ? 'bg-portal-lime/40 border-portal-lime shadow-neo-sm scale-95'
                                  : 'bg-portal-pink/40 border-portal-pink shadow-neo-sm'
                                : occupyingShip
                                ? 'bg-slate-800 border-black shadow-neo-sm'
                                : 'bg-slate-900/80 border-slate-800 hover:border-portal-cyan/60 hover:bg-slate-800/80'
                            }`}
                          >
                            {occupyingShip && (
                              <div
                                className="w-full h-full rounded-md flex items-center justify-center text-[10px] font-black border border-black shadow-inner"
                                style={{ backgroundColor: occupyingShip.color, color: '#000000' }}
                              >
                                {occupyingShip.name[0]}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Placement Tools Controls */}
              <div className="flex flex-wrap items-center justify-between w-full mt-4 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRotate}
                    className="px-3 py-2 rounded-xl bg-portal-yellow text-black border-2 border-black font-black text-xs uppercase shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> ROTATE [R]
                  </button>
                  <button
                    onClick={handleAutoDeploy}
                    className="px-3 py-2 rounded-xl bg-portal-cyan text-black border-2 border-black font-black text-xs uppercase shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> AUTO DEPLOY
                  </button>
                  <button
                    onClick={handleResetPlacement}
                    className="px-3 py-2 rounded-xl bg-portal-surface hover:bg-portal-pink hover:text-white border-2 border-black font-black text-xs uppercase shadow-neo-sm transition-all"
                  >
                    CLEAR
                  </button>
                </div>

                {/* Launch Button */}
                {((mode === 'ai' || pvpSetupPlayer === 'P1') ? p1Ships : p2Ships).length === 5 && (
                  <button
                    onClick={handleCommenceBattle}
                    className="px-5 py-2.5 rounded-xl bg-portal-lime text-black border-3 border-black font-black text-xs sm:text-sm uppercase shadow-neo-md hover:translate-x-1 hover:translate-y-1 active:shadow-none transition-all flex items-center gap-2 animate-bounce"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    {mode === 'pvp' && pvpSetupPlayer === 'P1' ? 'SAVE & PASS TO P2' : 'COMMENCE COMBAT'}
                  </button>
                )}
              </div>
            </div>

            {/* Right: Fleet Manifest Selector Drawer */}
            <div className="lg:col-span-4 flex flex-col bg-portal-surface border-3 border-black rounded-2xl p-4 shadow-neo-md divide-y-2 divide-black/40">
              <div className="pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-portal-yellow mb-1 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> NAVAL FLEET SQUADRON
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select each vessel to customize its placement sector:
                </p>
              </div>

              <div className="py-3 flex flex-col gap-2.5 flex-1">
                {FLEET_MANIFEST.map((ship, idx) => {
                  const currentPlacedShips = (mode === 'ai' || pvpSetupPlayer === 'P1') ? p1Ships : p2Ships;
                  const isPlaced = currentPlacedShips.some(s => s.id === ship.id);
                  const isSelected = selectedShipIndex === idx;

                  return (
                    <button
                      key={ship.id}
                      onClick={() => {
                        playSound('click');
                        setSelectedShipIndex(idx);
                      }}
                      className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between text-left ${
                        isSelected
                          ? 'bg-portal-card border-portal-cyan shadow-neo-sm translate-x-1'
                          : isPlaced
                          ? 'bg-slate-900/60 border-black/80 opacity-90'
                          : 'bg-portal-card/40 border-black hover:border-slate-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: ship.color }}
                          />
                          <span className="font-black text-xs text-white uppercase truncate">
                            {ship.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {ship.code}
                          </span>
                        </div>

                        {/* Ship segment cells preview */}
                        <div className="flex items-center gap-1">
                          {Array(ship.size)
                            .fill(null)
                            .map((_, i) => (
                              <div
                                key={i}
                                className="w-4 h-3 rounded-sm border border-black"
                                style={{ backgroundColor: isPlaced ? ship.color : '#334155' }}
                              />
                            ))}
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                            {ship.size} NODES
                          </span>
                        </div>
                      </div>

                      <div className="ml-2 shrink-0">
                        {isPlaced ? (
                          <span className="flex items-center gap-1 text-[10px] font-black text-portal-lime bg-black/40 px-2 py-0.5 rounded border border-portal-lime/40">
                            <CheckCircle2 className="w-3 h-3" /> READY
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-portal-yellow bg-black/40 px-2 py-0.5 rounded border border-portal-yellow/40">
                            PENDING
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tactical Quick Tip */}
              <div className="pt-3 text-[11px] text-slate-400 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-portal-cyan shrink-0 mt-0.5" />
                <span>
                  <strong>TACTICAL ADVICE:</strong> Avoid grouping all ships in a single sector corner to reduce enemy cluster artillery damage.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2: ACTIVE BATTLE RADAR COMBAT STAGE */}
      {/* ========================================================================= */}
      {phase === 'battle' && (
        <div className="w-full flex flex-col items-center">
          {/* Active Turn Banner */}
          <div className="w-full bg-portal-card border-3 border-black rounded-2xl p-2.5 sm:p-3 mb-3 sm:mb-4 shadow-neo-md flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 border-black animate-ping ${
                  turn === 'P1' ? 'bg-portal-cyan' : 'bg-portal-pink'
                }`}
              />
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-white">
                {turn === 'P1'
                  ? mode === 'ai'
                    ? '🎯 YOUR TURN — TARGET ENEMY RADAR'
                    : '🎯 PLAYER 1 TURN — TARGET RADAR'
                  : mode === 'ai'
                  ? '⚡ ENEMY ADMIRAL FIRING SALVO...'
                  : '🎯 PLAYER 2 TURN — TARGET RADAR'}
              </span>
            </div>

            {/* Mobile View Toggle Buttons */}
            <div className="flex md:hidden items-center bg-black/40 border-2 border-black rounded-xl p-0.5">
              <button
                onClick={() => setMobileTab('radar')}
                className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase ${
                  mobileTab === 'radar' ? 'bg-portal-yellow text-black' : 'text-slate-400'
                }`}
              >
                RADAR
              </button>
              <button
                onClick={() => setMobileTab('fleet')}
                className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase ${
                  mobileTab === 'fleet' ? 'bg-portal-cyan text-black' : 'text-slate-400'
                }`}
              >
                FLEET
              </button>
            </div>

            {/* Fleet Status Counts */}
            <div className="hidden sm:flex items-center gap-3 text-xs font-black uppercase">
              <span className="text-portal-cyan">
                FRIENDLY: {p1AliveCount}/5 SHIPS
              </span>
              <span className="text-portal-pink">
                HOSTILE: {p2AliveCount}/5 SHIPS
              </span>
            </div>
          </div>

          {/* Dual Radar Viewport (Side by Side on Desktop, Tabbed on Mobile) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. ENEMY TARGETING RADAR (Primary Attack View) */}
            <div
              className={`flex flex-col items-center bg-portal-surface border-3 border-black rounded-2xl p-3 sm:p-4 shadow-neo-md ${
                mobileTab === 'fleet' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2 px-1">
                <span className="text-xs font-black uppercase text-portal-pink flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-portal-pink" />
                  ENEMY TARGETING RADAR
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  {p2AliveCount} VESSELS ACTIVE
                </span>
              </div>

              {/* 10x10 Enemy Targeting Radar Grid */}
              <div className="relative p-2 bg-slate-950 border-3 border-black rounded-xl shadow-neo-sm overflow-x-auto max-w-full">
                {/* Column Headers */}
                <div className="flex ml-6 sm:ml-7 mb-1 gap-1">
                  {COL_LABELS.map(col => (
                    <div key={col} className="w-7 h-5 sm:w-8 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-mono font-black text-slate-400">
                      {col}
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="flex flex-col gap-1">
                  {ROW_LABELS.map((rowLabel, r) => (
                    <div key={rowLabel} className="flex items-center gap-1">
                      {/* Row Label */}
                      <div className="w-5 sm:w-6 flex items-center justify-center text-[10px] sm:text-xs font-mono font-black text-slate-400">
                        {rowLabel}
                      </div>

                      {/* 10 Target Cells */}
                      {COL_LABELS.map((_, c) => {
                        const shotKey = `${r},${c}`;
                        const shotStatus = (turn === 'P1' ? p1Shots : p2Shots)[shotKey];
                        const isSunkShipCell = (turn === 'P1' ? p2Ships : p1Ships)
                          .filter(s => s.sunk)
                          .some(s => s.positions.some(p => p.r === r && p.c === c));

                        // Sonar highlight
                        const isSonarSector =
                          scannedSector &&
                          Math.abs(scannedSector.r - r) <= 1 &&
                          Math.abs(scannedSector.c - c) <= 1;

                        return (
                          <button
                            key={c}
                            onClick={() => handleFireSalvo(r, c)}
                            disabled={Boolean(shotStatus) || isAiThinking}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 transition-all flex items-center justify-center font-mono font-black text-xs relative ${
                              isSunkShipCell
                                ? 'bg-portal-pink text-white border-black shadow-neo-sm'
                                : shotStatus === 'hit'
                                ? 'bg-portal-yellow text-black border-black shadow-neo-sm animate-pulse'
                                : shotStatus === 'miss'
                                ? 'bg-slate-800/90 text-slate-400 border-slate-700'
                                : isSonarSector
                                ? scannedSector.found
                                  ? 'bg-portal-cyan/30 border-portal-cyan'
                                  : 'bg-slate-900 border-slate-800 opacity-60'
                                : 'bg-slate-900/90 border-slate-800 hover:border-portal-pink hover:bg-portal-pink/20 active:scale-95'
                            }`}
                          >
                            {isSunkShipCell ? (
                              <Flame className="w-3.5 h-3.5 text-black" />
                            ) : shotStatus === 'hit' ? (
                              <span className="text-xs font-black">✕</span>
                            ) : shotStatus === 'miss' ? (
                              <span className="w-2 h-2 rounded-full bg-slate-500" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Enemy Fleet Manifest Status Drawer */}
              <div className="w-full mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                {(turn === 'P1' ? p2Ships : p1Ships).map(ship => (
                  <div
                    key={ship.id}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase flex items-center gap-1.5 ${
                      ship.sunk
                        ? 'bg-portal-pink/20 border-portal-pink text-portal-pink line-through opacity-70'
                        : 'bg-black/50 border-black text-slate-300'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: ship.sunk ? '#FF4081' : ship.color }}
                    />
                    {ship.name.split(' ')[1] || ship.name} [{ship.hits}/{ship.size}]
                  </div>
                ))}
              </div>
            </div>

            {/* 2. FRIENDLY OCEAN FLEET (Defense & Damage View) */}
            <div
              className={`flex flex-col items-center bg-portal-surface border-3 border-black rounded-2xl p-3 sm:p-4 shadow-neo-md ${
                mobileTab === 'radar' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2 px-1">
                <span className="text-xs font-black uppercase text-portal-cyan flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-portal-cyan" />
                  FRIENDLY OCEAN FLEET
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  {p1AliveCount} VESSELS OPERATIONAL
                </span>
              </div>

              {/* 10x10 Friendly Ocean Grid */}
              <div className="relative p-2 bg-slate-950 border-3 border-black rounded-xl shadow-neo-sm overflow-x-auto max-w-full">
                {/* Column Headers */}
                <div className="flex ml-6 sm:ml-7 mb-1 gap-1">
                  {COL_LABELS.map(col => (
                    <div key={col} className="w-7 h-5 sm:w-8 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-mono font-black text-slate-400">
                      {col}
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="flex flex-col gap-1">
                  {ROW_LABELS.map((rowLabel, r) => (
                    <div key={rowLabel} className="flex items-center gap-1">
                      {/* Row Label */}
                      <div className="w-5 sm:w-6 flex items-center justify-center text-[10px] sm:text-xs font-mono font-black text-slate-400">
                        {rowLabel}
                      </div>

                      {/* 10 Ocean Cells */}
                      {COL_LABELS.map((_, c) => {
                        const currentShips = turn === 'P1' ? p1Ships : p2Ships;
                        const enemyShots = turn === 'P1' ? p2Shots : p1Shots;
                        const shotKey = `${r},${c}`;
                        const shotStatus = enemyShots[shotKey];

                        const occupyingShip = currentShips.find(s =>
                          s.positions.some(p => p.r === r && p.c === c)
                        );

                        return (
                          <div
                            key={c}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 flex items-center justify-center font-mono font-black text-xs relative ${
                              occupyingShip
                                ? shotStatus === 'hit'
                                  ? 'bg-portal-pink text-white border-black shadow-neo-sm animate-pulse'
                                  : 'bg-slate-800 border-black shadow-neo-sm'
                                : shotStatus === 'miss'
                                ? 'bg-slate-800/90 text-slate-400 border-slate-700'
                                : 'bg-slate-900/80 border-slate-800'
                            }`}
                          >
                            {occupyingShip && (
                              <div
                                className="w-full h-full rounded-md flex items-center justify-center text-[10px] font-black border border-black"
                                style={{
                                  backgroundColor: shotStatus === 'hit' ? '#FF4081' : occupyingShip.color,
                                  color: '#000000'
                                }}
                              >
                                {shotStatus === 'hit' ? '🔥' : occupyingShip.name[0]}
                              </div>
                            )}
                            {!occupyingShip && shotStatus === 'miss' && (
                              <span className="w-2 h-2 rounded-full bg-slate-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Friendly Fleet Manifest Status Drawer */}
              <div className="w-full mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                {(turn === 'P1' ? p1Ships : p2Ships).map(ship => (
                  <div
                    key={ship.id}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase flex items-center gap-1.5 ${
                      ship.sunk
                        ? 'bg-portal-pink/20 border-portal-pink text-portal-pink line-through opacity-70'
                        : 'bg-black/50 border-black text-slate-300'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: ship.sunk ? '#FF4081' : ship.color }}
                    />
                    {ship.name.split(' ')[1] || ship.name} [{ship.hits}/{ship.size}]
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: GAME OVER / VICTORY SUMMARY DIALOG */}
      {/* ========================================================================= */}
      {phase === 'gameover' && (
        <div className="w-full max-w-xl bg-portal-card border-4 border-black rounded-3xl p-5 sm:p-7 shadow-neo-lg text-center animate-scaleIn">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-2xl bg-portal-surface border-3 border-black flex items-center justify-center shadow-neo-md">
            {winner === 'P1' ? (
              <Trophy className="w-8 h-8 text-portal-yellow animate-bounce" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-portal-pink" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-1">
            {winner === 'P1'
              ? mode === 'ai'
                ? '🏆 NAVAL VICTORY!'
                : '🏆 PLAYER 1 VICTORIOUS!'
              : mode === 'ai'
              ? '💀 FLEET DESTROYED'
              : '🏆 PLAYER 2 VICTORIOUS!'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mb-5">
            {winner === 'P1'
              ? 'All hostile naval warships have been neutralized and sunk to the ocean floor.'
              : 'Your naval fleet suffered catastrophic structural damage and succumbed to enemy fire.'}
          </p>

          {/* Combat Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            <div className="p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase block">SCORE</span>
              <span className="text-base sm:text-lg font-black text-portal-yellow font-mono">{finalScore}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase block">ACCURACY</span>
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
          </div>

          <button
            onClick={handleStartNewMatch}
            className="w-full py-3.5 rounded-2xl bg-portal-yellow text-black border-3 border-black font-black text-sm uppercase shadow-neo-md hover:translate-x-1 hover:translate-y-1 active:translate-x-2 active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 stroke-[3]" /> REMATCH / DEPLOY NEW FLEET
          </button>
        </div>
      )}
    </div>
  );
}
