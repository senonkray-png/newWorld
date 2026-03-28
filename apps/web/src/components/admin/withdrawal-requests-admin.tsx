'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { WithdrawalRequestAdminRow } from '@/lib/pai-store';

export function WithdrawalRequestsAdmin({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<WithdrawalRequestAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [rejectId, setRejectId] = useState('');
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/withdrawal-requests', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      setItems([]);
      setLoading(false);
      return;
    }
    const payload = (await res.json()) as { withdrawals?: WithdrawalRequestAdminRow[] };
    setItems(payload.withdrawals ?? []);
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/withdrawal-requests/${id}/resolve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ approve: true, comment: '' }),
    });
    setBusyId('');
    if (res.ok) await load();
  };

  const openReject = (id: string) => {
    setRejectId(id);
    setComment('');
  };

  const submitReject = async () => {
    if (!rejectId) return;
    const c = comment.trim();
    if (c.length < 3) return;

    setBusyId(rejectId);
    const res = await fetch(`/api/admin/withdrawal-requests/${rejectId}/resolve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ approve: false, comment: c }),
    });
    setBusyId('');
    if (res.ok) {
      setRejectId('');
      await load();
    }
  };

  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items]);

  if (loading) {
    return <p>Завантаження заявок на повернення...</p>;
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ marginTop: 0 }}>Повернення паєвого внеску</h2>
      <p className="nm-admin-hint" style={{ marginBottom: '1rem' }}>
        Очікують: {pending.length}. Підтвердіть виплату на картку поза системою; баланс паєвих одиниць зменшується в реєстрі.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map((item) => (
          <div key={item.id} className="nm-admin-card" style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <strong>{item.userEmail || item.userId}</strong>
              <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>{new Date(item.createdAt).toLocaleString('uk-UA')}</span>
            </div>
            <div>
              Паєві одиниці до повернення: <strong>{item.amountPai.toFixed(2)}</strong>
            </div>
            <div>Підстава: {item.reason}</div>
            <div>
              Статус: <strong>{item.status}</strong>
              {item.adminComment ? <span> — {item.adminComment}</span> : null}
            </div>
            {item.status === 'pending' ? (
              <div className="nm-admin-actions">
                <button type="button" className="nm-btn nm-btn-primary" disabled={busyId === item.id} onClick={() => void approve(item.id)}>
                  {busyId === item.id ? '...' : 'Підтвердити виплату'}
                </button>
                <button type="button" className="nm-btn nm-btn-secondary" disabled={busyId === item.id} onClick={() => openReject(item.id)}>
                  Відхилити
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {items.length === 0 ? <p className="nm-admin-hint">Заявок немає.</p> : null}

      {rejectId ? (
        <div className="nm-modal-backdrop" onClick={() => setRejectId('')}>
          <div className="nm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Причина відхилення</h3>
            <label className="nm-admin-field">
              <span>Коментар</span>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-primary" onClick={() => void submitReject()} disabled={comment.trim().length < 3 || Boolean(busyId)}>
                Відхилити заявку
              </button>
              <button type="button" className="nm-btn nm-btn-secondary" onClick={() => setRejectId('')}>
                Закрити
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
