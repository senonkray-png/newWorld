-- Додатки до deposit_requests для автоматичної перевірки оплати через Monobank

-- Код платежу, який пайщик вказує у коментарі до переказу
ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS payment_code TEXT;

-- ID транзакції з Monobank (захист від повторного зарахування)
ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS mono_tx_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_requests_mono_tx_id
  ON public.deposit_requests(mono_tx_id) WHERE mono_tx_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_requests_payment_code
  ON public.deposit_requests(payment_code) WHERE payment_code IS NOT NULL;

-- Заповнити payment_code для існуючих pending-заявок
UPDATE public.deposit_requests
SET payment_code = 'PAI-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')
WHERE payment_code IS NULL AND status = 'pending';
