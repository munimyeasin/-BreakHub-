'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Link2,
  Sparkles,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  Trophy,
  Users,
  Bot,
  Flame,
  ArrowRight,
  ShieldAlert,
  Brain,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Timer,
  Hash,
  Send,
  CornerDownLeft,
  ChevronRight,
  Target
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WordNexusGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

export type GameMode = 'solo' | 'ai' | 'pvp';
export type Difficulty = 'novice' | 'veteran' | 'overlord';

interface WordPair {
  id: string;
  start: string;
  target: string;
  category: string;
  difficulty: Difficulty;
  optimalSteps: number;
  samplePath: string[];
}

interface ChainNode {
  word: string;
  author: 'START' | 'PLAYER1' | 'PLAYER2' | 'AI' | 'TARGET';
  timestamp: number;
}

// Built-in Word Pairs across difficulty tiers
const WORD_PAIRS: WordPair[] = [
  // Novice (3-4 steps)
  {
    id: 'p_nov_1',
    start: 'FIRE',
    target: 'WATER',
    category: 'ELEMENTS',
    difficulty: 'novice',
    optimalSteps: 3,
    samplePath: ['FIRE', 'TRUCK', 'HOSE', 'WATER']
  },
  {
    id: 'p_nov_2',
    start: 'COFFEE',
    target: 'BOOK',
    category: 'LIFESTYLE',
    difficulty: 'novice',
    optimalSteps: 3,
    samplePath: ['COFFEE', 'BEAN', 'PLANT', 'PAPER', 'BOOK']
  },
  {
    id: 'p_nov_3',
    start: 'DOG',
    target: 'SPACE',
    category: 'DISCOVERY',
    difficulty: 'novice',
    optimalSteps: 3,
    samplePath: ['DOG', 'BARK', 'TREE', 'OXYGEN', 'SPACE']
  },
  {
    id: 'p_nov_4',
    start: 'SUN',
    target: 'OCEAN',
    category: 'NATURE',
    difficulty: 'novice',
    optimalSteps: 3,
    samplePath: ['SUN', 'BEACH', 'SAND', 'OCEAN']
  },
  {
    id: 'p_nov_5',
    start: 'PIZZA',
    target: 'ITALY',
    category: 'WORLD',
    difficulty: 'novice',
    optimalSteps: 2,
    samplePath: ['PIZZA', 'CHEESE', 'MILK', 'COW', 'ITALY']
  },
  {
    id: 'p_nov_6',
    start: 'APPLE',
    target: 'COMPUTER',
    category: 'TECH',
    difficulty: 'novice',
    optimalSteps: 2,
    samplePath: ['APPLE', 'PHONE', 'SCREEN', 'COMPUTER']
  },
  {
    id: 'p_nov_7',
    start: 'CAR',
    target: 'PLANE',
    category: 'TRAVEL',
    difficulty: 'novice',
    optimalSteps: 3,
    samplePath: ['CAR', 'ROAD', 'AIRPORT', 'PLANE']
  },
  // Veteran (4-5 steps)
  {
    id: 'p_vet_1',
    start: 'NEON',
    target: 'JUNGLE',
    category: 'CYBER-NATURE',
    difficulty: 'veteran',
    optimalSteps: 4,
    samplePath: ['NEON', 'LIGHT', 'SUN', 'TREE', 'JUNGLE']
  },
  {
    id: 'p_vet_2',
    start: 'ROBOT',
    target: 'HONEY',
    category: 'BIOMIMETICS',
    difficulty: 'veteran',
    optimalSteps: 4,
    samplePath: ['ROBOT', 'DRONE', 'BEE', 'FLOWER', 'HONEY']
  },
  {
    id: 'p_vet_3',
    start: 'GUITAR',
    target: 'THUNDER',
    category: 'ENERGY',
    difficulty: 'veteran',
    optimalSteps: 4,
    samplePath: ['GUITAR', 'ROCK', 'STORM', 'LIGHTNING', 'THUNDER']
  },
  {
    id: 'p_vet_4',
    start: 'CASTLE',
    target: 'INTERNET',
    category: 'HISTORY-TECH',
    difficulty: 'veteran',
    optimalSteps: 4,
    samplePath: ['CASTLE', 'GUARD', 'SECURITY', 'PASSWORD', 'INTERNET']
  },
  {
    id: 'p_vet_5',
    start: 'ICE',
    target: 'VOLCANO',
    category: 'GEOLOGY',
    difficulty: 'veteran',
    optimalSteps: 4,
    samplePath: ['ICE', 'WATER', 'STEAM', 'HEAT', 'LAVA', 'VOLCANO']
  },
  // Overlord (5+ steps)
  {
    id: 'p_ovl_1',
    start: 'QUANTUM',
    target: 'DINOSAUR',
    category: 'TIME WARP',
    difficulty: 'overlord',
    optimalSteps: 5,
    samplePath: ['QUANTUM', 'TIME', 'PAST', 'FOSSIL', 'BONE', 'DINOSAUR']
  },
  {
    id: 'p_ovl_2',
    start: 'PENCIL',
    target: 'GALAXY',
    category: 'COSMIC INK',
    difficulty: 'overlord',
    optimalSteps: 5,
    samplePath: ['PENCIL', 'GRAPHITE', 'CARBON', 'STAR', 'GALAXY']
  },
  {
    id: 'p_ovl_3',
    start: 'CHEESE',
    target: 'BLACK HOLE',
    category: 'GRAVITATIONAL',
    difficulty: 'overlord',
    optimalSteps: 5,
    samplePath: ['CHEESE', 'MOON', 'ORBIT', 'GRAVITY', 'SINGULARITY', 'BLACK HOLE']
  }
];

