import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { oldUsername, newUsername } = body;

    if (!newUsername || typeof newUsername !== 'string') {
      return NextResponse.json({ error: 'Valid new username is required' }, { status: 400 });
    }

    const result = db.updateUsername(oldUsername || '', newUsername);
    return NextResponse.json({ success: true, user: result.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update username' }, { status: 500 });
  }
}
