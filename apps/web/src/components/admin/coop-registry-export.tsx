'use client';

import { useState } from 'react';

export function CoopRegistryExport({ accessToken }: { accessToken: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    const url = `/api/admin/coop-registry/export?year=${year}&month=${month}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    setBusy(false);
    if (!res.ok) return;

    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `coop-registry-${year}-${String(month).padStart(2, '0')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openPrintView = async () => {
    setBusy(true);
    const url = `/api/admin/coop-registry/export-html?year=${year}&month=${month}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    setBusy(false);
    if (!res.ok) return;

    const html = await res.text();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="nm-admin-card" style={{ marginTop: '2rem' }}>
      <h3>Експорт реєстру пайщиків</h3>
      <p className="nm-admin-hint">
        Реєстр внутрішніх операцій ПК за обраний місяць (для звітності, «нульовий дохід» від зовнішньої торгівлі).
        Кожна операція позначена як «Внутрішнє споживання пайщика».
      </p>
      <div className="nm-admin-actions" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
        <label className="nm-admin-field">
          <span>Рік</span>
          <input type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label className="nm-admin-field">
          <span>Місяць</span>
          <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
        </label>
        <button type="button" className="nm-btn nm-btn-secondary" onClick={() => void download()} disabled={busy}>
          {busy ? '...' : 'Завантажити .txt'}
        </button>
        <button type="button" className="nm-btn nm-btn-primary" onClick={() => void openPrintView()} disabled={busy}>
          {busy ? '...' : 'Друк / PDF'}
        </button>
      </div>
    </div>
  );
}
