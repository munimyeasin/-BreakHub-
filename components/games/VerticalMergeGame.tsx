'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RotateCcw, Volume2, VolumeX, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';

const TILE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  2: { bg: 'bg-[#EB7A7A]', text: 'text-white', border: 'border-black' },
  4: { bg: 'bg-[#EB9A6D]', text: 'text-white', border: 'border-black' },
  8: { bg: 'bg-[#F7B519]', text: 'text-black', border: 'border-black' },
  16: { bg: 'bg-[#59B85C]', text: 'text-white', border: 'border-black' },
  32: { bg: 'bg-[#4DA6E8]', text: 'text-white', border: 'border-black' },
  64: { bg: 'bg-[#9B6CE0]', text: 'text-white', border: 'border-black' },
  128: { bg: 'bg-[#E06CB3]', text: 'text-white', border: 'border-black' },
  256: { bg: 'bg-[#1ABC9C]', text: 'text-white', border: 'border-black' },
  512: { bg: 'bg-[#E67E22]', text: 'text-white', border: 'border-black' },
  1024: { bg: 'bg-[#9B59B6]', text: 'text-white', border: 'border-black' },
  2048: { bg: 'bg-[#F1C40F]', text: 'text-black', border: 'border-black' },
};

const COLS = 5;
const ROWS = 8;

interface VerticalMergeGameProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
}

