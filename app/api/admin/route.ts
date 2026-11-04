import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { User } from '@/lib/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getPrimeAdminUsername(): string {
  return process.env.PRIME_ADMIN_USERNAME || 'Munim_yeasin';
}

function getPrimeAdminPassword(): string {
  return process.env.PRIME_ADMIN_PASSWORD || 'Tahida123';
}

function getAdminToken(): string {
  return process.env.ADMIN_SECRET || 'breakhub_admin_2026';
}

function authorized(req: NextRequest, suppliedSecret?: unknown, suppliedUsername?: unknown, suppliedPassword?: unknown): boolean {
  const primeUser = getPrimeAdminUsername();
  const primePass = getPrimeAdminPassword();
  const token = getAdminToken();

  if (suppliedSecret === token || suppliedSecret === primePass) return true;
  if (suppliedUsername && suppliedPassword) {
    if (String(suppliedUsername).trim() === primeUser && String(suppliedPassword) === primePass) {
      return true;
    }
    // Check standard admins in db
    const data = db.getRawData() as any;
    const admins = data.admins || [];
    const found = admins.find((a: any) => a.username.toLowerCase() === String(suppliedUsername).trim().toLowerCase() && a.password === String(suppliedPassword));
    if (found) return true;
  }
  const header = req.headers.get('authorization');
  return header === `Bearer ${token}` || header === `Bearer ${primePass}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Admin action failed';
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const username = searchParams.get('username');
  const password = searchParams.get('password');

  if (!authorized(req, secret, username, password)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access. Please login with correct credentials.' }, { status: 401 });
  }

  try {
    const data = db.getRawData() as any;
    if (!data.admins || data.admins.length === 0) {
      data.admins = [{ id: 'admin_prime', username: getPrimeAdminUsername(), password: getPrimeAdminPassword(), admin_role: 'prime' }];
    }
    const games = await db.getGames();
    const requests = await db.getGameRequests();
    return NextResponse.json({
      success: true,
      stats: { ...db.getAdminStats(), totalDeposits: (data.deposits || []).length, totalWithdrawals: (data.withdrawals || []).length, totalTournaments: (data.tournaments || []).length },
      games,
      users: data.users || [],
      scores: (data.scores || []).slice(-50).reverse(),
      requests,
      ratings: (data.ratings || []).slice(-50).reverse(),
      deposits: data.deposits || [],
      withdrawals: data.withdrawals || [],
      transactions: (data.transactions || []).slice(-100).reverse(),
      tournaments: data.tournaments || [],
      adminLogs: (data.adminLogs || []).slice(0, 100),
      settings: data.settings || {},
      admins: data.admins
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') return badRequest('Invalid request body');
    const { action, secret, username, password, ...payload } = body as Record<string, unknown>;

    if (!authorized(req, secret, username, password)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin action' }, { status: 401 });
    }
    if (typeof action !== 'string') return badRequest('Action is required');

    const id = (key: string): string => typeof payload[key] === 'string' ? payload[key] as string : '';
    const adminId = id('adminId') || 'admin';
    const data = db.getRawData() as any;
    if (!data.admins) data.admins = [{ id: 'admin_prime', username: getPrimeAdminUsername(), password: getPrimeAdminPassword(), admin_role: 'prime' }];
    if (!data.games) data.games = [];

    let result: unknown;

    switch (action) {
      case 'login': {
        const u = String(username || '').trim();
        const p = String(password || '');
        if (u.toLowerCase() === getPrimeAdminUsername().toLowerCase() && p === getPrimeAdminPassword()) {
          result = { username: u, role: 'prime' };
        } else {
          const found = data.admins.find((a: any) => a.username.toLowerCase() === u.toLowerCase() && a.password === p);
          if (found) {
            result = { username: found.username, role: found.admin_role || 'standard' };
          } else {
            return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
          }
        }
        break;
      }
      case 'update_game_status': {
        const gameId = id('gameId');
        const status = payload.status;
        if (!gameId || !['active', 'coming_soon', 'hidden'].includes(String(status))) return badRequest('Invalid game status payload');

        let allGames = await db.getGames();
        let game = allGames.find((item: any) => item.id === gameId || item.slug === gameId);
        if (!game) {
          game = (data.games || []).find((item: any) => item.id === gameId || item.slug === gameId);
        }
        if (!game) return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });

        game.status = status as any;
        const existingIdx = (data.games || []).findIndex((g: any) => g.id === game.id || g.slug === game.slug);
        if (existingIdx >= 0) {
          data.games[existingIdx].status = status;
        } else {
          data.games.push(game);
        }
        db.saveDatabase();
        result = game;
        break;
      }
      case 'save_game': {
        const gameId = id('id') || crypto.randomUUID();
        const title = id('title') || 'Untitled Game';
        const category = (id('category') || 'Action').toUpperCase() as any;
        const thumbnail_url = id('thumbnail_url') || '/thumbnails/cyber-fruit-merge.svg';
        const existing = (data.games || []).find((g: any) => g.id === gameId);
        if (existing) {
          existing.title = title;
          existing.category = category;
          existing.thumbnail_url = thumbnail_url;
          result = existing;
        } else {
          const newGame = {
            id: gameId,
            slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            title,
            category,
            thumbnail_url,
            description: 'Custom added arcade game.',
            status: 'active' as const
          };
          data.games.push(newGame);
          result = newGame;
        }
        db.saveDatabase();
        break;
      }
      case 'delete_game': {
        const gameId = id('gameId');
        data.games = (data.games || []).filter((g: any) => g.id !== gameId && g.slug !== gameId);
        db.saveDatabase();
        result = { id: gameId };
        break;
      }
      case 'add_admin': {
        const newUsername = id('newUsername') || id('username');
        const newPassword = id('newPassword') || id('password');
        if (!newUsername || !newPassword) return badRequest('Username and password required');

        // Check if username exists
        const exists = data.admins.some((a: any) => a.username.toLowerCase() === newUsername.toLowerCase());
        if (exists) return badRequest('Username already exists');

        const newAdmin = { id: crypto.randomUUID(), username: newUsername, password: newPassword, admin_role: 'standard' };
        data.admins.push(newAdmin);
        db.saveDatabase();
        result = newAdmin;
        break;
      }
      case 'update_admin_password': {
        const targetUsername = id('username');
        const newPassword = id('newPassword');
        if (!targetUsername || !newPassword) return badRequest('Username and new password required');
        const admin = data.admins.find((a: any) => a.username.toLowerCase() === targetUsername.toLowerCase());
        if (!admin) return badRequest('Admin not found');
        admin.password = newPassword;
        db.saveDatabase();
        result = { username: admin.username };
        break;
      }
      case 'delete_admin': {
        const adminId = id('adminId');
        data.admins = data.admins.filter((a: any) => a.id !== adminId && a.admin_role !== 'prime');
        db.saveDatabase();
        result = { id: adminId };
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
      case 'delete_score': {
        data.scores = (data.scores || []).filter((score: any) => score.id !== id('scoreId'));
        db.saveDatabase();
        result = { id: id('scoreId') };
        break;
      }
      case 'delete_user': {
        const userId = id('userId');
        data.users = (data.users || []).filter((user: any) => user.id !== userId);
        data.scores = (data.scores || []).filter((score: any) => score.user_id !== userId);
        db.saveDatabase();
        result = { id: userId };
        break;
      }
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
      case 'add_admin_log':
        result = db.addAdminLog(adminId, id('logAction') || 'admin_action', id('targetId') || undefined);
        break;
      default:
        return badRequest('Unknown admin action');
    }

    if (action !== 'add_admin_log' && action !== 'login') db.addAdminLog(adminId, action, id('userId') || id('tournamentId') || undefined);
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = errorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: message.endsWith('not found') ? 404 : 400 });
  }
}
