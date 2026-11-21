'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Grid3X3,
  Trophy,
  Flame,
  Undo2,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
} from 'lucide-react';

// Tile color configuration matching the design spec
const TILE_CONFIG: Record<number, {
  bg: string;
  text: string;
  border: string;
  glow?: string;
  scale?: string;
  colorName: string;
}> = {
  2: {
    bg: 'bg-[#160b20]',
    text: 'text-slate-200',
    border: 'border-black',
    colorName: 'coral/salmon',
    scale: 'scale-95'
  },
  4: {
    bg: 'bg-[#063d4a]',
    text: 'text-cyan-200',
    border: 'border-black',
    colorName: 'purple/lavender',
    scale: 'scale-95'
  },
  8: {
    bg: 'bg-blue-950/90',
    text: 'text-blue-300',
    border: 'border-blue-600/70',
    colorName: 'sky-blue',
    scale: 'scale-95'
  },
  16: {
    bg: 'bg-indigo-950/90',
    text: 'text-indigo-300',
    border: 'border-indigo-500/80',
    colorName: 'royal-blue',
    scale: 'scale-95'
  },
  32: {
    bg: 'bg-purple-950/90',
    text: 'text-purple-300',
    border: 'border-purple-500',
    colorName: 'sky-blue',
    scale: 'scale-95'
  },
  64: {
    bg: 'bg-fuchsia-950/90',
    text: 'text-fuchsia-200',
    border: 'border-fuchsia-500',
    colorName: 'peach',
    scale: 'scale-95'
  },
  128: {
    bg: 'bg-rose-950/90',
    text: 'text-rose-200',
    border: 'border-rose-500',
    colorName: 'royal-blue',
    scale: 'scale-95'
  },
  256: {
    bg: 'bg-amber-950/90',
    text: 'text-amber-200',
    border: 'border-amber-500',
    colorName: 'warm-peach',
    scale: 'scale-95'
  },
  512: {
    bg: 'bg-yellow-950/95',
    text: 'text-yellow-200',
    border: 'border-yellow-400',
    colorName: 'teal-green',
    scale: 'scale-95'
  },
  1024: {
    bg: 'bg-emerald-950/95',
    text: 'text-emerald-200',
    border: 'border-emerald-400',
    colorName: 'emerald',
    scale: 'scale-95'
  },
  2048: {
    bg: 'bg-gradient-to-tr from-cyan-500 via-yellow-400 to-amber-500',
    text: 'text-black font-black',
    border: 'border-white',
    colorName: 'gold',
    scale: 'scale-95',
    glow: 'shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-pulse'
  }
};

const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 10;
const DROP_SPEED = 0.08; // seconds per frame for faster drop
const COMBINE_DELAY = 0.05; // seconds to wait before checking for combines

export interface VerticalMergeGameProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
}

