# 🏗️ Break Hub — System Architecture & Technical Specification

> **Document Version**: 1.0.0  
> **Platform**: Next.js 16 (App Router) + React 18 + TypeScript + Tailwind CSS  
> **Architecture Style**: Modular Monolith with Serverless Micro-Routes & Zero-Asset Client Canvas Engines  

---

## 1. High-Level Architecture Overview

```
                      +-------------------------------------------------------+
                      |                   CLIENT BROWSER                      |
                      |  (Mobile Touch / Desktop / PWA Standalone Mode)      |
                      +---------------------------+---------------------------+
                                                  |
                     +----------------------------+----------------------------+
                     |                                                         |
         [UI / DOM LAYER]                                            [CANVAS / AUDIO ENGINES]
  - React 18 App Router Pages                                  - 18+ Canvas 2D Game Engines
  - Neo-Brutalist Tailwind System                              - 60-144 FPS Delta Game Loops
  - Interactive Modals & Drawers                               - Procedural Web Audio Synthesizer
  - Gamification HUD & Ticker                                  - Virtual Joystick / Touch D-Pad
                     |                                                         |
                     +----------------------------+----------------------------+
                                                  |
                               [CLIENT STATE & SYNC BUS]
               - localStorage: Gamer Tag, Theme, XP, Trophies, Streaks
               - sessionStorage: Route Snapshot, Active View Filter
               - Custom DOM Events: 'stressbuster_gamification_sync'
               - URL SearchParams: ?tab=&genre=&game=&modal=
                                                  |
                                                  v (HTTPS / REST API)
                      +-------------------------------------------------------+
                      |              NEXT.JS 16 API LAYER (Node.js)           |
                      |  - /api/games        - /api/games/play                |
                      |  - /api/games/rate   - /api/games/hype                |
                      |  - /api/scores       - /api/leaderboard               |
                      |  - /api/user         - Security / Rate Limiting       |
                      +---------------------------+---------------------------+
                                                  |
                                                  v (Safe Atomic File I/O)
                      +-------------------------------------------------------+
                      |               LOCAL DATABASE PERSISTENCE              |
                      |         JSON Data Store (data/portal_db.json)         |
                      |  [Users]  [Scores]  [Ratings]  [Plays]  [Hype Votes]  |
                      +-------------------------------------------------------+
```

---

## 2. End-to-End Application Flow

### 2.1. Initial Page Load & State Hydration
1. **HTML/Theme Initialization**: Root layout (`app/layout.tsx`) executes an inline script reading `localStorage.getItem('stressbuster_ui_theme')` and applies `data-theme="neo-dark"` or `data-theme="neo-light"` to `<html>` prior to first paint, eliminating flash of unstyled content (FOUC).
2. **URL Parameter & Session Restoration**: `app/page.tsx` evaluates `window.location.search` (`?tab=`, `?genre=`, `?q=`, `?game=`, `?modal=`) alongside `sessionStorage.getItem('stressbuster_active_route')`. If a player reloads mid-game or inside a modal, the exact state is restored immediately.
3. **Gamification & Streak Check**: `GamificationService` calculates calendar day rollover against `lastActiveDate`. If a new day has arrived, it increments the daily streak and unlocks daily quests.

### 2.2. Game Launch & Player Naming Interceptor Flow
```
[User clicks 'PLAY NOW' on Game Card or Spotlight Banner]
                        |
                        v
        Is 'stressbuster_player_tag' present?
             /                     \
           [NO]                   [YES]
            |                       |
            v                       v
 Open `UsernamePromptModal`     Direct Launch:
 - Buffer `pendingGameToPlay`   - Increment play counter (/api/games/play)
 - User inputs Gamer Tag        - Open `GameModal` (9:16 portrait viewport)
 - Post to `/api/user`          - Mount active game Canvas component
 - Save to `localStorage`       - Start game loop & procedural audio
 - Auto-launch buffered game
```

