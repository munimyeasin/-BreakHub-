import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseServer } from '@/lib/supabaseServer';
import type { User } from '@/lib/types';

export const dynamic = 'force-dynamic';

const getAdminToken = (): string | undefined => process.env.ADMIN_SECRET || (process.env.NODE_ENV === 'development' ? 'breakhub_admin_2026' : undefined);

function authorized(req: NextRequest, suppliedSecret?: unknown): boolean {
  const token = getAdminToken();
  if (!token) return false;
  const header = req.headers.get('authorization');
  return suppliedSecret === token || header === `Bearer ${token}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Admin action failed';
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function GET(req: NextRequest) {
  if (!authorized(req, new URL(req.url).searchParams.get('secret'))) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
  }

  try {
    const data = db.getRawData();
    const games = await db.getGames();
    const requests = await db.getGameRequests();
    return NextResponse.json({
      success: true,
      stats: { ...db.getAdminStats(), totalDeposits: data.deposits.length, totalWithdrawals: data.withdrawals.length, totalTournaments: data.tournaments.length },
      games,
      users: data.users,
      scores: data.scores.slice(-50).reverse(),
      requests,
      ratings: ((data as typeof data & { ratings?: unknown[] }).ratings || []).slice(-50).reverse(),
      deposits: data.deposits,
      withdrawals: data.withdrawals,
      transactions: data.transactions.slice(-100).reverse(),
      tournaments: data.tournaments,
      adminLogs: data.adminLogs.slice(0, 100),
      settings: ((data as typeof data & { settings?: Record<string, string> }).settings || {})
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') return badRequest('Invalid request body');
    const { action, secret, ...payload } = body as Record<string, unknown>;
    if (!authorized(req, secret)) return NextResponse.json({ success: false, error: 'Unauthorized admin action' }, { status: 401 });
    if (typeof action !== 'string') return badRequest('Action is required');

    const id = (key: string): string => typeof payload[key] === 'string' ? payload[key] as string : '';
    const adminId = id('adminId') || 'admin';
    let result: unknown;

    switch (action) {
      case 'update_game_status': {
        const gameId = id('gameId');
        const status = payload.status;
        if (!gameId || !['active', 'coming_soon', 'hidden'].includes(String(status))) return badRequest('Invalid game status payload');
        const games = await db.getGames();
        const game = games.find(item => item.id === gameId || item.slug === gameId);
        if (!game) return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
        game.status = status as typeof game.status;
        db.saveDatabase();
        try { await supabaseServer.from('games').update({ status }).eq('id', game.id); } catch { /* local database remains authoritative fallback */ }
        result = game;
        break;
      }
      case 'update_request_status': {
        const request = (await db.getGameRequests()).find(item => item.id === id('requestId'));
        if (!request) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
        if (!['under_review', 'planned', 'in_development', 'completed', 'declined'].includes(String(payload.status))) return badRequest('Invalid request status');
        request.status = payload.status as typeof request.status;
        db.saveDatabase();
        result = request;
        break;
      }
      case 'update_user_status': {
        const status = payload.status;
        if (!['active', 'blocked'].includes(String(status))) return badRequest('Invalid user status');
        result = db.adminUpdateUserStatus(id('userId'), status as User['status']);
        break;
      }
      case 'process_deposit':
        if (payload.status !== 'completed' && payload.status !== 'failed') return badRequest('Invalid deposit status');
        result = db.adminProcessDeposit(id('depositId'), payload.status);
        break;
      case 'process_withdrawal':
        if (payload.status !== 'completed' && payload.status !== 'failed') return badRequest('Invalid withdrawal status');
        result = db.adminProcessWithdrawal(id('withdrawalId'), payload.status);
        break;
      case 'create_tournament': {
        const name = id('name');
        const entryFee = Number(payload.entry_fee);
        const prizePool = Number(payload.prize_pool);
        if (!name || !Number.isFinite(entryFee) || !Number.isFinite(prizePool) || typeof payload.start_date !== 'string') return badRequest('Invalid tournament payload');
        result = db.adminCreateTournament({ name, entry_fee: entryFee, prize_pool: prizePool, start_date: payload.start_date });
        break;
      }
      case 'delete_tournament':
        db.adminDeleteTournament(id('tournamentId'));
        result = { id: id('tournamentId') };
        break;
      case 'delete_score': {
        const data = db.getRawData();
        data.scores = data.scores.filter(score => score.id !== id('scoreId'));
        db.saveDatabase();
        result = { id: id('scoreId') };
        break;
      }
      case 'delete_user': {
        const userId = id('userId');
        const data = db.getRawData();
        data.users = data.users.filter(user => user.id !== userId);
        data.scores = data.scores.filter(score => score.user_id !== userId);
        data.deposits = data.deposits.filter(item => item.user_id !== userId);
        data.withdrawals = data.withdrawals.filter(item => item.user_id !== userId);
        data.transactions = data.transactions.filter(item => item.user_id !== userId);
        db.saveDatabase();
        result = { id: userId };
        break;
      }
      case 'update_settings':
        result = { upiId: id('upiId') };
        break;
      case 'add_admin_log':
        result = db.addAdminLog(adminId, id('logAction') || 'admin_action', id('targetId') || undefined);
        break;
      default:
        return badRequest('Unknown admin action');
    }

    if (action !== 'add_admin_log') db.addAdminLog(adminId, action, id('userId') || id('depositId') || id('withdrawalId') || id('tournamentId') || undefined);
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = errorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: message.endsWith('not found') ? 404 : 400 });
  }
}
