'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  Bot,
  Zap,
  Shield,
  Crown,
  Award,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Swords,
  Layers,
  Flame,
  HelpCircle,
  Undo2,
  Play,
  Pause,
  ArrowUpDown,
  Lightbulb,
  FileText,
  Share2,
  Copy,
  Check,
  BarChart3,
  BookOpen,
  Target,
  AlertTriangle,
  XCircle,
  Star,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberChessGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export type Board = (Piece | null)[][];

export type MoveQuality =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'book';

export interface Move {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  piece: Piece;
  capturedPiece?: Piece | null;
  isEnPassant?: boolean;
  isCastling?: 'kingside' | 'queenside';
  promotionType?: PieceType;
  prevEnPassant?: [number, number] | null;
  notation?: string;
  quality?: MoveQuality;
  evalAfter?: number; // Centipawns from White's perspective
  boardState?: Board;
}

export type GameMode = 'ai' | 'pvp';
export type AiDifficulty = 'novice' | 'tactician' | 'grandmaster';
export type TimeControl = 'unlimited' | 'blitz' | 'rapid' | 'classic';

// Piece value mapping for material calculation and AI evaluation
const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Opening Database for Opening Book Detection
const CHESS_OPENINGS: { seq: string[]; name: string; eco: string }[] = [
  { seq: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], name: "Sicilian Defense: Najdorf", eco: 'B90' },
  { seq: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4'], name: "Sicilian Defense: Open", eco: 'B30' },
  { seq: ['e4', 'c5'], name: "Sicilian Defense", eco: 'B20' },
  { seq: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], name: "Ruy Lopez: Morphy Defense", eco: 'C70' },
  { seq: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], name: "Ruy Lopez (Spanish Opening)", eco: 'C60' },
  { seq: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], name: "Italian Game: Giuoco Piano", eco: 'C50' },
  { seq: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], name: "Two Knights Defense", eco: 'C55' },
  { seq: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], name: "Italian Game", eco: 'C50' },
  { seq: ['e4', 'e5', 'Nf3', 'Nf6'], name: "Petrov's Defense", eco: 'C42' },
  { seq: ['e4', 'e5', 'f4'], name: "King's Gambit", eco: 'C30' },
  { seq: ['e4', 'e6', 'd4', 'd5'], name: "French Defense: Main Line", eco: 'C00' },
  { seq: ['e4', 'e6'], name: "French Defense", eco: 'C00' },
  { seq: ['e4', 'c6', 'd4', 'd5'], name: "Caro-Kann Defense: Main Line", eco: 'B12' },
  { seq: ['e4', 'c6'], name: "Caro-Kann Defense", eco: 'B10' },
  { seq: ['e4', 'd5'], name: "Scandinavian Defense", eco: 'B01' },
  { seq: ['e4', 'd6', 'd4', 'Nf6'], name: "Pirc Defense", eco: 'B07' },
  { seq: ['e4', 'g6'], name: "Modern Defense", eco: 'B06' },
  { seq: ['e4', 'e5'], name: "King's Pawn Game", eco: 'C20' },
  { seq: ['e4'], name: "King's Pawn Opening", eco: 'B00' },
  { seq: ['d4', 'd5', 'c4', 'e6'], name: "Queen's Gambit Declined", eco: 'D30' },
  { seq: ['d4', 'd5', 'c4', 'c6'], name: "Slav Defense", eco: 'D10' },
  { seq: ['d4', 'd5', 'c4', 'dxc4'], name: "Queen's Gambit Accepted", eco: 'D20' },
  { seq: ['d4', 'd5', 'c4'], name: "Queen's Gambit", eco: 'D06' },
  { seq: ['d4', 'd5', 'Bf4'], name: "London System", eco: 'D00' },
  { seq: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'], name: "King's Indian Defense", eco: 'E60' },
  { seq: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], name: "Nimzo-Indian Defense", eco: 'E20' },
  { seq: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'], name: "Queen's Indian Defense", eco: 'E12' },
  { seq: ['d4', 'Nf6', 'c4', 'c5'], name: "Benoni Defense", eco: 'A56' },
  { seq: ['d4', 'f5'], name: "Dutch Defense", eco: 'A80' },
  { seq: ['d4', 'd5'], name: "Queen's Pawn Game", eco: 'D00' },
  { seq: ['d4'], name: "Queen's Pawn Opening", eco: 'A40' },
  { seq: ['c4', 'e5'], name: "English Opening: King's English", eco: 'A20' },
  { seq: ['c4'], name: "English Opening", eco: 'A10' },
  { seq: ['Nf3', 'd5', 'g3'], name: "King's Indian Attack", eco: 'A07' },
  { seq: ['Nf3'], name: "Réti Opening", eco: 'A04' }
];

// Positional Piece-Square Tables (White perspective - index row 0 to 7)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0]
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50]
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20]
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0]
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20]
];

const KING_MIDDLE_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20]
];

function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

  // Black pieces (rank 0 & 1)
  const backRowBlack: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRowBlack[c], color: 'b' };
    board[1][c] = { type: 'p', color: 'b' };
  }

  // White pieces (rank 6 & 7)
  const backRowWhite: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[6][c] = { type: 'p', color: 'w' };
    board[7][c] = { type: backRowWhite[c], color: 'w' };
  }

  return board;
}

// Helper: Convert board to standard FEN string
function boardToFen(
  b: Board,
  activeTurn: PieceColor,
  wCastle: { kingside: boolean; queenside: boolean },
  bCastle: { kingside: boolean; queenside: boolean },
  ep: [number, number] | null,
  halfmoves: number,
  fullmoves: number
): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    let rowStr = '';
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        const letter = p.type === 'p' ? 'p' : p.type;
        rowStr += p.color === 'w' ? letter.toUpperCase() : letter.toLowerCase();
      }
    }
    if (emptyCount > 0) {
      rowStr += emptyCount;
    }
    rows.push(rowStr);
  }

  let castlingStr = '';
  if (wCastle.kingside) castlingStr += 'K';
  if (wCastle.queenside) castlingStr += 'Q';
  if (bCastle.kingside) castlingStr += 'k';
  if (bCastle.queenside) castlingStr += 'q';
  if (!castlingStr) castlingStr = '-';

  const epStr = ep ? `${String.fromCharCode(97 + ep[1])}${8 - ep[0]}` : '-';

  return `${rows.join('/')} ${activeTurn} ${castlingStr} ${epStr} ${halfmoves} ${fullmoves}`;
}

