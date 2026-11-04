---
name: pending-hidden-games-fix
description: Fix client-side game catalog fetch to respect hidden status from admin panel
metadata:
  type: project
---

**Why:** The frontend in `app/page.tsx` was initializing `games` with static `INITIAL_GAMES` instead of fetching from `/api/games`, meaning games marked as `hidden` or modified via the admin panel were not reflected on the homepage grid.
**How applied:** 
1. Added a `useEffect` in `app/page.tsx` to fetch games from `/api/games` on client mount.
2. Updated `setGames(data.games)` so client state honors live database statuses (`active`, `coming_soon`, `hidden`).
3. Verified filtered games correctly filter out `hidden` games and tested successfully with production build.
