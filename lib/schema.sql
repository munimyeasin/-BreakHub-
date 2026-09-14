-- =========================================================
-- DATABASE SCHEMA: STRESSBUSTER MINI-GAME PORTAL
-- =========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(32) NOT NULL UNIQUE,
    avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=gamer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Games Table
CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('ACTION', 'PUZZLE', 'ARCADE', 'STRATEGY', 'CARD')),
    thumbnail_url TEXT NOT NULL,
    description TEXT,
    play_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Scores Table
CREATE TABLE IF NOT EXISTS scores (
    id VARCHAR(64) PRIMARY KEY,
    game_id VARCHAR(64) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast rank & leaderboard aggregations
CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);

-- Seed Data for Games Catalog
INSERT INTO games (id, slug, title, category, thumbnail_url, description, play_count) VALUES
('g_snake_01', 'neon-snake', 'Neon Snake 2077', 'ARCADE', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80', 'Classic 2D snake with speed combos and neon arcade glow effects.', 24500),
('g_flip_02', 'memory-matrix', 'Arcade Memory Matrix', 'PUZZLE', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', 'High-speed neural memory card match grid testing recall and reflex accuracy.', 18200),
('g_ttt_03', 'quantum-xo', 'Quantum Tic-Tac-Toe', 'STRATEGY', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80', 'Futuristic 3x3 tactical battle against an adaptive arcade AI bot.', 14100),
('g_tap_04', 'hyper-tapper', 'Hyper Tapper Rush', 'ACTION', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80', 'High-frequency reflex clicker challenge testing maximum APM speed.', 31000),
('g_card_05', 'solitaire-zero', 'Solitaire Zero', 'CARD', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80', 'Minimalist speed-deck builder and retro card sequence sorter.', 9800),
('g_action_06', 'pixel-dash', 'Retro Dash Runner', 'ACTION', 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80', 'Obstacle-dodging endless runner with hyper synth wave rhythms.', 42100)
ON CONFLICT(id) DO NOTHING;
