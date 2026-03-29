'use client';

import { useCallback, useEffect, useState } from 'react';

type ProcessedPayment = {
  id: string;
  bank_transaction_id: string;
  user_id: string | null;
  amount_uah: number;
  amount_pai: number;
  comment_raw: string | null;
  status: string;
  admin_comment: string | null;
  mono_time: number | null;
  created_at: string;
  resolved_at: string | null;
};

export function ProcessedPaymentsAdmin({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<ProcessedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [confirmId, setConfirmId] = useState('');
  const [confirmUserId, setConfirmUserId] = useState('');
  const [rejectId, setRejectId] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const status = showAll ? 'all' : 'manual_pending';
    const res = await fetch(`/api/admin/processed-payments?status=${status}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      setItems([]);
      setLoading(false);
      return;
    }
    const payload = (await res.json()) as { payments?: ProcessedPayment[] };
    setItems(payload.payments ?? []);
    setLoading(false);
  }, [accessToken, showAll]);

  useEffect(() => {
    void load();
  }, [load]);

  const openConfirm = (id: string) => {
    setConfirmId(id);
    setConfirmUserId('');
  };

  const submitConfirm = async () => {
    if (!confirmId || !confirmUserId.trim()) return;
    setBusyId(confirmId);
    const res = await fetch(`/api/admin/processed-payments/${confirmId}/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: confirmUserId.trim() }),
    });
    setBusyId('');
    if (res.ok) {
      setConfirmId('');
      await load();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error ?? 'Error');
    }
  };

  const openReject = (id: string) => {
    setRejectId(id);
    setRejectComment('');
  };

  const submitReject = async () => {
    if (!rejectId || !rejectComment.trim()) return;
    setBusyId(rejectId);
    const res = await fetch(`/api/admin/processed-payments/${rejectId}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: rejectComment.trim() }),
    });
    setBusyId('');
    if (res.ok) {
      setRejectId('');
      await load();
    }
  };

  const formatDate = (value: string | number | null) => {
    if (!value) return '—';
    const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('uk-UA');
  };

  const pending = items.filter((i) => i.status === 'manual_pending');

  if (loading) {
    return <p>Завантаження транзакцій Monobank...</p>;
  }

  return (
    <div>
      <h2 style={{ marginTop: '2rem' }}>
        Черга перевірки Monobank
        {pending.length > 0 && (
          <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}>({pending.length} очікують)</span>
        )}
      </h2>
      <p className="nm-admin-hint" style={{ marginBottom: '0.75rem' }}>
        Транзакції, де скрипт не зміг розпізнати ID користувача з коментаря. Адмін може вручну
        вказати user_id і підтвердити нарахування паїв.
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        Показати всі (включаючи оброблені)
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map((item) => (
          <div key={item.id} className="nm-admin-card" style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <strong>Сума: {Number(item.amount_uah).toFixed(2)} грн</strong>
              {item.amount_pai > 0 && <span> → {Number(item.amount_pai).toFixed(2)} паїв</span>}
              <span style={{ opacity: 0.7, marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                {formatDate(item.mono_time)}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              Коментар з банку: <em>{item.comment_raw || '(пусто)'}</em>
            </div>
            <div>
              Статус: <strong style={{
                color: item.status === 'success' ? '#22c55e' : item.status === 'manual_pending' ? '#f59e0b' : '#ef4444',
              }}>{item.status}</strong>
              {item.user_id && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>User: {item.user_id}</span>}
              {item.admin_comment && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}> — {item.admin_comment}</span>}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
              Bank TX: {item.bank_transaction_id}
            </div>
            {item.status === 'manual_pending' && (
              <div className="nm-admin-actions">
                <button
                  type="button"
                  className="nm-btn nm-btn-primary"
                  disabled={busyId === item.id}
                  onClick={() => openConfirm(item.id)}
                >
                  Підтвердити вручну
                </button>
                <button
                  type="button"
                  className="nm-btn nm-btn-secondary"
                  disabled={busyId === item.id}
                  onClick={() => openReject(item.id)}
                >
                  Відхилити
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && <p className="nm-admin-hint">Немає транзакцій для перевірки.</p>}

      {/* Confirm modal */}
      {confirmId && (
        <div className="nm-modal-backdrop" onClick={() => setConfirmId('')}>
          <div className="nm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Підтвердити вручну</h3>
            <p className="nm-admin-hint">
              Вкажіть UUID або member_id користувача, якому нарахувати паї.
            </p>
            <label className="nm-admin-field">
              <span>User ID або Member ID</span>
              <input
                value={confirmUserId}
                onChange={(e) => setConfirmUserId(e.target.value)}
                placeholder="UUID або числовий ID"
                autoFocus
              />
            </label>
            <div className="nm-admin-actions">
              <button
                type="button"
                className="nm-btn nm-btn-primary"
                onClick={() => void submitConfirm()}
                disabled={!confirmUserId.trim() || Boolean(busyId)}
              >
                Підтвердити та нарахувати паї
              </button>
              <button type="button" className="nm-btn nm-btn-secondary" onClick={() => setConfirmId('')}>
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="nm-modal-backdrop" onClick={() => setRejectId('')}>
          <div className="nm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Причина відхилення</h3>
            <label className="nm-admin-field">
              <span>Коментар</span>
              <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} />
            </label>
            <div className="nm-admin-actions">
              <button
                type="button"
                className="nm-btn nm-btn-primary"
                onClick={() => void submitReject()}
                disabled={!rejectComment.trim() || Boolean(busyId)}
              >
                Відхилити
              </button>
              <button type="button" className="nm-btn nm-btn-secondary" onClick={() => setRejectId('')}>
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