### 2.3. Active Gameplay & Score Submission Lifecycle
1. **Game Loop Execution**: Game engine runs on `requestAnimationFrame` with delta-time calculation (`dt = Math.min((now - lastTime) / 1000, 0.1)`), ensuring smooth, physics-consistent 60–144 FPS across all screen refresh rates.
2. **Touch & Gamepad Multiplexing**: Input layer listens simultaneously for keyboard (`keydown`/`keyup`), native canvas touch pointers, and `MobileGamepad.tsx` / `VirtualJoystick.tsx` virtual input bridges.
3. **Game Over & Anti-Cheat Validation**:
   - Canvas dispatches game-over score payload.
   - Client sends `POST /api/scores` with `{ game_id, user_id, score, honeypot }`.
   - Server validates honeypot is empty and score is within plausible game limits (`SCORE_LIMITS[game_id]`).
   - Server updates `portal_db.json` and returns personal best & rank.
4. **Gamification Hook Dispatch**:
   - `GamificationService.recordGamePlay(...)` adds XP.
   - Evaluates daily quest progress (`PLAY_GAMES_COUNT`, `SUBMIT_SCORE`, `PLAY_CATEGORY`).
   - Evaluates trophy unlock conditions (e.g., scoring $\ge 5000$ points).
   - Fires `stressbuster_gamification_sync` event across React components.

---

## 3. Directory & File Organization

