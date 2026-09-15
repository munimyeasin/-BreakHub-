'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Cpu,
  Users,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  Flame,
  Swords,
  Trophy,
  Shield,
  Bot
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuantumXOGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type CellValue = 'X' | 'O' | null;
type GameMode = 'ai' | 'pvp';
type AiDifficulty = 'cadet' | 'tactician' | 'overthinker';

export default function QuantumXOGame({ gameId, onGameOver }: QuantumXOGameProps) {
  // Game Setup
  const [mode, setMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('overthinker');
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));

  // Alternating First Move System
  // Round 1: 'X' moves first; Round 2: 'O' moves first; Round 3: 'X' moves first, etc.
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [startingPlayer, setStartingPlayer] = useState<'X' | 'O'>('X');
  const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<'X' | 'O' | 'TIE' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Score & Round Tracking
  const [p1Wins, setP1Wins] = useState<number>(0);
  const [p2Wins, setP2Wins] = useState<number>(0);
  const [ties, setTies] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Procedural Web Audio Sound Engine
  const playSound = useCallback(
    (type: 'move_x' | 'move_o' | 'win' | 'lose' | 'tie' | 'click') => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        if (!audioCtxRef.current) {
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
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (type === 'move_x') {
          // Punchy laser snap for X (Electric Cyan)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
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
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'win') {
          // Triumphant 4-note Neo-Brutalist arpeggio
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = i === 3 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.07);
            gain.gain.setValueAtTime(0.2, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.35);
          });
        } else if (type === 'lose') {
          // Harsh downward glitch distortion
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.linearRampToValueAtTime(90, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'tie') {
          // Dual neutral chord
          [440, 554.37].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
          });
        }
      } catch {}
    },
    [soundEnabled]
  );

  // Check Win Condition
  const checkWinner = (squares: CellValue[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // Rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // Columns
      [0, 4, 8],
      [2, 4, 6] // Diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a] as 'X' | 'O', line: [a, b, c] };
      }
    }
    if (squares.every(sq => sq !== null)) {
      return { winner: 'TIE' as const, line: null };
    }
    return null;
  };

  // Minimax Algorithm with Alpha-Beta Pruning for Unbeatable Overthinker AI
  const minimax = (
    currentBoard: CellValue[],
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number
  ): number => {
    const result = checkWinner(currentBoard);
    if (result) {
      if (result.winner === 'O') return 10 - depth;
      if (result.winner === 'X') return depth - 10;
      return 0; // TIE
    }
    if (depth >= 6) return 0; // Depth limiter for speed

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!currentBoard[i]) {
          currentBoard[i] = 'O';
          const evaluation = minimax(currentBoard, depth + 1, false, alpha, beta);
          currentBoard[i] = null;
          maxEval = Math.max(maxEval, evaluation);
          alpha = Math.max(alpha, evaluation);
          if (beta <= alpha) break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!currentBoard[i]) {
          currentBoard[i] = 'X';
          const evaluation = minimax(currentBoard, depth + 1, true, alpha, beta);
          currentBoard[i] = null;
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  };

  // AI Move Selector
  const getAiMove = (squares: CellValue[]): number => {
    const available = squares
      .map((v, i) => (v === null ? i : null))
      .filter((v): v is number => v !== null);

    if (available.length === 0) return -1;

    // 1. Cadet Mode (Novice): 65% random, 35% basic block
    if (difficulty === 'cadet') {
      // Check for immediate win
      for (const idx of available) {
        const copy = [...squares];
        copy[idx] = 'O';
        if (checkWinner(copy)?.winner === 'O') return idx;
      }
      // Occasional block
      if (Math.random() < 0.4) {
        for (const idx of available) {
          const copy = [...squares];
          copy[idx] = 'X';
          if (checkWinner(copy)?.winner === 'X') return idx;
        }
      }
      return available[Math.floor(Math.random() * available.length)];
    }

    // 2. Tactician Mode (Intermediate): Heuristics
    if (difficulty === 'tactician') {
      // Win if possible
      for (const idx of available) {
        const copy = [...squares];
        copy[idx] = 'O';
        if (checkWinner(copy)?.winner === 'O') return idx;
      }
      // Block opponent win
      for (const idx of available) {
        const copy = [...squares];
        copy[idx] = 'X';
        if (checkWinner(copy)?.winner === 'X') return idx;
      }
      // Center control
      if (!squares[4]) return 4;
      // Corners
      const corners = [0, 2, 6, 8].filter(idx => !squares[idx]);
      if (corners.length > 0 && Math.random() < 0.75) {
        return corners[Math.floor(Math.random() * corners.length)];
      }
      return available[Math.floor(Math.random() * available.length)];
    }

    // 3. Overthinker Mode (Minimax Engine): Optimal Play
    let bestScore = -Infinity;
    let bestMove = available[0];

    // Opening fast-path when AI starts first on empty board
    if (available.length === 9) {
      // Strategic corner opening
      const openingMoves = [0, 2, 6, 8, 4];
      return openingMoves[Math.floor(Math.random() * openingMoves.length)];
    }

    for (const idx of available) {
      squares[idx] = 'O';
      const moveScore = minimax(squares, 0, false, -Infinity, Infinity);
      squares[idx] = null;
      if (moveScore > bestScore) {
        bestScore = moveScore;
        bestMove = idx;
      }
    }

    return bestMove;
  };

  // AI Turn Execution
  const triggerAiTurn = useCallback(
    (currentBoard: CellValue[]) => {
      setIsAiThinking(true);
      const delay = Math.floor(Math.random() * 200) + 320; // 320ms - 520ms realistic compute delay

      setTimeout(() => {
        const aiIndex = getAiMove(currentBoard);
        if (aiIndex !== -1 && aiIndex !== undefined) {
          const nextBoard = [...currentBoard];
          nextBoard[aiIndex] = 'O';
          setBoard(nextBoard);
          playSound('move_o');

          const aiWinResult = checkWinner(nextBoard);
          if (aiWinResult) {
            setWinner(aiWinResult.winner);
            setWinningLine(aiWinResult.line);
            if (aiWinResult.winner === 'O') {
              setP2Wins(prev => prev + 1);
              setStreak(0);
              playSound('lose');
            } else if (aiWinResult.winner === 'TIE') {
              const addedScore = 150;
              const newScore = score + addedScore;
              setScore(newScore);
              setTies(prev => prev + 1);
              playSound('tie');
              setTimeout(() => onGameOver(newScore), 50);
            }
          } else {
            // Hand turn back to Player ('X')
            setCurrentTurn('X');
          }
        }
        setIsAiThinking(false);
      }, delay);
    },
    [difficulty, score, onGameOver, playSound]
  );

  // Trigger AI opening move if it's AI's turn at the start of a round
  useEffect(() => {
    if (mode === 'ai' && currentTurn === 'O' && !winner && !isAiThinking) {
      const isBoardEmpty = board.every(cell => cell === null);
      if (isBoardEmpty) {
        triggerAiTurn(board);
      }
    }
  }, [mode, currentTurn, winner, isAiThinking, board, triggerAiTurn]);

  // Handle User Cell Click
  const handleCellClick = (idx: number) => {
    if (board[idx] || winner || isAiThinking) return;

    if (mode === 'pvp') {
      // 2-Player Local Pass & Play
      const newBoard = [...board];
      newBoard[idx] = currentTurn;
      setBoard(newBoard);
      playSound(currentTurn === 'X' ? 'move_x' : 'move_o');

      const winResult = checkWinner(newBoard);
      if (winResult) {
        setWinner(winResult.winner);
        setWinningLine(winResult.line);
        if (winResult.winner === 'X') {
          setP1Wins(prev => prev + 1);
          playSound('win');
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } else if (winResult.winner === 'O') {
          setP2Wins(prev => prev + 1);
          playSound('win');
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } else {
          setTies(prev => prev + 1);
          playSound('tie');
        }
      } else {
        // Switch Turn
        setCurrentTurn(prev => (prev === 'X' ? 'O' : 'X'));
      }
    } else {
      // Player vs AI: Only Player ('X') can click
      if (currentTurn !== 'X') return;

      const newBoard = [...board];
      newBoard[idx] = 'X';
      setBoard(newBoard);
      playSound('move_x');

      const winResult = checkWinner(newBoard);
      if (winResult) {
        setWinner(winResult.winner);
        setWinningLine(winResult.line);
        if (winResult.winner === 'X') {
          const difficultyMultiplier = difficulty === 'overthinker' ? 3 : difficulty === 'tactician' ? 2 : 1;
          const streakBonus = streak * 150;
          const addedScore = (500 + p1Wins * 200) * difficultyMultiplier + streakBonus;
          const newScore = score + addedScore;
          setScore(newScore);
          setP1Wins(prev => prev + 1);
          setStreak(prev => prev + 1);
          playSound('win');
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => onGameOver(newScore), 50);
        } else if (winResult.winner === 'TIE') {
          const addedScore = 150;
          const newScore = score + addedScore;
          setScore(newScore);
          setTies(prev => prev + 1);
          playSound('tie');
          setTimeout(() => onGameOver(newScore), 50);
        }
        return;
      }

      // Hand off turn to AI ('O')
      setCurrentTurn('O');
      triggerAiTurn(newBoard);
    }
  };

  // Start Next Round with Alternating First Move
  const handleStartNextRound = () => {
    playSound('click');
    const nextRound = roundNumber + 1;
    // Alternating formula: toggle between 'X' and 'O'
    const nextStarter: 'X' | 'O' = startingPlayer === 'X' ? 'O' : 'X';

    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setRoundNumber(nextRound);
    setStartingPlayer(nextStarter);
    setCurrentTurn(nextStarter);
    setIsAiThinking(false);
  };

  // Hard Reset Entire Match
  const resetEntireMatch = () => {
    playSound('click');
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setRoundNumber(1);
    setStartingPlayer('X');
    setCurrentTurn('X');
    setIsAiThinking(false);
    setP1Wins(0);
    setP2Wins(0);
    setTies(0);
    setStreak(0);
  };

  // Switch Game Mode
  const handleSwitchMode = (newMode: GameMode) => {
    if (newMode === mode) return;
    playSound('click');
    setMode(newMode);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setRoundNumber(1);
    setStartingPlayer('X');
    setCurrentTurn('X');
    setIsAiThinking(false);
    setP1Wins(0);
    setP2Wins(0);
    setTies(0);
    setStreak(0);
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[460px] text-white">
      {/* 1. NEO-BRUTALIST TOP TELEMETRY & CONTROLS DECK */}
      <div className="w-full bg-portal-surface border-4 border-black rounded-2xl p-3 shadow-neo-md mb-3 space-y-2.5">
        {/* Row 1: Mode Switcher & Audio Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* 2-Mode Segmented Switch */}
          <div className="flex items-center bg-black p-1 rounded-xl border-2 border-black">
            <button
              type="button"
              onClick={() => handleSwitchMode('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                mode === 'ai'
                  ? 'bg-portal-yellow text-black shadow-neo-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>VS AI Boss</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('pvp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                mode === 'pvp'
                  ? 'bg-portal-cyan text-black shadow-neo-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>2P Local</span>
            </button>
          </div>

          {/* Audio & Reset Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-2 rounded-xl bg-portal-card hover:bg-portal-yellow hover:text-black text-slate-300 border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              title={soundEnabled ? 'Mute SFX' : 'Unmute SFX'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-500" />
              )}
            </button>
            <button
              type="button"
              onClick={resetEntireMatch}
              className="p-2 rounded-xl bg-portal-card hover:bg-portal-pink hover:text-black text-slate-300 border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              title="Reset Full Tournament"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Row 2: AI Difficulty Selector (Only in VS AI Mode) */}
        {mode === 'ai' && (
          <div className="flex items-center justify-between pt-1 border-t-2 border-black/40">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Bot className="w-3 h-3 text-portal-yellow" /> AI DIFFICULTY:
            </span>
            <div className="flex items-center gap-1">
              {(['cadet', 'tactician', 'overthinker'] as AiDifficulty[]).map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setDifficulty(diff);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border-2 border-black transition-all ${
                    difficulty === diff
                      ? diff === 'overthinker'
                        ? 'bg-portal-pink text-black shadow-neo-sm scale-105'
                        : diff === 'tactician'
                        ? 'bg-portal-cyan text-black shadow-neo-sm scale-105'
                        : 'bg-portal-lime text-black shadow-neo-sm scale-105'
                      : 'bg-portal-card text-slate-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Live Scoreboards with Neo-Brutalist Badges */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t-2 border-black/40">
          <div className="p-2 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-portal-cyan border border-black inline-block" />
              <span className="text-[10px] font-black uppercase text-portal-cyan">
                {mode === 'ai' ? 'PLAYER (X)' : 'P1 (X)'}
              </span>
            </div>
            <span className="text-base font-black text-white font-mono mt-0.5">{p1Wins}</span>
          </div>

          <div className="p-2 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-slate-400">TIES</span>
            <span className="text-base font-black text-slate-300 font-mono mt-0.5">{ties}</span>
          </div>

          <div className="p-2 rounded-xl bg-portal-card border-2 border-black shadow-neo-sm flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-portal-pink border border-black inline-block" />
              <span className="text-[10px] font-black uppercase text-portal-pink">
                {mode === 'ai' ? 'AI BOSS (O)' : 'P2 (O)'}
              </span>
            </div>
            <span className="text-base font-black text-white font-mono mt-0.5">{p2Wins}</span>
          </div>
        </div>
      </div>

      {/* 2. NEO-BRUTALIST 3X3 GAME ARENA */}
      <div className="relative w-full bg-portal-surface border-4 border-black rounded-3xl p-4 sm:p-5 shadow-neo-lg flex flex-col items-center justify-between overflow-hidden">
        {/* Top Turn & Alternating Indicator Banner */}
        <div className="w-full flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-portal-card border-2 border-black text-[10px] font-black uppercase text-portal-yellow shadow-neo-sm">
              ROUND {roundNumber}
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400 hidden xs:inline">
              1ST MOVE: <strong className="text-portal-cyan">{startingPlayer}</strong> (ALT)
            </span>
          </div>

          {/* Active Turn Badge */}
          {!winner ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black text-[11px] font-black uppercase shadow-neo-sm transition-all ${
                currentTurn === 'X'
                  ? 'bg-portal-cyan text-black'
                  : 'bg-portal-pink text-black'
              }`}
            >
              <Zap className="w-3 h-3 fill-current stroke-[2.5]" />
              <span>
                {mode === 'pvp'
                  ? currentTurn === 'X'
                    ? 'Player 1 (X) Turn'
                    : 'Player 2 (O) Turn'
                  : isAiThinking
                  ? 'AI Calculating...'
                  : currentTurn === 'X'
                  ? 'Your Turn (X)'
                  : 'AI Turn (O)'}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-portal-yellow text-black border-2 border-black text-[11px] font-black uppercase shadow-neo-sm flex items-center gap-1">
              <Trophy className="w-3 h-3 stroke-[2.5]" />
              <span>ROUND OVER</span>
            </div>
          )}
        </div>

        {/* 3x3 Chunky Neo-Brutalist Grid */}
        <div className="w-full aspect-square max-w-[340px] grid grid-cols-3 gap-3 p-3 bg-black rounded-2xl border-4 border-black shadow-inner my-2">
          {board.map((cell, idx) => {
            const isWinningCell = winningLine?.includes(idx);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(idx)}
                disabled={!!cell || !!winner || (mode === 'ai' && (currentTurn !== 'X' || isAiThinking))}
                className={`relative rounded-2xl flex items-center justify-center font-black text-5xl sm:text-6xl transition-all border-3 border-black select-none ${
                  cell === 'X'
                    ? isWinningCell
                      ? 'bg-portal-yellow text-black shadow-[4px_4px_0px_#000000] scale-105 ring-4 ring-portal-cyan z-10 animate-bounce'
                      : 'bg-portal-cyan text-black shadow-neo-md hover:scale-100'
                    : cell === 'O'
                    ? isWinningCell
                      ? 'bg-portal-yellow text-black shadow-[4px_4px_0px_#000000] scale-105 ring-4 ring-portal-pink z-10 animate-bounce'
                      : 'bg-portal-pink text-black shadow-neo-md hover:scale-100'
                    : 'bg-portal-card hover:bg-portal-surface text-slate-600 hover:border-portal-cyan hover:shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5'
                }`}
              >
                {cell && (
                  <span className="transform drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                    {cell}
                  </span>
                )}
                {!cell && !winner && (
                  <span className="opacity-0 hover:opacity-20 text-3xl font-mono transition-opacity">
                    {currentTurn}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Alternating Notification Strip */}
        <div className="w-full text-center mt-2 px-2 py-1 bg-portal-card border-2 border-black rounded-xl shadow-neo-sm">
          <p className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
            {mode === 'pvp' ? (
              <span>
                Alternating First Move: Round {roundNumber} started by{' '}
                <strong className="text-portal-cyan">{startingPlayer}</strong> ➔ Next:{' '}
                <strong className="text-portal-pink">{startingPlayer === 'X' ? 'O' : 'X'}</strong>
              </span>
            ) : (
              <span>
                {startingPlayer === 'X' ? '⚡ You had the 1st move' : '🤖 AI had the 1st move'} ➔
                Next round 1st move:{' '}
                <strong className="text-portal-yellow">
                  {startingPlayer === 'X' ? 'AI (O)' : 'YOU (X)'}
                </strong>
              </span>
            )}
          </p>
        </div>

        {/* 3. NEO-BRUTALIST ROUND OUTCOME OVERLAY */}
        {winner && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-4 animate-scaleIn z-20 border-4 border-black">
            {/* Top Hazard Stripe */}
            <div className="w-full h-2 bg-gradient-to-r from-portal-yellow via-portal-pink to-portal-cyan border-y-2 border-black" />

            <div className="text-center space-y-2 max-w-sm">
              <div className="text-2xl sm:text-3xl font-black uppercase tracking-wide">
                {winner === 'X' ? (
                  <div className="p-3 rounded-2xl bg-portal-cyan text-black border-4 border-black shadow-neo-lg flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 stroke-[3]" />
                    <span>{mode === 'pvp' ? 'Player 1 (X) Wins!' : 'Victory! You Win!'}</span>
                  </div>
                ) : winner === 'O' ? (
                  <div className="p-3 rounded-2xl bg-portal-pink text-black border-4 border-black shadow-neo-lg flex items-center justify-center gap-2">
                    <Swords className="w-6 h-6 stroke-[3]" />
                    <span>{mode === 'pvp' ? 'Player 2 (O) Wins!' : 'AI Boss Outsmarted You!'}</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-portal-surface text-portal-yellow border-4 border-black shadow-neo-lg flex items-center justify-center gap-2">
                    <span>🤝 Quantum Stalemate Draw!</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-portal-card border-2 border-black text-xs space-y-1">
                <p className="font-black text-white">
                  {mode === 'pvp'
                    ? `Tournament Score: P1 [${p1Wins}] — P2 [${p2Wins}]`
                    : winner === 'X'
                    ? `+${500 + p1Wins * 200} High Score Points Added!`
                    : winner === 'TIE'
                    ? '+150 Draw Bonus Points Added!'
                    : 'No points awarded. Take revenge next round!'}
                </p>
                <p className="text-[11px] font-black uppercase text-portal-yellow">
                  Round {roundNumber + 1} Opening Move goes to:{' '}
                  <span className="text-portal-cyan underline">
                    {startingPlayer === 'X'
                      ? mode === 'ai'
                        ? 'AI (O)'
                        : 'Player 2 (O)'
                      : mode === 'ai'
                      ? 'You (X)'
                      : 'Player 1 (X)'}
                  </span>
                </p>
              </div>
            </div>

            {/* Next Round CTA Button */}
            <button
              type="button"
              onClick={handleStartNextRound}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-sm uppercase border-4 border-black shadow-neo-md hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              <span>
                Start Round {roundNumber + 1} ({startingPlayer === 'X' ? 'O Starts' : 'X Starts'})
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
