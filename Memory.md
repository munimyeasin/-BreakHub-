# 🧠 Break Hub — Project Memory, Architectural Decisions & Evolution Log

> **Document Version**: 1.0.0  
> **Status**: Active Living Document  
> **Live Production URL**: [https://breakhub.vercel.app/](https://breakhub.vercel.app/)  
> **Repository**: `Break Hub (Dream_project)`  
> **Creator & Lead System Architect**: **Munim Yeasin**  

---

## 1. Core Identity & Creator Dossier

### 1.1. Brand Identity
- **Official Portal Name**: **Break Hub** (Rebranded globally from legacy titles "StressBuster" and "Portal" across all UI, metadata, sitemaps, open-graph cards, and database collections).
- **Core Positioning**: The ultimate zero-install, mobile-first retro-arcade & cyber mini-game portal.

### 1.2. Creator & Architect
- **Lead Architect & Creator**: **Munim Yeasin**
  - **Engineering Scope**: Procedural zero-asset Web Audio synthesis, 18+ HTML5 Canvas game engines, gamification economy (Quests/XP/Trophies), Next.js 16 API routes, Neo-Brutalist design tokens, and local database persistence.
  - **Developer Dossier Card**: Interactive 3D physical card deck embedded in `components/about/DevSpotlightBanner.tsx` and `AboutSection.tsx`.
  - **Social & Portfolio Channels**:
    - **Instagram**: [`@__yeasin__0`](https://instagram.com/__yeasin__0)
    - **Interactive Developer Portfolio**: `/portfolio.html` (Featuring Newtonian particle physics engine, interactive developer CLI terminal, and project matrix).

---

## 2. Chronological Architectural Decision Log (ADR)

### ADR-001: Zero External Media & Procedural Audio Engine
- **Context**: External `.mp3` and `.wav` audio files create latency, network overhead, and potential CORS/licensing issues.
- **Decision**: Build a custom procedural synthesizer (`lib/audio.ts`) leveraging the native browser `AudioContext`.
- **Outcome**: 100% of sound effects (lasers, explosions, level-up arpeggios, roulette clicks, chimes) are synthesized mathematically using oscillators (`sine`, `triangle`, `sawtooth`, `noise`) with zero network payload.

### ADR-002: Universal 9:16 Portrait Aspect Ratio Standard
- **Context**: Traditional web arcade portals suffer on mobile screens due to mismatched 16:9 landscape canvas layouts.
- **Decision**: Standardize all games to a **9:16 vertical portrait viewport** (`aspect-[9/16]`, `360 x 640px` virtual coordinate space, `max-w-[380px]`).
- **Outcome**: Flawless one-handed mobile gameplay, consistent touch-drag physics, and clean responsive centering across all desktop and mobile displays.

### ADR-003: Dual-Theme Neo-Brutalist Design System
- **Context**: Standard dark-only cyberpunk themes alienate daytime readers and light-mode users.
- **Decision**: Build a dual-theme architecture supporting **Dark Neo-Brutalist** (`#0B0819` midnight violet) and **Light Neo-Brutalist** (`#FFFDF0` vintage cream paper) with pitch-black borders (`border-2 border-black`) and hard offset drop shadows (`shadow-neo`).
- **Outcome**: High-contrast, WCAG AAA compliant visual identity that renders crisp vector styling in both lighting environments without muddy dark card overlays.

### ADR-004: Behavioral UX Gamification Suite
- **Context**: Standalone mini-games lack long-term retention loops.
- **Decision**: Implement a behavioral gamification layer (`lib/gamification.ts`) incorporating:
  1. Exponential XP progression across 14 Cyber Clearance Rank Titles.
  2. Daily login streaks with flame indicators and loss aversion mechanics.
  3. Deterministic date-hashed daily quests (3 per calendar day with midnight reset).
  4. 16 Cyberpunk holographic trophies across 4 rarity tiers (Bronze to Platinum).
  5. Neural Game Roulette (1-click random active game picker).
- **Outcome**: Significantly increased average session duration and replayability.

### ADR-005: URL Route & Session State Persistence
- **Context**: Players reloading the page or using back/forward buttons previously lost their active game or filtered view.
- **Decision**: Implement bidirectional synchronization between React state, URL search parameters (`?tab=`, `?genre=`, `?q=`, `?game=`, `?modal=`), and `sessionStorage`.
- **Outcome**: Instant seamless state recovery across page refreshes and browser history navigation.

### ADR-006: Deprecation & Purging of Substandard Modules
- **Context**: `CyberDriftGame` (`g_drift_14`) and `WordNexusGame` (`g_word_20`) did not meet performance or thematic design standards.
- **Decision**: Completely delete components, vector thumbnails, and database references for both games to keep the codebase clean and maintainable.
- **Outcome**: Streamlined, zero-cruft codebase with 100% high-quality games.

---

## 3. Active Roster & Lifecycle Snapshot

| Game Title | Slug | ID | Category | Status | Engine Highlight |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Neon Starfighter** | `neon-starfighter` | `g_shooter_07` | ARCADE | `active` | 60-144 FPS space shooter with black hole gravity physics. |
| **Cyber Katana Slicer** | `cyber-slicer` | `g_slicer_11` | ACTION | `active` | Parabolic blade slicing with particle burst physics. |
| **Naval Grid Strike** | `retro-battleship` | `g_battleship_18` | STRATEGY | `active` | 2D tactical naval combat with 3 AI tiers & 2P Pass & Play. |
| **Neon Missile Defense**| `neon-missile-defense`| `g_missile_21` | ACTION | `active` | Megacore command flak defense with chain shockwaves. |
| **Multidimension XO** | `multidimension-xo` | `g_multi_xo_13` | STRATEGY | `active` | 9x9 Nested Tic-Tac-Toe with macro-node sector conquests. |
| **Tetra Matrix** | `tetra-matrix` | `g_tetris_20` | PUZZLE | `active` | 7-bag polyomino matrix with SRS wall kicks. |
| **Neon Candy Blast** | `retro-candy-crush` | `g_candy_19` | PUZZLE | `active` | Match-3 with 15 campaign quest levels & laser fusion. |
| **Singularity Horizon** | `black-hole` | `g_blackhole_17` | STRATEGY | `active` | David Gale's triangular node singularity board game. |
| **Quantum Minefield** | `cyber-minesweeper` | `g_sweeper_16` | PUZZLE | `active` | Quantum minefield with 100% safe first clicks & chord clear. |
| **Cyber Labyrinth Escape**| `cyber-maze` | `g_maze_15` | PUZZLE | `active` | 10-level maze infiltration with 60s countdown timers. |
| **Quantum XO** | `quantum-xo` | `g_ttt_03` | STRATEGY | `active` | 3x3 tactical showdown vs Overthinker AI Boss. |
| **Quantum 2048** | `quantum-2048` | `g_card_05` | PUZZLE | `active` | Cyber-arcade sliding energy node block merger. |
| **Memory Matrix** | `memory-matrix` | `g_flip_02` | PUZZLE | `active` | Neural memory card matching grid with multiplier streaks. |
| **Hyper Tapper** | `hyper-tapper` | `g_tap_04` | ACTION | `active` | Precision reaction-time clicker testing APM speeds. |
| **Cyber Outrun 2077** | `cyber-outrun-2077` | `g_outrun_22` | ACTION | `active` | 4-lane retro highway racer with 350+ km/h Nitro overdrive. |
| **Neon Snake 2077** | `neon-snake` | `g_snake_01` | ARCADE | `coming_soon` | Cyber snake with interactive community hype registration. |
| **Cyber Dash 2077** | `cyber-dash` | `g_action_06` | ACTION | `hidden` | Endless cyber runner with double jump thrusters. |
| **Neon Pulse Dash** | `geometry-dash` | `g_geometry_10` | ACTION | `hidden` | Rhythm cube runner with neon hazards. |
| **Cyber Brick Breaker** | `cyber-breaker` | `g_breaker_08` | ARCADE | `hidden` | Paddle brick breaker with particle dynamics. |
| **Chroma Reflex** | `chroma-reflex` | `g_reflex_09` | STRATEGY | `hidden` | 4-quadrant chromatic memory & tone reflex test. |
| **Neon Paper Grid** | `paper-io` | `g_paper_12` | STRATEGY | `hidden` | Real-time territory capture and trail slicing grid. |

---

## 4. Current Handover & Production Status

- **Build Health**: Tested on Next.js 16.3.4 (App Router) with zero TypeScript compilation errors.
- **Analytics & Telemetry**: Privacy-conscious Vercel Analytics and Speed Insights active.
- **Next Primary Milestone**: Activate remaining coming-soon titles (Neon Snake 2077) and push latest commits to production (`main`).