// Bidirectional semantic association graph dictionary
const SEMANTIC_ASSOCIATIONS: Record<string, string[]> = {
  // Elements & Fire
  FIRE: ['TRUCK', 'HOSE', 'FLAME', 'HEAT', 'SMOKE', 'WOOD', 'MATCH', 'RED', 'CAMP', 'HOT', 'WATER', 'ASH', 'EXTINGUISHER', 'DRAGON', 'BURN', 'WARM', 'LIGHT'],
  TRUCK: ['FIRE', 'WHEEL', 'ROAD', 'TIRE', 'CAR', 'HIGHWAY', 'ENGINE', 'DRIVER', 'CARGO', 'GAS', 'OIL', 'TRAILER'],
  HOSE: ['FIRE', 'WATER', 'GARDEN', 'PIPE', 'RUBBER', 'PUMP', 'SPRAY', 'NOZZLE', 'WASH'],
  WATER: ['HOSE', 'FIRE', 'OCEAN', 'RIVER', 'ICE', 'DRINK', 'GLASS', 'RAIN', 'SEA', 'BOAT', 'FISH', 'SWIM', 'WAVE', 'LAKE', 'COLD', 'BLUE', 'DROP'],
  HEAT: ['FIRE', 'SUN', 'SUMMER', 'WARM', 'OVEN', 'SWEAT', 'STEAM', 'THERMAL', 'ENERGY'],
  SMOKE: ['FIRE', 'AIR', 'CLOUD', 'CIGARETTE', 'CHIMNEY', 'SIGNAL', 'GREY', 'POLLUTION'],

  // Coffee & Book & Nature
  COFFEE: ['BEAN', 'CUP', 'MUG', 'TEA', 'CAFFEINE', 'MORNING', 'MILK', 'SUGAR', 'BREAKFAST', 'ESPRESSO', 'CAFE', 'SHOP', 'BOOK'],
  BEAN: ['COFFEE', 'PLANT', 'SOUP', 'SEED', 'FOOD', 'SOIL', 'GREEN', 'GROW', 'JELLY'],
  PLANT: ['BEAN', 'TREE', 'LEAF', 'GARDEN', 'FLOWER', 'GREEN', 'NATURE', 'SOIL', 'SUN', 'WATER', 'OXYGEN', 'FOREST', 'EARTH'],
  TREE: ['PLANT', 'WOOD', 'PAPER', 'LEAF', 'FOREST', 'BARK', 'BRANCH', 'APPLE', 'FRUIT', 'SHADE', 'ROOT'],
  PAPER: ['TREE', 'BOOK', 'PENCIL', 'PEN', 'WRITE', 'SHEET', 'ORIGAMI', 'NEWSPAPER', 'NOTE', 'DOCUMENT'],
  BOOK: ['PAPER', 'PAGE', 'READ', 'STORY', 'LIBRARY', 'AUTHOR', 'COVER', 'COFFEE', 'STUDY', 'SCHOOL', 'NOVEL'],
  TEA: ['COFFEE', 'CUP', 'LEAF', 'WATER', 'GREEN', 'POT', 'SUGAR', 'HERB'],
  CUP: ['COFFEE', 'TEA', 'MUG', 'GLASS', 'DRINK', 'TABLE', 'HANDLE'],

  // Space & Animals
  DOG: ['BARK', 'PUPPY', 'BONE', 'LEASH', 'PET', 'ANIMAL', 'CAT', 'WOLF', 'TAIL', 'FUR', 'RUN', 'FRIEND', 'SPACE'],
  BARK: ['DOG', 'TREE', 'SOUND', 'LOUD', 'WOOD', 'BRANCH'],
  SPACE: ['DOG', 'ROCKET', 'MOON', 'STAR', 'ASTRONAUT', 'PLANET', 'GALAXY', 'EARTH', 'VOID', 'COSMOS', 'OXYGEN', 'SATELLITE', 'SHIP', 'SUN'],
  ROCKET: ['SPACE', 'FUEL', 'ENGINE', 'LAUNCH', 'FIRE', 'SHIP', 'SPEED', 'MOON', 'MARS'],
  MOON: ['SPACE', 'SUN', 'NIGHT', 'CRATER', 'CHEESE', 'TIDE', 'ORBIT', 'EARTH', 'LIGHT'],
  STAR: ['SPACE', 'SUN', 'NIGHT', 'SKY', 'SHINE', 'GALAXY', 'CELEBRITY', 'GOLD', 'LIGHT'],
  EARTH: ['SPACE', 'PLANET', 'WATER', 'LIFE', 'GROUND', 'DIRT', 'NATURE', 'CONTINENT', 'MAP'],
  OXYGEN: ['SPACE', 'PLANT', 'TREE', 'AIR', 'BREATHE', 'LIFE', 'MASK', 'TANK', 'GAS'],

  // Sun & Beach
  SUN: ['MOON', 'STAR', 'SKY', 'HEAT', 'LIGHT', 'YELLOW', 'SUMMER', 'DAY', 'BEACH', 'OCEAN', 'WARM', 'SOLAR'],
  BEACH: ['SUN', 'SAND', 'OCEAN', 'SEA', 'VACATION', 'TOWEL', 'UMBRELLA', 'WAVE', 'SURF', 'SUMMER'],
  SAND: ['BEACH', 'DESERT', 'GLASS', 'CASTLE', 'HOURGLASS', 'TIME', 'DUST', 'OCEAN', 'YELLOW'],
  OCEAN: ['BEACH', 'WATER', 'SEA', 'FISH', 'SHIP', 'SHARK', 'BLUE', 'WAVE', 'DEEP', 'SALT', 'SUN'],

  // Food & Travel & Tech
  PIZZA: ['CHEESE', 'CRUST', 'DOUGH', 'OVEN', 'ITALY', 'SLICE', 'TOMATO', 'DELIVERY', 'PEPPERONI', 'FOOD'],
  CHEESE: ['PIZZA', 'MILK', 'COW', 'YELLOW', 'MOUSE', 'MOON', 'SANDWICH', 'ITALY', 'SWISS'],
  ITALY: ['PIZZA', 'ROME', 'PASTA', 'FLAG', 'EUROPE', 'BOOT', 'WINE', 'COUNTRY', 'CHEESE'],
  APPLE: ['FRUIT', 'TREE', 'RED', 'PHONE', 'COMPUTER', 'PIE', 'SEED', 'JUICE', 'TECH'],
  COMPUTER: ['APPLE', 'SCREEN', 'KEYBOARD', 'MOUSE', 'TECH', 'INTERNET', 'CODE', 'LAPTOP', 'CHIP', 'AI', 'ROBOT'],
  PHONE: ['APPLE', 'CALL', 'SCREEN', 'BATTERY', 'TEXT', 'INTERNET', 'CAMERA', 'SMART'],
  SCREEN: ['PHONE', 'COMPUTER', 'TV', 'GLASS', 'PIXEL', 'DISPLAY', 'TOUCH'],
  CAR: ['ROAD', 'WHEEL', 'DRIVE', 'ENGINE', 'GAS', 'TRAIN', 'GARAGE', 'AIRPORT', 'PLANE', 'SPEED'],
  PLANE: ['AIRPORT', 'FLY', 'SKY', 'WING', 'PILOT', 'TRAVEL', 'JET', 'CLOUD', 'BIRD', 'CAR'],
  AIRPORT: ['CAR', 'PLANE', 'PASSPORT', 'LUGGAGE', 'SECURITY', 'TERMINAL', 'TRAVEL', 'GATE'],
  ROAD: ['CAR', 'TRUCK', 'HIGHWAY', 'STREET', 'ASPHALT', 'DRIVE', 'CROSS', 'TRAFFIC'],

  // Cyber, Robots & Sound
  NEON: ['LIGHT', 'GLOW', 'SIGN', 'NIGHT', 'CITY', 'COLOR', 'CYBER', 'PINK', 'BLUE', 'GAS', 'JUNGLE'],
  LIGHT: ['NEON', 'SUN', 'BULB', 'LAMP', 'DARK', 'BRIGHT', 'ENERGY', 'BEAM', 'FLASH', 'LASER'],
  JUNGLE: ['TREE', 'FOREST', 'ANIMAL', 'MONKEY', 'RAIN', 'GREEN', 'VINE', 'WILD', 'NATURE', 'NEON'],
  ROBOT: ['AI', 'CHIP', 'METAL', 'DRONE', 'COMPUTER', 'FUTURE', 'CYBER', 'BATTERY', 'ANDROID', 'HONEY'],
  DRONE: ['ROBOT', 'FLY', 'CAMERA', 'BEE', 'PROPELLER', 'SKY', 'CONTROL'],
  BEE: ['DRONE', 'HONEY', 'FLOWER', 'INSECT', 'STING', 'YELLOW', 'HIVE', 'BUZZ'],
  FLOWER: ['BEE', 'PLANT', 'GARDEN', 'ROSE', 'SMELL', 'PETAL', 'COLOR', 'SPRING', 'HONEY'],
  HONEY: ['BEE', 'SWEET', 'JAR', 'BEAR', 'GOLD', 'TEA', 'SUGAR', 'FLOWER', 'ROBOT'],
  GUITAR: ['MUSIC', 'ROCK', 'STRING', 'BAND', 'AMP', 'SOUND', 'PLAY', 'SONG', 'THUNDER'],
  ROCK: ['GUITAR', 'STONE', 'HARD', 'EARTH', 'MOUNTAIN', 'STORM', 'BAND', 'DIAMOND'],
  STORM: ['ROCK', 'RAIN', 'WIND', 'THUNDER', 'LIGHTNING', 'CLOUD', 'WEATHER', 'DARK'],
  LIGHTNING: ['STORM', 'THUNDER', 'ELECTRICITY', 'FLASH', 'BOLT', 'SPEED', 'POWER'],
  THUNDER: ['LIGHTNING', 'STORM', 'SOUND', 'LOUD', 'RAIN', 'WEATHER', 'SKY', 'GUITAR'],

  // Castle & Internet
  CASTLE: ['KING', 'QUEEN', 'STONE', 'GUARD', 'WALL', 'MEDIEVAL', 'TOWER', 'SWORD', 'INTERNET'],
  GUARD: ['CASTLE', 'SECURITY', 'DOOR', 'KEY', 'POLICE', 'SHIELD', 'WATCH', 'PROTECT'],
  SECURITY: ['GUARD', 'PASSWORD', 'LOCK', 'CAMERA', 'SAFE', 'CYBER', 'ALARM', 'INTERNET'],
  PASSWORD: ['SECURITY', 'INTERNET', 'LOGIN', 'ACCOUNT', 'SECRET', 'CODE', 'USER'],
  INTERNET: ['PASSWORD', 'COMPUTER', 'WEB', 'WIFI', 'NETWORK', 'ONLINE', 'BROWSER', 'SITE', 'CASTLE'],

  // Ice & Volcano
  ICE: ['COLD', 'WATER', 'SNOW', 'FROZEN', 'WINTER', 'CUBE', 'MELT', 'STEAM', 'VOLCANO'],
  STEAM: ['ICE', 'WATER', 'HEAT', 'BOIL', 'HOT', 'CLOUD', 'ENGINE', 'GAS'],
  LAVA: ['VOLCANO', 'HEAT', 'ROCK', 'FIRE', 'MELT', 'MAGMA', 'RED', 'FLOW'],
  VOLCANO: ['LAVA', 'MOUNTAIN', 'FIRE', 'ERUPT', 'ASH', 'SMOKE', 'HEAT', 'ICE', 'ROCK'],

  // High Overlord
  QUANTUM: ['PHYSICS', 'ATOM', 'TIME', 'COMPUTING', 'ENERGY', 'PARTICLE', 'SCIENCE', 'DIMENSION', 'DINOSAUR'],
  TIME: ['QUANTUM', 'CLOCK', 'WATCH', 'PAST', 'FUTURE', 'TRAVEL', 'HOUR', 'MINUTE', 'HISTORY'],
  PAST: ['TIME', 'HISTORY', 'ANCIENT', 'FOSSIL', 'MEMORY', 'OLD', 'YESTERDAY'],
  FOSSIL: ['PAST', 'BONE', 'ROCK', 'DINOSAUR', 'EARTH', 'ANCIENT', 'PETROLEUM'],
  BONE: ['FOSSIL', 'SKELETON', 'DOG', 'BODY', 'WHITE', 'SKULL', 'DINOSAUR'],
  DINOSAUR: ['FOSSIL', 'BONE', 'REPTILE', 'EXTINCT', 'JURASSIC', 'ANCIENT', 'MONSTER', 'QUANTUM'],
  PENCIL: ['PAPER', 'WRITE', 'GRAPHITE', 'WOOD', 'DRAW', 'ERASER', 'LEAD', 'SKETCH', 'GALAXY'],
  GRAPHITE: ['PENCIL', 'CARBON', 'MINERAL', 'BLACK', 'CONDUCTOR'],
  CARBON: ['GRAPHITE', 'DIAMOND', 'ELEMENT', 'STAR', 'ATOM', 'LIFE', 'CHEMISTRY'],
  GALAXY: ['STAR', 'SPACE', 'MILKY WAY', 'COSMOS', 'UNIVERSE', 'BLACK HOLE', 'PENCIL'],
  BLACK_HOLE: ['GALAXY', 'GRAVITY', 'SINGULARITY', 'SPACE', 'DARK', 'STAR', 'CHEESE', 'HOLE'],
  GRAVITY: ['BLACK_HOLE', 'EARTH', 'FALL', 'FORCE', 'PHYSICS', 'ORBIT', 'APPLE', 'MOON']
};

