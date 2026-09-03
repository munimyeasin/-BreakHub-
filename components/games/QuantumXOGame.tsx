'use client';

import React, { useState } from 'react';
import { RotateCcw, Cpu, User, Users, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuantumXOGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type CellValue = 'X' | 'O' | null;
type GameMode = 'ai' | 'pvp';

export default function QuantumXOGame({ gameId, onGameOver }: QuantumXOGameProps) {
  const [mode, setMode] = useState<GameMode>('pvp'); // default to 2P local mode or switchable
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<'X' | 'O' | 'TIE' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Scores
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [ties, setTies] = useState(0);
  const [score, setScore] = useState(0); // For vs AI leaderboard

  const checkWinner = (squares: CellValue[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
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

  const getBestMove = (squares: CellValue[]): number => {
    // 1. Can AI Win?
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const copy = [...squares];
        copy[i] = 'O';
        const res = checkWinner(copy);
        if (res && res.winner === 'O') return i;
      }
    }
    // 2. Can Player Win? Block them
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const copy = [...squares];
        copy[i] = 'X';
        const res = checkWinner(copy);
        if (res && res.winner === 'X') return i;
      }
    }
    // 3. Take Center
    if (!squares[4]) return 4;
    // 4. Random available
    const available = squares.map((v, i) => (v === null ? i : null)).filter(v => v !== null) as number[];
    return available[Math.floor(Math.random() * available.length)];
  };

  const handleCellClick = (idx: number) => {
    if (board[idx] || winner || isAiThinking) return;

    if (mode === 'pvp') {
      // 2 Players on same device
      const newBoard = [...board];
      newBoard[idx] = currentTurn;
      setBoard(newBoard);

      const winResult = checkWinner(newBoard);
      if (winResult) {
        setWinner(winResult.winner);
        setWinningLine(winResult.line);
        if (winResult.winner === 'X') {
          setP1Wins(prev => prev + 1);
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } else if (winResult.winner === 'O') {
          setP2Wins(prev => prev + 1);
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } else {
          setTies(prev => prev + 1);
        }
      } else {
        setCurrentTurn(prev => (prev === 'X' ? 'O' : 'X'));
      }
    } else {
      // 1 Player vs AI
      if (currentTurn !== 'X') return;

      const newBoard = [...board];
      newBoard[idx] = 'X';
      setBoard(newBoard);

      const winResult = checkWinner(newBoard);
      if (winResult) {
        setWinner(winResult.winner);
        setWinningLine(winResult.line);
        if (winResult.winner === 'X') {
          const added = 500 + p1Wins * 200;
          const newScore = score + added;
          setScore(newScore);
          setP1Wins(prev => prev + 1);
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          setTimeout(() => onGameOver(newScore), 0);
        } else if (winResult.winner === 'TIE') {
          const newScore = score + 100;
          setScore(newScore);
          setTies(prev => prev + 1);
          setTimeout(() => onGameOver(newScore), 0);
        }
        return;
      }

      // AI Move
      setCurrentTurn('O');
      setIsAiThinking(true);
      setTimeout(() => {
        const aiIndex = getBestMove(newBoard);
        if (aiIndex !== -1) {
          newBoard[aiIndex] = 'O';
          setBoard(newBoard);
          const aiWinResult = checkWinner(newBoard);
          if (aiWinResult) {
            setWinner(aiWinResult.winner);
            setWinningLine(aiWinResult.line);
            if (aiWinResult.winner === 'O') {
              setP2Wins(prev => prev + 1);
            } else if (aiWinResult.winner === 'TIE') {
              const newScore = score + 100;
              setScore(newScore);
              setTies(prev => prev + 1);
              setTimeout(() => onGameOver(newScore), 0);
            }
          } else {
            setCurrentTurn('X');
          }
        }
        setIsAiThinking(false);
      }, 400);
    }
  };

  const resetRound = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setCurrentTurn('X');
    setIsAiThinking(false);
  };

  const switchMode = (newMode: GameMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setCurrentTurn('X');
    setIsAiThinking(false);
    setP1Wins(0);
    setP2Wins(0);
    setTies(0);
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* 1. ULTRA SLIM TOP CONTROLS & HUD */}
      <div className="w-full flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => switchMode(mode === 'pvp' ? 'ai' : 'pvp')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-portal-card border border-portal-border text-[10px] font-black text-portal-cyan hover:bg-portal-card/80"
          >
            {mode === 'pvp' ? <Users className="w-3 h-3 text-portal-cyan" /> : <Cpu className="w-3 h-3 text-purple-400" />}
            <span>{mode === 'pvp' ? '2P Pass' : 'vs Overthinker'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-black">
          <span className="text-portal-cyan text-[11px]">You (X): {p1Wins}</span>
          <span className="text-slate-400 text-[10px]">T: {ties}</span>
          <span className="text-rose-400 text-[11px]">{mode === 'ai' ? 'Boss (O): ' : 'P2 (O): '}{p2Wins}</span>
        </div>

        <button
          onClick={resetRound}
          className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60"
          title="Reset Grid"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. 9:16 PORTRAIT ARENA */}
      <div className="relative w-full aspect-[9/16] bg-portal-bg rounded-2xl border-2 border-portal-border p-3 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
        {/* Turn Status Badge */}
        <div className="w-full flex items-center justify-center py-1">
          {!winner ? (
            <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-portal-surface/90 border border-portal-border text-[11px] font-black">
              <span className={`w-2 h-2 rounded-full animate-ping ${currentTurn === 'X' ? 'bg-portal-cyan' : 'bg-rose-500'}`} />
              <span className={currentTurn === 'X' ? 'text-portal-cyan' : 'text-rose-400'}>
                {mode === 'pvp' ? (currentTurn === 'X' ? 'Player 1 Turn (X)' : 'Player 2 Turn (O)') : (isAiThinking ? 'Overthinker Final Boss is Calculating...' : 'Your Turn (X)')}
              </span>
            </div>
          ) : (
            <div className="text-[11px] font-black text-portal-gold">Round Finished</div>
          )}
        </div>

        {/* 3x3 Centered Grid */}
        <div className="w-full max-w-[320px] aspect-square grid grid-cols-3 gap-2.5 p-2 bg-portal-surface/40 rounded-2xl border border-portal-border/50 shadow-inner my-auto">
          {board.map((cell, idx) => {
            const isWinningCell = winningLine?.includes(idx);

            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                disabled={!!cell || !!winner || (mode === 'ai' && isAiThinking)}
                className={`rounded-2xl flex items-center justify-center font-black text-4xl sm:text-5xl transition-all border ${
                  cell === 'X'
                    ? isWinningCell
                      ? 'bg-cyan-500/30 border-portal-cyan text-portal-cyan shadow-glow-cyan scale-105 ring-2 ring-portal-cyan'
                      : 'bg-cyan-500/10 border-portal-cyan text-portal-cyan shadow-glow-cyan'
                    : cell === 'O'
                    ? isWinningCell
                      ? 'bg-rose-500/30 border-rose-500 text-rose-400 shadow-[0_0_20px_-2px_rgba(244,63,94,0.6)] scale-105 ring-2 ring-rose-500'
                      : 'bg-rose-500/10 border-rose-500 text-rose-400'
                    : 'bg-portal-surface border-portal-border hover:border-portal-cyan/50 active:scale-95'
                }`}
              >
                {cell}
              </button>
            );
          })}
        </div>

        {/* Bottom Helper Hint */}
        <div className="w-full text-center py-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {mode === 'pvp' ? 'Tap grid to play with friend' : 'Single Player vs Overthinker Final Boss'}
          </p>
        </div>

        {/* Game End Overlay */}
        {winner && (
          <div className="absolute inset-0 bg-portal-bg/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-4 animate-scaleIn">
            <div className="text-center space-y-1">
              <div className="text-2xl font-black">
                {winner === 'X' ? (
                  <span className="text-portal-cyan flex items-center justify-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-portal-cyan" />
                    {mode === 'pvp' ? 'Player 1 (X) Wins!' : 'Victory! You Defeated Overthinker Final Boss!'}
                  </span>
                ) : winner === 'O' ? (
                  <span className="text-rose-400 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-rose-400" />
                    {mode === 'pvp' ? 'Player 2 (O) Wins!' : 'Overthinker Final Boss Defeated You!'}
                  </span>
                ) : (
                  <span className="text-slate-300">🤝 It&apos;s a Draw!</span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {mode === 'pvp'
                  ? `Match Score: P1 (${p1Wins}) — P2 (${p2Wins})`
                  : winner === 'X'
                  ? `+500 Points Added to Leaderboard!`
                  : `Try again to beat Overthinker Final Boss!`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetRound}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-portal-cyan to-blue-600 text-black font-black text-xs shadow-glow-cyan active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Next Round
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
