import { Request, Response, NextFunction } from 'express';
import { TelegramService } from '../services/telegramService.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const telegramService = new TelegramService();

/**
 * Middleware to authenticate Telegram WebApp requests
 */
export function telegramAuth(req: Request, _res: Response, next: NextFunction) {
  const rawInitData = req.headers['x-telegram-init-data'] as string;
  const initData = rawInitData?.trim() || '';
  
  if (!initData) {
    // In development, allow requests without init data
    if (config.isDevelopment) {
      logger.warn('No Telegram init data provided (development mode)');
      req.telegramUser = {
        id: 123456789,
        first_name: 'Dev',
        last_name: 'User',
        username: 'devuser',
        language_code: 'en',
        is_premium: false,
      };
      return next();
    }
    // Опция для тестов из браузера (localhost) на прод-сервере
    if (config.allowLocalhostWithoutTelegram) {
      const origin = req.headers.origin || '';
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        req.telegramUser = {
          id: 123456789,
          first_name: 'Dev',
          last_name: 'User',
          username: 'devuser',
          language_code: 'ru',
          is_premium: false,
        };
        return next();
      }
    }
    throw new AppError('Требуются данные для инициализации Telegram', 401);
  }
  
  // Validate init data (trimmed — на случай пробелов/переносов от прокси)
  let parsedData = telegramService.validateInitData(initData);
  // Если не прошло — пробуем декодировать заголовок (иногда прокси кодирует)
  if (!parsedData && initData.includes('%')) {
    try {
      const decoded = decodeURIComponent(initData);
      parsedData = telegramService.validateInitData(decoded);
    } catch {
      // ignore
    }
  }
  
  if (!parsedData) {
    const reason = telegramService.getValidationFailureReason(initData);
    const tokenLen = (config.telegramBotToken || '').length;
    logger.warn(`Telegram init data validation failed: ${reason}, bot token length=${tokenLen}`);
    // In development, try to parse without validation
    if (config.isDevelopment) {
      const user = telegramService.parseInitDataUnsafe(initData);
      if (user) {
        logger.warn('Using unvalidated Telegram data (development mode)');
        req.telegramUser = user;
        return next();
      }
    }
    // Обходной вариант: не проверять подпись, только распарсить user (если включено в env)
    if (config.skipTelegramHashValidation) {
      const user = telegramService.parseInitDataUnsafe(initData);
      if (user) {
        const authDate = telegramService.getAuthDateFromInitData(initData);
        const now = Math.floor(Date.now() / 1000);
        if (authDate !== null && now - authDate <= 24 * 60 * 60) {
          logger.warn('TELEGRAM_SKIP_HASH_VALIDATION: accepting init data without signature check');
          req.telegramUser = user;
          return next();
        }
      }
    }
    
    throw new AppError('Invalid Telegram init data', 401);
  }
  
  if (!parsedData.user) {
    throw new AppError('User data not found in init data', 401);
  }
  
  // Attach user to request
  req.telegramUser = parsedData.user;
  
  next();
}
