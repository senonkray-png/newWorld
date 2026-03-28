-- Модернизация под Устав ПК: резервный фонд, реестр операций, возврат паевого взноса, доработка зачислений

-- Расширение типа транзакций
ALTER TYPE public.pai_tx_type ADD VALUE IF NOT EXISTS 'withdrawal';

-- Агрегат резервного / целевого фонда (невозвратные взносы)
CREATE TABLE IF NOT EXISTS public.coop_reserve_fund (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_uah NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (total_uah >= 0)
);

INSERT INTO public.coop_reserve_fund (id, total_uah) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Детализация невозвратных взносов по пользователям
CREATE TABLE IF NOT EXISTS public.coop_fund_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('entrance', 'membership', 'development')),
  amount_uah NUMERIC(14, 2) NOT NULL CHECK (amount_uah >= 0),
  deposit_request_id UUID REFERENCES public.deposit_requests(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coop_fund_ledger_user ON public.coop_fund_ledger(user_id, created_at DESC);

-- Внутренние «протоколы» / строки реестра для отчётности
CREATE TABLE IF NOT EXISTS public.coop_registry_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  entry_kind TEXT NOT NULL CHECK (entry_kind IN ('deposit', 'internal_exchange', 'withdrawal', 'transfer')),
  body TEXT NOT NULL,
  amount_uah NUMERIC(14, 2),
  amount_pai NUMERIC(14, 2),
  product_title TEXT,
  related_product_id UUID,
  related_deposit_request_id UUID,
  related_transaction_hint TEXT,
  tax_classification TEXT NOT NULL DEFAULT 'Внутреннее потребление пайщика',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coop_registry_created ON public.coop_registry_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coop_registry_user ON public.coop_registry_entries(user_id, created_at DESC);

-- Заявки на возврат паевого взноса (членские/вступительные не возвращаются — только balance_pai)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  amount_pai NUMERIC(14, 2) NOT NULL CHECK (amount_pai > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status, created_at DESC);

ALTER TABLE public.coop_fund_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coop_registry_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coop_reserve_fund ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS applied_breakdown JSONB;

-- Дозволити прев’ю 0 паєвих одиниць, якщо сума повністю пішла на членський внесок
ALTER TABLE public.deposit_requests
  DROP CONSTRAINT IF EXISTS deposit_requests_amount_pai_check;

ALTER TABLE public.deposit_requests
  ADD CONSTRAINT deposit_requests_amount_pai_check CHECK (amount_pai >= 0);

COMMENT ON TABLE public.coop_registry_entries IS 'Реестр внутренних операций ПК (для отчётности)';
COMMENT ON TABLE public.coop_fund_ledger IS 'Невозвратные взносы: вступительный, членский и т.д.';
COMMENT ON COLUMN public.app_users.balance_pai IS 'Паевые активы (возвратные), в паевых единицах';

-- Одна сигнатура з параметрами за замовчуванням (прибираємо стару 007 з одним аргументом)
DROP FUNCTION IF EXISTS public.pai_approve_deposit(UUID);

-- Подтверждение взноса с разбивкой первого платежа и членских
CREATE OR REPLACE FUNCTION public.pai_approve_deposit(
  p_request_id UUID,
  p_entrance_uah NUMERIC DEFAULT 50,
  p_monthly_uah NUMERIC DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount_uah NUMERIC(14, 2);
  v_status TEXT;
  v_prior_completed INT;
  v_entrance NUMERIC(14, 2);
  v_monthly NUMERIC(14, 2);
  v_convert_uah NUMERIC(14, 2);
  v_pai NUMERIC(14, 2);
  v_full_name TEXT;
  v_body TEXT;
BEGIN
  SELECT user_id, amount_uah, status
  INTO v_user_id, v_amount_uah, v_status
  FROM public.deposit_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  IF p_entrance_uah IS NULL OR p_entrance_uah < 0 THEN
    p_entrance_uah := 50;
  END IF;
  IF p_monthly_uah IS NULL OR p_monthly_uah < 0 THEN
    p_monthly_uah := 0;
  END IF;

  SELECT COUNT(*)::INT INTO v_prior_completed
  FROM public.deposit_requests
  WHERE user_id = v_user_id AND status = 'completed';

  v_entrance := 0;
  v_monthly := 0;

  IF v_prior_completed = 0 THEN
    v_entrance := LEAST(p_entrance_uah, v_amount_uah);
    IF v_amount_uah < p_entrance_uah + 5 THEN
      RAISE EXCEPTION 'first_deposit_too_small';
    END IF;
  ELSE
    v_monthly := LEAST(p_monthly_uah, v_amount_uah);
  END IF;

  v_convert_uah := v_amount_uah - v_entrance - v_monthly;

  IF v_convert_uah < 0 THEN
    RAISE EXCEPTION 'invalid_split';
  END IF;

  v_pai := ROUND(v_convert_uah / 5.0, 2);

  SELECT COALESCE(NULLIF(TRIM(full_name), ''), email, 'Пайщик') INTO v_full_name
  FROM public.app_users WHERE id = v_user_id;

  PERFORM 1 FROM public.app_users WHERE id = v_user_id FOR UPDATE;

  IF v_entrance > 0 THEN
    INSERT INTO public.coop_fund_ledger (user_id, kind, amount_uah, deposit_request_id, note)
    VALUES (v_user_id, 'entrance', v_entrance, p_request_id, 'Вступительный взнос (незворотний)');
    UPDATE public.coop_reserve_fund SET total_uah = total_uah + v_entrance WHERE id = 1;
  END IF;

  IF v_monthly > 0 THEN
    INSERT INTO public.coop_fund_ledger (user_id, kind, amount_uah, deposit_request_id, note)
    VALUES (v_user_id, 'membership', v_monthly, p_request_id, 'Членський внесок (незворотний)');
    UPDATE public.coop_reserve_fund SET total_uah = total_uah + v_monthly WHERE id = 1;
  END IF;

  UPDATE public.app_users
  SET balance_pai = balance_pai + v_pai, updated_at = NOW()
  WHERE id = v_user_id;

  INSERT INTO public.pai_transactions (user_id, type, amount, status, meta)
  VALUES (
    v_user_id,
    'deposit',
    v_pai,
    'completed',
    jsonb_build_object(
      'deposit_request_id', p_request_id::text,
      'entrance_uah', v_entrance,
      'membership_uah', v_monthly,
      'convert_uah', v_convert_uah
    )
  );

  v_body := format(
    'Член ПК %s вніс паєвий внесок на суму %s грн. З урахуванням вступного внеску %s грн та членського %s грн зараховано паєвих одиниць: %s. Операція внутрішня (споживча кооперація). Сторони претензій не мають.',
    v_full_name,
    to_char(v_amount_uah, 'FM999999990.00'),
    to_char(v_entrance, 'FM999999990.00'),
    to_char(v_monthly, 'FM999999990.00'),
    to_char(v_pai, 'FM999999990.00')
  );

  INSERT INTO public.coop_registry_entries (user_id, entry_kind, body, amount_uah, amount_pai, related_deposit_request_id, tax_classification)
  VALUES (v_user_id, 'deposit', v_body, v_amount_uah, v_pai, p_request_id, 'Внутреннее потребление пайщика');

  UPDATE public.deposit_requests
  SET
    status = 'completed',
    resolved_at = NOW(),
    applied_breakdown = jsonb_build_object(
      'entrance_uah', v_entrance,
      'membership_uah', v_monthly,
      'convert_uah', v_convert_uah,
      'pai_credited', v_pai
    )
  WHERE id = p_request_id;
END;
$$;

-- Покупка → обмін паєвого внеску на продукт (реєстр)
CREATE OR REPLACE FUNCTION public.pai_purchase_product(
  p_buyer_id UUID,
  p_product_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_price NUMERIC(14, 2);
  v_removed BOOLEAN;
  v_first UUID;
  v_second UUID;
  v_title TEXT;
  v_buyer_name TEXT;
  v_seller_name TEXT;
  v_body_buyer TEXT;
  v_body_seller TEXT;
BEGIN
  SELECT seller_id, price, COALESCE(is_removed_by_admin, FALSE), title
  INTO v_seller_id, v_price, v_removed, v_title
  FROM public.products
  WHERE id = p_product_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF v_removed THEN
    RAISE EXCEPTION 'product_unavailable';
  END IF;

  IF p_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'cannot_buy_own_product';
  END IF;

  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'invalid_price';
  END IF;

  IF p_buyer_id < v_seller_id THEN
    v_first := p_buyer_id;
    v_second := v_seller_id;
  ELSE
    v_first := v_seller_id;
    v_second := p_buyer_id;
  END IF;

  PERFORM 1 FROM public.app_users WHERE id = v_first FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  PERFORM 1 FROM public.app_users WHERE id = v_second FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF (SELECT balance_pai FROM public.app_users WHERE id = p_buyer_id) < v_price THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.app_users
  SET balance_pai = balance_pai - v_price, updated_at = NOW()
  WHERE id = p_buyer_id;

  UPDATE public.app_users
  SET balance_pai = balance_pai + v_price, updated_at = NOW()
  WHERE id = v_seller_id;

  INSERT INTO public.pai_transactions (user_id, type, amount, status, meta)
  VALUES
    (p_buyer_id, 'purchase', -v_price, 'completed',
      jsonb_build_object('product_id', p_product_id::text, 'role', 'buyer', 'coop_note', 'internal_exchange')),
    (v_seller_id, 'purchase', v_price, 'completed',
      jsonb_build_object('product_id', p_product_id::text, 'role', 'seller', 'buyer_id', p_buyer_id::text, 'coop_note', 'internal_exchange'));

  SELECT COALESCE(NULLIF(TRIM(full_name), ''), email, 'Пайщик') INTO v_buyer_name FROM public.app_users WHERE id = p_buyer_id;
  SELECT COALESCE(NULLIF(TRIM(full_name), ''), email, 'Пайщик') INTO v_seller_name FROM public.app_users WHERE id = v_seller_id;

  v_body_buyer := format(
    'Член ПК %s обміняв паєвий внесок у розмірі %s паєвих одиниць. Взамін отримав цільовий продукт «%s» еквівалентної вартості. Угода здійснена всередині ПК. Сторони претензій не мають.',
    v_buyer_name,
    to_char(v_price, 'FM999999990.00'),
    COALESCE(v_title, 'товар')
  );

  v_body_seller := format(
    'Член ПК %s отримав компенсацію паєвим внеском у розмірі %s паєвих одиниць за передачу продукту «%s» пайщику %s. Внутрішня операція ПК.',
    v_seller_name,
    to_char(v_price, 'FM999999990.00'),
    COALESCE(v_title, 'товар'),
    v_buyer_name
  );

  INSERT INTO public.coop_registry_entries (user_id, entry_kind, body, amount_pai, product_title, related_product_id, tax_classification)
  VALUES
    (p_buyer_id, 'internal_exchange', v_body_buyer, -v_price, v_title, p_product_id, 'Внутреннее потребление пайщика'),
    (v_seller_id, 'internal_exchange', v_body_seller, v_price, v_title, p_product_id, 'Внутреннее потребление пайщика');
END;
$$;

-- Заявка на повернення паєвого внеску (без списання до підтвердження)
CREATE OR REPLACE FUNCTION public.coop_submit_withdrawal(
  p_user_id UUID,
  p_amount_pai NUMERIC,
  p_reason TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_bal NUMERIC(14, 2);
BEGIN
  IF p_amount_pai IS NULL OR p_amount_pai <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT balance_pai INTO v_bal FROM public.app_users WHERE id = p_user_id;
  IF v_bal IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  IF v_bal < p_amount_pai THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.withdrawal_requests (user_id, amount_pai, reason, status)
  VALUES (p_user_id, p_amount_pai, trim(p_reason), 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.coop_resolve_withdrawal(
  p_request_id UUID,
  p_approve BOOLEAN,
  p_admin_comment TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC(14, 2);
  v_status TEXT;
  v_reason TEXT;
  v_full_name TEXT;
  v_body TEXT;
BEGIN
  SELECT user_id, amount_pai, status, reason
  INTO v_user_id, v_amount, v_status, v_reason
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  IF p_approve THEN
    PERFORM 1 FROM public.app_users WHERE id = v_user_id FOR UPDATE;
    IF (SELECT balance_pai FROM public.app_users WHERE id = v_user_id) < v_amount THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;

    UPDATE public.app_users
    SET balance_pai = balance_pai - v_amount, updated_at = NOW()
    WHERE id = v_user_id;

    INSERT INTO public.pai_transactions (user_id, type, amount, status, meta)
    VALUES (
      v_user_id,
      'withdrawal',
      -v_amount,
      'completed',
      jsonb_build_object('withdrawal_request_id', p_request_id::text)
    );

    SELECT COALESCE(NULLIF(TRIM(full_name), ''), email, 'Пайщик') INTO v_full_name
    FROM public.app_users WHERE id = v_user_id;

    v_body := format(
      'Повернення паєвого внеску пайщику %s у розмірі %s паєвих одиниць. Підстава: %s. Виплата підтверджена адміністрацією ПК.%s',
      v_full_name,
      to_char(v_amount, 'FM999999990.00'),
      v_reason,
      CASE WHEN p_admin_comment IS NOT NULL AND length(trim(p_admin_comment)) > 0
        THEN format(' Коментар: %s.', trim(p_admin_comment))
        ELSE ''
      END
    );

    INSERT INTO public.coop_registry_entries (user_id, entry_kind, body, amount_pai, tax_classification)
    VALUES (v_user_id, 'withdrawal', v_body, -v_amount, 'Внутреннее потребление пайщика');

    UPDATE public.withdrawal_requests
    SET status = 'completed', resolved_at = NOW(), admin_comment = NULLIF(trim(p_admin_comment), '')
    WHERE id = p_request_id;
  ELSE
    IF p_admin_comment IS NULL OR length(trim(p_admin_comment)) < 3 THEN
      RAISE EXCEPTION 'comment_required';
    END IF;
    UPDATE public.withdrawal_requests
    SET status = 'rejected', resolved_at = NOW(), admin_comment = trim(p_admin_comment)
    WHERE id = p_request_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pai_approve_deposit(UUID, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.pai_purchase_product(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.coop_submit_withdrawal(UUID, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.coop_resolve_withdrawal(UUID, BOOLEAN, TEXT) TO service_role;
