import { getCoopFundConfig } from '@/lib/coop-config';
import { getSupabaseServiceClient } from '@/lib/supabase-service';

/** Курс: 5 грн = 1 паєва одиниця */
export const PAI_UAH_PER_UNIT = 5;

export type PaiTxType = 'deposit' | 'transfer' | 'purchase' | 'withdrawal';

export type PaiTransactionRow = {
  id: string;
  userId: string;
  type: PaiTxType;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  meta: Record<string, unknown>;
  createdAt: string;
};

export type DepositRequestRow = {
  id: string;
  userId: string;
  amountUah: number;
  amountPai: number;
  receiptImage: string;
  paymentCode: string | null;
  monoTxId: string | null;
  status: 'pending' | 'completed' | 'rejected';
  adminComment: string | null;
  createdAt: string;
  resolvedAt: string | null;
  appliedBreakdown: Record<string, unknown> | null;
};

export type DepositSplitPreview = {
  entranceUah: number;
  membershipUah: number;
  convertUah: number;
  previewPai: number;
  isFirst: boolean;
};

export type WithdrawalRequestRow = {
  id: string;
  userId: string;
  amountPai: number;
  reason: string;
  status: 'pending' | 'completed' | 'rejected';
  adminComment: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type CoopRegistryEntryRow = {
  id: string;
  userId: string;
  entryKind: string;
  body: string;
  amountUah: number | null;
  amountPai: number | null;
  productTitle: string | null;
  taxClassification: string;
  createdAt: string;
};

function cleanText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Простий перерахунок без відокремлення внесків (для підказок) */
export function computePaiFromUah(amountUah: number): number {
  if (!Number.isFinite(amountUah) || amountUah <= 0) {
    return 0;
  }
  return Math.round((amountUah / PAI_UAH_PER_UNIT) * 100) / 100;
}

export async function countCompletedDeposits(userId: string): Promise<number> {
  const supabase = getSupabaseServiceClient() as any;
  const { count, error } = await supabase
    .from('deposit_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) {
    throw error;
  }

  return typeof count === 'number' ? count : 0;
}

/** Прев’ю розбивки внеску (має збігатися з логікою RPC pai_approve_deposit) */
export function computeDepositSplitPreview(
  amountUah: number,
  completedPriorDeposits: number,
  entranceUah: number,
  monthlyUah: number,
): DepositSplitPreview {
  if (!Number.isFinite(amountUah) || amountUah <= 0) {
    throw new Error('amount_uah_invalid');
  }

  if (completedPriorDeposits === 0) {
    if (amountUah < entranceUah + PAI_UAH_PER_UNIT) {
      throw new Error('first_deposit_too_small');
    }
    const ent = Math.min(entranceUah, amountUah);
    const convert = amountUah - ent;
    const previewPai = Math.round((convert / PAI_UAH_PER_UNIT) * 100) / 100;
    return {
      entranceUah: ent,
      membershipUah: 0,
      convertUah: convert,
      previewPai,
      isFirst: true,
    };
  }

  const mem = Math.min(monthlyUah, amountUah);
  const convert = amountUah - mem;
  const previewPai = Math.round((convert / PAI_UAH_PER_UNIT) * 100) / 100;
  return {
    entranceUah: 0,
    membershipUah: mem,
    convertUah: convert,
    previewPai,
    isFirst: false,
  };
}

export async function getBalancePai(userId: string): Promise<number> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('app_users')
    .select('balance_pai')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return parseAmount(data?.balance_pai);
}

export async function getNonRefundableUahForUser(userId: string): Promise<{ entrance: number; membership: number }> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('coop_fund_ledger')
    .select('kind, amount_uah')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  let entrance = 0;
  let membership = 0;
  for (const row of data ?? []) {
    if (row.kind === 'entrance') entrance += parseAmount(row.amount_uah);
    if (row.kind === 'membership') membership += parseAmount(row.amount_uah);
  }

  return { entrance, membership };
}

export async function getReserveFundTotalUah(): Promise<number> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase.from('coop_reserve_fund').select('total_uah').eq('id', 1).maybeSingle();

  if (error) {
    throw error;
  }

  return parseAmount(data?.total_uah);
}

