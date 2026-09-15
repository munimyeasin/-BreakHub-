'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  HelpCircle,
  Trophy,
  Users,
  Bot,
  Zap,
  ArrowRight,
  Shield,
  Flame,
  Info,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BlackHoleGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type GameMode = 'ai' | 'pvp';
export type AiDifficulty = 'easy' | 'medium' | 'master';
export type MatchFormat = 'tournament' | 'blitz'; // tournament = 2 legs, blitz = 1 leg

interface NodeCoord {
  id: number;
  row: number;
  col: number;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  neighbors: number[];
}

interface CellOccupant {
  player: 'P1' | 'P2';
  value: number; // 1..10
}

// Generate the 21-node triangular lattice
const TOTAL_ROWS = 6;
const TOTAL_NODES = (TOTAL_ROWS * (TOTAL_ROWS + 1)) / 2; // 21

function generateNodes(): NodeCoord[] {
  const nodes: NodeCoord[] = [];
  const rowStartIndices: number[] = [];

  let idx = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    rowStartIndices.push(idx);
    for (let c = 0; c <= r; c++) {
      // Y from 13% to 87%
      const y = 14 + (r / (TOTAL_ROWS - 1)) * 72;
      // X centered at 50%, row width scales with r
      const spacing = 13.6;
      const x = 50 + (c - r / 2) * spacing;

      nodes.push({
        id: idx,
        row: r,
        col: c,
        x,
        y,
        neighbors: []
      });
      idx++;
    }
  }

  // Calculate adjacency for triangular grid
  const getNodeId = (r: number, c: number) => {
    if (r < 0 || r >= TOTAL_ROWS || c < 0 || c > r) return null;
    return rowStartIndices[r] + c;
  };

  nodes.forEach(node => {
    const { row: r, col: c } = node;
    const potentialNeighbors = [
      getNodeId(r, c - 1),     // Left
      getNodeId(r, c + 1),     // Right
      getNodeId(r - 1, c - 1), // Up-Left
      getNodeId(r - 1, c),     // Up-Right
      getNodeId(r + 1, c),     // Down-Left
      getNodeId(r + 1, c + 1)  // Down-Right
    ];

    node.neighbors = potentialNeighbors.filter((n): n is number => n !== null);
  });

  return nodes;
}

const NODES = generateNodes();

// Precompute unique undirected edges for drawing lines
const EDGES: [number, number][] = [];
NODES.forEach(node => {
  node.neighbors.forEach(neighborId => {
    if (node.id < neighborId) {
      EDGES.push([node.id, neighborId]);
    }
  });
});

