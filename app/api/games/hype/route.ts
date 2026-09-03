import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, increment = true } = body;
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Valid gameId is required' }, { status: 400 });
    }

    const newHypeCount = db.toggleHypeCount(gameId, Boolean(increment));
    return NextResponse.json({ success: true, hypeCount: newHypeCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update hype count' }, { status: 500 });
  }
}