export async function listPaiTransactions(userId: string, limit = 100): Promise<PaiTransactionRow[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('pai_transactions')
    .select('id, user_id, type, amount, status, meta, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type as PaiTxType,
    amount: parseAmount(row.amount),
    status: row.status,
    meta: (row.meta && typeof row.meta === 'object' ? row.meta : {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMemberId(value: string): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && String(n) === value;
}

export async function resolveAppUserByIdOrEmail(raw: string): Promise<{ id: string; email: string } | null> {
  const trimmed = cleanText(raw);
  if (!trimmed) {
    return null;
  }

  const supabase = getSupabaseServiceClient() as any;

  // Step 0: Try numeric member_id match (short public ID like 1001)
  if (isMemberId(trimmed)) {
    const { data: byMember, error: memberError } = await supabase
      .from('app_users')
      .select('id, email')
      .eq('member_id', Number(trimmed))
      .maybeSingle();

    if (memberError) {
      throw memberError;
    }

    if (byMember?.id) {
      return { id: byMember.id, email: cleanText(byMember.email) };
    }
  }

  if (isUuid(trimmed)) {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, email')
      .eq('id', trimmed)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return { id: data.id, email: cleanText(data.email) };
    }
  }

  const { data: byEmail, error: emailError } = await supabase
    .from('app_users')
    .select('id, email')
    .eq('email', trimmed)
    .maybeSingle();

  if (emailError) {
    throw emailError;
  }

  if (byEmail?.id) {
    return { id: byEmail.id, email: cleanText(byEmail.email) };
  }

  const { data: byIlike, error: ilikeError } = await supabase
    .from('app_users')
    .select('id, email')
    .ilike('email', trimmed)
    .limit(1)
    .maybeSingle();

  if (ilikeError) {
    throw ilikeError;
  }

  if (byIlike?.id) {
    return { id: byIlike.id, email: cleanText(byIlike.email) };
  }

  return null;
}

export async function createDepositRequest(
  userId: string,
  amountUah: number,
  receiptImageUrl: string,
): Promise<DepositRequestRow> {
  const receipt = cleanText(receiptImageUrl);
  if (!receipt) {
    throw new Error('receipt_required');
  }

  const { entranceUah, monthlyUah } = getCoopFundConfig();
  const completed = await countCompletedDeposits(userId);
  const split = computeDepositSplitPreview(amountUah, completed, entranceUah, monthlyUah);

  const supabase = getSupabaseServiceClient() as any;

  // Generate unique payment code PAI-XXXX with collision retry
  let paymentCode = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `PAI-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const { data: existing } = await supabase
      .from('deposit_requests')
      .select('id')
      .eq('payment_code', candidate)
      .eq('status', 'pending')
      .maybeSingle();
    if (!existing) {
      paymentCode = candidate;
      break;
    }
  }
  if (!paymentCode) {
    // Fallback: use timestamp-based code to guarantee uniqueness
    paymentCode = `PAI-${String(Date.now()).slice(-6)}`;
  }

  const { data, error } = await supabase
    .from('deposit_requests')
    .insert({
      user_id: userId,
      amount_uah: amountUah,
      amount_pai: split.previewPai,
      receipt_image: receipt,
      payment_code: paymentCode,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapDepositRequest(data);
}

function mapDepositRequest(row: any): DepositRequestRow {
  const raw = row.applied_breakdown;
  return {
    id: row.id,
    userId: row.user_id,
    amountUah: parseAmount(row.amount_uah),
    amountPai: parseAmount(row.amount_pai),
    receiptImage: cleanText(row.receipt_image),
    paymentCode: row.payment_code ? String(row.payment_code) : null,
    monoTxId: row.mono_tx_id ? String(row.mono_tx_id) : null,
    status: row.status,
    adminComment: row.admin_comment ? String(row.admin_comment) : null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
    appliedBreakdown: raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null,
  };
}

export async function transferPaiP2P(senderId: string, recipientRaw: string, amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('invalid_amount');
  }

  const recipient = await resolveAppUserByIdOrEmail(recipientRaw);
  if (!recipient) {
    throw new Error('recipient_not_found');
  }

  if (recipient.id === senderId) {
    throw new Error('cannot_transfer_to_self');
  }

  const supabase = getSupabaseServiceClient() as any;
  const { error } = await supabase.rpc('pai_transfer_p2p', {
    p_sender_id: senderId,
    p_recipient_id: recipient.id,
    p_amount: amount,
  });

  if (error) {
    const msg = String(error.message ?? '');
    if (msg.includes('insufficient_balance')) {
      throw new Error('insufficient_balance');
    }
    throw error;
  }
}

export async function purchaseProductWithPai(buyerId: string, productId: string): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;
  const { error } = await supabase.rpc('pai_purchase_product', {
    p_buyer_id: buyerId,
    p_product_id: productId,
  });

  if (error) {
    const msg = String(error.message ?? '');
    if (msg.includes('insufficient_balance')) {
      throw new Error('insufficient_balance');
    }
    if (msg.includes('product_not_found')) {
      throw new Error('product_not_found');
    }
    if (msg.includes('product_unavailable')) {
      throw new Error('product_unavailable');
    }
    if (msg.includes('cannot_buy_own_product')) {
      throw new Error('cannot_buy_own_product');
    }
    throw error;
  }
}

export async function approveDepositRequest(requestId: string): Promise<void> {
  const { entranceUah, monthlyUah } = getCoopFundConfig();
  const supabase = getSupabaseServiceClient() as any;
  const { error } = await supabase.rpc('pai_approve_deposit', {
    p_request_id: requestId,
    p_entrance_uah: entranceUah,
    p_monthly_uah: monthlyUah,
  });

  if (error) {
    const msg = String(error.message ?? '');
    if (msg.includes('request_not_pending') || msg.includes('request_not_found')) {
      throw new Error('request_invalid');
    }
    if (msg.includes('first_deposit_too_small') || msg.includes('invalid_split')) {
      throw new Error('deposit_split_invalid');
    }
    throw error;
  }
}

export async function rejectDepositRequest(requestId: string, adminComment: string): Promise<void> {
  const comment = cleanText(adminComment);
  if (!comment) {
    throw new Error('comment_required');
  }

  const supabase = getSupabaseServiceClient() as any;

  const { data: row, error: fetchError } = await supabase
    .from('deposit_requests')
    .select('id, status')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!row || row.status !== 'pending') {
    throw new Error('request_invalid');
  }

  const { error } = await supabase
    .from('deposit_requests')
    .update({
      status: 'rejected',
      admin_comment: comment,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) {
    throw error;
  }
}

export type DepositRequestAdminRow = DepositRequestRow & { userEmail: string };

export async function listDepositRequestsForAdmin(): Promise<DepositRequestAdminRow[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('deposit_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  const rows = (data ?? []).map(mapDepositRequest);
  const userIds = Array.from(new Set(rows.map((r: DepositRequestRow) => r.userId)));

  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('app_users').select('id, email').in('id', userIds);
    (users ?? []).forEach((u: { id: string; email: string | null }) => {
      emailMap.set(u.id, cleanText(u.email));
    });
  }

  return rows.map((r: DepositRequestRow) => ({ ...r, userEmail: emailMap.get(r.userId) ?? '' }));
}

export async function listDepositRequestsForUser(userId: string): Promise<DepositRequestRow[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('deposit_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDepositRequest);
}

export async function listCoopRegistryForMonth(year: number, month: number): Promise<CoopRegistryEntryRow[]> {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const supabase = getSupabaseServiceClient() as any;

  const { data, error } = await supabase
    .from('coop_registry_entries')
    .select('id, user_id, entry_kind, body, amount_uah, amount_pai, product_title, tax_classification, created_at')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    entryKind: row.entry_kind,
    body: String(row.body),
    amountUah: row.amount_uah != null ? parseAmount(row.amount_uah) : null,
    amountPai: row.amount_pai != null ? parseAmount(row.amount_pai) : null,
    productTitle: row.product_title ? String(row.product_title) : null,
    taxClassification: String(row.tax_classification ?? ''),
    createdAt: row.created_at,
  }));
}

export function formatRegistryExportLines(rows: CoopRegistryEntryRow[], year: number, month: number): string {
  const header = `Реєстр операцій ПК — ${year}-${String(month).padStart(2, '0')}\n` +
    `Класифікація для відображення: внутрішнє споживання пайщиків (нульовий дохід від зовнішньої торгівлі).\n\n`;

  const lines = rows.map((r, i) => `${i + 1}. [${r.createdAt}] ${r.body.replace(/\n/g, ' ')}`);
  return header + lines.join('\n\n');
}

export async function submitWithdrawalRequest(userId: string, amountPai: number, reason: string): Promise<string> {
  if (!Number.isFinite(amountPai) || amountPai <= 0) {
    throw new Error('invalid_amount');
  }

  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase.rpc('coop_submit_withdrawal', {
    p_user_id: userId,
    p_amount_pai: amountPai,
    p_reason: reason,
  });

  if (error) {
    const msg = String(error.message ?? '');
    if (msg.includes('insufficient_balance')) {
      throw new Error('insufficient_balance');
    }
    if (msg.includes('reason_required')) {
      throw new Error('reason_required');
    }
    throw error;
  }

  return String(data);
}

export function mapWithdrawalRequest(row: any): WithdrawalRequestRow {
  return {
    id: row.id,
    userId: row.user_id,
    amountPai: parseAmount(row.amount_pai),
    reason: cleanText(row.reason),
    status: row.status,
    adminComment: row.admin_comment ? String(row.admin_comment) : null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
  };
}

export async function listWithdrawalRequestsForUser(userId: string): Promise<WithdrawalRequestRow[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapWithdrawalRequest);
}

export type WithdrawalRequestAdminRow = WithdrawalRequestRow & { userEmail: string };

export async function listWithdrawalRequestsForAdmin(): Promise<WithdrawalRequestAdminRow[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  const rows = (data ?? []).map(mapWithdrawalRequest);
  const userIds = Array.from(new Set(rows.map((r: WithdrawalRequestRow) => r.userId)));
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('app_users').select('id, email').in('id', userIds);
    (users ?? []).forEach((u: { id: string; email: string | null }) => {
      emailMap.set(u.id, cleanText(u.email));
    });
  }

  return rows.map((r: WithdrawalRequestRow) => ({ ...r, userEmail: emailMap.get(r.userId) ?? '' }));
}

export async function resolveWithdrawalRequest(
  requestId: string,
  approve: boolean,
  adminComment: string,
): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;
  const { error } = await supabase.rpc('coop_resolve_withdrawal', {
    p_request_id: requestId,
    p_approve: approve,
    p_admin_comment: adminComment,
  });

  if (error) {
    const msg = String(error.message ?? '');
    if (msg.includes('request_not_pending') || msg.includes('request_not_found')) {
      throw new Error('request_invalid');
    }
    if (msg.includes('comment_required')) {
      throw new Error('comment_required');
    }
    if (msg.includes('insufficient_balance')) {
      throw new Error('insufficient_balance');
    }
    throw error;
  }
}

/** Формування HTML-реєстру для друку в PDF (через Print → Save as PDF у браузері) */
export function formatRegistryExportHtml(rows: CoopRegistryEntryRow[], year: number, month: number): string {
  const monthStr = String(month).padStart(2, '0');
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const rowsHtml = rows.map((r, i) => {
    const date = new Date(r.createdAt);
    const dateStr = Number.isNaN(date.getTime()) ? r.createdAt : date.toLocaleDateString('uk-UA');
    return `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(dateStr)}</td>
      <td>${escapeHtml(r.entryKind)}</td>
      <td>${escapeHtml(r.body)}</td>
      <td>${r.amountUah != null ? r.amountUah.toFixed(2) : '—'}</td>
      <td>${r.amountPai != null ? r.amountPai.toFixed(2) : '—'}</td>
      <td>${r.productTitle ? escapeHtml(r.productTitle) : '—'}</td>
      <td>${escapeHtml(r.taxClassification)}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>Реєстр операцій ПК — ${year}-${monthStr}</title>
<style>
  body { font-family: 'Times New Roman', serif; margin: 2cm; font-size: 12pt; color: #000; }
  h1 { text-align: center; font-size: 16pt; margin-bottom: 0.3em; }
  .subtitle { text-align: center; font-size: 11pt; color: #555; margin-bottom: 1.5em; }
  table { width: 100%; border-collapse: collapse; margin-top: 1em; }
  th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 10pt; }
  th { background: #f0f0f0; font-weight: bold; }
  .footer { margin-top: 2em; font-size: 10pt; color: #555; }
  @media print { body { margin: 1cm; } }
</style>
</head>
<body>
<h1>Реєстр внутрішніх операцій Потребительского Кооператива</h1>
<p class="subtitle">Період: ${year}-${monthStr} | Класифікація: внутрішнє споживання пайщиків (нульовий дохід від зовнішньої торгівлі)</p>
<table>
<thead>
<tr>
  <th>№</th>
  <th>Дата</th>
  <th>Тип операції</th>
  <th>Опис (протокол)</th>
  <th>Сума, грн</th>
  <th>Паєві од.</th>
  <th>Продукт/послуга</th>
  <th>Класифікація</th>
</tr>
</thead>
<tbody>
${rowsHtml}
</tbody>
</table>
<p class="footer">
  Всього записів: ${rows.length}. Документ сформовано автоматично системою обліку ПК.<br>
  Усі операції є внутрішнім споживанням пайщиків кооперативу та не містять зовнішнього доходу.
</p>
</body>
</html>`;
}