```
Dream_project/
├── app/                              # Next.js 16 App Router Directory
│   ├── api/                          # Serverless REST API Endpoints
│   │   ├── games/
│   │   │   ├── hype/route.ts         # Community game hype vote toggle
│   │   │   ├── play/route.ts         # Real-time game play counter increment
│   │   │   ├── rate/route.ts         # 5-star community rating submission
│   │   │   └── route.ts              # Catalog retrieval endpoint
│   │   ├── leaderboard/route.ts      # Global leaderboard aggregator
│   │   ├── scores/route.ts           # Score submission & anti-cheat validator
│   │   └── user/route.ts             # Gamer tag registration & profile sync
│   ├── privacy/page.tsx              # GDPR-compliant Privacy Policy page
│   ├── terms/page.tsx                # Terms of Service & Fair Play rules
│   ├── globals.css                   # Tailwind base, Neo-Brutalist CSS tokens
│   ├── layout.tsx                    # Root Layout with Analytics & Metadata
│   ├── manifest.ts                   # PWA Web App Manifest
│   ├── not-found.tsx                 # Retro-Arcade 404 Reboot page
│   ├── opengraph-image.tsx           # Dynamic 1200x630 Social Card Generator
│   ├── page.tsx                      # Primary Single-Page Arcade Portal
│   ├── robots.ts                     # Search engine crawler directives
│   └── sitemap.ts                    # Dynamic XML Sitemap generator
│
├── components/                       # Modular React UI Components
│   ├── about/                        # Developer Spotlight & Engineering Dossiers
│   │   ├── AboutSection.tsx          # About portal container & philosophy
│   │   └── DevSpotlightBanner.tsx    # 3D interactive creator card (Munim Yeasin)
│   ├── games/                        # HTML5 Canvas Game Engines & Card Grid
│   │   ├── BattleshipGame.tsx        # Naval Grid Strike (2D Naval Warfare)
│   │   ├── BlackHoleGame.tsx         # Singularity Horizon (David Gale 2P/AI)
│   │   ├── CandyCrushGame.tsx        # Neon Candy Blast (Match-3 Laser Puzzle)
│   │   ├── ChromaReflexGame.tsx      # Chroma Reflex (4-Quadrant Tone Reflex)
│   │   ├── Cyber2048Game.tsx         # Quantum 2048 (Sliding Block Merger)
│   │   ├── CyberBreakerGame.tsx      # Cyber Brick Breaker (Paddle & Balls)
│   │   ├── CyberDashGame.tsx         # Cyber Dash 2077 (Endless Runner)
│   │   ├── CyberMazeGame.tsx         # Cyber Labyrinth Escape (10-Level Maze)
│   │   ├── CyberMinesweeperGame.tsx  # Quantum Minefield (Safe-click Sweeper)
│   │   ├── CyberSlicerGame.tsx       # Cyber Katana Slicer (Parabolic Blade)
│   │   ├── GameCard.tsx              # Neo-Brutalist interactive game card
│   │   ├── GameGrid.tsx              # Responsive 4x3 to 6-column game grid
│   │   ├── GeometryDashGame.tsx      # Neon Pulse Dash (Rhythm Platformer)
│   │   ├── HyperTapperGame.tsx       # Hyper Tapper (Reaction Speed Clicker)
│   │   ├── MemoryMatrixGame.tsx      # Memory Matrix (Neural Matching)
│   │   ├── MultidimensionXOGame.tsx  # Multidimension XO (9x9 Nested Tic-Tac-Toe)
│   │   ├── NeonMissileDefenseGame.tsx# Neon Missile Defense (Command Flak)
│   │   ├── NeonPaperIoGame.tsx       # Neon Paper Grid (Territory Capture)
│   │   ├── NeonSnakeGame.tsx         # Neon Snake 2077 (Canvas Snake)
│   │   ├── NeonStarfighterGame.tsx   # Neon Starfighter (Space Shooter)
│   │   ├── QuantumXOGame.tsx         # Quantum XO (3x3 vs Overthinker AI)
│   │   ├── SpotlightBanner.tsx       # Hero Spotlight carousel & game launcher
│   │   └── TetraMatrixGame.tsx       # Tetra Matrix (7-bag SRS Polyomino)
│   ├── gamification/                 # Engagement & Retention System
│   │   ├── ActivityTicker.tsx        # Live animated marquee activity ticker
│   │   ├── DailyQuestsModal.tsx      # 3 Daily quests with XP claims
│   │   ├── GameRouletteModal.tsx     # Neural 1-click random game picker
│   │   ├── LevelUpCelebrationModal.tsx# Level up fanfare & confetti celebration
│   │   ├── PlayerXpBadge.tsx         # Header XP & Level badge trigger
│   │   └── TrophyRoomModal.tsx       # 16 Holographic trophy vault
│   ├── leaderboard/                  # Ranking Modals
│   │   └── LeaderboardModal.tsx      # Global podium & per-game score tables
│   ├── navigation/                   # Shell Navigation
│   │   ├── Footer.tsx                # Neo-Brutalist footer & legal navigation
│   │   └── Sidebar.tsx               # Responsive dual-pane left navigation drawer
│   └── ui/                           # Reusable UI & Core Modal Containers
│       ├── ComingSoonModal.tsx       # Hype Engine & Release Priority modal
│       ├── CookieConsentBanner.tsx   # GDPR cookie banner with preferences
│       ├── FaviconManager.tsx        # Dynamic canvas favicon manager
│       ├── GameModal.tsx             # Universal 9:16 viewport game container
│       ├── HeroCTASection.tsx        # High-conversion hero banner CTA
│       ├── MobileGamepad.tsx         # Virtual D-pad and action buttons
│       ├── StarRating.tsx            # Interactive 5-star rating widget
│       ├── ThemeOnboardingHint.tsx   # First-time theme switcher prompt
│       ├── ThemeSelectorModal.tsx    # Multi-theme gallery & switcher
│       ├── UsernamePromptModal.tsx   # First-time gamer tag onboarding
│       └── VirtualJoystick.tsx       # Touch drag virtual analog joystick
│
├── context/
│   └── ThemeContext.tsx              # React theme context & provider
│
├── data/
│   └── portal_db.json                # Local JSON database (Users, Scores, Ratings)
│
├── lib/
│   ├── analytics.ts                  # Vercel Analytics & Speed Insights wrapper
│   ├── audio.ts                      # Procedural Web Audio API sound synthesizer
│   ├── avatar.ts                     # DiceBear avatar URI generator
│   ├── db.ts                         # Server-side JSON database CRUD engine
│   ├── gamesData.ts                  # Static game catalog & metadata registry
│   ├── gamification.ts               # XP, Quests, Trophies, & Streaks service
│   ├── schema.sql                    # Relational SQL schema specification
│   ├── theme.ts                      # Theme registry & token definitions
│   └── types.ts                      # Universal TypeScript interfaces
│
├── public/
│   ├── portfolio.html                # Interactive developer portfolio for Munim Yeasin
│   ├── thumbnails/                   # 19 Theme-adaptive SVG vector game thumbnails
│   └── icons/                        # PWA & Web application icons
│
├── tailwind.config.ts                # Neo-Brutalist design tokens & shadows
├── tsconfig.json                     # Strict TypeScript configuration
└── next.config.mjs                   # Security headers, tunnels, bundle config
```

---

## 4. Technology Stack Specification

