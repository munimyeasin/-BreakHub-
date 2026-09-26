import fs from 'fs';
import path from 'path';
import { User, Game, Score, LeaderboardEntry, Rating, GameRequest } from './types';
import { INITIAL_GAMES } from './gamesData';
import { censorText } from './censor';

export { INITIAL_GAMES };

interface DatabaseSchema {
  users: User[];
  games: Game[];
  scores: Score[];
  ratings?: Rating[];
  game_requests?: GameRequest[];
}

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'portal_db.json');
const SEED_FILE = path.resolve(process.cwd(), 'data', 'portal_db.json');

// Clean empty initial state with zero fake data
const INITIAL_USERS: User[] = [];
const INITIAL_SCORES: Score[] = [];
const INITIAL_RATINGS: Rating[] = [];
const INITIAL_REQUESTS: GameRequest[] = [
  {
    id: 'req_cyber_chess',
    title: 'Neon Cyber Chess 3D',
    genre: 'STRATEGY',
    description: 'Holographic cyber chess with neon piece skins, timed blitz clocks, and adaptive heuristic chess engine AI.',
    requested_by: 'GrandmasterNeon',
    upvotes: 42,
    upvoted_by: [],
    status: 'in_development',
    created_at: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'req_rhythm_blade',
    title: 'Synthwave Rhythm Matrix',
    genre: 'ACTION',
    description: 'Cyberpunk rhythm game matching synthwave BPM beat drops with dynamic laser trail combos.',
    requested_by: 'AudioViper',
    upvotes: 35,
    upvoted_by: [],
    status: 'planned',
    created_at: '2026-09-21T14:30:00.000Z'
  },
  {
    id: 'req_cyber_tower',
    title: 'Neon Tower Defense: Core Breach',
    genre: 'STRATEGY',
    description: 'Grid-based tactical defense with EMP turrets, plasma railguns, and waves of rogue virus crawler swarms.',
    requested_by: 'SectorDefender',
    upvotes: 28,
    upvoted_by: [],
    status: 'under_review',
    created_at: '2026-09-22T08:15:00.000Z'
  }
];

