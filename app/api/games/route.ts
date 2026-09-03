import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const games = db.getGames();
    return NextResponse.json({ success: true, games }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch games' }, { status: 500 });
  }
}
