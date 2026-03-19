import { NextResponse } from 'next/server';

import { searchAppUsers } from '@/lib/app-user-store';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') ?? '';
    const interest = url.searchParams.get('interest') ?? '';
    const role = url.searchParams.get('role') ?? '';

    const profiles = await searchAppUsers(query, interest, role);
    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({ error: 'Failed to search profiles' }, { status: 500 });
  }
}
