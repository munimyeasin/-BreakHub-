export interface User {
  id: string;
  username: string;
  avatar_url: string;
  created_at: string;
  days_played?: number;
  longest_streak?: number;
  total_score?: number;
  games_played?: number;
  level?: number;
  xp?: number;
  unlocked_trophies?: Record<string, { unlockedAt: string }>;
  stats?: any;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  category: 'ACTION' | 'PUZZLE' | 'ARCADE' | 'STRATEGY' | 'CARD';
  thumbnail_url: string;
  description: string;
  hype_count?: number;
  status?: 'active' | 'coming_soon' | 'hidden';
  featured?: boolean;
}

export interface Score {
  id: string;
  game_id: string;
  user_id: string;
  score: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string;
  score: number;
  games_played?: number;
  achieved_at?: string;
}

export interface GameRequest {
  id: string;
  title: string;
  genre: 'ACTION' | 'PUZZLE' | 'ARCADE' | 'STRATEGY' | 'CARD' | 'OTHER';
  description: string;
  requested_by: string;
  user_id?: string;
  upvotes: number;
  upvoted_by: string[];
  status: 'under_review' | 'planned' | 'in_development' | 'completed' | 'declined';
  created_at: string;
}

