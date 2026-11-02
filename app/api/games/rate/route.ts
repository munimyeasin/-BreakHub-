import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, username, rating } = body;

    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Valid gameId is required' }, { status: 400 });
    }

    let finalUsername = typeof username === 'string' && username.trim() ? username.trim() : 'Player';

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    const result = await db.rateGame(gameId, finalUsername, Math.round(numRating));

    return NextResponse.json({
      success: true,
      gameId,
      rating: result.rating,
      rating_count: result.rating_count,
      userRating: result.userRating,
      isUpdate: result.isUpdate
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit game rating' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');
    const username = searchParams.get('username');

    if (!gameId) {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    const userRating = username ? await db.getUserRating(gameId, username) : null;
    const game = await db.getGameById(gameId);

    return NextResponse.json({
      success: true,
      gameId,
      rating: game?.rating || 0,
      rating_count: game?.rating_count || 0,
      userRating
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get game rating' },
      { status: 500 }
    );
  }
}
