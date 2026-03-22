import { getSupabaseServiceClient } from '@/lib/supabase-service';

export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
};

type RawNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

function cleanText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

function mapNotification(row: RawNotification): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: cleanText(row.type),
    title: cleanText(row.title),
    body: cleanText(row.body),
    entityType: row.entity_type ? cleanText(row.entity_type) : null,
    entityId: row.entity_id ? cleanText(row.entity_id) : null,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(120);

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawNotification[]).map(mapNotification);
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: cleanText(input.type, 'info'),
      title: cleanText(input.title),
      body: cleanText(input.body),
      entity_type: cleanText(input.entityType),
      entity_id: cleanText(input.entityId),
      is_read: false,
    });

  if (error) {
    throw error;
  }
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
}
