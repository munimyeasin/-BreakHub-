/**
 * Core Gamification State & Progression Engine for Stress Buster
 * Implements: XP/Levels, Daily Login Streaks, Deterministic Daily Quests, Cyber Trophy Vault, and Event Dispatching.
 */

import { audio } from './audio';

export type TrophyRarity = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface Trophy {
  id: string;
  title: string;
  description: string;
  rarity: TrophyRarity;
  xpReward: number;
  icon: string;
  category: 'gameplay' | 'social' | 'mastery' | 'streak';
}

export type QuestType =
  | 'PLAY_GAMES_COUNT'
  | 'PLAY_SPECIFIC_GAME'
  | 'PLAY_CATEGORY'
  | 'SUBMIT_SCORE'
  | 'RATE_GAME'
  | 'SPIN_ROULETTE'
  | 'EARN_XP';

export interface DailyQuestDefinition {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;
  xpReward: number;
  icon: string;
  gameId?: string;
  category?: string;
  tier: 'easy' | 'medium' | 'hard';
}

export interface DailyQuestProgress {
  id: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}

export interface PlayerStats {
  totalGamesPlayed: number;
  uniqueGamesPlayed: string[];
  totalScoreAccumulated: number;
  highestSingleScore: number;
  gamesRated: number;
  favoritesCount: number;
  rouletteSpins: number;
  questsCompletedCount: number;
  hypeCount: number;
  categoriesPlayed: string[];
}

export interface GamificationState {
  xp: number;
  level: number;
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string; // YYYY-MM-DD
    todayClaimed: boolean;
  };
  dailyQuests: {
    date: string; // YYYY-MM-DD
    progress: DailyQuestProgress[];
    dailyMasterClaimed: boolean;
  };
  unlockedTrophies: Record<string, { unlockedAt: string }>;
  stats: PlayerStats;
}

export interface LevelInfo {
  level: number;
  title: string;
  currentLevelBaseXp: number;
  nextLevelXp: number;
  xpIntoCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
}

export interface XpGrantResult {
  previousXp: number;
  newXp: number;
  xpGained: number;
  previousLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  newlyUnlockedTrophies: Trophy[];
  reason: string;
}

// -------------------------------------------------------------
// 1. TROPHY VAULT DEFINITIONS (16 Achievements)
// -------------------------------------------------------------
export const TROPHIES: Trophy[] = [
  // Bronze
  {
    id: 'first_boot',
    title: 'Arcade Initiate',
    description: 'Play your first mini-game in Stress Buster',
    rarity: 'BRONZE',
    xpReward: 50,
    icon: '🎮',
    category: 'gameplay',
  },
  {
    id: 'neon_initiate',
    title: 'Neon Initiate',
    description: 'Advance to Player Level 2',
    rarity: 'BRONZE',
    xpReward: 50,
    icon: '⚡',
    category: 'mastery',
  },
  {
    id: 'the_critic',
    title: 'Portal Critic',
    description: 'Rate any game with stars',
    rarity: 'BRONZE',
    xpReward: 40,
    icon: '⭐',
    category: 'social',
  },
  {
    id: 'curator',
    title: 'Curator',
    description: 'Save 3 favorite games to your quick access list',
    rarity: 'BRONZE',
    xpReward: 40,
    icon: '❤️',
    category: 'social',
  },

  // Silver
  {
    id: 'grid_explorer',
    title: 'Grid Explorer',
    description: 'Play at least 4 different mini-games',
    rarity: 'SILVER',
    xpReward: 100,
    icon: '🧭',
    category: 'gameplay',
  },
  {
    id: 'daily_devotee',
    title: 'Daily Devotee',
    description: 'Maintain an active 3-day play streak',
    rarity: 'SILVER',
    xpReward: 100,
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    description: 'Spin the Random Game Roulette 3 times',
    rarity: 'SILVER',
    xpReward: 80,
    icon: '🎲',
    category: 'gameplay',
  },
  {
    id: 'score_hunter',
    title: 'Score Hunter',
    description: 'Achieve a score of 500+ in any game',
    rarity: 'SILVER',
    xpReward: 100,
    icon: '🎯',
    category: 'mastery',
  },
  {
    id: 'mission_specialist',
    title: 'Mission Specialist',
    description: 'Complete and claim 5 Daily Quests',
    rarity: 'SILVER',
    xpReward: 120,
    icon: '📜',
    category: 'mastery',
  },

  // Gold
  {
    id: 'omnipresent',
    title: 'Arcade Veteran',
    description: 'Play at least 7 distinct mini-games',
    rarity: 'GOLD',
    xpReward: 200,
    icon: '👑',
    category: 'gameplay',
  },
  {
    id: 'flame_keeper',
    title: 'Flame Keeper',
    description: 'Maintain an active 7-day play streak',
    rarity: 'GOLD',
    xpReward: 250,
    icon: '✨',
    category: 'streak',
  },
  {
    id: 'score_titan',
    title: 'Score Titan',
    description: 'Achieve a massive score of 1,500+ in any game',
    rarity: 'GOLD',
    xpReward: 250,
    icon: '🏆',
    category: 'mastery',
  },
  {
    id: 'cyber_elite',
    title: 'Cyber Elite',
    description: 'Reach Player Level 5',
    rarity: 'GOLD',
    xpReward: 250,
    icon: '💎',
    category: 'mastery',
  },
  {
    id: 'genre_master',
    title: 'Genre Master',
    description: 'Play at least 3 distinct game categories (Action, Puzzle, Reflex, Arcade)',
    rarity: 'GOLD',
    xpReward: 200,
    icon: '🔮',
    category: 'gameplay',
  },

  // Platinum
  {
    id: 'cyber_legend',
    title: 'Cyberpunk Legend',
    description: 'Reach Player Level 10 on Stress Buster',
    rarity: 'PLATINUM',
    xpReward: 500,
    icon: '🌌',
    category: 'mastery',
  },
  {
    id: 'apex_grandmaster',
    title: 'Apex Grandmaster',
    description: 'Maintain a 14-day streak and complete 15 daily quests',
    rarity: 'PLATINUM',
    xpReward: 1000,
    icon: '🔱',
    category: 'mastery',
  },
];

