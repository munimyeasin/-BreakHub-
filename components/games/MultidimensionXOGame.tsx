'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Users,
  Volume2,
  VolumeX,
  Trophy,
  Bot,
  Grid3X3,
  HelpCircle,
  Undo2,
  Lightbulb,
  Radio,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MultidimensionXOGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type CellValue = 'X' | 'O' | null;
export type SectorStatus = 'X' | 'O' | 'TIE' | null;
export type GameMode = 'ai' | 'pvp';
export type AiDifficulty = 'cadet' | 'tactician' | 'overthinker';

// 9 Sector Names for tactical HUD feedback
const SECTOR_NAMES = [
  'TOP-LEFT',
  'TOP-CENTER',
  'TOP-RIGHT',
  'MID-LEFT',
  'QUANTUM CENTER',
  'MID-RIGHT',
  'BTM-LEFT',
  'BTM-CENTER',
  'BTM-RIGHT'
];

// Winning line permutations for 3x3 grids (local & macro)
const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // Rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // Columns
  [0, 4, 8],
  [2, 4, 6]  // Diagonals
];

// Check win condition for any 3x3 array (micro board or macro sector array)
function check3x3Winner(grid: (CellValue | SectorStatus)[]): { winner: 'X' | 'O' | 'TIE' | null; line: number[] | null } {
  for (let i = 0; i < WINNING_LINES.length; i++) {
    const [a, b, c] = WINNING_LINES[i];
    const valA = grid[a];
    if (valA && (valA === 'X' || valA === 'O') && valA === grid[b] && valA === grid[c]) {
      return { winner: valA, line: [a, b, c] };
    }
  }

  // Check if grid is full
  if (grid.every(cell => cell !== null)) {
    return { winner: 'TIE', line: null };
  }

  return { winner: null, line: null };
}

interface MoveRecord {
  sector: number;
  cell: number;
  player: 'X' | 'O';
  prevActiveSector: number | null;
  prevSectorWinners: SectorStatus[];
  prevBoard: CellValue[][];
}

