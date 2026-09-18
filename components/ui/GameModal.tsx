'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Trophy,
  Check,
  Edit3,
  Maximize2,
  Minimize2,
  Dices,
  Zap,
  Crown,
  RefreshCw,
  Terminal,
  MousePointer,
  Crosshair,
  Sliders,
  Flame,
  Info
} from 'lucide-react';
import NeonSnakeGame from '@/components/games/NeonSnakeGame';
import MemoryMatrixGame from '@/components/games/MemoryMatrixGame';
import QuantumXOGame from '@/components/games/QuantumXOGame';
import HyperTapperGame from '@/components/games/HyperTapperGame';
import CyberDashGame from '@/components/games/CyberDashGame';
import NeonStarfighterGame from '@/components/games/NeonStarfighterGame';
import CyberBreakerGame from '@/components/games/CyberBreakerGame';
import Cyber2048Game from '@/components/games/Cyber2048Game';
import ChromaReflexGame from '@/components/games/ChromaReflexGame';
import GeometryDashGame from '@/components/games/GeometryDashGame';
import CyberSlicerGame from '@/components/games/CyberSlicerGame';
import NeonPaperIoGame from '@/components/games/NeonPaperIoGame';
import CyberMazeGame from '@/components/games/CyberMazeGame';
import CyberMinesweeperGame from '@/components/games/CyberMinesweeperGame';
import BlackHoleGame from '@/components/games/BlackHoleGame';
import BattleshipGame from '@/components/games/BattleshipGame';
import CandyCrushGame from '@/components/games/CandyCrushGame';
import WordNexusGame from '@/components/games/WordNexusGame';
import { Game } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatar';
import StarRating from '@/components/ui/StarRating';
import { gamification } from '@/lib/gamification';
import { audio } from '@/lib/audio';

// PC Keyboard & Controller Key Mapping Schema
interface ControlBinding {
  keys: string[];
  label: string;
  desc: string;
}

interface GameTacticalConfig {
  controls: ControlBinding[];
  objective: string;
  proTip: string;
  scoring: string;
  genreTag: string;
}