| Layer | Technology | Purpose / Justification |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.4 (App Router) | Serverless API routes, zero-overhead client navigation, fast SSR/SSG rendering, built-in Turbopack bundling. |
| **Language** | TypeScript 5.4.5 | Full end-to-end type safety across API contracts, game physics state, and gamification interfaces. |
| **UI Library** | React 18.3.1 | Declarative component tree, concurrency hooks, and dynamic modal mounting. |
| **Styling** | Tailwind CSS 3.4.17 | Utility-first Neo-Brutalist tokens, custom offset box-shadows, responsive breakpoints. |
| **Icons** | Lucide React 1.39.0 | Lightweight, crisp vector iconography for cyberpunk controls and navigation. |
| **Rendering** | HTML5 Canvas 2D API | Zero-dependency, high-performance immediate-mode rendering for 18+ arcade games. |
| **Audio Engine** | Native Web Audio API | Zero external audio asset overhead; procedural synthesis using oscillators (`sine`, `triangle`, `sawtooth`, `noise`) and gain envelopes. |
| **Database** | JSON File Store (`portal_db.json`) | Lightweight, zero-configuration local persistence with safe atomic write serialization. |
| **Analytics** | Vercel Analytics & Speed Insights | Privacy-conscious performance telemetry and Core Web Vitals monitoring. |
| **Avatars** | DiceBear Bottts API | Deterministic, cyberpunk robot avatar generation from player tag seeds. |

---

## 5. API Endpoints & Request/Response Contracts

### `POST /api/user`
Registers or updates a player's gamer tag.
- **Request Body**: `{ "username": "CyberViper", "user_id"?: "usr_123" }`
- **Response**: `{ "success": true, "user": { "id": "usr_123", "username": "CyberViper", "avatar_url": "..." } }`

### `POST /api/scores`
Submits a game score with anti-cheat verification.
- **Request Body**: `{ "game_id": "g_shooter_07", "user_id": "usr_123", "score": 4500, "honeypot": "" }`
- **Response**: `{ "success": true, "score": { "id": "sc_...", "score": 4500, "is_personal_best": true, "rank": 1 } }`

### `GET /api/leaderboard?game_id=all`
Retrieves top global rankings.
- **Response**: `{ "leaderboard": [ { "rank": 1, "username": "munim", "score": 142500, "avatar_url": "..." } ] }`

### `POST /api/games/play`
Increments real-time play counter.
- **Request Body**: `{ "game_id": "g_candy_19" }`
- **Response**: `{ "success": true, "play_count": 1450 }`

### `POST /api/games/hype`
Toggles community release vote for upcoming games.
- **Request Body**: `{ "game_id": "g_snake_01", "action": "increment" | "decrement" }`
- **Response**: `{ "success": true, "hype_count": 89 }`

---

## 6. Procedural Web Audio Engine Architecture

All sound in Break Hub is synthesized on the fly via `lib/audio.ts`. No audio files are downloaded over the network.

```
                  +--------------------------------+
                  |  AudioContext Singleton        |
                  |  (Initializes on first click)  |
                  +---------------+----------------+
                                  |
            +---------------------+---------------------+
            |                                           |
    [TONE SYNTHESIS]                            [NOISE / SFX SYNTHESIS]
  - OscillatorNode                              - AudioBufferSourceNode
    (sine, square, triangle, sawtooth)            (White/Pink noise buffer)
  - GainNode with Exponential Ramps             - BiquadFilterNode (Bandpass/Lowpass)
  - Frequency sweeps & arpeggios                - Linear gain decrescendo
            |                                           |
            +---------------------+---------------------+
                                  |
                                  v
                      [Master Destination Speaker]
```

### Key Sound Effects Implemented:
- **XP / Coin Chime**: High-frequency dual sine sweep (880Hz $\rightarrow$ 1760Hz).
- **Laser / Cannon Blast**: Exponential downward sawtooth pitch drop with low-pass resonance.
- **Explosion / Bomb**: Procedural white-noise burst modulated through a decaying low-pass filter with sub-bass punch.
- **Level-Up Arpeggio**: 5-note pentatonic major chord ascending arpeggio with celebratory gain curve.
- **Streak Flame / Hype**: Sub-harmonic triangle oscillator bass swell with smooth release.