export default function WordNexusGame({ gameId, onGameOver }: WordNexusGameProps) {
  // Game Setup States
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [difficulty, setDifficulty] = useState<Difficulty>('novice');
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [activePair, setActivePair] = useState<WordPair>(WORD_PAIRS[0]);

  // Match Play States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<'PLAYER1' | 'PLAYER2' | 'AI' | 'DRAW' | null>(null);
  const [activeTurn, setActiveTurn] = useState<'PLAYER1' | 'PLAYER2'>('PLAYER1');

  // Chain & Input
  const [chain, setChain] = useState<ChainNode[]>([]);
  const [inputWord, setInputWord] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'hint' }>({
    text: 'Link the Start word to the Target word!',
    type: 'info'
  });

  // Timer & Metrics
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Audio Synth references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chainScrollRef = useRef<HTMLDivElement | null>(null);

  // Filter pairs by difficulty
  const availablePairs = React.useMemo(() => {
    return WORD_PAIRS.filter(p => p.difficulty === difficulty);
  }, [difficulty]);

  // Procedural Sound Engine
  const playSfx = useCallback((type: 'connect' | 'error' | 'win' | 'hint' | 'tick' | 'ai') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'connect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'hint') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'ai') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'win') {
        // Arpeggio Fanfare
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.type = 'triangle';
          noteOsc.frequency.setValueAtTime(freq, now + i * 0.1);
          noteGain.gain.setValueAtTime(0.3, now + i * 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
          noteOsc.start(now + i * 0.1);
          noteOsc.stop(now + i * 0.1 + 0.35);
        });
      }
    } catch {
      // AudioContext unavailable
    }
  }, [soundEnabled]);

  // Start or Reset a Match
  const startMatch = useCallback((pairToUse?: WordPair) => {
    const pair = pairToUse || availablePairs[currentPairIndex % availablePairs.length] || WORD_PAIRS[0];
    setActivePair(pair);
    setChain([
      {
        word: pair.start,
        author: 'START',
        timestamp: Date.now()
      }
    ]);
    setInputWord('');
    setIsPlaying(true);
    setIsGameOver(false);
    setWinner(null);
    setActiveTurn('PLAYER1');
    setTimeLeft(difficulty === 'novice' ? 60 : difficulty === 'veteran' ? 50 : 45);
    setHintsRemaining(3);
    setStatusMessage({
      text: `Link "${pair.start}" ➔ "${pair.target}"! Enter a related word.`,
      type: 'info'
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [availablePairs, currentPairIndex, difficulty]);

  // Initial load
  useEffect(() => {
    startMatch();
  }, [startMatch]);

  // Auto-scroll chain when new nodes added
  useEffect(() => {
    if (chainScrollRef.current) {
      chainScrollRef.current.scrollLeft = chainScrollRef.current.scrollWidth;
    }
  }, [chain]);

  // Validate Semantic Association
  const checkAssociation = useCallback((prevWord: string, nextWord: string): boolean => {
    const cleanPrev = prevWord.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    const cleanNext = nextWord.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');

    if (!cleanNext || cleanNext.length < 2) return false;
    if (cleanPrev === cleanNext) return false;

    // 1. Direct Graph Lookup in Semantic Dictionary
    const prevKey = cleanPrev.replace(/\s+/g, '_');
    const nextKey = cleanNext.replace(/\s+/g, '_');

    if (SEMANTIC_ASSOCIATIONS[cleanPrev]?.includes(cleanNext)) return true;
    if (SEMANTIC_ASSOCIATIONS[prevKey]?.includes(nextKey)) return true;
    if (SEMANTIC_ASSOCIATIONS[cleanNext]?.includes(cleanPrev)) return true;

    // 2. Compound Word / Substring Link (e.g., FIRE + TRUCK = FIRETRUCK, SUN + FLOWER = SUNFLOWER)
    const combined = cleanPrev + cleanNext;
    const revCombined = cleanNext + cleanPrev;
    if (cleanPrev.includes(cleanNext) || cleanNext.includes(cleanPrev)) return true;
    if (['FIRETRUCK', 'SUNFLOWER', 'COFFEEMUG', 'BOOKSTORE', 'SPACESHIP', 'WATERFALL', 'STARFISH', 'RAINBOW', 'PASSPORT', 'KEYBOARD', 'LAPTOP'].includes(combined) ||
        ['FIRETRUCK', 'SUNFLOWER', 'COFFEEMUG', 'BOOKSTORE', 'SPACESHIP', 'WATERFALL', 'STARFISH', 'RAINBOW', 'PASSPORT', 'KEYBOARD', 'LAPTOP'].includes(revCombined)) {
      return true;
    }

    // 3. Shared Associated Hubs (2-degree co-occurrence bridge)
    const prevNeighbors = SEMANTIC_ASSOCIATIONS[cleanPrev] || [];
    const nextNeighbors = SEMANTIC_ASSOCIATIONS[cleanNext] || [];
    const commonHubs = prevNeighbors.filter(w => nextNeighbors.includes(w));
    if (commonHubs.length > 0) return true;

    // 4. Creative Lexical Link Fallback (Words sharing 3+ character prefix or semantic suffix)
    if (cleanPrev.length >= 4 && cleanNext.length >= 4) {
      if (cleanPrev.slice(0, 3) === cleanNext.slice(0, 3)) return true;
    }

    return false;
  }, []);

  // End Game and Victory Resolution
  const handleVictory = useCallback((winningPlayer: 'PLAYER1' | 'PLAYER2' | 'AI') => {
    setIsGameOver(true);
    setIsPlaying(false);
    setWinner(winningPlayer);
    playSfx('win');

    if (winningPlayer !== 'AI') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Calculate final score
    const stepBonus = Math.max(0, (10 - chain.length) * 150);
    const timeBonus = Math.floor(timeLeft * 25);
    const diffMultiplier = difficulty === 'novice' ? 1.0 : difficulty === 'veteran' ? 1.5 : 2.0;
    const matchScore = Math.floor((1000 + stepBonus + timeBonus) * diffMultiplier);

    setScore(prev => prev + matchScore);
    setStreak(prev => prev + 1);

    onGameOver(matchScore);
  }, [chain.length, difficulty, onGameOver, playSfx, timeLeft]);

  // AI Turn Logic ("CORTEX-AI")
  const triggerAiTurn = useCallback((currentLastWord: string) => {
    setIsAiThinking(true);
    setStatusMessage({ text: 'CORTEX-AI is searching neural pathways...', type: 'info' });

    setTimeout(() => {
      const cleanTarget = activePair.target.toUpperCase();
      const lastClean = currentLastWord.toUpperCase();

      // Check if AI can reach target in one step
      if (checkAssociation(lastClean, cleanTarget)) {
        setIsAiThinking(false);
        setChain(prev => [
          ...prev,
          { word: cleanTarget, author: 'AI', timestamp: Date.now() }
        ]);
        playSfx('connect');
        handleVictory('AI');
        return;
      }

      // Look up sample path or pick best semantic neighbor
      const neighbors = SEMANTIC_ASSOCIATIONS[lastClean] || [];
      const unusedNeighbors = neighbors.filter(w => !chain.some(n => n.word === w));

      let nextAiWord = '';

      // Prefer word from samplePath if present
      const sampleIdx = activePair.samplePath.indexOf(lastClean);
      if (sampleIdx !== -1 && sampleIdx + 1 < activePair.samplePath.length) {
        nextAiWord = activePair.samplePath[sampleIdx + 1];
      } else if (unusedNeighbors.length > 0) {
        nextAiWord = unusedNeighbors[Math.floor(Math.random() * unusedNeighbors.length)];
      } else {
        // Fallback word generator
        nextAiWord = activePair.samplePath[Math.min(chain.length, activePair.samplePath.length - 1)] || 'BRIDGE';
      }

      setIsAiThinking(false);
      playSfx('ai');

      setChain(prev => [
        ...prev,
        { word: nextAiWord, author: 'AI', timestamp: Date.now() }
      ]);

      if (nextAiWord === cleanTarget || checkAssociation(nextAiWord, cleanTarget)) {
        if (nextAiWord !== cleanTarget) {
          // AI links directly to finish
          setChain(prev => [
            ...prev,
            { word: cleanTarget, author: 'AI', timestamp: Date.now() }
          ]);
        }
        handleVictory('AI');
      } else {
        setActiveTurn('PLAYER1');
        setStatusMessage({
          text: `AI linked "${nextAiWord}"! Your turn to bridge to "${activePair.target}".`,
          type: 'info'
        });
      }
    }, 1100);
  }, [activePair, chain, checkAssociation, handleVictory, playSfx]);

  // Submit Word Link
  const handleSubmitWord = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPlaying || isGameOver || isAiThinking) return;

    const trimmed = inputWord.trim().toUpperCase();
    if (!trimmed) return;

    const lastNode = chain[chain.length - 1];
    const targetClean = activePair.target.toUpperCase();

    // Check if word is already in the chain
    if (chain.some(node => node.word.toUpperCase() === trimmed)) {
      playSfx('error');
      setStatusMessage({
        text: `"${trimmed}" is already in the neural chain! Try another link.`,
        type: 'error'
      });
      return;
    }

    // Validate link with previous node
    const isValid = checkAssociation(lastNode.word, trimmed);

    if (!isValid) {
      playSfx('error');
      setStatusMessage({
        text: `Invalid Link! "${trimmed}" does not strongly connect with "${lastNode.word}".`,
        type: 'error'
      });
      return;
    }

    // Valid Link!
    playSfx('connect');
    const author = gameMode === 'pvp' ? activeTurn : 'PLAYER1';

    const newChain: ChainNode[] = [
      ...chain,
      {
        word: trimmed,
        author,
        timestamp: Date.now()
      }
    ];

    setChain(newChain);
    setInputWord('');

    // Check if TARGET word is reached
    if (trimmed === targetClean) {
      handleVictory(author);
      return;
    }

    // Check if target is 1 step away and can be auto-suggested or completed
    if (checkAssociation(trimmed, targetClean)) {
      setStatusMessage({
        text: `⚡ DIRECT LINK READY! You can now connect directly to "${targetClean}"!`,
        type: 'success'
      });
    } else {
      setStatusMessage({
        text: `Linked "${trimmed}"! Bridge closer to "${targetClean}".`,
        type: 'success'
      });
    }

    // Turn handover
    if (gameMode === 'ai') {
      setActiveTurn('PLAYER1');
      triggerAiTurn(trimmed);
    } else if (gameMode === 'pvp') {
      const nextTurn = activeTurn === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';
      setActiveTurn(nextTurn);
      setStatusMessage({
        text: `${activeTurn === 'PLAYER1' ? 'Player 1' : 'Player 2'} linked "${trimmed}"! Now ${nextTurn === 'PLAYER1' ? 'Player 1 (Cyan)' : 'Player 2 (Pink)'}'s turn.`,
        type: 'info'
      });
    }
  }, [isPlaying, isGameOver, isAiThinking, inputWord, chain, activePair.target, checkAssociation, playSfx, gameMode, activeTurn, handleVictory, triggerAiTurn]);

  // Neural Scan Hint
  const handleUseHint = useCallback(() => {
    if (hintsRemaining <= 0 || !isPlaying || isGameOver || isAiThinking) return;

    const lastNode = chain[chain.length - 1];
    const targetClean = activePair.target.toUpperCase();
    playSfx('hint');

    // 1. If target connects directly, tell player!
    if (checkAssociation(lastNode.word, targetClean)) {
      setStatusMessage({
        text: `💡 NEURAL SCAN: Target "${targetClean}" connects DIRECTLY right now!`,
        type: 'hint'
      });
      setHintsRemaining(prev => prev - 1);
      return;
    }

    // 2. Find step in sample path or neighbor
    const sampleIdx = activePair.samplePath.indexOf(lastNode.word.toUpperCase());
    let hintWord = '';

    if (sampleIdx !== -1 && sampleIdx + 1 < activePair.samplePath.length) {
      hintWord = activePair.samplePath[sampleIdx + 1];
    } else {
      const neighbors = SEMANTIC_ASSOCIATIONS[lastNode.word.toUpperCase()] || [];
      const unused = neighbors.filter(w => !chain.some(n => n.word === w));
      if (unused.length > 0) {
        hintWord = unused[0];
      }
    }

    if (hintWord) {
      setStatusMessage({
        text: `💡 NEURAL SCAN: Try connecting through "${hintWord}" (or similar concepts)!`,
        type: 'hint'
      });
    } else {
      setStatusMessage({
        text: `💡 NEURAL SCAN: Think of categories linking ${lastNode.word} ➔ ${targetClean}!`,
        type: 'hint'
      });
    }

    setHintsRemaining(prev => prev - 1);
  }, [hintsRemaining, isPlaying, isGameOver, isAiThinking, chain, activePair, playSfx, checkAssociation]);

  // Countdown timer effect
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsGameOver(true);
          setIsPlaying(false);
          setWinner('DRAW');
          playSfx('error');
          setStatusMessage({ text: '⏳ Time expired! Connection lost.', type: 'error' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isGameOver, playSfx]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Blur
        inputRef.current?.blur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleUseHint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUseHint]);

  return (
    <div className="w-full max-w-full h-full flex-1 flex flex-col items-center justify-center p-2 text-white select-none">
      {/* 1. High-Voltage Neo-Brutalist HUD Header - Streamlined */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)))] flex items-center justify-between gap-2 p-2 bg-portal-card border-2 border-black rounded-xl shadow-neo-sm mb-1.5 shrink-0">
        {/* Title & Category Badge */}
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-portal-yellow border border-black flex items-center justify-center shadow-sm">
            <Link2 className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                WORD NEXUS
              </h2>
              <span className="px-1.5 py-0.2 rounded bg-portal-cyan border border-black text-[9px] font-black text-black uppercase">
                {activePair.category}
              </span>
            </div>
          </div>
        </div>

        {/* Live Counters & Controls */}
        <div className="flex items-center gap-1.5">
          {/* Timer Display */}
          <div className={`px-2 py-0.5 rounded-lg border border-black flex items-center gap-1 shadow-sm font-black text-xs ${
            timeLeft <= 10 ? 'bg-portal-pink text-black animate-pulse' : 'bg-portal-surface text-portal-yellow'
          }`}>
            <Timer className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{timeLeft}s</span>
          </div>

          {/* Score Counter */}
          <div className="hidden xs:flex px-2 py-0.5 rounded-lg bg-portal-surface border border-black items-center gap-1 shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-portal-cyan" />
            <span className="font-mono text-xs font-black text-white">{score}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-1 rounded-lg bg-portal-surface hover:bg-portal-yellow hover:text-black border border-black shadow-sm transition-all"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-portal-lime" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* 2. Match Configuration Deck (Mode & Difficulty Switcher) */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)))] grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-1.5 shrink-0">
        {/* Mode Selector */}
        <div className="flex items-center p-0.5 bg-portal-surface border border-black rounded-lg gap-1 shadow-sm">
          <button
            onClick={() => { setGameMode('solo'); startMatch(); }}
            className={`flex-1 py-1 rounded-md text-[10px] font-black uppercase flex items-center justify-center gap-1 border border-black transition-all ${
              gameMode === 'solo' ? 'bg-portal-yellow text-black shadow-sm' : 'text-slate-400 hover:text-white bg-portal-card'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Solo</span>
          </button>
          <button
            onClick={() => { setGameMode('ai'); startMatch(); }}
            className={`flex-1 py-1 rounded-md text-[10px] font-black uppercase flex items-center justify-center gap-1 border border-black transition-all ${
              gameMode === 'ai' ? 'bg-portal-cyan text-black shadow-sm' : 'text-slate-400 hover:text-white bg-portal-card'
            }`}
          >
            <Bot className="w-3 h-3" />
            <span>vs AI</span>
          </button>
          <button
            onClick={() => { setGameMode('pvp'); startMatch(); }}
            className={`flex-1 py-1 rounded-md text-[10px] font-black uppercase flex items-center justify-center gap-1 border border-black transition-all ${
              gameMode === 'pvp' ? 'bg-portal-pink text-white shadow-sm' : 'text-slate-400 hover:text-white bg-portal-card'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>2P</span>
          </button>
        </div>

        {/* Difficulty & Next Match Switcher */}
        <div className="flex items-center justify-between p-0.5 bg-portal-surface border border-black rounded-lg gap-1 shadow-sm">
          <div className="flex items-center gap-0.5">
            {(['novice', 'veteran', 'overlord'] as Difficulty[]).map(diff => (
              <button
                key={diff}
                onClick={() => {
                  setDifficulty(diff);
                  const matching = WORD_PAIRS.filter(p => p.difficulty === diff);
                  startMatch(matching[0]);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-black transition-all ${
                  difficulty === diff ? 'bg-portal-lime text-black shadow-sm' : 'text-slate-400 bg-portal-card hover:text-white'
                }`}
              >
                {diff.slice(0, 3)}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const nextIdx = currentPairIndex + 1;
              setCurrentPairIndex(nextIdx);
              startMatch(availablePairs[nextIdx % availablePairs.length]);
            }}
            className="px-2 py-0.5 rounded bg-portal-card hover:bg-portal-yellow hover:text-black border border-black text-[9px] font-black uppercase flex items-center gap-1 transition-all"
            title="Next Puzzle Match"
          >
            <span>Next</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. The Central Nexus Anchor Display (START ➔ TARGET) */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)))] bg-portal-surface border-2 border-black rounded-xl p-2.5 shadow-md mb-1.5 relative overflow-hidden shrink-0">
        <div className="flex flex-row items-center justify-between gap-2">
          {/* Start Anchor Node */}
          <div className="flex-1 min-w-0 p-2 rounded-lg bg-portal-card border border-black shadow-sm flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-portal-cyan border border-black flex items-center justify-center font-black text-black text-[9px] shrink-0">
              START
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-black uppercase text-portal-cyan tracking-wider block">Origin</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide truncate block">
                {activePair.start}
              </span>
            </div>
          </div>

          {/* Bridge Connector Arrow */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-portal-yellow text-black border border-black rounded-lg font-black text-[10px] shadow-sm shrink-0">
            <Link2 className="w-3 h-3 stroke-[3]" />
            <ArrowRight className="w-3 h-3 stroke-[3]" />
          </div>

          {/* Target Anchor Node */}
          <div className="flex-1 min-w-0 p-2 rounded-lg bg-portal-card border border-black shadow-sm flex items-center gap-2 justify-between">
            <div className="w-7 h-7 rounded bg-portal-pink border border-black flex items-center justify-center font-black text-white text-[9px] shrink-0">
              GOAL
            </div>
            <div className="min-w-0 text-left">
              <span className="text-[8px] font-black uppercase text-portal-pink tracking-wider block">Goal</span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide truncate block">
                {activePair.target}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dynamic Synaptic Chain Visualizer Grid */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)))] bg-black/90 border-2 border-black rounded-xl p-2.5 shadow-md mb-1.5 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black uppercase text-portal-yellow tracking-wider flex items-center gap-1">
            <Brain className="w-3.5 h-3.5 text-portal-cyan" />
            SYNAPTIC LINK CHAIN ({chain.length})
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            Optimal: ~{activePair.optimalSteps}
          </span>
        </div>

        {/* Horizontal Node Track */}
        <div
          ref={chainScrollRef}
          className="w-full flex items-center gap-1.5 overflow-x-auto py-2 px-1 custom-scrollbar"
        >
          {chain.map((node, idx) => {
            const isStart = node.author === 'START';
            const isAI = node.author === 'AI';
            const isP2 = node.author === 'PLAYER2';
            const isLast = idx === chain.length - 1;

            return (
              <React.Fragment key={idx}>
                {/* Node Pill */}
                <div
                  className={`relative shrink-0 px-2.5 py-1.5 rounded-lg border border-black shadow-sm flex flex-col items-center justify-center transition-all ${
                    isStart
                      ? 'bg-portal-cyan text-black font-black'
                      : isAI
                      ? 'bg-purple-600 text-white font-black'
                      : isP2
                      ? 'bg-portal-pink text-white font-black'
                      : 'bg-portal-yellow text-black font-black'
                  } ${isLast && isPlaying ? 'ring-2 ring-white scale-105' : ''}`}
                >
                  <span className="text-[7px] uppercase tracking-wider opacity-80">
                    {node.author === 'START' ? 'ORIGIN' : node.author}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wide">
                    {node.word}
                  </span>
                </div>

                {/* Connector Link Wire */}
                {idx < chain.length - 1 && (
                  <div className="shrink-0 flex items-center text-portal-lime">
                    <div className="w-3 h-0.5 bg-portal-lime border-y border-black" />
                    <ChevronRight className="w-3 h-3 -ml-1 stroke-[3]" />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Pulsing Next Target Node Placeholder */}
          {isPlaying && (
            <>
              <div className="shrink-0 flex items-center text-slate-500">
                <div className="w-3 h-0.5 bg-slate-700 border-y border-black" />
                <ChevronRight className="w-3 h-3 -ml-1 stroke-[3]" />
              </div>
              <div className="shrink-0 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-600 bg-portal-surface/60 text-slate-400 text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                <span>Next Link...</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Live Status & Feedback Banner */}
      <div
        className={`w-full max-w-[min(100%,calc(min(76vh,640px)))] p-2 rounded-lg border border-black shadow-sm mb-1.5 flex items-center justify-between text-[11px] font-black transition-all shrink-0 ${
          statusMessage.type === 'success'
            ? 'bg-portal-lime/20 text-portal-lime border-portal-lime'
            : statusMessage.type === 'error'
            ? 'bg-portal-pink/20 text-portal-pink border-portal-pink'
            : statusMessage.type === 'hint'
            ? 'bg-portal-yellow/20 text-portal-yellow border-portal-yellow'
            : 'bg-portal-surface text-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {statusMessage.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
          {statusMessage.type === 'error' && <XCircle className="w-3.5 h-3.5 shrink-0" />}
          {statusMessage.type === 'hint' && <Lightbulb className="w-3.5 h-3.5 shrink-0 text-portal-yellow" />}
          {statusMessage.type === 'info' && <Target className="w-3.5 h-3.5 shrink-0 text-portal-cyan" />}
          <span className="truncate">{statusMessage.text}</span>
        </div>

        {gameMode === 'pvp' && (
          <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-black shrink-0 ${
            activeTurn === 'PLAYER1' ? 'bg-portal-cyan text-black' : 'bg-portal-pink text-white'
          }`}>
            {activeTurn === 'PLAYER1' ? 'P1' : 'P2'}
          </span>
        )}
      </div>

      {/* 6. Interactive Input & Command Terminal */}
      {!isGameOver ? (
        <form onSubmit={handleSubmitWord} className="w-full max-w-[min(100%,calc(min(76vh,640px)))] flex flex-row gap-1.5 mb-1.5 shrink-0">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputWord}
              onChange={e => setInputWord(e.target.value)}
              disabled={!isPlaying || isAiThinking}
              placeholder={`Link "${chain[chain.length - 1]?.word}"...`}
              className="w-full px-3 py-2 bg-portal-surface border-2 border-black rounded-lg text-white font-black text-xs sm:text-sm uppercase placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-portal-yellow disabled:opacity-50"
              autoFocus
            />
            {inputWord && (
              <button
                type="button"
                onClick={() => setInputWord('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Submit Link Button */}
            <button
              type="submit"
              disabled={!isPlaying || isAiThinking || !inputWord.trim()}
              className="px-4 py-2 rounded-lg bg-portal-lime text-black border-2 border-black font-black text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Link</span>
            </button>

            {/* Neural Scan Hint Button */}
            <button
              type="button"
              onClick={handleUseHint}
              disabled={hintsRemaining <= 0 || !isPlaying || isAiThinking}
              className="px-2.5 py-2 rounded-lg bg-portal-yellow text-black border-2 border-black font-black text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50"
              title="Use Neural Scan Hint [Hotkey: Tab]"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{hintsRemaining}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Game Over & Match Victory Banner */
        <div className="w-full max-w-[min(100%,calc(min(76vh,640px)))] p-3 rounded-xl bg-portal-card border-2 border-black shadow-md flex flex-col items-center justify-center text-center gap-2 animate-in fade-in zoom-in duration-200 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-portal-yellow border border-black flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-black stroke-[2.5]" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              {winner === 'AI' ? 'CORTEX-AI WON THE RACE!' : winner === 'DRAW' ? 'TIME RUN OUT!' : `${winner === 'PLAYER1' ? 'PLAYER 1' : 'PLAYER 2'} CONNECTED THE NEXUS!`}
            </h3>
            <p className="text-[11px] text-slate-300 font-bold mt-0.5">
              Chain: <span className="text-portal-yellow font-black">{chain.length} Nodes</span> • Time: <span className="text-portal-cyan font-black">{timeLeft}s</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => startMatch()}
              className="px-4 py-1.5 rounded-lg bg-portal-lime text-black border border-black font-black text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>
            <button
              onClick={() => {
                const nextIdx = currentPairIndex + 1;
                setCurrentPairIndex(nextIdx);
                startMatch(availablePairs[nextIdx % availablePairs.length]);
              }}
              className="px-4 py-1.5 rounded-lg bg-portal-cyan text-black border border-black font-black text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center gap-1"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 7. Tactical Mini Intel Footer */}
      <div className="w-full max-w-[min(100%,calc(min(76vh,640px)))] flex items-center justify-between text-[9px] text-slate-400 font-black uppercase px-1 shrink-0">
        <span>[ENTER] LINK • [TAB] HINT</span>
        <span>STREAK: {streak} 🔥</span>
      </div>
    </div>
  );
}
