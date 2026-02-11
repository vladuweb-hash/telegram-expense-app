import { db } from './index.js';
import { logger } from '../utils/logger.js';

const migrations = [
  // ==================== USERS ====================
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    username VARCHAR(255),
    language_code VARCHAR(10),
    is_premium BOOLEAN DEFAULT FALSE,
    premium_until TIMESTAMP WITH TIME ZONE,
    reminders_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium)`,

  // ==================== EXPENSES ====================
  `CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON expenses(user_id, created_at DESC)`,

  // ==================== CUSTOM CATEGORIES (Premium) ====================
  `CREATE TABLE IF NOT EXISTS custom_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    icon VARCHAR(10) DEFAULT '📌',
    color VARCHAR(7) DEFAULT '#808080',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, slug)
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_custom_categories_user ON custom_categories(user_id)`,

  // ==================== PAYMENTS ====================
  `CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_payment_id VARCHAR(255) UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'XTR',
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_payment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)`,

  // ==================== REMINDER LOGS ====================
  `CREATE TABLE IF NOT EXISTS reminder_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON reminder_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at)`,

  // ==================== DAILY METRICS ====================
  `CREATE TABLE IF NOT EXISTS daily_metrics (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    total_users INTEGER NOT NULL DEFAULT 0,
    active_users INTEGER NOT NULL DEFAULT 0,
    new_users INTEGER NOT NULL DEFAULT 0,
    total_expenses INTEGER NOT NULL DEFAULT 0,
    total_expense_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    avg_expenses_per_user DECIMAL(10, 2) NOT NULL DEFAULT 0,
    avg_expense_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    premium_users INTEGER NOT NULL DEFAULT 0,
    premium_conversion_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    retention_rate DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC)`,

  // ==================== TRIGGERS ====================
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = CURRENT_TIMESTAMP;
     RETURN NEW;
   END;
   $$ language 'plpgsql'`,
  
  `DROP TRIGGER IF EXISTS update_users_updated_at ON users`,
  `CREATE TRIGGER update_users_updated_at
   BEFORE UPDATE ON users
   FOR EACH ROW
   EXECUTE PROCEDURE update_updated_at_column()`,

  `DROP TRIGGER IF EXISTS update_daily_metrics_updated_at ON daily_metrics`,
  `CREATE TRIGGER update_daily_metrics_updated_at
   BEFORE UPDATE ON daily_metrics
   FOR EACH ROW
   EXECUTE PROCEDURE update_updated_at_column()`,

  // ==================== ADD COLUMNS IF NOT EXISTS ====================
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN DEFAULT TRUE`,
];

async function migrate() {
  logger.info('Starting database migrations...');
  
  try {
    for (const migration of migrations) {
      await db.query(migration);
      logger.debug(`Executed migration: ${migration.slice(0, 50)}...`);
    }
    
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await db.end();
  }
}

migrate().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
