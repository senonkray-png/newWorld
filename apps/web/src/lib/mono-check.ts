import { getSupabaseServiceClient } from '@/lib/supabase-service';

const MONO_API = 'https://api.monobank.ua';

/** Курс: 5 грн = 1 пай (500 копійок = 1 пай) */
const KOPIYKY_PER_PAI = 500;

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
 * Витягти числовий user ID з тексту коментаря / опису.
 * Шукає member_id (наприклад 1001) або UUID.
 */
function extractUserId(comment: string | undefined, description: string | undefined): string | null {
  for (const text of [comment, description]) {
    if (!text) continue;
    // UUID
    const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    if (uuidMatch) return uuidMatch[0];
    // Числовий member_id (наприклад 1001, 1042)
    const numMatch = text.match(/\b(\d{4,})\b/);
    if (numMatch) return numMatch[1];
  }
  return null;
}

/**
 * Знайти користувача за member_id або UUID.
 */
async function resolveUser(supabase: any, rawId: string): Promise<{ id: string } | null> {
  // Спочатку перевіримо member_id (числовий)
  const memberId = Number(rawId);
  if (Number.isFinite(memberId) && memberId > 0 && String(memberId) === rawId) {
    const { data } = await supabase
      .from('app_users')
      .select('id')
      .eq('member_id', memberId)
      .maybeSingle();
    if (data?.id) return { id: data.id };
  }

  // UUID
  if (/^[0-9a-f]{8}-/i.test(rawId)) {
    const { data } = await supabase
      .from('app_users')
      .select('id')
      .eq('id', rawId)
      .maybeSingle();
    if (data?.id) return { id: data.id };
  }

  return null;
}

/**
 * Основна логіка:
 * 1. Отримати виписку з банки Monobank.
 * 2. Для кожної транзакції перевірити чи вже оброблена (bank_transaction_id).
 * 3. Знайти user ID у коментарі.
 * 4. Якщо знайдено — нарахувати паї (сума / 500 копійок).
 * 5. Якщо не розпізнано — записати як manual_pending для адміна.
 */
export async function runMonoCheck(): Promise<{ matched: number; manual: number; checked: number; errors: string[] }> {
  const supabase = getSupabaseServiceClient() as any;

  const statements = await fetchStatements(24);

  const errors: string[] = [];
  let matched = 0;
  let manual = 0;

  for (const tx of statements) {
    // Пропускаємо витрати (amount < 0)
    if (tx.amount <= 0) continue;

    // Перевірити чи транзакція вже оброблена
    const { data: existing } = await supabase
      .from('processed_payments')
      .select('id')
      .eq('bank_transaction_id', tx.id)
      .maybeSingle();

    if (existing) continue;

    const amountUah = tx.amount / 100;
    const amountPai = Math.round((tx.amount / KOPIYKY_PER_PAI) * 100) / 100;
    const rawComment = [tx.comment, tx.description].filter(Boolean).join(' | ');

    // Спробувати знайти user ID у коментарі
    const rawId = extractUserId(tx.comment, tx.description);
    const user = rawId ? await resolveUser(supabase, rawId) : null;

    if (user) {
      // Автоматичне нарахування
      try {
        // Запис у processed_payments
        const { error: insertErr } = await supabase
          .from('processed_payments')
          .insert({
            bank_transaction_id: tx.id,
            user_id: user.id,
            amount_uah: amountUah,
            amount_pai: amountPai,
            comment_raw: rawComment,
            status: 'success',
            mono_time: tx.time,
            resolved_at: new Date().toISOString(),
          });

        if (insertErr) {
          errors.push(`Insert processed_payment failed: ${insertErr.message}`);
          continue;
        }

        // Запис у pai_transactions
        await supabase
          .from('pai_transactions')
          .insert({
            user_id: user.id,
            type: 'deposit',
            amount: amountPai,
            status: 'completed',
            meta: {
              source: 'monobank_auto',
              bank_tx_id: tx.id,
              amount_uah: amountUah,
            },
          });

        // Оновити баланс
        const { data: currentUser } = await supabase
          .from('app_users')
          .select('balance_pai')
          .eq('id', user.id)
          .single();

        if (currentUser) {
          const newBalance = (Number(currentUser.balance_pai) || 0) + amountPai;
          await supabase
            .from('app_users')
            .update({ balance_pai: newBalance, is_active: newBalance > 0 })
            .eq('id', user.id);
        }

        matched++;
      } catch (e) {
        errors.push(`Auto-approve error for tx ${tx.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      // Не розпізнано — manual_pending
      try {
        const { error: insertErr } = await supabase
          .from('processed_payments')
          .insert({
            bank_transaction_id: tx.id,
            user_id: null,
            amount_uah: amountUah,
            amount_pai: 0,
            comment_raw: rawComment,
            status: 'manual_pending',
            mono_time: tx.time,
          });

        if (insertErr) {
          errors.push(`Insert manual_pending failed: ${insertErr.message}`);
          continue;
        }
        manual++;
      } catch (e) {
        errors.push(`Manual insert error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { matched, manual, checked: statements.length, errors };
}
