'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RotateCcw, Volume2, VolumeX, Sparkles, User, Play, ArrowRight, Shield, Zap, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  position: 'bottom' | 'top' | 'left' | 'right';
}

interface CardPartyProps {
  gameId?: string;
  onGameOver?: (score: number) => void;
}

const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];

const COLOR_CLASSES: Record<CardColor, { bg: string; border: string; text: string; glow: string; hex: string }> = {
  red: { bg: 'bg-[#e53935]', border: 'border-black', text: 'text-white', glow: 'shadow-[0_0_15px_rgba(229,57,53,0.5)]', hex: '#e53935' },
  blue: { bg: 'bg-[#1e88e5]', border: 'border-black', text: 'text-white', glow: 'shadow-[0_0_15px_rgba(30,136,229,0.5)]', hex: '#1e88e5' },
  green: { bg: 'bg-[#43a047]', border: 'border-black', text: 'text-white', glow: 'shadow-[0_0_15px_rgba(67,160,71,0.5)]', hex: '#43a047' },
  yellow: { bg: 'bg-[#fdd835]', border: 'border-black', text: 'text-black', glow: 'shadow-[0_0_15px_rgba(253,216,53,0.5)]', hex: '#fdd835' },
  wild: { bg: 'bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500', border: 'border-black', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]', hex: '#8e24aa' },
};

