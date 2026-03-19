-- Шаг 1: База данных для аутентификации, профилей, товаров, объявлений и сообщений
-- Примечание: пароль хранится в auth.users (Supabase Auth), поле password_hash в public не заполняется.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role_ru'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.user_role_ru AS ENUM ('Пользователь', 'Продавец', 'Поставщик услуг');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ad_type_ru'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.ad_type_ru AS ENUM ('поиск услуги', 'предложение услуги');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Блок 1: базовая информация
  full_name TEXT,
  phone TEXT,
  gender TEXT,
  avatar_url TEXT,
  telegram TEXT,
  instagram TEXT,
  country TEXT,
  region TEXT,
  city TEXT,

  -- Блок 2: роль
  role public.user_role_ru NOT NULL DEFAULT 'Пользователь',

  -- Блок 3: детали
  business_niche TEXT,
  company_name TEXT,
  work_phone TEXT,
  website_url TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  about_me TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_interests ON public.app_users USING GIN(interests);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  type public.ad_type_ru NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_author_id ON public.ads(author_id);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON public.ads(created_at DESC);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_messages_not_self CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created
  ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created
  ON public.messages(receiver_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_app_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_users (
    id,
    email,
    is_email_verified,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NEW.email_confirmed_at IS NOT NULL,
    NOW()
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    is_email_verified = EXCLUDED.is_email_verified,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auth_user_to_app_users ON auth.users;
CREATE TRIGGER trg_sync_auth_user_to_app_users
AFTER INSERT OR UPDATE OF email, email_confirmed_at
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_app_users();

INSERT INTO public.app_users (id, email, is_email_verified)
SELECT
  u.id,
  COALESCE(u.email, ''),
  u.email_confirmed_at IS NOT NULL
FROM auth.users u
ON CONFLICT (id)
DO UPDATE SET
  email = EXCLUDED.email,
  is_email_verified = EXCLUDED.is_email_verified,
  updated_at = NOW();

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_users_select_authenticated ON public.app_users;
CREATE POLICY app_users_select_authenticated
ON public.app_users
FOR SELECT
TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS app_users_update_self ON public.app_users;
CREATE POLICY app_users_update_self
ON public.app_users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS products_select_all ON public.products;
CREATE POLICY products_select_all
ON public.products
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS products_insert_seller_only ON public.products;
CREATE POLICY products_insert_seller_only
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND EXISTS (
    SELECT 1
    FROM public.app_users au
    WHERE au.id = auth.uid()
      AND au.role = 'Продавец'
  )
);

DROP POLICY IF EXISTS products_update_own ON public.products;
CREATE POLICY products_update_own
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS products_delete_own ON public.products;
CREATE POLICY products_delete_own
ON public.products
FOR DELETE
TO authenticated
USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS ads_select_all ON public.ads;
CREATE POLICY ads_select_all
ON public.ads
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS ads_insert_own ON public.ads;
CREATE POLICY ads_insert_own
ON public.ads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS ads_update_own ON public.ads;
CREATE POLICY ads_update_own
ON public.ads
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS ads_delete_own ON public.ads;
CREATE POLICY ads_delete_own
ON public.ads
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

DROP POLICY IF EXISTS messages_select_participant ON public.messages;
CREATE POLICY messages_select_participant
ON public.messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS messages_insert_sender ON public.messages;
CREATE POLICY messages_insert_sender
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS messages_update_sender ON public.messages;
CREATE POLICY messages_update_sender
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

COMMENT ON TABLE public.app_users IS 'Профили пользователей приложения, связанные с auth.users';
COMMENT ON COLUMN public.app_users.password_hash IS 'Не используется: пароль хранится в Supabase Auth';
COMMENT ON TABLE public.products IS 'Товары (доступ на создание только для роли Продавец)';
COMMENT ON TABLE public.ads IS 'Объявления услуг для всех ролей';
COMMENT ON TABLE public.messages IS 'Личные сообщения между пользователями';
