-- 010: Публичный короткий ID пайщика (member_id)
-- Каждый пользователь получает уникальный числовой идентификатор, видимый всем участникам.
-- По этому ID можно переводить паевые единицы и искать человека.

-- Последовательность для генерации коротких номеров пайщиков (начинаем с 1001)
CREATE SEQUENCE IF NOT EXISTS public.member_id_seq START WITH 1001;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS member_id INTEGER UNIQUE;

-- Заполнить member_id для всех существующих пользователей
UPDATE public.app_users
SET member_id = nextval('public.member_id_seq')
WHERE member_id IS NULL;

-- Сделать NOT NULL после заполнения
ALTER TABLE public.app_users
  ALTER COLUMN member_id SET DEFAULT nextval('public.member_id_seq');

ALTER TABLE public.app_users
  ALTER COLUMN member_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_member_id ON public.app_users(member_id);

COMMENT ON COLUMN public.app_users.member_id
  IS 'Публичный короткий ID пайщика (например, 1001). Виден всем участникам; используется для переводов и поиска.';
