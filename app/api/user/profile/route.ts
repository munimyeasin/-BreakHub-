import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await db.getUserProfile(userId);
    if (!user) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, username, days_played, longest_streak, level, xp, unlocked_trophies, stats } = body;

    if (!userId && !username) {
      return NextResponse.json({ error: 'userId or username is required' }, { status: 400 });
    }

    let user = userId ? await db.getUserProfile(userId) : null;
    if (!user && username) {
      user = await db.findOrCreateUser(username);
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates: any = {};
    if (typeof days_played === 'number') updates.days_played = Math.max(0, days_played);
    if (typeof longest_streak === 'number') updates.longest_streak = Math.max(0, longest_streak);
    if (stats && typeof stats.totalGamesPlayed === 'number') updates.games_played = Math.max(0, stats.totalGamesPlayed);
    if (stats && typeof stats.totalScoreAccumulated === 'number') updates.total_score = Math.max(0, stats.totalScoreAccumulated);
    if (typeof level === 'number') updates.level = level;
    if (typeof xp === 'number') updates.xp = xp;
    if (unlocked_trophies) updates.unlocked_trophies = unlocked_trophies;
    if (stats) updates.stats = stats;

    const updatedUser = await db.saveUserProfile(user, updates);

    return NextResponse.json({ success: true, profile: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save user profile' }, { status: 500 });
  }
}
