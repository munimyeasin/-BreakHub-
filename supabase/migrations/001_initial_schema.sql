-- Break Hub Database Schema for Supabase

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  image_url TEXT,
  game_url TEXT,
  rating DECIMAL(2,1) DEFAULT 4.5,
  rating_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  hype_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- Game requests table
CREATE TABLE IF NOT EXISTS game_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  genre TEXT,
  description TEXT,
  requested_by TEXT,
  upvotes INTEGER DEFAULT 0,
  upvoted_by JSONB DEFAULT '[]',
  status TEXT DEFAULT 'under_review',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_requests ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Public games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Public scores are viewable by everyone" ON scores FOR SELECT USING (true);
CREATE POLICY "Public ratings are viewable by everyone" ON ratings FOR SELECT USING (true);
CREATE POLICY "Public game requests are viewable by everyone" ON game_requests FOR SELECT USING (true);

-- Insert policies (for authenticated users)
CREATE POLICY "Users can insert their own data" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Games can be inserted" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Scores can be inserted" ON scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Ratings can be inserted" ON ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Game requests can be inserted" ON game_requests FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (true);
CREATE POLICY "Games can be updated" ON games FOR UPDATE USING (true);
CREATE POLICY "Scores can be updated" ON scores FOR UPDATE USING (true);
CREATE POLICY "Ratings can be updated" ON ratings FOR UPDATE USING (true);
CREATE POLICY "Game requests can be updated" ON game_requests FOR UPDATE USING (true);

-- Delete policies
CREATE POLICY "Users can delete their own data" ON users FOR DELETE USING (true);
CREATE POLICY "Games can be deleted" ON games FOR DELETE USING (true);
CREATE POLICY "Scores can be deleted" ON scores FOR DELETE USING (true);
CREATE POLICY "Ratings can be deleted" ON ratings FOR DELETE USING (true);
CREATE POLICY "Game requests can be deleted" ON game_requests FOR DELETE USING (true);