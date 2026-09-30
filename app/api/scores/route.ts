import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { INITIAL_GAMES } from '@/lib/gamesData';
import { censorText } from '@/lib/censor';

export const dynamic = 'force-dynamic';

interface ScorePayload {
  gameId: string;
  username: string;
  score: number;
  honeypot?: string; // Bot protection
  timestamp?: number;
}

// In-memory sliding window rate limiter
const ipRequestHistory = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 30_000; // 30 seconds
const MAX_REQUESTS_PER_WINDOW = 20;

// Maximum realistic score limits per game to protect leaderboard integrity
const MAX_SCORE_LIMITS: Record<string, number> = {
  g_merge_25: 500_000,
  g_missile_21: 500_000,
  g_chess_24: 50_000,
  g_tetris_20: 500_000,
  g_candy_19: 500_000,
  g_battleship_18: 20_000,
  g_blackhole_17: 50_000,
  g_sweeper_16: 100_000,
  g_maze_15: 100_000,
  g_multi_xo_13: 50_000,
  g_paper_12: 200_000,
  g_slicer_11: 150_000,
  g_geometry_10: 200_000,
  g_reflex_09: 100_000,
  g_breaker_08: 250_000,
  g_shooter_07: 250_000,
  g_action_06: 150_000,
  g_card_05: 500_000,
  g_tap_04: 50_000,
  g_ttt_03: 50_000,
  g_flip_02: 100_000,
  g_snake_01: 150_000,
};

function sanitizeUsername(input: string): string {
  return input
    .replace(/[<>'"&;/\\`]/g, '') // Strip dangerous characters
    .trim()
    .slice(0, 20);
}

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const history = ipRequestHistory.get(identifier) || [];
  const validHistory = history.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validHistory.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  validHistory.push(now);
  ipRequestHistory.set(identifier, validHistory);

  // Periodic cleanup if map grows too large
  if (ipRequestHistory.size > 2000) {
    for (const [key, timestamps] of ipRequestHistory.entries()) {
      if (timestamps.every((t) => now - t > RATE_LIMIT_WINDOW_MS)) {
        ipRequestHistory.delete(key);
      }
    }
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. IP / Client Rate Limiting
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a few seconds before submitting scores.' },
        { status: 429 }
      );
    }

    const body: ScorePayload = await req.json();
    const { gameId, username, score, honeypot } = body;

    // 2. Anti-Bot Honeypot Trap
    if (honeypot && typeof honeypot === 'string' && honeypot.trim().length > 0) {
      // Silently reject automated bot submissions
      return NextResponse.json(
        { error: 'Submission rejected by security policy' },
        { status: 400 }
      );
    }

    // 3. Validation on Game ID
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Valid gameId is required' }, { status: 400 });
    }

    const matchedGame = INITIAL_GAMES.find((g) => g.id === gameId || g.slug === gameId);
    if (!matchedGame) {
      return NextResponse.json({ error: 'Unrecognized game title' }, { status: 400 });
    }

    // 4. Validation on Username
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const cleanUsername = censorText(sanitizeUsername(username));
    if (cleanUsername.length < 2 || cleanUsername.length > 20) {
      return NextResponse.json(
        { error: 'Gamer tag must be between 2 and 20 alphanumeric characters' },
        { status: 400 }
      );
    }

    // 5. Validation on Score
    if (typeof score !== 'number' || isNaN(score) || !isFinite(score) || score < 0) {
      return NextResponse.json({ error: 'Valid positive score number is required' }, { status: 400 });
    }

    const maxAllowed = MAX_SCORE_LIMITS[matchedGame.id] || MAX_SCORE_LIMITS[gameId] || 1_000_000;
    if (score > maxAllowed) {
      return NextResponse.json(
        { error: `Score exceeds verified maximum threshold for this arcade module (${maxAllowed})` },
        { status: 400 }
      );
    }

    // 6. Record verified score
    const result = db.submitScore(matchedGame.id, cleanUsername, Math.round(score));

    return NextResponse.json(
      {
        success: true,
        message: 'Score recorded successfully',
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit score' },
      { status: 500 }
    );
  }
}