// -------------------------------------------------------------
// 2. DAILY QUEST POOL (12 Deterministic Missions)
// -------------------------------------------------------------
export const QUEST_POOL: DailyQuestDefinition[] = [
  // Easy
  {
    id: 'q_play_1',
    title: 'Quick Reflex',
    description: 'Play any 1 mini-game',
    type: 'PLAY_GAMES_COUNT',
    target: 1,
    xpReward: 40,
    icon: '🕹️',
    tier: 'easy',
  },
  {
    id: 'q_rate_1',
    title: 'Critic Eye',
    description: 'Rate any game in the catalog',
    type: 'RATE_GAME',
    target: 1,
    xpReward: 40,
    icon: '⭐',
    tier: 'easy',
  },
  {
    id: 'q_roulette_1',
    title: 'Wheel of Fate',
    description: 'Spin the Random Game Roulette once',
    type: 'SPIN_ROULETTE',
    target: 1,
    xpReward: 35,
    icon: '🎲',
    tier: 'easy',
  },
  {
    id: 'q_action_1',
    title: 'Action Seeker',
    description: 'Play 1 Action game (Neon Starfighter or Cyber Slicer)',
    type: 'PLAY_CATEGORY',
    category: 'Action',
    target: 1,
    xpReward: 45,
    icon: '⚔️',
    tier: 'easy',
  },

  // Medium
  {
    id: 'q_play_3',
    title: 'Arcade Triad',
    description: 'Play 3 mini-game sessions today',
    type: 'PLAY_GAMES_COUNT',
    target: 3,
    xpReward: 75,
    icon: '⚡',
    tier: 'medium',
  },
  {
    id: 'q_score_300',
    title: 'Precision Strike',
    description: 'Submit a score of 300+ in any game',
    type: 'SUBMIT_SCORE',
    target: 300,
    xpReward: 60,
    icon: '🎯',
    tier: 'medium',
  },
  {
    id: 'q_puzzle_1',
    title: 'Neural Matrix',
    description: 'Play a Puzzle or Reflex game (Quantum 2048, Memory Matrix, Quantum XO)',
    type: 'PLAY_CATEGORY',
    category: 'Puzzle',
    target: 1,
    xpReward: 60,
    icon: '🧠',
    tier: 'medium',
  },
  {
    id: 'q_slicer_1',
    title: 'Blade Protocol',
    description: 'Play 1 session of Cyber Slicer',
    type: 'PLAY_SPECIFIC_GAME',
    gameId: 'cyber-slicer',
    target: 1,
    xpReward: 60,
    icon: '🍉',
    tier: 'medium',
  },

  // Hard
  {
    id: 'q_score_800',
    title: 'High Score Titan',
    description: 'Submit a high score of 800+ in any game',
    type: 'SUBMIT_SCORE',
    target: 800,
    xpReward: 100,
    icon: '🏆',
    tier: 'hard',
  },
  {
    id: 'q_play_5',
    title: 'Portal Marathon',
    description: 'Play 5 mini-game sessions today',
    type: 'PLAY_GAMES_COUNT',
    target: 5,
    xpReward: 100,
    icon: '🔥',
    tier: 'hard',
  },
  {
    id: 'q_starfighter_1',
    title: 'Starfighter Ace',
    description: 'Play 1 session of Neon Starfighter',
    type: 'PLAY_SPECIFIC_GAME',
    gameId: 'neon-starfighter',
    target: 1,
    xpReward: 80,
    icon: '🚀',
    tier: 'hard',
  },
  {
    id: 'q_earn_xp_150',
    title: 'XP Harvester',
    description: 'Accumulate 150+ XP from gameplay and actions',
    type: 'EARN_XP',
    target: 150,
    xpReward: 90,
    icon: '💎',
    tier: 'hard',
  },
];

