'use client';

import React, { useState, useCallback, useRef } from 'react';
import { RotateCcw, Cpu, Users, Sparkles, Volume2, VolumeX } from 'lucide-react';
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
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'move_o') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'win') {
        // High 3-tone victory chime
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          g.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.08);
          g.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
          o.start(ctx.currentTime + i * 0.08);
          o.stop(ctx.currentTime + i * 0.08 + 0.2);
        });
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'tie') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(350, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
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
    // Guard: ignore if cell filled, game finished, or AI currently calculating
    if (board[idx] || winner || isAiThinking) return;

    if (mode === 'pvp') {
      // 2 Players Local Pass & Play
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
        // Strict Round-Robin Turn Hand-off
        setCurrentTurn(prev => (prev === 'X' ? 'O' : 'X'));
      }
    } else {
      // Single Player vs AI Mode: ONLY Player ('X') can initiate user clicks
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

      // Round-Robin Transition to AI Turn ('O')
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
            // Round-Robin Hand-off back to Player ('X')
            setCurrentTurn('X');
          }
        }
        setIsAiThinking(false);
      }, 350);
    }
  };

  // Reset Round: Player always gets first move (Turn = 'X')
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
      {/* 1. ULTRA SLIM TOP CONTROLS & HUD */}
      <div className="w-full flex items-center justify-between bg-portal-surface/90 px-3 py-1.5 rounded-xl border border-portal-border mb-1.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchMode(mode === 'pvp' ? 'ai' : 'pvp')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black transition-all ${
              mode === 'ai'
                ? 'bg-purple-950/80 border-purple-500/60 text-purple-300 shadow-glow-purple'
                : 'bg-portal-card border-portal-border text-portal-cyan hover:bg-portal-card/80'
            }`}
          >
            {mode === 'ai' ? <Cpu className="w-3.5 h-3.5 text-purple-400" /> : <Users className="w-3.5 h-3.5 text-portal-cyan" />}
            <span>{mode === 'ai' ? 'vs Overthinker (AI)' : '2P Pass & Play'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-black">
          <span className="text-portal-cyan text-[11px]">You (X): {p1Wins}</span>
          <span className="text-slate-400 text-[10px]">Ties: {ties}</span>
          <span className="text-rose-400 text-[11px]">{mode === 'ai' ? 'Boss (O): ' : 'P2 (O): '}{p2Wins}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 transition-colors"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-portal-cyan" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          <button
            type="button"
            onClick={resetRound}
            className="p-1 rounded-lg bg-portal-card text-slate-400 hover:text-white border border-portal-border/60 transition-colors"
            title="Reset Grid (Player Starts First)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. 9:16 PORTRAIT ARENA */}
      <div className="relative w-full aspect-[9/16] bg-portal-bg rounded-2xl border-2 border-portal-border p-3 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
        {/* Turn Status Badge & Round Indicator */}
        <div className="w-full flex items-center justify-between px-1 py-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            Round {roundNumber}
          </span>
          {!winner ? (
            <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-portal-surface/90 border border-portal-border text-[11px] font-black shadow-sm">
              <span className={`w-2 h-2 rounded-full ${currentTurn === 'X' ? 'bg-portal-cyan animate-ping' : 'bg-rose-500 animate-pulse'}`} />
              <span className={currentTurn === 'X' ? 'text-portal-cyan' : 'text-rose-400'}>
                {mode === 'pvp'
                  ? (currentTurn === 'X' ? 'Player 1 Turn (X)' : 'Player 2 Turn (O)')
                  : (isAiThinking ? 'Overthinker Calculating...' : 'Your Turn (X)')}
              </span>
            </div>
          ) : (
            <div className="text-[11px] font-black text-portal-gold">Round Finished</div>
          )}
          <span className="text-[10px] font-black text-slate-500 uppercase">
            {mode === 'ai' ? 'P vs AI' : '2P Local'}
          </span>
        </div>

        {/* 3x3 Centered Grid */}
        <div className="w-full max-w-[320px] aspect-square grid grid-cols-3 gap-2.5 p-2.5 bg-portal-surface/40 rounded-2xl border border-portal-border/50 shadow-inner my-auto">
          {board.map((cell, idx) => {
            const isWinningCell = winningLine?.includes(idx);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(idx)}
                disabled={!!cell || !!winner || (mode === 'ai' && (currentTurn !== 'X' || isAiThinking))}
                className={`rounded-2xl flex items-center justify-center font-black text-4xl sm:text-5xl transition-all border ${
                  cell === 'X'
                    ? isWinningCell
                      ? 'bg-cyan-500/30 border-portal-cyan text-portal-cyan shadow-glow-cyan scale-105 ring-2 ring-portal-cyan'
                      : 'bg-cyan-500/10 border-portal-cyan text-portal-cyan shadow-glow-cyan'
                    : cell === 'O'
                    ? isWinningCell
                      ? 'bg-rose-500/30 border-rose-500 text-rose-400 shadow-[0_0_20px_-2px_rgba(244,63,94,0.6)] scale-105 ring-2 ring-rose-500'
                      : 'bg-rose-500/10 border-rose-500 text-rose-400'
                    : 'bg-portal-surface border-portal-border hover:border-portal-cyan/50 hover:bg-portal-card active:scale-95'
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
            {mode === 'pvp'
              ? 'Round-robin: Player 1 (X) starts, then Player 2 (O)'
              : 'Player always makes the first move (X)'}
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
                    {mode === 'pvp' ? 'Player 1 (X) Wins!' : 'Victory! You Beat Overthinker!'}
                  </span>
                ) : winner === 'O' ? (
                  <span className="text-rose-400 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-rose-400" />
                    {mode === 'pvp' ? 'Player 2 (O) Wins!' : 'Overthinker Outsmarted You!'}
                  </span>
                ) : (
                  <span className="text-slate-300">🤝 It&apos;s a Stalemate Draw!</span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {mode === 'pvp'
                  ? `Match Score: P1 (${p1Wins}) — P2 (${p2Wins})`
                  : winner === 'X'
                  ? `+500 Points Added to Leaderboard!`
                  : `Start round ${roundNumber + 1} — You get the first move!`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetRound}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-portal-cyan to-blue-600 text-black font-black text-xs shadow-glow-cyan active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Start Round {roundNumber + 1} (Your Move)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
