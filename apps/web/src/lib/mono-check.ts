import { getCoopFundConfig } from '@/lib/coop-config';
import { getSupabaseServiceClient } from '@/lib/supabase-service';

const MONO_API = 'https://api.monobank.ua';

function getMonoToken(): string {
  const token = process.env.MONO_TOKEN;
  if (!token) throw new Error('MONO_TOKEN env variable is not set');
  return token;
}

function getMonoAccount(): string {
  return process.env.MONO_ACCOUNT ?? '0';
}

type MonoStatement = {
  id: string;
  time: number;
  description: string;
  comment?: string;
  amount: number;          // в копійках (50000 = 500 грн)
  operationAmount: number;
  currencyCode: number;
  balance: number;
};

/**
 * Отримати виписку Monobank за останні `hours` годин.
 */
async function fetchStatements(hours = 24): Promise<MonoStatement[]> {
  const token = getMonoToken();
  const account = getMonoAccount();
  const from = Math.floor(Date.now() / 1000) - hours * 3600;

  const res = await fetch(`${MONO_API}/personal/statement/${account}/${from}`, {
    headers: { 'X-Token': token },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Monobank API ${res.status}: ${text}`);
  }

  return (await res.json()) as MonoStatement[];
}

/**
 * Витягти код PAI-XXXX з коментаря або опису до платежу.
 * Monobank може записати код як у comment, так і в description.
 */
function extractPaymentCode(comment: string | undefined, description: string | undefined): string | null {
  for (const text of [comment, description]) {
    if (!text) continue;
    const match = text.match(/PAI-(\d{4,})/i);
    if (match) return `PAI-${match[1]}`;
  }
  return null;
}

type PendingDeposit = {
  id: string;
  user_id: string;
  amount_uah: number;
  payment_code: string;
};

/**
 * Основна логіка: зіставити транзакції Monobank із pending-заявками.
 * Повертає кількість зарахованих заявок.
 */
export async function runMonoCheck(): Promise<{ matched: number; checked: number; errors: string[] }> {
  const supabase = getSupabaseServiceClient() as any;

  // 1. Отримати pending-заявки з payment_code
  const { data: pendingRows, error: pendingErr } = await supabase
    .from('deposit_requests')
    .select('id, user_id, amount_uah, payment_code')
    .eq('status', 'pending')
    .not('payment_code', 'is', null);

  if (pendingErr) throw pendingErr;
  if (!pendingRows || pendingRows.length === 0) {
    return { matched: 0, checked: 0, errors: [] };
  }

  const pending = pendingRows as PendingDeposit[];
  const codeMap = new Map<string, PendingDeposit>();
  for (const row of pending) {
    if (row.payment_code) {
      codeMap.set(row.payment_code.toUpperCase(), row);
    }
  }

  // 2. Отримати виписку з банки
  const statements = await fetchStatements(24);

  const errors: string[] = [];
  let matched = 0;

  const { entranceUah, monthlyUah } = getCoopFundConfig();

  for (const tx of statements) {
    // Пропускаємо витрати (amount < 0)
    if (tx.amount <= 0) continue;

    const code = extractPaymentCode(tx.comment, tx.description);
    if (!code) continue;

    const deposit = codeMap.get(code.toUpperCase());
    if (!deposit) continue;

    const txAmountUah = tx.amount / 100; // копійки → гривні

    // Перевірити, що сума збігається (з допуском ±1 грн на комісію)
    if (Math.abs(txAmountUah - deposit.amount_uah) > 1) continue;

    // Перевірити, що ця транзакція ще не була оброблена
    const { data: existing } = await supabase
      .from('deposit_requests')
      .select('id')
      .eq('mono_tx_id', tx.id)
      .maybeSingle();

    if (existing) continue; // вже зараховано

    // 3. Записати mono_tx_id, потім підтвердити через RPC
    try {
      const { error: updateErr } = await supabase
        .from('deposit_requests')
        .update({ mono_tx_id: tx.id })
        .eq('id', deposit.id);

      if (updateErr) {
        errors.push(`Update mono_tx_id failed for ${deposit.id}: ${updateErr.message}`);
        continue;
      }

      const { error: rpcErr } = await supabase.rpc('pai_approve_deposit', {
        p_request_id: deposit.id,
        p_entrance_uah: entranceUah,
        p_monthly_uah: monthlyUah,
      });

      if (rpcErr) {
        errors.push(`RPC approve failed for ${deposit.id}: ${rpcErr.message}`);
        continue;
      }

      matched++;
      codeMap.delete(code.toUpperCase()); // не зараховувати двічі
    } catch (e) {
      errors.push(`Error for ${deposit.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { matched, checked: statements.length, errors };
}
