# Nexus Arcade — Mobile-First HTML5 Mini-Game Portal & Leaderboards

A modern, high-performance mobile-first HTML5 mini-game portal web application featuring a cyberpunk dark-themed UI, responsive multi-column layouts, integrated playable mini-games, and a live competitive global and per-game leaderboard system.

---

## 🚀 Features

- **Dark Mode Cyber Gaming UI**: Deep violet/slate palette (`#0B0819` / `#130F26`), electric cyan (`#00F0FF`), neon purple (`#9D00FF`), and glowing gold podium accents (`#FFD700`).
- **Responsive Layout**: 3 columns on mobile screens scaling up to 6 columns on tablet/desktop displays.
- **Top Sticky Search & Filtering**: Real-time search query filtering, Category chips (`ALL`, `ARCADE`, `ACTION`, `PUZZLE`, `STRATEGY`, `CARD`), and "Favorites" persistence via LocalStorage.
- **4 Fully Playable HTML5 Mini-Games**:
  1. **Neon Snake 2077**: 60FPS 2D Canvas engine with touch swipe gestures, virtual D-pad, combo multipliers, particle explosions, and synthesized Web Audio SFX.
  2. **Memory Matrix**: Neural card-matching puzzle with timer bonuses and streak scoring.
  3. **Quantum XO**: Tactical 3x3 battle against an adaptive cyber AI engine.
  4. **Hyper Tapper**: Ultra high-APM reflex countdown frenzy.
- **Leaderboard System**:
  - **Global Leaderboard**: Cumulative best runs across all games.
  - **Per-Game Leaderboard**: Top 10 rankings per selected title.
  - **Podium Display**: Gold badge + crown for Rank 1, Silver for Rank 2, Bronze for Rank 3, and structured ranking rows for 4–10.
  - **Score Submission API**: `POST /api/scores` with input sanitization, personal best tracking, and automatic user profile generation.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14+ / 16 (App Router)](https://nextjs.org/)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS + Custom Cyberpunk Glows & Animations
- **Icons**: Lucide React
- **FX**: Canvas Confetti & Web Audio Synthesizer
- **Database**: Relational SQL Schema (`lib/schema.sql`) with High-Performance Atomic Persistence (`lib/db.ts`)

---

## ⚡ Quick Start

### 1. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your mobile browser or desktop.

### 2. Production Build
```bash
npm run build
npm run start
```

---

## 📡 API Endpoints

### `GET /api/games`
Returns the list of all available games and metadata.

### `GET /api/leaderboard?gameId={gameId | global}`
Returns ranked high scores for a specific game or cumulative championship ranks across all games.

### `POST /api/scores`
Submits a player score.
**Payload:**
```json
{
  "gameId": "g_snake_01",
  "username": "CyberNinja",
  "score": 3200
}
```
