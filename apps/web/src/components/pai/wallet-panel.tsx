'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import {
  computeDepositSplitPreview,
  type DepositRequestRow,
  type PaiTransactionRow,
  PAI_UAH_PER_UNIT,
  type WithdrawalRequestRow,
} from '@/lib/pai-store';

function textByLocale(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Cooperative share contribution',
      hint: 'Consumer cooperative accounting: 5 UAH = 1 cooperative unit. First payment includes a non-refundable entrance fee (see config). Membership fee may apply to later payments.',
      assets: 'Your share assets (returnable)',
      devFund: 'Development fund (non-refundable)',
      unit: 'coop. units',
      contribute: 'Make a contribution',
      paymentDetails: 'Payment details',
      amountUah: 'Amount (UAH)',
      expectedUnits: 'Cooperative units to be credited (preview)',
      splitHint: 'Entrance / membership are non-refundable and do not convert to units.',
      receipt: 'Receipt screenshot',
      uploadReceipt: 'Upload image',
      submitRequest: 'Submit for review',
      submitting: 'Sending...',
      history: 'Registry of operations',
      noTx: 'No operations yet.',
      internalTransfer: 'Transfer between members (cooperative units)',
      recipient: 'Recipient (user ID or email)',
      amount: 'Amount (units)',
      send: 'Send',
      sending: 'Sending...',
      depositStatus: 'Contribution requests',
      pending: 'pending',
      completed: 'completed',
      rejected: 'rejected',
      typeDeposit: 'Contribution',
      typeTransfer: 'Transfer',
      typePurchase: 'Cooperative share exchange',
      typeWithdrawal: 'Return of share contribution',
      credit: 'Credit',
      debit: 'Debit',
      colDate: 'Date',
      colType: 'Type',
      nonRefundable: 'Non-refundable (entrance / membership), UAH',
      withdrawalTitle: 'Request return of cooperative share contribution',
      withdrawalHint: 'Only returnable cooperative-unit balance can be returned; entrance and membership fees are non-refundable.',
      wdAmount: 'Amount (cooperative units) to return',
      wdReason: 'Reason (exit / other)',
      wdSubmit: 'Submit request',
      wdBusy: 'Sending...',
      wdList: 'Return requests',
    };
  }
  if (locale === 'uk') {
    return {
      title: 'Паєвий внесок (паєві одиниці)',
      hint: 'Облік ПК: 5 грн = 1 паєва одиниця. Перший платіж містить незворотний вступний внесок. До наступних може застосовуватись членський внесок.',
      assets: 'Ваші паєві активи (поворотні)',
      devFund: 'Фонд розвитку (незворотний)',
      unit: 'паєвих одиниць',
      contribute: 'Внести взнос',
      paymentDetails: 'Реквізити для оплати',
      amountUah: 'Сума (грн)',
      expectedUnits: 'Паєві одиниці до зарахування (попередньо)',
      splitHint: 'Вступний та членський внески незворотні й не конвертуються в паєві одиниці.',
      receipt: 'Скриншот платежу',
      uploadReceipt: 'Завантажити зображення',
      submitRequest: 'Відправити на перевірку',
      submitting: 'Надсилання...',
      history: 'Реєстр операцій',
      noTx: 'Ще немає операцій.',
      internalTransfer: 'Переказ між пайщиками (паєві одиниці)',
      recipient: 'Отримувач (ID або email)',
      amount: 'Сума (одиниці)',
      send: 'Надіслати',
      sending: 'Надсилання...',
      depositStatus: 'Заявки на внесок',
      pending: 'очікує',
      completed: 'підтверджено',
      rejected: 'відхилено',
      typeDeposit: 'Внесок',
      typeTransfer: 'Переказ',
      typePurchase: 'Обмін паєвого внеску',
      typeWithdrawal: 'Повернення паєвого внеску',
      credit: 'Зарахування',
      debit: 'Списання',
      colDate: 'Дата',
      colType: 'Тип',
      nonRefundable: 'Незворотні внески (вступний/членський), грн',
      withdrawalTitle: 'Заявка на повернення паєвого внеску',
      withdrawalHint: 'Повертаються лише паєві активи в одиницях; вступний і членський внески не повертаються.',
      wdAmount: 'Кількість одиниць до повернення',
      wdReason: 'Підстава (вихід з ПК тощо)',
      wdSubmit: 'Подати заяву',
      wdBusy: 'Надсилання...',
      wdList: 'Заявки на повернення',
    };
  }
  return {
    title: 'Паевой взнос (паевые единицы)',
    hint: 'Учёт ПК: 5 грн = 1 паевая единица. Первый платёж включает невозвратный вступительный взнос. К последующим может применяться членский взнос.',
    assets: 'Ваши паевые активы (возвратные)',
    devFund: 'Фонд развития (невозвратный)',
    unit: 'паевых единиц',
    contribute: 'Внести взнос',
    paymentDetails: 'Реквизиты для оплаты',
    amountUah: 'Сумма (грн)',
    expectedUnits: 'Паевые единицы к зачислению (предварительно)',
    splitHint: 'Вступительный и членский взносы невозвратны и не конвертируются в паевые единицы.',
    receipt: 'Скриншот платежа',
    uploadReceipt: 'Загрузить изображение',
    submitRequest: 'Отправить на проверку',
    submitting: 'Отправка...',
    history: 'Реестр операций',
    noTx: 'Пока нет операций.',
    internalTransfer: 'Перевод между пайщиками (паевые единицы)',
    recipient: 'Получатель (ID или email)',
    amount: 'Сумма (единицы)',
    send: 'Отправить',
    sending: 'Отправка...',
    depositStatus: 'Заявки на взнос',
    pending: 'ожидает',
    completed: 'подтверждено',
    rejected: 'отклонено',
    typeDeposit: 'Взнос',
    typeTransfer: 'Перевод',
    typePurchase: 'Обмен паевого взноса',
    typeWithdrawal: 'Возврат паевого взноса',
    credit: 'Зачисление',
    debit: 'Списание',
    colDate: 'Дата',
    colType: 'Тип',
    nonRefundable: 'Невозвратные взносы (вступительный/членский), грн',
    withdrawalTitle: 'Заявка на возврат паевого взноса',
    withdrawalHint: 'Возвращаются только паевые активы в единицах; вступительный и членский взносы не возвращаются.',
    wdAmount: 'Количество единиц к возврату',
    wdReason: 'Основание (выход из ПК и т.д.)',
    wdSubmit: 'Подать заявку',
    wdBusy: 'Отправка...',
    wdList: 'Заявки на возврат',
  };
}

