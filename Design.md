# 🎨 Break Hub — Design System, Themes & Typography Specification

> **Document Version**: 1.0.0  
> **Visual Identity**: High-Contrast Neo-Brutalism × Cyberpunk Retro Arcade  
> **Core Tenet**: Tactile physical borders, zero-blur drop shadows, electric neon accents, and universal 9:16 portrait viewport standard.  

---

## 1. Design Philosophy

Break Hub's visual language combines two distinct design aesthetics:
1. **Neo-Brutalism**: Heavy pitch-black solid borders (`2px–4px`), hard offset box-shadows without Gaussian blur, high-contrast flat surfaces, and unapologetic geometric structure.
2. **Cyberpunk Retro Arcade**: Electric high-voltage neon colors, dot-matrix background grids, glowing laser accents, holographic trophies, and pixelated HUD telemetry.

---

## 2. Color Palette & Token Architecture

### 2.1. Theme Tokens (CSS Custom Properties)

```css
/* ==========================================================================
   THEME 1: DARK NEO-BRUTALIST (DEFAULT)
   html[data-theme="neo-dark"]
   ========================================================================== */
--portal-bg: #0B0819;              /* Deep Midnight Violet Base */
--portal-surface: #130F26;         /* Elevated Surface Panel */
--portal-card: #1C1635;            /* Interactive Card Background */
--portal-border: #2A224D;          /* Structural Section Border */
--portal-text: #FFFFFF;            /* High-Contrast Crisp White Text */
--portal-text-muted: #94A3B8;      /* Slate Subtitle & Meta Text */
--portal-dot-color: rgba(255, 255, 255, 0.12); /* Subtle Cyber Dot Grid */
--portal-grid-color: rgba(255, 255, 255, 0.05);/* Cyber Matrix Grid */

/* ==========================================================================
   THEME 2: LIGHT NEO-BRUTALIST (RETRO VINTAGE PAPER)
   html[data-theme="neo-light"]
   ========================================================================== */
--portal-bg: #FFFDF0;              /* Warm Cream Vintage Paper Ground */
--portal-surface: #FFFFFF;         /* Crisp White Card Container */
--portal-card: #FFF8E7;            /* Warm Off-White Accent Surface */
--portal-border: #000000;          /* Bold Pitch-Black Physical Border */
--portal-text: #000000;            /* High-Legibility Solid Black Text */
--portal-text-muted: #475569;      /* Charcoal Secondary Text */
--portal-dot-color: rgba(0, 0, 0, 0.12);       /* Tactile Newsprint Dot Grid */
--portal-grid-color: rgba(0, 0, 0, 0.06);      /* Architectural Grid Lines */
```

---

### 2.2. Vibrant Neon Accent Spectrum

These high-saturation accent colors are used consistently across buttons, badges, game lasers, and rank indicators:

| Token Name | Hex Code | Visual Swatch | Primary Role / Usage |
| :--- | :--- | :--- | :--- |
| `portal.cyan` | `#00F0FF` | Electric Cyan | Primary actions, Play buttons, active tabs, laser beams. |
| `portal.yellow` | `#FFE600` | Cyber Yellow | XP badges, streak flames, level progression, callouts. |
| `portal.pink` | `#FF4081` | Hot Neo Pink | Favorites toggle, Hype engine, hazard warnings, combo multiplier. |
| `portal.lime` | `#A3E635` | Acid Lime | Success states, online status, quest completions, shield buffs. |
| `portal.purple` | `#C084FC` | Vivid Lilac | Mystery items, roulette triggers, trophy highlights. |
| `portal.orange` | `#FF6B00` | Safety Orange | High-danger warnings, countdown sirens, nitro boosts. |
| `portal.neon` | `#9D00FF` | Neon Violet | Holographic overlays, black hole vortexes, boss cards. |

---

### 2.3. Leaderboard & Achievement Metals

| Tier | Hex Code | Visual Role |
| :--- | :--- | :--- |
| **Gold (1st Place)** | `#FFD700` | Top rank podium, Platinum/Gold trophies, master badges. |
| **Silver (2nd Place)** | `#E2E8F0` | Runner-up podium, Silver trophy tier. |
| **Bronze (3rd Place)** | `#CD7F32` | 3rd place podium, Bronze trophy tier. |

---

## 3. Borders, Shadows & Physical Elevation

Neo-Brutalism rejects soft diffuse shadows. All depth is communicated through **solid, hard-edged offset drop shadows**:

```css
/* Standard Neo-Brutalist Box Shadows */
.shadow-neo-sm   { box-shadow: 2px 2px 0px 0px #000000; }
.shadow-neo      { box-shadow: 4px 4px 0px 0px #000000; }
.shadow-neo-lg   { box-shadow: 6px 6px 0px 0px #000000; }
.shadow-neo-xl   { box-shadow: 8px 8px 0px 0px #000000; }

/* Colored Accent Shadows (for active/hover states) */
.shadow-neo-yellow { box-shadow: 4px 4px 0px 0px #FFE600; }
.shadow-neo-cyan   { box-shadow: 4px 4px 0px 0px #00F0FF; }
.shadow-neo-pink   { box-shadow: 4px 4px 0px 0px #FF4081; }
.shadow-neo-lime   { box-shadow: 4px 4px 0px 0px #A3E635; }

/* Cyber Glow Accents */
.shadow-glow-cyan   { box-shadow: 0 0 20px -3px rgba(0, 240, 255, 0.45); }
.shadow-glow-purple { box-shadow: 0 0 25px -3px rgba(157, 0, 255, 0.45); }
.shadow-glow-gold   { box-shadow: 0 0 25px 0px rgba(255, 215, 0, 0.4); }
```

### Interactive Button States:
- **Resting**: `border-2 border-black shadow-neo translate-x-0 translate-y-0`
- **Hover**: `shadow-neo-lg -translate-x-0.5 -translate-y-0.5 transition-all`
- **Active / Press**: `shadow-none translate-x-1 translate-y-1` (simulates physical button press).

---

## 4. Typography & Font Hierarchy

### 4.1. Font Families
- **Primary Body & UI**: High-legibility modern system font stack:  
  `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`
- **Monospace Telemetry & Scores**: High-density numerical monospace font for timer countdowns, high scores, coordinates, and telemetry:  
  `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`

### 4.2. Typographic Scale

| Level | Size | Weight | Tracking / Transform | Example Application |
| :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | `2.25rem – 3.0rem` (36–48px) | `font-black` (900) | `uppercase tracking-wider` | Portal Title, Hero Banners, Level Up titles. |
| **Modal Header** | `1.5rem – 1.875rem` (24–30px)| `font-black` (900) | `uppercase tracking-wide` | Game Titles, Leaderboard Heading, Quests. |
| **Card Title** | `1.125rem – 1.25rem` (18–20px)| `font-bold` (700) | `tracking-tight` | Game Card titles, Spotlight cards. |
| **Telemetry / Score**| `1.0rem – 1.25rem` (16–20px) | `font-mono font-black`| `tabular-nums` | High scores, Timer countdowns, XP badges. |
| **Body Text** | `0.875rem – 1.0rem` (14–16px) | `font-medium` (500)| `leading-relaxed` | Game descriptions, Quest objectives, Privacy. |
| **Micro Badges** | `0.6875rem – 0.75rem` (11–12px)| `font-bold` (700) | `uppercase tracking-widest`| Genre chips (`PUZZLE`), Rarity tags (`GOLD`). |

---

## 5. Viewport & Spatial Grid Architecture

### 5.1. Universal 9:16 Portrait Standard
Every arcade game runs on a standardized **9:16 portrait viewport** (`aspect-[9/16]`, `max-w-[380px]`):
- **Virtual Coordinate Resolution**: `360 px (width) × 640 px (height)`.
- **Responsive Canvas Scaling**: The canvas dynamically scales via CSS while preserving the internal $360 \times 640$ coordinate system. All game physics, entity spawns, and touch collisions calculate against these normalized units.
- **Ultra-Slim Single-Line HUD**: Top in-game HUDs use compact padding (`py-1.5 px-3 mb-1.5 rounded-xl bg-portal-surface/90`) to dedicate $90\%+$ of screen height to active gameplay.

### 5.2. Responsive Grid System
- **Mobile (< 768px)**: 3-column compact card layout (`grid-cols-3` in `GameGrid.tsx`) with micro-badges and high-density typography.
- **Tablet / Laptop (768px – 1280px)**: 4 to 5 columns with expanded artwork previews.
- **Desktop (≥ 1280px)**: 6 columns with dual-pane sticky sidebar navigation.

---

## 6. Procedural Audio Synthesis Parameters

Sound effects are defined by mathematical oscillator parameters in `lib/audio.ts`:

```typescript
// Sample Synthesis Specifications:
LaserBlast: {
  oscillator: 'sawtooth',
  startFreq: 880,   // Hz
  endFreq: 110,     // Exponential pitch plunge
  duration: 0.12,   // seconds
  gainStart: 0.3,
  gainEnd: 0.0001
}

LevelUpFanfare: {
  oscillator: 'triangle',
  frequencies: [523.25, 659.25, 783.99, 1046.50, 1318.51], // C5, E5, G5, C6, E6
  stepDuration: 0.08,
  reverbDecay: 0.4
}
```