// -------------------------------------------------------------
// 3. LEVEL & RANK CURVE
// -------------------------------------------------------------
const LEVEL_TITLES = [
  'Novice Netrunner',    // Lvl 1
  'Byte Runner',        // Lvl 2
  'Grid Infiltrator',   // Lvl 3
  'Plasma Striker',     // Lvl 4
  'Arcade Prodigy',     // Lvl 5
  'Cyber Phantom',      // Lvl 6
  'Matrix Specialist',  // Lvl 7
  'Quantum Overclock',  // Lvl 8
  'Apex Netlord',       // Lvl 9
  'Cyberpunk Legend',   // Lvl 10
  'Nexus Architect',    // Lvl 11-14
  'Dimensional Hacker', // Lvl 15-19
  'Omni Master',        // Lvl 20-29
  'Cybernetic Deity',   // Lvl 30+
];

export function getLevelForXp(xp: number): number {
  if (xp <= 0) return 1;
  // Non-linear level formula: L = floor((XP / 100) ^ (1 / 1.5)) + 1
  const lvl = Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1;
  return Math.max(1, lvl);
}

export function getBaseXpForLevel(lvl: number): number {
  if (lvl <= 1) return 0;
  return Math.floor(100 * Math.pow(lvl - 1, 1.5));
}

export function getLevelInfo(xp: number): LevelInfo {
  const level = getLevelForXp(xp);
  const titleIndex = Math.min(level - 1, LEVEL_TITLES.length - 1);
  const title = LEVEL_TITLES[titleIndex];

  const currentLevelBaseXp = getBaseXpForLevel(level);
  const nextLevelXp = getBaseXpForLevel(level + 1);

  const xpIntoCurrentLevel = Math.max(0, xp - currentLevelBaseXp);
  const xpNeededForNextLevel = Math.max(1, nextLevelXp - currentLevelBaseXp);
  const progressPercent = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpNeededForNextLevel) * 100));

  return {
    level,
    title,
    currentLevelBaseXp,
    nextLevelXp,
    xpIntoCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
  };
}

// -------------------------------------------------------------
// 4. DETERMINISTIC DATE & QUEST HELPERS
// -------------------------------------------------------------
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDailyQuestsForDate(dateStr: string): DailyQuestDefinition[] {
  const seed = hashString(dateStr);
  const easyPool = QUEST_POOL.filter(q => q.tier === 'easy');
  const mediumPool = QUEST_POOL.filter(q => q.tier === 'medium');
  const hardPool = QUEST_POOL.filter(q => q.tier === 'hard');

  const easyQuest = easyPool[seed % easyPool.length];
  const mediumQuest = mediumPool[(seed >> 2) % mediumPool.length];
  const hardQuest = hardPool[(seed >> 4) % hardPool.length];

  return [easyQuest, mediumQuest, hardQuest];
}