function formatTxType(
  t: ReturnType<typeof textByLocale>,
  row: PaiTransactionRow,
): string {
  if (row.type === 'deposit') return t.typeDeposit;
  if (row.type === 'purchase') return t.typePurchase;
  if (row.type === 'withdrawal') return t.typeWithdrawal;
  return t.typeTransfer;
}

function formatDate(locale: Locale, value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-US' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function WalletPanel({ locale, token }: { locale: Locale; token: string | null }) {
  const t = useMemo(() => textByLocale(locale), [locale]);
  const [balancePai, setBalancePai] = useState<number | null>(null);
  const [completedDeposits, setCompletedDeposits] = useState(0);
  const [entranceUah, setEntranceUah] = useState(50);
  const [monthlyUah, setMonthlyUah] = useState(0);
  const [nonRef, setNonRef] = useState({ entrance: 0, membership: 0 });
  const [transactions, setTransactions] = useState<PaiTransactionRow[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequestRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestRow[]>([]);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [uahPerPai, setUahPerPai] = useState(5);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const [uahInput, setUahInput] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [recipient, setRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  const [wdAmount, setWdAmount] = useState('');
  const [wdReason, setWdReason] = useState('');
  const [wdBusy, setWdBusy] = useState(false);

  const uahNum = Number(String(uahInput).replace(',', '.'));

  const splitPreview = useMemo(() => {
    if (!Number.isFinite(uahNum) || uahNum <= 0) return null;
    try {
      return computeDepositSplitPreview(uahNum, completedDeposits, entranceUah, monthlyUah);
    } catch {
      return null;
    }
  }, [uahNum, completedDeposits, entranceUah, monthlyUah]);

  const loadAll = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [balRes, txRes, depRes, wdRes, coopRes, cfgRes] = await Promise.all([
      fetch('/api/pai/balance', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/pai/transactions', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/pai/deposit-requests', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/pai/withdrawal-requests', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/pai/coop-summary', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/pai/config'),
    ]);

    if (cfgRes.ok) {
      const cfg = (await cfgRes.json()) as {
        paymentDetails?: string;
        uahPerPai?: number;
        entranceUah?: number;
        monthlyUah?: number;
      };
      if (cfg.paymentDetails) setPaymentDetails(cfg.paymentDetails);
      if (typeof cfg.uahPerPai === 'number') setUahPerPai(cfg.uahPerPai);
      if (typeof cfg.entranceUah === 'number') setEntranceUah(cfg.entranceUah);
      if (typeof cfg.monthlyUah === 'number') setMonthlyUah(cfg.monthlyUah);
    }

    if (balRes.ok) {
      const b = (await balRes.json()) as {
        balancePai?: number;
        completedDeposits?: number;
        entranceUah?: number;
        monthlyUah?: number;
      };
      setBalancePai(typeof b.balancePai === 'number' ? b.balancePai : 0);
      if (typeof b.completedDeposits === 'number') setCompletedDeposits(b.completedDeposits);
      if (typeof b.entranceUah === 'number') setEntranceUah(b.entranceUah);
      if (typeof b.monthlyUah === 'number') setMonthlyUah(b.monthlyUah);
    }

    if (coopRes.ok) {
      const c = (await coopRes.json()) as { nonRefundable?: { entrance: number; membership: number } };
      if (c.nonRefundable) setNonRef(c.nonRefundable);
    }

    if (txRes.ok) {
      const p = (await txRes.json()) as { transactions?: PaiTransactionRow[] };
      setTransactions(p.transactions ?? []);
    }

    if (depRes.ok) {
      const p = (await depRes.json()) as { depositRequests?: DepositRequestRow[] };
      setDepositRequests(p.depositRequests ?? []);
    }

    if (wdRes.ok) {
      const p = (await wdRes.json()) as { withdrawals?: WithdrawalRequestRow[] };
      setWithdrawals(p.withdrawals ?? []);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const uploadReceiptFile = async (file: File | null) => {
    if (!file || !token) return;
    setUploadingReceipt(true);
    setStatus('');
    const body = new FormData();
    body.append('file', file);
    body.append('folder', 'receipts');
    const res = await fetch('/api/upload', { method: 'POST', body });
    setUploadingReceipt(false);
    if (!res.ok) {
      setStatus(locale === 'en' ? 'Upload failed' : locale === 'uk' ? 'Не вдалося завантажити' : 'Ошибка загрузки');
      return;
    }
    const payload = (await res.json()) as { url?: string };
    if (payload.url) setReceiptUrl(payload.url);
  };

  const submitDeposit = async () => {
    if (!token) return;
    if (!receiptUrl.trim()) {
      setStatus(locale === 'en' ? 'Attach a receipt image' : locale === 'uk' ? 'Додайте зображення чеку' : 'Прикрепите скриншот чека');
      return;
    }
    if (!splitPreview) {
      setStatus(locale === 'uk' ? 'Перевірте суму (перший внесок — не менше вступного + 5 грн)' : 'Check amount');
      return;
    }

    setDepositSubmitting(true);
    setStatus('');
    const res = await fetch('/api/pai/deposit-request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amountUah: uahNum, receiptImageUrl: receiptUrl.trim() }),
    });
    setDepositSubmitting(false);

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus(err.error ?? 'Error');
      return;
    }

    setUahInput('');
    setReceiptUrl('');
    await loadAll();
  };

  const submitTransfer = async () => {
    if (!token) return;
    const amt = Number(String(transferAmount).replace(',', '.'));
    if (!recipient.trim() || !Number.isFinite(amt) || amt <= 0) {
      setStatus(locale === 'en' ? 'Enter recipient and amount' : locale === 'uk' ? 'Вкажіть отримувача та суму' : 'Укажите получателя и сумму');
      return;
    }

    setTransferBusy(true);
    setStatus('');
    const res = await fetch('/api/pai/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient: recipient.trim(), amount: amt }),
    });
    setTransferBusy(false);

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus(err.error ?? 'Error');
      return;
    }

    setRecipient('');
    setTransferAmount('');
    await loadAll();
  };

  const submitWithdrawal = async () => {
    if (!token) return;
    const amt = Number(String(wdAmount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0 || wdReason.trim().length < 3) {
      setStatus(locale === 'uk' ? 'Вкажіть суму та підставу (мін. 3 символи)' : 'Enter amount and reason');
      return;
    }

    setWdBusy(true);
    setStatus('');
    const res = await fetch('/api/pai/withdrawal-request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amountPai: amt, reason: wdReason.trim() }),
    });
    setWdBusy(false);

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus(err.error ?? 'Error');
      return;
    }

    setWdAmount('');
    setWdReason('');
    await loadAll();
  };

  if (!token) {
    return null;
  }

  return (
    <section className="nm-register-card">
      <h1>{t.title}</h1>
      <p className="nm-admin-hint">{t.hint}</p>

      {loading ? <p>...</p> : null}

      {!loading && (
        <>
          <div className="nm-admin-card" style={{ marginTop: '1rem' }}>
            <h3>{t.assets}</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {balancePai !== null ? balancePai.toFixed(2) : '—'} {t.unit}
            </p>
          </div>

          <div className="nm-admin-card" style={{ marginTop: '1rem' }}>
            <h3>{t.devFund}</h3>
            <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {(nonRef.entrance + nonRef.membership).toFixed(2)} грн
            </p>
            <p className="nm-admin-hint">
              {t.nonRefundable} ({t.splitHint})
            </p>
          </div>

          <div className="nm-admin-card" style={{ marginTop: '1rem' }}>
            <h3>{t.contribute}</h3>
            <p className="nm-admin-hint" style={{ whiteSpace: 'pre-wrap' }}>
              {paymentDetails}
            </p>
            <p className="nm-admin-hint">
              {locale === 'uk'
                ? `Курс: ${uahPerPai} грн = 1 паєва одиниця. Вступний: ${entranceUah} грн. Членський (наступні внески): ${monthlyUah} грн.`
                : locale === 'en'
                  ? `Rate: ${uahPerPai} UAH = 1 cooperative unit. Entrance: ${entranceUah} UAH. Membership (later): ${monthlyUah} UAH.`
                  : `Курс: ${uahPerPai} грн = 1 паевая единица. Вступительный: ${entranceUah} грн. Членский (последующие взносы): ${monthlyUah} грн.`}
            </p>
            <label className="nm-admin-field">
              <span>{t.amountUah}</span>
              <input
                type="number"
                min={PAI_UAH_PER_UNIT}
                step="0.01"
                value={uahInput}
                onChange={(e) => setUahInput(e.target.value)}
              />
            </label>
            {splitPreview ? (
              <p className="nm-admin-hint">
                {t.expectedUnits}: <strong>{splitPreview.previewPai.toFixed(2)}</strong>
                <br />
                {splitPreview.isFirst
                  ? `Вступний (незворотний): ${splitPreview.entranceUah.toFixed(2)} грн → паєві: ${splitPreview.convertUah.toFixed(2)} грн`
                  : `Членський (незворотний): ${splitPreview.membershipUah.toFixed(2)} грн → паєві: ${splitPreview.convertUah.toFixed(2)} грн`}
              </p>
            ) : uahInput ? (
              <p className="nm-admin-status">
                {locale === 'uk'
                  ? `Перший внесок: мінімум ${entranceUah + PAI_UAH_PER_UNIT} грн.`
                  : `First contribution: at least ${entranceUah + PAI_UAH_PER_UNIT} UAH.`}
              </p>
            ) : null}
            <div className="nm-admin-field">
              <span>{t.receipt}</span>
              {receiptUrl ? (
                <p>
                  <a href={receiptUrl} target="_blank" rel="noreferrer">
                    {receiptUrl.slice(0, 60)}…
                  </a>
                </p>
              ) : null}
              <input type="file" accept="image/*" onChange={(e) => void uploadReceiptFile(e.target.files?.[0] ?? null)} disabled={uploadingReceipt} />
              <small className="nm-admin-hint">{uploadingReceipt ? '...' : t.uploadReceipt}</small>
            </div>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-primary" onClick={() => void submitDeposit()} disabled={depositSubmitting || !splitPreview}>
                {depositSubmitting ? t.submitting : t.submitRequest}
              </button>
            </div>
          </div>

          <div className="nm-admin-card" style={{ marginTop: '1rem' }}>
            <h3>{t.internalTransfer}</h3>
            <label className="nm-admin-field">
              <span>{t.recipient}</span>
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} autoComplete="off" />
            </label>
            <label className="nm-admin-field">
              <span>{t.amount}</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
            </label>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-primary" onClick={() => void submitTransfer()} disabled={transferBusy}>
                {transferBusy ? t.sending : t.send}
              </button>
            </div>
          </div>

          <div className="nm-admin-card" style={{ marginTop: '1rem' }}>
            <h3>{t.withdrawalTitle}</h3>
            <p className="nm-admin-hint">{t.withdrawalHint}</p>
            <label className="nm-admin-field">
              <span>{t.wdAmount}</span>
              <input type="number" min="0.01" step="0.01" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} />
            </label>
            <label className="nm-admin-field">
              <span>{t.wdReason}</span>
              <textarea rows={2} value={wdReason} onChange={(e) => setWdReason(e.target.value)} />
            </label>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-secondary" onClick={() => void submitWithdrawal()} disabled={wdBusy}>
                {wdBusy ? t.wdBusy : t.wdSubmit}
              </button>
            </div>
            <h4 style={{ marginTop: '1rem' }}>{t.wdList}</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {withdrawals.map((w) => (
                <li key={w.id} style={{ marginBottom: '0.35rem' }}>
                  {w.amountPai.toFixed(2)} од. — {w.status}
                  {w.adminComment ? ` (${w.adminComment})` : ''}
                </li>
              ))}
            </ul>
          </div>

          <div className="nm-admin-card" style={{ marginTop: '1rem' }}>
            <h3>{t.depositStatus}</h3>
            {depositRequests.length === 0 ? <p className="nm-admin-hint">—</p> : null}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {depositRequests.map((d) => (
                <li key={d.id} style={{ marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                  <strong>{d.amountUah.toFixed(2)} грн</strong> → прев’ю {d.amountPai.toFixed(2)} од. —{' '}
                  {d.status === 'pending' ? t.pending : d.status === 'completed' ? t.completed : t.rejected}
                  {d.adminComment ? ` (${d.adminComment})` : ''}
                  {d.appliedBreakdown && d.status === 'completed' ? (
                    <small>
                      <br />
                      {locale === 'uk'
                        ? `Зараховано: ${String(d.appliedBreakdown.pai_credited ?? '')} од.; вступний ${String(d.appliedBreakdown.entrance_uah ?? '')} грн; членський ${String(d.appliedBreakdown.membership_uah ?? '')} грн`
                        : `Applied: ${String(d.appliedBreakdown.pai_credited ?? '')} units`}
                    </small>
                  ) : null}
                  <br />
                  <small>{formatDate(locale, d.createdAt)}</small>
                </li>
              ))}
            </ul>
          </div>

          <div className="nm-admin-card" style={{ marginTop: '1rem' }}>
            <h3>{t.history}</h3>
            {transactions.length === 0 ? <p className="nm-admin-hint">{t.noTx}</p> : null}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.35rem' }}>{t.colDate}</th>
                    <th style={{ textAlign: 'left', padding: '0.35rem' }}>{t.unit}</th>
                    <th style={{ textAlign: 'left', padding: '0.35rem' }}>{t.colType}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: '0.35rem' }}>{formatDate(locale, row.createdAt)}</td>
                      <td style={{ padding: '0.35rem' }}>
                        {row.amount > 0 ? '+' : ''}
                        {row.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.35rem' }}>
                        {formatTxType(t, row)} ({row.amount >= 0 ? t.credit : t.debit})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {status ? <p className="nm-admin-status">{status}</p> : null}
    </section>
  );
}
