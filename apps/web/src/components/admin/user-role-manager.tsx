'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { getAdminMessages } from '@/i18n/admin-messages';
import type { UserProfile, UserRole } from '@/lib/profile-store';
import { userRoleValues } from '@/lib/profile-store';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export function UserRoleManager({ locale }: { locale: Locale }) {
  const t = useMemo(() => getAdminMessages(locale), [locale]);
  const roleLabels: Record<UserRole, string> = useMemo(() => ({
    member: t.roleConsumer,
    provider: t.roleProvider,
    organizer: t.roleOrganizer,
    main_admin: t.roleMainAdmin,
  }), [t]);
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
        setError(t.loadUsersError);
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
        setError(data.error ?? t.saveRoleError);
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
      setError(t.networkError);
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
    return <p className="nm-admin-loading">{t.loadingUsers}</p>;
  }

  return (
    <div className="nm-user-role-manager">
      <h2 className="nm-admin-section-title">{t.manageRoles}</h2>

      <input
        className="nm-catalog-search-bar"
        type="text"
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {error && <p className="nm-form-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

      <div className="nm-role-table-wrap">
        <table className="nm-role-table">
          <thead>
            <tr>
              <th>{t.userCol}</th>
              <th>{t.emailCol}</th>
              <th>{t.roleCol}</th>
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
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="nm-role-cell-action">
                    {isSuccess ? (
                      <span className="nm-role-saved">{t.saved}</span>
                    ) : (
                      <button
                        className="nm-btn nm-btn-primary nm-role-save-btn"
                        onClick={() => saveRole(user.userId)}
                        disabled={!isDirty || isSaving}
                      >
                        {isSaving ? '...' : t.saveRole}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.5 }}>
                  {t.noUsersFound}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
