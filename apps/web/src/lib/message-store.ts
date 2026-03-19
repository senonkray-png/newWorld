import { getSupabaseServiceClient } from '@/lib/supabase-service';

type RawMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string | null;
};

type RawUserMini = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type MessageItem = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  senderName: string;
  receiverName: string;
};

export type MessageConversation = {
  userId: string;
  userName: string;
  lastMessage: string;
  createdAt: string;
  isOutgoing: boolean;
};

function cleanText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

function ensureUserName(row: RawUserMini | undefined): string {
  if (!row) {
    return 'Пользователь';
  }

  return cleanText(row.full_name, cleanText(row.email, 'Пользователь'));
}

async function loadUserMap(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, RawUserMini>();
  }

  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('app_users')
    .select('id, full_name, email')
    .in('id', ids);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawUserMini[];
  return new Map<string, RawUserMini>(rows.map((row) => [row.id, row]));
}

function normalizeMessage(row: RawMessage, userMap: Map<string, RawUserMini>): MessageItem {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: cleanText(row.content),
    createdAt: row.created_at ?? new Date(0).toISOString(),
    senderName: ensureUserName(userMap.get(row.sender_id)),
    receiverName: ensureUserName(userMap.get(row.receiver_id)),
  };
}

function cleanContent(value: unknown) {
  const content = cleanText(value);
  if (content.length < 1) {
    throw new Error('content required');
  }

  if (content.length > 2000) {
    throw new Error('content too long');
  }

  return content;
}

export async function listMessageConversations(viewerId: string): Promise<MessageConversation[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, created_at')
    .or(`sender_id.eq.${viewerId},receiver_id.eq.${viewerId}`)
    .order('created_at', { ascending: false })
    .limit(250);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawMessage[];
  const userIds = Array.from(new Set(rows.flatMap((row) => [row.sender_id, row.receiver_id])));
  const userMap = await loadUserMap(userIds);

  const deduped = new Map<string, MessageConversation>();

  for (const row of rows) {
    const counterpartId = row.sender_id === viewerId ? row.receiver_id : row.sender_id;

    if (deduped.has(counterpartId)) {
      continue;
    }

    const counterpart = userMap.get(counterpartId);
    deduped.set(counterpartId, {
      userId: counterpartId,
      userName: ensureUserName(counterpart),
      lastMessage: cleanText(row.content),
      createdAt: row.created_at ?? new Date(0).toISOString(),
      isOutgoing: row.sender_id === viewerId,
    });
  }

  return Array.from(deduped.values());
}

export async function getMessageThread(viewerId: string, counterpartId: string): Promise<MessageItem[]> {
  const cleanCounterpart = cleanText(counterpartId);
  if (!cleanCounterpart) {
    return [];
  }

  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, created_at')
    .or(`and(sender_id.eq.${viewerId},receiver_id.eq.${cleanCounterpart}),and(sender_id.eq.${cleanCounterpart},receiver_id.eq.${viewerId})`)
    .order('created_at', { ascending: true })
    .limit(300);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawMessage[];
  const userMap = await loadUserMap([viewerId, cleanCounterpart]);
  return rows.map((row) => normalizeMessage(row, userMap));
}

export async function sendMessage(viewerId: string, counterpartId: string, value: unknown): Promise<MessageItem> {
  const receiverId = cleanText(counterpartId);
  if (!receiverId) {
    throw new Error('receiverId required');
  }

  if (receiverId === viewerId) {
    throw new Error('cannot message self');
  }

  const content = cleanContent(value);

  const supabase = getSupabaseServiceClient() as any;

  const { data: userRow, error: userError } = await supabase
    .from('app_users')
    .select('id, full_name, email')
    .eq('id', receiverId)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  if (!userRow) {
    throw new Error('receiver not found');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: viewerId,
      receiver_id: receiverId,
      content,
    })
    .select('id, sender_id, receiver_id, content, created_at')
    .single();

  if (error) {
    throw error;
  }

  const userMap = await loadUserMap([viewerId, receiverId]);
  return normalizeMessage(data as RawMessage, userMap);
}
