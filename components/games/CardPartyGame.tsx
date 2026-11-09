'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RotateCcw, Volume2, VolumeX, Sparkles, User, Play, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type CardType = 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number;
  rotation?: number;
  offsetX?: number;
  offsetY?: number;
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

const COLOR_CLASSES: Record<CardColor, { bg: string; text: string; hex: string }> = {
  red: { bg: 'bg-[#e53935]', text: 'text-rose-600', hex: '#e53935' },
  blue: { bg: 'bg-[#1e88e5]', text: 'text-cyan-600', hex: '#1e88e5' },
  green: { bg: 'bg-[#43a047]', text: 'text-emerald-600', hex: '#43a047' },
  yellow: { bg: 'bg-[#fdd835]', text: 'text-amber-950', hex: '#fdd835' },
  wild: { bg: 'bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500', text: 'text-purple-700', hex: '#8e24aa' },
};

function CardBack({ label = 'CARDS' }: { label?: string }) {
  return (
    <div className="w-8 h-12 sm:w-9 sm:h-14 rounded-lg bg-[#252a34] border-2 border-black shadow-sm flex items-center justify-center p-0.5 relative overflow-hidden shrink-0">
      <div className="w-full h-full rounded bg-[#1b1f28] border border-white/15 flex items-center justify-center p-0.5">
        <span className="text-[7px] sm:text-[8px] font-black text-white uppercase tracking-tighter text-center leading-tight">
          {label}
        </span>
      </div>
    </div>
  );
}

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
  const [statusMessage, setStatusMessage] = useState('Your turn! Match color or number.');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);
  const [muted, setMuted] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [flyingCard, setFlyingCard] = useState<{
    id: string;
    card: Card;
    type: 'deal' | 'draw' | 'play';
    isFaceUp: boolean;
  } | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = useCallback((type: 'draw' | 'play' | 'wild' | 'win' | 'error' | 'deal') => {
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
      if (type === 'draw' || type === 'deal') {
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'play') {
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'wild') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.25);
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

    setIsDealing(true);
    setStatusMessage('Dealing cards...');

    let cardIdx = 0;
    let currentPlayers = updatedPlayers;
    const dealInterval = setInterval(() => {
      if (cardIdx < 7) {
        currentPlayers = currentPlayers.map((p, pIdx) => {
          if (freshDeck.length > 0) {
            const card = freshDeck.pop()!;
            if (pIdx === 0) {
              setFlyingCard({ id: card.id, card, type: 'deal', isFaceUp: true });
            }
            return { ...p, cards: [...p.cards, card] };
          }
          return p;
        });
        setPlayers(currentPlayers);
        playSfx('deal');
        cardIdx++;
      } else {
        clearInterval(dealInterval);
        setIsDealing(false);
        setFlyingCard(null);

        let topCard = freshDeck.pop()!;
        while (topCard.type !== 'number' && freshDeck.length > 0) {
          freshDeck.unshift(topCard);
          topCard = freshDeck.pop()!;
        }

        topCard.rotation = 0;
        topCard.offsetX = 0;
        topCard.offsetY = 0;

        setDeck(freshDeck);
        setDiscardPile([topCard]);
        setActiveColor(topCard.color);
        setTurnIndex(0);
        setDirection(1);
        setWinner(null);
        setGameState('playing');
        setStatusMessage('Your turn!');
      }
    }, 180);
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
        const card = currentDeck.pop()!;
        drawn.push(card);
        if (playerIdx === 0) {
          setFlyingCard({ id: card.id, card, type: 'draw', isFaceUp: true });
          setTimeout(() => setFlyingCard(null), 350);
        }
      }
    }
    setDeck(currentDeck);
    playSfx('draw');
    return drawn;
  };

  const playCard = (playerIndex: number, card: Card, chosenColor?: CardColor, extraCard?: Card) => {
    const pname = players[playerIndex].name;
    setFlyingCard({
      id: card.id,
      card,
      type: 'play',
      isFaceUp: true,
    });
    setTimeout(() => setFlyingCard(null), 350);

    let winnerPlayer: Player | null = null;
    setPlayers(prev => {
      const player = prev[playerIndex];
      const updatedCards = player.cards.filter(c => c.id !== card.id);
      const next = [...prev];
      next[playerIndex] = { ...player, cards: updatedCards };
      if (updatedCards.length === 0) winnerPlayer = player;
      return next;
    });

    playSfx('play');

    if (winnerPlayer) {
      setWinner(winnerPlayer);
      setGameState('gameover');
      playSfx('win');
      confetti({ particleCount: 200, spread: 110, origin: { y: 0.5 } });
      const finalScore = winnerPlayer.isAI ? 500 : 3500;
      onGameOver?.(finalScore);
      return;
    }

    const placedCard: Card = {
      ...card,
      rotation: Math.floor(Math.random() * 20) - 10,
      offsetX: Math.floor(Math.random() * 10) - 5,
      offsetY: Math.floor(Math.random() * 8) - 4,
    };

    const newDiscard = [...discardPile, placedCard];
    setDiscardPile(newDiscard);

    let nextColor = card.color === 'wild' ? (chosenColor || 'red') : card.color;
    setActiveColor(nextColor);

    let step = direction;
    let skipNext = false;
    let cardsToDraw = 0;

    if (card.type === 'skip') {
      skipNext = true;
      setStatusMessage(`${pname} skipped!`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else if (card.type === 'reverse') {
      const newDir = (direction * -1) as 1 | -1;
      setDirection(newDir);
      step = newDir;
      setStatusMessage(`${pname} reversed direction!`);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } else if (card.type === 'draw_two') {
      cardsToDraw = 2;
      skipNext = true;
      setStatusMessage(`${pname} played +2!`);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } else if (card.type === 'wild_draw_four') {
      cardsToDraw = 4;
      skipNext = true;
      setStatusMessage(`${pname} played +4 (${nextColor.toUpperCase()})!`);
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 } });
    } else if (card.type === 'wild') {
      setStatusMessage(`${pname} played Wild (${nextColor.toUpperCase()})!`);
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.5 } });
    } else {
      setStatusMessage(`${pname} played.`);
    }

    let nextTurn = (playerIndex + step + players.length) % players.length;
    if (skipNext) {
      if (cardsToDraw > 0) {
        const drawn = drawCards(nextTurn, cardsToDraw);
        setPlayers(prev => prev.map((p, i) =>
          i === nextTurn ? { ...p, cards: [...p.cards, ...drawn] } : p
        ));
      }
      nextTurn = (nextTurn + step + players.length) % players.length;
    }

    setTurnIndex(nextTurn);
  };

  const handlePlayerCardClick = (card: Card) => {
    if (turnIndex !== 0 || aiThinking || isDealing || flyingCard) return;

    if (!isCardPlayable(card)) {
      playSfx('error');
      setStatusMessage(`Cannot play this card.`);
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
    if (turnIndex !== 0 || aiThinking || isDealing || flyingCard) return;
    const drawn = drawCards(0, 1);
    if (drawn.length > 0) {
      setPlayers(prev => prev.map((p, i) =>
        i === 0 ? { ...p, cards: [...p.cards, ...drawn] } : p
      ));
      setStatusMessage(`You drew a card.`);
    }
    setTurnIndex((turnIndex + direction + players.length) % players.length);
  };

  useEffect(() => {
    if (gameState !== 'playing' || winner || isDealing || flyingCard) return;
    const currentPlayer = players[turnIndex];

    if (currentPlayer.isAI) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        try {
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
              setPlayers(prev => prev.map(p =>
                p.id === currentPlayer.id ? { ...p, cards: [...p.cards, ...drawn] } : p
              ));
              setStatusMessage(`${currentPlayer.name} drew.`);
              if (isCardPlayable(drawn[0]) && Math.random() > 0.5) {
                let chosenColor: CardColor = 'red';
                if (drawn[0].color === 'wild') {
                  chosenColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                }
                playCard(turnIndex, drawn[0], chosenColor);
              } else {
                setTurnIndex((turnIndex + direction + players.length) % players.length);
              }
            } else {
              setTurnIndex((turnIndex + direction + players.length) % players.length);
            }
          }
        } catch {
          setTurnIndex((turnIndex + direction + players.length) % players.length);
        } finally {
          setAiThinking(false);
        }
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [turnIndex, gameState, players, winner, direction, isDealing, flyingCard]);

  return (
    <div className="w-full h-full min-h-[660px] flex flex-col items-center justify-between bg-[#4ec0ca] p-3 sm:p-5 rounded-3xl select-none relative overflow-hidden font-mono border-4 border-black shadow-2xl">
      {/* Flappy Bird Retro Sky & Clouds Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_3px,transparent_3px)] [background-size:36px_36px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#d7b56d] border-t-4 border-black flex items-center justify-around opacity-90 pointer-events-none">
        <div className="w-8 h-10 bg-[#73bf2e] border-2 border-black rounded-t-md" />
        <div className="w-12 h-16 bg-[#73bf2e] border-2 border-black rounded-t-md" />
        <div className="w-10 h-12 bg-[#73bf2e] border-2 border-black rounded-t-md" />
      </div>

      {/* Flying Card Animation Overlay */}
      {flyingCard && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className={`w-20 h-28 sm:w-24 sm:h-34 rounded-2xl border-4 border-black shadow-neo-lg flex flex-col justify-between p-2.5 bg-white ${
            COLOR_CLASSES[flyingCard.card.color].bg
          } ${flyingCard.type === 'deal' ? 'animate-card-deal' : 'animate-card-play'}`}>
            <div className="flex justify-between items-start text-white text-[12px] font-black">
              <span>{flyingCard.card.type === 'number' ? flyingCard.card.value : flyingCard.card.type[0].toUpperCase()}</span>
              <span>{flyingCard.card.color === 'wild' ? '🌈' : ''}</span>
            </div>
            <div className="w-10 h-12 sm:w-12 sm:h-14 bg-white rounded-xl border-2 border-black flex items-center justify-center shadow-inner my-auto mx-auto">
              <span className={`text-xl sm:text-2xl font-black ${flyingCard.card.color === 'yellow' ? 'text-amber-950' : flyingCard.card.color === 'red' ? 'text-rose-600' : flyingCard.card.color === 'blue' ? 'text-cyan-600' : flyingCard.card.color === 'green' ? 'text-emerald-600' : 'text-purple-700'}`}>
                {flyingCard.card.type === 'number'
                  ? flyingCard.card.value
                  : flyingCard.card.type === 'skip'
                  ? '🚫'
                  : flyingCard.card.type === 'reverse'
                  ? '🔄'
                  : flyingCard.card.type === 'draw_two'
                  ? '+2'
                  : flyingCard.card.type === 'wild_draw_four'
                  ? '+4'
                  : '★'}
              </span>
            </div>
            <div className="text-[9px] font-black text-white text-right">
              {flyingCard.card.color[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      )}


      {/* Top Header Bar (Back, Title / Status, Reload, Mute) */}
      <div className="w-full flex items-center justify-between px-2 relative z-20">
        <button
          onClick={() => setGameState('menu')}
          className="w-10 h-10 rounded-2xl bg-white text-black border-3 border-black shadow-neo-sm flex items-center justify-center hover:bg-stone-100 active:scale-95 transition-all font-black text-lg"
          title="Back"
        >
          ‹
        </button>

        <div
          onClick={() => {
            setAiThinking(false);
            setFlyingCard(null);
            setIsDealing(false);
            setStatusMessage('Turn reset. Your turn!');
          }}
          className="text-xs font-black text-amber-200 bg-black/70 px-4 py-2 rounded-xl border-2 border-black shadow-sm cursor-pointer hover:bg-black/90 title='Click to unstick if frozen'"
          title="Click to unstick if frozen"
        >
          {statusMessage} ⚡
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startNewGame}
            className="w-10 h-10 rounded-2xl bg-white text-black border-3 border-black shadow-neo-sm flex items-center justify-center hover:bg-stone-100 active:scale-95 transition-all"
            title="Restart Game"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMuted(!muted)}
            className="w-10 h-10 rounded-2xl bg-black/70 text-white border-3 border-black shadow-neo-sm flex items-center justify-center hover:bg-black/90 active:scale-95 transition-all"
            title="Toggle Mute"
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
            Classic UNO round-table showdown against Lea (Top), Marie (Left), and Kate (Right).
          </p>
          <button
            onClick={startNewGame}
            className="px-8 py-4 rounded-2xl bg-amber-400 text-black font-black uppercase text-base border-4 border-black shadow-neo-lg hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-3 animate-pulse"
          >
            <Play className="w-5 h-5 fill-current" /> Start Card Party
          </button>
        </div>
      )}

      {/* Playing State: Clean Circular Table with 4 Curved Directional Arrows */}
      {gameState === 'playing' && (
        <div className="flex-1 w-full max-w-6xl flex flex-col justify-between items-center relative z-10 py-2 px-2">

          {/* TOP AI OPPONENT: LEA (Fanned horizontally in a clean row across the top) */}
          {(() => {
            const lea = players.find(p => p.id === 'lea')!;
            const isTurn = turnIndex === players.findIndex(p => p.id === 'lea');
            return (
              <div className={`flex flex-col items-center gap-1 transition-transform duration-300 ${isTurn ? 'scale-105' : ''}`}>
                <div className="flex -space-x-4">
                  {lea.cards.map((_, i) => {
                    const total = lea.cards.length;
                    const middle = (total - 1) / 2;
                    const rot = (i - middle) * 3.5;
                    return (
                      <div
                        key={i}
                        style={{ transform: `rotate(${rot}deg)` }}
                        className="transform origin-bottom"
                      >
                        <CardBack label={i === 0 ? 'COLOR CARDS' : 'CARDS'} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* MIDDLE ROW: LEFT AI (Marie) + OVAL/CIRCULAR FELT TABLE + RIGHT AI (Kate) */}
          <div className="w-full flex items-center justify-between my-auto py-1 px-0.5 sm:px-3">

            {/* LEFT AI OPPONENT: MARIE */}
            {(() => {
              const marie = players.find(p => p.id === 'marie')!;
              const isTurn = turnIndex === players.findIndex(p => p.id === 'marie');
              return (
                <div className={`flex items-center gap-2 transition-transform duration-300 scale-85 shrink-0 ${isTurn ? 'scale-105' : ''}`}>
                  <div className="flex flex-col -space-y-8 relative py-2">
                    {marie.cards.map((_, i) => (
                      <div key={i} className="transform -rotate-3">
                        <CardBack label="COLOR CARDS" />
                      </div>
                    ))}
                  </div>
                  <div className={`flex flex-col items-center p-1 font-bold ${isTurn ? 'text-amber-400 animate-bounce font-black' : 'text-white'}`}>
                    <div className="flex flex-col items-center leading-tight my-1">
                      {marie.name.split('').map((char, idx) => (
                        <span key={idx} className="text-[10px] font-black uppercase">{char}</span>
                      ))}
                    </div>
                    <span className="px-1.5 py-0.2 bg-black/50 rounded text-[9px] font-black mt-1">{marie.cards.length}</span>
                  </div>
                </div>
              );
            })()}

            {/* OVAL FELT TABLE (Oval on mobile, Circular on desktop) WITH 4 CURVED DIRECTIONAL ARROWS & LEA BADGE + YOU TAB */}
            <div className="relative flex flex-col items-center shrink-0">
              {/* Lea Name Badge sitting right above the table rim */}
              {(() => {
                const lea = players.find(p => p.id === 'lea')!;
                const isTurn = turnIndex === players.findIndex(p => p.id === 'lea');
                return (
                  <div className={`mb-1 px-3 py-0.5 font-bold flex items-center gap-1.5 shadow-sm scale-90 sm:scale-100 ${isTurn ? 'text-amber-400 animate-bounce font-black' : 'text-amber-100'}`}>
                    <span className="text-[11px] font-black uppercase tracking-wider">{lea.name}</span>
                    <span className="bg-black/50 px-1.5 py-0.2 rounded text-[9px]">{lea.cards.length}</span>
                  </div>
                );
              })()}

              <div className="relative w-[220px] h-[210px] sm:w-[380px] sm:h-[440px] rounded-[50%] sm:rounded-full bg-[#52b788] border-5 sm:border-7 border-black shadow-[6px_6px_0px_#000] flex items-center justify-center">


                {/* Central Piles: Draw Pile on Left, Discard Pile on Right */}
                <div className="flex items-center justify-center gap-4 relative z-10">

                  {/* Draw Pile ("CARD PARTY") */}
                  <div
                    onClick={() => {
                      if (turnIndex === 0 && !aiThinking && !isDealing) handlePlayerDraw();
                    }}
                    className="w-14 h-20 sm:w-20 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-3 border-black shadow-neo-md flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all relative group"
                    title="Click to Draw"
                  >
                    <div className="absolute inset-1 border-2 border-dashed border-white/30 rounded-xl flex flex-col items-center justify-center p-1 text-center">
                      <span className="text-[7px] sm:text-[10px] font-black text-amber-400 uppercase tracking-widest leading-tight">CARD PARTY</span>
                      <span className="text-lg sm:text-2xl my-0.5 group-hover:scale-110 transition-transform">🎴</span>
                      <span className="text-[7px] sm:text-[9px] font-black text-white">({deck.length})</span>
                    </div>
                  </div>

                  {/* Discard Pile with Randomized Rotations & Offsets */}
                  <div className="relative w-14 h-20 sm:w-20 sm:h-32">
                    {discardPile.map((card, idx) => {
                      const isTop = idx === discardPile.length - 1;
                      const rot = card.rotation || 0;
                      const ox = card.offsetX || 0;
                      const oy = card.offsetY || 0;

                      return (
                        <div
                          key={card.id}
                          style={{
                            transform: `translate(${ox}px, ${oy}px) rotate(${rot}deg)`,
                            zIndex: isTop ? 9999 : idx,
                          }}
                          className={`absolute inset-0 rounded-2xl border-2 border-black flex flex-col justify-between p-2 shadow-neo-sm ${
                            COLOR_CLASSES[card.color].bg
                          } ${isTop ? 'scale-105 shadow-neo-md animate-fadeIn' : 'opacity-90 pointer-events-none'}`}
                        >
                          <div className="flex justify-between items-start text-white text-[9px] font-black">
                            <span>{card.type === 'number' ? card.value : card.type[0].toUpperCase()}</span>
                            <span>{card.color === 'wild' ? '🌈' : ''}</span>
                          </div>

                          {/* Distinct White Inner Box */}
                          <div className="w-8 h-10 sm:w-10 sm:h-13 bg-white rounded-xl border-2 border-black flex items-center justify-center shadow-inner my-auto mx-auto">
                            <span className={`text-base sm:text-xl font-black ${card.color === 'yellow' ? 'text-amber-950' : card.color === 'red' ? 'text-rose-600' : card.color === 'blue' ? 'text-cyan-600' : card.color === 'green' ? 'text-emerald-600' : 'text-purple-700'}`}>
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

                          <div className="text-[7px] font-black text-white text-right">
                            {card.color[0]?.toUpperCase()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Color Badge on Table */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-black/90 border-2 border-black text-white text-[9px] font-black uppercase flex items-center gap-1 shadow-sm">
                  <span>Color:</span>
                  <span className={`w-2.5 h-2.5 rounded-full border border-black ${COLOR_CLASSES[activeColor].bg}`} />
                  <span className="text-amber-300">{activeColor}</span>
                </div>
              </div>

              {/* Bottom Protruding "YOU" Tab on Table */}
              <div className={`mt-[-3px] px-5 py-0.5 rounded-b-xl border-3 border-t-0 border-black font-black uppercase text-[10px] sm:text-xs shadow-md tracking-wider ${turnIndex === 0 ? 'bg-amber-400 text-black animate-bounce' : 'bg-[#d7b56d] text-black'}`}>
                YOU
              </div>
            </div>

            {/* RIGHT AI OPPONENT: KATE */}
            {(() => {
              const kate = players.find(p => p.id === 'kate')!;
              const isTurn = turnIndex === players.findIndex(p => p.id === 'kate');
              return (
                <div className={`flex items-center gap-2 transition-transform duration-300 scale-85 shrink-0 ${isTurn ? 'scale-105' : ''}`}>
                  <div className={`flex flex-col items-center justify-center p-1.5 ${isTurn ? 'text-amber-400 animate-bounce font-black' : 'text-white font-bold'}`}>
                    <div className="flex flex-col items-center leading-tight">
                      {kate.name.split('').map((char, idx) => (
                        <span key={idx} className="text-[10px] font-black uppercase">{char}</span>
                      ))}
                    </div>
                    <span className="px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-black mt-1.5">{kate.cards.length}</span>
                  </div>
                  <div className="flex flex-col -space-y-8 relative py-2">
                    {kate.cards.map((_, i) => (
                      <div key={i} className="transform rotate-3">
                        <CardBack label="COLOR CARDS" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          </div>


          {/* Persistent Dev Warning Marquee Banner */}
          <div className="w-full bg-[#e53935] text-white border-2 border-black rounded-lg overflow-hidden py-1 px-2 relative z-30 mb-2 shadow-sm">
            <div className="overflow-hidden whitespace-nowrap">
              <span className="animate-marquee text-[11px] font-black uppercase tracking-wider">
                ⚠️ WARNING: This game is in development phase u may incounter bugs and glitches ⚠️
              </span>
            </div>
          </div>

          {/* BOTTOM PLAYER HAND (FANNED & OVERLAPPING) */}
          <div className="w-full bg-black/85 backdrop-blur-md border-3 border-black rounded-2xl p-2.5 flex flex-col items-center shadow-neo-lg">
            <div className="w-full flex justify-between items-center mb-1 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-cyan-400" /> Your Hand ({players[0].cards.length})
                </span>
                {turnIndex === 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-black text-[9px] font-black uppercase animate-pulse border border-black">
                    YOUR TURN
                  </span>
                )}
              </div>
              <button
                onClick={handlePlayerDraw}
                disabled={turnIndex !== 0 || aiThinking || isDealing || !!flyingCard}
                className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black uppercase border-2 border-black shadow-sm active:scale-95 disabled:opacity-50 transition-all"
              >
                Draw Card (+1)
              </button>
            </div>

            {/* Fanned Overlapping Horizontal Hand Layout with generous edge padding so extreme corner cards scroll to the center */}
            <div className="w-full flex items-center overflow-x-auto pb-4 pt-3 px-16 sm:px-28 custom-scrollbar scroll-smooth">
              <div className="flex items-center mx-auto -space-x-8 sm:-space-x-12 hover:space-x-1 transition-all duration-300 py-2 px-12">
                {players[0].cards.map((card, idx, arr) => {
                  const playable = turnIndex === 0 && !aiThinking && !isDealing && !flyingCard && isCardPlayable(card);
                  const total = arr.length;
                  const middle = (total - 1) / 2;
                  const rot = (idx - middle) * 3.5;
                  return (
                    <div
                      key={card.id}
                      onClick={() => handlePlayerCardClick(card)}
                      style={{
                        transform: `rotate(${rot}deg)`,
                      }}
                      className={`w-18 h-26 sm:w-22 sm:h-32 rounded-2xl border-2 border-black flex flex-col justify-between p-2 shrink-0 transition-all duration-300 cursor-pointer origin-bottom ${
                        COLOR_CLASSES[card.color].bg
                      } hover:-translate-y-8 hover:scale-110 hover:rotate-0 hover:z-40 shadow-neo-sm ${
                        playable ? 'ring-4 ring-amber-400 animate-pulse' : 'opacity-90'
                      }`}
                    >
                      <div className="flex justify-between items-start text-white text-[10px] font-black drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        <span>{card.type === 'number' ? card.value : card.type[0].toUpperCase()}</span>
                        <span>{card.color === 'wild' ? '🌈' : ''}</span>
                      </div>

                      {/* White Inner Box */}
                      <div className="w-10 h-12 sm:w-13 sm:h-16 bg-white rounded-xl border-2 border-black flex items-center justify-center shadow-inner my-auto mx-auto">
                        <span className={`text-xl sm:text-2xl font-black drop-shadow-[0_1.5px_0_rgba(0,0,0,1)] ${card.color === 'yellow' ? 'text-amber-950' : card.color === 'red' ? 'text-rose-600' : card.color === 'blue' ? 'text-cyan-600' : card.color === 'green' ? 'text-emerald-600' : 'text-purple-700'}`}>
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

                      <div className="text-[9px] font-black text-white text-right">
                        {card.color[0]?.toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wild Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
          <div className="bg-[#14100e] border-4 border-black rounded-3xl p-6 shadow-neo-lg max-w-sm w-full text-center animate-modal-pop">
            <h3 className="text-lg font-black text-white uppercase mb-4">Choose Color</h3>
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

      {/* Victory Modal */}
      {gameState === 'gameover' && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn p-4">
          <div className="bg-[#14100e] border-4 border-black rounded-3xl p-8 shadow-neo-lg max-w-md w-full text-center animate-modal-pop">
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