export default function MultidimensionXOGame({ gameId, onGameOver }: MultidimensionXOGameProps) {
  // Game Setup & Mode
  const [mode, setMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('overthinker');

  // Macro Board: 9 Sectors, each containing 9 micro cells
  const [macroBoard, setMacroBoard] = useState<CellValue[][]>(() =>
    Array.from({ length: 9 }, () => Array(9).fill(null))
  );

  // Sector status (X won, O won, Tied, or Incomplete)
  const [sectorWinners, setSectorWinners] = useState<SectorStatus[]>(() => Array(9).fill(null));

  // Active target sector where current player must place their mark (null = Free Choice / Quantum Warp)
  const [activeSector, setActiveSector] = useState<number | null>(null);

  // Match progression & turn management
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [startingPlayer, setStartingPlayer] = useState<'X' | 'O'>('X');
  const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
  const [globalWinner, setGlobalWinner] = useState<'X' | 'O' | 'TIE' | null>(null);
  const [winningMacroLine, setWinningMacroLine] = useState<number[] | null>(null);
  const [winningMicroLines, setWinningMicroLines] = useState<Record<number, number[]>>({});

  // Interaction feedback & AI state
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastMove, setLastMove] = useState<{ sector: number; cell: number; player: 'X' | 'O' } | null>(null);
  const [suggestedHint, setSuggestedHint] = useState<{ sector: number; cell: number } | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);

  // Score & Round Tracking
  const [p1Wins, setP1Wins] = useState<number>(0);
  const [p2Wins, setP2Wins] = useState<number>(0);
  const [ties, setTies] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Master Synchronized Refs to eliminate stale React closures across async AI moves & timeouts
  const macroBoardRef = useRef<CellValue[][]>(macroBoard);
  const sectorWinnersRef = useRef<SectorStatus[]>(sectorWinners);
  const activeSectorRef = useRef<number | null>(activeSector);
  const currentTurnRef = useRef<'X' | 'O'>(currentTurn);
  const globalWinnerRef = useRef<'X' | 'O' | 'TIE' | null>(null);
  const isAiThinkingRef = useRef<boolean>(false);
  const modeRef = useRef<GameMode>(mode);
  const difficultyRef = useRef<AiDifficulty>(difficulty);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Keep configuration refs synchronized
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  // Cleanup pending timers on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Procedural Web Audio Sound Engine
  const playSound = useCallback(
    (type: 'move_x' | 'move_o' | 'sector_win' | 'warp_freedom' | 'global_win' | 'global_lose' | 'tie' | 'click' | 'hint') => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const now = ctx.currentTime;

        if (type === 'click') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(650, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (type === 'hint') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(580, now);
          osc.frequency.exponentialRampToValueAtTime(1160, now + 0.12);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'move_x') {
          // Punchy laser snap for X (Electric Cyan)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(480, now);
          osc.frequency.exponentialRampToValueAtTime(960, now + 0.08);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === 'move_o') {
          // Heavy resonant bass thump for O (Hot Pink)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'sector_win') {
          // High-energy 3-chord power chord for conquering a local 3x3 sector
          [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.16, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.22);
          });
        } else if (type === 'warp_freedom') {
          // Futuristic dual-tone sweep for Quantum Warp Freedom
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.linearRampToValueAtTime(1080, now + 0.14);
          osc.frequency.linearRampToValueAtTime(720, now + 0.24);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.24);
        } else if (type === 'global_win') {
          // Triumphant 5-note Neo-Brutalist championship fanfare
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = i >= 3 ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.2, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.45);
          });
        } else if (type === 'global_lose') {
          // Downward glitch distortion on loss
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.linearRampToValueAtTime(70, now + 0.35);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'tie') {
          [440, 554.37].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
          });
        }
      } catch {}
    },
    [soundEnabled]
  );

  // Calculate list of all currently valid moves
  const getValidMoves = useCallback(
    (board: CellValue[][], winners: SectorStatus[], targetSector: number | null) => {
      const valid: { sector: number; cell: number }[] = [];

      // Determine candidate sectors
      let candidateSectors: number[] = [];
      if (targetSector !== null && winners[targetSector] === null) {
        const hasEmpty = board[targetSector]?.some(cell => cell === null);
        if (hasEmpty) {
          candidateSectors = [targetSector];
        }
      }

      // If targetSector is null, or target sector is closed/full, allow any sector with open cells
      if (candidateSectors.length === 0) {
        candidateSectors = winners
          .map((w, idx) => (w === null && board[idx]?.some(cell => cell === null) ? idx : null))
          .filter((idx): idx is number => idx !== null);
      }

      for (const s of candidateSectors) {
        for (let c = 0; c < 9; c++) {
          if (board[s] && !board[s][c]) {
            valid.push({ sector: s, cell: c });
          }
        }
      }

      return valid;
    },
    []
  );

  // Helper to evaluate macro board completion and winner
  const evaluateGlobalGame = useCallback(
    (winners: SectorStatus[], board: CellValue[][]) => {
      // 1. Check for 3-in-a-row macro sectors
      const macroRes = check3x3Winner(winners);
      if (macroRes.winner && macroRes.winner !== 'TIE') {
        return macroRes;
      }

      // 2. Check if all 9 sectors are concluded
      const allConcluded = winners.every(w => w !== null);

      // 3. Or check if no valid moves exist anywhere across all 81 cells
      const totalOpenCells = board.reduce((acc, sector, sIdx) => {
        if (winners[sIdx] !== null) return acc;
        return acc + sector.filter(c => c === null).length;
      }, 0);

      if (allConcluded || totalOpenCells === 0) {
        const xCount = winners.filter(w => w === 'X').length;
        const oCount = winners.filter(w => w === 'O').length;
        if (xCount > oCount) return { winner: 'X' as const, line: null };
        if (oCount > xCount) return { winner: 'O' as const, line: null };
        return { winner: 'TIE' as const, line: null };
      }

      return null;
    },
    []
  );

  // Tactical AI Move Selector (Cadet, Tactician, Overthinker)
  const computeAiMove = useCallback(
    (
      board: CellValue[][],
      winners: SectorStatus[],
      targetSector: number | null,
      aiDiff: AiDifficulty
    ): { sector: number; cell: number } | null => {
      const validMoves = getValidMoves(board, winners, targetSector);
      if (validMoves.length === 0) return null;

      // 1. Cadet AI (Casual / Novice): 65% random, 35% basic local capture
      if (aiDiff === 'cadet') {
        for (const m of validMoves) {
          const testLocal = [...board[m.sector]];
          testLocal[m.cell] = 'O';
          if (check3x3Winner(testLocal).winner === 'O') {
            return m;
          }
        }
        return validMoves[Math.floor(Math.random() * validMoves.length)];
      }

      // 2. Tactician AI (Strategic Heuristics)
      if (aiDiff === 'tactician') {
        // Step A: Check for immediate MACRO game win
        for (const m of validMoves) {
          const testLocal = [...board[m.sector]];
          testLocal[m.cell] = 'O';
          if (check3x3Winner(testLocal).winner === 'O') {
            const testWinners = [...winners];
            testWinners[m.sector] = 'O';
            if (check3x3Winner(testWinners).winner === 'O') {
              return m; // Win the entire macro match immediately!
            }
          }
        }

        // Step B: Block opponent immediate MACRO game win
        for (const m of validMoves) {
          const testLocal = [...board[m.sector]];
          testLocal[m.cell] = 'X';
          if (check3x3Winner(testLocal).winner === 'X') {
            const testWinners = [...winners];
            testWinners[m.sector] = 'X';
            if (check3x3Winner(testWinners).winner === 'X') {
              return m; // Block opponent macro triumph!
            }
          }
        }

        // Step C: Win a local sector
        for (const m of validMoves) {
          const testLocal = [...board[m.sector]];
          testLocal[m.cell] = 'O';
          if (check3x3Winner(testLocal).winner === 'O') {
            return m;
          }
        }

        // Step D: Block opponent from winning a local sector
        for (const m of validMoves) {
          const testLocal = [...board[m.sector]];
          testLocal[m.cell] = 'X';
          if (check3x3Winner(testLocal).winner === 'X') {
            return m;
          }
        }

        // Step E: Prefer center cell (4) or corner cells (0, 2, 6, 8) and avoid sending opponent to free warp
        const scoredMoves = validMoves.map(m => {
          let score = 0;
          if (m.cell === 4) score += 40;
          if ([0, 2, 6, 8].includes(m.cell)) score += 25;

          if (winners[m.cell] !== null) {
            score -= 30; // Gives opponent free choice
          }
          return { move: m, score };
        });

        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves[0].move;
      }

      // 3. Overthinker AI (Final Boss / Advanced Minimax Heuristic Engine)
      let bestMove = validMoves[0];
      let bestScore = -Infinity;

      for (const m of validMoves) {
        let moveScore = 0;

        // Clone local board & simulate move
        const nextLocal = [...board[m.sector]];
        nextLocal[m.cell] = 'O';
        const nextLocalWin = check3x3Winner(nextLocal);

        const nextWinners = [...winners];
        if (nextLocalWin.winner === 'O') {
          nextWinners[m.sector] = 'O';
        } else if (nextLocalWin.winner === 'TIE') {
          nextWinners[m.sector] = 'TIE';
        }

        // 1. Check Global Macro Win
        const macroRes = check3x3Winner(nextWinners);
        if (macroRes.winner === 'O') {
          return m; // Instant win! Max priority
        }

        // 2. Evaluate Macro Threat Block
        const testBlockLocal = [...board[m.sector]];
        testBlockLocal[m.cell] = 'X';
        const testBlockWin = check3x3Winner(testBlockLocal);
        if (testBlockWin.winner === 'X') {
          const testOppWinners = [...winners];
          testOppWinners[m.sector] = 'X';
          if (check3x3Winner(testOppWinners).winner === 'X') {
            moveScore += 15000; // Critical macro defense!
          }
        }

        // 3. Conquering local sector rewards
        if (nextLocalWin.winner === 'O') {
          moveScore += 1200;
          if (m.sector === 4) moveScore += 800;
          else if ([0, 2, 6, 8].includes(m.sector)) moveScore += 400;
        }

        // 4. Blocking opponent local sector win
        if (testBlockWin.winner === 'X') {
          moveScore += 650;
        }

        // 5. Tactical Sector Routing Penalty / Reward
        const targetNextSector = m.cell;
        if (nextWinners[targetNextSector] !== null || (board[targetNextSector] && board[targetNextSector].every(c => c !== null))) {
          // Sending opponent to already won/tied sector gives them QUANTUM WARP (Free Choice)
          moveScore -= 700;
        } else {
          // Check opponent's best response in targetNextSector
          const oppSectorBoard = board[targetNextSector];
          if (oppSectorBoard) {
            let oppCanWinTarget = false;
            for (let oppC = 0; oppC < 9; oppC++) {
              if (!oppSectorBoard[oppC]) {
                const testOppLocal = [...oppSectorBoard];
                testOppLocal[oppC] = 'X';
                if (check3x3Winner(testOppLocal).winner === 'X') {
                  oppCanWinTarget = true;
                  break;
                }
              }
            }
            if (oppCanWinTarget) {
              moveScore -= 1400; // Do not send opponent into their own winning sector!
            }
          }
        }

        // 6. Micro positional values
        if (m.cell === 4) moveScore += 120; // Center is versatile
        else if ([0, 2, 6, 8].includes(m.cell)) moveScore += 60; // Corners

        // 7. Micro 2-in-a-row setups
        for (const line of WINNING_LINES) {
          if (line.includes(m.cell)) {
            const countO = line.filter(idx => nextLocal[idx] === 'O').length;
            const countX = line.filter(idx => nextLocal[idx] === 'X').length;
            if (countO === 2 && countX === 0) moveScore += 180;
          }
        }

        // Slight random jitter for non-deterministic variety
        moveScore += Math.random() * 20;

        if (moveScore > bestScore) {
          bestScore = moveScore;
          bestMove = m;
        }
      }

      return bestMove;
    },
    [getValidMoves]
  );

  // Synchronized Move Executor that updates both React state and master refs
  const executeMove = useCallback(
    (sectorIdx: number, cellIdx: number, player: 'X' | 'O') => {
      const currentBoard = macroBoardRef.current;
      const currentWinners = sectorWinnersRef.current;
      const currentActive = activeSectorRef.current;

      // 1. Record History for Undo
      setMoveHistory(prev => [
        ...prev,
        {
          sector: sectorIdx,
          cell: cellIdx,
          player,
          prevActiveSector: currentActive,
          prevSectorWinners: [...currentWinners],
          prevBoard: currentBoard.map(s => [...s])
        }
      ]);

      // 2. Compute Next Board
      const nextBoard = currentBoard.map((s, idx) => {
        if (idx !== sectorIdx) return [...s];
        const newLocal = [...s];
        newLocal[cellIdx] = player;
        return newLocal;
      });

      // Update ref and state
      macroBoardRef.current = nextBoard;
      setMacroBoard(nextBoard);

      setLastMove({ sector: sectorIdx, cell: cellIdx, player });
      setSuggestedHint(null);

      // Play Sound
      playSound(player === 'X' ? 'move_x' : 'move_o');

      // 3. Check if local sector was conquered or tied
      const localResult = check3x3Winner(nextBoard[sectorIdx]);
      const nextWinners = [...currentWinners];

      if (localResult.winner && currentWinners[sectorIdx] === null) {
        nextWinners[sectorIdx] = localResult.winner;
        sectorWinnersRef.current = nextWinners;
        setSectorWinners(nextWinners);

        if (localResult.line) {
          setWinningMicroLines(prev => ({
            ...prev,
            [sectorIdx]: localResult.line!
          }));
        }

        if (localResult.winner === 'X' || localResult.winner === 'O') {
          playSound('sector_win');
        }
      }

      // 4. Check Global Macro Game Victory
      const globalRes = evaluateGlobalGame(nextWinners, nextBoard);
      if (globalRes && globalRes.winner) {
        globalWinnerRef.current = globalRes.winner;
        setGlobalWinner(globalRes.winner);
        if (globalRes.line) setWinningMacroLine(globalRes.line);

        if (globalRes.winner === 'X') {
          const diffMultiplier = difficultyRef.current === 'overthinker' ? 3 : difficultyRef.current === 'tactician' ? 2 : 1;
          const streakBonus = streak * 250;
          const addedScore = (1000 + p1Wins * 400) * diffMultiplier + streakBonus;
          const newScore = score + addedScore;
          setScore(newScore);
          setP1Wins(prev => prev + 1);
          setStreak(prev => prev + 1);
          playSound('global_win');
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
          setTimeout(() => onGameOver(newScore), 80);
        } else if (globalRes.winner === 'O') {
          setP2Wins(prev => prev + 1);
          setStreak(0);
          if (modeRef.current === 'ai') {
            playSound('global_lose');
          } else {
            playSound('global_win');
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        } else {
          // Tie
          setTies(prev => prev + 1);
          const addedScore = 300;
          const newScore = score + addedScore;
          setScore(newScore);
          playSound('tie');
          setTimeout(() => onGameOver(newScore), 80);
        }
        return;
      }

      // 5. Determine Next Active Sector Routing
      const targetNextSector = cellIdx;
      const isTargetClosed =
        nextWinners[targetNextSector] !== null ||
        (nextBoard[targetNextSector] && nextBoard[targetNextSector].every(c => c !== null));

      let nextActive: number | null = null;
      if (isTargetClosed) {
        // Targeted sector is conquered or full -> Quantum Warp Freedom!
        nextActive = null;
        playSound('warp_freedom');
      } else {
        nextActive = targetNextSector;
      }

      activeSectorRef.current = nextActive;
      setActiveSector(nextActive);

      // 6. Switch Turn
      const nextPlayer: 'X' | 'O' = player === 'X' ? 'O' : 'X';
      currentTurnRef.current = nextPlayer;
      setCurrentTurn(nextPlayer);

      // 7. Schedule AI Turn safely using updated master refs
      if (modeRef.current === 'ai' && nextPlayer === 'O') {
        setIsAiThinking(true);
        isAiThinkingRef.current = true;
        const delay = Math.floor(Math.random() * 180) + 320; // 320ms - 500ms realistic compute pacing

        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

        aiTimeoutRef.current = setTimeout(() => {
          // Guard against stale triggers if round ended during thinking delay
          if (globalWinnerRef.current !== null || currentTurnRef.current !== 'O') {
            setIsAiThinking(false);
            isAiThinkingRef.current = false;
            return;
          }

          const boardState = macroBoardRef.current;
          const winnersState = sectorWinnersRef.current;
          const activeState = activeSectorRef.current;
          const currentDiff = difficultyRef.current;

          const aiMove = computeAiMove(boardState, winnersState, activeState, currentDiff);

          setIsAiThinking(false);
          isAiThinkingRef.current = false;

          if (aiMove) {
            executeMove(aiMove.sector, aiMove.cell, 'O');
          }
        }, delay);
      }
    },
    [
      playSound,
      evaluateGlobalGame,
      computeAiMove,
      onGameOver,
      streak,
      p1Wins,
      score
    ]
  );

  // Handle User Cell Click
  const handleCellClick = (sectorIdx: number, cellIdx: number) => {
    if (globalWinnerRef.current !== null || isAiThinkingRef.current) return;

    const board = macroBoardRef.current;
    const winners = sectorWinnersRef.current;
    const targetSector = activeSectorRef.current;
    const activePlayer = currentTurnRef.current;

    // Check if cell is occupied
    if (board[sectorIdx][cellIdx] !== null) return;

    // Check if sector is already conquered or tied
    if (winners[sectorIdx] !== null) return;

    // Check if clicked sector is allowed
    if (targetSector !== null && targetSector !== sectorIdx) {
      playSound('click');
      return;
    }

    if (modeRef.current === 'pvp') {
      executeMove(sectorIdx, cellIdx, activePlayer);
    } else {
      // AI Mode: Only Player ('X') can click
      if (activePlayer !== 'X') return;
      executeMove(sectorIdx, cellIdx, 'X');
    }
  };

  // Undo Last Move
  const handleUndo = () => {
    if (moveHistory.length === 0 || globalWinnerRef.current !== null || isAiThinkingRef.current) return;

    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      setIsAiThinking(false);
      isAiThinkingRef.current = false;
    }

    playSound('click');

    // In AI mode, undo 2 steps (AI's move + Player's move)
    const stepsToUndo = modeRef.current === 'ai' && moveHistory.length >= 2 ? 2 : 1;
    const targetHistory = moveHistory.slice(0, moveHistory.length - stepsToUndo);
    const lastRecord = targetHistory[targetHistory.length - 1];

    if (lastRecord) {
      macroBoardRef.current = lastRecord.prevBoard;
      sectorWinnersRef.current = lastRecord.prevSectorWinners;
      activeSectorRef.current = lastRecord.prevActiveSector;
      currentTurnRef.current = lastRecord.player === 'X' ? 'O' : 'X';

      setMacroBoard(lastRecord.prevBoard);
      setSectorWinners(lastRecord.prevSectorWinners);
      setActiveSector(lastRecord.prevActiveSector);
      setCurrentTurn(lastRecord.player === 'X' ? 'O' : 'X');
      setLastMove({ sector: lastRecord.sector, cell: lastRecord.cell, player: lastRecord.player });
    } else {
      // Reset to round start
      const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(null));
      const emptyWinners: SectorStatus[] = Array(9).fill(null);

      macroBoardRef.current = emptyBoard;
      sectorWinnersRef.current = emptyWinners;
      activeSectorRef.current = null;
      currentTurnRef.current = startingPlayer;

      setMacroBoard(emptyBoard);
      setSectorWinners(emptyWinners);
      setActiveSector(null);
      setCurrentTurn(startingPlayer);
      setLastMove(null);
    }

    setMoveHistory(targetHistory);
    setSuggestedHint(null);
    setWinningMacroLine(null);
    setWinningMicroLines({});
  };

  // Tactical Hint Generator
  const handleHint = () => {
    if (globalWinnerRef.current !== null || isAiThinkingRef.current) return;
    const hint = computeAiMove(
      macroBoardRef.current,
      sectorWinnersRef.current,
      activeSectorRef.current,
      'overthinker'
    );
    if (hint) {
      setSuggestedHint(hint);
      playSound('hint');
    }
  };

  // Start Next Round with Alternating First Move
  const handleNextRound = () => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    playSound('click');

    const nextRound = roundNumber + 1;
    const nextStarter: 'X' | 'O' = startingPlayer === 'X' ? 'O' : 'X';
    const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(null));
    const emptyWinners: SectorStatus[] = Array(9).fill(null);

    macroBoardRef.current = emptyBoard;
    sectorWinnersRef.current = emptyWinners;
    activeSectorRef.current = null;
    globalWinnerRef.current = null;
    currentTurnRef.current = nextStarter;
    isAiThinkingRef.current = false;

    setMacroBoard(emptyBoard);
    setSectorWinners(emptyWinners);
    setActiveSector(null);
    setGlobalWinner(null);
    setWinningMacroLine(null);
    setWinningMicroLines({});
    setRoundNumber(nextRound);
    setStartingPlayer(nextStarter);
    setCurrentTurn(nextStarter);
    setLastMove(null);
    setSuggestedHint(null);
    setMoveHistory([]);
    setIsAiThinking(false);

    // If AI starts first in new round
    if (modeRef.current === 'ai' && nextStarter === 'O') {
      setIsAiThinking(true);
      isAiThinkingRef.current = true;

      aiTimeoutRef.current = setTimeout(() => {
        const openingSectors = [4, 0, 2, 6, 8];
        const s = openingSectors[Math.floor(Math.random() * openingSectors.length)];
        const c = 4; // Start center
        setIsAiThinking(false);
        isAiThinkingRef.current = false;
        executeMove(s, c, 'O');
      }, 450);
    }
  };

  // Hard Reset Entire Tournament
  const resetEntireTournament = () => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    playSound('click');

    const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(null));
    const emptyWinners: SectorStatus[] = Array(9).fill(null);

    macroBoardRef.current = emptyBoard;
    sectorWinnersRef.current = emptyWinners;
    activeSectorRef.current = null;
    globalWinnerRef.current = null;
    currentTurnRef.current = 'X';
    isAiThinkingRef.current = false;

    setMacroBoard(emptyBoard);
    setSectorWinners(emptyWinners);
    setActiveSector(null);
    setGlobalWinner(null);
    setWinningMacroLine(null);
    setWinningMicroLines({});
    setRoundNumber(1);
    setStartingPlayer('X');
    setCurrentTurn('X');
    setP1Wins(0);
    setP2Wins(0);
    setTies(0);
    setStreak(0);
    setScore(0);
    setLastMove(null);
    setSuggestedHint(null);
    setMoveHistory([]);
    setIsAiThinking(false);
  };

  // Calculate Conquered Sector Tally
  const sectorCounts = useMemo(() => {
    const x = sectorWinners.filter(w => w === 'X').length;
    const o = sectorWinners.filter(w => w === 'O').length;
    const t = sectorWinners.filter(w => w === 'TIE').length;
    return { x, o, t };
  }, [sectorWinners]);

  return (
    <div className="w-full flex flex-col items-center justify-center select-none text-slate-100 font-sans">
      {/* 1. Tactical Command & Mode Deck */}
      <div className="w-full max-w-[430px] flex items-center justify-between gap-2 px-2 py-1.5 mb-2 bg-portal-card border-2 border-black rounded-xl shadow-neo-sm">
        {/* Mode Toggle: Solo vs AI / 2P Pass & Play */}
        <div className="flex items-center gap-1 bg-portal-bg/80 p-0.5 rounded-lg border border-black">
          <button
            onClick={() => {
              playSound('click');
              setMode('ai');
              resetEntireTournament();
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase transition-all ${
              mode === 'ai'
                ? 'bg-portal-cyan text-black border border-black shadow-neo-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3 h-3" />
            <span>VS CORTEX</span>
          </button>
          <button
            onClick={() => {
              playSound('click');
              setMode('pvp');
              resetEntireTournament();
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase transition-all ${
              mode === 'pvp'
                ? 'bg-portal-pink text-black border border-black shadow-neo-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>2P PASS</span>
          </button>
        </div>

        {/* AI Difficulty Selector (Only in AI Mode) */}
        {mode === 'ai' && (
          <div className="flex items-center gap-1">
            {(['cadet', 'tactician', 'overthinker'] as AiDifficulty[]).map(d => (
              <button
                key={d}
                onClick={() => {
                  playSound('click');
                  setDifficulty(d);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-black transition-all ${
                  difficulty === d
                    ? d === 'overthinker'
                      ? 'bg-portal-pink text-black shadow-neo-sm'
                      : d === 'tactician'
                      ? 'bg-portal-yellow text-black shadow-neo-sm'
                      : 'bg-portal-lime text-black shadow-neo-sm'
                    : 'bg-portal-bg/60 text-slate-400 hover:text-slate-200'
                }`}
                title={`AI Difficulty: ${d.toUpperCase()}`}
              >
                {d === 'overthinker' ? 'BOSS' : d === 'tactician' ? 'TACTIC' : 'CADET'}
              </button>
            ))}
          </div>
        )}

        {/* Sound & Tactical Intel Shortcuts */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleHint}
            disabled={globalWinner !== null || isAiThinking}
            className="p-1.5 rounded-lg bg-portal-bg hover:bg-portal-yellow text-slate-300 hover:text-black border border-black transition-all disabled:opacity-30"
            title="Request Synaptic Move Hint"
          >
            <Lightbulb className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleUndo}
            disabled={moveHistory.length === 0 || globalWinner !== null || isAiThinking}
            className="p-1.5 rounded-lg bg-portal-bg hover:bg-portal-cyan text-slate-300 hover:text-black border border-black transition-all disabled:opacity-30"
            title="Tactical Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              playSound('click');
              setShowRulesModal(true);
            }}
            className="p-1.5 rounded-lg bg-portal-bg hover:bg-portal-pink text-slate-300 hover:text-black border border-black transition-all"
            title="Tactical Rules & Intel"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1.5 rounded-lg bg-portal-bg hover:bg-portal-purple text-slate-300 hover:text-white border border-black transition-all"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-portal-cyan" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* 2. Tactical Status HUD & Radar */}
      <div className="w-full max-w-[430px] flex items-center justify-between gap-2 px-3 py-2 mb-2 bg-portal-bg/95 border-2 border-black rounded-xl shadow-neo-sm">
        {/* Current Turn Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center font-black text-sm shadow-neo-sm transition-all ${
              currentTurn === 'X'
                ? 'bg-portal-cyan text-black animate-pulse'
                : 'bg-portal-pink text-black animate-pulse'
            }`}
          >
            {currentTurn}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
              {isAiThinking ? 'CORTEX COMPUTING' : 'CURRENT TURN'}
            </span>
            <span
              className={`text-xs font-black uppercase tracking-tight ${
                currentTurn === 'X' ? 'text-portal-cyan' : 'text-portal-pink'
              }`}
            >
              {mode === 'ai'
                ? currentTurn === 'X'
                  ? 'PLAYER [X]'
                  : 'CORTEX AI [O]'
                : currentTurn === 'X'
                ? 'PLAYER 1 [X]'
                : 'PLAYER 2 [O]'}
            </span>
          </div>
        </div>

        {/* Conquered Sectors Tally */}
        <div className="flex items-center gap-1.5 bg-portal-card px-2.5 py-1 rounded-lg border border-black">
          <div className="flex items-center gap-1 text-[11px] font-black text-portal-cyan">
            <span>X:</span>
            <span className="px-1 py-0.2 rounded bg-portal-cyan/20 border border-portal-cyan/50">{sectorCounts.x}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-[11px] font-black text-portal-pink">
            <span>O:</span>
            <span className="px-1 py-0.2 rounded bg-portal-pink/20 border border-portal-pink/50">{sectorCounts.o}</span>
          </div>
        </div>

        {/* Score / Streaks Badge */}
        <div className="text-right">
          <div className="text-[9px] font-black uppercase text-slate-400">SCORE / WINS</div>
          <div className="text-xs font-black text-portal-yellow flex items-center justify-end gap-1">
            <Trophy className="w-3 h-3 text-portal-yellow inline" />
            <span>{score.toLocaleString()}</span>
            {streak > 1 && (
              <span className="text-[9px] px-1 bg-portal-pink text-black font-black rounded border border-black">
                {streak}x
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Active Sector Radar / Routing Banner */}
      <div
        className={`w-full max-w-[430px] px-3 py-1.5 mb-2 rounded-xl border-2 border-black flex items-center justify-between text-xs font-black uppercase tracking-wide transition-all ${
          activeSector === null
            ? 'bg-portal-yellow text-black shadow-neo-sm animate-pulse'
            : 'bg-portal-card text-portal-yellow border-portal-yellow/80 shadow-neo-sm'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3.5 h-3.5 ${activeSector === null ? 'text-black animate-spin' : 'text-portal-yellow animate-pulse'}`} />
          <span>
            {activeSector === null
              ? '⚡ QUANTUM WARP: PLAY IN ANY OPEN SECTOR!'
              : `ACTIVE TARGET: SECTOR ${activeSector + 1} [${SECTOR_NAMES[activeSector]}]`}
          </span>
        </div>

        {/* Mini 3x3 Radar Grid Icon */}
        <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-black/80 rounded border border-black">
          {Array.from({ length: 9 }).map((_, idx) => {
            const isTarget = activeSector === null || activeSector === idx;
            const winner = sectorWinners[idx];
            return (
              <div
                key={idx}
                className={`w-2 h-2 rounded-[1px] transition-all ${
                  winner === 'X'
                    ? 'bg-portal-cyan'
                    : winner === 'O'
                    ? 'bg-portal-pink'
                    : winner === 'TIE'
                    ? 'bg-slate-500'
                    : isTarget
                    ? 'bg-portal-yellow animate-pulse'
                    : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 4. THE 9x9 NESTED MACRO GRID BOARD */}
      <div className="relative w-full max-w-[430px] aspect-square p-2 bg-portal-bg border-4 border-black rounded-2xl shadow-neo-lg flex items-center justify-center">
        {/* Outer 3x3 Macro Grid */}
        <div className="w-full h-full grid grid-cols-3 gap-2 bg-black/90 p-1.5 rounded-xl border-2 border-black">
          {Array.from({ length: 9 }).map((_, sectorIdx) => {
            const isSectorActive =
              globalWinner === null &&
              sectorWinners[sectorIdx] === null &&
              (activeSector === null || activeSector === sectorIdx);
            const winner = sectorWinners[sectorIdx];
            const isPartOfMacroWin = winningMacroLine?.includes(sectorIdx);

            return (
              <div
                key={sectorIdx}
                className={`relative rounded-xl p-1.5 transition-all duration-200 flex flex-col items-center justify-center border-2 ${
                  winner === 'X'
                    ? 'bg-portal-cyan/15 border-portal-cyan shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                    : winner === 'O'
                    ? 'bg-portal-pink/15 border-portal-pink shadow-[0_0_12px_rgba(255,0,128,0.25)]'
                    : winner === 'TIE'
                    ? 'bg-slate-800/80 border-slate-600'
                    : isSectorActive
                    ? 'bg-portal-card border-portal-yellow ring-4 ring-portal-yellow/70 shadow-[0_0_18px_rgba(255,222,89,0.4)] scale-[1.02] z-10'
                    : 'bg-portal-card/90 border-black/80 shadow-neo-sm'
                } ${isPartOfMacroWin ? 'ring-4 ring-portal-yellow scale-[1.04] z-20 animate-pulse' : ''}`}
              >
                {/* Active Sector Highlighting Badge */}
                {isSectorActive && winner === null && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-portal-yellow text-black font-black text-[7px] sm:text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-black shadow-neo-sm z-30 pointer-events-none flex items-center gap-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                    <span>PLAY HERE</span>
                  </div>
                )}

                {/* Micro 3x3 Grid inside Sector */}
                <div className="w-full h-full grid grid-cols-3 gap-1">
                  {macroBoard[sectorIdx].map((cellVal, cellIdx) => {
                    const isLast = lastMove?.sector === sectorIdx && lastMove?.cell === cellIdx;
                    const isHint = suggestedHint?.sector === sectorIdx && suggestedHint?.cell === cellIdx;
                    const isPlayable = isSectorActive && cellVal === null && !isAiThinking && globalWinner === null;

                    return (
                      <button
                        key={cellIdx}
                        onClick={() => handleCellClick(sectorIdx, cellIdx)}
                        disabled={!isPlayable}
                        className={`relative rounded-md flex items-center justify-center font-black text-xs sm:text-sm md:text-base transition-all border border-black ${
                          cellVal === 'X'
                            ? 'bg-portal-cyan text-black font-black shadow-neo-sm ring-1 ring-black'
                            : cellVal === 'O'
                            ? 'bg-portal-pink text-black font-black shadow-neo-sm ring-1 ring-black'
                            : isHint
                            ? 'bg-portal-yellow text-black animate-bounce ring-2 ring-portal-yellow shadow-neo-sm'
                            : isPlayable
                            ? 'bg-portal-bg hover:bg-portal-yellow hover:text-black hover:scale-105 active:scale-95 cursor-pointer shadow-neo-sm ring-1 ring-portal-yellow/40'
                            : 'bg-portal-bg text-slate-500 cursor-not-allowed border-black/40'
                        } ${isLast ? 'ring-2 ring-portal-yellow ring-offset-1 ring-offset-black' : ''}`}
                      >
                        {cellVal}
                      </button>
                    );
                  })}
                </div>

                {/* Macro Conquered Sector Overlay Stamp */}
                {winner !== null && (
                  <div
                    className={`absolute inset-0 rounded-lg flex flex-col items-center justify-center backdrop-blur-[1.5px] border-2 border-black z-20 transition-all ${
                      winner === 'X'
                        ? 'bg-portal-cyan/85 text-black shadow-neo-sm'
                        : winner === 'O'
                        ? 'bg-portal-pink/85 text-black shadow-neo-sm'
                        : 'bg-slate-800/90 text-slate-300'
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl font-black tracking-tighter drop-shadow-md">
                      {winner === 'TIE' ? '—' : winner}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-wider px-1 bg-black/40 text-white rounded">
                      {winner === 'TIE' ? 'TIED' : 'CONQUERED'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Global Game Over Winner Modal Overlay */}
        {globalWinner && (
          <div className="absolute inset-0 rounded-2xl bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-30 animate-scale-in border-4 border-black">
            <div
              className={`p-3 rounded-full border-2 border-black shadow-neo-md mb-2 ${
                globalWinner === 'X'
                  ? 'bg-portal-cyan text-black'
                  : globalWinner === 'O'
                  ? 'bg-portal-pink text-black'
                  : 'bg-portal-yellow text-black'
              }`}
            >
              {globalWinner === 'TIE' ? (
                <Layers className="w-8 h-8" />
              ) : (
                <Trophy className="w-8 h-8 animate-bounce" />
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-1 text-center">
              {globalWinner === 'TIE'
                ? 'QUANTUM STALEMATE!'
                : mode === 'ai'
                ? globalWinner === 'X'
                  ? 'VICTORY! OVERTHINKER DEFEATED'
                  : 'DEFEAT! CORTEX TRIUMPHS'
                : `PLAYER [${globalWinner}] TRIUMPHS!`}
            </h2>

            <p className="text-xs text-slate-300 text-center font-bold mb-3 max-w-[280px]">
              {globalWinner === 'TIE'
                ? 'All 9 sectors exhausted with balanced macro dominance.'
                : globalWinner === 'X'
                ? '3 Macro Sectors aligned in a row across the multidimensional grid.'
                : 'Cortex AI secured 3 macro sectors in alignment.'}
            </p>

            {/* Score Breakdown Pills */}
            <div className="flex items-center gap-2 mb-4 bg-portal-card px-3 py-1.5 rounded-xl border border-black shadow-neo-sm">
              <div className="text-center">
                <div className="text-[8px] uppercase text-slate-400 font-black">X SECTORS</div>
                <div className="text-xs font-black text-portal-cyan">{sectorCounts.x}</div>
              </div>
              <span className="text-slate-600">|</span>
              <div className="text-center">
                <div className="text-[8px] uppercase text-slate-400 font-black">O SECTORS</div>
                <div className="text-xs font-black text-portal-pink">{sectorCounts.o}</div>
              </div>
              <span className="text-slate-600">|</span>
              <div className="text-center">
                <div className="text-[8px] uppercase text-slate-400 font-black">TOTAL SCORE</div>
                <div className="text-xs font-black text-portal-yellow">{score.toLocaleString()}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full max-w-[280px]">
              <button
                onClick={handleNextRound}
                className="flex-1 py-2 px-3 rounded-xl bg-portal-yellow hover:bg-portal-yellow/90 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                <span>NEXT ROUND</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetEntireTournament}
                className="py-2 px-3 rounded-xl bg-portal-card hover:bg-portal-bg text-slate-200 hover:text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                title="Reset Match Score"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Bottom Navigation & Reset Footer */}
      <div className="w-full max-w-[430px] flex items-center justify-between gap-2 px-2 py-1 mt-2 text-[10px] text-slate-400 font-black uppercase">
        <div className="flex items-center gap-2">
          <span>ROUND: #{roundNumber}</span>
          <span>•</span>
          <span>
            RECORD: <strong className="text-portal-cyan">{p1Wins}W</strong> -{' '}
            <strong className="text-portal-pink">{p2Wins}L</strong> -{' '}
            <strong className="text-portal-yellow">{ties}T</strong>
          </span>
        </div>
        <button
          onClick={resetEntireTournament}
          className="hover:text-portal-pink transition-colors underline cursor-pointer"
        >
          RESET TOURNAMENT
        </button>
      </div>

      {/* 6. Tactical Intel & Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] bg-portal-card border-4 border-black rounded-2xl shadow-neo-lg p-4 animate-scale-in text-slate-100">
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-portal-yellow" />
                <h3 className="font-black text-base uppercase tracking-tight text-white">
                  MULTIDIMENSION XO RULES
                </h3>
              </div>
              <button
                onClick={() => {
                  playSound('click');
                  setShowRulesModal(false);
                }}
                className="p-1 rounded-lg bg-portal-bg hover:bg-portal-pink hover:text-black border border-black font-black text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 font-medium max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-2 bg-portal-bg rounded-lg border border-black">
                <strong className="text-portal-cyan font-black block mb-0.5">1. NESTED ROUTING MECHANIC</strong>
                Your move in a micro 3x3 square dictates which macro sector your opponent is sent to! If you play in cell #5 (center), your opponent MUST play in Sector #5 (Center).
              </div>

              <div className="p-2 bg-portal-bg rounded-lg border border-black">
                <strong className="text-portal-yellow font-black block mb-0.5">2. QUANTUM WARP FREEDOM</strong>
                If your move sends the opponent to a sector that is already conquered or full, they gain <strong>QUANTUM WARP</strong> and can place their mark in ANY open sector on the board!
              </div>

              <div className="p-2 bg-portal-bg rounded-lg border border-black">
                <strong className="text-portal-pink font-black block mb-0.5">3. MACRO CONQUEST VICTORY</strong>
                Conquer 3 local sectors in a row (horizontally, vertically, or diagonally) on the macro board to win the entire multidimensional match!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
