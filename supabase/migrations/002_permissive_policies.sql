-- Enable RLS and create permissive public policies for Break Hub / Supabase tables

-- Users
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Allow all access on users" ON users;

CREATE POLICY "Allow all access on users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Games
ALTER TABLE IF EXISTS games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public games are viewable by everyone" ON games;
DROP POLICY IF EXISTS "Games can be inserted" ON games;
DROP POLICY IF EXISTS "Games can be updated" ON games;
DROP POLICY IF EXISTS "Allow all access on games" ON games;

CREATE POLICY "Allow all access on games" ON games FOR ALL USING (true) WITH CHECK (true);

-- Scores
ALTER TABLE IF EXISTS scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public scores are viewable by everyone" ON scores;
DROP POLICY IF EXISTS "Scores can be inserted" ON scores;
DROP POLICY IF EXISTS "Scores can be updated" ON scores;
DROP POLICY IF EXISTS "Allow all access on scores" ON scores;

CREATE POLICY "Allow all access on scores" ON scores FOR ALL USING (true) WITH CHECK (true);

-- Ratings
ALTER TABLE IF EXISTS ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public ratings are viewable by everyone" ON ratings;
DROP POLICY IF EXISTS "Ratings can be inserted" ON ratings;
DROP POLICY IF EXISTS "Ratings can be updated" ON ratings;
DROP POLICY IF EXISTS "Allow all access on ratings" ON ratings;

CREATE POLICY "Allow all access on ratings" ON ratings FOR ALL USING (true) WITH CHECK (true);

-- Game Requests
ALTER TABLE IF EXISTS game_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public game requests are viewable by everyone" ON game_requests;
DROP POLICY IF EXISTS "Game requests can be inserted" ON game_requests;
DROP POLICY IF EXISTS "Game requests can be updated" ON game_requests;
DROP POLICY IF EXISTS "Allow all access on game_requests" ON game_requests;

CREATE POLICY "Allow all access on game_requests" ON game_requests FOR ALL USING (true) WITH CHECK (true);
