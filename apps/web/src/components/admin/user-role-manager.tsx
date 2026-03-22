'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import type { UserProfile, UserRole } from '@/lib/profile-store';
import { userRoleValues } from '@/lib/profile-store';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const ROLE_LABELS: Record<UserRole, string> = {
  member: 'Потребитель',
  provider: 'Поставщик',
  organizer: 'Организатор',
  main_admin: 'Главный админ',
};

export function UserRoleManager({ locale }: { locale: Locale }) {
  void locale;
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token ?? null;
      setToken(t);
    });
  }, [supabase]);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    fetch('/api/admin/users/list', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((payload: { users?: UserProfile[]; error?: string }) => {
        if (payload.error) {
          setError(payload.error);
        } else {
          setUsers(payload.users ?? []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить пользователей');
        setLoading(false);
      });
  }, [token]);

  function getRole(user: UserProfile): UserRole {
    return pendingRoles[user.userId] ?? user.role;
  }

  function handleRoleChange(userId: string, role: UserRole) {
    setPendingRoles((prev) => ({ ...prev, [userId]: role }));
  }

  async function saveRole(userId: string) {
    const role = pendingRoles[userId];
    if (!role || !token) return;

    setSaving(userId);
    setError(null);
    setSuccessId(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Ошибка сохранения');
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.userId === userId ? { ...u, role } : u)),
        );
        setPendingRoles((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        setSuccessId(userId);
        setTimeout(() => setSuccessId(null), 2000);
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(null);
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <p className="nm-admin-loading">Загрузка пользователей...</p>;
  }

  return (
    <div className="nm-user-role-manager">
      <h2 className="nm-admin-section-title">Управление ролями</h2>

      <input
        className="nm-catalog-search-bar"
        type="text"
        placeholder="Поиск по имени или email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {error && <p className="nm-form-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

      <div className="nm-role-table-wrap">
        <table className="nm-role-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Роль</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const currentRole = getRole(user);
              const isDirty = pendingRoles[user.userId] !== undefined;
              const isSaving = saving === user.userId;
              const isSuccess = successId === user.userId;

              return (
                <tr key={user.userId} className={isDirty ? 'nm-role-row-dirty' : ''}>
                  <td className="nm-role-cell-name">
                    <span className="nm-role-avatar-placeholder">
                      {user.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    {user.displayName}
                  </td>
                  <td className="nm-role-cell-email">{user.email ?? '—'}</td>
                  <td>
                    <select
                      className="nm-input nm-role-select"
                      value={currentRole}
                      onChange={(e) => handleRoleChange(user.userId, e.target.value as UserRole)}
                      disabled={isSaving}
                    >
                      {userRoleValues.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="nm-role-cell-action">
                    {isSuccess ? (
                      <span className="nm-role-saved">✓ Сохранено</span>
                    ) : (
                      <button
                        className="nm-btn nm-btn-primary nm-role-save-btn"
                        onClick={() => saveRole(user.userId)}
                        disabled={!isDirty || isSaving}
                      >
                        {isSaving ? '...' : 'Сохранить'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.5 }}>
                  Пользователи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
