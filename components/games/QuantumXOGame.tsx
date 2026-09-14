'use client';

import React, { useState, useCallback, useRef } from 'react';
import { RotateCcw, Cpu, Users, Sparkles, Volume2, VolumeX, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuantumXOGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

type CellValue = 'X' | 'O' | null;
type GameMode = 'ai' | 'pvp';

export default function QuantumXOGame({ gameId, onGameOver }: QuantumXOGameProps) {
  // Default to Player vs AI (Overthinker Boss)
  const [mode, setMode] = useState<GameMode>('ai');
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));

  // Round-robin turns: Player ('X') always makes the first move
  const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
  const [roundNumber, setRoundNumber] = useState(1);
  const [winner, setWinner] = useState<'X' | 'O' | 'TIE' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scores
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [ties, setTies] = useState(0);
  const [score, setScore] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'move_x' | 'move_o' | 'win' | 'lose' | 'tie') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'move_x') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'move_o') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
          g.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
          o.start(ctx.currentTime + i * 0.08);
          o.stop(ctx.currentTime + i * 0.08 + 0.2);
        });
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'tie') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(350, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {}
  }, [soundEnabled]);

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
    // 1. Can AI Win right now?
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const copy = [...squares];
        copy[i] = 'O';
        const res = checkWinner(copy);
        if (res && res.winner === 'O') return i;
      }
    }
    // 2. Can Player Win on next turn? Block them
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const copy = [...squares];
        copy[i] = 'X';
        const res = checkWinner(copy);
        if (res && res.winner === 'X') return i;
      }
    }
    // 3. Take Center position if open
    if (!squares[4]) return 4;

    // 4. Take Opposite Corners or Any Corner
    const corners = [0, 2, 6, 8].filter(idx => !squares[idx]);
    if (corners.length > 0 && Math.random() < 0.7) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    // 5. Pick remaining available square
    const available = squares.map((v, i) => (v === null ? i : null)).filter(v => v !== null) as number[];
    return available[Math.floor(Math.random() * available.length)];
  };

  const handleCellClick = (idx: number) => {
    if (board[idx] || winner || isAiThinking) return;

    if (mode === 'pvp') {
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
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } else if (winResult.winner === 'O') {
          setP2Wins(prev => prev + 1);
          playSound('win');
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } else {
          setTies(prev => prev + 1);
          playSound('tie');
        }
      } else {
        setCurrentTurn(prev => (prev === 'X' ? 'O' : 'X'));
      }
    } else {
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
          const added = 500 + p1Wins * 200;
          const newScore = score + added;
          setScore(newScore);
          setP1Wins(prev => prev + 1);
          playSound('win');
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          setTimeout(() => onGameOver(newScore), 50);
        } else if (winResult.winner === 'TIE') {
          const newScore = score + 100;
          setScore(newScore);
          setTies(prev => prev + 1);
          playSound('tie');
          setTimeout(() => onGameOver(newScore), 50);
        }
        return;
      }

      setCurrentTurn('O');
      setIsAiThinking(true);

      setTimeout(() => {
        const aiIndex = getBestMove(newBoard);
        if (aiIndex !== -1 && aiIndex !== undefined) {
          newBoard[aiIndex] = 'O';
          setBoard(newBoard);
          playSound('move_o');

          const aiWinResult = checkWinner(newBoard);
          if (aiWinResult) {
            setWinner(aiWinResult.winner);
            setWinningLine(aiWinResult.line);
            if (aiWinResult.winner === 'O') {
              setP2Wins(prev => prev + 1);
              playSound('lose');
            } else if (aiWinResult.winner === 'TIE') {
              const newScore = score + 100;
              setScore(newScore);
              setTies(prev => prev + 1);
              playSound('tie');
              setTimeout(() => onGameOver(newScore), 50);
            }
          } else {
            setCurrentTurn('X');
          }
        }
        setIsAiThinking(false);
      }, 350);
    }
  };

  const resetRound = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setCurrentTurn('X');
    setIsAiThinking(false);
    setRoundNumber(prev => prev + 1);
  };

  const switchMode = (newMode: GameMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setCurrentTurn('X');
    setIsAiThinking(false);
    setRoundNumber(1);
    setP1Wins(0);
    setP2Wins(0);
    setTies(0);
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Top Neo-Brutalist HUD Strip */}
      <div className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border-3 border-black mb-2.5 shadow-neo-sm">
        <button
          type="button"
          onClick={() => switchMode(mode === 'pvp' ? 'ai' : 'pvp')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-neo-xs transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none ${
            mode === 'ai'
              ? 'bg-portal-yellow text-black'
              : 'bg-portal-cyan text-black'
          }`}
        >
          {mode === 'ai' ? <Cpu className="w-3.5 h-3.5 stroke-[2.5]" /> : <Users className="w-3.5 h-3.5 stroke-[2.5]" />}
          <span>{mode === 'ai' ? 'VS AI BOSS' : '2P LOCAL'}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-black">
          <span className="bg-portal-cyan text-black border-2 border-black px-2 py-0.5 rounded-md text-[10px] shadow-neo-xs">
            X: {p1Wins}
          </span>
          <span className="bg-slate-100 text-black border-2 border-black px-1.5 py-0.5 rounded-md text-[10px]">
            T: {ties}
          </span>
          <span className="bg-portal-pink text-black border-2 border-black px-2 py-0.5 rounded-md text-[10px] shadow-neo-xs">
            O: {p2Wins}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[2.5] text-slate-400" />}
          </button>
          <button
            type="button"
            onClick={resetRound}
            className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
            title="Reset Grid"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 9:16 Portrait Arena with Figma Handles */}
      <div className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl border-4 border-black p-4 shadow-neo-lg flex flex-col items-center justify-between overflow-hidden">
        {/* Figma Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        {/* Turn Status Badge & Round Indicator */}
        <div className="w-full flex items-center justify-between px-1 py-1 z-10">
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider bg-white border-2 border-black px-2 py-0.5 rounded-md shadow-neo-xs">
            Round {roundNumber}
          </span>

          {!winner ? (
            <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-white border-2 border-black text-[11px] font-black shadow-neo-xs text-black">
              <span className={`w-2 h-2 rounded-full border border-black ${currentTurn === 'X' ? 'bg-portal-cyan animate-ping' : 'bg-portal-pink animate-pulse'}`} />
              <span>
                {mode === 'pvp'
                  ? (currentTurn === 'X' ? 'Player 1 Turn (X)' : 'Player 2 Turn (O)')
                  : (isAiThinking ? 'AI Thinking...' : 'Your Move (X)')}
              </span>
            </div>
          ) : (
            <div className="text-[11px] font-black text-black bg-portal-yellow border-2 border-black px-2.5 py-0.5 rounded-md shadow-neo-xs">
              ROUND OVER
            </div>
          )}

          <span className="text-[10px] font-black text-slate-700 uppercase bg-white border-2 border-black px-2 py-0.5 rounded-md shadow-neo-xs">
            {mode === 'ai' ? 'P VS AI' : '2P LOCAL'}
          </span>
        </div>

        {/* 3x3 Centered Neo-Brutalist Grid */}
        <div className="w-full max-w-[320px] aspect-square grid grid-cols-3 gap-3 p-3 bg-white rounded-2xl border-3 border-black shadow-neo my-auto">
          {board.map((cell, idx) => {
            const isWinningCell = winningLine?.includes(idx);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(idx)}
                disabled={!!cell || !!winner || (mode === 'ai' && (currentTurn !== 'X' || isAiThinking))}
                className={`rounded-2xl flex items-center justify-center font-black text-4xl sm:text-5xl transition-all border-3 border-black ${
                  cell === 'X'
                    ? isWinningCell
                      ? 'bg-portal-yellow text-black shadow-neo-lg scale-105 ring-4 ring-black'
                      : 'bg-portal-cyan text-black shadow-neo'
                    : cell === 'O'
                    ? isWinningCell
                      ? 'bg-portal-yellow text-black shadow-neo-lg scale-105 ring-4 ring-black'
                      : 'bg-portal-pink text-black shadow-neo'
                    : 'bg-slate-50 shadow-neo-xs hover:bg-portal-butter active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
                }`}
              >
                {cell}
              </button>
            );
          })}
        </div>

        {/* Bottom Helper Hint */}
        <div className="w-full text-center py-1 z-10">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-wider bg-white/80 border border-black/30 px-2 py-0.5 rounded inline-block">
            {mode === 'pvp'
              ? 'Round-robin: P1 (X) starts, then P2 (O)'
              : 'Player always makes the first move (X)'}
          </p>
        </div>

        {/* Game End Overlay Modal */}
        {winner && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 z-20 animate-fadeIn">
            <div className="relative bg-white border-4 border-black rounded-2xl p-5 sm:p-6 shadow-neo-xl w-full max-w-[290px] space-y-3.5 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div className="space-y-1">
                <div className="text-xl font-black uppercase">
                  {winner === 'X' ? (
                    <span className="text-black flex items-center justify-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-portal-yellow fill-portal-yellow" />
                      {mode === 'pvp' ? 'Player 1 (X) Wins!' : 'VICTORY! YOU WON!'}
                    </span>
                  ) : winner === 'O' ? (
                    <span className="text-black flex items-center justify-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-portal-pink fill-portal-pink" />
                      {mode === 'pvp' ? 'Player 2 (O) Wins!' : 'AI Outsmarted You!'}
                    </span>
                  ) : (
                    <span className="text-black">🤝 STALEMATE DRAW!</span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-slate-600">
                  {mode === 'pvp'
                    ? `Match Score: P1 (${p1Wins}) — P2 (${p2Wins})`
                    : winner === 'X'
                    ? `+500 Points Added to Leaderboard!`
                    : `Start round ${roundNumber + 1} — You get the first move!`}
                </p>
              </div>

              <button
                type="button"
                onClick={resetRound}
                className="w-full py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[3]" />
                <span>START ROUND {roundNumber + 1}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