class DatabaseService {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private ensureDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {}
  }

  private loadDatabase(): DatabaseSchema {
    this.ensureDirectory();

    // Check if db file exists in active location or can be seeded from project repo
    let content: string | null = null;
    try {
      if (fs.existsSync(DB_FILE)) {
        content = fs.readFileSync(DB_FILE, 'utf-8');
      } else if (fs.existsSync(SEED_FILE)) {
        content = fs.readFileSync(SEED_FILE, 'utf-8');
      }
    } catch {}

    if (content) {
      try {
        const parsed: DatabaseSchema = JSON.parse(content);
        let updated = false;
        if (!Array.isArray(parsed.ratings)) {
          parsed.ratings = [];
        }
        if (!Array.isArray(parsed.game_requests)) {
          parsed.game_requests = INITIAL_REQUESTS;
          updated = true;
        }
        INITIAL_GAMES.forEach(ig => {
          const existing = parsed.games.find((g: any) => g.id === ig.id || g.slug === ig.slug);
          if (!existing) {
            parsed.games.push(ig);
            updated = true;
          } else {
            if (ig.status !== undefined && existing.status !== ig.status) {
              existing.status = ig.status;
              updated = true;
            }
            if (ig.hype_count !== undefined && existing.hype_count === undefined) {
              existing.hype_count = ig.hype_count;
              updated = true;
            }
            if (ig.rating_count !== undefined && existing.rating_count === undefined) {
              existing.rating_count = ig.rating_count;
              updated = true;
            }
            if (ig.rating !== undefined && existing.rating === undefined) {
              existing.rating = ig.rating;
              updated = true;
            }
          }
        });
        if (updated) {
          this.saveDatabase(parsed);
        }
        return parsed;
      } catch {}
    }

    const initial: DatabaseSchema = {
      users: INITIAL_USERS,
      games: INITIAL_GAMES,
      scores: INITIAL_SCORES,
      ratings: INITIAL_RATINGS,
      game_requests: INITIAL_REQUESTS,
    };
    this.saveDatabase(initial);
    return initial;
  }

  public resetAllData() {
    const fresh: DatabaseSchema = {
      users: [],
      games: INITIAL_GAMES.map(g => ({ ...g, play_count: 0 })),
      scores: [],
      ratings: [],
      game_requests: INITIAL_REQUESTS,
    };
    this.data = fresh;
    this.saveDatabase(fresh);
    return fresh;
  }

  private saveDatabase(dataToSave?: DatabaseSchema) {
    this.ensureDirectory();
    const payload = dataToSave || this.data;
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch {
      // In-memory fallback if disk writes are restricted
      this.data = payload;
    }
  }

  // Games
  public getGames(): Game[] {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.games)) {
          let updated = false;
          INITIAL_GAMES.forEach(ig => {
            const existing = parsed.games.find((g: any) => g.id === ig.id || g.slug === ig.slug);
            if (!existing) {
              parsed.games.push(ig);
              updated = true;
            } else {
              if (ig.status !== undefined && existing.status !== ig.status) {
                existing.status = ig.status;
                updated = true;
              }
              if (ig.rating_count !== undefined && existing.rating_count === undefined) {
                existing.rating_count = ig.rating_count;
                updated = true;
              }
            }
          });
          if (updated) {
            this.saveDatabase(parsed);
          }
          this.data.games = parsed.games;
          if (Array.isArray(parsed.ratings)) {
            this.data.ratings = parsed.ratings;
          }
          return parsed.games;
        }
      }
    } catch {}
    return this.data.games;
  }

  public getGameById(id: string): Game | undefined {
    const all = this.getGames();
    return all.find(g => g.id === id || g.slug === id);
  }

  public incrementPlayCount(gameId: string): number {
    this.getGames();
    const game = this.data.games.find(g => g.id === gameId || g.slug === gameId);
    if (game) {
      game.play_count = (game.play_count || 0) + 1;
      this.saveDatabase();
      return game.play_count;
    }
    return 0;
  }

  public toggleHypeCount(gameId: string, increment = true): number {
    this.getGames();
    const game = this.data.games.find(g => g.id === gameId || g.slug === gameId);
    if (game) {
      const current = game.hype_count || 0;
      game.hype_count = increment ? current + 1 : Math.max(0, current - 1);
      this.saveDatabase();
      return game.hype_count;
    }
    return 0;
  }

  // Rate a Game
  public rateGame(gameId: string, username: string, ratingValue: number): { rating: number; rating_count: number; userRating: number; isUpdate: boolean } {
    this.getGames();
    const game = this.data.games.find(g => g.id === gameId || g.slug === gameId);
    if (!game) {
      throw new Error(`Game '${gameId}' not found`);
    }

    const cleanRating = Math.min(5, Math.max(1, Math.round(ratingValue)));
    const user = this.findOrCreateUser(username);

    if (!Array.isArray(this.data.ratings)) {
      this.data.ratings = [];
    }

    const existingIndex = this.data.ratings.findIndex(
      r => (r.game_id === game.id || r.game_id === game.slug) && r.user_id === user.id
    );

    const isUpdate = existingIndex >= 0;

    if (isUpdate) {
      this.data.ratings[existingIndex].rating = cleanRating;
      this.data.ratings[existingIndex].updated_at = new Date().toISOString();
    } else {
      const newRating: Rating = {
        id: `rt_${Math.random().toString(36).substring(2, 11)}`,
        game_id: game.id,
        user_id: user.id,
        rating: cleanRating,
        created_at: new Date().toISOString()
      };
      this.data.ratings.push(newRating);
    }

    // Recalculate dynamic average rating & count
    const initialConfig = INITIAL_GAMES.find(ig => ig.id === game.id || ig.slug === game.slug);
    const baseRating = initialConfig?.rating || 4.9;
    const baseCount = initialConfig?.rating_count || 20;

    const gameUserRatings = this.data.ratings.filter(r => r.game_id === game.id || r.game_id === game.slug);
    const userRatingSum = gameUserRatings.reduce((sum, r) => sum + r.rating, 0);

    const totalSum = (baseRating * baseCount) + userRatingSum;
    const totalCount = baseCount + gameUserRatings.length;
    const computedAverage = Number((totalSum / totalCount).toFixed(1));

    game.rating = Math.min(5.0, Math.max(1.0, computedAverage));
    game.rating_count = totalCount;

    this.saveDatabase();

    return {
      rating: game.rating,
      rating_count: game.rating_count,
      userRating: cleanRating,
      isUpdate
    };
  }

  public getUserRating(gameId: string, username: string): number | null {
    if (!username || !Array.isArray(this.data.ratings)) return null;
    const user = this.data.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) return null;

    const game = this.getGameById(gameId);
    if (!game) return null;

    const found = this.data.ratings.find(
      r => (r.game_id === game.id || r.game_id === game.slug) && r.user_id === user.id
    );
    return found ? found.rating : null;
  }

  // Users
  public findOrCreateUser(username: string): User {
    const cleanName = username.trim();
    let user = this.data.users.find(u => u.username.toLowerCase() === cleanName.toLowerCase());

    if (!user) {
      user = {
        id: `usr_${Math.random().toString(36).substring(2, 9)}`,
        username: cleanName,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
        created_at: new Date().toISOString()
      };
      this.data.users.push(user);
      this.saveDatabase();
    }
    return user;
  }

  // Rename User & Migrate Existing Leaderboard Records
  public updateUsername(oldUsername: string, newUsername: string): { success: boolean; user?: User } {
    const cleanOld = (oldUsername || '').trim().toLowerCase();
    const cleanNew = (newUsername || '').trim();
    if (!cleanNew) return { success: false };

    // Find user by old username if provided
    const existingUser = cleanOld ? this.data.users.find(u => u.username.toLowerCase() === cleanOld) : null;
    const targetUser = this.data.users.find(u => u.username.toLowerCase() === cleanNew.toLowerCase());

    if (existingUser && targetUser && existingUser.id !== targetUser.id) {
      // Merge scores
      this.data.scores.forEach(s => {
        if (s.user_id === existingUser.id) {
          s.user_id = targetUser.id;
        }
      });
      // Merge ratings
      if (Array.isArray(this.data.ratings)) {
        this.data.ratings.forEach(r => {
          if (r.user_id === existingUser.id) {
            r.user_id = targetUser.id;
          }
        });
      }
      this.data.users = this.data.users.filter(u => u.id !== existingUser.id);
      this.saveDatabase();
      return { success: true, user: targetUser };
    }

    if (existingUser) {
      existingUser.username = cleanNew;
      existingUser.avatar_url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanNew)}`;
      this.saveDatabase();
      return { success: true, user: existingUser };
    } else {
      const user = this.findOrCreateUser(cleanNew);
      return { success: true, user };
    }
  }

  // Submit Score
  public submitScore(gameId: string, username: string, scoreValue: number) {
    const user = this.findOrCreateUser(username);
    const game = this.getGameById(gameId);
    if (!game) {
      throw new Error(`Game with id '${gameId}' does not exist.`);
    }

    const newScore: Score = {
      id: `sc_${Math.random().toString(36).substring(2, 11)}`,
      game_id: game.id,
      user_id: user.id,
      score: scoreValue,
      created_at: new Date().toISOString()
    };

    this.data.scores.push(newScore);
    game.play_count += 1;
    this.saveDatabase();

    // Calculate personal best
    const userScores = this.data.scores.filter(s => s.game_id === game.id && s.user_id === user.id);
    const personalBest = Math.max(...userScores.map(s => s.score));

    return {
      user,
      score: scoreValue,
      personalBest,
      isNewRecord: scoreValue >= personalBest
    };
  }

  // Leaderboard: Per-Game
  public getPerGameLeaderboard(gameId: string, limit = 10): LeaderboardEntry[] {
    const game = this.getGameById(gameId);
    const targetId = game ? game.id : gameId;
    const targetSlug = game ? game.slug : gameId;
    const gameScores = this.data.scores.filter(
      s => s.game_id === targetId || s.game_id === targetSlug
    );

    // Group highest score per user
    const userBestMap = new Map<string, { score: number; achieved_at: string }>();
    gameScores.forEach(s => {
      const current = userBestMap.get(s.user_id);
      if (!current || s.score > current.score) {
        userBestMap.set(s.user_id, { score: s.score, achieved_at: s.created_at });
      }
    });

    const entries: LeaderboardEntry[] = [];
    userBestMap.forEach((val, userId) => {
      const user = this.data.users.find(u => u.id === userId);
      if (user) {
        entries.push({
          rank: 0,
          user_id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          score: val.score,
          achieved_at: val.achieved_at
        });
      }
    });

    entries.sort((a, b) => b.score - a.score);
    return entries.slice(0, limit).map((e, idx) => ({ ...e, rank: idx + 1 }));
  }

  // Leaderboard: Global (Cumulative high-score across distinct games)
  public getGlobalLeaderboard(limit = 50): LeaderboardEntry[] {
    // Map of userId -> Map of gameId -> bestScore
    const userGameScores = new Map<string, Map<string, number>>();

    this.data.scores.forEach(s => {
      if (!userGameScores.has(s.user_id)) {
        userGameScores.set(s.user_id, new Map());
      }
      const gMap = userGameScores.get(s.user_id)!;
      const game = this.getGameById(s.game_id);
      const canonicalId = game ? game.id : s.game_id;
      const current = gMap.get(canonicalId) || 0;
      if (s.score > current) {
        gMap.set(canonicalId, s.score);
      }
    });

    const entries: LeaderboardEntry[] = [];
    userGameScores.forEach((gMap, userId) => {
      const user = this.data.users.find(u => u.id === userId);
      if (user) {
        let totalScore = 0;
        gMap.forEach(sc => { totalScore += sc; });

        entries.push({
          rank: 0,
          user_id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          score: totalScore,
          games_played: gMap.size,
        });
      }
    });

    entries.sort((a, b) => b.score - a.score);
    return entries.slice(0, limit).map((e, idx) => ({ ...e, rank: idx + 1 }));
  }

  // Game Requests & Community Wishlist
  public getGameRequests(): GameRequest[] {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.game_requests)) {
          this.data.game_requests = parsed.game_requests;
          return parsed.game_requests;
        }
      }
    } catch {}
    if (!Array.isArray(this.data.game_requests)) {
      this.data.game_requests = INITIAL_REQUESTS;
      this.saveDatabase();
    }
    return this.data.game_requests;
  }

  public addGameRequest(
    title: string,
    genre: 'ACTION' | 'PUZZLE' | 'ARCADE' | 'STRATEGY' | 'CARD' | 'OTHER',
    description: string,
    username: string
  ): GameRequest {
    const all = this.getGameRequests();
    const cleanTitle = censorText(title.trim());
    const cleanDesc = censorText(description.trim());
    const cleanUser = censorText(username.trim()) || 'Anonymous Player';

    const user = this.findOrCreateUser(cleanUser);

    const newRequest: GameRequest = {
      id: `req_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`,
      title: cleanTitle,
      genre: genre || 'ARCADE',
      description: cleanDesc,
      requested_by: user.username,
      user_id: user.id,
      upvotes: 1,
      upvoted_by: [user.username.toLowerCase()],
      status: 'under_review',
      created_at: new Date().toISOString()
    };

    all.unshift(newRequest);
    this.data.game_requests = all;
    this.saveDatabase();
    return newRequest;
  }

  public upvoteGameRequest(requestId: string, username: string): { upvotes: number; isUpvoted: boolean; request?: GameRequest } {
    const all = this.getGameRequests();
    const req = all.find(r => r.id === requestId);
    if (!req) {
      throw new Error(`Game request '${requestId}' not found`);
    }

    const cleanUser = (username || 'Anonymous').trim().toLowerCase();
    if (!Array.isArray(req.upvoted_by)) {
      req.upvoted_by = [];
    }

    const hasUpvoted = req.upvoted_by.includes(cleanUser);
    if (hasUpvoted) {
      // Toggle off upvote
      req.upvoted_by = req.upvoted_by.filter(u => u !== cleanUser);
      req.upvotes = Math.max(0, req.upvotes - 1);
    } else {
      // Add upvote
      req.upvoted_by.push(cleanUser);
      req.upvotes = (req.upvotes || 0) + 1;
    }

    this.saveDatabase();
    return {
      upvotes: req.upvotes,
      isUpvoted: !hasUpvoted,
      request: req
    };
  }
}

export const db = new DatabaseService();
export default db;
