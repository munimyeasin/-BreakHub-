---
name: spotlight-stretch-fix
description: Desktop SpotlightBanner grid collapses when stretched; fixed by switching items-center to items-stretch on the md:grid container
metadata:
  type: project
  originSessionId: 9c3c9e04-000b-4272-bcea-71f450fc9061
  modified: 2026-10-09T06:02:06.736Z
---

Commit `146bfbf` (main): `fix(spotlight): switch md:grid to items-stretch to prevent desktop collapse when stretched`.
Root cause: `items-center` on `hidden md:grid` let the grid shrink to tallest content instead of honoring `min-h-[320px] lg:min-h-[380px]`. `items-stretch` forces both 5-col and 7-col panes to fill the container.
Related to `components/games/SpotlightBanner.tsx:476`.

Why: User reported banner collapses/glitch out on PC desktop when window stretched. Screenshots showed only header bar visible on desktop width.
How to apply: Keep `items-stretch` on the desktop grid; if future changes revert it, the collapse returns. No abstraction added (ponytail: one line fix, no new component).
