'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/* ── Types ────────────────────────────────────────────────────── */
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
  memberId: number;
  fullName: string;
  email: string;
  role: string;
  city: string;
  avatarUrl: string;
};

/* ── i18n ─────────────────────────────────────────────────────── */
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
      noMessages: 'Start a conversation!',
      noRecipient: 'Select user to start chat.',
      placeholder: 'Message...',
      send: 'Send',
      sending: 'Sending...',
      me: 'You',
      recording: 'Recording…',
      online: 'online',
      attachFile: 'Attach file',
      voiceMessage: 'Voice message',
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
      noMessages: 'Почніть розмову!',
      noRecipient: 'Оберіть користувача, щоб почати діалог.',
      placeholder: 'Повідомлення...',
      send: 'Надіслати',
      sending: 'Надсилання...',
      me: 'Ви',
      recording: 'Запис…',
      online: 'в мережі',
      attachFile: 'Прикріпити файл',
      voiceMessage: 'Голосове повідомлення',
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
    noMessages: 'Начните диалог!',
    noRecipient: 'Выберите пользователя, чтобы начать диалог.',
    placeholder: 'Сообщение...',
    send: 'Отправить',
    sending: 'Отправка...',
    me: 'Вы',
    recording: 'Запись…',
    online: 'онлайн',
    attachFile: 'Прикрепить файл',
    voiceMessage: 'Голосовое сообщение',
  };
}

/* ── Helpers ──────────────────────────────────────────────────── */
function formatTime(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-US' : 'ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateSeparator(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return locale === 'en' ? 'Today' : locale === 'uk' ? 'Сьогодні' : 'Сегодня';
  }
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-US' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function getInitial(name: string) {
  return (name || '?').slice(0, 1).toUpperCase();
}

