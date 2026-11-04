import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // Simple security check for admin access (can be customized or secured via session cookie)
    const adminToken = process.env.ADMIN_SECRET || 'breakhub_admin_2026';
    if (secret !== adminToken && process.env.NODE_ENV === 'production') {
      // In development or if not strictly enforced, allow or check header
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${adminToken}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
      }
    }

    const games = await db.getGames();
    const requests = await db.getGameRequests();
    const globalLeaderboard = await db.getGlobalLeaderboard(100);

    // Collect all scores and users
    const data = db.getRawData();
    const scores = data.scores || [];
    const users = data.users || [];
    const ratings = (data as any).ratings || [];

    return NextResponse.json({
      success: true,
      stats: db.getAdminStats(),
      games,
      users,
      scores: scores.slice(-50).reverse(), // recent 50
      requests,
      ratings: ratings.slice(-50).reverse()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch admin dashboard stats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, secret, ...payload } = body;

    const adminToken = process.env.ADMIN_SECRET || 'breakhub_admin_2026';
    if (secret !== adminToken && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized admin action' }, { status: 401 });
    }

    if (action === 'update_game_status') {
      const { gameId, status } = payload;
      const games = await db.getGames();
      const game = games.find(g => g.id === gameId || g.slug === gameId);
      if (!game) {
        return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
      }
      game.status = status;
      // save to db
      (db as any).saveDatabase?.();
      return NextResponse.json({ success: true, game });
    }

    if (action === 'update_request_status') {
      const { requestId, status } = payload;
      const requests = await db.getGameRequests();
      const reqItem = requests.find(r => r.id === requestId);
      if (!reqItem) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }
      reqItem.status = status;
      (db as any).saveDatabase?.();
      return NextResponse.json({ success: true, request: reqItem });
    }

    if (action === 'delete_score') {
      const { scoreId } = payload;
      if ((db as any).data?.scores) {
        (db as any).data.scores = (db as any).data.scores.filter((s: any) => s.id !== scoreId);
        (db as any).saveDatabase?.();
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_user') {
      const { userId } = payload;
      if ((db as any).data?.users) {
        (db as any).data.users = (db as any).data.users.filter((u: any) => u.id !== userId);
        (db as any).data.scores = (db as any).data.scores.filter((s: any) => s.user_id !== userId);
        (db as any).saveDatabase?.();
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown admin action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Admin action failed' }, { status: 500 });
  }
}
