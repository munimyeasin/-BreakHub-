import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { sanitizeGameRequest, censorText } from '@/lib/censor';

export const dynamic = 'force-dynamic';

const VALID_GENRES = ['ACTION', 'PUZZLE', 'ARCADE', 'STRATEGY', 'CARD', 'OTHER'] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const genre = searchParams.get('genre');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'upvotes'; // 'upvotes' | 'recent'

    let requests = db.getGameRequests();

    if (genre && genre !== 'ALL') {
      requests = requests.filter(r => r.genre.toUpperCase() === genre.toUpperCase());
    }

    if (status && status !== 'ALL') {
      requests = requests.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }

    if (sort === 'recent') {
      requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // Default: sort by upvotes descending, then recent
      requests.sort((a, b) => {
        if (b.upvotes !== a.upvotes) {
          return b.upvotes - a.upvotes;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch game requests' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'create' } = body;

    // UPVOTE ACTION
    if (action === 'upvote') {
      const { requestId, username } = body;
      if (!requestId || typeof requestId !== 'string') {
        return NextResponse.json({ error: 'Valid requestId is required' }, { status: 400 });
      }
      if (!username || typeof username !== 'string' || !username.trim()) {
        return NextResponse.json({ error: 'Gamer tag username is required to upvote' }, { status: 400 });
      }

      const result = db.upvoteGameRequest(requestId, username.trim());
      return NextResponse.json({
        success: true,
        requestId,
        upvotes: result.upvotes,
        isUpvoted: result.isUpvoted,
        request: result.request
      });
    }

    // CREATE ACTION
    const { title, genre, description, username, hp_code } = body;

    // 1. Anti-Spam Honeypot Check (Hidden bot trap)
    if (hp_code) {
      return NextResponse.json({ error: 'Bot signature detected' }, { status: 400 });
    }

    // 2. Validation & Content Moderation
    if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 60) {
      return NextResponse.json({ error: 'Game title must be between 3 and 60 characters' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 350) {
      return NextResponse.json({ error: 'Description must be between 10 and 350 characters' }, { status: 400 });
    }

    const cleanGenre = (genre || 'ARCADE').toUpperCase();
    if (!VALID_GENRES.includes(cleanGenre as any)) {
      return NextResponse.json({ error: 'Invalid game genre selected' }, { status: 400 });
    }

    const cleanUsername = censorText((username || '').trim());
    if (!cleanUsername) {
      return NextResponse.json({ error: 'Gamer tag username is required' }, { status: 400 });
    }

    // Apply profanity moderation filter
    const sanitized = sanitizeGameRequest(title.trim(), description.trim());

    // 3. Duplicate check (same user requesting exact same title recently)
    const existing = db.getGameRequests();
    const isDuplicate = existing.some(
      r => r.title.toLowerCase() === sanitized.title.toLowerCase() &&
           r.requested_by.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (isDuplicate) {
      return NextResponse.json({ error: 'You have already submitted a request with this title' }, { status: 409 });
    }

    // 4. Save sanitized request
    const newRequest = db.addGameRequest(
      sanitized.title,
      cleanGenre as any,
      sanitized.description,
      cleanUsername
    );

    return NextResponse.json({
      success: true,
      request: newRequest,
      wasCensored: sanitized.wasCensored
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process game request' },
      { status: 500 }
    );
  }
}