export default function CyberChessGame({ gameId, onGameOver }: CyberChessGameProps) {
  // Game Setup State
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [turn, setTurn] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [enPassantTarget, setEnPassantTarget] = useState<[number, number] | null>(null);

  // Replay Navigation State (Step backward/forward in move history)
  const [viewingPly, setViewingPly] = useState<number | null>(null);

  // Castling Rights
  const [whiteCastling, setWhiteCastling] = useState({ kingside: true, queenside: true });
  const [blackCastling, setBlackCastling] = useState({ kingside: true, queenside: true });

  // Game Status
  const [isCheck, setIsCheck] = useState<PieceColor | null>(null);
  const [gameResult, setGameResult] = useState<'w' | 'b' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);

  // Real-time Evaluation Gauge (Centipawns from White's perspective)
  const [currentEval, setCurrentEval] = useState<number>(0);
  const [bestMoveHint, setBestMoveHint] = useState<{
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
  } | null>(null);

  // Modals & Popups
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('tactician');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [boardFlipped, setBoardFlipped] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showPgnModal, setShowPgnModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [customFenInput, setCustomFenInput] = useState<string>('');
  const [copiedPgn, setCopiedPgn] = useState<boolean>(false);
  const [copiedFen, setCopiedFen] = useState<boolean>(false);

  const [promotionPending, setPromotionPending] = useState<{
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
    color: PieceColor;
  } | null>(null);

  // Clocks / Timers
  const [timeControl, setTimeControl] = useState<TimeControl>('rapid');
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Web Audio Synthesizer
  const playSound = useCallback(
    (type: 'select' | 'move' | 'capture' | 'check' | 'castle' | 'promote' | 'victory' | 'defeat' | 'draw' | 'brilliant') => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'select') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (type === 'move') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === 'capture') {
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(450, now);
          osc1.frequency.exponentialRampToValueAtTime(90, now + 0.14);
          gain1.gain.setValueAtTime(0.2, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.14);
        } else if (type === 'brilliant') {
          // Cyber chime fanfare for brilliant move
          [659.25, 830.61, 987.77, 1318.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0.2, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.25);
          });
        } else if (type === 'check') {
          [880, 1174].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.12, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.12);
          });
        } else if (type === 'castle') {
          [440, 659.25].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.15, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.15);
          });
        } else if (type === 'promote') {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.16, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.18);
          });
        } else if (type === 'victory') {
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.2, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.4);
          });
        } else if (type === 'defeat') {
          [400, 340, 290, 220].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            gain.gain.setValueAtTime(0.15, now + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.3);
          });
        } else if (type === 'draw') {
          [500, 450, 500].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            gain.gain.setValueAtTime(0.14, now + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.2);
          });
        }
      } catch {}
    },
    [soundEnabled, getAudioContext]
  );

  // Time Control Init
  useEffect(() => {
    let t = 300;
    if (timeControl === 'blitz') t = 180;
    else if (timeControl === 'rapid') t = 300;
    else if (timeControl === 'classic') t = 600;
    else if (timeControl === 'unlimited') t = 0;
    setWhiteTime(t);
    setBlackTime(t);
  }, [timeControl]);

  // Chess Clock Countdown
  useEffect(() => {
    if (!isClockRunning || gameResult || timeControl === 'unlimited') return;

    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            handleTimeOut('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            handleTimeOut('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isClockRunning, turn, gameResult, timeControl]);

  const handleTimeOut = (flaggedColor: PieceColor) => {
    const winner = flaggedColor === 'w' ? 'b' : 'w';
    setGameResult(winner);
    setResultReason(`${flaggedColor === 'w' ? 'White' : 'Black'} ran out of time!`);
    setIsClockRunning(false);
    if (winner === playerColor && gameMode === 'ai') {
      playSound('victory');
      handleFinalScore(true);
    } else {
      playSound('defeat');
    }
  };

  // Check if a square is under attack by a given color
  const isSquareAttacked = useCallback((r: number, c: number, attackerColor: PieceColor, b: Board): boolean => {
    const pawnDir = attackerColor === 'w' ? -1 : 1;
    const pR = r - pawnDir;
    if (pR >= 0 && pR < 8) {
      if (c - 1 >= 0) {
        const p = b[pR][c - 1];
        if (p && p.color === attackerColor && p.type === 'p') return true;
      }
      if (c + 1 < 8) {
        const p = b[pR][c + 1];
        if (p && p.color === attackerColor && p.type === 'p') return true;
      }
    }

    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = b[nr][nc];
        if (p && p.color === attackerColor && p.type === 'n') return true;
      }
    }

    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
        const p = b[nr][nc];
        if (p) {
          if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        step++;
      }
    }

    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
        const p = b[nr][nc];
        if (p) {
          if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        step++;
      }
    }

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = b[nr][nc];
          if (p && p.color === attackerColor && p.type === 'k') return true;
        }
      }
    }

    return false;
  }, []);

  const findKing = useCallback((color: PieceColor, b: Board): [number, number] | null => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.type === 'k' && p.color === color) {
          return [r, c];
        }
      }
    }
    return null;
  }, []);

  const isInCheck = useCallback((color: PieceColor, b: Board): boolean => {
    const kingPos = findKing(color, b);
    if (!kingPos) return false;
    const opponent = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(kingPos[0], kingPos[1], opponent, b);
  }, [findKing, isSquareAttacked]);

  // Generate legal moves for a piece
  const getPieceMoves = useCallback(
    (
      r: number,
      c: number,
      b: Board,
      epTarget: [number, number] | null,
      wCastle: { kingside: boolean; queenside: boolean },
      bCastle: { kingside: boolean; queenside: boolean },
      filterCheck: boolean = true
    ): [number, number][] => {
      const piece = b[r][c];
      if (!piece) return [];
      const moves: [number, number][] = [];
      const { type, color } = piece;
      const opponent = color === 'w' ? 'b' : 'w';

      if (type === 'p') {
        const fwd = color === 'w' ? -1 : 1;
        const startRank = color === 'w' ? 6 : 1;

        const nr = r + fwd;
        if (nr >= 0 && nr < 8 && !b[nr][c]) {
          moves.push([nr, c]);
          const nnr = r + 2 * fwd;
          if (r === startRank && !b[nnr][c]) {
            moves.push([nnr, c]);
          }
        }

        [-1, 1].forEach(dc => {
          const targetC = c + dc;
          if (nr >= 0 && nr < 8 && targetC >= 0 && targetC < 8) {
            const targetP = b[nr][targetC];
            if (targetP && targetP.color === opponent) {
              moves.push([nr, targetC]);
            }
            if (epTarget && epTarget[0] === nr && epTarget[1] === targetC) {
              moves.push([nr, targetC]);
            }
          }
        });
      } else if (type === 'n') {
        const offsets = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of offsets) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const targetP = b[nr][nc];
            if (!targetP || targetP.color === opponent) {
              moves.push([nr, nc]);
            }
          }
        }
      } else if (type === 'b' || type === 'r' || type === 'q') {
        const dirs: [number, number][] = [];
        if (type === 'b' || type === 'q') {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        if (type === 'r' || type === 'q') {
          dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }

        for (const [dr, dc] of dirs) {
          let step = 1;
          while (true) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
            const targetP = b[nr][nc];
            if (!targetP) {
              moves.push([nr, nc]);
            } else {
              if (targetP.color === opponent) {
                moves.push([nr, nc]);
              }
              break;
            }
            step++;
          }
        }
      } else if (type === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const targetP = b[nr][nc];
              if (!targetP || targetP.color === opponent) {
                moves.push([nr, nc]);
              }
            }
          }
        }

        const castleRights = color === 'w' ? wCastle : bCastle;
        const kingHomeRow = color === 'w' ? 7 : 0;
        if (r === kingHomeRow && c === 4 && !isInCheck(color, b)) {
          if (
            castleRights.kingside &&
            !b[kingHomeRow][5] &&
            !b[kingHomeRow][6] &&
            !isSquareAttacked(kingHomeRow, 5, opponent, b) &&
            !isSquareAttacked(kingHomeRow, 6, opponent, b) &&
            b[kingHomeRow][7]?.type === 'r' &&
            b[kingHomeRow][7]?.color === color
          ) {
            moves.push([kingHomeRow, 6]);
          }

          if (
            castleRights.queenside &&
            !b[kingHomeRow][3] &&
            !b[kingHomeRow][2] &&
            !b[kingHomeRow][1] &&
            !isSquareAttacked(kingHomeRow, 3, opponent, b) &&
            !isSquareAttacked(kingHomeRow, 2, opponent, b) &&
            b[kingHomeRow][0]?.type === 'r' &&
            b[kingHomeRow][0]?.color === color
          ) {
            moves.push([kingHomeRow, 2]);
          }
        }
      }

      if (!filterCheck) return moves;

      return moves.filter(([toR, toC]) => {
        const nextBoard = b.map(row => [...row]);
        const movingPiece = nextBoard[r][c]!;
        nextBoard[toR][toC] = movingPiece;
        nextBoard[r][c] = null;

        if (
          movingPiece.type === 'p' &&
          epTarget &&
          toR === epTarget[0] &&
          toC === epTarget[1]
        ) {
          const capRow = color === 'w' ? toR + 1 : toR - 1;
          nextBoard[capRow][toC] = null;
        }

        if (movingPiece.type === 'k' && Math.abs(toC - c) === 2) {
          if (toC === 6) {
            nextBoard[r][5] = nextBoard[r][7];
            nextBoard[r][7] = null;
          } else if (toC === 2) {
            nextBoard[r][3] = nextBoard[r][0];
            nextBoard[r][0] = null;
          }
        }

        return !isInCheck(color, nextBoard);
      });
    },
    [isInCheck, isSquareAttacked]
  );

  const getAllLegalMoves = useCallback(
    (
      color: PieceColor,
      b: Board,
      epTarget: [number, number] | null,
      wCastle: { kingside: boolean; queenside: boolean },
      bCastle: { kingside: boolean; queenside: boolean }
    ): { fromR: number; fromC: number; toR: number; toC: number }[] => {
      const allMoves: { fromR: number; fromC: number; toR: number; toC: number }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = b[r][c];
          if (p && p.color === color) {
            const pieceMoves = getPieceMoves(r, c, b, epTarget, wCastle, bCastle, true);
            for (const [toR, toC] of pieceMoves) {
              allMoves.push({ fromR: r, fromC: c, toR, toC });
            }
          }
        }
      }
      return allMoves;
    },
    [getPieceMoves]
  );

  const getAlgebraicNotation = (
    fromR: number,
    fromC: number,
    toR: number,
    toC: number,
    piece: Piece,
    captured: Piece | null,
    isCastle: 'kingside' | 'queenside' | undefined,
    promotion: PieceType | undefined
  ): string => {
    if (isCastle === 'kingside') return 'O-O';
    if (isCastle === 'queenside') return 'O-O-O';

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromSquare = `${files[fromC]}${8 - fromR}`;
    const toSquare = `${files[toC]}${8 - toR}`;
    const piecePrefix = piece.type === 'p' ? '' : piece.type.toUpperCase();
    const captureMarker = captured ? (piece.type === 'p' ? `${files[fromC]}x` : 'x') : '';
    const promoSuffix = promotion ? `=${promotion.toUpperCase()}` : '';

    return `${piecePrefix}${captureMarker}${toSquare}${promoSuffix}`;
  };

  // Evaluation Function (Centipawns from White's perspective)
  const evaluateBoard = useCallback((b: Board): number => {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p) continue;
        const val = PIECE_VALUES[p.type];
        let pst = 0;
        const pstRow = p.color === 'w' ? r : 7 - r;

        if (p.type === 'p') pst = PAWN_PST[pstRow][c];
        else if (p.type === 'n') pst = KNIGHT_PST[pstRow][c];
        else if (p.type === 'b') pst = BISHOP_PST[pstRow][c];
        else if (p.type === 'r') pst = ROOK_PST[pstRow][c];
        else if (p.type === 'q') pst = QUEEN_PST[pstRow][c];
        else if (p.type === 'k') pst = KING_MIDDLE_PST[pstRow][c];

        const totalVal = val + pst;
        if (p.color === 'w') score += totalVal;
        else score -= totalVal;
      }
    }
    return score;
  }, []);

  // Minimax Alpha-Beta Search Engine
  const minimax = useCallback(
    (
      b: Board,
      depth: number,
      alpha: number,
      beta: number,
      isMaximizing: boolean,
      ep: [number, number] | null,
      wCastle: { kingside: boolean; queenside: boolean },
      bCastle: { kingside: boolean; queenside: boolean }
    ): number => {
      const activeColor = isMaximizing ? 'w' : 'b';
      const moves = getAllLegalMoves(activeColor, b, ep, wCastle, bCastle);

      if (depth === 0 || moves.length === 0) {
        if (moves.length === 0) {
          if (isInCheck(activeColor, b)) {
            return isMaximizing ? -50000 + (3 - depth) : 50000 - (3 - depth);
          }
          return 0;
        }
        return evaluateBoard(b);
      }

      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const m of moves) {
          const nextB = b.map(row => [...row]);
          const movingP = nextB[m.fromR][m.fromC]!;
          nextB[m.toR][m.toC] = { ...movingP, hasMoved: true };
          nextB[m.fromR][m.fromC] = null;

          if (movingP.type === 'p' && (m.toR === 0 || m.toR === 7)) {
            nextB[m.toR][m.toC] = { type: 'q', color: 'w', hasMoved: true };
          }

          const evalScore = minimax(nextB, depth - 1, alpha, beta, false, null, wCastle, bCastle);
          maxEval = Math.max(maxEval, evalScore);
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const m of moves) {
          const nextB = b.map(row => [...row]);
          const movingP = nextB[m.fromR][m.fromC]!;
          nextB[m.toR][m.toC] = { ...movingP, hasMoved: true };
          nextB[m.fromR][m.fromC] = null;

          if (movingP.type === 'p' && (m.toR === 0 || m.toR === 7)) {
            nextB[m.toR][m.toC] = { type: 'q', color: 'b', hasMoved: true };
          }

          const evalScore = minimax(nextB, depth - 1, alpha, beta, true, null, wCastle, bCastle);
          minEval = Math.min(minEval, evalScore);
          beta = Math.min(beta, evalScore);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    },
    [evaluateBoard, getAllLegalMoves, isInCheck]
  );

  // Opening Detector
  const currentOpening = useMemo(() => {
    const notations = moveHistory.map(m => m.notation || '');
    for (const op of CHESS_OPENINGS) {
      if (op.seq.length <= notations.length) {
        const isMatch = op.seq.every((moveNotation, i) => notations[i] === moveNotation);
        if (isMatch) {
          return op;
        }
      }
    }
    return null;
  }, [moveHistory]);

  // Execute a verified legal move
  const executeMove = useCallback(
    (
      fromR: number,
      fromC: number,
      toR: number,
      toC: number,
      chosenPromotion?: PieceType
    ) => {
      const currentPiece = board[fromR][fromC];
      if (!currentPiece) return;

      const nextBoard = board.map(row => [...row]);
      let capturedPiece = nextBoard[toR][toC];
      let isEnPassant = false;
      let isCastling: 'kingside' | 'queenside' | undefined = undefined;
      const color = currentPiece.color;
      const opponent = color === 'w' ? 'b' : 'w';

      // 1. En Passant Capture Check
      if (
        currentPiece.type === 'p' &&
        enPassantTarget &&
        toR === enPassantTarget[0] &&
        toC === enPassantTarget[1]
      ) {
        isEnPassant = true;
        const capRow = color === 'w' ? toR + 1 : toR - 1;
        capturedPiece = nextBoard[capRow][toC];
        nextBoard[capRow][toC] = null;
      }

      // 2. Castling Move Execution
      if (currentPiece.type === 'k' && Math.abs(toC - fromC) === 2) {
        if (toC === 6) {
          isCastling = 'kingside';
          nextBoard[fromR][5] = nextBoard[fromR][7];
          nextBoard[fromR][7] = null;
          if (nextBoard[fromR][5]) nextBoard[fromR][5]!.hasMoved = true;
        } else if (toC === 2) {
          isCastling = 'queenside';
          nextBoard[fromR][3] = nextBoard[fromR][0];
          nextBoard[fromR][0] = null;
          if (nextBoard[fromR][3]) nextBoard[fromR][3]!.hasMoved = true;
        }
      }

      // 3. Move Piece & Update Board
      const updatedPiece: Piece = {
        ...currentPiece,
        type: chosenPromotion || currentPiece.type,
        hasMoved: true
      };
      nextBoard[toR][toC] = updatedPiece;
      nextBoard[fromR][fromC] = null;

      // 4. Update Captured Graveyards
      if (capturedPiece) {
        if (capturedPiece.color === 'w') {
          setCapturedWhite(prev => [...prev, capturedPiece!.type]);
        } else {
          setCapturedBlack(prev => [...prev, capturedPiece!.type]);
        }
      }

      // 5. Update Castling Rights
      const nextWCastle = { ...whiteCastling };
      const nextBCastle = { ...blackCastling };
      if (currentPiece.type === 'k') {
        if (color === 'w') nextWCastle.kingside = nextWCastle.queenside = false;
        else nextBCastle.kingside = nextBCastle.queenside = false;
      } else if (currentPiece.type === 'r') {
        if (color === 'w') {
          if (fromR === 7 && fromC === 0) nextWCastle.queenside = false;
          if (fromR === 7 && fromC === 7) nextWCastle.kingside = false;
        } else {
          if (fromR === 0 && fromC === 0) nextBCastle.queenside = false;
          if (fromR === 0 && fromC === 7) nextBCastle.kingside = false;
        }
      }
      if (toR === 7 && toC === 0) nextWCastle.queenside = false;
      if (toR === 7 && toC === 7) nextWCastle.kingside = false;
      if (toR === 0 && toC === 0) nextBCastle.queenside = false;
      if (toR === 0 && toC === 7) nextBCastle.kingside = false;

      setWhiteCastling(nextWCastle);
      setBlackCastling(nextBCastle);

      // 6. En Passant Target Generation
      let nextEnPassant: [number, number] | null = null;
      if (currentPiece.type === 'p' && Math.abs(toR - fromR) === 2) {
        const midRow = color === 'w' ? fromR - 1 : fromR + 1;
        nextEnPassant = [midRow, fromC];
      }
      setEnPassantTarget(nextEnPassant);

      // 7. Calculate Move Evaluation & Move Quality
      const evalAfterMove = evaluateBoard(nextBoard);
      setCurrentEval(evalAfterMove);
      setBestMoveHint(null);

      // Quality Classification
      let quality: MoveQuality = 'good';
      const prevEval = currentEval;
      const isPlayerWhite = color === 'w';
      const evalDelta = isPlayerWhite ? prevEval - evalAfterMove : evalAfterMove - prevEval;

      if (moveHistory.length < 6 && currentOpening) {
        quality = 'book';
      } else if (capturedPiece && (capturedPiece.type === 'q' || capturedPiece.type === 'r') && evalAfterMove * (isPlayerWhite ? 1 : -1) > 200) {
        quality = 'brilliant';
      } else if (evalDelta <= 15) {
        quality = 'best';
      } else if (evalDelta <= 45) {
        quality = 'excellent';
      } else if (evalDelta <= 120) {
        quality = 'good';
      } else if (evalDelta <= 250) {
        quality = 'inaccuracy';
      } else if (evalDelta <= 450) {
        quality = 'mistake';
      } else {
        quality = 'blunder';
      }

      // 8. Move History Record
      const notation = getAlgebraicNotation(
        fromR,
        fromC,
        toR,
        toC,
        currentPiece,
        capturedPiece,
        isCastling,
        chosenPromotion
      );
      const moveRecord: Move = {
        fromR,
        fromC,
        toR,
        toC,
        piece: currentPiece,
        capturedPiece,
        isEnPassant,
        isCastling,
        promotionType: chosenPromotion,
        prevEnPassant: enPassantTarget,
        notation,
        quality,
        evalAfter: evalAfterMove,
        boardState: nextBoard
      };
      setMoveHistory(prev => [...prev, moveRecord]);
      setViewingPly(null);

      // 9. SFX Trigger
      if (quality === 'brilliant') playSound('brilliant');
      else if (chosenPromotion) playSound('promote');
      else if (isCastling) playSound('castle');
      else if (capturedPiece) playSound('capture');
      else playSound('move');

      // 10. Update Board State & Turn
      setBoard(nextBoard);
      setSelectedSquare(null);
      setValidMoves([]);
      setPromotionPending(null);
      setTurn(opponent);
      setIsClockRunning(true);

      // 11. Check / Checkmate / Stalemate Evaluation
      const opponentInCheck = isInCheck(opponent, nextBoard);
      setIsCheck(opponentInCheck ? opponent : null);

      const opponentLegalMoves = getAllLegalMoves(
        opponent,
        nextBoard,
        nextEnPassant,
        nextWCastle,
        nextBCastle
      );

      if (opponentLegalMoves.length === 0) {
        setIsClockRunning(false);
        if (opponentInCheck) {
          setGameResult(color);
          setResultReason(`Checkmate! ${color === 'w' ? 'White' : 'Black'} wins by tactical supremacy.`);
          if (color === playerColor && gameMode === 'ai') {
            playSound('victory');
            try {
              confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
            } catch {}
            handleFinalScore(true);
          } else {
            playSound('defeat');
          }
        } else {
          setGameResult('draw');
          setResultReason('Stalemate! No legal moves available.');
          playSound('draw');
        }
      } else if (opponentInCheck) {
        playSound('check');
      }
    },
    [
      board,
      enPassantTarget,
      whiteCastling,
      blackCastling,
      playSound,
      isInCheck,
      getAllLegalMoves,
      playerColor,
      gameMode,
      evaluateBoard,
      currentEval,
      currentOpening,
      moveHistory.length
    ]
  );

  // Tactical Hint Generator
  const requestEngineHint = () => {
    if (gameResult || isAiThinking) return;
    const currentLegal = getAllLegalMoves(
      turn,
      board,
      enPassantTarget,
      whiteCastling,
      blackCastling
    );
    if (currentLegal.length === 0) return;

    let bestMove = currentLegal[0];
    let bestVal = turn === 'w' ? -Infinity : Infinity;

    for (const m of currentLegal) {
      const nextB = board.map(row => [...row]);
      const movingP = nextB[m.fromR][m.fromC]!;
      nextB[m.toR][m.toC] = { ...movingP, hasMoved: true };
      nextB[m.fromR][m.fromC] = null;

      const score = minimax(
        nextB,
        2,
        -Infinity,
        Infinity,
        turn !== 'w',
        null,
        whiteCastling,
        blackCastling
      );

      if (turn === 'w') {
        if (score > bestVal) {
          bestVal = score;
          bestMove = m;
        }
      } else {
        if (score < bestVal) {
          bestVal = score;
          bestMove = m;
        }
      }
    }

    setBestMoveHint(bestMove);
    playSound('select');
  };

  // Score Calculation and Game Over Dispatch
  const handleFinalScore = (didWin: boolean) => {
    let base = 0;
    if (didWin) {
      if (aiDifficulty === 'novice') base = 5000;
      else if (aiDifficulty === 'tactician') base = 12000;
      else if (aiDifficulty === 'grandmaster') base = 25000;
    } else {
      base = 1000;
    }

    const whiteMat = capturedBlack.reduce((acc, p) => acc + PIECE_VALUES[p], 0);
    const blackMat = capturedWhite.reduce((acc, p) => acc + PIECE_VALUES[p], 0);
    const matBonus = Math.max(0, (playerColor === 'w' ? whiteMat - blackMat : blackMat - whiteMat) * 2);

    const turnCount = Math.floor(moveHistory.length / 2) + 1;
    const efficiency = Math.max(0, 5000 - turnCount * 80);

    const totalScore = Math.min(50000, base + matBonus + efficiency);
    onGameOver(Math.round(totalScore));
  };

  // Square Click Handler
  const handleSquareClick = (r: number, c: number) => {
    if (gameResult || isAiThinking || viewingPly !== null) return;
    if (promotionPending) return;
    if (gameMode === 'ai' && turn !== playerColor) return;

    const clickedPiece = board[r][c];

    if (selectedSquare) {
      const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
      if (isValid) {
        const [fromR, fromC] = selectedSquare;
        const movingP = board[fromR][fromC];

        if (movingP && movingP.type === 'p' && (r === 0 || r === 7)) {
          setPromotionPending({
            fromR,
            fromC,
            toR: r,
            toC: c,
            color: movingP.color
          });
          return;
        }

        executeMove(fromR, fromC, r, c);
        return;
      }
    }

    if (clickedPiece && clickedPiece.color === turn) {
      if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setSelectedSquare([r, c]);
        const legal = getPieceMoves(
          r,
          c,
          board,
          enPassantTarget,
          whiteCastling,
          blackCastling,
          true
        );
        setValidMoves(legal);
        playSound('select');
      }
      return;
    }

    setSelectedSquare(null);
    setValidMoves([]);
  };

  // Trigger AI Turn
  useEffect(() => {
    if (gameMode !== 'ai' || turn === playerColor || gameResult || viewingPly !== null) return;

    setIsAiThinking(true);
    const timer = setTimeout(() => {
      const aiColor: PieceColor = playerColor === 'w' ? 'b' : 'w';
      const legalMoves = getAllLegalMoves(
        aiColor,
        board,
        enPassantTarget,
        whiteCastling,
        blackCastling
      );

      if (legalMoves.length === 0) {
        setIsAiThinking(false);
        return;
      }

      let chosenMove: { fromR: number; fromC: number; toR: number; toC: number } = legalMoves[0];

      if (aiDifficulty === 'novice') {
        const captureMoves = legalMoves.filter(m => board[m.toR][m.toC] !== null);
        if (captureMoves.length > 0 && Math.random() < 0.75) {
          chosenMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
        } else {
          chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
      } else {
        const searchDepth = aiDifficulty === 'grandmaster' ? 3 : 2;
        let bestVal = aiColor === 'b' ? Infinity : -Infinity;
        const shuffled = [...legalMoves].sort(() => Math.random() - 0.5);

        for (const m of shuffled) {
          const nextB = board.map(row => [...row]);
          const movingP = nextB[m.fromR][m.fromC]!;
          nextB[m.toR][m.toC] = { ...movingP, hasMoved: true };
          nextB[m.fromR][m.fromC] = null;

          if (movingP.type === 'p' && (m.toR === 0 || m.toR === 7)) {
            nextB[m.toR][m.toC] = { type: 'q', color: aiColor, hasMoved: true };
          }

          const score = minimax(
            nextB,
            searchDepth - 1,
            -Infinity,
            Infinity,
            aiColor === 'b', // If AI is Black, next is maximizing White
            null,
            whiteCastling,
            blackCastling
          );

          if (aiColor === 'b') {
            if (score < bestVal) {
              bestVal = score;
              chosenMove = m;
            }
          } else {
            if (score > bestVal) {
              bestVal = score;
              chosenMove = m;
            }
          }
        }
      }

      const piece = board[chosenMove.fromR][chosenMove.fromC];
      const isPromo = piece?.type === 'p' && (chosenMove.toR === 0 || chosenMove.toR === 7);

      executeMove(
        chosenMove.fromR,
        chosenMove.fromC,
        chosenMove.toR,
        chosenMove.toC,
        isPromo ? 'q' : undefined
      );
      setIsAiThinking(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [
    turn,
    playerColor,
    gameMode,
    aiDifficulty,
    board,
    enPassantTarget,
    whiteCastling,
    blackCastling,
    gameResult,
    viewingPly,
    executeMove,
    getAllLegalMoves,
    minimax
  ]);

  // Restart / Reset Game
  const resetGame = () => {
    setBoard(createInitialBoard());
    setTurn('w');
    setSelectedSquare(null);
    setValidMoves([]);
    setMoveHistory([]);
    setEnPassantTarget(null);
    setWhiteCastling({ kingside: true, queenside: true });
    setBlackCastling({ kingside: true, queenside: true });
    setIsCheck(null);
    setGameResult(null);
    setResultReason('');
    setIsAiThinking(false);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setPromotionPending(null);
    setViewingPly(null);
    setCurrentEval(0);
    setBestMoveHint(null);
    let t = 300;
    if (timeControl === 'blitz') t = 180;
    else if (timeControl === 'rapid') t = 300;
    else if (timeControl === 'classic') t = 600;
    else if (timeControl === 'unlimited') t = 0;
    setWhiteTime(t);
    setBlackTime(t);
    setIsClockRunning(false);
    playSound('select');
  };

  // Material Balance Calculator
  const materialAdvantage = useMemo(() => {
    const whiteSum = capturedBlack.reduce((acc, p) => acc + PIECE_VALUES[p], 0);
    const blackSum = capturedWhite.reduce((acc, p) => acc + PIECE_VALUES[p], 0);
    return (whiteSum - blackSum) / 100;
  }, [capturedWhite, capturedBlack]);

  // Accuracy Calculator for Game Review
  const reviewStats = useMemo(() => {
    if (moveHistory.length === 0) return null;

    let whiteQualities: Record<MoveQuality, number> = {
      brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0
    };
    let blackQualities: Record<MoveQuality, number> = {
      brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0
    };

    let whiteScore = 0;
    let blackScore = 0;
    let whiteMoves = 0;
    let blackMoves = 0;

    const weights: Record<MoveQuality, number> = {
      brilliant: 100, great: 98, best: 100, book: 100, excellent: 90, good: 75, inaccuracy: 50, mistake: 25, blunder: 0
    };

    moveHistory.forEach((m, idx) => {
      const q = m.quality || 'good';
      if (idx % 2 === 0) {
        whiteQualities[q]++;
        whiteScore += weights[q];
        whiteMoves++;
      } else {
        blackQualities[q]++;
        blackScore += weights[q];
        blackMoves++;
      }
    });

    const whiteAccuracy = whiteMoves > 0 ? (whiteScore / whiteMoves).toFixed(1) : '100.0';
    const blackAccuracy = blackMoves > 0 ? (blackScore / blackMoves).toFixed(1) : '100.0';

    return { whiteQualities, blackQualities, whiteAccuracy, blackAccuracy, whiteMoves, blackMoves };
  }, [moveHistory]);

  // PGN & FEN Serializers
  const generatedFen = useMemo(() => {
    const activeB = viewingPly !== null && moveHistory[viewingPly]?.boardState ? moveHistory[viewingPly].boardState! : board;
    return boardToFen(activeB, turn, whiteCastling, blackCastling, enPassantTarget, 0, Math.floor(moveHistory.length / 2) + 1);
  }, [board, turn, whiteCastling, blackCastling, enPassantTarget, moveHistory, viewingPly]);

  const generatedPgn = useMemo(() => {
    let pgn = `[Event "Break Hub Cyber Chess"]\n[Site "BreakHub.online"]\n[Date "${new Date().toISOString().split('T')[0]}"]\n[White "${playerColor === 'w' ? 'Human Player' : 'Cortex AI'}"]\n[Black "${playerColor === 'b' ? 'Human Player' : 'Cortex AI'}"]\n[Result "${gameResult === 'w' ? '1-0' : gameResult === 'b' ? '0-1' : gameResult === 'draw' ? '1/2-1/2' : '*'}"]\n\n`;

    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wNotation = moveHistory[i]?.notation || '';
      const bNotation = moveHistory[i + 1]?.notation || '';
      pgn += `${moveNum}. ${wNotation} ${bNotation} `.trim() + ' ';
    }
    if (gameResult === 'w') pgn += ' 1-0';
    else if (gameResult === 'b') pgn += ' 0-1';
    else if (gameResult === 'draw') pgn += ' 1/2-1/2';
    return pgn.trim();
  }, [moveHistory, gameResult, playerColor]);

  // SVG Piece Icon Renderer
  const renderPieceIcon = (type: PieceType, color: PieceColor) => {
    const isWhite = color === 'w';
    const fill = isWhite ? '#FFF570' : '#FF4B91';

    if (type === 'p') {
      return (
        <svg viewBox="0 0 45 45" className="w-[75%] h-[75%] drop-shadow-md transition-transform duration-150">
          <circle cx="22.5" cy="14" r="6" fill={fill} stroke="#000" strokeWidth="2.5" />
          <path d="M 17 22 C 17 22, 12 30, 14 36 L 31 36 C 33 30, 28 22, 28 22 Z" fill={fill} stroke="#000" strokeWidth="2.5" />
          <rect x="11" y="36" width="23" height="4.5" rx="2" fill={fill} stroke="#000" strokeWidth="2.5" />
        </svg>
      );
    }
    if (type === 'r') {
      return (
        <svg viewBox="0 0 45 45" className="w-[80%] h-[80%] drop-shadow-md transition-transform duration-150">
          <path d="M 12 11 L 12 17 L 15 17 L 15 14 L 20 14 L 20 17 L 25 17 L 25 14 L 30 14 L 30 17 L 33 17 L 33 11 Z" fill={fill} stroke="#000" strokeWidth="2.5" />
          <path d="M 15 17 L 16 34 L 29 34 L 30 17 Z" fill={fill} stroke="#000" strokeWidth="2.5" />
          <rect x="11" y="34" width="23" height="5" rx="2" fill={fill} stroke="#000" strokeWidth="2.5" />
        </svg>
      );
    }
    if (type === 'n') {
      return (
        <svg viewBox="0 0 45 45" className="w-[82%] h-[82%] drop-shadow-md transition-transform duration-150">
          <path
            d="M 22 10 C 22 10, 14 11, 12 20 C 11 25, 14 27, 18 26 C 13 30, 11 36, 11 36 L 33 36 C 33 36, 34 26, 30 19 C 27 14, 25 10, 22 10 Z"
            fill={fill}
            stroke="#000"
            strokeWidth="2.5"
          />
          <circle cx="16" cy="18" r="2" fill="#000" />
          <rect x="10" y="36" width="25" height="4.5" rx="2" fill={fill} stroke="#000" strokeWidth="2.5" />
        </svg>
      );
    }
    if (type === 'b') {
      return (
        <svg viewBox="0 0 45 45" className="w-[82%] h-[82%] drop-shadow-md transition-transform duration-150">
          <circle cx="22.5" cy="10" r="3" fill={fill} stroke="#000" strokeWidth="2.5" />
          <path
            d="M 22.5 13 C 15 13, 13 22, 16 28 C 17 30, 15 34, 15 34 L 30 34 C 30 34, 28 30, 29 28 C 32 22, 30 13, 22.5 13 Z"
            fill={fill}
            stroke="#000"
            strokeWidth="2.5"
          />
          <path d="M 22.5 17 L 22.5 24 M 19 20.5 L 26 20.5" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="11" y="34" width="23" height="5" rx="2" fill={fill} stroke="#000" strokeWidth="2.5" />
        </svg>
      );
    }
    if (type === 'q') {
      return (
        <svg viewBox="0 0 45 45" className="w-[86%] h-[86%] drop-shadow-md transition-transform duration-150">
          <circle cx="9" cy="14" r="2.5" fill={fill} stroke="#000" strokeWidth="2" />
          <circle cx="15.5" cy="11" r="2.5" fill={fill} stroke="#000" strokeWidth="2" />
          <circle cx="22.5" cy="9.5" r="2.5" fill={fill} stroke="#000" strokeWidth="2" />
          <circle cx="29.5" cy="11" r="2.5" fill={fill} stroke="#000" strokeWidth="2" />
          <circle cx="36" cy="14" r="2.5" fill={fill} stroke="#000" strokeWidth="2" />
          <path d="M 10 16 L 14 33 L 31 33 L 35 16 L 28 23 L 22.5 12 L 17 23 Z" fill={fill} stroke="#000" strokeWidth="2.5" />
          <rect x="10" y="33" width="25" height="5" rx="2" fill={fill} stroke="#000" strokeWidth="2.5" />
        </svg>
      );
    }
    if (type === 'k') {
      return (
        <svg viewBox="0 0 45 45" className="w-[88%] h-[88%] drop-shadow-md transition-transform duration-150">
          <path d="M 22.5 6 L 22.5 14 M 18.5 10 L 26.5 10" stroke={fill} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 22.5 6 L 22.5 14 M 18.5 10 L 26.5 10" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M 12 18 C 12 18, 14 14, 22.5 14 C 31 14, 33 18, 33 18 C 33 24, 29 27, 29 33 L 16 33 C 16 27, 12 24, 12 18 Z"
            fill={fill}
            stroke="#000"
            strokeWidth="2.5"
          />
          <rect x="11" y="33" width="23" height="5" rx="2" fill={fill} stroke="#000" strokeWidth="2.5" />
        </svg>
      );
    }
    return null;
  };

  const renderQualityBadge = (q?: MoveQuality) => {
    if (!q) return null;
    switch (q) {
      case 'brilliant':
        return <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-black font-black text-[9px] uppercase border border-black shadow-sm flex items-center gap-0.5">🌟 BRILLIANT</span>;
      case 'great':
        return <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-white font-black text-[9px] uppercase border border-black shadow-sm flex items-center gap-0.5">🎯 GREAT</span>;
      case 'best':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black font-black text-[9px] uppercase border border-black shadow-sm flex items-center gap-0.5">⭐ BEST</span>;
      case 'excellent':
        return <span className="px-1.5 py-0.5 rounded bg-green-500 text-black font-black text-[9px] uppercase border border-black shadow-sm flex items-center gap-0.5">✨ EXCELLENT</span>;
      case 'book':
        return <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white font-black text-[9px] uppercase border border-black shadow-sm flex items-center gap-0.5">📖 BOOK</span>;
      case 'inaccuracy':
        return <span className="px-1.5 py-0.5 rounded bg-yellow-500 text-black font-black text-[9px] uppercase border border-black shadow-sm flex items-center gap-0.5">⚠️ INACCURACY</span>;
      case 'mistake':
        return <span className="px-1.5 py-0.5 rounded bg-orange-500 text-white font-black text-[9px] uppercase border border-black shadow-sm flex items-center gap-0.5">❓ MISTAKE</span>;
      case 'blunder':
        return <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] uppercase border border-black shadow-sm flex items-center gap-0.5">❌ BLUNDER</span>;
      default:
        return null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isFlipped = boardFlipped || (gameMode === 'ai' && playerColor === 'b');
  const activeDisplayBoard = viewingPly !== null && moveHistory[viewingPly]?.boardState ? moveHistory[viewingPly].boardState! : board;
  const lastMove = viewingPly !== null ? moveHistory[viewingPly] : (moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null);

  // Win probability calculation for Eval Bar (White %)
  const whiteWinProb = useMemo(() => {
    // Sigmoid mapping for centipawns
    const p = 50 + 50 * (2 / (1 + Math.exp(-0.0035 * currentEval)) - 1);
    return Math.max(5, Math.min(95, Math.round(p)));
  }, [currentEval]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center select-none outline-none font-sans p-0.5 sm:p-2">
      {/* Top Header Controls Ribbon */}
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-2.5 mb-2 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-black font-black text-[11px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-neo-sm">
            <Crown className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span>CYBER CHESS // PRO</span>
          </div>

          <button
            onClick={() => setGameMode(prev => (prev === 'ai' ? 'pvp' : 'ai'))}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-portal-card border-2 border-black text-[10px] sm:text-[11px] font-black uppercase text-portal-yellow hover:bg-portal-yellow hover:text-black transition-all shadow-neo-sm"
          >
            {gameMode === 'ai' ? <Bot className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            <span className="hidden xs:inline">{gameMode === 'ai' ? 'VS AI' : 'PASS & PLAY'}</span>
          </button>

          {gameMode === 'ai' && (
            <div className="hidden sm:flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-black">
              {(['novice', 'tactician', 'grandmaster'] as AiDifficulty[]).map(diff => (
                <button
                  key={diff}
                  onClick={() => setAiDifficulty(diff)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase transition-all ${
                    aiDifficulty === diff
                      ? 'bg-portal-pink text-white border border-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {diff.slice(0, 3)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Tools: Hint, FEN/PGN, Game Review, Flip, Sound, Reset */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={requestEngineHint}
            disabled={!!gameResult || isAiThinking}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-portal-card hover:bg-emerald-500 text-slate-200 hover:text-black border-2 border-black shadow-neo-sm font-black text-[10px] sm:text-xs uppercase transition-all disabled:opacity-40"
            title="Tactical Engine Hint (Best Move)"
          >
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden sm:inline">HINT</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPgnModal(true)}
            className="p-1 sm:p-1.5 rounded-xl bg-portal-card hover:bg-portal-cyan text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all"
            title="Export / Import PGN & FEN"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {moveHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gradient-to-r from-portal-pink to-portal-yellow text-black border-2 border-black shadow-neo-sm font-black text-[10px] sm:text-xs uppercase transition-all"
              title="Post-Match Game Review & Accuracy"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">REVIEW</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setBoardFlipped(prev => !prev)}
            className="p-1 sm:p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all"
            title="Flip Board Orientation"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1 sm:p-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm transition-all"
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={resetGame}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black border-2 border-black shadow-neo-sm font-black text-[10px] sm:text-xs uppercase transition-all"
          >
            <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span className="hidden xs:inline">RESET</span>
          </button>
        </div>
      </div>

      {/* Opening Identifier Banner */}
      {currentOpening && (
        <div className="w-full flex items-center justify-between px-3 py-1 mb-2 bg-portal-card border-2 border-black rounded-xl shadow-neo-sm">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase text-portal-yellow">
            <BookOpen className="w-3.5 h-3.5 text-portal-cyan" />
            <span>OPENING: {currentOpening.name}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono font-black text-portal-cyan border border-black">
            ECO {currentOpening.eco}
          </span>
        </div>
      )}

      {/* Replay Notice Bar */}
      {viewingPly !== null && (
        <div className="w-full flex items-center justify-between px-3 py-1.5 mb-2 bg-portal-pink border-2 border-black rounded-xl shadow-neo animate-pulse text-black font-black text-xs uppercase">
          <span>REPLAYING MOVE {viewingPly + 1} OF {moveHistory.length}</span>
          <button
            onClick={() => setViewingPly(null)}
            className="px-2 py-0.5 rounded bg-black text-white text-[10px] hover:bg-white hover:text-black border border-black transition-all"
          >
            RETURN TO LIVE GAME
          </button>
        </div>
      )}

      {/* Main Arena: Dynamic Real-Time Eval Bar + 8x8 Board + Right Telemetry Panel */}
      <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-2 sm:gap-3 md:gap-4 flex-1">
        {/* Real-Time Live Evaluation Gauge (Chess.com Eval Bar) */}
        <div className="hidden sm:flex flex-col items-center justify-between w-6 sm:w-7 md:w-8 rounded-xl bg-black border-2 border-black shadow-neo-sm overflow-hidden relative shrink-0 self-stretch my-auto max-h-[min(80vw,calc(100vh-240px))]">
          {/* Black Advantage (Top) */}
          <div
            className="w-full bg-[#1E293B] transition-all duration-300 flex items-center justify-center"
            style={{ height: `${100 - whiteWinProb}%` }}
          >
            {whiteWinProb < 45 && (
              <span className="text-[9px] font-black text-white font-mono rotate-90 whitespace-nowrap">
                {(currentEval / 100).toFixed(1)}
              </span>
            )}
          </div>
          {/* White Advantage (Bottom) */}
          <div
            className="w-full bg-[#FFF570] transition-all duration-300 flex items-center justify-center"
            style={{ height: `${whiteWinProb}%` }}
          >
            {whiteWinProb >= 45 && (
              <span className="text-[9px] font-black text-black font-mono rotate-90 whitespace-nowrap">
                {currentEval > 0 ? `+${(currentEval / 100).toFixed(1)}` : (currentEval / 100).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Board Column - Dynamically sized to maximize viewport dimensions */}
        <div className="flex flex-col items-center w-full max-w-[min(96vw,calc(100vh-210px))] sm:max-w-[min(92vw,calc(100vh-230px))] lg:max-w-[min(54vw,calc(100vh-210px))] xl:max-w-[min(58vw,calc(100vh-210px))] shrink-0">
          {/* Top Opponent Bar */}
          <div className="w-full flex items-center justify-between px-3 py-1.5 mb-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-portal-pink border-2 border-black shadow-sm flex items-center justify-center">
                <span className="text-[8px] font-black text-white">B</span>
              </div>
              <span className="font-black text-xs text-white uppercase tracking-wide">
                {gameMode === 'ai' ? `CORTEX AI (${aiDifficulty.toUpperCase()})` : 'PLAYER 2 (BLACK)'}
              </span>
              {isAiThinking && (
                <span className="px-1.5 py-0.2 rounded bg-portal-cyan/20 text-portal-cyan text-[9px] font-black uppercase animate-pulse">
                  CALCULATING...
                </span>
              )}
            </div>

            {timeControl !== 'unlimited' && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 border-black font-mono font-black text-xs ${
                  turn === 'b' && isClockRunning
                    ? 'bg-portal-pink text-white animate-pulse'
                    : 'bg-portal-card text-slate-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{formatTime(blackTime)}</span>
              </div>
            )}
          </div>

          {/* Captured Graveyard (White pieces captured by Black) */}
          <div className="w-full flex items-center justify-between px-2 py-1 min-h-[26px] mb-1 bg-black/40 rounded-lg border border-black/60">
            <div className="flex items-center gap-1 flex-wrap">
              {capturedWhite.map((type, idx) => (
                <span key={idx} className="w-4 h-4 flex items-center justify-center">
                  {renderPieceIcon(type, 'w')}
                </span>
              ))}
            </div>
            {materialAdvantage < 0 && (
              <span className="text-[10px] font-black text-portal-pink font-mono">
                +{Math.abs(materialAdvantage)}
              </span>
            )}
          </div>

          {/* 8x8 CYBER MATRIX CHESSBOARD - Aspect Square Fluid Scaler */}
          <div className="relative w-full aspect-square p-1.5 sm:p-2.5 rounded-2xl bg-portal-surface border-3 sm:border-4 border-black shadow-neo-lg overflow-hidden flex items-center justify-center">
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full aspect-square border-2 border-black rounded-xl overflow-hidden bg-portal-card">
              {Array.from({ length: 8 }).map((_, rawR) => {
                const r = isFlipped ? 7 - rawR : rawR;
                return Array.from({ length: 8 }).map((_, rawC) => {
                  const c = isFlipped ? 7 - rawC : rawC;
                  const piece = activeDisplayBoard[r][c];
                  const isLightSquare = (r + c) % 2 === 0;
                  const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                  const isValidTarget = validMoves.some(([vr, vc]) => vr === r && vc === c);
                  const isLastMoveFrom = lastMove && lastMove.fromR === r && lastMove.fromC === c;
                  const isLastMoveTo = lastMove && lastMove.toR === r && lastMove.toC === c;
                  const isKingInCheck = isCheck === piece?.color && piece?.type === 'k';
                  const isHintFrom = bestMoveHint && bestMoveHint.fromR === r && bestMoveHint.fromC === c;
                  const isHintTo = bestMoveHint && bestMoveHint.toR === r && bestMoveHint.toC === c;

                  let bgClass = isLightSquare ? 'bg-[#1E293B]' : 'bg-[#0F172A]';
                  if (isSelected) bgClass = 'bg-[#00F0FF]/30 ring-2 ring-portal-cyan inset-0';
                  else if (isLastMoveTo || isLastMoveFrom) bgClass = 'bg-[#FFF570]/20';
                  if (isHintFrom || isHintTo) bgClass = 'bg-emerald-500/30 ring-2 ring-emerald-400 animate-pulse';
                  if (isKingInCheck) bgClass = 'bg-rose-600/40 ring-4 ring-rose-500 animate-pulse';

                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      data-coord={`${String.fromCharCode(97 + c)}${8 - r}`}
                      aria-label={`Square ${String.fromCharCode(97 + c)}${8 - r}`}
                      onClick={() => handleSquareClick(r, c)}
                      className={`relative flex items-center justify-center aspect-square p-0.5 border-[0.5px] border-black/40 cursor-pointer select-none transition-colors ${bgClass}`}
                    >
                      {rawC === 0 && (
                        <span className="absolute top-0.5 left-0.5 sm:left-1 text-[7px] sm:text-[9px] md:text-[10px] font-black text-slate-500 pointer-events-none">
                          {8 - r}
                        </span>
                      )}
                      {rawR === 7 && (
                        <span className="absolute bottom-0.5 right-0.5 sm:right-1 text-[7px] sm:text-[9px] md:text-[10px] font-black text-slate-500 pointer-events-none">
                          {String.fromCharCode(97 + c)}
                        </span>
                      )}

                      {isValidTarget && (
                        <div
                          className={`absolute z-20 pointer-events-none ${
                            piece
                              ? 'w-full h-full border-2 sm:border-3 border-portal-yellow rounded-lg bg-portal-yellow/20 animate-pulse'
                              : 'w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-portal-cyan/80 shadow-neo-sm ring-2 ring-black'
                          }`}
                        />
                      )}

                      {piece && renderPieceIcon(piece.type, piece.color)}
                    </button>
                  );
                });
              })}
            </div>

            {/* Pawn Promotion Modal Overlay */}
            {promotionPending && (
              <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                <p className="text-sm font-black text-portal-yellow uppercase mb-3 tracking-wider text-center">
                  QUANTUM PROMOTION // CHOOSE PIECE
                </p>
                <div className="flex items-center gap-2">
                  {(['q', 'r', 'b', 'n'] as PieceType[]).map(type => (
                    <button
                      key={type}
                      onClick={() =>
                        executeMove(
                          promotionPending.fromR,
                          promotionPending.fromC,
                          promotionPending.toR,
                          promotionPending.toC,
                          type
                        )
                      }
                      className="w-14 h-14 rounded-2xl bg-portal-card hover:bg-portal-yellow border-3 border-black shadow-neo flex items-center justify-center transition-all hover:scale-110"
                    >
                      {renderPieceIcon(type, promotionPending.color)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Captured Graveyard (Black pieces captured by White) */}
          <div className="w-full flex items-center justify-between px-2 py-1 min-h-[26px] mt-1 bg-black/40 rounded-lg border border-black/60">
            <div className="flex items-center gap-1 flex-wrap">
              {capturedBlack.map((type, idx) => (
                <span key={idx} className="w-4 h-4 flex items-center justify-center">
                  {renderPieceIcon(type, 'b')}
                </span>
              ))}
            </div>
            {materialAdvantage > 0 && (
              <span className="text-[10px] font-black text-portal-yellow font-mono">
                +{materialAdvantage}
              </span>
            )}
          </div>

          {/* Bottom Player Bar */}
          <div className="w-full flex items-center justify-between px-3 py-1.5 mt-1.5 rounded-xl bg-portal-surface border-2 border-black shadow-neo-sm">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-portal-yellow border-2 border-black shadow-sm flex items-center justify-center">
                <span className="text-[8px] font-black text-black">W</span>
              </div>
              <span className="font-black text-xs text-white uppercase tracking-wide">
                {gameMode === 'ai' ? 'YOU (WHITE)' : 'PLAYER 1 (WHITE)'}
              </span>
            </div>

            {timeControl !== 'unlimited' && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 border-black font-mono font-black text-xs ${
                  turn === 'w' && isClockRunning
                    ? 'bg-portal-yellow text-black animate-pulse'
                    : 'bg-portal-card text-slate-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{formatTime(whiteTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Move History, Badges & Replay Controls */}
        <div className="flex flex-col w-full max-w-[min(96vw,calc(100vh-210px))] lg:max-w-sm xl:max-w-md lg:flex-1 gap-2 self-stretch">
          {/* Game Over Victory / Defeat Banner */}
          {gameResult && (
            <div className="w-full p-3 rounded-2xl bg-portal-surface border-3 border-black shadow-neo flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-1">
                {gameResult === playerColor || (gameMode === 'pvp' && gameResult !== 'draw') ? (
                  <Award className="w-5 h-5 text-portal-yellow" />
                ) : (
                  <Shield className="w-5 h-5 text-portal-pink" />
                )}
                <h4 className="font-black text-sm uppercase text-white tracking-wider">
                  {gameResult === 'draw'
                    ? 'STALEMATE // DRAW'
                    : gameResult === playerColor
                    ? 'VICTORY ACHIEVED'
                    : 'MISSION DEFEAT'}
                </h4>
              </div>
              <p className="text-xs text-slate-300 font-semibold mb-2">{resultReason}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetGame}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-portal-yellow to-portal-cyan text-black font-black text-xs uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  PLAY AGAIN
                </button>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-portal-pink text-white font-black text-xs uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  ACCURACY REPORT
                </button>
              </div>
            </div>
          )}

          {/* Tactical Time Control Picker */}
          <div className="w-full p-2.5 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-portal-cyan">TIME CONTROL</span>
            <div className="flex items-center gap-1">
              {(['blitz', 'rapid', 'classic', 'unlimited'] as TimeControl[]).map(tc => (
                <button
                  key={tc}
                  onClick={() => {
                    setTimeControl(tc);
                    resetGame();
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border border-black transition-all ${
                    timeControl === tc
                      ? 'bg-portal-yellow text-black shadow-sm'
                      : 'bg-portal-card text-slate-300 hover:text-white'
                  }`}
                >
                  {tc === 'blitz' ? '3M' : tc === 'rapid' ? '5M' : tc === 'classic' ? '10M' : '∞'}
                </button>
              ))}
            </div>
          </div>

          {/* Move History Algebraic Notation Box with Quality Badges */}
          <div className="w-full flex-1 min-h-[170px] max-h-[220px] p-2.5 rounded-2xl bg-portal-surface border-3 border-black shadow-neo-sm flex flex-col">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b-2 border-black/60">
              <span className="text-[11px] font-black uppercase text-portal-yellow flex items-center gap-1">
                <Swords className="w-3.5 h-3.5" />
                <span>MOVE TELEMETRY LOG</span>
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                {moveHistory.length} PLIES
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 divide-y divide-black/30">
              {moveHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                  Game in progress. Moves will log here...
                </div>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, rowIdx) => {
                  const whiteMove = moveHistory[rowIdx * 2];
                  const blackMove = moveHistory[rowIdx * 2 + 1];
                  const isWhiteActive = viewingPly === rowIdx * 2;
                  const isBlackActive = viewingPly === rowIdx * 2 + 1;

                  return (
                    <div key={rowIdx} className="grid grid-cols-12 py-1 text-xs font-mono items-center gap-1">
                      <span className="col-span-2 text-slate-500 font-bold">{rowIdx + 1}.</span>
                      <div
                        onClick={() => setViewingPly(rowIdx * 2)}
                        className={`col-span-5 flex items-center justify-between cursor-pointer px-1 py-0.5 rounded transition-all ${
                          isWhiteActive ? 'bg-portal-yellow text-black font-black' : 'hover:bg-portal-card text-portal-yellow font-black'
                        }`}
                      >
                        <span>{whiteMove?.notation}</span>
                        {renderQualityBadge(whiteMove?.quality)}
                      </div>
                      <div
                        onClick={() => blackMove && setViewingPly(rowIdx * 2 + 1)}
                        className={`col-span-5 flex items-center justify-between cursor-pointer px-1 py-0.5 rounded transition-all ${
                          isBlackActive ? 'bg-portal-pink text-white font-black' : 'hover:bg-portal-card text-portal-pink font-black'
                        }`}
                      >
                        <span>{blackMove?.notation || ''}</span>
                        {renderQualityBadge(blackMove?.quality)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* History Stepper Controls (First, Prev, Next, Latest) */}
            <div className="flex items-center justify-center gap-1 pt-2 mt-1 border-t border-black/40">
              <button
                onClick={() => setViewingPly(0)}
                disabled={moveHistory.length === 0}
                className="p-1 rounded bg-portal-card hover:bg-portal-yellow text-slate-300 hover:text-black border border-black disabled:opacity-30 transition-all"
                title="Start Position"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewingPly(prev => (prev === null ? moveHistory.length - 2 : Math.max(0, prev - 1)))}
                disabled={moveHistory.length === 0 || viewingPly === 0}
                className="p-1 rounded bg-portal-card hover:bg-portal-yellow text-slate-300 hover:text-black border border-black disabled:opacity-30 transition-all"
                title="Previous Move"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewingPly(prev => (prev === null || prev >= moveHistory.length - 1 ? null : prev + 1))}
                disabled={moveHistory.length === 0 || viewingPly === null}
                className="p-1 rounded bg-portal-card hover:bg-portal-yellow text-slate-300 hover:text-black border border-black disabled:opacity-30 transition-all"
                title="Next Move"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewingPly(null)}
                disabled={viewingPly === null}
                className="p-1 rounded bg-portal-card hover:bg-portal-yellow text-slate-300 hover:text-black border border-black disabled:opacity-30 transition-all"
                title="Latest Live Move"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Tactical Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (gameResult) return;
                setGameResult('draw');
                setResultReason('Match drawn by mutual agreement.');
                playSound('draw');
              }}
              disabled={!!gameResult || moveHistory.length < 2}
              className="py-1.5 rounded-xl bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black disabled:opacity-40 border-2 border-black shadow-neo-sm font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span>OFFER DRAW</span>
            </button>
            <button
              onClick={() => {
                if (gameResult) return;
                const winner = turn === 'w' ? 'b' : 'w';
                setGameResult(winner);
                setResultReason(`${turn === 'w' ? 'White' : 'Black'} resigned the game.`);
                playSound('defeat');
              }}
              disabled={!!gameResult}
              className="py-1.5 rounded-xl bg-portal-card hover:bg-rose-600 text-slate-200 hover:text-white disabled:opacity-40 border-2 border-black shadow-neo-sm font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>RESIGN</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEN / PGN Modal */}
      {showPgnModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-portal-surface border-4 border-black rounded-2xl shadow-neo p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-portal-yellow" />
                <h3 className="font-black text-sm uppercase text-white tracking-wider">PGN / FEN TELEMETRY</h3>
              </div>
              <button
                onClick={() => setShowPgnModal(false)}
                className="w-7 h-7 rounded-lg bg-portal-card hover:bg-rose-600 text-white font-black border-2 border-black flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Current FEN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase text-portal-cyan">CURRENT POSITION (FEN)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedFen);
                    setCopiedFen(true);
                    setTimeout(() => setCopiedFen(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black text-[10px] font-black border border-black transition-all"
                >
                  {copiedFen ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFen ? 'COPIED' : 'COPY FEN'}</span>
                </button>
              </div>
              <input
                readOnly
                value={generatedFen}
                className="w-full bg-black/60 border-2 border-black rounded-lg p-2 font-mono text-[11px] text-slate-300 outline-none select-all"
              />
            </div>

            {/* PGN Log */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase text-portal-yellow">PORTABLE GAME NOTATION (PGN)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPgn);
                    setCopiedPgn(true);
                    setTimeout(() => setCopiedPgn(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-portal-card hover:bg-portal-yellow text-slate-200 hover:text-black text-[10px] font-black border border-black transition-all"
                >
                  {copiedPgn ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPgn ? 'COPIED' : 'COPY PGN'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={generatedPgn}
                className="w-full bg-black/60 border-2 border-black rounded-lg p-2 font-mono text-[11px] text-slate-300 outline-none resize-none select-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Post-Match Game Review Modal */}
      {showReviewModal && reviewStats && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-portal-surface border-4 border-black rounded-2xl shadow-neo p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-portal-pink" />
                <h3 className="font-black text-sm uppercase text-white tracking-wider">GAME ACCURACY & REVIEW</h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-7 h-7 rounded-lg bg-portal-card hover:bg-rose-600 text-white font-black border-2 border-black flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Head-to-Head Accuracy Score */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/60 border-2 border-black">
              <div className="flex flex-col items-center p-2 rounded-lg bg-portal-card border border-black">
                <span className="text-[10px] font-black uppercase text-slate-400">WHITE ACCURACY</span>
                <span className="text-2xl font-black text-portal-yellow font-mono">{reviewStats.whiteAccuracy}%</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-portal-card border border-black">
                <span className="text-[10px] font-black uppercase text-slate-400">BLACK ACCURACY</span>
                <span className="text-2xl font-black text-portal-pink font-mono">{reviewStats.blackAccuracy}%</span>
              </div>
            </div>

            {/* Quality Distribution Breakdown */}
            <div className="flex flex-col gap-1.5 text-xs font-mono">
              <div className="grid grid-cols-3 font-black text-slate-400 pb-1 border-b border-black">
                <span>WHITE</span>
                <span className="text-center">CLASSIFICATION</span>
                <span className="text-right">BLACK</span>
              </div>
              {[
                { label: '🌟 Brilliant', key: 'brilliant' },
                { label: '⭐ Best Move', key: 'best' },
                { label: '✨ Excellent', key: 'excellent' },
                { label: '👍 Good Move', key: 'good' },
                { label: '📖 Book Move', key: 'book' },
                { label: '⚠️ Inaccuracy', key: 'inaccuracy' },
                { label: '❓ Mistake', key: 'mistake' },
                { label: '❌ Blunder', key: 'blunder' }
              ].map(item => (
                <div key={item.key} className="grid grid-cols-3 py-0.5 items-center">
                  <span className="font-black text-portal-yellow">{reviewStats.whiteQualities[item.key as MoveQuality]}</span>
                  <span className="text-center font-bold text-slate-300 text-[11px]">{item.label}</span>
                  <span className="text-right font-black text-portal-pink">{reviewStats.blackQualities[item.key as MoveQuality]}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowReviewModal(false)}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-portal-yellow to-portal-cyan text-black font-black text-xs uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              CLOSE REVIEW
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
