import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { getMessageThread, listMessageConversations, sendMessage } from '@/lib/message-store';

function mapApiError(error: unknown) {
  if (error instanceof Error && error.message.includes("Could not find the table 'public.messages'")) {
    return 'Supabase table public.messages not found. Apply migration 004_auth_profiles_marketplace.sql.';
  }

  if (error instanceof Error && error.message.includes("Could not find the table 'public.app_users'")) {
    return 'Supabase table public.app_users not found. Apply migration 004_auth_profiles_marketplace.sql.';
  }

  return error instanceof Error ? error.message : 'Failed to load messages';
}

export async function GET(request: Request) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const counterpartId = (url.searchParams.get('with') ?? '').trim();

    if (counterpartId) {
      const messages = await getMessageThread(viewer.userId, counterpartId);
      return NextResponse.json({ messages });
    }

    const conversations = await listMessageConversations(viewer.userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json({ error: mapApiError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as {
      to?: string;
      content?: string;
      message?: { to?: string; content?: string };
    };

    const to = payload.message?.to ?? payload.to ?? '';
    const content = payload.message?.content ?? payload.content ?? '';
    const message = await sendMessage(viewer.userId, to, content);
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('cannot message self')) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('receiver not found')) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    return NextResponse.json({ error: mapApiError(error) }, { status: 500 });
  }
}
