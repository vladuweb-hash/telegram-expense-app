-- =============================================
-- Telegram Mini App - Database Schema
-- Premium Support
-- =============================================

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    username VARCHAR(255),
    language_code VARCHAR(10),
    is_premium BOOLEAN DEFAULT FALSE,
    premium_until TIMESTAMP WITH TIME ZONE,  -- Дата окончания Premium
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- ==================== EXPENSES ====================
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON expenses(user_id, created_at DESC);

-- Частичный индекс для быстрого подсчёта расходов за текущий месяц
CREATE INDEX IF NOT EXISTS idx_expenses_user_month ON expenses(user_id, created_at)
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- ==================== CUSTOM CATEGORIES (Premium) ====================
CREATE TABLE IF NOT EXISTS custom_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    icon VARCHAR(10) DEFAULT '📌',
    color VARCHAR(7) DEFAULT '#808080',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_custom_categories_user ON custom_categories(user_id);

-- ==================== TRIGGERS ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== ПОЛЕЗНЫЕ ЗАПРОСЫ ====================

-- Подсчёт расходов за текущий месяц
-- SELECT COUNT(*) FROM expenses 
-- WHERE user_id = 1 
--   AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- Проверка достижения лимита (50 расходов)
-- SELECT COUNT(*) >= 50 as limit_reached FROM expenses 
-- WHERE user_id = 1 
--   AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- Установить Premium пользователю на 30 дней
-- UPDATE users SET 
--   is_premium = TRUE, 
--   premium_until = CURRENT_TIMESTAMP + INTERVAL '30 days'
-- WHERE telegram_id = 123456789;

-- Сбросить истекший Premium
-- UPDATE users SET is_premium = FALSE 
-- WHERE is_premium = TRUE 
--   AND premium_until IS NOT NULL 
--   AND premium_until < CURRENT_TIMESTAMP;
