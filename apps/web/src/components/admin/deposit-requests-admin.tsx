'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DepositRequestAdminRow } from '@/lib/pai-store';

export function DepositRequestsAdmin({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<DepositRequestAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [rejectId, setRejectId] = useState('');
  const [rejectComment, setRejectComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/deposit-requests', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      setItems([]);
      setLoading(false);
      return;
    }
    const payload = (await res.json()) as { depositRequests?: DepositRequestAdminRow[] };
    setItems(payload.depositRequests ?? []);
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/deposit-requests/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setBusyId('');
    if (res.ok) await load();
  };

  const openReject = (id: string) => {
    setRejectId(id);
    setRejectComment('');
  };

  const submitReject = async () => {
    if (!rejectId) return;
    const comment = rejectComment.trim();
    if (!comment) return;

    setBusyId(rejectId);
    const res = await fetch(`/api/admin/deposit-requests/${rejectId}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    });
    setBusyId('');
    if (res.ok) {
      setRejectId('');
      await load();
    }
  };

  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items]);

  if (loading) {
    return <p>Завантаження заявок на паєвий внесок...</p>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Внески пайщиків (паевые взносы — ручная проверка)</h2>
      <p className="nm-admin-hint" style={{ marginBottom: '1rem' }}>
        Очікують: {pending.length}. Підтвердження зараховує паєві одиниці з урахуванням вступного та членського внеску (незворотні суми — у резерв ПК).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map((item) => (
          <div key={item.id} className="nm-admin-card" style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <strong>{item.userEmail || item.userId}</strong>
              <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>{new Date(item.createdAt).toLocaleString('uk-UA')}</span>
            </div>
            <div>
              Сума: <strong>{item.amountUah.toFixed(2)} грн</strong> → прев’ю <strong>{item.amountPai.toFixed(2)}</strong> паєвих одиниць
            </div>
            {item.appliedBreakdown && item.status === 'completed' ? (
              <div className="nm-admin-hint">
                Зараховано: {String(item.appliedBreakdown.pai_credited ?? '—')} од.; вступний {String(item.appliedBreakdown.entrance_uah ?? 0)} грн;
                членський {String(item.appliedBreakdown.membership_uah ?? 0)} грн
              </div>
            ) : null}
            <div>
              Статус: <strong>{item.status}</strong>
              {item.adminComment ? <span> — {item.adminComment}</span> : null}
            </div>
            <div>
              <a href={item.receiptImage} target="_blank" rel="noreferrer">
                Відкрити чек
              </a>
            </div>
            {item.status === 'pending' ? (
              <div className="nm-admin-actions">
                <button type="button" className="nm-btn nm-btn-primary" disabled={busyId === item.id} onClick={() => void approve(item.id)}>
                  {busyId === item.id ? '...' : 'Підтвердити'}
                </button>
                <button type="button" className="nm-btn nm-btn-secondary" disabled={busyId === item.id} onClick={() => openReject(item.id)}>
                  Відхилити
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {items.length === 0 ? <p className="nm-admin-hint">Заявок ще немає.</p> : null}

      {rejectId ? (
        <div className="nm-modal-backdrop" onClick={() => setRejectId('')}>
          <div className="nm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Причина відхилення</h3>
            <label className="nm-admin-field">
              <span>Коментар для користувача</span>
              <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} />
            </label>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-primary" onClick={() => void submitReject()} disabled={!rejectComment.trim() || Boolean(busyId)}>
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
