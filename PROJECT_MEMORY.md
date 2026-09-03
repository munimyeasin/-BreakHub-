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
- **Mobile Homepage Game Grid**: Responsive 4x3 grid system (`grid-cols-3` for 4 rows x 3 columns on mobile, scaling to 4/5/6 columns on larger screens) with compact card styling, micro-badges, and high-density typography in `components/games/GameGrid.tsx` and `components/games/GameCard.tsx`.
- **Game Visibility & Interactive Hype System**: Non-destructive game lifecycle control in `lib/types.ts` via `status?: 'active' | 'coming_soon' | 'hidden'`.
  - `status: 'coming_soon'`: Replaces placeholder star ratings with an interactive Player Interest / Hype system (`hype_count?: number`).
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
1. **Neon Starfighter** (`g_shooter_07` / `neon-starfighter`): Active spotlight game. High-speed 60–144 FPS space shooter in 9:16 vertical ratio (360x640px) featuring locked horizontal-only navigation (A/D, arrows, direct touch drag across screen at `Y = 565px`), indestructible deflecting meteors, gravitational black holes with non-linear exponential singularity suction & touch drag damping, 3X spread lasers, energy shields, EMP screen-clearing nukes, and complete Game Over Revive System with animated cosmic nebula death backdrop, 1-per-flight revive limit, hazard safety shockwave clearing, temporary invulnerability shield, score/wave continuity, and mock ad network integration hooks.
2. **Multidimension XO** (`g_multi_xo_13` / `multidimension-xo`): Coming soon. Ultimate 9-field nested Tic-Tac-Toe in 9:16 vertical layout. Features 9 nested 3x3 boards (81 local cells), local board win transformations into giant neon macro-symbols, macro-board win conditions (3 aligned macro-cells), active board routing mechanics, and adaptive Minimax AI.
3. **Cyber Slicer** (`g_slicer_11` / `cyber-slicer`): Coming soon. Fruit Ninja style neon katana blade slicing game in 9:16 vertical ratio with parabolic gravity arcs, split fruit halves, juice splatter particles, combo multiplier chains, hazardous cyber bombs, and procedural Web Audio blade swoosh/slice synthesizers.

---

## 📌 Reminders
- [ ] **GitHub Backup & Vercel Deployment**: Remind user to push codebase to GitHub and deploy live to Vercel (`npx vercel` or GitHub import) when ready.
- [x] **Workspace Cleanup**: Pruned 10 hidden games from active workspace while preserving complete master copy in backup folder.
- [x] **Memory Management**: Keep memory actively updated across all sessions and reboots while pruning obsolete facts.
