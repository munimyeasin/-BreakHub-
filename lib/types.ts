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
  wallet_balance: number;
  status: 'active' | 'blocked';
}

export interface Tournament {
  id: string;
  name: string;
  entry_fee: number;
  prize_pool: number;
  start_date: string;
  status: 'upcoming' | 'ongoing' | 'finished';
}

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  transaction_id?: string;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  upi_id?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'wager' | 'win';
  amount: number;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_id?: string;
  created_at: string;
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

