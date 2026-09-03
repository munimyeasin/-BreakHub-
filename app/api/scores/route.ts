import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

interface ScorePayload {
  gameId: string;
  username: string;
  score: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: ScorePayload = await req.json();
    const { gameId, username, score } = body;

    // Validation
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Valid gameId is required' }, { status: 400 });
    }
    if (!username || typeof username !== 'string' || username.trim().length < 2 || username.length > 20) {
      return NextResponse.json({ error: 'Username must be between 2 and 20 characters' }, { status: 400 });
    }
    if (typeof score !== 'number' || isNaN(score) || score < 0 || score > 1_000_000) {
      return NextResponse.json({ error: 'Valid positive score number is required' }, { status: 400 });
    }

    const result = db.submitScore(gameId, username, score);

    return NextResponse.json({
      success: true,
      message: 'Score recorded successfully',
      data: result
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit score' }, { status: 500 });
  }
}
