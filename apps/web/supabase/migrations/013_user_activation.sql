-- 013: Activation system
-- is_active defaults to FALSE for new registrations.
-- Becomes TRUE automatically when balance_pai >= 200 (activation threshold).

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

-- Back-fill: anyone who already has balance >= 200 is active.
UPDATE public.app_users SET is_active = true WHERE balance_pai >= 200;

-- Trigger: auto-set is_active = true when balance_pai changes to >= 200.
CREATE OR REPLACE FUNCTION public.auto_activate_on_balance()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.balance_pai >= 200 AND (OLD.is_active IS DISTINCT FROM true) THEN
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_activate ON public.app_users;
CREATE TRIGGER trg_auto_activate
  BEFORE UPDATE OF balance_pai ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_on_balance();