// -------------------------------------------------------------
// 5. STORAGE & STATE MANAGEMENT
// -------------------------------------------------------------
const STORAGE_KEY = 'stressbuster_gamification_v1';

function getDefaultState(): GamificationState {
  const today = getTodayDateString();
  const dailyDefinitions = getDailyQuestsForDate(today);

  return {
    xp: 0,
    level: 1,
    streak: {
      current: 1,
      longest: 1,
      lastActiveDate: today,
      todayClaimed: false,
    },
    dailyQuests: {
      date: today,
      progress: dailyDefinitions.map(q => ({
        id: q.id,
        current: 0,
        completed: false,
        claimed: false,
      })),
      dailyMasterClaimed: false,
    },
    unlockedTrophies: {},
    stats: {
      totalGamesPlayed: 0,
      uniqueGamesPlayed: [],
      totalScoreAccumulated: 0,
      highestSingleScore: 0,
      gamesRated: 0,
      favoritesCount: 0,
      rouletteSpins: 0,
      questsCompletedCount: 0,
      hypeCount: 0,
      categoriesPlayed: [],
    },
  };
}

class GamificationService {
  private state: GamificationState;

  constructor() {
    this.state = this.loadState();
    this.reconcileDailyState();
  }

  private loadState(): GamificationState {
    if (typeof window === 'undefined') {
      return getDefaultState();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const defaults = getDefaultState();
        return {
          ...defaults,
          ...parsed,
          streak: { ...defaults.streak, ...(parsed.streak || {}) },
          dailyQuests: { ...defaults.dailyQuests, ...(parsed.dailyQuests || {}) },
          stats: { ...defaults.stats, ...(parsed.stats || {}) },
          unlockedTrophies: parsed.unlockedTrophies || {},
        };
      }
    } catch {}
    return getDefaultState();
  }

  private saveState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      window.dispatchEvent(
        new CustomEvent('stressbuster_gamification_sync', {
          detail: this.state,
        })
      );
    } catch {}
  }

  /**
   * Reconcile daily streak & daily quests against current calendar date
   */
  public reconcileDailyState(): { streakRollover: boolean; questsRollover: boolean } {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    let streakRollover = false;
    let questsRollover = false;

    // 1. Quests rollover
    if (this.state.dailyQuests.date !== today) {
      const newQuests = getDailyQuestsForDate(today);
      this.state.dailyQuests = {
        date: today,
        progress: newQuests.map(q => ({
          id: q.id,
          current: 0,
          completed: false,
          claimed: false,
        })),
        dailyMasterClaimed: false,
      };
      questsRollover = true;
    }

    // 2. Streak check
    if (this.state.streak.lastActiveDate !== today) {
      if (this.state.streak.lastActiveDate === yesterday) {
        // Continuous day: wait until player plays or claims
        this.state.streak.todayClaimed = false;
      } else {
        // Missed one or more days: reset current streak to 1
        this.state.streak.current = 1;
        this.state.streak.todayClaimed = false;
      }
      streakRollover = true;
    }

    if (streakRollover || questsRollover) {
      this.saveState();
    }

    return { streakRollover, questsRollover };
  }

  public getState(): GamificationState {
    this.reconcileDailyState();
    return this.state;
  }

  public getLevelInfo(): LevelInfo {
    return getLevelInfo(this.state.xp);
  }

  /**
   * Evaluates all locked trophies against current player stats
   */
  private checkTrophies(): Trophy[] {
    const unlockedNow: Trophy[] = [];
    const stats = this.state.stats;
    const currentLevel = getLevelForXp(this.state.xp);

    const conditions: Record<string, boolean> = {
      first_boot: stats.totalGamesPlayed >= 1,
      neon_initiate: currentLevel >= 2,
      the_critic: stats.gamesRated >= 1,
      curator: stats.favoritesCount >= 3,
      grid_explorer: stats.uniqueGamesPlayed.length >= 4,
      daily_devotee: this.state.streak.current >= 3,
      high_roller: stats.rouletteSpins >= 3,
      score_hunter: stats.highestSingleScore >= 500,
      mission_specialist: stats.questsCompletedCount >= 5,
      omnipresent: stats.uniqueGamesPlayed.length >= 7,
      flame_keeper: this.state.streak.current >= 7,
      score_titan: stats.highestSingleScore >= 1500,
      cyber_elite: currentLevel >= 5,
      genre_master: stats.categoriesPlayed.length >= 3,
      cyber_legend: currentLevel >= 10,
      apex_grandmaster: this.state.streak.current >= 14 && stats.questsCompletedCount >= 15,
    };

    TROPHIES.forEach(trophy => {
      if (!this.state.unlockedTrophies[trophy.id] && conditions[trophy.id]) {
        this.state.unlockedTrophies[trophy.id] = {
          unlockedAt: new Date().toISOString(),
        };
        unlockedNow.push(trophy);
      }
    });

    return unlockedNow;
  }

  /**
   * Grant XP, update levels, and check trophies
   */
  public grantXp(amount: number, reason: string): XpGrantResult {
    this.reconcileDailyState();

    const previousXp = this.state.xp;
    const previousLevel = getLevelForXp(previousXp);

    this.state.xp += amount;
    const newXp = this.state.xp;
    const newLevel = getLevelForXp(newXp);
    const didLevelUp = newLevel > previousLevel;
    this.state.level = newLevel;

    // Advance EARN_XP quests
    this.advanceQuestProgress('EARN_XP', amount);

    // Check newly unlocked trophies
    const newlyUnlockedTrophies = this.checkTrophies();

    // Add bonus XP for newly unlocked trophies
    newlyUnlockedTrophies.forEach(t => {
      this.state.xp += t.xpReward;
    });

    this.saveState();

    // Play sounds
    if (didLevelUp) {
      audio.playLevelUpSound();
    } else if (newlyUnlockedTrophies.length > 0) {
      audio.playTrophyUnlockSound();
    } else {
      audio.playXpGainSound();
    }

    return {
      previousXp,
      newXp: this.state.xp,
      xpGained: amount,
      previousLevel,
      newLevel: getLevelForXp(this.state.xp),
      didLevelUp,
      newlyUnlockedTrophies,
      reason,
    };
  }

  /**
   * Advances matching daily quests
   */
  private advanceQuestProgress(type: QuestType, amount = 1, metadata?: { gameId?: string; category?: string }) {
    const todayDefs = getDailyQuestsForDate(this.state.dailyQuests.date);

    this.state.dailyQuests.progress.forEach(p => {
      const def = todayDefs.find(d => d.id === p.id);
      if (!def || p.completed || def.type !== type) return;

      // Filter checks
      if (def.gameId && metadata?.gameId && def.gameId !== metadata.gameId) return;
      if (def.category && metadata?.category && def.category.toLowerCase() !== metadata.category.toLowerCase()) return;

      if (type === 'SUBMIT_SCORE') {
        // Score threshold
        if (amount >= def.target) {
          p.current = def.target;
          p.completed = true;
        }
      } else {
        p.current = Math.min(def.target, p.current + amount);
        if (p.current >= def.target) {
          p.completed = true;
        }
      }
    });
  }

  // -------------------------------------------------------------
  // 6. ACTION EVENT HOOKS
  // -------------------------------------------------------------

  /**
   * Called when a player launches a game
   */
  public recordGamePlayed(gameId: string, category?: string): XpGrantResult {
    this.reconcileDailyState();
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    // 1. Check streak increment
    if (this.state.streak.lastActiveDate !== today) {
      if (this.state.streak.lastActiveDate === yesterday) {
        this.state.streak.current += 1;
        if (this.state.streak.current > this.state.streak.longest) {
          this.state.streak.longest = this.state.streak.current;
        }
      } else {
        this.state.streak.current = 1;
      }
      this.state.streak.lastActiveDate = today;
      this.state.streak.todayClaimed = true;
      audio.playStreakFlameSound();
    }

    // 2. Update Stats
    this.state.stats.totalGamesPlayed += 1;
    if (!this.state.stats.uniqueGamesPlayed.includes(gameId)) {
      this.state.stats.uniqueGamesPlayed.push(gameId);
    }
    if (category && !this.state.stats.categoriesPlayed.includes(category)) {
      this.state.stats.categoriesPlayed.push(category);
    }

    // 3. Advance Quests
    this.advanceQuestProgress('PLAY_GAMES_COUNT', 1);
    this.advanceQuestProgress('PLAY_SPECIFIC_GAME', 1, { gameId });
    if (category) {
      this.advanceQuestProgress('PLAY_CATEGORY', 1, { category });
    }

    // Base play session XP
    return this.grantXp(20, `Played ${gameId}`);
  }

  /**
   * Called when a player finishes a game and submits a score
   */
  public recordScoreSubmitted(gameId: string, score: number, category?: string): XpGrantResult {
    this.reconcileDailyState();

    this.state.stats.totalScoreAccumulated += score;
    if (score > this.state.stats.highestSingleScore) {
      this.state.stats.highestSingleScore = score;
    }

    // Advance score quests
    this.advanceQuestProgress('SUBMIT_SCORE', score, { gameId, category });

    // Dynamic performance XP (base 15 + score bracket bonuses)
    let performanceXp = 15;
    if (score >= 1000) performanceXp += 50;
    else if (score >= 500) performanceXp += 30;
    else if (score >= 200) performanceXp += 15;

    return this.grantXp(performanceXp, `Score ${score} in ${gameId}`);
  }

  /**
   * Called when player rates a game
   */
  public recordGameRated(gameId: string, rating: number): XpGrantResult {
    this.reconcileDailyState();
    this.state.stats.gamesRated += 1;
    this.advanceQuestProgress('RATE_GAME', 1, { gameId });
    return this.grantXp(30, `Rated game ${gameId}`);
  }

  public recordGameRating(gameId: string, rating: number): XpGrantResult {
    return this.recordGameRated(gameId, rating);
  }

  public recordGamePlay(gameId: string, categoryOrScore?: string | number): XpGrantResult {
    if (typeof categoryOrScore === 'number') {
      return this.recordScoreSubmitted(gameId, categoryOrScore);
    }
    return this.recordGamePlayed(gameId, categoryOrScore);
  }

  public getUnclaimedQuestsCount(): number {
    this.reconcileDailyState();
    const unclaimedIndividual = this.state.dailyQuests.progress.filter(p => p.completed && !p.claimed).length;
    const allClaimed = this.state.dailyQuests.progress.every(p => p.claimed);
    const bonusUnclaimed = (allClaimed && !this.state.dailyQuests.dailyMasterClaimed) ? 1 : 0;
    return unclaimedIndividual + bonusUnclaimed;
  }

  /**
   * Called when player toggles a favorite game
   */
  public recordFavoritesCount(count: number): Trophy[] {
    this.reconcileDailyState();
    this.state.stats.favoritesCount = count;
    const newTrophies = this.checkTrophies();
    if (newTrophies.length > 0) {
      newTrophies.forEach(t => {
        this.state.xp += t.xpReward;
      });
      this.saveState();
      audio.playTrophyUnlockSound();
    }
    return newTrophies;
  }

  /**
   * Called when player uses the Random Game Roulette
   */
  public recordRouletteSpin(): XpGrantResult {
    this.reconcileDailyState();
    this.state.stats.rouletteSpins += 1;
    this.advanceQuestProgress('SPIN_ROULETTE', 1);
    return this.grantXp(25, 'Spun Game Roulette');
  }

  /**
   * Claim a completed daily quest
   */
  public claimQuest(questId: string): XpGrantResult | null {
    this.reconcileDailyState();
    const progress = this.state.dailyQuests.progress.find(p => p.id === questId);
    if (!progress || !progress.completed || progress.claimed) {
      return null;
    }

    const todayDefs = getDailyQuestsForDate(this.state.dailyQuests.date);
    const def = todayDefs.find(d => d.id === questId);
    if (!def) return null;

    progress.claimed = true;
    this.state.stats.questsCompletedCount += 1;

    audio.playQuestCompleteSound();
    return this.grantXp(def.xpReward, `Completed Quest: ${def.title}`);
  }

  /**
   * Claim all 3 quests completed Daily Master Bonus (+100 XP)
   */
  public claimDailyMasterBonus(): XpGrantResult | null {
    this.reconcileDailyState();
    const allClaimed = this.state.dailyQuests.progress.every(p => p.claimed);
    if (!allClaimed || this.state.dailyQuests.dailyMasterClaimed) {
      return null;
    }

    this.state.dailyQuests.dailyMasterClaimed = true;
    audio.playQuestCompleteSound();
    return this.grantXp(100, 'Daily Master 3/3 Bonus');
  }
}

export const gamification = new GamificationService();
export default gamification;
