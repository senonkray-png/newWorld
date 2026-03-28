-- 009: Двойной счёт пайщика — «Паевой» (возвратный) и «Фонд развития» (невозвратный)
-- balance_pai = возвратный паевой взнос (уже существует)
-- coop_fund_ledger.kind = entrance | membership | development  — невозвратные

-- Расширяем CHECK на coop_fund_ledger, добавляя 'development'
ALTER TABLE public.coop_fund_ledger
  DROP CONSTRAINT IF EXISTS coop_fund_ledger_kind_check;

ALTER TABLE public.coop_fund_ledger
  ADD CONSTRAINT coop_fund_ledger_kind_check
  CHECK (kind IN ('entrance', 'membership', 'development'));

COMMENT ON COLUMN public.app_users.balance_pai
  IS 'Паевой счёт (возвратный): паевые единицы, доступные для обмена или возврата.';

COMMENT ON TABLE public.coop_fund_ledger
  IS 'Невозвратные фонды: вступительный, членский и фонд развития. Эти суммы не конвертируются в паевые единицы и не подлежат возврату.';

COMMENT ON TABLE public.coop_registry_entries
  IS 'Реестр внутренних операций ПК. Каждая запись — «протокол» для отчётности с классификацией «внутреннее потребление пайщика».';
