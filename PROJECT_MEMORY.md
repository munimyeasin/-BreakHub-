# Stress Buster Portal — Persistent Context & Memory

> **Note**: This is the workspace mirror of the AI persistent memory. The active system store is located at:  
> `C:\Users\munim\.claude-omniroute\projects\C--Users-munim-Desktop----InterShip---Project-\memory\`

---

## 👥 Equal Co-Creators
- **Tahida**: UI/UX Design, Visual Effects, Theme & Styling
- **Marzia**: Core Game Mechanics, Interaction Design, Controls
- **Rahul**: Systems Development, Audio Engineering, Logic & Algorithms
- **Munim Yeasin**: Full-Stack Architecture, Engine Optimization, Database Systems

---

## 🛠️ Tech Stack & Architecture
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Custom Neon Theme Palettes + Lucide Icons
- **Responsive Dual-Pane & Left Slide Bar Navigation**: `components/navigation/Sidebar.tsx` relocates all top-level navigation tabs ("All Games", "Favorites", "Hall of Fame", "About Team") and genre filters into an interactive left sidebar (sticky on desktop, sliding drawer with backdrop on mobile/touch screens). Includes active category badge counters, filter status pill indicators, and quick reset actions in `app/page.tsx`.
- **Spotlight Showcase Hero Banner**: `components/games/SpotlightBanner.tsx` prominently highlights top featured games (**Cyber Slicer**, **Neon Starfighter**, and **Multidimension XO**) with dynamic animated transitions (`animate-spotlight` cubic-bezier keyframes, smooth crossfade & scale), 6.5s auto-cycling rotation timer with pause on hover/touch, quick-switch selector tabs, navigation arrow chevrons, and status-aware action buttons (Play Now for active games, Hype/Preview modal for upcoming games). On mobile (`< md`), it features an expanded cinematic preview artwork (`h-[245px] xs:h-[275px]`, +4cm / ~150px taller vertical canvas), center Play/Hype overlay, in-image badges, feature tag chips, and a full-width action bar; on desktop (`≥ md`), it expands into the full dual-pane showcase layout.
- **Themed Pre-Game Background Visuals**: Dynamic animated HTML5 Canvas idle loops rendered on game start screens before gameplay begins:
  - **Neon Starfighter**: Deep-space nebula radial gradients, moving parallax starfield, cyber horizon grid lines, hovering starfighter, and engine thruster particles.
  - **Cyber Slicer**: Dynamic cyber dojo background idle loop (`requestAnimationFrame` when `!isPlaying && !isDead`) featuring floating neon fruit orbs with sine-wave levitation and counter-rotation, 3D perspective floor grid, periodic katana light slashes, and floating spark embers visible behind a translucent glassmorphism menu.
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
- **Audio Engine**: Custom Web Audio API procedural synthesis with persistent `AudioContext` and gain ramps (zero buffer pops).
- **Display Standard**: Standardized **9:16 vertical portrait aspect ratio** (`aspect-[9/16]`, `360x640px` internal coordinate grid, `max-w-[380px]`) and ultra-slim single-line HUDs (`py-1.5 px-3 mb-1.5 rounded-xl bg-portal-surface/90`) across all active games and `GameModal.tsx` to maximize playable screen real estate for mobile, touchscreens, and vertical monitors.
- **Universal Native Fullscreen API**: Native browser fullscreen integration across all games with dynamic viewport fitting, vendor prefix support (`webkit`, `moz`, `ms`), and `'F'` keyboard shortcut.
- **Public Tunnel Ingress**: `allowedDevOrigins` configured in `next.config.mjs` for Cloudflare, LocalTunnel, Ngrok, and Pinggy tunnels.
- **Project Backup**: Complete byte-level duplicate backup preserved at `C:\Users\munim\Desktop\___InterShip___Project__Backup` containing all legacy/hidden games and full asset catalog.

---

## 🎮 Active & Coming Soon Games Catalog
1. **Neon Starfighter** (`g_shooter_07` / `neon-starfighter`): Active spotlight game. High-speed 60–144 FPS space shooter in 9:16 vertical ratio (360x640px) featuring locked horizontal-only navigation (A/D, arrows, direct touch drag across screen at `Y = 565px`), indestructible deflecting meteors, gravitational black holes with non-linear exponential singularity suction & touch drag damping, 3X spread lasers, energy shields, EMP screen-clearing nukes, and complete Game Over Revive System.
2. **Cyber Slicer** (`g_slicer_11` / `cyber-slicer`): Active game. Fruit Ninja style neon katana blade slicing game in 9:16 vertical ratio with parabolic gravity arcs, split fruit halves, juice splatter particles, combo multiplier chains, hazardous cyber bombs, and procedural Web Audio blade swoosh/slice synthesizers.
3. **Quantum XO** (`g_ttt_03` / `quantum-xo`): Active game. Futuristic 3x3 tactical showdown with default Single-Player vs Overthinker AI Boss, guaranteed player-first move, round-robin turn cycling, and Web Audio sound synthesizer.
4. **Quantum 2048** (`g_card_05` / `quantum-2048`): Active game. Cyberpunk sliding block merger in 9:16 vertical ratio.
5. **Memory Matrix** (`g_flip_02` / `memory-matrix`): Active game. Neural memory card matching grid with multiplier streaks.
6. **Hyper Tapper** (`g_tap_04` / `hyper-tapper`): Active game. Precision reaction-time clicker testing ultra-high APM speeds.
7. **Multidimension XO** (`g_multi_xo_13` / `multidimension-xo`): Coming soon. Ultimate 9-field nested Tic-Tac-Toe with 9 nested 3x3 boards and macro-node capture mechanics.
8. **Neon Snake 2077** (`g_snake_01` / `neon-snake`): Coming soon. Cyberpunk canvas snake with hyper-speed combos and interactive community hype registration.

---

## 📌 Reminders
- [x] **GitHub Backup & Remote Push**: Codebase successfully backed up and pushed to `https://github.com/munim08/-StressBuster-.git` (`main` branch).
- [x] **Workspace Restoration**: Restored all 13 games, assets, and database records with full StressBuster branding.
- [x] **Memory Management**: Keep memory actively updated across all sessions and reboots while pruning obsolete facts.
