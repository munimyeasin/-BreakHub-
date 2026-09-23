# ⚡ Break Hub — Retro Neo-Brutalist HTML5 Mini-Game Portal & Competitive Leaderboards

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-FFE600?style=for-the-badge&logoColor=black)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-00F0FF?style=for-the-badge&logo=vercel&logoColor=black)](https://breakhub.vercel.app/)

A high-performance, mobile-first **HTML5 Mini-Game Portal** engineered with Next.js App Router, TypeScript, and a bespoke **Dark Retro Neo-Brutalism** design language. Featuring 15+ custom-engineered 2D Canvas and interactive mini-games, real-time procedural Web Audio sound synthesis, global and per-game competitive leaderboards, user rating systems, and instant zero-cache browser favicon synchronization.

---

## 🎮 Playable Game Catalog

| Game | Category | Engine / Mechanics | Status |
| :--- | :---: | :--- | :---: |
| **Neon Candy Blast** | `PUZZLE` | Cyber Match-3 Arcade, Striped Lasers, Wrapped & Disco Color Bombs, 15 Campaign Quests | 🟢 Active |
| **Naval Grid Strike** | `STRATEGY` | Tactical 2D Naval Grid Combat, Sonar Recon, Artillery Salvos, AI & 2P Pass & Play | 🟢 Active |
| **Singularity Horizon** | `STRATEGY` | David Gale’s 21-node triangular singularity board, collapsing event horizon, 3 AI tiers | 🟢 Active |
| **Quantum Minefield** | `PUZZLE` | Procedural quantum minefield, guaranteed safe first click, chord clearing, dynamic difficulty sectors | 🟢 Active |
| **Cyber Labyrinth Escape** | `PUZZLE` | 10-level labyrinth infiltration, 60s countdown, laser security gates, keycards & teleporters | 🟢 Active |
| **Cyber Katana Slicer** | `ACTION` | High-FPS touch/mouse katana slicing, target physics, multi-slice combo multipliers, plasma bombs | 🟢 Active |
| **Neon Starfighter** | `ARCADE` | High-speed vertical shmup, plasma laser cannons, singularity black holes, drone boss swarms | 🟢 Active |
| **Quantum XO** | `STRATEGY` | Tactical 3x3 showdown vs. adaptive minimax Overthinker AI engine | 🟢 Active |
| **Quantum 2048** | `PUZZLE` | Cyber sliding grid merger, smooth keyboard/swipe gestures, high-voltage energy core | 🟢 Active |
| **Memory Matrix** | `PUZZLE` | Fast-paced neural memory card matching grid with multiplier streaks and countdown bonuses | 🟢 Active |
| **Hyper Tapper** | `ACTION` | Precision reaction-time clicker testing ultra-high APM reflex speeds | 🟢 Active |
| **Neon Snake 2077** | `ARCADE` | 60FPS 2D Canvas engine with touch swipe gestures, virtual D-pad, combo multipliers & particle trails | 🟡 Coming Soon |
| **Multidimension XO** | `STRATEGY` | Ultimate 9-field nested Ultimate Tic-Tac-Toe macro-grid strategy engine | 🟡 Coming Soon |
| **Cyber Dash 2077** | `ACTION` | Endless side-scroller runner with laser fences, double jump thrusters, and energy coins | 🔵 In Engine |
| **Neon Pulse Dash** | `ACTION` | Rhythm cube runner with gravity pads, neon spikes, and secret collectable coins | 🔵 In Engine |
| **Cyber Brick Breaker** | `ARCADE` | Hyper-responsive neon paddle brick breaker with energy balls & particle bursts | 🔵 In Engine |
| **Chroma Reflex** | `STRATEGY` | 4-quadrant chromatic sequence audio reflex test with pitch-synthesized tones | 🔵 In Engine |
| **Neon Paper Grid** | `STRATEGY` | Real-time territory capture grid, trail-slicing mechanics, and AI bots | 🔵 In Engine |

---

## ✨ Key Features & Architecture

### 1. 🎨 Bespoke Retro Neo-Brutalism Aesthetics
- **Color Tokens**: Pitch Dark Ground (`#0B0819`), Electric Yellow (`#FFE600`), High-Voltage Cyan (`#00F0FF`), Hot Neo Pink (`#FF4081`), and Acid Lime (`#A3E635`).
- **Signature Styling**: Hard 0-blur 3D drop shadows (`#000000`), bold 3px–4px black borders, diagonal hazard accent stripes, and crisp monospace telemetry readouts.
- **Micro-Interactions**: Hover elevation shifts (`translate(-3px, -3px)`), tactile active button depressions, and dynamic particle systems.

### 2. 📱 Mobile-First Ergonomics & Controls
- **Universal Input Matrix**: Unified support for touch swipe gestures, on-screen virtual d-pads/joysticks, mouse gestures, and keyboard bindings (`WASD`, Arrow keys, Space, Esc).
- **Responsive Fluid Grid**: 3-column micro-grid on mobile viewports scaling up to 6 columns on high-resolution desktop displays.
- **Instant Search & Category Filtering**: Real-time fuzzy title search, category pills (`ALL`, `ACTION`, `ARCADE`, `PUZZLE`, `STRATEGY`), and local storage favorites.

### 3. 🔊 Synthesized Web Audio API Engine (`lib/audio.ts`)
- Zero external audio asset dependencies — all sound effects are generated procedurally via the browser's native **Web Audio API** oscillators and gain nodes.
- Custom synthesizer profiles for laser beams, fruit slice impacts, explosion thuds, match-3 candy blasts, chord-clearing chimes, combo fanfare, and victory jingles.

### 4. 🏆 Competitive Leaderboard & Rating Engine
- **Global & Game Leaderboards**: Top 10 rankings per game and cumulative global championship leaderboards.
- **Top 3 Podium Display**: Gold crown badge for 1st place, Silver badge for 2nd place, Bronze badge for 3rd place, with score verification.
- **Interactive Ratings & Hype Counter**: 5-star player feedback modal and pre-release "Hype" voting system with local and server-side state persistence.

### 5. ⚡ Zero-Cache Dynamic Favicon Manager (`components/ui/FaviconManager.tsx`)
- Solves Chromium's stubborn SQLite origin favicon persistence by dynamically replacing DOM `<link rel="icon">` elements at runtime with raw **SVG Data URIs** (`data:image/svg+xml,...`).
- Multi-format asset suite: High-DPI SVG vector, multi-resolution 16/32/48/64px binary `.ico`, 64px PNG raster, and 180px Apple Touch bookmark icon.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router + Turbopack)](https://nextjs.org/)
- **Language**: [TypeScript (Strict Mode)](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio Engine**: Native Browser Web Audio API (OscillatorNode, BiquadFilterNode, GainNode)
- **Effects**: HTML5 2D Canvas Particles & Canvas Confetti
- **Storage & State**: Atomic JSON / SQL relational store (`lib/db.ts`) with Client-side LocalStorage caching

---

## 📡 API Specification

### 🎯 Games
- `GET /api/games` — Fetch active, featured, and coming soon mini-games catalog.
- `POST /api/games/play` — Increment global play count for a game session.
- `POST /api/games/rate` — Submit a 1–5 star player rating (`{ gameId, rating }`).
- `POST /api/games/hype` — Upvote / hype a coming-soon title (`{ gameId }`).

### 🏆 Leaderboards & Scores
- `GET /api/leaderboard?gameId={gameId | global}` — Fetch top 10 leaderboards for a single game or cumulative global standings.
- `POST /api/scores` — Submit an authenticated player high score.
  ```json
  {
    "gameId": "g_sweeper_16",
    "username": "CyberNinja",
    "score": 4500
  }
  ```

### 👤 User Profiles
- `GET /api/user?username={username}` — Retrieve user statistics, personal bests, and total medals won.

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/munimyeasin/-StressBuster-.git
cd -StressBuster-
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Verification
```bash
npm run build
npm run start
```

---

## 📂 Project Structure

```
├── app/
│   ├── api/                 # Next.js App Router REST API endpoints
│   │   ├── games/           # Game catalog, play counters, hype & ratings
│   │   ├── leaderboard/     # High score ranking queries
│   │   ├── scores/          # Score validation & submission
│   │   └── user/            # Player profile & stats
│   ├── globals.css          # Retro Arcade & Neo-Brutalism theme tokens
│   ├── layout.tsx           # Root layout with FaviconManager & metadata
│   └── page.tsx             # Main portal homepage & modal coordinator
├── components/
│   ├── about/               # Team credits, platform capabilities & mission UI
│   ├── games/               # 16 custom HTML5 Canvas & reactive games
│   ├── ui/                  # UI components (Header, Spotlight, RatingModal, FaviconManager)
│   └── leaderboard/         # Leaderboard modal, Podium, & rank tables
├── lib/
│   ├── audio.ts             # Web Audio procedural sound synthesizer
│   ├── db.ts                # Database driver & atomic JSON persistence
│   ├── gamification.ts      # Leveling curves, XP rewards, and daily quests
│   ├── gamesData.ts         # Canonical game registry & metadata
│   └── types.ts             # TypeScript definitions & API contracts
├── public/
│   ├── thumbnails/          # High-voltage game preview vector graphics
│   ├── icon.svg             # Neo-Brutalism SVG vector favicon
│   ├── favicon.ico          # Multi-resolution binary ICO icon
│   └── portfolio.html       # Developer architect portfolio
└── README.md
```

---

## 👤 About the Creator & Architect

**Break Hub** was conceptualized, designed, and engineered from the ground up by **Munim Yeasin** as an advanced full-stack arcade gaming platform. The initiative demonstrates full-stack software architecture, responsive 2D canvas physics, procedural Web Audio generation, and high-performance Neo-Brutalism web design.

### 🌟 Lead Developer & Architect

| Engineer | Role | Key Focus Areas |
| :--- | :--- | :--- |
| **Munim Yeasin** | **Creator & Full-Stack System Architect** | Next.js 16 App Router architecture, procedural Web Audio synthesizer, 18+ HTML5 Canvas game engines, database persistence, Neo-Brutalist design system, and gamification economy. |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by **[Munim Yeasin](https://breakhub.vercel.app/portfolio.html)**.
