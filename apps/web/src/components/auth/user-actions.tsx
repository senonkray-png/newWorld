'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export function UserActions({ locale }: { locale: Locale }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const pathname = usePathname();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const seenKey = 'nm_messages_seen_at';

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!alive) return;

      setAccessToken(token);
    }

    load();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!accessToken) {
      setIsAdmin(false);
      return;
    }

    let alive = true;

    async function loadRole() {
      const response = await fetch('/api/profile/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!alive) return;
      if (!response.ok) {
        setIsAdmin(false);
        return;
      }

      const payload = (await response.json()) as { profile?: { role?: string } };
      setIsAdmin(payload.profile?.role === 'main_admin');
    }

    loadRole();

    return () => {
      alive = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    const loadUnread = async () => {
      if (pathname?.includes('/messages')) {
        try {
          localStorage.setItem(seenKey, new Date().toISOString());
        } catch {
          // ignore
        }
        setUnreadCount(0);
        return;
      }

      const response = await fetch('/api/messages', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        setUnreadCount(0);
        return;
      }

      const payload = (await response.json()) as {
        conversations?: Array<{ isOutgoing: boolean; createdAt: string }>;
      };

      let seenAt = '';
      try {
        seenAt = localStorage.getItem(seenKey) ?? '';
      } catch {
        seenAt = '';
      }

      const unread = (payload.conversations ?? []).filter(
        (item) => !item.isOutgoing && (!seenAt || item.createdAt > seenAt),
      ).length;
      setUnreadCount(unread);
    };

    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => clearInterval(timer);
  }, [accessToken, pathname]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let alive = true;

    const loadNotifications = async () => {
      const response = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!alive || !response.ok) {
        return;
      }

      const payload = (await response.json()) as { notifications?: NotificationItem[] };
      setNotifications(payload.notifications ?? []);
    };

    loadNotifications();
    const timer = setInterval(loadNotifications, 15000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [accessToken]);

  const t = {
    login: locale === 'en' ? 'Sign in / Register' : locale === 'uk' ? 'Вхід / Реєстрація' : 'Вход / Регистрация',
    loginShort: locale === 'en' ? 'Sign in' : locale === 'uk' ? 'Вхід' : 'Вход',
    admin: locale === 'en' ? 'Admin panel' : locale === 'uk' ? 'Адмін панель' : 'Админ панель',
    adminShort: locale === 'en' ? 'Admin' : locale === 'uk' ? 'Адмін' : 'Админ',
    profile: locale === 'en' ? 'Profile' : locale === 'uk' ? 'Профіль' : 'Профиль',
    messages: locale === 'en' ? 'Messages' : locale === 'uk' ? 'Повідомлення' : 'Сообщения',
    notifications: locale === 'en' ? 'Notifications' : locale === 'uk' ? 'Сповіщення' : 'Уведомления',
    markAllRead: locale === 'en' ? 'Mark all read' : locale === 'uk' ? 'Позначити все прочитаним' : 'Прочитать все',
    noNotifications: locale === 'en' ? 'No notifications yet' : locale === 'uk' ? 'Ще немає сповіщень' : 'Пока нет уведомлений',
  };

  const unreadNotifications = notifications.filter((item) => !item.isRead).length;

  const markAllNotificationsRead = async () => {
    if (!accessToken) return;

    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  };

  const markNotificationRead = async (id: string) => {
    if (!accessToken) return;

    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  };

  if (!accessToken) {
    return (
      <Link href={`/${locale}/login`} className="nm-auth-link-btn" aria-label={t.login}>
        <span className="nm-label-desktop">{t.login}</span>
        <span className="nm-label-mobile">{t.loginShort}</span>
      </Link>
    );
  }

  return (
    <div className="nm-auth-user-inline">
      {isAdmin ? (
        <Link href={`/${locale}/admin`} className="nm-auth-link-btn nm-admin-link-btn" aria-label={t.admin}>
          <span className="nm-label-desktop">{t.admin}</span>
          <span className="nm-label-mobile">{t.adminShort}</span>
        </Link>
      ) : null}
      <Link href={`/${locale}/messages`} className="nm-user-trigger nm-message-trigger" aria-label={t.messages}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6.5a2.5 2.5 0 012.5-2.5h11A2.5 2.5 0 0120 6.5v7A2.5 2.5 0 0117.5 16H10l-4 4v-4H6.5A2.5 2.5 0 014 13.5v-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 ? <span className="nm-message-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </Link>
      <div className="nm-notification-wrap">
        <button
          type="button"
          className="nm-user-trigger nm-message-trigger"
          aria-label={t.notifications}
          onClick={() => setNotificationsOpen((current) => !current)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4a5 5 0 00-5 5v3.4l-1.3 2.2A1 1 0 006.6 16h10.8a1 1 0 00.9-1.4L17 12.4V9a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {unreadNotifications > 0 ? <span className="nm-message-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span> : null}
        </button>
        {notificationsOpen ? (
          <div className="nm-notification-dropdown">
            <button type="button" className="nm-btn nm-btn-secondary nm-btn-sm" onClick={markAllNotificationsRead}>
              {t.markAllRead}
            </button>
            {notifications.length === 0 ? <p className="nm-admin-status">{t.noNotifications}</p> : null}
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nm-notification-item${item.isRead ? '' : ' nm-notification-item--unread'}`}
                onClick={() => markNotificationRead(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <Link href={`/${locale}/profile`} className="nm-user-trigger nm-user-trigger--auth" aria-label={t.profile}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="nm-user-dot" aria-hidden="true" />
      </Link>
    </div>
  );
}

