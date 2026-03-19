-- Добавляет отдельное поле ФИО для профиля участника

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

COMMENT ON COLUMN user_profiles.full_name IS 'ФИО пользователя';