export default function VerticalMergeGame({ gameId, onGameOver }: VerticalMergeGameProps) {
  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [highTile, setHighTile] = useState(0);
  const [nextTile, setNextTile] = useState(4); // Start with '4' as initial tile
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [dangerSeconds, setDangerSeconds] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [lastMoveTime, setLastMoveTime] = useState(0);
  const [lastCombineTime, setLastCombineTime] = useState(0);
  const [lastSpawnTime, setLastSpawnTime] = useState(0);
  const [particles, setParticles] = useState<any[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<any[]>([]);
  const [isDangerActive, setIsDangerActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTimeRef = useRef(0);
  const dangerTimerRef = useRef(0);
  const comboTimerRef = useRef(0);
  const lastMoveRef = useRef({ x: 0, y: 0, time: 0 });
  const spawnPositionRef = useRef({ x: 2, y: -1, tile: 4 });

  // Initialize game
  const initGame = () => {
    setBoard([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    setScore(0);
    setHighTile(4);
    setIsPlaying(true);
    setGameOver(false);
    setHasWon(false);
    setDangerSeconds(0);
    setComboMultiplier(1);
    setLastMoveTime(0);
    setLastSpawnTime(0);
    setParticles([]);
    setFloatingTexts([]);
    setIsDangerActive(false);
  };

  // Load best score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vertical_merge_best_score');
      if (saved) setHighTile(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Add new tile at top of column
  const addTile = (column: number, value: number) => {
    setBoard(prev => {
      const newBoard = prev.map(row => [...row]);
      newBoard[0][column] = value;
      return newBoard;
    });
  };

  // Check for merges and handle them
  const checkForCombines = useCallback(() => {
    setTimeout(() => {
      let hasCombined = false;
      const newBoard = [...board];

      // Check each column for adjacent matching tiles
      for (let column = 0; column < BOARD_WIDTH; column++) {
        for (let row = BOARD_HEIGHT - 1; row > 0; row--) {
          if (newBoard[row][column] === 0) continue;

          const currentValue = newBoard[row][column];
          const aboveValue = newBoard[row - 1][column];

          if (aboveValue === currentValue && aboveValue > 0) {
            // Merge tiles
            newBoard[row][column] = 0;
            newBoard[row - 1][column] = currentValue * 2;

            // Update high tile
            if (currentValue * 2 > highTile) {
              setHighTile(currentValue * 2);
            }

            // Add to score
            const points = currentValue * 2 * comboMultiplier;
            setScore(prev => prev + points);
            setHighTile(currentValue * 2);

            // Update combo multiplier
            setComboMultiplier(prev => prev + 1);

            // Create particles
            const x = column * 80 + 40;
            const y = (row - 1) * 80 + 40;

            setParticles(prev => [
              ...prev,
              {
                x,
                y,
                vx: (Math.random() - 0.5) * 2,
                vy: -2,
                radius: 4,
                alpha: 1,
                life: 0,
                maxLife: 30,
                type: 'sparkle'
              }
            ]);

            // Create floating text
            setFloatingTexts(prev => [
              ...prev,
              {
                text: `${points}`,
                x,
                y,
                alpha: 1,
                scale: 1.2,
                life: 60,
                speed: 1.5
              }
            ]);

            hasCombined = true;
          }
        }
      }

      // Check for danger zone (top 2 rows)
      const dangerZone = dangerSeconds > 0;
      if (dangerZone) {
        for (let column = 0; column < BOARD_WIDTH; column++) {
          for (let row = 0; row < 2; row++) {
            if (newBoard[row][column] > 0) {
              setGameOver(true);
              onGameOver?.(score);
              return;
            }
          }
        }
      }

      // Fill empty spaces
      for (let column = 0; column < BOARD_WIDTH; column++) {
        const nonZero = newBoard.map(row => row[column]).filter(val => val !== 0);
        const newValues = new Array(BOARD_HEIGHT).fill(0);

        // Fill from top down
        for (let i = 0; i < nonZero.length; i++) {
          newValues[i] = nonZero[i];
        }

        // Fill the rest with zeros from bottom up
        for (let i = nonZero.length; i < BOARD_HEIGHT; i++) {
            newValues[i] = 0;
        }

        // Update board
        for (let row = 0; row < BOARD_HEIGHT; row++) {
          newBoard[row][column] = newValues[row];
        }
      }

      // Check if game over (no moves possible)
      const canMove = board.flat().some(val => val > 0);

      if (!gameOver && !canMove) {
        setGameOver(true);
        onGameOver?.(score);
        return;
      }

      // Update board
      setBoard(newBoard);

      // Check for new combines after movement
      if (hasCombined) {
        checkForCombines();
      }

      // Spawn next tile
      const spawnTime = Date.now();
      if (spawnTime - lastSpawnTime > 1500) {
        setNextTile(Math.random() < 0.7 ? 4 : 8); // 70% chance of 4, 30% chance of 8
        setLastSpawnTime(spawnTime);
      }

      // Update particles
      setParticles(prev => prev.map(p => ({
        ...p,
        life: p.life + 1,
        alpha: p.life / p.maxLife > 0.9 ? 1 : p.alpha - 0.03
      })).filter(p => p.life < p.maxLife));

      // Update floating texts
      setFloatingTexts(prev => prev.map(ft => ({
        ...ft,
        y: ft.y - 1.5,
        alpha: ft.alpha - 0.02,
        scale: ft.scale - 0.01
      })).filter(ft => ft.alpha > 0.1));

      // Update danger timer
      if (dangerSeconds > 0) {
        dangerTimerRef.current += 1 / 60;
        setDangerSeconds(dangerTimerRef.current);
        if (Math.floor(dangerTimerRef.current * 4) % 2 === 0) {
          setIsDangerActive(true);
        } else {
          setIsDangerActive(false);
        }
        if (dangerTimerRef.current >= 3) {
          setGameOver(true);
          onGameOver?.(score);
        }
      }

      // Schedule next frame
      const frameNow = Date.now();
      const deltaTime = (frameNow - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = frameNow;

      if (isPlaying && !gameOver && !hasWon) {
        animationRef.current = requestAnimationFrame(render);
      }
    }, COMBINE_DELAY * 1000);
  }, [board, dangerSeconds, isDangerActive, score, highTile, comboMultiplier, isPlaying, gameOver, hasWon, onGameOver]);

  // Handle player input for dropping tile
  const handleDrop = useCallback((column: number) => {
    if (!isPlaying || gameOver || hasWon) return;

    const now = Date.now();
    if (now - lastMoveTime < 100) return; // Prevent rapid drops

    // Check if there's space to drop
    const columnValues = board.map(row => row[column]).filter(val => val > 0);
    const emptySpaces = BOARD_HEIGHT - columnValues.length;

    if (emptySpaces === 0) return; // No space to drop

    // Find where the tile should land
    const landingRow = BOARD_HEIGHT - columnValues.length - 1;

    if (landingRow >= 0) {
      // Move the active tile to the landing position
      const newBoard = board.map(row => [...row]);
      newBoard[landingRow][column] = nextTile;

      // Check for immediate merge
      if (landingRow > 0 && newBoard[landingRow - 1][column] === nextTile) {
        // Merge immediately
        const mergedValue = nextTile * 2;
        newBoard[landingRow][column] = 0;
        newBoard[landingRow - 1][column] = mergedValue;

        // Update score
        const points = nextTile * 2 * comboMultiplier;
        setScore(prev => prev + points);
        if (mergedValue > highTile) {
          setHighTile(mergedValue);
        }

        // Create merge particles and effects
        const x = column * 80 + 40;
        const y = (landingRow - 1) * 80 + 40;

        setParticles(prev => [
          ...prev,
          {
            x,
            y,
            vx: (Math.random() - 0.5) * 3,
            vy: -3,
            radius: 5,
            alpha: 1,
            life: 0,
            maxLife: 45,
            type: 'sparkle',
            merge: true
          }
        ]);

        setFloatingTexts(prev => [
          ...prev,
          {
            text: `${points}`,
            x,
            y,
            alpha: 1,
            scale: 1.5,
            life: 80,
            speed: 2
          }
        ]);

        // Update combo multiplier
        setComboMultiplier(prev => prev + 1);
      }

      // Update board
      setBoard(newBoard);
      setLastMoveTime(now);
      setLastCombineTime(now);

      // Check for game over conditions
      const isGameOverState = board.flat().some(val => val === 0) &&
                             columnValues.length === BOARD_HEIGHT;

      if (isGameOverState) {
        setGameOver(true);
        onGameOver?.(score);
      }
    }
  }, [nextTile, isPlaying, gameOver, hasWon, score, comboMultiplier]);

  // Handle column selection
  const handleSelectColumn = (column: number) => {
    if (!isPlaying || gameOver || hasWon) return;

    // Set the aiming position
    spawnPositionRef.current = { x: column, y: -1, tile: nextTile };

    // Move the active tile to the selected column
    const newBoard = board.map(row => [...row]);
    newBoard[0][column] = nextTile;

    // Check if there's space to drop
    const columnValues = newBoard.map(row => row[column]).filter(val => val > 0);
    const emptySpaces = BOARD_HEIGHT - columnValues.length;

    if (emptySpaces > 0) {
      // Drop the tile
      const dropRow = BOARD_HEIGHT - columnValues.length - 1;
      if (dropRow >= 0) {
        newBoard[dropRow][column] = nextTile;
        newBoard[0][column] = 0; // Clear top
      }
    }

    setBoard(newBoard);
    setLastMoveTime(Date.now());
  };

  // Spawn next tile at the top of the column
  const spawnNextTile = useCallback(() => {
    if (!isPlaying || gameOver || hasWon) return;

    const column = spawnPositionRef.current.x;
    const row = spawnPositionRef.current.y + 1;

    if (row >= 0 && row < BOARD_HEIGHT) {
      const newBoard = board.map(row => [...row]);
      newBoard[row][column] = nextTile;

      setBoard(newBoard);
      setLastSpawnTime(Date.now());
    }

    // Set new next tile
    setNextTile(Math.random() < 0.7 ? 4 : 8); // 70% chance of 4, 30% chance of 8
  }, [isPlaying, gameOver, hasWon, nextTile]);

  // Game loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== BOARD_WIDTH * 80 * dpr || canvas.height !== BOARD_HEIGHT * 80 * dpr) {
      canvas.width = BOARD_WIDTH * 80 * dpr;
      canvas.height = BOARD_HEIGHT * 80 * dpr;
    }

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // Draw background
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(0, 0, BOARD_WIDTH * 80, BOARD_HEIGHT * 80);

    // Draw grid lines
    ctx.strokeStyle = '#1a103c';
    ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH * 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, BOARD_HEIGHT * 80);
      ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT * 80; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(BOARD_WIDTH * 80, y);
      ctx.stroke();
    }

    // Draw container borders
    ctx.fillStyle = '#05020f';
    ctx.fillRect(0, 0, BOARD_WIDTH * 80, BOARD_HEIGHT * 80);
    ctx.fillRect(0, BOARD_HEIGHT * 80, BOARD_WIDTH * 80, 0);

    // Draw column guides
    for (let column = 0; column < BOARD_WIDTH; column++) {
      ctx.strokeStyle = '#414750';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(column * 80 + 40, 0);
      ctx.lineTo(column * 80 + 40, BOARD_HEIGHT * 80);
      ctx.stroke();
    }

    // Draw danger zone glow
    if (isDangerActive) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = `rgba(255, 0, 85, 0.6)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 2 * 80);
      ctx.lineTo(BOARD_WIDTH * 80, 2 * 80);
      ctx.stroke();
      ctx.restore();
    }

    // Draw board tiles
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let column = 0; column < BOARD_WIDTH; column++) {
        const value = board[row][column];
        if (value > 0) {
          const config = TILE_CONFIG[value];

          // Draw tile
          ctx.fillStyle = config.bg;
          ctx.fillRect(column * 80 + 5, row * 80 + 5, 70, 70);

          ctx.fillStyle = config.text;
          ctx.font = '48px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Add glow effect
          if (config.glow) {
            ctx.shadowColor = config.glow.split('(')[1].split(',')[0].split(')')[0].trim() as unknown as string;
            ctx.shadowBlur = parseInt(config.glow.split('(')[1].split(',')[1].split(')')[0].split(',')[1].trim()) || 5;
          }

          ctx.fillText(
            String(value),
            column * 80 + 40,
            row * 80 + 40
          );
        }
      }
    }

    // Draw active tile
    if (spawnPositionRef.current.y >= -1) {
      const { x, y, tile } = spawnPositionRef.current;
      const column = x;
      const row = Math.floor(y) + 1;

      if (row >= 0 && row < BOARD_HEIGHT) {
        const config = TILE_CONFIG[tile];

        // Draw tile with animation
        ctx.fillStyle = config.bg;
        ctx.fillRect(column * 80 + 5, row * 80 + 5, 70, 70);

        ctx.fillStyle = config.text;
        ctx.font = '48px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String(tile),
          column * 80 + 40,
          row * 80 + 40
        );

        // Add glow effect
        if (config.glow) {
          ctx.shadowColor = config.glow.split('(')[1].split(',')[0].split(')')[0].trim() as unknown as string;
          ctx.shadowBlur = parseInt(config.glow.split('(')[1].split(',')[1].split(')')[0].split(',')[1].trim()) || 5;
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw floating texts
    floatingTexts.forEach(ft => {
      ctx.fillStyle = `rgba(255, 255, 255, ${ft.alpha})`;
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    });

    // Draw danger zone
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = isDangerActive
      ? `rgba(255, 0, 85, 0.7)`
      : `rgba(255, 0, 85, 0.4)`;
    ctx.lineWidth = isDangerActive ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, 2 * 80);
    ctx.lineTo(BOARD_WIDTH * 80, 2 * 80);
    ctx.stroke();
    ctx.restore();

    // Schedule next frame
    animationRef.current = requestAnimationFrame(render);
  }, [board, isDangerActive, score, highTile, comboMultiplier, isPlaying, gameOver, hasWon, onGameOver, particles, floatingTexts]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver || hasWon) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleSelectColumn((spawnPositionRef.current.x - 1 + BOARD_WIDTH) % BOARD_WIDTH);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleSelectColumn((spawnPositionRef.current.x + 1) % BOARD_WIDTH);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleDrop(spawnPositionRef.current.x);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleDrop(spawnPositionRef.current.x);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, hasWon, handleSelectColumn, handleDrop]);

  // Auto-drop functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && !gameOver && !hasWon && lastMoveTime > 1000) {
        // Auto-drop if no input for a while
        const column = spawnPositionRef.current.x;
        handleDrop(column);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, gameOver, hasWon, handleDrop, lastMoveTime]);

  // Danger zone timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (dangerSeconds > 0) {
        dangerTimerRef.current += 1 / 60;
        setDangerSeconds(dangerTimerRef.current);
        if (dangerTimerRef.current >= 3) {
          setGameOver(true);
          onGameOver?.(score);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [dangerSeconds]);

  // Reset game
  useEffect(() => {
    const resetGame = () => {
      initGame();
      setNextTile(4);
    };

    // Listen for game over
    if (gameOver && !hasWon) {
      setTimeout(resetGame, 3000);
    }
  }, [gameOver, hasWon, initGame]);

  return (
    <div className="bg-[#333942] min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[900px]">
        {/* Top HUD Bar */}
        <div className="flex justify-between items-center p-4 bg-[#1E2228] rounded-lg">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full bg-[#8A6B73] text-white flex items-center justify-center"
              aria-label="Back"
            >
              < ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-full bg-[#1E2228] text-sm text-[#9AA1AC] uppercase">
                MEDIUM MODE
              </div>
              <div className="text-2xl font-bold text-white">
                {score}
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded-full bg-[#1E2228] text-sm text-[#9AA1AC] uppercase">
                  TODAY
                </div>
                <div className="text-xl font-bold text-[#E5A93C]">
                  22,835
                </div>
              </div>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-[#8A6B73] text-white flex items-center justify-center"
                aria-label="Restart"
              >
                < ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="bg-[#3A3F47] rounded-xl border-[#262A30] p-2" style={{ aspectRatio: "1/1" }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        </div>

        {/* Sub-header Action Row */}
        <div className="flex justify-between items-center p-4 bg-[#1E2228] rounded-lg">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="rounded-lg bg-[#F2A91D] p-2 flex items-center justify-center"
            aria-label="Undo"
          >
            <RotateCcw className="w-6 h-6 text-[#333]" />
            <span className="ml-2 text-sm text-white">1</span>
          </button>

          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-full bg-[#1E2228] text-sm text-[#9AA1AC] uppercase">
              NEXT TILE
            </div>
            <div
              className="w-16 h-16 rounded-lg bg-[#1E2228] p-1 border border-[#414750]"
              style={{
                backgroundColor: TILE_CONFIG[nextTile].bg,
                borderRadius: '8px'
              }}
            >
              <span
                className="text-2xl font-bold text-white text-center"
                style={{
                  fontSize: '1.5rem',
                  color: '#FFFFFF'
                }}
              >
                {nextTile}
              </span>
            </div>
          </div>
        </div>

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
            <div className="text-center p-8 bg-[#1E2228] rounded-xl text-white">
              <h1 className="text-4xl font-bold mb-4">GAME OVER</h1>
              <p className="text-xl mb-6">
                Final Score: {score}
              </p>
              <button
                onClick={() => window.history.back()}
                className="rounded-lg bg-[#8A6B73] text-white px-6 py-3 font-bold"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}