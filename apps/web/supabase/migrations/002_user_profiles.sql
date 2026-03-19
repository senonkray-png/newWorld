-- Профили пользователей для регистрации, поиска и ролевого доступа

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL,
  account_intent TEXT NOT NULL CHECK (account_intent IN ('seller', 'service_provider', 'both')),
  business_info TEXT NOT NULL,
  website_url TEXT,
  phone_personal TEXT,
  phone_work TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'seller', 'service_provider', 'organizer', 'main_admin')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON user_profiles USING GIN(interests);

COMMENT ON TABLE user_profiles IS 'Регистрационные профили пользователей платформы';
COMMENT ON COLUMN user_profiles.account_intent IS 'Кем хочет быть: seller | service_provider | both';
COMMENT ON COLUMN user_profiles.role IS 'Системная роль; main_admin назначается вручную';
