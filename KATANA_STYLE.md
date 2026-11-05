# Katana Slicer Visual Language

Reference: `public/thumbnails/cyber-slicer.svg` + `components/games/CyberSlicerGame.tsx`.
Apply this language to every game listed below. Keep gameplay, layout, and
logic untouched — only graphics/colors/effects change.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `bg-deep` | `#18000F` | main canvas background |
| `bg-mid` | `#2A0518` | gradient mid stop |
| `bg-dark` | `#070014` | gradient end stop / panel base |
| `bg-panel` | `#140516` | framed playfield base |
| `neon-magenta` | `#FF007F` | primary accent, slashes, hazards |
| `neon-pink` | `#FF63C6` | secondary accent |
| `neon-cyan` | `#00F0FF` | primary glow, coins, UI |
| `neon-blue` | `#00D0FF` | cyan variant |
| `gold` | `#FFF570` | badges, stars, titles |
| `gold-bright` | `#FFE600` | gold mid |
| `gold-dark` | `#D49B00` | gold shadow |
| `steel-light` | `#E2E8F0` | specular |
| `steel-mid` | `#94A3B8` | steel body |
| `steel-dark` | `#475569` | steel shadow |
| `black` | `#000000` | all outlines, drop shadows |
| `grid-white` | `#FFFFFF` | backdrop grid @ 0.12 opacity |
| `stage-grid` | `#3D1030` | arena grid lines |
| `molten-white` | `#FFFFFF` | cut interior core |
| `molten-gold` | `#FFE600` | cut interior core |
| `molten-magenta` | `#FF007F` | cut interior core |

## Background recipe (every canvas)

1. Fill `#18000F`.
2. Linear gradient 0→100%: `#18000F` → `#2A0518` → `#070014` (vertical or diagonal).
3. Radial glow at center: `rgba(255,0,127,0.18)` → `rgba(0,240,255,0.10)` → transparent,
   radius ~ 0.75 × canvas width.
4. White cyber grid: horizontal + vertical lines every 40–50px, `#FFFFFF` opacity 0.12,
   stroke-width 1.5, dashed `4,3` is fine.

## Shape recipe (3D isometric brutalist)

Every discrete object gets:

1. **Hard drop shadow** — `ctx.fillStyle = '#000000'`, same shape translated `(+3..5, +3..5)`, drawn first.
2. **Extruded side** — dark-shaded side polygon (use the shape's darker side color), offset `+8,+8`, black stroke 2.5.
3. **Front face** — linear gradient bright→dark (top-left to bottom-right), black stroke 2.8.
4. **Specular highlight** — white polygon/rect at `globalAlpha 0.85`, top-left corner.
5. **Center node** — small black dot for circuit feel.

Use `ctx.shadowColor` + `ctx.shadowBlur` only for neon glows, never for the base shadow.

## Neon glow recipe

```
ctx.shadowColor = '#FF007F'; ctx.shadowBlur = 12;
// draw shape
ctx.shadowBlur = 0;
```

## Badges / ribbons

- **Action badge**: 16-point gold starburst (`#FFF066`→`#FFE600`), black stroke 2.6,
  black text in `Impact, Arial Black, sans-serif`.
- **Tag ribbon**: rounded rect `#FF007F` (or `#FFDE59` for gold), black stroke 2.5–3.5,
  white/black text, letter-spacing 1.2.
