-- Внутренняя валюта «Пай»: баланс, транзакции, заявки на пополнение, атомарные RPC

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS balance_pai NUMERIC(14, 2) NOT NULL DEFAULT 0
  CHECK (balance_pai >= 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'pai_tx_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.pai_tx_type AS ENUM ('deposit', 'transfer', 'purchase');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'pai_tx_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.pai_tx_status AS ENUM ('pending', 'completed', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pai_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  type public.pai_tx_type NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  status public.pai_tx_status NOT NULL DEFAULT 'completed',
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pai_transactions_user_created
  ON public.pai_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  amount_uah NUMERIC(14, 2) NOT NULL CHECK (amount_uah > 0),
  amount_pai NUMERIC(14, 2) NOT NULL CHECK (amount_pai > 0),
  receipt_image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_status_created
  ON public.deposit_requests(status, created_at DESC);

ALTER TABLE public.pai_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

-- P2P: атомарное списание и зачисление
CREATE OR REPLACE FUNCTION public.pai_transfer_p2p(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_amount NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first UUID;
  v_second UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF p_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'cannot_transfer_to_self';
  END IF;

  IF p_sender_id < p_recipient_id THEN
    v_first := p_sender_id;
    v_second := p_recipient_id;
  ELSE
    v_first := p_recipient_id;
    v_second := p_sender_id;
  END IF;

  PERFORM 1 FROM public.app_users WHERE id = v_first FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  PERFORM 1 FROM public.app_users WHERE id = v_second FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF (SELECT balance_pai FROM public.app_users WHERE id = p_sender_id) < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.app_users
  SET balance_pai = balance_pai - p_amount, updated_at = NOW()
  WHERE id = p_sender_id;

  UPDATE public.app_users
  SET balance_pai = balance_pai + p_amount, updated_at = NOW()
  WHERE id = p_recipient_id;

  INSERT INTO public.pai_transactions (user_id, type, amount, status, meta)
  VALUES
    (p_sender_id, 'transfer', -p_amount, 'completed',
      jsonb_build_object('peer_id', p_recipient_id::text)),
    (p_recipient_id, 'transfer', p_amount, 'completed',
      jsonb_build_object('peer_id', p_sender_id::text));
END;
$$;

-- Покупка товара: списание у покупателя, зачисление продавцу (цена в Паях)
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
BEGIN
  SELECT seller_id, price, COALESCE(is_removed_by_admin, FALSE)
  INTO v_seller_id, v_price, v_removed
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
      jsonb_build_object('product_id', p_product_id::text, 'role', 'buyer')),
    (v_seller_id, 'purchase', v_price, 'completed',
      jsonb_build_object('product_id', p_product_id::text, 'role', 'seller', 'buyer_id', p_buyer_id::text));
END;
$$;

-- Подтверждение ручного пополнения
CREATE OR REPLACE FUNCTION public.pai_approve_deposit(
  p_request_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount_pai NUMERIC(14, 2);
  v_status TEXT;
BEGIN
  SELECT user_id, amount_pai, status
  INTO v_user_id, v_amount_pai, v_status
  FROM public.deposit_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  UPDATE public.app_users
  SET balance_pai = balance_pai + v_amount_pai, updated_at = NOW()
  WHERE id = v_user_id;

  INSERT INTO public.pai_transactions (user_id, type, amount, status, meta)
  VALUES (
    v_user_id,
    'deposit',
    v_amount_pai,
    'completed',
    jsonb_build_object('deposit_request_id', p_request_id::text)
  );

  UPDATE public.deposit_requests
  SET status = 'completed', resolved_at = NOW()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pai_transfer_p2p(UUID, UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.pai_purchase_product(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.pai_approve_deposit(UUID) TO service_role;

COMMENT ON TABLE public.pai_transactions IS 'Лог движений Паев (amount: + зачисление, − списание)';
COMMENT ON TABLE public.deposit_requests IS 'Заявки на пополнение по реквизитам с чеком';
COMMENT ON COLUMN public.app_users.balance_pai IS 'Баланс в Паях';
