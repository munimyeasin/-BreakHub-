'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RotateCcw, Volume2, VolumeX, Sparkles, User, Play, ArrowRight, Shield, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audio } from '@/lib/audio';

type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type CardType = 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for number cards
}

interface Player {
  id: string;
  name: string;
  isAI: boolean;
  avatar: string;
  cards: Card[];
  score: number;
}

interface CardPartyProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
}

const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];

const COLOR_CLASSES: Record<CardColor, { bg: string; border: string; text: string; glow: string }> = {
  red: { bg: 'bg-rose-600', border: 'border-rose-400', text: 'text-rose-100', glow: 'shadow-[0_0_15px_rgba(225,29,72,0.4)]' },
  blue: { bg: 'bg-cyan-600', border: 'border-cyan-400', text: 'text-cyan-100', glow: 'shadow-[0_0_15px_rgba(8,145,178,0.4)]' },
  green: { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-100', glow: 'shadow-[0_0_15px_rgba(5,150,105,0.4)]' },
  yellow: { bg: 'bg-amber-500', border: 'border-amber-300', text: 'text-amber-950', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  wild: { bg: 'bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500', border: 'border-purple-300', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]' },
};

export default function CardPartyGame({ gameId = 'g_cardparty_30', onGameOver }: CardPartyProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [players, setPlayers] = useState<Player[]>([
    { id: 'player', name: 'You', isAI: false, avatar: '👤', cards: [], score: 0 },
    { id: 'lea', name: 'Lea', isAI: true, avatar: '👩‍💻', cards: [], score: 0 },
    { id: 'marie', name: 'Marie', isAI: true, avatar: '🤖', cards: [], score: 0 },
    { id: 'kate', name: 'Kate', isAI: true, avatar: '⚡', cards: [], score: 0 },
  ]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = clockwise, -1 = counter-clockwise
  const [activeColor, setActiveColor] = useState<CardColor>('red');
  const [winner, setWinner] = useState<Player | null>(null);
  const [statusMessage, setStatusMessage] = useState('Welcome to Card Party!');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);
  const [muted, setMuted] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  // Sound Synthesizer via Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = useCallback((type: 'draw' | 'play' | 'wild' | 'win' | 'error') => {
    if (muted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'draw') {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'play') {
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'wild') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'win') {
        osc.type = 'square';
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          setTimeout(() => {
            if (ctx.state === 'suspended') return;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.2, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            o.start();
            o.stop(ctx.currentTime + 0.2);
          }, idx * 120);
        });
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {}
  }, [muted]);

  // Generate Full 108-Card UNO Deck
  const generateDeck = (): Card[] => {
    const newDeck: Card[] = [];
    let idCounter = 1;

    COLORS.forEach(color => {
      // One '0' card per color
      newDeck.push({ id: `card_${idCounter++}`, color, type: 'number', value: 0 });

      // Two of each number 1-9 per color
      for (let v = 1; v <= 9; v++) {
        newDeck.push({ id: `card_${idCounter++}`, color, type: 'number', value: v });
        newDeck.push({ id: `card_${idCounter++}`, color, type: 'number', value: v });
      }

      // Two Skip, Reverse, Draw Two per color
      ['skip', 'reverse', 'draw_two'].forEach(t => {
        newDeck.push({ id: `card_${idCounter++}`, color, type: t as CardType });
        newDeck.push({ id: `card_${idCounter++}`, color, type: t as CardType });
      });
    });

    // Four Wild and Four Wild Draw Four cards
    for (let i = 0; i < 4; i++) {
      newDeck.push({ id: `card_${idCounter++}`, color: 'wild', type: 'wild' });
      newDeck.push({ id: `card_${idCounter++}`, color: 'wild', type: 'wild_draw_four' });
    }

    // Shuffle Deck (Fisher-Yates)
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    return newDeck;
  };

  const startNewGame = () => {
    playSfx('wild');
    const freshDeck = generateDeck();
    const updatedPlayers = players.map(p => ({ ...p, cards: [] as Card[] }));

    // Deal 7 cards to each player
    for (let i = 0; i < 7; i++) {
      updatedPlayers.forEach(p => {
        if (freshDeck.length > 0) {
          p.cards.push(freshDeck.pop()!);
        }
      });
    }

    // Flip top card for discard pile (ensure it's a number card for clean start)
    let topCard = freshDeck.pop()!;
    while (topCard.type !== 'number' && freshDeck.length > 0) {
      freshDeck.unshift(topCard);
      topCard = freshDeck.pop()!;
    }

    setDeck(freshDeck);
    setDiscardPile([topCard]);
    setActiveColor(topCard.color);
    setPlayers(updatedPlayers);
    setTurnIndex(0);
    setDirection(1);
    setWinner(null);
    setGameState('playing');
    setStatusMessage('Your turn! Match color or number, or play a Wild.');
  };

  // Check if a card is playable
  const isCardPlayable = (card: Card): boolean => {
    const topCard = discardPile[discardPile.length - 1];
    if (card.color === 'wild') return true;
    if (card.color === activeColor) return true;
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    if (card.type !== 'number' && card.type === topCard.type) return true;
    return false;
  };

  // Draw cards helper
  const drawCards = (playerIdx: number, count: number): Card[] => {
    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];

    // If deck runs low, reshuffle discard pile (keeping top card)
    if (currentDeck.length < count && currentDiscard.length > 1) {
      const top = currentDiscard.pop()!;
      const shufflePool = [...currentDiscard];
      for (let i = shufflePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shufflePool[i], shufflePool[j]] = [shufflePool[j], shufflePool[i]];
      }
      currentDeck = [...shufflePool, ...currentDeck];
      currentDiscard = [top];
      setDiscardPile(currentDiscard);
    }

    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (currentDeck.length > 0) {
        drawn.push(currentDeck.pop()!);
      }
    }
    setDeck(currentDeck);
    playSfx('draw');
    return drawn;
  };

  // Execute card play
  const playCard = (playerIndex: number, card: Card, chosenColor?: CardColor) => {
    const player = players[playerIndex];

    // Remove card from player hand
    const updatedCards = player.cards.filter(c => c.id !== card.id);
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex] = { ...player, cards: updatedCards };
    setPlayers(updatedPlayers);

    playSfx('play');

    // Check Win Condition
    if (updatedCards.length === 0) {
      setWinner(player);
      setGameState('gameover');
      playSfx('win');
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      const finalScore = player.isAI ? 500 : 2500;
      onGameOver?.(finalScore);
      return;
    }

    // Update discard pile & active color
    const newDiscard = [...discardPile, card];
    setDiscardPile(newDiscard);

    let nextColor = card.color === 'wild' ? (chosenColor || 'red') : card.color;
    setActiveColor(nextColor);

    // Calculate next player index based on direction and special card effects
    let step = direction;
    let skipNext = false;
    let cardsToDraw = 0;

    if (card.type === 'skip') {
      skipNext = true;
      setStatusMessage(`${player.name} played SKIP! Next player is skipped.`);
    } else if (card.type === 'reverse') {
      const newDir = (direction * -1) as 1 | -1;
      setDirection(newDir);
      step = newDir;
      setStatusMessage(`${player.name} played REVERSE! Play direction flipped.`);
    } else if (card.type === 'draw_two') {
      cardsToDraw = 2;
      skipNext = true;
      setStatusMessage(`${player.name} played DRAW TWO! Next player draws 2 cards.`);
    } else if (card.type === 'wild_draw_four') {
      cardsToDraw = 4;
      skipNext = true;
      setStatusMessage(`${player.name} played WILD DRAW FOUR and chose ${nextColor.toUpperCase()}! Next player draws 4.`);
    } else if (card.type === 'wild') {
      setStatusMessage(`${player.name} played WILD and chose ${nextColor.toUpperCase()}!`);
    } else {
      setStatusMessage(`${player.name} played ${card.color.toUpperCase()} ${card.type === 'number' ? card.value : String(card.type).toUpperCase()}`);
    }

    let nextTurn = (playerIndex + step + updatedPlayers.length) % updatedPlayers.length;
    if (skipNext) {
      if (cardsToDraw > 0) {
        const targetPlayer = updatedPlayers[nextTurn];
        const drawn = drawCards(nextTurn, cardsToDraw);
        targetPlayer.cards.push(...drawn);
      }
      nextTurn = (nextTurn + step + updatedPlayers.length) % updatedPlayers.length;
    }

    setTurnIndex(nextTurn);
  };

  // Player action: Click card in hand
  const handlePlayerCardClick = (card: Card) => {
    if (turnIndex !== 0 || aiThinking) return;

    if (!isCardPlayable(card)) {
      playSfx('error');
      setStatusMessage(`Cannot play ${card.color} ${card.type === 'number' ? card.value : card.type}. Invalid match!`);
      return;
    }

    if (card.color === 'wild') {
      setPendingWildCard(card);
      setShowColorPicker(true);
      return;
    }

    playCard(0, card);
  };

  // Player action: Draw from deck
  const handlePlayerDraw = () => {
    if (turnIndex !== 0 || aiThinking) return;
    const drawn = drawCards(0, 1);
    if (drawn.length > 0) {
      const updatedPlayers = [...players];
      updatedPlayers[0].cards.push(...drawn);
      setPlayers(updatedPlayers);
      setStatusMessage(`You drew a card.`);
    }
    // Pass turn to next AI
    setTurnIndex((turnIndex + direction + players.length) % players.length);
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState !== 'playing' || winner) return;
    const currentPlayer = players[turnIndex];

    if (currentPlayer.isAI) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        // Find playable cards
        const playableCards = currentPlayer.cards.filter(c => isCardPlayable(c));

        if (playableCards.length > 0) {
          // AI prefers non-wild cards first, or picks best card
          const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];

          let chosenColor: CardColor = 'red';
          if (cardToPlay.color === 'wild') {
            // Count color frequency in AI hand
            const colorCounts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
            currentPlayer.cards.forEach(c => {
              if (c.color !== 'wild') colorCounts[c.color]++;
            });
            let maxCount = -1;
            COLORS.forEach(col => {
              if (colorCounts[col] > maxCount) {
                maxCount = colorCounts[col];
                chosenColor = col;
              }
            });
          }

          playCard(turnIndex, cardToPlay, chosenColor);
        } else {
          // AI draws a card
          const drawn = drawCards(turnIndex, 1);
          if (drawn.length > 0) {
            currentPlayer.cards.push(...drawn);
            setPlayers([...players]);
            setStatusMessage(`${currentPlayer.name} drew a card.`);
            // If drawn card is playable, play it 50% of the time
            if (isCardPlayable(drawn[0]) && Math.random() > 0.3) {
              setTimeout(() => {
                let chosenColor: CardColor = 'red';
                if (drawn[0].color === 'wild') {
                  chosenColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                }
                playCard(turnIndex, drawn[0], chosenColor);
              }, 600);
              setAiThinking(false);
              return;
            }
          }
          // Advance turn
          setTurnIndex((turnIndex + direction + players.length) % players.length);
        }
        setAiThinking(false);
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [turnIndex, gameState, players, winner, direction]);

  const topDiscard = discardPile[discardPile.length - 1];

  return (
    <div className="w-full h-full min-h-[580px] flex flex-col items-center justify-between bg-portal-surface p-2 sm:p-4 rounded-2xl select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(#251749_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top HUD bar */}
      <div className="w-full flex items-center justify-between bg-black/60 border-2 border-black rounded-xl px-4 py-2 relative z-10 shadow-neo-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-portal-yellow uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-portal-yellow" /> CARD PARTY
          </span>
          <span className="hidden sm:inline px-2 py-0.5 rounded bg-portal-cyan text-black font-black text-[10px] uppercase">
            UNO BATTLE
          </span>
        </div>
        <div className="text-xs font-black text-white bg-black/80 px-3 py-1 rounded-lg border border-white/20">
          {statusMessage}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted(!muted)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Menu State */}
      {gameState === 'menu' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 relative z-10 animate-fadeIn">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-600 via-amber-500 to-cyan-500 border-4 border-black shadow-neo-lg flex items-center justify-center mb-6 animate-bounce">
            <span className="text-4xl">🃏</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wider mb-2">
            Card Party
          </h2>
          <p className="text-sm text-portal-text-muted max-w-md mb-8 font-medium">
            The ultimate neo-brutalist browser card showdown. Match colors & numbers, trigger Skip, Reverse, Draw Two, and Wild cards against Lea, Marie, and Kate!
          </p>
          <button
            onClick={startNewGame}
            className="px-8 py-3.5 rounded-xl bg-portal-yellow text-black font-black uppercase text-sm sm:text-base border-3 border-black shadow-neo-lg hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" /> Start Match
          </button>
        </div>
      )}

      {/* Playing State */}
      {gameState === 'playing' && (
        <div className="flex-1 w-full flex flex-col justify-between items-center relative z-10 py-2">
          {/* AI Opponents Header (Top & Sides) */}
          <div className="w-full grid grid-cols-3 gap-2 px-2">
            {players.slice(1).map((ai, idx) => {
              const actualIndex = idx + 1;
              const isAiTurn = turnIndex === actualIndex;
              return (
                <div
                  key={ai.id}
                  className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                    isAiTurn
                      ? 'bg-portal-yellow/20 border-portal-yellow shadow-neo-sm animate-pulse'
                      : 'bg-black/60 border-black/80'
                  }`}
                >
                  <div className="text-2xl mb-0.5">{ai.avatar}</div>
                  <div className="text-xs font-black text-white truncate">{ai.name}</div>
                  <div className="text-[10px] font-bold text-portal-cyan mt-0.5">
                    {ai.cards.length} {ai.cards.length === 1 ? 'Card ⚠️' : 'Cards'}
                  </div>
                  {isAiTurn && aiThinking && (
                    <div className="text-[9px] font-black text-portal-yellow animate-bounce mt-1">Thinking...</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Central Table: Deck & Discard Pile */}
          <div className="flex items-center justify-center gap-6 my-auto py-4">
            {/* Draw Pile */}
            <div
              onClick={() => {
                if (turnIndex === 0 && !aiThinking) handlePlayerDraw();
              }}
              className="w-20 h-28 sm:w-24 sm:h-36 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 border-3 border-black shadow-neo-md flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all relative group"
              title="Click to Draw Card"
            >
              <div className="absolute inset-1.5 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white group-hover:scale-110 transition-transform">🎴</span>
                <span className="text-[10px] font-black text-portal-yellow mt-1 uppercase">DRAW ({deck.length})</span>
              </div>
            </div>

            {/* Active Color Indicator & Direction Arrow */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-3 border-black shadow-neo-sm flex items-center justify-center transition-all ${
                  COLOR_CLASSES[activeColor].bg
                }`}
                title={`Active Color: ${activeColor.toUpperCase()}`}
              >
                <span className="text-xs font-black text-white uppercase">{activeColor[0]}</span>
              </div>
              <div className="text-[10px] font-black text-portal-cyan uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded border border-black">
                {direction === 1 ? '↻ CW' : '↺ CCW'}
              </div>
            </div>

            {/* Discard Pile Top Card */}
            {topDiscard && (
              <div
                className={`w-20 h-28 sm:w-24 sm:h-36 rounded-2xl border-3 border-black shadow-neo-lg flex flex-col items-center justify-between p-2.5 transition-all ${
                  COLOR_CLASSES[topDiscard.color].bg
                } ${COLOR_CLASSES[topDiscard.color].glow}`}
              >
                <div className="w-full flex justify-between items-start text-white text-xs font-black">
                  <span>{topDiscard.type === 'number' ? topDiscard.value : topDiscard.type[0].toUpperCase()}</span>
                  <span>{topDiscard.color === 'wild' ? '🌈' : topDiscard.color[0].toUpperCase()}</span>
                </div>
                <div className="text-3xl sm:text-4xl my-auto font-black text-white drop-shadow-md">
                  {topDiscard.type === 'number'
                    ? topDiscard.value
                    : topDiscard.type === 'skip'
                    ? '🚫'
                    : topDiscard.type === 'reverse'
                    ? '🔄'
                    : topDiscard.type === 'draw_two'
                    ? '+2'
                    : topDiscard.type === 'wild_draw_four'
                    ? '+4'
                    : '★'}
                </div>
                <div className="w-full text-center text-[9px] font-black text-white/90 uppercase tracking-widest">
                  {topDiscard.type.replace('_', ' ')}
                </div>
              </div>
            )}
          </div>

          {/* Player's Hand (Bottom) */}
          <div className="w-full bg-black/70 border-2 border-black rounded-2xl p-3 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase">Your Hand ({players[0].cards.length})</span>
                {turnIndex === 0 && (
                  <span className="px-2 py-0.5 rounded bg-portal-yellow text-black text-[10px] font-black uppercase animate-pulse">
                    Your Turn!
                  </span>
                )}
              </div>
              <button
                onClick={handlePlayerDraw}
                disabled={turnIndex !== 0 || aiThinking}
                className="px-3 py-1 rounded-xl bg-portal-cyan text-black text-xs font-black uppercase border-2 border-black shadow-neo-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
              >
                Draw Card (+1)
              </button>
            </div>

            {/* Scrollable Hand Cards */}
            <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar">
              {players[0].cards.map(card => {
                const playable = turnIndex === 0 && !aiThinking && isCardPlayable(card);
                return (
                  <div
                    key={card.id}
                    onClick={() => handlePlayerCardClick(card)}
                    className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-black flex flex-col justify-between p-2 shrink-0 transition-all cursor-pointer ${
                      COLOR_CLASSES[card.color].bg
                    } ${playable ? 'hover:-translate-y-3 hover:shadow-neo-lg ring-2 ring-portal-yellow' : 'opacity-60 grayscale-[30%]'}`}
                  >
                    <div className="flex justify-between items-start text-white text-[10px] font-black">
                      <span>{card.type === 'number' ? card.value : card.type[0].toUpperCase()}</span>
                    </div>
                    <div className="text-xl sm:text-2xl text-center my-auto font-black text-white">
                      {card.type === 'number'
                        ? card.value
                        : card.type === 'skip'
                        ? '🚫'
                        : card.type === 'reverse'
                        ? '🔄'
                        : card.type === 'draw_two'
                        ? '+2'
                        : card.type === 'wild_draw_four'
                        ? '+4'
                        : '★'}
                    </div>
                    <div className="text-[8px] font-black text-white/90 uppercase text-center truncate">
                      {card.type.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Wild Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-portal-surface border-4 border-black rounded-3xl p-6 shadow-neo-lg max-w-sm w-full text-center">
            <h3 className="text-lg font-black text-white uppercase mb-4">Choose Wild Color</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {(['red', 'blue', 'green', 'yellow'] as CardColor[]).map(col => (
                <button
                  key={col}
                  onClick={() => {
                    setShowColorPicker(false);
                    if (pendingWildCard) {
                      playCard(0, pendingWildCard, col);
                      setPendingWildCard(null);
                    }
                  }}
                  className={`py-4 rounded-2xl border-3 border-black text-white font-black uppercase text-sm shadow-neo-sm hover:scale-105 active:scale-95 transition-all ${
                    COLOR_CLASSES[col].bg
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Over / Victory Modal */}
      {gameState === 'gameover' && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
          <div className="bg-portal-surface border-4 border-black rounded-3xl p-8 shadow-neo-lg max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-portal-yellow border-4 border-black shadow-neo-md mx-auto flex items-center justify-center text-4xl mb-4 animate-bounce">
              🏆
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2">
              {winner.id === 'player' ? 'Victory Royale!' : `${winner.name} Wins!`}
            </h2>
            <p className="text-xs sm:text-sm text-portal-text-muted mb-6 font-medium">
              {winner.id === 'player'
                ? 'You cleared your entire hand first and conquered Card Party!'
                : `${winner.name} emptied their hand first. Better luck next time!`}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={startNewGame}
                className="px-6 py-3 rounded-xl bg-portal-yellow text-black font-black uppercase text-xs sm:text-sm border-3 border-black shadow-neo-md hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