// Comprehensive PC Controls and Tactical Mission Intel Matrix
const GAME_TACTICAL_MAP: Record<string, GameTacticalConfig> = {
  // -2. Word Nexus 2077
  g_word_20: {
    genreTag: 'PUZZLE // SEMANTIC WORD NEXUS',
    objective: 'Bridge origin and target concepts through synaptic word association chains. Play Solo Rush, race against Cortex-AI, or duel in 2-Player Pass & Play.',
    scoring: 'Base completion points + remaining seconds x 25 + low-step synaptic path bonus + flawless streak multiplier.',
    proTip: 'Think in categories, compound words, and everyday associations. E.g. FIRE -> TRUCK -> WATER connects Fire to Water in 2 steps!',
    controls: [
      { keys: ['Keyboard', 'Type'], label: 'TYPE WORD', desc: 'Enter semantic bridging word' },
      { keys: ['Enter'], label: 'SUBMIT LINK', desc: 'Validate and append node to chain' },
      { keys: ['H'], label: 'HINT BEACON', desc: 'Reveal next associative synapse step' },
      { keys: ['Backspace'], label: 'UNDO STEP', desc: 'Revert last placed chain node' },
      { keys: ['R'], label: 'RESET / RESTART', desc: 'Restart round or pick new pair' }
    ]
  },
  // -1. Neon Candy Blast
  g_candy_19: {
    genreTag: 'PUZZLE // MATCH-3 ARCADE',
    objective: 'Match 3+ candies to clear goals, craft Striped Lasers & Disco Color Bombs, trigger dual-special fusion combos, and conquer 15 Quest levels, 25-move Blitz, or 60s Timed Rush.',
    scoring: 'Standard match (60pts), Match-4 Striped (120pts), Match-5 Color Bomb (250pts), cascades multiplier (x1 to x5), plus Sugar Crush end-game special conversions.',
    proTip: 'Swap two specials together for explosive fusion combos! Swap Color Bomb + Striped Candy to convert all matching candies on the board into detonating laser beams.',
    controls: [
      { keys: ['Left Click', 'Drag', 'Touch'], label: 'SWAP CANDIES', desc: 'Select or drag candy to adjacent cell' },
      { keys: ['1'], label: 'HAMMER BOOSTER', desc: 'Smash single candy / jelly' },
      { keys: ['2'], label: 'COLOR BOMB BOOSTER', desc: 'Spawn Rainbow Disco Bomb' },
      { keys: ['3'], label: 'WRAPPED BOMB BOOSTER', desc: 'Spawn 3x3 explosive candy' },
      { keys: ['R'], label: 'RETRY / RESTART', desc: 'Restart current level or run' }
    ]
  },
  // 0. Naval Grid Strike
  g_battleship_18: {
    genreTag: 'STRATEGY // NAVAL GRID COMBAT',
    objective: 'Deploy 5 heavy warships on 10x10 ocean coordinates. Locate and sink the enemy fleet with precision artillery and recon sonar scans.',
    scoring: 'Calculated from hit accuracy %, salvo efficiency (<100 shots), fleet survival, and AI difficulty multipliers (up to 2.4x on Admiral).',
    proTip: 'Rotate ship orientation with [R]. Use 3x3 Sonar Recon scans on high-density probability zones to confirm enemy presence without wasting shots.',
    controls: [
      { keys: ['Left Click', 'Touch'], label: 'FIRE SALVO / PLACE', desc: 'Target radar cell or place fleet ship' },
      { keys: ['R'], label: 'ROTATE VESSEL', desc: 'Toggle Horizontal ↔ Vertical placement' },
      { keys: ['S'], label: 'SONAR RECON', desc: 'Activate 3x3 radar recon ping' },
      { keys: ['M'], label: 'MODE SWITCH', desc: 'Toggle AI vs 2P Pass & Play' }
    ]
  },
  // 1. Singularity Horizon
  g_blackhole_17: {
    genreTag: 'STRATEGY // SINGULARITY DUEL',
    objective: 'Sequence numbers 1 to 10 onto 21 triangular nodes. The 21st remaining node collapses into the Singularity Black Hole.',
    scoring: 'Lowest sucked total wins (0 is optimal). Base 10,000pts minus margin penalties + clean zero bonus.',
    proTip: 'Place heavy numbers (8, 9, 10) in low-degree corners or clustered safe zones so they are never sucked into the vortex.',
    controls: [
      { keys: ['Left Click', 'Touch'], label: 'PLACE NODE', desc: 'Deploy current number into node' },
      { keys: ['M'], label: 'MODE SWITCH', desc: 'Toggle AI vs 2P Local Duel' },
      { keys: ['R'], label: 'NEW MATCH', desc: 'Reset board & start fresh leg' }
    ]
  },
  // 2. Quantum Minefield
  g_sweeper_16: {
    genreTag: 'PUZZLE // QUANTUM SWEEPER',
    objective: 'Disarm randomized quantum minefields. First click is 100% guaranteed safe.',
    scoring: 'Base sector clearance + speed bonus (remaining seconds x 12). Multipliers up to 2.4x on Overlord.',
    proTip: 'Use chord clearing (click an open number when adjacent flags match) to clear entire clusters in milliseconds.',
    controls: [
      { keys: ['Left Click'], label: 'DIG / REVEAL', desc: 'Uncover sector node' },
      { keys: ['Right Click'], label: 'FLAG / UNFLAG', desc: 'Mark suspected quantum mine' },
      { keys: ['Space', 'Chord'], label: 'CHORD CLEAR', desc: 'Clear unflagged neighbors' },
      { keys: ['1', '2', '3', '4'], label: 'SECTOR', desc: 'Switch Novice / Hacker / Overlord / Blitz' },
      { keys: ['R'], label: 'RESET SEED', desc: 'Generate fresh minefield' }
    ]
  },
  // 3. Cyber Labyrinth Escape
  g_maze_15: {
    genreTag: 'PUZZLE // LABYRINTH INFILTRATION',
    objective: 'Navigate high-density 10-level labyrinths before the 60-second timer hits zero.',
    scoring: '500 base clearance + (time left x 50) + collected data cores + flawless sprint bonuses.',
    proTip: 'Grab yellow & cyan keycards to open laser gates. Overclock boost nodes allow instant warp sprinting.',
    controls: [
      { keys: ['W', 'A', 'S', 'D'], label: 'MOVE / STEER', desc: 'Navigate cyber runner' },
      { keys: ['↑', '←', '↓', '→'], label: 'ARROWS', desc: 'Alternative movement bindings' },
      { keys: ['Space'], label: 'OVERCLOCK', desc: 'Trigger high-speed boost' },
      { keys: ['R'], label: 'RETRY RUN', desc: 'Restart current infiltration level' }
    ]
  },
  // 4. Cyber Katana Slicer
  g_slicer_11: {
    genreTag: 'ACTION // KATANA SLICER',
    objective: 'Slice flying cyber targets out of mid-air with high-FPS mouse sweeps. Avoid red plasma bombs.',
    scoring: 'Multi-slice combos (3+ targets in 1 stroke) trigger 2x-5x scoring multipliers and frenzy time.',
    proTip: 'Wait for targets to cluster at their peak trajectory before slashing in a single clean diagonal swipe.',
    controls: [
      { keys: ['Left Click', 'Mouse Drag'], label: 'KATANA SLASH', desc: 'Sweep blade across targets' },
      { keys: ['R'], label: 'RESTART', desc: 'Begin fresh slicing trial' }
    ]
  },
  // 6. Neon Starfighter
  g_shooter_07: {
    genreTag: 'ARCADE // VERTICAL SHMUP',
    objective: 'Pilot the tactical starfighter against invading drone swarms, laser gunships, and black hole bosses.',
    scoring: 'Wave clearance + boss takedowns + weapon upgrade pickups + zero-damage bonus multipliers.',
    proTip: 'Collect Spread Laser and Shield pickups early. Save your Screen-Clearing EMP wave for dense boss projectile waves.',
    controls: [
      { keys: ['A', 'D', '←', '→'], label: 'BANK / MOVE', desc: 'Lateral flight maneuvering' },
      { keys: ['Space', 'Left Click'], label: 'PLASMA CANNON', desc: 'Fire primary laser cannons' },
      { keys: ['Shift'], label: 'EMP WAVE', desc: 'Detonate screen-clearing pulse' },
      { keys: ['R'], label: 'RESPAWN', desc: 'Launch new starfighter' }
    ]
  },
  // 7. Quantum XO
  g_ttt_03: {
    genreTag: 'STRATEGY // MINIMAX SHOWDOWN',
    objective: 'Align 3 quantum nodes in a row, column, or diagonal against the adaptive Overthinker AI.',
    scoring: 'Win = 1,000pts (flawless moves earn up to 2,500pts). Draw = 250pts.',
    proTip: 'Take center node or corners on Turn 1 to establish dual-fork threats that cannot be simultaneously blocked.',
    controls: [
      { keys: ['Left Click', '1-9'], label: 'SELECT NODE', desc: 'Claim grid position' },
      { keys: ['R'], label: 'REMATCH', desc: 'Reset board for next round' }
    ]
  },
  // 8. Quantum 2048
  g_card_05: {
    genreTag: 'PUZZLE // SLIDING GRID MERGER',
    objective: 'Slide and combine matching energy nodes (2, 4, 8, 16...) to forge the legendary 2048 core.',
    scoring: 'Sum of all merged node values + high-tier creation multipliers.',
    proTip: 'Keep your highest value block pinned to one specific corner (e.g. bottom-right) and build an ascending snake toward it.',
    controls: [
      { keys: ['W', 'A', 'S', 'D'], label: 'SLIDE GRID', desc: 'Shift all nodes in direction' },
      { keys: ['↑', '←', '↓', '→'], label: 'ARROWS', desc: 'Alternative directional controls' },
      { keys: ['R'], label: 'RESET', desc: 'Clear grid & start new matrix' }
    ]
  },
  // 9. Memory Matrix
  g_flip_02: {
    genreTag: 'PUZZLE // NEURAL PATTERN MATCH',
    objective: 'Uncover paired neural cards with minimal flips and rapid memorization sequences.',
    scoring: 'Pair matches + consecutive streak multipliers (up to 5x) + remaining countdown bonus.',
    proTip: 'Commit card positions to spatial memory. Chaining rapid consecutive matches prevents the streak timer from resetting.',
    controls: [
      { keys: ['Left Click'], label: 'FLIP CARD', desc: 'Reveal hidden neural node' },
      { keys: ['R'], label: 'RESHUFFLE', desc: 'Start fresh memory trial' }
    ]
  },
  // 10. Hyper Tapper
  g_tap_04: {
    genreTag: 'ACTION // APM REFLEX SPEED',
    objective: 'Test ultra-high Actions Per Minute (APM) in a 10-second high-frequency reflex challenge.',
    scoring: 'Total valid taps executed + cadence rhythm score + peak APM bonus.',
    proTip: 'Alternate index and middle fingers on [Space] + Left Mouse Click simultaneously to double your click rate.',
    controls: [
      { keys: ['Space', 'Enter'], label: 'TAP KEY', desc: 'Physical keyboard high-frequency trigger' },
      { keys: ['Left Click'], label: 'CLICK', desc: 'Mouse button tap trigger' },
      { keys: ['R'], label: 'RETRY', desc: 'Reset 10-second countdown' }
    ]
  },
  // 11. Neon Snake 2077
  g_snake_01: {
    genreTag: 'ARCADE // CANVAS COMBO SNAKE',
    objective: 'Consume neon energy cores to grow your cyber trail without colliding with perimeter walls or your tail.',
    scoring: 'Energy pickups x speed multiplier x active combo streak.',
    proTip: 'Pick up neon cores before the combo ring depletes to maintain 10x score velocity.',
    controls: [
      { keys: ['W', 'A', 'S', 'D'], label: 'HEADING', desc: 'Change snake movement direction' },
      { keys: ['↑', '←', '↓', '→'], label: 'ARROWS', desc: 'Alternative directional bindings' },
      { keys: ['Space'], label: 'PAUSE', desc: 'Pause / resume game loop' },
      { keys: ['R'], label: 'RESPAWN', desc: 'Start new snake run' }
    ]
  },
  // 12. Multidimension XO
  g_multi_xo_13: {
    genreTag: 'STRATEGY // NESTED MACRO GRID',
    objective: 'Nested 9x9 Tic-Tac-Toe. The square you pick dictates which sub-grid your opponent is sent to.',
    scoring: 'Sub-grid wins + macro-grid alignment + tactical denial bonus.',
    proTip: 'Anticipate your opponent’s placement: never send them to a sub-grid where they have a free winning move.',
    controls: [
      { keys: ['Left Click'], label: 'PLACE SYMBOL', desc: 'Mark node in active sub-grid' },
      { keys: ['R'], label: 'RESTART', desc: 'Begin fresh macro tournament' }
    ]
  },
  // 13. Cyber Dash 2077
  g_action_06: {
    genreTag: 'ACTION // ENDLESS RUNNER',
    objective: 'Sprint through procedural neon corridors, double-jumping over laser fences and sliding under gates.',
    scoring: 'Distance traveled + energy coins collected + close-call obstacle dodges.',
    proTip: 'Double jump at the apex of your first jump for maximum aerial clearance over double obstacles.',
    controls: [
      { keys: ['Space', 'W', '↑'], label: 'JUMP / DOUBLE', desc: 'Leap over ground obstacles' },
      { keys: ['S', '↓'], label: 'SLIDE / DIVE', desc: 'Duck under high plasma barriers' },
      { keys: ['R'], label: 'RESTART', desc: 'Start fresh dash run' }
    ]
  },
  // 14. Neon Pulse Dash
  g_geometry_10: {
    genreTag: 'ACTION // RHYTHM RUNNER',
    objective: 'Precision rhythm platformer synced to electronic synthesizers. Jump spikes and launch off pads.',
    scoring: 'Stage completion percentage + collected secret coins + zero-death streaks.',
    proTip: 'Listen to the audio beat — obstacle spacing directly aligns with the rhythm track.',
    controls: [
      { keys: ['Space', '↑', 'Left Click'], label: 'PULSE JUMP', desc: 'Bounce cube & trigger gravity rings' },
      { keys: ['R'], label: 'RETRY', desc: 'Instant respawn at checkpoint' }
    ]
  },
  // 15. Cyber Brick Breaker
  g_breaker_08: {
    genreTag: 'ARCADE // BRICK BREAKER',
    objective: 'Demolish neon brick formations using paddle rebounds, multiball splits, and laser cannons.',
    scoring: 'Brick point value x active combo multiplier + stage clear speed bonus.',
    proTip: 'Hit the energy ball near the paddle tips to impart acute diagonal angles for penetrating deep behind brick layers.',
    controls: [
      { keys: ['A', 'D', '←', '→'], label: 'PADDLE STEER', desc: 'Move paddle horizontally' },
      { keys: ['Space', 'Left Click'], label: 'LAUNCH / FIRE', desc: 'Release ball or fire laser blasters' },
      { keys: ['R'], label: 'RESTART', desc: 'Reset stage' }
    ]
  },
  // 16. Chroma Reflex
  g_reflex_09: {
    genreTag: 'STRATEGY // CHROMATIC MEMORY',
    objective: 'Simon-inspired 4-quadrant chromatic memory test with procedural audio tone synthesis.',
    scoring: 'Rounds completed x input speed factor + flawless audio recognition bonus.',
    proTip: 'Map keys [1][2][3][4] or [Q][W][E][R] to the 4 colors to enter long sequences in rapid bursts.',
    controls: [
      { keys: ['1', '2', '3', '4'], label: 'QUADRANTS', desc: 'Trigger Cyan, Pink, Yellow, Lime' },
      { keys: ['Q', 'W', 'E', 'R'], label: 'ALT KEYS', desc: 'Alternative quadrant triggers' },
      { keys: ['Space'], label: 'START ROUND', desc: 'Begin sequence playback' },
      { keys: ['R'], label: 'RESET', desc: 'Start new trial' }
    ]
  },
  // 17. Neon Paper Grid
  g_paper_12: {
    genreTag: 'STRATEGY // TERRITORY CONQUEST',
    objective: 'Expand your neon territory by drawing loops back to base. Slice opponent trails to eliminate them.',
    scoring: 'Percentage of grid territory captured + rival eliminations.',
    proTip: 'Keep your excursions short and close to home territory so enemies cannot cut your vulnerable trail.',
    controls: [
      { keys: ['W', 'A', 'S', 'D'], label: 'STEER TRAIL', desc: 'Direct territory expansion line' },
      { keys: ['↑', '←', '↓', '→'], label: 'ARROWS', desc: 'Alternative steering controls' },
      { keys: ['R'], label: 'RESPAWN', desc: 'Spawn new territory core' }
    ]
  }
};

