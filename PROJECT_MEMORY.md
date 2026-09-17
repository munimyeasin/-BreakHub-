# Stress Buster Portal — Persistent Context & Memory

- **Live Production URL**: `https://stress-buster-delta.vercel.app/`

> **Note**: This is the workspace mirror of the AI persistent memory. The active system store is located at:  
> `C:\Users\munim\.claude-omniroute\projects\C--Users-munim-Desktop----InterShip---Project-\memory\`

---

## 👥 Equal Co-Creators & Developer Spotlight
- **Developer Spotlight Showcase**: `components/about/DevSpotlightBanner.tsx` interactive showcase panel embedded in `components/about/AboutSection.tsx` featuring full feature parity with the Game Spotlight Banner:
  - **7s Auto-Rotation & Timer**: Smooth auto-rotation across all 4 developers with pause on hover/touch.
  - **Interactive Quick Switcher**: Top tab selector for 1-click developer switching with active neon highlight indicators.
  - **Mobile Touch-Swipe Gestures**: Swipe left/right gesture recognition on mobile screens with directional slide transitions (`animate-dev-spotlight-next`, `animate-dev-spotlight-prev`).
  - **Rich Engineering Dossiers**: High-contrast avatar decks, domain badges, bio quotes, core modules engineered, tech stack chips, and mini metric pills.
- **Tahida**: UI/UX & Frontend Engineer — Neo-Brutalist design system, responsive mobile layout, dark/light theme engine, micro-interactions & badge systems.
- **Marzia**: Game Logic & QA Engineer — Deterministic game rules, mathematical puzzle state machines, minimax AI, and collision QA verification.
- **Rahul**: Systems & Gameplay Developer — High-performance 60 FPS HTML5 Canvas rendering loops, particle physics systems, and mobile virtual touch controls.
- **Munim Yeasin**: Full-Stack & System Architect — Procedural zero-asset Web Audio synthesis, gamification economy (Quests/XP/Trophies), Next.js API routes, and database persistence.

---

## 🛠️ Tech Stack & Architecture
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Custom Neon Theme Palettes + Lucide Icons
- **Responsive Dual-Pane & Left Slide Bar Navigation**: `components/navigation/Sidebar.tsx` relocates all top-level navigation tabs ("All Games", "Favorites", "Hall of Fame", "About Team") and genre filters into an interactive left sidebar (sticky on desktop, sliding drawer with backdrop on mobile/touch screens). Includes active category badge counters, filter status pill indicators, and quick reset actions in `app/page.tsx`.
- **Spotlight Showcase Hero Banner**: `components/games/SpotlightBanner.tsx` prominently highlights top featured games (**Neon Candy Blast**, **Naval Grid Strike**, **Singularity Horizon**, **Quantum Minefield**, **Cyber Labyrinth Escape**, **Cyber Katana Slicer**, **Neon Starfighter**, and **Multidimension XO**). Streamlined for high-impact visual presentation and fast game launches:
    - **Clean Visual Presentation**: Displays vibrant game artwork, high-contrast title, genre badges, dynamic play counter, and community ratings with zero text clutter.
    - **Fast Action Deck**: Immediate "PLAY NOW" primary CTA button, "LEADERBOARD" rankings shortcut, and quick favorite toggle.
    - **Interactive Game Selector**: Quick-access top pill switcher for all featured titles with active highlight states.
    - **Responsive Dual Layout**: Full desktop view (`≥ md`) and touch-swipe enabled card on mobile (`< md`) with smooth directional slide animations (`animate-spotlight-next`, `animate-spotlight-prev`), 7s auto-rotation timer, and pause-on-hover/touch.
    - **PC Companion Deck Integration**: Full tactical keycaps, mission objectives, scoring rules, and pro-tips remain cleanly hosted inside `components/ui/GameModal.tsx` during active gameplay.
- **Themed Pre-Game Background Visuals**: Dynamic animated HTML5 Canvas idle loops rendered on game start screens before gameplay begins:
  - **Neon Starfighter**: Deep-space nebula radial gradients, moving parallax starfield, cyber horizon grid lines, hovering starfighter, and engine thruster particles.
  - **Cyber Katana Slicer**: Dynamic cyber dojo background idle loop (`requestAnimationFrame` when `!isPlaying && !isDead`) featuring floating neon targets with sine-wave levitation and counter-rotation, 3D perspective floor grid, periodic katana light slashes, and floating spark embers visible behind a translucent glassmorphism menu.
- **Mobile Homepage Game Grid**: Responsive 4x3 grid system (`grid-cols-3` for 4 rows x 3 columns on mobile, scaling to 4/5/6 columns on larger screens) with compact card styling, micro-badges, and high-density typography in `components/games/GameGrid.tsx` and `components/games/GameCard.tsx`.
- **Game Visibility & Interactive Hype System**: Non-destructive game lifecycle control in `lib/types.ts` via `status?: 'active' | 'coming_soon' | 'hidden'`.
  - `status: 'coming_soon'`: Replaces placeholder star ratings with an interactive Player Interest / Hype system (`hype_count?: number`).
    - **Clean Baseline**: Hype metrics reset to `0` across catalog and database (`data/portal_db.json` & `lib/gamesData.ts`) for authentic community voting.
    - **Game Card Badge**: Live interactive `🔥 {count}` vote counter on cards in `GameCard.tsx`.
    - **Interactive Hype Engine in Modal**: `ComingSoonModal.tsx` provides a prominent "🔥 HYPE THIS GAME" / "❤️ INTEREST REGISTERED" toggle button with procedural Web Audio synthesis sound effects, live hype counters, and community release priority milestone progress bar.
    - **Persistence**: Dual-layer persistence via `localStorage` (`'stressbuster_hyped_games'`), local database store `data/portal_db.json` (`toggleHypeCount`), and `POST /api/games/hype`.
  - `status: 'active'`: Standard fully playable state with live play count and leaderboard sync.
- **Mandatory First-Time Player Naming**: First-time players without a saved `stressbuster_player_tag` cannot start any game as an anonymous guest. Game clicks are intercepted by `handleLaunchGame` in `app/page.tsx`, buffering `pendingGameToPlay` and presenting `UsernamePromptModal` ("Enter Your Gamer Tag", "CONFIRM & PLAY NOW"). Upon confirmation, the tag is persisted locally, synchronized to the backend user database via `/api/user`, and the target game launches automatically.
- **Database & Play Tracking**: Local persistent JSON store at `data/portal_db.json` with CRUD methods in `lib/db.ts` (supports user accounts, personal bests, global cumulative scores, username updates with historical score migration, and real-time play counter persistence via `POST /api/games/play`).
- **Dynamic Play Count Formatter**: `formatPlayCount` in `components/games/GameCard.tsx` renders exact readable integers (`0 plays`, `1 play`, `42 plays`) for counts < 1,000 and metric formatting (`1.2k plays`, `1M plays`) for $\ge 1,000$.
- **Behavioral UX Gamification & Web Audio Suite**: Complete high-retention engagement architecture based on UX behavioral psychology principles:
  - **Daily Play Streaks & Loss Aversion**: Tracks consecutive calendar days (`YYYY-MM-DD`) with streak preservation, rollover checks, flame status badges (`🔥 {streak}`), and streak XP rewards.
  - **Dynamic Leveling & Cyber Clearance Titles**: Exponential leveling curve ($L = \lfloor (\text{XP} / 100)^{1/1.5} \rfloor + 1$) featuring 14 distinct Cyber Rank Titles (*Novice Netrunner* $\rightarrow$ *Byte Runner* $\rightarrow$ *Grid Pilot* $\rightarrow$ *Arcade Prodigy* $\rightarrow$ *Cyberpunk Legend* $\rightarrow$ *Apex Cybernetic Deity*).
  - **Deterministic Seeded Daily Quests**: 3 daily missions generated per calendar day (Easy, Medium, Hard tiers) via deterministic date hashing (`hashString(YYYY-MM-DD)`) with midnight countdown timer and a 3/3 Daily Master Bonus (+100 XP).
  - **Holographic Trophy Vault**: 16 cyberpunk achievements across Bronze, Silver, Gold, and Platinum rarity tiers with completion tracking and XP payouts in `components/gamification/TrophyRoomModal.tsx`.
  - **Procedural Web Audio Engine**: Zero-asset audio synthesis in `lib/audio.ts` using native browser `AudioContext` (sine, triangle, sawtooth oscillators with exponential gain envelopes) for XP chimes, level-up arpeggios, quest completions, sub-bass trophy drops, roulette clicks, and streak flame sounds.
  - **Neural Game Roulette & Quick Switch**: 1-click random active game selector with animated mechanical roulette and sound effects in `components/gamification/GameRouletteModal.tsx` and `GameModal.tsx`.
  - **Live Cyber Activity Ticker**: Animated marquee feed in `components/gamification/ActivityTicker.tsx` combining community milestones with local player achievements.
  - **Cross-Component React Synchronization**: Singleton service (`GamificationService`) in `lib/gamification.ts` with dual-layer `localStorage` persistence (`'stressbuster_gamification_v1'`) and `window.dispatchEvent` events (`stressbuster_gamification_sync`, `stressbuster_levelup`).
- **Audio Engine**: Custom Web Audio API procedural synthesis with persistent `AudioContext` and gain ramps (zero buffer pops).
- **Display Standard**: Standardized **9:16 vertical portrait aspect ratio** (`aspect-[9/16]`, `360x640px` internal coordinate grid, `max-w-[380px]`) and ultra-slim single-line HUDs (`py-1.5 px-3 mb-1.5 rounded-xl bg-portal-surface/90`) across all active games and `GameModal.tsx` to maximize playable screen real estate for mobile, touchscreens, and vertical monitors.
- **Universal Native Fullscreen API**: Native browser fullscreen integration across all games with dynamic viewport fitting, vendor prefix support (`webkit`, `moz`, `ms`), and `'F'` keyboard shortcut.
- **Public Tunnel Ingress**: `allowedDevOrigins` configured in `next.config.mjs` for Cloudflare, LocalTunnel, Ngrok, and Pinggy tunnels.
- **Project Backup**: Complete byte-level duplicate backup preserved at `C:\Users\munim\Desktop\___InterShip___Project__Backup` containing all legacy/hidden games and full asset catalog.
- **Personal Portfolio Web Application**: `public/portfolio.html` — Interactive developer portfolio for Munim Yeasin featuring real-time Newtonian canvas physics particle engine with gravity vortex/supernova triggers, developer CLI terminal with executable commands (including `insta`, `whoami`, `architecture`, `supernova`), zero-asset Web Audio synthesizer, filterable engineering project matrix, theme switching, live performance metrics, and complete social profile integrations (Instagram `@munimyeasin`, GitHub, Email). Accessible at `/portfolio.html`.

---

## 🎮 Active & Coming Soon Games Catalog
1. **Neon Candy Blast** (`g_candy_19` / `retro-candy-crush`): Active featured game. Cyber Match-3 Puzzle Arcade in 9:16 portrait viewport (360x640px) featuring 8x8 neon candy grid, Match-4 Striped Lasers (Horizontal & Vertical row/col blasts), T/L-shaped Wrapped Bombs (3x3 explosions), and Match-5 Rainbow Disco Color Bombs (clears all of one color). Features dual-special swap fusion combos (Color Bomb + Striped, Color Bomb + Color Bomb board wipe, Striped + Wrapped mega beam, Wrapped + Wrapped 5x5 super bomb), 15 handcrafted Campaign Quest levels with 3-star scoring and persistent progress, 25-move Arcade Blitz mode, 60s Timed Rush mode, in-game boosters (Hammer, Color Bomb, Wrapped Bomb), Sugar Crush cascade finale, and procedural Web Audio match/laser/bomb synthesis.
2. **Naval Grid Strike** (`g_battleship_18` / `retro-battleship`): Active featured game. Tactical 2D Naval Grid Combat in 9:16 portrait viewport (360x640px) featuring 10x10 ocean coordinates, 5 heavy warship classes (Carrier, Battleship, Cruiser, Submarine, Destroyer), 3x3 tactical Sonar Recon radar pings, Cadet/Commander/Admiral AI difficulty, 2-Player Pass & Play local mode, ship rotation, salvo efficiency scoring, hit rate calculations, and procedural Web Audio sonar/artillery SFX.
3. **Singularity Horizon** (`g_blackhole_17` / `black-hole`): Active featured game. David Gale's tactical 2-player & AI Singularity board game in 9:16 portrait viewport (360x640px) featuring 21 triangular nodes (rows 1 to 6), sequencing numbers 1 to 10 for Red and Blue pilots, predicting the 21st collapsing Singularity Black Hole node, lowest sucked score victory condition, 3 AI tiers (Novice, Tactician, Singularity), 2P Pass & Play, and Web Audio vortex soundscapes.
4. **Quantum Minefield** (`g_sweeper_16` / `cyber-minesweeper`): Active featured game. Neo-Brutalist procedural quantum minefield puzzle in 9:16 portrait viewport (360x640px) with 100% guaranteed safe first clicks, chord clearing, flag markings, 4 sector difficulties (Novice 8x8, Hacker 9x9, Overlord 10x10, Blitz 8x8 45s timer), and Web Audio synthesis.
5. **Cyber Labyrinth Escape** (`g_maze_15` / `cyber-maze`): Active game. 10-Level Cyber Labyrinth Infiltration puzzle game in 9:16 portrait viewport (360x640px) featuring 10 handcrafted levels of increasing complexity, strict 60-second (1-minute) countdown timers per level with low-time warning sirens (< 15s amber, < 10s pulsing neon red + alert audio), collectible energy data cores, colored keycards & laser security gates (Cyan, Pink, Gold), quantum teleporter warp pads (Warp A ↔ Warp B), speed booster tracks, darknet radar spotlight vision, exit vortex portals, star ratings (1–3 stars based on speed/cores), score tracking, level select menu, responsive touch/virtual D-pad/WASD/arrow controls, and zero-asset Web Audio synthesis.
6. **Neon Starfighter** (`g_shooter_07` / `neon-starfighter`): Active spotlight game. High-speed 60–144 FPS space shooter in 9:16 vertical ratio (360x640px) featuring locked horizontal-only navigation (A/D, arrows, direct touch drag across screen at `Y = 565px`), indestructible deflecting meteors, gravitational black holes with non-linear exponential singularity suction & touch drag damping, 3X spread lasers, energy shields, EMP screen-clearing nukes, and complete Game Over Revive System.
7. **Cyber Katana Slicer** (`g_slicer_11` / `cyber-slicer`): Active game. Cyber-katana blade slicing game in 9:16 vertical ratio with parabolic gravity arcs, split target halves, particle burst effects, combo multiplier chains, hazardous cyber bombs, and procedural Web Audio blade swoosh/slice synthesizers.
8. **Quantum XO** (`g_ttt_03` / `quantum-xo`): Active game. Futuristic 3x3 tactical showdown with default Single-Player vs Overthinker AI Boss, guaranteed player-first move, round-robin turn cycling, and Web Audio sound synthesizer.
9. **Quantum 2048** (`g_card_05` / `quantum-2048`): Active game. Cyberpunk sliding block merger in 9:16 vertical ratio.
10. **Memory Matrix** (`g_flip_02` / `memory-matrix`): Active game. Neural memory card matching grid with multiplier streaks.
11. **Hyper Tapper** (`g_tap_04` / `hyper-tapper`): Active game. Precision reaction-time clicker testing ultra-high APM speeds.
12. **Multidimension XO** (`g_multi_xo_13` / `multidimension-xo`): Coming soon. Ultimate 9-field nested Tic-Tac-Toe with 9 nested 3x3 boards and macro-node capture mechanics.
13. **Neon Snake 2077** (`g_snake_01` / `neon-snake`): Coming soon. Cyberpunk canvas snake with hyper-speed combos and interactive community hype registration.

---

## 📌 Reminders
- [x] **GitHub Backup & Remote Push**: Codebase successfully backed up and pushed to `https://github.com/munim08/-StressBuster-.git` (`main` branch).
- [x] **Workspace Restoration**: Restored all 13 games, assets, and database records with full StressBuster branding.
- [x] **Memory Management**: Keep memory actively updated across all sessions and reboots while pruning obsolete facts.
