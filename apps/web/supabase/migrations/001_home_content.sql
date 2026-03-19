-- Міграція для таблиці контенту головної сторінки
-- Запустити один раз у Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS home_content (
  locale      TEXT        PRIMARY KEY,
  content     JSONB       NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Коментарі до колонок
COMMENT ON TABLE  home_content            IS 'Контент головної сторінки по локалях (ru, uk, en)';
COMMENT ON COLUMN home_content.locale     IS 'Код локалі: ru | uk | en';
COMMENT ON COLUMN home_content.content    IS 'JSON-об''єкт HomeContent (hero, features, seo тощо)';
COMMENT ON COLUMN home_content.updated_at IS 'Дата останнього оновлення';
