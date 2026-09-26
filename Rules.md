# ⚖️ Break Hub — AI Coding Rules & Engineering Guardrails

> **Document Version**: 1.0.0  
> **Philosophy**: Minimalist, High-Performance, Zero-Asset, YAGNI-First (Ponytail Principle)  
> **Target Audience**: AI Coding Assistants, Pair Programmers & Lead Engineers  

---

## 1. Core Engineering Philosophy: The Ponytail / YAGNI Ladder

When generating, modifying, or refactoring code for Break Hub, always follow the **Ponytail Ladder**:
1. **YAGNI (You Aren’t Gonna Need It)**: Do not create factories, abstract base classes, generic wrapper layers, or speculative helper functions for single-use logic.
2. **Standard Library / Native Web APIs First**: Use native browser APIs (`requestAnimationFrame`, `AudioContext`, `localStorage`, `fetch`, `CanvasRenderingContext2D`, `Intl`) instead of pulling in external libraries.
3. **Smallest Correct Change**: Solve the exact problem requested without gratuitous refactoring of unrelated components.
4. **Zero External Media Dependencies**: All sound effects must be synthesized procedurally via `lib/audio.ts`. All game graphics must be drawn directly on HTML5 Canvas.

---

## 2. What AI CAN Do (Authorized Capabilities)

### 2.1. Canvas Game Engine Development
- ✅ **Implement Handcrafted 2D Canvas Games**: Write high-performance immediate-mode 2D rendering loops using `requestAnimationFrame`.
- ✅ **Enforce 9:16 Portrait Canvas Standard**: All games must operate on a virtual coordinate space of `360 x 640 px` (`aspect-[9/16]`), scaled responsively to fit the mobile screen or `GameModal.tsx`.
- ✅ **Delta-Time Physics**: Use frame-rate-independent delta-time calculations (`dt = Math.min((now - lastTime) / 1000, 0.1)`) so games run identically on 60 Hz, 90 Hz, 120 Hz, and 144 Hz displays.
- ✅ **Particle & Object Pooling**: Implement lightweight particle arrays and reuse objects where necessary to minimize garbage collection pauses during gameplay.
- ✅ **Multi-Input Multiplexing**: Support simultaneous Keyboard (WASD/Arrows/Space), direct Canvas Touch Drag/Taps, and Virtual On-Screen Gamepads (`MobileGamepad.tsx` / `VirtualJoystick.tsx`).

### 2.2. Procedural Audio & Web Audio API
- ✅ **Synthesize Procedural Sound**: Add new procedural sound effects in `lib/audio.ts` using native `AudioContext` oscillators (`sine`, `square`, `triangle`, `sawtooth`, `noise`) with exponential/linear gain ramps.
- ✅ **Audio Safety**: Always initialize or resume `AudioContext` only after user gesture (click/tap) and check `audioContext.state === 'suspended'`.
- ✅ **Zero Buffer Pops**: Always ramp gain nodes smoothly to `0.0001` rather than abruptly cutting to `0`.

### 2.3. Styling & Neo-Brutalist Design Tokens
- ✅ **Dual-Theme Compatibility**: Write Tailwind classes that support both Dark (`html[data-theme="neo-dark"]`) and Light (`html[data-theme="neo-light"]`) modes using CSS custom properties (`var(--portal-bg)`, `var(--portal-surface)`, `var(--portal-card)`, `var(--portal-border)`, `var(--portal-text)`).
- ✅ **Neo-Brutalist Utility Classes**: Use bold black borders (`border-2`, `border-3`, `border-4 border-black`), hard offset shadows (`shadow-neo-sm`, `shadow-neo`, `shadow-neo-lg`), and vibrant neon accents (`bg-portal-yellow`, `bg-portal-cyan`, `bg-portal-pink`, `bg-portal-lime`).
- ✅ **Mobile Ergonomics**: Ensure all buttons and interactive touch targets maintain a minimum dimension of $\ge 44 \times 44\text{px}$ with safe-area padding.

### 2.4. API Routes & Data Persistence
- ✅ **Serverless Route Handlers**: Implement clean Next.js 16 route handlers (`export async function GET/POST(req: Request)`) in `app/api/`.
- ✅ **Atomic Data Updates**: Use helper methods in `lib/db.ts` to perform safe, serialized read/write operations against `data/portal_db.json`.
- ✅ **Anti-Cheat Validation**: Implement server-side sanity checks (honeypots, max theoretical score limits per game) before committing scores to the database.

---

## 3. What AI CANNOT Do (Strictly Prohibited Actions)

### 3.1. External Libraries & Dependencies
- ❌ **NO Heavy Game Engines**: Do **NOT** install or import Phaser, PixiJS, Babylon.js, Three.js, Matter.js, or Kaboom.js. All games must remain lightweight HTML5 Canvas 2D implementations.
- ❌ **NO Audio Libraries**: Do **NOT** install Howler.js, Tone.js, or SoundJS. Use the native `AudioContext` engine in `lib/audio.ts`.
- ❌ **NO Utility Monoliths**: Do **NOT** install Lodash, Underscore, Moment.js, Axios, or jQuery. Use native JavaScript ES2022+ features.
- ❌ **NO External Media Files**: Do **NOT** introduce external `.mp3`, `.wav`, `.ogg`, `.mp4`, or large raster assets for game mechanics.

### 3.2. Design & Visual Integrity Violations
- ❌ **NO Soft Shadows or Glassmorphism Over-saturation**: Do **NOT** replace Neo-Brutalist hard shadows (`shadow-neo`) with soft blurry Gaussian shadows (`shadow-xl`, `shadow-2xl`) unless used for intentional cyber neon glow accents (`shadow-glow-cyan`).
- ❌ **NO Hardcoded Dark Surfaces in Shared Components**: Do **NOT** hardcode `bg-black`, `bg-slate-900`, or `text-white` inside reusable UI cards or modals without testing Light Theme (`html[data-theme="neo-light"]`). Always use theme tokens (`bg-portal-surface`, `bg-portal-card`, `text-portal-text`).
- ❌ **NO Landscape-Only Games Without Orientation Handlers**: Do **NOT** build games that break on vertical portrait viewports. If a game requires landscape, wrap it with an explicit orientation lock prompt.

### 3.3. Database & State Safety Violations
- ❌ **NO Destructive Database Truncation**: Never wipe or delete `data/portal_db.json` without preserving a local backup.
- ❌ **NO Client-Only Score Submission**: Never trust unverified client score payloads without server-side validation against `SCORE_LIMITS`.
- ❌ **NO Direct State Mutation**: Never mutate React state arrays/objects directly; always return new immutable copies.

### 3.4. Branding & Metadata
- ❌ **NO Rebranding**: Do **NOT** change the portal name from **Break Hub** to old legacy names (e.g., "StressBuster" or "Portal").
- ❌ **NO Removal of Developer Spotlight**: Do **NOT** remove or modify creator credits for **Munim Yeasin** in `DevSpotlightBanner.tsx`, `AboutSection.tsx`, or `PROJECT_MEMORY.md`.

---

## 4. Code Review Checklist for AI-Generated PRs

Before delivering any code, verify that:
1. [ ] `npm run build` passes without TypeScript or Next.js build errors.
2. [ ] The game runs smoothly at 60 FPS in a 9:16 portrait viewport.
3. [ ] All sound effects trigger through `lib/audio.ts` without console audio errors.
4. [ ] The component renders perfectly in both **Neo-Dark** and **Neo-Light** themes.
5. [ ] First-time players are prompted for a Gamer Tag before launching a game.
6. [ ] Scores submitted update the local XP, trigger quests, and sync to the leaderboard API.
