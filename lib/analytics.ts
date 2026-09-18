import { track } from '@vercel/analytics';

const CONSENT_STORAGE_KEY = 'stressbuster_cookie_consent_v1';

/**
 * Checks if user has given consent for analytics tracking
 */
function isAnalyticsAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return true; // Default allowed unless explicitly disabled
    const parsed = JSON.parse(raw);
    return parsed.analytics !== false;
  } catch {
    return true;
  }
}

/**
 * Track game launch event
 */
export function trackGameLaunch(gameSlug: string, gameTitle: string) {
  if (!isAnalyticsAllowed()) return;
  try {
    track('game_launch', {
      game_slug: gameSlug,
      game_title: gameTitle,
      timestamp: new Date().toISOString(),
    });
  } catch {}
}

/**
 * Track score submission
 */
export function trackScoreSubmitted(gameSlug: string, score: number, isHighScore = false) {
  if (!isAnalyticsAllowed()) return;
  try {
    track('score_submitted', {
      game_slug: gameSlug,
      score,
      is_high_score: isHighScore,
    });
  } catch {}
}

/**
 * Track visual theme changes
 */
export function trackThemeChange(themeName: string) {
  if (!isAnalyticsAllowed()) return;
  try {
    track('theme_changed', {
      theme: themeName,
    });
  } catch {}
}

/**
 * Track daily quest completion
 */
export function trackQuestCompleted(questId: string, xpAwarded: number) {
  if (!isAnalyticsAllowed()) return;
  try {
    track('quest_completed', {
      quest_id: questId,
      xp: xpAwarded,
    });
  } catch {}
}

/**
 * Track trophy unlock celebration
 */
export function trackTrophyUnlocked(trophyTitle: string) {
  if (!isAnalyticsAllowed()) return;
  try {
    track('trophy_unlocked', {
      trophy: trophyTitle,
    });
  } catch {}
}