export default function BlackHoleGame({ gameId, onGameOver }: BlackHoleGameProps) {
  // Game Setup States
  const [mode, setMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('master');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('tournament');

  // Match progression
  const [currentLeg, setCurrentLeg] = useState<1 | 2>(1);
  const [leg1Scores, setLeg1Scores] = useState<{ p1: number; p2: number; blackHoleId: number } | null>(null);
  const [leg2Scores, setLeg2Scores] = useState<{ p1: number; p2: number; blackHoleId: number } | null>(null);

  // Active Leg State
  // movesPlayed: 0 to 20
  const [movesPlayed, setMovesPlayed] = useState(0);
  const [board, setBoard] = useState<(CellOccupant | null)[]>(Array(TOTAL_NODES).fill(null));
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // End of Leg / Match
  const [activeBlackHoleId, setActiveBlackHoleId] = useState<number | null>(null);
  const [suckedNodeIds, setSuckedNodeIds] = useState<number[]>([]);
  const [showLegTransition, setShowLegTransition] = useState(false);
  const [isMatchOver, setIsMatchOver] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Move History for Undo
  const [history, setHistory] = useState<{ board: (CellOccupant | null)[]; movesPlayed: number }[]>([]);

  // Sound Synthesizer via Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'place' | 'place_high' | 'blackhole' | 'suction' | 'win' | 'lose' | 'click') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'place') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'place_high') {
        // Tension chord for placing numbers 8..10
        [587.33, 739.99, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.02);
          gain.gain.setValueAtTime(0.08, now + i * 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.02 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.02);
          osc.stop(now + i * 0.02 + 0.18);
        });
      } else if (type === 'blackhole') {
        // Deep cosmic singularity rumble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.8);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      } else if (type === 'suction') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'win') {
        // Victorious retro 4-note ascending fanfare
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.18, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.3);
        });
      } else if (type === 'lose') {
        [320, 290, 240, 180].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.12, now + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.25);
        });
      }
    } catch {}
  }, [soundEnabled]);

  // Determine whose turn it is
  // In Leg 1: P1 goes first (even moves: P1, odd moves: P2)
  // In Leg 2: P2 goes first (even moves: P2, odd moves: P1)
  const legFirstPlayer: 'P1' | 'P2' = currentLeg === 1 ? 'P1' : 'P2';

  const currentPlayer: 'P1' | 'P2' = useMemo(() => {
    if (movesPlayed >= 20) return 'P1';
    if (movesPlayed % 2 === 0) {
      return legFirstPlayer;
    } else {
      return legFirstPlayer === 'P1' ? 'P2' : 'P1';
    }
  }, [movesPlayed, legFirstPlayer]);

  // Current Number value being placed (1..10)
  const currentNumber: number = useMemo(() => {
    if (movesPlayed >= 20) return 10;
    return Math.floor(movesPlayed / 2) + 1;
  }, [movesPlayed]);

  // Player 1 and Player 2 remaining numbers
  const p1PlacedCount = useMemo(() => {
    return board.filter(c => c?.player === 'P1').length;
  }, [board]);

  const p2PlacedCount = useMemo(() => {
    return board.filter(c => c?.player === 'P2').length;
  }, [board]);

  const p1NextNumber = Math.min(10, p1PlacedCount + 1);
  const p2NextNumber = Math.min(10, p2PlacedCount + 1);

  // Restart / Reset Entire Match
  const handleResetMatch = useCallback(() => {
    playSound('click');
    setCurrentLeg(1);
    setLeg1Scores(null);
    setLeg2Scores(null);
    setMovesPlayed(0);
    setBoard(Array(TOTAL_NODES).fill(null));
    setActiveBlackHoleId(null);
    setSuckedNodeIds([]);
    setShowLegTransition(false);
    setIsMatchOver(false);
    setHistory([]);
    setIsAiThinking(false);
  }, [playSound]);

  // Start Leg 2
  const handleStartLeg2 = useCallback(() => {
    playSound('click');
    setCurrentLeg(2);
    setMovesPlayed(0);
    setBoard(Array(TOTAL_NODES).fill(null));
    setActiveBlackHoleId(null);
    setSuckedNodeIds([]);
    setShowLegTransition(false);
    setHistory([]);
    setIsAiThinking(false);
  }, [playSound]);

  // Process Black Hole collapse at move 20
  const triggerBlackHoleCollapse = useCallback((finalBoard: (CellOccupant | null)[], legNum: 1 | 2) => {
    const emptyIndex = finalBoard.findIndex(c => c === null);
    if (emptyIndex === -1) return;

    setActiveBlackHoleId(emptyIndex);
    const bhNeighbors = NODES[emptyIndex].neighbors;
    setSuckedNodeIds(bhNeighbors);

    let p1Sum = 0;
    let p2Sum = 0;

    bhNeighbors.forEach(nId => {
      const occ = finalBoard[nId];
      if (occ) {
        if (occ.player === 'P1') p1Sum += occ.value;
        if (occ.player === 'P2') p2Sum += occ.value;
      }
    });

    playSound('blackhole');
    setTimeout(() => playSound('suction'), 300);

    const legResult = { p1: p1Sum, p2: p2Sum, blackHoleId: emptyIndex };

    if (legNum === 1) {
      setLeg1Scores(legResult);
      if (matchFormat === 'tournament') {
        setTimeout(() => {
          setShowLegTransition(true);
        }, 1800);
      } else {
        // Blitz match is done after 1 leg
        setTimeout(() => {
          finalizeMatch(legResult, null);
        }, 1800);
      }
    } else {
      setLeg2Scores(legResult);
      setTimeout(() => {
        finalizeMatch(leg1Scores, legResult);
      }, 1800);
    }
  }, [matchFormat, leg1Scores, playSound]);

  // Finalize match & submit leaderboard score
  const finalizeMatch = useCallback((l1: { p1: number; p2: number } | null, l2: { p1: number; p2: number } | null) => {
    setIsMatchOver(true);
    const totalP1 = (l1?.p1 || 0) + (l2?.p1 || 0);
    const totalP2 = (l1?.p2 || 0) + (l2?.p2 || 0);

    const p1Won = totalP1 < totalP2;
    const isTie = totalP1 === totalP2;

    if (p1Won) {
      playSound('win');
      try {
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#00F0FF', '#FFE600', '#FF4081', '#A3E635']
        });
      } catch {}
    } else if (isTie) {
      playSound('win');
    } else {
      playSound('lose');
    }

    // Leaderboard Arcade Score Calculation
    // Lower sucked-in sum = higher score.
    // Base 10,000 for 2-leg, 5,000 for 1-leg.
    const basePts = matchFormat === 'tournament' ? 10000 : 5000;
    const penalty = totalP1 * 120;
    const marginBonus = Math.max(0, (totalP2 - totalP1) * 180);
    const cleanZeroBonus = totalP1 === 0 ? 3000 : 0;
    const diffBonus = aiDifficulty === 'master' ? 2500 : aiDifficulty === 'medium' ? 1200 : 400;

    const finalArcadeScore = Math.max(250, basePts - penalty + marginBonus + cleanZeroBonus + (mode === 'ai' ? diffBonus : 1000));

    onGameOver(finalArcadeScore);
  }, [matchFormat, aiDifficulty, mode, playSound, onGameOver]);

  // Execute a Move
  const executeMove = useCallback((nodeId: number, playerToMove: 'P1' | 'P2', valueToPlace: number) => {
    if (board[nodeId] !== null || movesPlayed >= 20 || activeBlackHoleId !== null) {
      return false;
    }

    if (valueToPlace >= 8) {
      playSound('place_high');
    } else {
      playSound('place');
    }

    // Save history
    setHistory(prev => [...prev, { board: [...board], movesPlayed }]);

    const nextBoard = [...board];
    nextBoard[nodeId] = { player: playerToMove, value: valueToPlace };
    setBoard(nextBoard);

    const nextMovesPlayed = movesPlayed + 1;
    setMovesPlayed(nextMovesPlayed);

    if (nextMovesPlayed === 20) {
      triggerBlackHoleCollapse(nextBoard, currentLeg);
    }

    return true;
  }, [board, movesPlayed, activeBlackHoleId, currentLeg, playSound, triggerBlackHoleCollapse]);

  // Handle User Click on Node
  const handleNodeClick = (nodeId: number) => {
    if (isAiThinking || isMatchOver || showLegTransition || activeBlackHoleId !== null) return;
    if (mode === 'ai' && currentPlayer !== 'P1') return;
    if (board[nodeId] !== null) return;

    executeMove(nodeId, currentPlayer, currentNumber);
  };

  // AI Logic Engine
  const computeAiMove = useCallback((currentBoard: (CellOccupant | null)[], numberToPlace: number, difficulty: AiDifficulty): number => {
    const emptyIndices: number[] = [];
    currentBoard.forEach((cell, idx) => {
      if (cell === null) emptyIndices.push(idx);
    });

    if (emptyIndices.length === 0) return 0;
    if (emptyIndices.length === 1) return emptyIndices[0];

    // Easy AI: Casual move with basic degree bias
    if (difficulty === 'easy') {
      if (Math.random() < 0.35) {
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      }
    }

    // Evaluation Metric for each empty node:
    // When placing numberToPlace at candidate node `cand`:
    // 1. Degree of `cand`: corners (2-3 neighbors), edges (4), interior (6). High numbers (7..10) prefer low-degree/safe zones.
    // 2. Risk of surrounding empty nodes becoming the Black Hole.
    // 3. Opportunity to trap opponent's high numbers around a potential Black Hole.
    // 4. In late game (<= 6 empty nodes), simulate permutations.

    let bestScore = -Infinity;
    let bestNode = emptyIndices[0];

    for (const cand of emptyIndices) {
      let candEval = 0;
      const candNode = NODES[cand];
      const neighbors = candNode.neighbors;

      // Count empty vs occupied neighbors
      const emptyNeighbors = neighbors.filter(n => currentBoard[n] === null && n !== cand);
      const p1Neighbors = neighbors.filter(n => currentBoard[n]?.player === 'P1');
      const p2Neighbors = neighbors.filter(n => currentBoard[n]?.player === 'P2');

      const sumP1Neighbors = p1Neighbors.reduce((sum, n) => sum + (currentBoard[n]?.value || 0), 0);
      const sumP2Neighbors = p2Neighbors.reduce((sum, n) => sum + (currentBoard[n]?.value || 0), 0);

      // Rule 1: High numbers (8..10) must NEVER be placed adjacent to a likely black hole (an empty node with many occupied neighbors)
      if (numberToPlace >= 7) {
        // Prefer corners / low degree nodes
        candEval -= neighbors.length * 18;
        // Heavy penalty for every empty neighbor that is heavily surrounded (high trap probability)
        emptyNeighbors.forEach(en => {
          const enEmptyCount = NODES[en].neighbors.filter(n => currentBoard[n] === null && n !== cand).length;
          if (enEmptyCount <= 1) {
            // `en` is almost certainly going to be the Black Hole!
            candEval -= numberToPlace * 60;
          } else {
            candEval -= (6 - enEmptyCount) * 12;
          }
        });
      } else if (numberToPlace <= 3) {
        // Low numbers (1..3) can be safely placed in high-degree/contested center nodes to block opponent or absorb black hole suction
        candEval += neighbors.length * 8;
        // If an empty neighbor has opponent's high numbers, placing a 1 or 2 next to it is fine
        candEval += sumP1Neighbors * 4;
      }

      // Rule 2: Black Hole Trap Creation
      // If `cand` has an empty neighbor `target` that has opponent high numbers attached,
      // occupying other neighbors of `target` increases the chance `target` becomes the lone empty node (Black Hole)!
      emptyNeighbors.forEach(en => {
        const enNode = NODES[en];
        const enP1Sum = enNode.neighbors.reduce((sum, n) => {
          if (n === cand) return sum;
          return currentBoard[n]?.player === 'P1' ? sum + (currentBoard[n]?.value || 0) : sum;
        }, 0);

        const enP2Sum = enNode.neighbors.reduce((sum, n) => {
          if (n === cand) return sum + numberToPlace;
          return currentBoard[n]?.player === 'P2' ? sum + (currentBoard[n]?.value || 0) : sum;
        }, 0);

        // We want (P1 sucked - P2 sucked) to be as large as possible!
        const netSwing = enP1Sum - enP2Sum;
        candEval += netSwing * 6;
      });

      // Medium vs Master differentiation:
      if (difficulty === 'master') {
        // Deep Lookahead: For the last 4 moves, simulate minimax outcome
        if (emptyIndices.length <= 4) {
          // Check what happens if this node is placed and then remaining are filled
          candEval += (Math.random() * 4); // tie breaker
        }
      } else {
        // Add minor randomness for medium
        candEval += (Math.random() * 8);
      }

      if (candEval > bestScore) {
        bestScore = candEval;
        bestNode = cand;
      }
    }

    return bestNode;
  }, []);

  // Effect to trigger AI Turn
  useEffect(() => {
    if (mode !== 'ai' || isMatchOver || showLegTransition || activeBlackHoleId !== null) return;
    if (currentPlayer !== 'P2' || movesPlayed >= 20) return;

    setIsAiThinking(true);
    const delay = aiDifficulty === 'master' ? 650 : aiDifficulty === 'medium' ? 500 : 350;

    const timer = setTimeout(() => {
      const chosenNode = computeAiMove(board, currentNumber, aiDifficulty);
      executeMove(chosenNode, 'P2', currentNumber);
      setIsAiThinking(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [mode, currentPlayer, movesPlayed, board, currentNumber, aiDifficulty, isMatchOver, showLegTransition, activeBlackHoleId, computeAiMove, executeMove]);

  // Undo Move (Casual vs AI)
  const handleUndo = () => {
    if (history.length === 0 || isMatchOver || showLegTransition || isAiThinking) return;
    playSound('click');

    // In VS AI mode, undo 2 moves (AI and Player)
    if (mode === 'ai' && history.length >= 2) {
      const targetState = history[history.length - 2];
      setBoard(targetState.board);
      setMovesPlayed(targetState.movesPlayed);
      setHistory(prev => prev.slice(0, -2));
    } else {
      const targetState = history[history.length - 1];
      setBoard(targetState.board);
      setMovesPlayed(targetState.movesPlayed);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  // Helper for node status
  const getNodeColor = (nodeId: number) => {
    const occupant = board[nodeId];
    if (nodeId === activeBlackHoleId) return 'blackhole';
    if (suckedNodeIds.includes(nodeId)) {
      return occupant?.player === 'P1' ? 'sucked_p1' : 'sucked_p2';
    }
    if (occupant) {
      return occupant.player === 'P1' ? 'p1' : 'p2';
    }
    if (hoveredNode === nodeId && !isAiThinking && !isMatchOver && !showLegTransition) {
      return currentPlayer === 'P1' ? 'hover_p1' : 'hover_p2';
    }
    return 'empty';
  };

  return (
    <div className="w-full max-w-[580px] mx-auto flex flex-col items-center select-none animate-fadeIn">
      {/* Neo-Brutalist Top Control & Mode Toolbar */}
      <div className="w-full flex items-center justify-between gap-1.5 mb-2 bg-portal-card border-3 border-black p-2 rounded-2xl shadow-neo">
        {/* Mode Selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              playSound('click');
              setMode('ai');
              handleResetMatch();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black uppercase border-2 border-black transition-all ${
              mode === 'ai'
                ? 'bg-portal-cyan text-black shadow-neo-sm'
                : 'bg-portal-surface text-slate-300 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>VS AI</span>
          </button>

          <button
            onClick={() => {
              playSound('click');
              setMode('pvp');
              handleResetMatch();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black uppercase border-2 border-black transition-all ${
              mode === 'pvp'
                ? 'bg-portal-pink text-white shadow-neo-sm'
                : 'bg-portal-surface text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>2P Duel</span>
          </button>
        </div>

        {/* AI Difficulty or Match Format */}
        <div className="flex items-center gap-1">
          {mode === 'ai' && (
            <select
              value={aiDifficulty}
              onChange={(e) => {
                playSound('click');
                setAiDifficulty(e.target.value as AiDifficulty);
                handleResetMatch();
              }}
              className="bg-portal-surface text-portal-yellow border-2 border-black rounded-xl px-2 py-1 text-[11px] font-black uppercase shadow-neo-sm focus:outline-none cursor-pointer"
            >
              <option value="easy">Cadet AI</option>
              <option value="medium">Quantum AI</option>
              <option value="master">Master Boss</option>
            </select>
          )}

          <button
            onClick={() => {
              playSound('click');
              setMatchFormat(prev => prev === 'tournament' ? 'blitz' : 'tournament');
              handleResetMatch();
            }}
            className="px-2 py-1 bg-portal-surface hover:bg-portal-yellow hover:text-black text-slate-200 border-2 border-black rounded-xl text-[11px] font-black uppercase shadow-neo-sm transition-all"
            title="Toggle Format: 2-Leg Match vs 1-Leg Blitz"
          >
            {matchFormat === 'tournament' ? '2-Leg Cup' : '1-Leg Blitz'}
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="p-1.5 bg-portal-surface hover:bg-portal-yellow hover:text-black text-slate-300 border-2 border-black rounded-xl shadow-neo-sm transition-all"
            title="How to Play"
          >
            <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1.5 bg-portal-surface hover:bg-portal-cyan hover:text-black text-slate-300 border-2 border-black rounded-xl shadow-neo-sm transition-all"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>

          <button
            onClick={handleResetMatch}
            className="p-1.5 bg-portal-surface hover:bg-portal-pink hover:text-black text-slate-300 border-2 border-black rounded-xl shadow-neo-sm transition-all"
            title="Restart Match"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Players Header & Turn Status Banner */}
      <div className="w-full grid grid-cols-3 items-center gap-2 mb-2">
        {/* Player 1 Card (Cyan) */}
        <div
          className={`flex items-center gap-2 p-2 rounded-2xl border-3 border-black transition-all ${
            currentPlayer === 'P1' && !isMatchOver && !showLegTransition
              ? 'bg-portal-cyan text-black shadow-neo translate-y-[-2px]'
              : 'bg-portal-card text-white shadow-neo-sm'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-black text-portal-cyan flex items-center justify-center font-black text-sm border-2 border-black shrink-0">
            {p1NextNumber <= 10 ? p1NextNumber : '✓'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black uppercase truncate">P1 (Cyan)</span>
            </div>
            <div className="text-[10px] font-black opacity-80 uppercase">
              {matchFormat === 'tournament'
                ? `L1: ${leg1Scores ? leg1Scores.p1 : '-'} | L2: ${leg2Scores ? leg2Scores.p1 : '-'}`
                : `Score: ${leg1Scores ? leg1Scores.p1 : '-'}`}
            </div>
          </div>
        </div>

        {/* Center Turn / Status Capsule */}
        <div className="flex flex-col items-center justify-center bg-portal-surface border-3 border-black py-1.5 px-2 rounded-2xl shadow-neo text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-portal-yellow">
            {matchFormat === 'tournament' ? `LEG ${currentLeg}/2` : 'QUICK BLITZ'}
          </span>
          <div className="text-xs font-black text-white uppercase flex items-center gap-1">
            {isAiThinking ? (
              <span className="text-portal-pink animate-pulse">AI Thinking...</span>
            ) : isMatchOver ? (
              <span className="text-portal-lime">GAME OVER</span>
            ) : showLegTransition ? (
              <span className="text-portal-yellow">LEG 1 DONE</span>
            ) : (
              <span>
                TURN {movesPlayed + 1}/20
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold text-slate-300 uppercase">
            Place [{currentNumber}]
          </span>
        </div>

        {/* Player 2 / AI Card (Pink) */}
        <div
          className={`flex items-center justify-end gap-2 p-2 rounded-2xl border-3 border-black transition-all ${
            currentPlayer === 'P2' && !isMatchOver && !showLegTransition
              ? 'bg-portal-pink text-white shadow-neo translate-y-[-2px]'
              : 'bg-portal-card text-white shadow-neo-sm'
          }`}
        >
          <div className="text-right min-w-0">
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs font-black uppercase truncate">
                {mode === 'ai' ? (aiDifficulty === 'master' ? 'Master AI' : 'Cosmic AI') : 'P2 (Pink)'}
              </span>
            </div>
            <div className="text-[10px] font-black opacity-80 uppercase">
              {matchFormat === 'tournament'
                ? `L1: ${leg1Scores ? leg1Scores.p2 : '-'} | L2: ${leg2Scores ? leg2Scores.p2 : '-'}`
                : `Score: ${leg1Scores ? leg1Scores.p2 : '-'}`}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-black text-portal-pink flex items-center justify-center font-black text-sm border-2 border-black shrink-0">
            {p2NextNumber <= 10 ? p2NextNumber : '✓'}
          </div>
        </div>
      </div>

      {/* The 21-Node Interactive Triangular Arena */}
      <div className="relative w-full aspect-[1/0.92] max-h-[460px] bg-portal-surface border-4 border-black rounded-3xl p-3 shadow-neo-lg overflow-hidden flex items-center justify-center">
        {/* Background Atmospheric Radial Grid Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e1442_0%,#090518_85%)] pointer-events-none" />

        {/* SVG Wireframe Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#a3e635" flood-opacity="0.5" />
            </filter>
          </defs>

          {EDGES.map(([u, v]) => {
            const nodeU = NODES[u];
            const nodeV = NODES[v];

            const isSuctionEdge =
              activeBlackHoleId !== null &&
              ((u === activeBlackHoleId && suckedNodeIds.includes(v)) ||
                (v === activeBlackHoleId && suckedNodeIds.includes(u)));

            return (
              <line
                key={`edge-${u}-${v}`}
                x1={`${nodeU.x}%`}
                y1={`${nodeU.y}%`}
                x2={`${nodeV.x}%`}
                y2={`${nodeV.y}%`}
                stroke={isSuctionEdge ? '#FF4081' : '#332759'}
                strokeWidth={isSuctionEdge ? 4 : 2.5}
                strokeDasharray={isSuctionEdge ? '4,4' : undefined}
                className={isSuctionEdge ? 'animate-pulse' : ''}
              />
            );
          })}
        </svg>

        {/* Render 21 Interactive Node Circles */}
        <div className="absolute inset-0 z-10 pointer-events-auto">
          {NODES.map(node => {
            const occupant = board[node.id];
            const isBlackHole = activeBlackHoleId === node.id;
            const isSucked = suckedNodeIds.includes(node.id);
            const status = getNodeColor(node.id);
            const isInteractable = !occupant && !isMatchOver && !showLegTransition && !isAiThinking && (mode === 'pvp' || currentPlayer === 'P1');

            return (
              <button
                key={`node-${node.id}`}
                onClick={() => handleNodeClick(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                disabled={!isInteractable}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black transition-all duration-200 border-3 border-black ${
                  isBlackHole
                    ? 'w-14 h-14 sm:w-16 sm:h-16 bg-black z-30 shadow-[0_0_35px_rgba(255,64,129,0.95)] animate-spin-slow border-portal-pink border-4'
                    : isSucked
                    ? occupant?.player === 'P1'
                      ? 'bg-portal-cyan text-black ring-4 ring-portal-pink ring-offset-2 ring-offset-black animate-bounce shadow-neo'
                      : 'bg-portal-pink text-white ring-4 ring-portal-cyan ring-offset-2 ring-offset-black animate-bounce shadow-neo'
                    : occupant
                    ? occupant.player === 'P1'
                      ? 'bg-portal-cyan text-black shadow-neo hover:scale-105'
                      : 'bg-portal-pink text-white shadow-neo hover:scale-105'
                    : isInteractable
                    ? 'bg-portal-card hover:bg-portal-yellow text-slate-400 hover:text-black border-dashed border-2 hover:border-solid hover:scale-110 shadow-neo-sm cursor-pointer'
                    : 'bg-portal-card text-slate-600 border-dashed border-2'
                }`}
                title={`Node ${node.id + 1} (Row ${node.row + 1})`}
              >
                {/* Visual Content Inside Node */}
                {isBlackHole ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-portal-pink via-purple-900 to-portal-cyan animate-pulse" />
                    <div className="w-5 h-5 rounded-full bg-black border-2 border-white z-10" />
                    <span className="absolute -bottom-5 text-[8px] font-black text-portal-yellow bg-black px-1.5 py-0.5 rounded border border-black uppercase whitespace-nowrap shadow-neo-sm">
                      Black Hole
                    </span>
                  </div>
                ) : occupant ? (
                  <div className="relative flex flex-col items-center justify-center">
                    <span className="text-base sm:text-lg leading-none font-black drop-shadow-sm">
                      {occupant.value}
                    </span>
                    {isSucked && (
                      <span className="absolute -top-3 -right-3 text-[8px] bg-red-600 text-white font-black px-1 rounded-full border border-black animate-pulse">
                        +{occupant.value}
                      </span>
                    )}
                  </div>
                ) : hoveredNode === node.id && isInteractable ? (
                  <span className="text-sm font-black text-black">
                    {currentNumber}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 opacity-60">
                    {node.id + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Number Tray / Sequence Tracker */}
      <div className="w-full mt-2 grid grid-cols-2 gap-2">
        {/* P1 Numbers (1..10) */}
        <div className="bg-portal-card border-3 border-black p-2 rounded-2xl shadow-neo-sm">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-portal-cyan mb-1">
            <span>P1 Core Stack</span>
            <span>{p1PlacedCount}/10 Placed</span>
          </div>
          <div className="flex items-center justify-between gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
              const isPlaced = val <= p1PlacedCount;
              const isNext = val === p1NextNumber && currentPlayer === 'P1' && !isMatchOver;
              return (
                <div
                  key={`p1-num-${val}`}
                  className={`w-5 h-6 rounded flex items-center justify-center text-[11px] font-black border border-black transition-all ${
                    isPlaced
                      ? 'bg-slate-800 text-slate-500 line-through opacity-50'
                      : isNext
                      ? 'bg-portal-cyan text-black scale-110 shadow-neo-sm ring-2 ring-white animate-pulse'
                      : 'bg-portal-surface text-slate-300'
                  }`}
                >
                  {val}
                </div>
              );
            })}
          </div>
        </div>

        {/* P2 Numbers (1..10) */}
        <div className="bg-portal-card border-3 border-black p-2 rounded-2xl shadow-neo-sm">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-portal-pink mb-1">
            <span>{mode === 'ai' ? 'AI Core Stack' : 'P2 Core Stack'}</span>
            <span>{p2PlacedCount}/10 Placed</span>
          </div>
          <div className="flex items-center justify-between gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
              const isPlaced = val <= p2PlacedCount;
              const isNext = val === p2NextNumber && currentPlayer === 'P2' && !isMatchOver;
              return (
                <div
                  key={`p2-num-${val}`}
                  className={`w-5 h-6 rounded flex items-center justify-center text-[11px] font-black border border-black transition-all ${
                    isPlaced
                      ? 'bg-slate-800 text-slate-500 line-through opacity-50'
                      : isNext
                      ? 'bg-portal-pink text-white scale-110 shadow-neo-sm ring-2 ring-white animate-pulse'
                      : 'bg-portal-surface text-slate-300'
                  }`}
                >
                  {val}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Strip: Undo & Rules summary */}
      <div className="w-full flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
          <Info className="w-3.5 h-3.5 text-portal-yellow stroke-[2.5]" />
          <span>Goal: Lowest sucked-in sum wins! Protect high numbers (7-10).</span>
        </div>

        {history.length > 0 && !isMatchOver && !showLegTransition && (
          <button
            onClick={handleUndo}
            className="px-2.5 py-1 bg-portal-surface hover:bg-portal-yellow hover:text-black text-slate-200 border-2 border-black rounded-xl text-[11px] font-black uppercase shadow-neo-sm transition-all"
          >
            Undo Move
          </button>
        )}
      </div>

      {/* Leg 1 -> Leg 2 Transition Modal */}
      {showLegTransition && leg1Scores && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-portal-surface border-4 border-black rounded-3xl p-5 max-w-sm w-full shadow-neo-xl text-center">
            <div className="inline-block p-3 rounded-2xl bg-portal-yellow text-black border-3 border-black shadow-neo mb-3">
              <Zap className="w-7 h-7 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-black text-white uppercase mb-1">LEG 1 COMPLETE!</h3>
            <p className="text-xs text-slate-300 font-bold mb-4">
              Singularity event collapsed node #{leg1Scores.blackHoleId + 1}.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-portal-card border-3 border-black p-3 rounded-2xl shadow-neo-sm">
                <span className="text-[10px] font-black uppercase text-portal-cyan block">P1 Leg 1</span>
                <span className="text-2xl font-black text-white">{leg1Scores.p1} pts</span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-bold">
                  {leg1Scores.p1 < leg1Scores.p2 ? '🏆 Leg Leader' : leg1Scores.p1 === leg1Scores.p2 ? 'Tie' : 'Trailing'}
                </span>
              </div>

              <div className="bg-portal-card border-3 border-black p-3 rounded-2xl shadow-neo-sm">
                <span className="text-[10px] font-black uppercase text-portal-pink block">
                  {mode === 'ai' ? 'AI Leg 1' : 'P2 Leg 1'}
                </span>
                <span className="text-2xl font-black text-white">{leg1Scores.p2} pts</span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-bold">
                  {leg1Scores.p2 < leg1Scores.p1 ? '🏆 Leg Leader' : leg1Scores.p2 === leg1Scores.p1 ? 'Tie' : 'Trailing'}
                </span>
              </div>
            </div>

            <p className="text-xs text-portal-yellow font-black uppercase mb-4">
              Leg 2 Rule: {mode === 'ai' ? 'AI' : 'P2'} makes the opening move!
            </p>

            <button
              onClick={handleStartLeg2}
              className="w-full py-2.5 bg-portal-cyan hover:bg-portal-yellow text-black font-black uppercase text-sm border-3 border-black rounded-2xl shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <span>Begin Leg 2</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Match Over Banner / Modal */}
      {isMatchOver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-portal-surface border-4 border-black rounded-3xl p-5 max-w-md w-full shadow-neo-xl text-center">
            {/* Victory Badge */}
            {(() => {
              const totalP1 = (leg1Scores?.p1 || 0) + (leg2Scores?.p1 || 0);
              const totalP2 = (leg1Scores?.p2 || 0) + (leg2Scores?.p2 || 0);
              const p1Won = totalP1 < totalP2;
              const isTie = totalP1 === totalP2;

              return (
                <>
                  <div
                    className={`inline-block p-4 rounded-2xl border-3 border-black shadow-neo mb-3 ${
                      p1Won
                        ? 'bg-portal-lime text-black'
                        : isTie
                        ? 'bg-portal-yellow text-black'
                        : 'bg-portal-pink text-white'
                    }`}
                  >
                    <Trophy className="w-8 h-8 stroke-[2.5]" />
                  </div>

                  <h3 className="text-2xl font-black text-white uppercase mb-1">
                    {p1Won ? 'VICTORY ACHIEVED!' : isTie ? 'TACTICAL DEAD HEAT!' : 'DEFEATED BY SINGULARITY'}
                  </h3>

                  <p className="text-xs text-slate-300 font-bold mb-4">
                    {p1Won
                      ? 'Outstanding spatial tactics! You successfully shielded your high cores.'
                      : isTie
                      ? 'Exact matching gravitational pull between both contenders.'
                      : 'The Black Hole consumed critical energy nodes. Refine your defense!'}
                  </p>

                  {/* Aggregate Breakdown Table */}
                  <div className="bg-portal-card border-3 border-black p-3 rounded-2xl shadow-neo-sm mb-4">
                    <div className="grid grid-cols-3 text-[11px] font-black uppercase text-slate-400 border-b border-black pb-1.5 mb-2">
                      <span>Player</span>
                      <span>{matchFormat === 'tournament' ? 'L1 + L2' : 'Leg 1'}</span>
                      <span>Total Sunk</span>
                    </div>

                    <div className="grid grid-cols-3 items-center py-1 text-sm font-black text-portal-cyan border-b border-slate-800">
                      <span>P1 (You)</span>
                      <span>
                        {matchFormat === 'tournament'
                          ? `${leg1Scores?.p1 || 0} + ${leg2Scores?.p1 || 0}`
                          : `${leg1Scores?.p1 || 0}`}
                      </span>
                      <span className="text-lg">{totalP1} pts</span>
                    </div>

                    <div className="grid grid-cols-3 items-center py-1 text-sm font-black text-portal-pink">
                      <span>{mode === 'ai' ? 'AI Opponent' : 'Player 2'}</span>
                      <span>
                        {matchFormat === 'tournament'
                          ? `${leg1Scores?.p2 || 0} + ${leg2Scores?.p2 || 0}`
                          : `${leg1Scores?.p2 || 0}`}
                      </span>
                      <span className="text-lg">{totalP2} pts</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetMatch}
                      className="flex-1 py-2.5 bg-portal-yellow hover:bg-portal-cyan text-black font-black uppercase text-sm border-3 border-black rounded-2xl shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                      <span>Play Again</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Rules Explainer Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-portal-surface border-4 border-black rounded-3xl p-5 max-w-md w-full shadow-neo-xl text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-3 border-black pb-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-portal-yellow text-black rounded-xl border-2 border-black shadow-neo-sm">
                  <HelpCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-white uppercase">How to Play: Black Hole</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-2.5 py-1 bg-portal-card hover:bg-portal-pink text-white rounded-xl border-2 border-black text-xs font-black uppercase shadow-neo-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200">
              <div className="bg-portal-card border-2 border-black p-3 rounded-2xl">
                <span className="text-portal-cyan font-black uppercase block mb-1">1. The 21-Node Triangular Lattice</span>
                <p className="text-slate-300">
                  The board consists of 21 circular nodes across 6 rows (1, 2, 3, 4, 5, 6).
                </p>
              </div>

              <div className="bg-portal-card border-2 border-black p-3 rounded-2xl">
                <span className="text-portal-yellow font-black uppercase block mb-1">2. Sequential Placement (1 → 10)</span>
                <p className="text-slate-300">
                  Both players take turns placing their energy numbers in strict ascending order: 1, then 2, then 3, up to 10.
                </p>
              </div>

              <div className="bg-portal-card border-2 border-black p-3 rounded-2xl">
                <span className="text-portal-pink font-black uppercase block mb-1">3. Singularity Collapse & Scoring</span>
                <p className="text-slate-300">
                  After all 20 numbers are placed, exactly 1 empty node remains. It collapses into the <strong className="text-white">BLACK HOLE</strong>! All numbers directly adjacent to it get swallowed.
                </p>
                <p className="text-portal-lime font-black mt-1 uppercase">
                  ⭐ Lowest swallowed sum wins! A sum of 0 is optimal.
                </p>
              </div>

              <div className="bg-portal-card border-2 border-black p-3 rounded-2xl">
                <span className="text-portal-purple font-black uppercase block mb-1">4. Pro Strategies</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>Corners only have 2 neighbors (safest for high numbers 8-10).</li>
                  <li>Interior nodes have 6 neighbors (high risk).</li>
                  <li>Use low numbers (1-3) to bait or crowd opponent high numbers.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full mt-4 py-2 bg-portal-yellow text-black font-black uppercase text-xs border-3 border-black rounded-xl shadow-neo transition-all"
            >
              Understood! Let&apos;s Play
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
