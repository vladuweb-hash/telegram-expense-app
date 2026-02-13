import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/telegram_mini_app',
  
  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  
  // App URL (для инвойсов)
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  
  // Security (несколько origin через запятую; всегда разрешаем localhost для разработки)
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  corsAllowedOrigins: (() => {
    const fromEnv = (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const localhost = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
    const combined = [...new Set([...fromEnv, ...localhost])];
    return combined;
  })(),
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Helpers
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  // Разрешить запросы с localhost без Telegram init data (для тестов из браузера)
  allowLocalhostWithoutTelegram: process.env.ALLOW_LOCALHOST_WITHOUT_TELEGRAM === 'true',
  /** Временно не проверять подпись init data (только парсить user). Меньше безопасность, но обход бага с hash_mismatch. */
  skipTelegramHashValidation: process.env.TELEGRAM_SKIP_HASH_VALIDATION === 'true',
} as const;