export default function VerticalMergeGame({ gameId, onGameOver }: VerticalMergeGameProps) {
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [currentCol, setCurrentCol] = useState<number>(2);
  const [nextTile, setNextTile] = useState<number>(2);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(0);
  const [undoCharges, setUndoCharges] = useState<number>(3);
  const [history, setHistory] = useState<{ board: number[][]; score: number }[]>([]);
  const [floatingScores, setFloatingScores] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vertical_merge_high_score');
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {}
  }, []);

  // Play audio helper
  const playSfx = (type: 'drop' | 'merge' | 'gameover' | 'undo') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'drop') {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'merge') {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'gameover') {
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'undo') {
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {}
  };

  const spawnRandomTile = (): number => {
    const r = Math.random();
    if (r < 0.65) return 2;
    if (r < 0.90) return 4;
    return 8;
  };

  // Save history for undo
  const saveStateForUndo = () => {
    setHistory(prev => [...prev.slice(-10), { board: board.map(r => [...r]), score }]);
  };

  const handleUndo = () => {
    if (undoCharges <= 0 || history.length === 0 || gameOver) return;
    const lastState = history[history.length - 1];
    setBoard(lastState.board);
    setScore(lastState.score);
    setHistory(prev => prev.slice(0, -1));
    setUndoCharges(prev => prev - 1);
    playSfx('undo');
  };

  // Process merges recursively in a column
  const processMerges = (currentBoard: number[][], col: number): { newBoard: number[][]; addedScore: number } => {
    let b = currentBoard.map(r => [...r]);
    let addedScore = 0;
    let mergedAny = false;

    // Gravity pull down first
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) {
        // find lowest non-zero above
        let foundRow = -1;
        for (let above = r - 1; above >= 0; above--) {
          if (b[above][col] !== 0) {
            foundRow = above;
            break;
          }
        }
        if (foundRow !== -1) {
          b[r][col] = b[foundRow][col];
          b[foundRow][col] = 0;
        }
      }
    }

    // Check adjacent merges from bottom up
    for (let r = ROWS - 1; r > 0; r--) {
      const current = b[r][col];
      const above = b[r - 1][col];
      if (current !== 0 && current === above) {
        const newVal = current * 2;
        b[r][col] = newVal;
        b[r - 1][col] = 0;
        addedScore += newVal;
        mergedAny = true;
        playSfx('merge');

        // Floating score popup
        const scoreId = Date.now() + Math.random();
        setFloatingScores(prev => [...prev, { id: scoreId, text: `+${newVal}`, x: col, y: r }]);
        setTimeout(() => {
          setFloatingScores(prev => prev.filter(item => item.id !== scoreId));
        }, 800);

        // Cascade down again after merge
        const cascadeResult = processMerges(b, col);
        b = cascadeResult.newBoard;
        addedScore += cascadeResult.addedScore;
        break;
      }
    }

    return { newBoard: b, addedScore };
  };

  const dropTile = useCallback((colIndex: number) => {
    if (gameOver) return;

    // Check if column is full
    if (board[0][colIndex] !== 0) {
      // Column is full
      return;
    }

    saveStateForUndo();
    playSfx('drop');

    let newBoard = board.map(r => [...r]);
    // Find lowest empty row in this column
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newBoard[r][colIndex] === 0) {
        targetRow = r;
        break;
      }
    }

    if (targetRow !== -1) {
      newBoard[targetRow][colIndex] = nextTile;
    }

    // Process merges in this column
    const { newBoard: mergedBoard, addedScore } = processMerges(newBoard, colIndex);
    newBoard = mergedBoard;

    const newScore = score + addedScore + (addedScore > 0 ? 10 * (combo + 1) : 0);
    if (addedScore > 0) {
      setCombo(prev => prev + 1);
    } else {
      setCombo(0);
    }

    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem('vertical_merge_high_score', newScore.toString());
      } catch {}
    }

    setBoard(newBoard);
    setNextTile(spawnRandomTile());

    // Check Game Over (top row has any non-zero value in any column)
    let isOver = false;
    for (let c = 0; c < COLS; c++) {
      if (newBoard[0][c] !== 0) {
        // Check if all columns are full or no moves
        let fullCols = 0;
        for (let colCheck = 0; colCheck < COLS; colCheck++) {
          if (newBoard[0][colCheck] !== 0) fullCols++;
        }
        if (fullCols === COLS) {
          isOver = true;
        }
      }
    }

    if (isOver) {
      setGameOver(true);
      playSfx('gameover');
      onGameOver?.(newScore);
    }
  }, [board, nextTile, score, combo, highScore, gameOver, history, undoCharges, onGameOver]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setCurrentCol(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setCurrentCol(prev => Math.min(COLS - 1, prev + 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') {
        e.preventDefault();
        dropTile(currentCol);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCol, dropTile, gameOver]);

  const restartGame = () => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setScore(0);
    setGameOver(false);
    setCurrentCol(2);
    setNextTile(2);
    setCombo(0);
    setUndoCharges(3);
    setHistory([]);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 select-none font-sans text-white">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between bg-[#222831] border-2 border-black rounded-2xl p-3 mb-3 shadow-neo-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-portal-yellow tracking-wider">SCORE</span>
          <span className="text-2xl font-black text-white font-mono">{score.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase text-portal-cyan tracking-wider">BEST</span>
          <span className="text-xl font-black text-portal-cyan font-mono">{highScore.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-[#393E46] hover:bg-portal-yellow hover:text-black border-2 border-black transition-all"
            title="Toggle Audio"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
          <button
            onClick={restartGame}
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border-2 border-black transition-all shadow-neo-sm"
            title="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drop Preview Bar & Next Tile */}
      <div className="w-full flex items-center justify-between bg-[#1E222B] border-2 border-black rounded-xl px-4 py-2 mb-3 shadow-neo-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-300">NEXT TILE:</span>
          <div className={`w-9 h-9 rounded-lg ${TILE_COLORS[nextTile]?.bg || 'bg-slate-700'} ${TILE_COLORS[nextTile]?.text || 'text-white'} border-2 border-black flex items-center justify-center font-black text-sm shadow-neo-sm animate-pulse`}>
            {nextTile}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {combo > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-portal-pink text-black font-black text-xs uppercase animate-bounce border border-black">
              {combo}x COMBO!
            </span>
          )}
          <button
            onClick={handleUndo}
            disabled={undoCharges <= 0 || history.length === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-black font-black text-xs transition-all shadow-neo-sm ${
              undoCharges > 0 && history.length > 0
                ? 'bg-portal-yellow text-black hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5'
                : 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>UNDO ({undoCharges})</span>
          </button>
        </div>
      </div>

      {/* Main Drop Columns & Grid Container */}
      <div className="relative bg-[#11141B] border-3 border-black rounded-2xl p-2 shadow-neo-lg overflow-hidden">
        {/* Danger Line Indicator */}
        <div className="absolute top-12 left-0 right-0 h-0.5 border-t-2 border-dashed border-rose-500 z-20 pointer-events-none flex items-center justify-end pr-2">
          <span className="text-[9px] font-black text-rose-500 bg-black/80 px-1 rounded uppercase">Danger Line</span>
        </div>

        {/* Drop Column Buttons Indicator Header */}
        <div className="grid grid-cols-5 gap-1.5 mb-2">
          {Array.from({ length: COLS }).map((_, cIndex) => (
            <button
              key={cIndex}
              onClick={() => {
                setCurrentCol(cIndex);
                dropTile(cIndex);
              }}
              className={`h-10 rounded-xl border-2 border-black font-black text-sm flex flex-col items-center justify-center transition-all shadow-neo-sm ${
                currentCol === cIndex
                  ? 'bg-portal-cyan text-black scale-105 ring-2 ring-white'
                  : 'bg-[#222831] text-slate-300 hover:bg-[#393E46]'
              }`}
              title={`Drop in column ${cIndex + 1}`}
            >
              <span>↓</span>
            </button>
          ))}
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-5 gap-1.5 bg-[#0A0D14] p-1.5 rounded-xl border-2 border-black">
          {board.map((row, rIndex) =>
            row.map((val, cIndex) => {
              const cfg = TILE_COLORS[val];
              const isTopRow = rIndex === 0;
              return (
                <div
                  key={`${rIndex}-${cIndex}`}
                  onClick={() => {
                    setCurrentCol(cIndex);
                    dropTile(cIndex);
                  }}
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-black flex items-center justify-center font-black text-base sm:text-lg transition-all cursor-pointer ${
                    val === 0
                      ? isTopRow
                        ? 'bg-[#181C24]/60 hover:bg-[#252A35]'
                        : 'bg-[#151921] hover:bg-[#1E222B]'
                      : `${cfg?.bg} ${cfg?.text} shadow-neo-sm hover:scale-105`
                  }`}
                >
                  {val > 0 ? val : ''}
                </div>
              );
            })
          )}
        </div>

        {/* Floating Scores Overlay */}
        {floatingScores.map(item => (
          <div
            key={item.id}
            className="absolute z-30 pointer-events-none text-portal-yellow font-black text-lg animate-fade-up"
            style={{
              left: `${item.x * 20 + 10}%`,
              top: `${item.y * 11 + 20}%`,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {item.text}
          </div>
        ))}

        {/* Game Over Modal Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-rose-600 border-2 border-black flex items-center justify-center mb-3 shadow-neo-sm animate-bounce">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-1">GRID OVERFLOW</h2>
            <p className="text-slate-400 text-xs mb-4">The vertical chamber breached the danger line!</p>

            <div className="bg-[#1E222B] border-2 border-black rounded-2xl p-4 w-full max-w-xs mb-5 shadow-neo-sm space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Final Score:</span>
                <span className="text-portal-yellow font-mono text-sm">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>High Score:</span>
                <span className="text-portal-cyan font-mono text-sm">{highScore.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={restartGame}
              className="px-6 py-3 rounded-xl bg-portal-yellow text-black font-black text-sm border-2 border-black shadow-neo-lg hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="w-full mt-3 p-3 bg-[#1E222B] border-2 border-black rounded-xl text-center text-[11px] text-slate-400 shadow-neo-sm">
        <span className="font-black text-white">← / A</span> & <span className="font-black text-white">→ / D</span> to move column • <span className="font-black text-white">↓ / Space</span> to drop tile
      </div>
    </div>
  );
}
