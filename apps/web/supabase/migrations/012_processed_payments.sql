-- Журнал оброблених платежів з Monobank (processed_payments)
-- Замість розширення deposit_requests — окрема таблиця для всіх транзакцій банки

CREATE TABLE IF NOT EXISTS public.processed_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_transaction_id TEXT NOT NULL UNIQUE,           -- Monobank tx.id (захист від дублів)
  user_id         UUID REFERENCES public.app_users(id),-- кому зараховано (NULL якщо не розпізнано)
  amount_uah      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- сума у грн
  amount_pai      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- нараховано паїв
  comment_raw     TEXT,                                -- оригінальний коментар з банку
  status          TEXT NOT NULL DEFAULT 'manual_pending'
                    CHECK (status IN ('success','manual_pending','rejected')),
  admin_comment   TEXT,                                -- коментар адміна (для manual_pending)
  mono_time       BIGINT,                              -- unix time з Monobank
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_processed_payments_status
  ON public.processed_payments(status);

CREATE INDEX IF NOT EXISTS idx_processed_payments_user_id
  ON public.processed_payments(user_id);

-- RPC: Ручне підтвердження адміном — нарахувати паї конкретному користувачу
CREATE OR REPLACE FUNCTION public.admin_confirm_payment(
  p_payment_id UUID,
  p_user_id    UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount_uah NUMERIC;
  v_amount_pai NUMERIC;
  v_status     TEXT;
BEGIN
  SELECT amount_uah, status INTO v_amount_uah, v_status
    FROM public.processed_payments
    WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  IF v_status <> 'manual_pending' THEN
    RAISE EXCEPTION 'payment_already_processed';
  END IF;

  -- Перевірити що користувач існує
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- Розрахунок паїв: amount_uah / 5
  v_amount_pai := ROUND(v_amount_uah / 5, 2);

  -- Нарахувати баланс
  UPDATE public.app_users
    SET balance_pai = COALESCE(balance_pai, 0) + v_amount_pai
    WHERE id = p_user_id;

  -- Записати транзакцію в pai_transactions
  INSERT INTO public.pai_transactions (user_id, type, amount, status, meta)
    VALUES (p_user_id, 'deposit', v_amount_pai, 'completed',
            jsonb_build_object('source', 'monobank_manual', 'payment_id', p_payment_id, 'amount_uah', v_amount_uah));

  -- Оновити processed_payments
  UPDATE public.processed_payments
    SET user_id     = p_user_id,
        amount_pai  = v_amount_pai,
        status      = 'success',
        resolved_at = now()
    WHERE id = p_payment_id;
END;
$$;
