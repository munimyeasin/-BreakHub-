import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId } = body;
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Valid gameId is required' }, { status: 400 });
    }

    const newPlayCount = db.incrementPlayCount(gameId);
    return NextResponse.json({ success: true, playCount: newPlayCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to increment play count' }, { status: 500 });
  }
}
