'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type ConversationItem = {
  userId: string;
  userName: string;
  lastMessage: string;
  createdAt: string;
  isOutgoing: boolean;
};

type MessageItem = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  senderName: string;
  receiverName: string;
};

type ContactItem = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  city: string;
  avatarUrl: string;
};

function textByLocale(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Messages',
      subtitle: 'Private conversations between users.',
      searchUsers: 'Find user',
      contacts: 'Users',
      chats: 'Dialogs',
      filters: 'Filters',
      role: 'Role',
      allRoles: 'All roles',
      selectedChat: 'Selected dialog',
      noConversations: 'No dialogs yet.',
      noMessages: 'No messages yet.',
      noRecipient: 'Select user to start chat.',
      placeholder: 'Type your message...',
      send: 'Send',
      sending: 'Sending...',
      me: 'You',
    };
  }

  if (locale === 'uk') {
    return {
      title: 'Повідомлення',
      subtitle: 'Приватні діалоги між користувачами.',
      searchUsers: 'Знайти користувача',
      contacts: 'Користувачі',
      chats: 'Діалоги',
      filters: 'Фільтри',
      role: 'Роль',
      allRoles: 'Усі ролі',
      selectedChat: 'Обраний діалог',
      noConversations: 'Поки немає діалогів.',
      noMessages: 'Поки немає повідомлень.',
      noRecipient: 'Оберіть користувача, щоб почати діалог.',
      placeholder: 'Введіть ваше повідомлення...',
      send: 'Надіслати',
      sending: 'Надсилання...',
      me: 'Ви',
    };
  }

  return {
    title: 'Сообщения',
    subtitle: 'Личные диалоги между пользователями.',
    searchUsers: 'Найти пользователя',
    contacts: 'Пользователи',
    chats: 'Диалоги',
    filters: 'Фильтры',
    role: 'Роль',
    allRoles: 'Все роли',
    selectedChat: 'Выбранный диалог',
    noConversations: 'Пока нет диалогов.',
    noMessages: 'Пока нет сообщений.',
    noRecipient: 'Выберите пользователя, чтобы начать диалог.',
    placeholder: 'Введите сообщение...',
    send: 'Отправить',
    sending: 'Отправка...',
    me: 'Вы',
  };
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-US' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function MessagesBoard({ locale }: { locale: Locale }) {
  const t = useMemo(() => textByLocale(locale), [locale]);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [viewerId, setViewerId] = useState('');
  const [status, setStatus] = useState('');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [lastReadMap, setLastReadMap] = useState<Map<string, string>>(new Map());
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const seenKey = 'nm_messages_seen_at';

  const selectedFromUrl = (searchParams.get('user') ?? '').trim();
  const refFromUrl = (searchParams.get('ref') ?? '').trim();

  const refLabel =
    refFromUrl.startsWith('product:') || refFromUrl.startsWith('ad:')
      ? refFromUrl.split(':').slice(2).join(':')
      : '';
  const refType = refFromUrl.startsWith('product:') ? 'product' : refFromUrl.startsWith('ad:') ? 'ad' : '';

  const refreshConversations = useCallback(async (currentToken: string) => {
    const response = await fetch('/api/messages', {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (!response.ok) return;

    const payload = (await response.json()) as { conversations?: ConversationItem[] };
    setConversations(payload.conversations ?? []);
  }, []);

  const refreshThread = useCallback(async (currentToken: string, counterpartId: string) => {
    if (!counterpartId) return;

    const response = await fetch(`/api/messages?with=${encodeURIComponent(counterpartId)}`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (!response.ok) return;

    const payload = (await response.json()) as { messages?: MessageItem[] };
    setMessages(payload.messages ?? []);
    setLastReadMap((prev) => new Map(prev).set(counterpartId, new Date().toISOString()));
  }, []);

  const loadConversations = useCallback(
    async (currentToken: string) => {
      const response = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (!response.ok) {
        setConversations([]);
        return;
      }

      const payload = (await response.json()) as { conversations?: ConversationItem[] };
      const next = payload.conversations ?? [];
      setConversations(next);

      if (selectedFromUrl) {
        setSelectedId(selectedFromUrl);
        return;
      }

      if (!selectedId && next.length > 0) {
        setSelectedId(next[0].userId);
      }
    },
    [selectedFromUrl, selectedId],
  );

  const loadContacts = useCallback(
    async (currentToken: string, query: string, roleValue: string) => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('q', query.trim());
      }
      if (roleValue.trim()) {
        params.set('role', roleValue.trim());
      }

      params.set('excludeSelf', '1');

      const response = await fetch(`/api/app-users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (!response.ok) {
        setContacts([]);
        return;
      }

      const payload = (await response.json()) as { users?: ContactItem[] };
      const next = payload.users ?? [];
      setContacts(next);

      if (selectedFromUrl && next.some((item) => item.id === selectedFromUrl)) {
        setSelectedId(selectedFromUrl);
      }
    },
    [selectedFromUrl],
  );

  const loadThread = useCallback(async (currentToken: string, counterpartId: string) => {
    if (!counterpartId) {
      setMessages([]);
      return;
    }

    const response = await fetch(`/api/messages?with=${encodeURIComponent(counterpartId)}`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (!response.ok) {
      setMessages([]);
      return;
    }

    const payload = (await response.json()) as { messages?: MessageItem[] };
    setMessages(payload.messages ?? []);
    setLastReadMap((prev) => new Map(prev).set(counterpartId, new Date().toISOString()));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = window.matchMedia('(max-width: 900px)');
    const apply = () => {
      setIsMobile(query.matches);
      if (!query.matches) {
        setMobileView('chat');
      } else if (!selectedId) {
        setMobileView('list');
      }
    };

    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [selectedId]);

  useEffect(() => {
    if (isMobile && selectedId) {
      setMobileView('chat');
    }
  }, [isMobile, selectedId]);

  useEffect(() => {
    let alive = true;

    try {
      localStorage.setItem(seenKey, new Date().toISOString());
    } catch {
      // ignore localStorage errors
    }

    async function init() {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? '';
      const userId = data.session?.user?.id ?? '';

      if (!alive) return;

      setToken(accessToken);
      setViewerId(userId);

      if (!accessToken) {
        setStatus('Unauthorized');
        return;
      }

      await Promise.all([loadConversations(accessToken), loadContacts(accessToken, '', roleFilter)]);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? '';
      setToken(accessToken);

      if (!accessToken) {
        setStatus('Unauthorized');
        return;
      }

      await Promise.all([loadConversations(accessToken), loadContacts(accessToken, search, roleFilter)]);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [loadContacts, loadConversations, search, roleFilter, supabase.auth]);

  useEffect(() => {
    if (!token || !selectedId) {
      return;
    }

    loadThread(token, selectedId);
  }, [loadThread, selectedId, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const id = setInterval(() => {
      refreshConversations(token);
    }, 10_000);

    return () => clearInterval(id);
  }, [token, refreshConversations]);

  useEffect(() => {
    if (!token || !selectedId) {
      return;
    }

    const id = setInterval(() => {
      refreshThread(token, selectedId);
    }, 5_000);

    return () => clearInterval(id);
  }, [token, selectedId, refreshThread]);

  const selectedName =
    conversations.find((item) => item.userId === selectedId)?.userName ??
    contacts.find((item) => item.id === selectedId)?.fullName ??
    '';
  const selectedContact = contacts.find((item) => item.id === selectedId);
  const contactsById = useMemo(() => {
    const map = new Map<string, ContactItem>();
    for (const item of contacts) {
      map.set(item.id, item);
    }
    return map;
  }, [contacts]);
  const filteredConversations = conversations.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.userName.toLowerCase().includes(q) || item.lastMessage.toLowerCase().includes(q);
  });

  const onSearch = async (value: string) => {
    setSearch(value);
    if (isMobile) {
      return;
    }
    if (!token) {
      return;
    }

    await loadContacts(token, value, roleFilter);
  };

  const onApplyFilters = async () => {
    if (!token) {
      return;
    }

    await loadContacts(token, search, roleFilter);
  };

  const onSend = async () => {
    if (!token || !selectedId || !draft.trim()) {
      return;
    }

    setSending(true);

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: selectedId,
        content: draft.trim(),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Send failed' }))) as { error?: string };
      setStatus(payload.error ?? 'Send failed');
      setSending(false);
      return;
    }

    setDraft('');
    setSending(false);
    setStatus('');
    await loadThread(token, selectedId);
    await refreshConversations(token);
  };

  return (
    <main className="nm-register-page">
      <section className="nm-chat-shell nm-reveal">
        <aside className={`nm-chat-sidebar${isMobile && mobileView === 'chat' ? ' nm-chat-pane-hidden' : ''}`}>
          <header className="nm-chat-sidebar-head">
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
            {status ? <p className="nm-chat-status">{status}</p> : null}
          </header>

          <div className="nm-chat-search-wrap">
            <input
              className="nm-chat-search"
              placeholder={t.searchUsers}
              value={search}
              onChange={(event) => onSearch(event.target.value)}
            />
            <button
              type="button"
              className={`nm-chat-filter-toggle${filtersOpen ? ' active' : ''}`}
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              {t.filters} {filtersOpen ? '▲' : '▼'}
            </button>
          </div>

          {!isMobile && filtersOpen ? (
            <div className="nm-chat-filters-panel">
              <label className="nm-admin-field">
                <span>{t.role}</span>
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                  <option value="">{t.allRoles}</option>
                  <option value="Потребитель">Потребитель</option>
                  <option value="Поставщик">Поставщик</option>
                </select>
              </label>
              <div className="nm-admin-actions" style={{ marginTop: 0 }}>
                <button type="button" className="nm-btn nm-btn-primary nm-btn-sm" onClick={onApplyFilters}>
                  OK
                </button>
                <button
                  type="button"
                  className="nm-btn nm-btn-secondary nm-btn-sm"
                  onClick={() => {
                    setRoleFilter('');
                    onSearch(search);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : null}

          <div className="nm-chat-scroll">
            <h3 className="nm-chat-list-title">{t.chats}</h3>
            {filteredConversations.length === 0 ? <p className="nm-chat-empty-label">{t.noConversations}</p> : null}
            <div className="nm-messages-list">
              {filteredConversations.map((item) => {
                const isUnread = !item.isOutgoing && item.createdAt > (lastReadMap.get(item.userId) ?? '');
                const contact = contactsById.get(item.userId);
                const avatarText = (item.userName || '?').slice(0, 1).toUpperCase();
                return (
                  <button
                    key={item.userId}
                    type="button"
                    className={`nm-chat-contact nm-chat-dialog-item ${selectedId === item.userId ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedId(item.userId);
                      if (isMobile) {
                        setMobileView('chat');
                      }
                      setStatus('');
                    }}
                  >
                    <span className="nm-chat-dialog-avatar-wrap">
                      {contact?.avatarUrl ? (
                        <Image
                          src={contact.avatarUrl}
                          alt={item.userName || 'avatar'}
                          width={42}
                          height={42}
                          className="nm-chat-dialog-avatar"
                          unoptimized
                        />
                      ) : (
                        <span className="nm-chat-dialog-avatar nm-chat-dialog-avatar-placeholder">{avatarText}</span>
                      )}
                    </span>
                    <span className="nm-chat-dialog-main">
                      <span className="nm-chat-dialog-top">
                        <strong>{item.userName}</strong>
                        <small>{formatDate(item.createdAt, locale)}</small>
                      </span>
                      <span className="nm-chat-dialog-bottom">
                        <span className="nm-chat-contact-line">{item.lastMessage}</span>
                        {isUnread ? <span className="nm-unread-badge">1</span> : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {!isMobile ? (
              <>
                <h3 className="nm-chat-list-title">{t.contacts}</h3>
                <div className="nm-messages-list">
                  {contacts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`nm-chat-contact ${selectedId === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedId(item.id);
                        setStatus('');
                      }}
                    >
                      <span className="nm-messages-contact-row">
                        {item.avatarUrl ? (
                          <Image
                            src={item.avatarUrl}
                            alt={item.fullName || 'avatar'}
                            width={38}
                            height={38}
                            className="nm-messages-contact-avatar"
                            unoptimized
                          />
                        ) : (
                          <span className="nm-messages-contact-avatar nm-messages-contact-avatar-placeholder">
                            {(item.fullName || item.email || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="nm-messages-contact-text">
                          <strong>{item.fullName}</strong>
                          <span>{item.role}</span>
                          <small>{item.city || item.email}</small>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </aside>

        <section className={`nm-chat-thread${isMobile && mobileView === 'list' ? ' nm-chat-pane-hidden' : ''}`}>
          <header className="nm-chat-thread-head">
            <div className="nm-chat-thread-user">
              {isMobile ? (
                <button
                  type="button"
                  className="nm-chat-back-btn"
                  onClick={() => setMobileView('list')}
                >
                  ← {t.chats}
                </button>
              ) : null}
              {selectedContact?.avatarUrl ? (
                <Image
                  src={selectedContact.avatarUrl}
                  alt={selectedName || 'avatar'}
                  width={42}
                  height={42}
                  className="nm-messages-contact-avatar"
                  unoptimized
                />
              ) : (
                <span className="nm-messages-contact-avatar nm-messages-contact-avatar-placeholder">
                  {(selectedName || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <h3>{selectedName || t.selectedChat}</h3>
                <small>{selectedId ? formatDate(new Date().toISOString(), locale) : ''}</small>
              </div>
            </div>
          </header>

          {!selectedId ? <p className="nm-chat-empty-label">{t.noRecipient}</p> : null}
          {selectedId && messages.length === 0 ? <p className="nm-chat-empty-label">{t.noMessages}</p> : null}

          <div className="nm-messages-bubbles">
            {messages.map((item) => {
              const own = item.senderId === viewerId;
              return (
                <article key={item.id} className={`nm-bubble ${own ? 'nm-bubble-own' : ''}`}>
                  <p>{item.content}</p>
                  <small>
                    {own ? t.me : item.senderName} · {formatDate(item.createdAt, locale)}
                  </small>
                </article>
              );
            })}
          </div>

          <div className="nm-chat-compose-wrap">
            {refLabel && selectedId ? (
              <div className={`nm-ref-tag${refType ? ` nm-ref-tag-${refType}` : ''}`}>
                {(refType === 'product' ? 'Product' : refType === 'ad' ? 'Service' : 'Link') + ': ' + refLabel}
              </div>
            ) : null}
            <div className="nm-chat-compose-actions">
              <span>📎</span>
              <span>🖼️</span>
            </div>
            <div className="nm-messages-compose">
              <textarea
                className="nm-admin-input nm-chat-input"
                rows={3}
                placeholder={t.placeholder}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!selectedId || sending}
              />
              <button
                type="button"
                className="nm-chat-send-btn"
                onClick={onSend}
                disabled={!selectedId || sending}
              >
                {sending ? t.sending : t.send}
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
