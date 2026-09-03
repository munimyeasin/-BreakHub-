import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');

    if (gameId && gameId !== 'global') {
      const leaderboard = db.getPerGameLeaderboard(gameId, 10);
      const game = db.getGameById(gameId);
      return NextResponse.json({
        type: 'game',
        gameId,
        gameTitle: game?.title || 'Mini Game',
        leaderboard
      }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    } else {
      const leaderboard = db.getGlobalLeaderboard(50);
      return NextResponse.json({
        type: 'global',
        leaderboard
      }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