// Fallback tactical config for any unmapped game
const DEFAULT_TACTICAL_CONFIG: GameTacticalConfig = {
  genreTag: 'ARCADE // NEO-BRUTALISM',
  objective: 'Survive and score maximum points using high-precision reflexes and tactical decision-making.',
  scoring: 'Points are awarded for accuracy, speed, combo streaks, and completing level objectives.',
  proTip: 'Use physical keyboard bindings for zero-latency response times on desktop.',
  controls: [
    { keys: ['W', 'A', 'S', 'D', 'Arrows'], label: 'CONTROLS', desc: 'Primary movement / direction' },
    { keys: ['Space', 'Click'], label: 'ACTION', desc: 'Execute primary game action' },
    { keys: ['R'], label: 'RETRY', desc: 'Quick restart' }
  ]
};

interface LeaderboardEntry {
  rank?: number;
  username: string;
  score: number;
  date?: string;
}

interface GameModalProps {
  game: Game;
  username: string;
  userRating?: number | null;
  onRateGame?: (gameId: string, rating: number) => Promise<void> | void;
  onChangeUsername: () => void;
  onClose: () => void;
  onOpenLeaderboard: (gameId: string) => void;
  onNextGameRoulette?: () => void;
}

export default function GameModal({
  game,
  username,
  userRating = null,
  onRateGame,
  onChangeUsername,
  onClose,
  onOpenLeaderboard,
  onNextGameRoulette
}: GameModalProps) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showCompanionDeck, setShowCompanionDeck] = useState<boolean>(true);
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [loadingScores, setLoadingScores] = useState<boolean>(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch live top scores for the current game
  const fetchTopScores = useCallback(async () => {
    try {
      setLoadingScores(true);
      const res = await fetch(`/api/leaderboard?gameId=${encodeURIComponent(game.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.leaderboard)) {
          setTopScores(data.leaderboard.slice(0, 5));
        } else if (Array.isArray(data)) {
          setTopScores(data.slice(0, 5));
        }
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoadingScores(false);
    }
  }, [game.id]);

  useEffect(() => {
    fetchTopScores();
  }, [fetchTopScores]);

  // Sync fullscreen state with native browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Physical Keyboard Listener: Tracks live active keypresses for real-time HUD illumination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.add(key);
        next.add(e.code.toLowerCase());
        return next;
      });

      // Global hotkeys
      if (!e.repeat) {
        if (e.key === 'f' || e.key === 'F') {
          toggleFullscreen();
        } else if (e.key === 'c' || e.key === 'C') {
          setShowCompanionDeck(prev => !prev);
        } else if (e.key === 'Escape' && !isFullscreen) {
          onClose();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        next.delete(e.code.toLowerCase());
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isFullscreen, onClose]);

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        const target = modalRef.current || document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if ((target as any).webkitRequestFullscreen) {
          await (target as any).webkitRequestFullscreen();
        } else if ((target as any).mozRequestFullScreen) {
          await (target as any).mozRequestFullScreen();
        } else if ((target as any).msRequestFullscreen) {
          await (target as any).msRequestFullscreen();
        } else {
          setIsFullscreen(prev => !prev);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch {
      setIsFullscreen(prev => !prev);
    }
  };

  const handleScoreSubmit = async (score: number) => {
    if (score <= 0) return;
    setStatusMsg('Syncing score...');

    // Gamification Integration: Award XP, update streak, track daily quest, and check trophy achievements
    try {
      const result = gamification.recordScoreSubmitted(game.id, score, game.category);
      if (result.didLevelUp) {
        audio.playLevelUpSound();
      } else {
        audio.playXpGainSound();
      }
    } catch {}

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          username: username.trim() || 'Player',
          score,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`✓ Score (${score} pts) saved to leaderboard!`);
        fetchTopScores();
      } else {
        setStatusMsg(data.error || 'Failed to sync score');
      }
    } catch {
      setStatusMsg('Network sync error');
    } finally {
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const avatarUrl = getAvatarUrl(username);
  const tacticalConfig = GAME_TACTICAL_MAP[game.id] || DEFAULT_TACTICAL_CONFIG;
  const levelInfo = gamification.getLevelInfo();

  // Helper to test if a key in the tactical config is currently being pressed physically
  const isKeyActive = (keyStr: string): boolean => {
    const k = keyStr.toLowerCase();
    if (k === 'w' && (pressedKeys.has('w') || pressedKeys.has('keyw'))) return true;
    if (k === 'a' && (pressedKeys.has('a') || pressedKeys.has('keya'))) return true;
    if (k === 's' && (pressedKeys.has('s') || pressedKeys.has('keys'))) return true;
    if (k === 'd' && (pressedKeys.has('d') || pressedKeys.has('keyd'))) return true;
    if (k === 'r' && (pressedKeys.has('r') || pressedKeys.has('keyr'))) return true;
    if (k === 'f' && (pressedKeys.has('f') || pressedKeys.has('keyf'))) return true;
    if (k === 'm' && (pressedKeys.has('m') || pressedKeys.has('keym'))) return true;
    if (k === 'c' && (pressedKeys.has('c') || pressedKeys.has('keyc'))) return true;
    if (k === 'space' && (pressedKeys.has(' ') || pressedKeys.has('space'))) return true;
    if (k === 'enter' && (pressedKeys.has('enter') || pressedKeys.has('numpadenter'))) return true;
    if (k === 'shift' && (pressedKeys.has('shift') || pressedKeys.has('shiftleft') || pressedKeys.has('shiftright'))) return true;
    if (k === '↑' && (pressedKeys.has('arrowup') || pressedKeys.has('up'))) return true;
    if (k === '↓' && (pressedKeys.has('arrowdown') || pressedKeys.has('down'))) return true;
    if (k === '←' && (pressedKeys.has('arrowleft') || pressedKeys.has('left'))) return true;
    if (k === '→' && (pressedKeys.has('arrowright') || pressedKeys.has('right'))) return true;
    if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(k) && (pressedKeys.has(k) || pressedKeys.has(`digit${k}`))) return true;
    return false;
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'p-0 bg-black' : 'p-1 min-[360px]:p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn'}`}>
      <div
        ref={modalRef}
        className={`relative bg-portal-surface overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-none'
            : 'w-full max-w-[480px] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl border-3 sm:border-4 border-black rounded-2xl sm:rounded-3xl max-h-[98dvh] sm:max-h-[96dvh] shadow-neo-lg'
        }`}
      >
        {/* Top Decorative Neo-Brutalist Hazard Accent Line (Hidden when in Fullscreen) */}
        {!isFullscreen && (
          <div className="h-2.5 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-b-2 border-black shrink-0" />
        )}

        {/* Fullscreen Minimalist Floating Action Deck */}
        {isFullscreen ? (
          <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5 bg-black/75 hover:bg-black/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/20 shadow-2xl transition-all opacity-40 hover:opacity-100">
            <button
              onClick={() => onOpenLeaderboard(game.id)}
              className="px-2 py-1 rounded-lg bg-portal-yellow text-black text-[10px] font-black uppercase flex items-center gap-1 hover:brightness-110 shadow-sm"
              title="View Ranks"
            >
              <Trophy className="w-3 h-3 stroke-[2.5]" />
              <span className="hidden sm:inline">Ranks</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15"
              title="Exit Fullscreen [Hotkey: F]"
            >
              <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-black"
              title="Close [Hotkey: Esc]"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <>
            {/* Modal Top Bar - Widescreen Neo-Brutalist Pro Header */}
            <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 border-b-3 border-black bg-portal-surface shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={game.thumbnail_url}
                  alt={game.title}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border-2 border-black shadow-neo-sm shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-xs sm:text-sm md:text-base text-white leading-tight truncate uppercase tracking-wide">
                      {game.title}
                    </h3>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-portal-card border border-black text-[9px] font-black text-portal-yellow uppercase shadow-neo-sm">
                      PC ENABLED
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-portal-yellow font-black uppercase tracking-wider truncate">
                    {tacticalConfig.genreTag}
                  </p>
                </div>
              </div>

              {/* Action Tools & Hotkey Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Companion Deck Toggle (Desktop Only) */}
                <button
                  onClick={() => setShowCompanionDeck(prev => !prev)}
                  className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${
                    showCompanionDeck
                      ? 'bg-portal-card text-portal-cyan'
                      : 'bg-portal-surface text-slate-400 hover:text-white'
                  }`}
                  title="Toggle PC Companion Command Deck [Hotkey: C]"
                >
                  <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden lg:inline">{showCompanionDeck ? 'Hide HUD' : 'Show HUD'}</span>
                </button>

                {onNextGameRoulette && (
                  <button
                    onClick={onNextGameRoulette}
                    className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-portal-cyan text-black text-[11px] font-black uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                    title="Next Random Game Roulette [Hotkey: N]"
                  >
                    <Dices className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Next</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenLeaderboard(game.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-portal-yellow text-black text-[11px] font-black uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  title="View Complete High Score Ranks"
                >
                  <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Ranks</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1 sm:p-1.5 rounded-xl bg-portal-card text-slate-200 hover:text-white border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  title={isFullscreen ? 'Exit Fullscreen [Hotkey: F]' : 'Enter Fullscreen [Hotkey: F]'}
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>

                <button
                  onClick={onClose}
                  className="p-1 sm:p-1.5 rounded-xl bg-portal-card hover:bg-portal-pink text-white hover:text-black border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  title="Close [Hotkey: Esc]"
                  aria-label="Close Modal"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Player Profile & Telemetry Sub-header */}
            <div className="px-3 sm:px-5 py-1.5 bg-portal-card border-b-3 border-black flex items-center justify-between text-[11px] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={avatarUrl}
                  alt={`${username}'s player profile avatar`}
                  className="w-5 h-5 rounded-full object-cover bg-slate-800 border-2 border-black shadow-neo-sm shrink-0"
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-slate-300 font-black uppercase">PLAYER:</span>
                  <span className="text-[11px] text-portal-cyan font-black tracking-wide truncate max-w-[100px] sm:max-w-[160px] uppercase">
                    {username}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-portal-surface text-portal-yellow border border-black text-[9px] font-black uppercase shadow-neo-sm">
                    LVL {levelInfo.level}
                  </span>
                </div>
                <button
                  onClick={onChangeUsername}
                  className="px-1.5 py-0.5 rounded bg-portal-surface hover:bg-portal-yellow hover:text-black text-slate-300 border border-black text-[9px] font-black uppercase shadow-neo-sm transition-all flex items-center gap-0.5"
                  title="Change Gamer Tag"
                >
                  <Edit3 className="w-2.5 h-2.5" /> Edit
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {statusMsg ? (
                  <span className="flex items-center gap-1 text-[10px] text-portal-lime font-black uppercase animate-pulse">
                    <Check className="w-3 h-3 stroke-[2.5]" /> {statusMsg}
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <StarRating
                      gameId={game.id}
                      gameTitle={game.title}
                      gameCategory={game.category}
                      thumbnailUrl={game.thumbnail_url}
                      rating={game.rating || 4.9}
                      ratingCount={game.rating_count || 0}
                      userRating={userRating}
                      size="xs"
                      showCount={true}
                      interactive={true}
                      onRate={(val) => onRateGame?.(game.id, val)}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Dual-Pane Widescreen Body: Left Game Arena + Right Desktop Companion Deck */}
        <div className={`flex-1 min-h-0 flex flex-col ${isFullscreen ? 'h-full w-full' : 'md:flex-row'} overflow-hidden bg-black`}>
          {/* Left / Center: Primary Game Arena Viewport */}
          <div className={`flex-1 min-w-0 flex flex-col items-center ${isFullscreen ? 'justify-center p-2 sm:p-4' : 'justify-start p-1.5 min-[360px]:p-2.5 sm:p-4'} overflow-y-auto bg-black/95 relative custom-scrollbar`}>
            {/* Ambient Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e144a_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

            {/* Game Dynamic Component */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
              {(game.id === 'g_word_20' || game.slug === 'word-nexus') && (
                <WordNexusGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_candy_19' || game.slug === 'retro-candy-crush' || game.slug === 'candy-crush') && (
                <CandyCrushGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_battleship_18' || game.slug === 'retro-battleship' || game.slug === 'battleship') && (
                <BattleshipGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_blackhole_17' || game.slug === 'black-hole') && (
                <BlackHoleGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_sweeper_16' || game.slug === 'cyber-minesweeper') && (
                <CyberMinesweeperGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_maze_15' || game.slug === 'cyber-maze') && (
                <CyberMazeGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_slicer_11' || game.slug === 'cyber-slicer') && (
                <CyberSlicerGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_shooter_07' || game.slug === 'neon-starfighter') && (
                <NeonStarfighterGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_ttt_03' || game.slug === 'quantum-xo') && (
                <QuantumXOGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_card_05' || game.slug === 'quantum-2048') && (
                <Cyber2048Game gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_flip_02' || game.slug === 'memory-matrix') && (
                <MemoryMatrixGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_tap_04' || game.slug === 'hyper-tapper') && (
                <HyperTapperGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_snake_01' || game.slug === 'neon-snake') && (
                <NeonSnakeGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_multi_xo_13' || game.slug === 'multidimension-xo') && (
                <QuantumXOGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_action_06' || game.slug === 'cyber-dash') && (
                <CyberDashGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_geometry_10' || game.slug === 'geometry-dash') && (
                <GeometryDashGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_breaker_08' || game.slug === 'cyber-breaker') && (
                <CyberBreakerGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_reflex_09' || game.slug === 'chroma-reflex') && (
                <ChromaReflexGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}

              {(game.id === 'g_paper_12' || game.slug === 'paper-io' || game.slug === 'neon-paper-io') && (
                <NeonPaperIoGame gameId={game.id} onGameOver={handleScoreSubmit} />
              )}
            </div>
          </div>

          {/* Right: Desktop Companion Command Deck (Visible on md+ screens when toggled outside fullscreen) */}
          {!isFullscreen && showCompanionDeck && (
            <aside className="hidden md:flex w-72 lg:w-80 xl:w-96 shrink-0 bg-portal-surface border-l-4 border-black flex-col overflow-y-auto divide-y-3 divide-black select-none custom-scrollbar">
              {/* Deck Header */}
              <div className="p-3 bg-portal-card flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-portal-cyan stroke-[2.5]" />
                  <span className="text-xs font-black uppercase text-white tracking-wider">COMMAND DECK</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-black/60 text-portal-lime font-mono text-[9px] font-black uppercase border border-portal-lime/30">
                  LIVE TELEMETRY
                </span>
              </div>

              {/* 1. Live PC Keyboard & Controls HUD with Active Keypress Illumination */}
              <div className="p-3.5 space-y-2.5 bg-portal-surface">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-black uppercase text-portal-yellow">
                    <Crosshair className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>PC Controls Map</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">HARDWARE ACTIVE</span>
                </div>

                <div className="space-y-2">
                  {tacticalConfig.controls.map((binding, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm flex flex-col gap-1 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-white tracking-wide">
                          {binding.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {binding.keys.map((k, kIdx) => {
                            const active = isKeyActive(k);
                            return (
                              <kbd
                                key={kIdx}
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black border-2 border-black transition-all ${
                                  active
                                    ? 'bg-portal-yellow text-black ring-2 ring-portal-cyan shadow-none translate-x-0.5 translate-y-0.5 scale-95'
                                    : 'bg-portal-surface text-portal-cyan shadow-neo-sm'
                                }`}
                              >
                                {k}
                              </kbd>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">
                        {binding.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. In-Modal Live High-Score Leaderboard */}
              <div className="p-3.5 space-y-2.5 bg-portal-surface">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-black uppercase text-portal-pink">
                    <Crown className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Top 5 High Scores</span>
                  </div>
                  <button
                    onClick={fetchTopScores}
                    className="p-1 rounded-lg bg-portal-card hover:bg-portal-yellow hover:text-black text-slate-400 border border-black shadow-neo-sm transition-all"
                    title="Refresh Live Leaderboard"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingScores ? 'animate-spin text-portal-yellow' : ''}`} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {topScores.length === 0 ? (
                    <div className="p-3 rounded-xl bg-portal-card border-2 border-black text-center text-slate-400 text-xs">
                      {loadingScores ? 'Querying High Scores...' : 'No scores logged yet. Set the record!'}
                    </div>
                  ) : (
                    topScores.map((entry, idx) => {
                      const isUser = entry.username.toLowerCase() === username.toLowerCase();
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border-2 border-black text-xs font-black shadow-neo-sm transition-all ${
                            isUser
                              ? 'bg-portal-cyan/20 text-white border-portal-cyan'
                              : 'bg-portal-card text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border border-black ${
                                idx === 0
                                  ? 'bg-portal-yellow text-black'
                                  : idx === 1
                                  ? 'bg-slate-300 text-black'
                                  : idx === 2
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-portal-surface text-slate-300'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[90px] lg:max-w-[120px] uppercase">
                              {entry.username}
                            </span>
                          </div>
                          <span className="text-portal-yellow font-mono tracking-wider">
                            {entry.score.toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}

                  <button
                    onClick={() => onOpenLeaderboard(game.id)}
                    className="w-full py-1.5 mt-1 rounded-xl bg-portal-card hover:bg-portal-yellow hover:text-black text-slate-300 border-2 border-black text-[11px] font-black uppercase shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1"
                  >
                    <Trophy className="w-3 h-3" />
                    <span>View Full Global Standings</span>
                  </button>
                </div>
              </div>

              {/* 3. Tactical Mission Intel & Scoring Strategy */}
              <div className="p-3.5 space-y-2.5 bg-portal-surface">
                <div className="flex items-center gap-1 text-[11px] font-black uppercase text-portal-cyan">
                  <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Tactical Mission Intel</span>
                </div>

                <div className="p-2.5 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm space-y-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-portal-yellow block mb-0.5">MISSION OBJECTIVE:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {tacticalConfig.objective}
                    </p>
                  </div>

                  <div className="border-t border-black/60 pt-1.5">
                    <span className="text-[10px] font-black uppercase text-portal-lime block mb-0.5">SCORING ENGINE:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {tacticalConfig.scoring}
                    </p>
                  </div>

                  <div className="border-t border-black/60 pt-1.5">
                    <span className="text-[10px] font-black uppercase text-portal-pink block mb-0.5">PRO TACTICAL TIP:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {tacticalConfig.proTip}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Master Hotkey Cheatsheet Footer */}
              <div className="p-3 bg-portal-card text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>[F] Fullscreen</span>
                  <span>[C] Toggle HUD</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>[R] Quick Restart</span>
                  <span>[Esc] Exit to Lobby</span>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