/* ── Component ────────────────────────────────────────────────── */
export function MessagesBoard({ locale }: { locale: Locale }) {
  const t = useMemo(() => textByLocale(locale), [locale]);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [viewerId, setViewerId] = useState('');
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState(true);
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
  const [isRecording, setIsRecording] = useState(false);
  const [attachPreview, setAttachPreview] = useState<{ name: string; url?: string } | null>(null);

  const bubblesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFromUrl = (searchParams.get('user') ?? '').trim();
  const refFromUrl = (searchParams.get('ref') ?? '').trim();
  const refLabel =
    refFromUrl.startsWith('product:') || refFromUrl.startsWith('ad:')
      ? refFromUrl.split(':').slice(2).join(':')
      : '';
  const refType = refFromUrl.startsWith('product:') ? 'product' : refFromUrl.startsWith('ad:') ? 'ad' : '';

  /* ── API helpers ─────────────────────────────────────────────── */
  const refreshConversations = useCallback(async (currentToken: string) => {
    const response = await fetch('/api/messages', {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) { if (response.status === 401) setToken(''); return; }
    const payload = (await response.json()) as { conversations?: ConversationItem[] };
    setConversations(payload.conversations ?? []);
  }, []);

  const refreshThread = useCallback(async (currentToken: string, counterpartId: string) => {
    if (!counterpartId) return;
    const response = await fetch(`/api/messages?with=${encodeURIComponent(counterpartId)}`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) { if (response.status === 401) setToken(''); return; }
    const payload = (await response.json()) as { messages?: MessageItem[] };
    setMessages(payload.messages ?? []);
    setLastReadMap((prev) => new Map(prev).set(counterpartId, new Date().toISOString()));
  }, []);

  const loadConversations = useCallback(async (currentToken: string) => {
    const response = await fetch('/api/messages', {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) { if (response.status === 401) setToken(''); setConversations([]); return; }
    const payload = (await response.json()) as { conversations?: ConversationItem[] };
    const next = payload.conversations ?? [];
    setConversations(next);
    if (selectedFromUrl) { setSelectedId(selectedFromUrl); return; }
    if (!selectedId && next.length > 0) setSelectedId(next[0].userId);
  }, [selectedFromUrl, selectedId]);

  const loadContacts = useCallback(async (currentToken: string, query: string, roleValue: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (roleValue.trim()) params.set('role', roleValue.trim());
    params.set('excludeSelf', '1');
    const response = await fetch(`/api/app-users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) { setContacts([]); return; }
    const payload = (await response.json()) as { users?: ContactItem[] };
    const next = payload.users ?? [];
    setContacts(next);
    if (selectedFromUrl && next.some((item) => item.id === selectedFromUrl)) setSelectedId(selectedFromUrl);
  }, [selectedFromUrl]);

  const loadThread = useCallback(async (currentToken: string, counterpartId: string) => {
    if (!counterpartId) { setMessages([]); return; }
    const response = await fetch(`/api/messages?with=${encodeURIComponent(counterpartId)}`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) { setMessages([]); return; }
    const payload = (await response.json()) as { messages?: MessageItem[] };
    setMessages(payload.messages ?? []);
    setLastReadMap((prev) => new Map(prev).set(counterpartId, new Date().toISOString()));
  }, []);

  /* ── Init & polling ──────────────────────────────────────────── */
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const apply = () => {
      setIsMobile(query.matches);
      if (!query.matches) setMobileView('chat');
      else if (!selectedId) setMobileView('list');
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [selectedId]);

  useEffect(() => {
    if (isMobile && selectedId) setMobileView('chat');
  }, [isMobile, selectedId]);

  useEffect(() => {
    let alive = true;
    async function init() {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? '';
      const userId = data.session?.user?.id ?? '';
      if (!alive) return;
      setToken(accessToken);
      setViewerId(userId);
      if (!accessToken) { setStatus('Unauthorized'); return; }
      const profileRes = await fetch('/api/app-profile/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const pp = (await profileRes.json()) as { profile?: { isActive?: boolean } };
        const active = Boolean(pp.profile?.isActive);
        setIsActive(active);
        if (!active) {
          setStatus(locale === 'en' ? 'Activate your account to use messages.' : locale === 'uk' ? 'Активуйте акаунт, щоб користуватися повідомленнями.' : 'Активируйте аккаунт, чтобы пользоваться сообщениями.');
          return;
        }
      }
      await Promise.all([loadConversations(accessToken), loadContacts(accessToken, '', roleFilter)]);
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? '';
      setToken(accessToken);
      if (!accessToken) { setStatus('Unauthorized'); return; }
      await Promise.all([loadConversations(accessToken), loadContacts(accessToken, search, roleFilter)]);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [loadContacts, loadConversations, search, roleFilter, supabase.auth, locale]);

  useEffect(() => {
    if (token && selectedId) loadThread(token, selectedId);
  }, [loadThread, selectedId, token]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => refreshConversations(token), 10_000);
    return () => clearInterval(id);
  }, [token, refreshConversations]);

  useEffect(() => {
    if (!token || !selectedId) return;
    const id = setInterval(() => refreshThread(token, selectedId), 5_000);
    return () => clearInterval(id);
  }, [token, selectedId, refreshThread]);

  /* ── Scroll to bottom on new messages ────────────────────────── */
  useEffect(() => {
    const el = bubblesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* ── VisualViewport mobile keyboard fix ──────────────────────── */
  useEffect(() => {
    const vv = window.visualViewport;
    const container = containerRef.current;
    if (!vv || !container) return;
    const onResize = () => { container.style.height = `${vv.height}px`; };
    onResize();
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  /* ── Auto-resize textarea ─────────────────────────────────────── */
  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 5 * 24;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  /* ── Derived data ────────────────────────────────────────────── */
  const selectedName =
    conversations.find((item) => item.userId === selectedId)?.userName ??
    contacts.find((item) => item.id === selectedId)?.fullName ?? '';
  const selectedContact = contacts.find((item) => item.id === selectedId);
  const contactsById = useMemo(() => {
    const map = new Map<string, ContactItem>();
    for (const item of contacts) map.set(item.id, item);
    return map;
  }, [contacts]);
  const filteredConversations = conversations.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.userName.toLowerCase().includes(q) || item.lastMessage.toLowerCase().includes(q);
  });

  /* ── Handlers ────────────────────────────────────────────────── */
  const onSearch = async (value: string) => {
    setSearch(value);
    if (!isMobile && token) await loadContacts(token, value, roleFilter);
  };

  const onApplyFilters = async () => {
    if (token) await loadContacts(token, search, roleFilter);
  };

  const onSend = async () => {
    if (!token || !selectedId || !draft.trim() || !isActive) return;
    setSending(true);
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: selectedId, content: draft.trim() }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Send failed' }))) as { error?: string };
      setStatus(payload.error ?? 'Send failed');
      setSending(false);
      return;
    }
    setDraft('');
    setAttachPreview(null);
    setSending(false);
    setStatus('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await loadThread(token, selectedId);
    await refreshConversations(token);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      onSend();
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setAttachPreview({ name: file.name, url });
    e.target.value = '';
  };

  const selectUser = (id: string) => {
    setSelectedId(id);
    if (isMobile) setMobileView('chat');
    setStatus('');
  };

  const getDateKey = (iso: string) => new Date(iso).toDateString();

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="nm-messenger" ref={containerRef}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`nm-msg-sidebar${isMobile && mobileView === 'chat' ? ' nm-msg-hidden' : ''}`}>
        <header className="nm-msg-sidebar-head">
          <h1>{t.title}</h1>
          {status ? <p className="nm-msg-status">{status}</p> : null}
        </header>

        <div className="nm-msg-search-wrap">
          <input
            className="nm-msg-search"
            placeholder={t.searchUsers}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          <button
            type="button"
            className={`nm-msg-filter-btn${filtersOpen ? ' active' : ''}`}
            onClick={() => setFiltersOpen((prev) => !prev)}
          >
            {t.filters} {filtersOpen ? '▲' : '▼'}
          </button>
        </div>

        {!isMobile && filtersOpen ? (
          <div className="nm-msg-filters">
            <label className="nm-admin-field">
              <span>{t.role}</span>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">{t.allRoles}</option>
                <option value="Потребитель">Потребитель</option>
                <option value="Поставщик">Поставщик</option>
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" className="nm-btn nm-btn-primary nm-btn-sm" onClick={onApplyFilters}>OK</button>
              <button type="button" className="nm-btn nm-btn-secondary nm-btn-sm" onClick={() => { setRoleFilter(''); onSearch(search); }}>Reset</button>
            </div>
          </div>
        ) : null}

        <div className="nm-msg-list-scroll">
          <p className="nm-msg-section-label">{t.chats}</p>
          {filteredConversations.length === 0 ? <p className="nm-msg-empty">{t.noConversations}</p> : null}
          {filteredConversations.map((item) => {
            const isUnread = !item.isOutgoing && item.createdAt > (lastReadMap.get(item.userId) ?? '');
            const contact = contactsById.get(item.userId);
            return (
              <button
                key={item.userId}
                type="button"
                className={`nm-msg-contact${selectedId === item.userId ? ' active' : ''}`}
                onClick={() => selectUser(item.userId)}
              >
                <span className="nm-msg-avatar-wrap">
                  {contact?.avatarUrl ? (
                    <Image src={contact.avatarUrl} alt="" width={48} height={48} className="nm-msg-avatar" unoptimized />
                  ) : (
                    <span className="nm-msg-avatar nm-msg-avatar-ph">{getInitial(item.userName)}</span>
                  )}
                </span>
                <span className="nm-msg-contact-body">
                  <span className="nm-msg-contact-top">
                    <strong>{item.userName}</strong>
                    <small>{formatTime(item.createdAt, locale)}</small>
                  </span>
                  <span className="nm-msg-contact-bottom">
                    <span className="nm-msg-last-msg">{item.lastMessage}</span>
                    {isUnread ? <span className="nm-msg-unread">●</span> : null}
                  </span>
                </span>
              </button>
            );
          })}

          {!isMobile ? (
            <>
              <p className="nm-msg-section-label">{t.contacts}</p>
              {contacts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nm-msg-contact${selectedId === item.id ? ' active' : ''}`}
                  onClick={() => selectUser(item.id)}
                >
                  <span className="nm-msg-avatar-wrap">
                    {item.avatarUrl ? (
                      <Image src={item.avatarUrl} alt="" width={48} height={48} className="nm-msg-avatar" unoptimized />
                    ) : (
                      <span className="nm-msg-avatar nm-msg-avatar-ph">{getInitial(item.fullName || item.email)}</span>
                    )}
                  </span>
                  <span className="nm-msg-contact-body">
                    <strong>{item.fullName}{item.memberId ? ` · #${item.memberId}` : ''}</strong>
                    <small>{item.role} {item.city ? `· ${item.city}` : ''}</small>
                  </span>
                </button>
              ))}
            </>
          ) : null}
        </div>
      </aside>

      {/* ── Thread ──────────────────────────────────────────── */}
      <section className={`nm-msg-thread${isMobile && mobileView === 'list' ? ' nm-msg-hidden' : ''}`}>
        <header className="nm-msg-thread-head">
          {isMobile ? (
            <button type="button" className="nm-msg-back" onClick={() => setMobileView('list')}>‹</button>
          ) : null}
          {selectedContact?.avatarUrl ? (
            <Image src={selectedContact.avatarUrl} alt="" width={40} height={40} className="nm-msg-head-avatar" unoptimized />
          ) : (
            <span className="nm-msg-head-avatar nm-msg-avatar-ph">{getInitial(selectedName)}</span>
          )}
          <div className="nm-msg-head-info">
            <strong>{selectedName || t.selectedChat}</strong>
            {selectedId ? <small>{t.online}</small> : null}
          </div>
        </header>

        <div className="nm-msg-bubbles" ref={bubblesRef}>
          {!selectedId ? <p className="nm-msg-empty-center">{t.noRecipient}</p> : null}
          {selectedId && messages.length === 0 ? <p className="nm-msg-empty-center">{t.noMessages}</p> : null}
          {messages.map((item, idx) => {
            const own = item.senderId === viewerId;
            const prevDate = idx > 0 ? getDateKey(messages[idx - 1].createdAt) : null;
            const curDate = getDateKey(item.createdAt);
            const showSeparator = curDate !== prevDate;
            return (
              <div key={item.id}>
                {showSeparator ? (
                  <div className="nm-msg-date-sep"><span>{formatDateSeparator(item.createdAt, locale)}</span></div>
                ) : null}
                <div className={`nm-msg-bubble-row${own ? ' nm-msg-own' : ''}`}>
                  <div className={`nm-msg-bubble${own ? ' nm-msg-bubble-own' : ''}`}>
                    <p>{item.content}</p>
                    <span className="nm-msg-bubble-time">{formatTime(item.createdAt, locale)}{own ? ' ✓✓' : ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="nm-msg-input-bar">
          {attachPreview ? (
            <div className="nm-msg-attach-preview">
              {attachPreview.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attachPreview.url} alt="" className="nm-msg-attach-thumb" />
              ) : (
                <span className="nm-msg-attach-file">📄 {attachPreview.name}</span>
              )}
              <button type="button" className="nm-msg-attach-remove" onClick={() => setAttachPreview(null)}>✕</button>
            </div>
          ) : null}

          {refLabel && selectedId ? (
            <div className={`nm-ref-tag${refType ? ` nm-ref-tag-${refType}` : ''}`}>
              {(refType === 'product' ? '🛒' : refType === 'ad' ? '📢' : '🔗') + ' ' + refLabel}
            </div>
          ) : null}

          {isRecording ? (
            <div className="nm-msg-recording">
              <span className="nm-msg-rec-dot" />
              <span className="nm-msg-rec-wave">▎▌▎▌▎▌▎▌▎▌▎▌▎▌</span>
              <span>{t.recording}</span>
              <button type="button" className="nm-msg-rec-stop" onClick={() => setIsRecording(false)}>⏹</button>
            </div>
          ) : (
            <div className="nm-msg-compose">
              <button
                type="button"
                className="nm-msg-action-btn"
                title={t.attachFile}
                onClick={() => fileInputRef.current?.click()}
              >📎</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.zip"
                style={{ display: 'none' }}
                onChange={onFileSelect}
              />
              <textarea
                ref={textareaRef}
                className="nm-msg-textarea"
                rows={1}
                placeholder={t.placeholder}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); autoResizeTextarea(); }}
                onKeyDown={onKeyDown}
                disabled={!selectedId || sending}
              />
              {draft.trim() ? (
                <button type="button" className="nm-msg-send-btn" onClick={onSend} disabled={!selectedId || sending}>➤</button>
              ) : (
                <button type="button" className="nm-msg-action-btn nm-msg-mic-btn" title={t.voiceMessage} onClick={() => setIsRecording(true)}>🎙</button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
