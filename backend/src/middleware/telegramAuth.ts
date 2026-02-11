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
  const initData = req.headers['x-telegram-init-data'] as string;
  
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
    
    throw new AppError('Telegram init data is required', 401);
  }
  
  // Validate init data
  const parsedData = telegramService.validateInitData(initData);
  
  if (!parsedData) {
    // In development, try to parse without validation
    if (config.isDevelopment) {
      const user = telegramService.parseInitDataUnsafe(initData);
      if (user) {
        logger.warn('Using unvalidated Telegram data (development mode)');
        req.telegramUser = user;
        return next();
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