export default function CardPartyGame({ gameId = 'g_cardparty_30', onGameOver }: CardPartyProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [players, setPlayers] = useState<Player[]>([
    { id: 'player', name: 'You', isAI: false, avatar: '👤', cards: [], score: 0, position: 'bottom' },
    { id: 'lea', name: 'Lea', isAI: true, avatar: '👩‍💻', cards: [], score: 0, position: 'top' },
    { id: 'marie', name: 'Marie', isAI: true, avatar: '🤖', cards: [], score: 0, position: 'left' },
    { id: 'kate', name: 'Kate', isAI: true, avatar: '⚡', cards: [], score: 0, position: 'right' },
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
      newDeck.push({ id: `card_${idCounter++}`, color, type: 'number', value: 0 });
      for (let v = 1; v <= 9; v++) {
        newDeck.push({ id: `card_${idCounter++}`, color, type: 'number', value: v });
        newDeck.push({ id: `card_${idCounter++}`, color, type: 'number', value: v });
      }
      ['skip', 'reverse', 'draw_two'].forEach(t => {
        newDeck.push({ id: `card_${idCounter++}`, color, type: t as CardType });
        newDeck.push({ id: `card_${idCounter++}`, color, type: t as CardType });
      });
    });

    for (let i = 0; i < 4; i++) {
      newDeck.push({ id: `card_${idCounter++}`, color: 'wild', type: 'wild' });
      newDeck.push({ id: `card_${idCounter++}`, color: 'wild', type: 'wild_draw_four' });
    }

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

    for (let i = 0; i < 7; i++) {
      updatedPlayers.forEach(p => {
        if (freshDeck.length > 0) {
          p.cards.push(freshDeck.pop()!);
        }
      });
    }

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

  const isCardPlayable = (card: Card): boolean => {
    const topCard = discardPile[discardPile.length - 1];
    if (card.color === 'wild') return true;
    if (card.color === activeColor) return true;
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    if (card.type !== 'number' && card.type === topCard.type) return true;
    return false;
  };

  const drawCards = (playerIdx: number, count: number): Card[] => {
    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];

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

  const playCard = (playerIndex: number, card: Card, chosenColor?: CardColor) => {
    const player = players[playerIndex];
    const updatedCards = player.cards.filter(c => c.id !== card.id);
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex] = { ...player, cards: updatedCards };
    setPlayers(updatedPlayers);

    playSfx('play');

    if (updatedCards.length === 0) {
      setWinner(player);
      setGameState('gameover');
      playSfx('win');
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      const finalScore = player.isAI ? 500 : 2500;
      onGameOver?.(finalScore);
      return;
    }

    const newDiscard = [...discardPile, card];
    setDiscardPile(newDiscard);

    let nextColor = card.color === 'wild' ? (chosenColor || 'red') : card.color;
    setActiveColor(nextColor);

    let step = direction;
    let skipNext = false;
    let cardsToDraw = 0;

    if (card.type === 'skip') {
      skipNext = true;
      setStatusMessage(`${player.name} played SKIP!`);
    } else if (card.type === 'reverse') {
      const newDir = (direction * -1) as 1 | -1;
      setDirection(newDir);
      step = newDir;
      setStatusMessage(`${player.name} played REVERSE! Direction flipped.`);
    } else if (card.type === 'draw_two') {
      cardsToDraw = 2;
      skipNext = true;
      setStatusMessage(`${player.name} played DRAW TWO (+2)!`);
    } else if (card.type === 'wild_draw_four') {
      cardsToDraw = 4;
      skipNext = true;
      setStatusMessage(`${player.name} played WILD DRAW FOUR (+4) & chose ${nextColor.toUpperCase()}!`);
    } else if (card.type === 'wild') {
      setStatusMessage(`${player.name} played WILD & chose ${nextColor.toUpperCase()}!`);
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

  const handlePlayerCardClick = (card: Card) => {
    if (turnIndex !== 0 || aiThinking) return;

    if (!isCardPlayable(card)) {
      playSfx('error');
      setStatusMessage(`Cannot play this card. Match color or number!`);
      return;
    }

    if (card.color === 'wild') {
      setPendingWildCard(card);
      setShowColorPicker(true);
      return;
    }

    playCard(0, card);
  };

  const handlePlayerDraw = () => {
    if (turnIndex !== 0 || aiThinking) return;
    const drawn = drawCards(0, 1);
    if (drawn.length > 0) {
      const updatedPlayers = [...players];
      updatedPlayers[0].cards.push(...drawn);
      setPlayers(updatedPlayers);
      setStatusMessage(`You drew a card.`);
    }
    setTurnIndex((turnIndex + direction + players.length) % players.length);
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState !== 'playing' || winner) return;
    const currentPlayer = players[turnIndex];

    if (currentPlayer.isAI) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        const playableCards = currentPlayer.cards.filter(c => isCardPlayable(c));

        if (playableCards.length > 0) {
          const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
          let chosenColor: CardColor = 'red';
          if (cardToPlay.color === 'wild') {
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
          const drawn = drawCards(turnIndex, 1);
          if (drawn.length > 0) {
            currentPlayer.cards.push(...drawn);
            setPlayers([...players]);
            setStatusMessage(`${currentPlayer.name} drew a card.`);
            if (isCardPlayable(drawn[0]) && Math.random() > 0.3) {
              setTimeout(() => {
                let chosenColor: CardColor = 'red';
                if (drawn[0].color === 'wild') {
                  chosenColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                }
                playCard(turnIndex, drawn[0], chosenColor);
              }, 500);
              setAiThinking(false);
              return;
            }
          }
          setTurnIndex((turnIndex + direction + players.length) % players.length);
        }
        setAiThinking(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [turnIndex, gameState, players, winner, direction]);

  const topDiscard = discardPile[discardPile.length - 1];

  return (
    <div className="w-full h-full min-h-[620px] flex flex-col items-center justify-between bg-[#14100e] p-3 sm:p-5 rounded-3xl select-none relative overflow-hidden font-sans border-4 border-black shadow-2xl">
      {/* Felt Table Texture Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#261c16_1px,transparent_1px)] [background-size:28px_28px] opacity-70 pointer-events-none" />

      {/* Top HUD Bar */}
      <div className="w-full flex items-center justify-between bg-black/75 backdrop-blur-md border-3 border-black rounded-2xl px-4 py-2.5 relative z-20 shadow-neo-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> CARD PARTY
          </span>
          <span className="hidden sm:inline px-2 py-0.5 rounded-lg bg-cyan-500 text-black font-black text-[10px] uppercase border border-black">
            UNO ROUND TABLE
          </span>
        </div>
        <div className="text-xs sm:text-sm font-black text-white bg-black/90 px-4 py-1.5 rounded-xl border-2 border-white/20 shadow-inner">
          {statusMessage}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Menu State */}
      {gameState === 'menu' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 relative z-20 animate-fadeIn">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-600 via-amber-500 to-cyan-500 border-4 border-black shadow-neo-lg flex items-center justify-center mb-6 animate-bounce">
            <span className="text-5xl">🃏</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-wider mb-3 drop-shadow-lg">
            Card Party
          </h2>
          <p className="text-sm sm:text-base text-amber-200/80 max-w-md mb-8 font-medium">
            Classic UNO round-table showdown. Play against Lea (Top), Marie (Left), and Kate (Right) with wild cards and directional flow!
          </p>
          <button
            onClick={startNewGame}
            className="px-8 py-4 rounded-2xl bg-amber-400 text-black font-black uppercase text-base border-4 border-black shadow-neo-lg hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-3"
          >
            <Play className="w-5 h-5 fill-current" /> Start Round Table
          </button>
        </div>
      )}

      {/* Playing State: Round Table Layout */}
      {gameState === 'playing' && (
        <div className="flex-1 w-full max-w-5xl flex flex-col justify-between items-center relative z-10 py-3 px-2">

          {/* TOP AI: LEA */}
          {(() => {
            const lea = players.find(p => p.id === 'lea')!;
            const isTurn = turnIndex === players.findIndex(p => p.id === 'lea');
            return (
              <div className={`flex flex-col items-center transition-all ${isTurn ? 'scale-105' : ''}`}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-black ${isTurn ? 'bg-amber-400 text-black shadow-neo-md animate-pulse' : 'bg-black/80 text-white'}`}>
                  <span className="text-lg">{lea.avatar}</span>
                  <span className="text-xs font-black uppercase">{lea.name}</span>
                  <span className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-black">{lea.cards.length} cards</span>
                </div>
                {/* AI Stacked Card Backs */}
                <div className="flex -space-x-4 mt-1.5">
                  {lea.cards.map((_, i) => (
                    <div key={i} className="w-8 h-12 rounded-lg bg-gradient-to-br from-indigo-900 to-slate-900 border border-black shadow-md transform hover:-translate-y-1 transition-transform" />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* MIDDLE ROW: LEFT AI (Marie) + CENTRAL TABLE FELT + RIGHT AI (Kate) */}
          <div className="w-full flex items-center justify-between my-auto py-2">

            {/* LEFT AI: MARIE */}
            {(() => {
              const marie = players.find(p => p.id === 'marie')!;
              const isTurn = turnIndex === players.findIndex(p => p.id === 'marie');
              return (
                <div className={`flex flex-col items-center transition-all ${isTurn ? 'scale-105' : ''}`}>
                  <div className={`flex flex-col items-center p-2 rounded-xl border-2 border-black ${isTurn ? 'bg-amber-400 text-black shadow-neo-md animate-pulse' : 'bg-black/80 text-white'}`}>
                    <span className="text-2xl mb-1">{marie.avatar}</span>
                    <span className="text-[11px] font-black uppercase">{marie.name}</span>
                    <span className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-black mt-0.5">{marie.cards.length} cards</span>
                  </div>
                </div>
              );
            })()}

            {/* CENTRAL ROUND TABLE FELT CIRCLE */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#1b2a1e] border-6 border-[#362214] shadow-[inset_0_10px_25px_rgba(0,0,0,0.8),0_10px_30px_rgba(0,0,0,0.6)] flex items-center justify-center">

              {/* Turned Direction Arrows Around Rim */}
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-400/30 animate-[spin_20s_linear_infinite] pointer-events-none" />

              {/* Center Piles Container */}
              <div className="flex items-center justify-center gap-5 relative z-10">

                {/* Draw Pile */}
                <div
                  onClick={() => {
                    if (turnIndex === 0 && !aiThinking) handlePlayerDraw();
                  }}
                  className="w-20 h-28 sm:w-22 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-950 border-3 border-black shadow-neo-md flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all relative group"
                  title="Click to Draw Card"
                >
                  <div className="absolute inset-1 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-amber-400 group-hover:scale-110 transition-transform">🎴</span>
                    <span className="text-[9px] font-black text-white mt-1 uppercase tracking-wider">DRAW ({deck.length})</span>
                  </div>
                </div>

                {/* Discard Pile Top Card (Exact Screenshot Style: White Inner Box + Thick Dark Border) */}
                {topDiscard && (
                  <div
                    className={`w-20 h-28 sm:w-22 sm:h-32 rounded-2xl border-3 border-black shadow-neo-lg flex flex-col items-center justify-between p-2 transition-all relative ${
                      COLOR_CLASSES[topDiscard.color].bg
                    }`}
                  >
                    <div className="w-full flex justify-between items-start text-white text-xs font-black">
                      <span>{topDiscard.type === 'number' ? topDiscard.value : topDiscard.type[0].toUpperCase()}</span>
                      <span>{topDiscard.color === 'wild' ? '🌈' : topDiscard.color[0].toUpperCase()}</span>
                    </div>

                    {/* Distinct White Inner Symbol Box Matching Screenshot */}
                    <div className="w-12 h-14 sm:w-14 sm:h-16 bg-white rounded-xl border-2 border-black flex items-center justify-center shadow-inner my-auto">
                      <span className={`text-2xl sm:text-3xl font-black ${topDiscard.color === 'yellow' ? 'text-amber-950' : topDiscard.color === 'red' ? 'text-rose-600' : topDiscard.color === 'blue' ? 'text-cyan-600' : topDiscard.color === 'green' ? 'text-emerald-600' : 'text-purple-700'}`}>
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
                      </span>
                    </div>

                    <div className="w-full text-center text-[8px] font-black text-white uppercase tracking-wider">
                      {topDiscard.type.replace('_', ' ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Color Badge */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-black/90 border-2 border-black text-white text-[10px] font-black uppercase flex items-center gap-1.5 shadow-neo-sm">
                <span>Color:</span>
                <span className={`w-3 h-3 rounded-full border border-black ${COLOR_CLASSES[activeColor].bg}`} />
                <span className="uppercase text-amber-300">{activeColor}</span>
              </div>
            </div>

            {/* RIGHT AI: KATE */}
            {(() => {
              const kate = players.find(p => p.id === 'kate')!;
              const isTurn = turnIndex === players.findIndex(p => p.id === 'kate');
              return (
                <div className={`flex flex-col items-center transition-all ${isTurn ? 'scale-105' : ''}`}>
                  <div className={`flex flex-col items-center p-2 rounded-xl border-2 border-black ${isTurn ? 'bg-amber-400 text-black shadow-neo-md animate-pulse' : 'bg-black/80 text-white'}`}>
                    <span className="text-2xl mb-1">{kate.avatar}</span>
                    <span className="text-[11px] font-black uppercase">{kate.name}</span>
                    <span className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-black mt-0.5">{kate.cards.length} cards</span>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* BOTTOM PLAYER HAND (YOU) */}
          <div className="w-full bg-black/85 backdrop-blur-md border-3 border-black rounded-2xl p-3 flex flex-col items-center shadow-neo-md">
            <div className="w-full flex justify-between items-center mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white uppercase flex items-center gap-1.5">
                  <User className="w-4 h-4 text-cyan-400" /> Your Hand ({players[0].cards.length})
                </span>
                {turnIndex === 0 && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-black text-[10px] font-black uppercase animate-pulse border border-black shadow-sm">
                    YOUR TURN!
                  </span>
                )}
              </div>
              <button
                onClick={handlePlayerDraw}
                disabled={turnIndex !== 0 || aiThinking}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black uppercase border-2 border-black shadow-neo-sm active:scale-95 disabled:opacity-55 transition-all"
              >
                Draw Card (+1)
              </button>
            </div>

            {/* Scrollable Hand Cards with White Inner Symbol Box */}
            <div className="w-full flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar">
              {players[0].cards.map(card => {
                const playable = turnIndex === 0 && !aiThinking && isCardPlayable(card);
                return (
                  <div
                    key={card.id}
                    onClick={() => handlePlayerCardClick(card)}
                    className={`w-18 h-26 sm:w-20 sm:h-30 rounded-2xl border-3 border-black flex flex-col justify-between p-2 shrink-0 transition-all cursor-pointer ${
                      COLOR_CLASSES[card.color].bg
                    } ${playable ? 'hover:-translate-y-4 hover:shadow-neo-lg ring-4 ring-amber-400' : 'opacity-65 grayscale-[20%]'}`}
                  >
                    <div className="flex justify-between items-start text-white text-[10px] font-black">
                      <span>{card.type === 'number' ? card.value : card.type[0].toUpperCase()}</span>
                    </div>

                    {/* White Inner Box */}
                    <div className="w-10 h-12 sm:w-12 sm:h-14 bg-white rounded-xl border-2 border-black flex items-center justify-center shadow-inner my-auto mx-auto">
                      <span className={`text-xl sm:text-2xl font-black ${card.color === 'yellow' ? 'text-amber-950' : card.color === 'red' ? 'text-rose-600' : card.color === 'blue' ? 'text-cyan-600' : card.color === 'green' ? 'text-emerald-600' : 'text-purple-700'}`}>
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
                      </span>
                    </div>

                    <div className="text-[8px] font-black text-white uppercase text-center truncate">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
          <div className="bg-[#14100e] border-4 border-black rounded-3xl p-6 shadow-neo-lg max-w-sm w-full text-center">
            <h3 className="text-lg font-black text-white uppercase mb-4">Choose Active Color</h3>
            <div className="grid grid-cols-2 gap-4">
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

      {/* Victory / Game Over Modal */}
      {gameState === 'gameover' && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn p-4">
          <div className="bg-[#14100e] border-4 border-black rounded-3xl p-8 shadow-neo-lg max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-400 border-4 border-black shadow-neo-md mx-auto flex items-center justify-center text-4xl mb-4 animate-bounce">
              🏆
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2">
              {winner.id === 'player' ? 'Victory Royale!' : `${winner.name} Wins!`}
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/80 mb-6 font-medium">
              {winner.id === 'player'
                ? 'You cleared your hand first and conquered Card Party!'
                : `${winner.name} emptied their hand first. Rematch?`}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={startNewGame}
                className="px-6 py-3.5 rounded-2xl bg-amber-400 text-black font-black uppercase text-xs sm:text-sm border-3 border-black shadow-neo-md hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
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
