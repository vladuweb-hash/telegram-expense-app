import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { UserService } from '../services/userService.js';
import { ExpenseService } from '../services/expenseService.js';
import { LIMITS, LIMIT_MESSAGES } from '../config/limits.js';
import { TelegramUser, User } from '../types/index.js';

const userService = new UserService();
const expenseService = new ExpenseService();

/**
 * Middleware: проверка лимита расходов в месяц
 */
export async function checkExpenseLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramUser = req.telegramUser as TelegramUser;
    
    if (!telegramUser) {
      throw new AppError('Unauthorized', 401);
    }

    // Получаем пользователя из БД
    const user = await userService.getOrCreateUser(telegramUser);
    
    // Premium пользователи без лимитов
    if (user.isPremium) {
      req.user = user;
      return next();
    }

    // Проверяем количество расходов за текущий месяц
    const monthlyCount = await expenseService.getMonthlyExpenseCount(user.id);
    
    if (monthlyCount >= LIMITS.FREE.MONTHLY_EXPENSES) {
      throw new AppError(LIMIT_MESSAGES.MONTHLY_EXPENSES_EXCEEDED, 403, {
        code: 'LIMIT_EXCEEDED',
        limit: LIMITS.FREE.MONTHLY_EXPENSES,
        current: monthlyCount,
        isPremium: false,
      });
    }

    // Добавляем информацию о лимитах в ответ
    req.user = user;
    req.limitInfo = {
      monthlyUsed: monthlyCount,
      monthlyLimit: LIMITS.FREE.MONTHLY_EXPENSES,
      remaining: LIMITS.FREE.MONTHLY_EXPENSES - monthlyCount,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: только для Premium пользователей
 */
export async function premiumOnly(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramUser = req.telegramUser as TelegramUser;
    
    if (!telegramUser) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await userService.getOrCreateUser(telegramUser);
    
    if (!user.isPremium) {
      throw new AppError('Эта функция доступна только для Premium пользователей', 403, {
        code: 'PREMIUM_REQUIRED',
        isPremium: false,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: проверка доступа к экспорту
 */
export async function checkExportAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramUser = req.telegramUser as TelegramUser;
    
    if (!telegramUser) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await userService.getOrCreateUser(telegramUser);
    
    if (!user.isPremium && !LIMITS.FREE.EXPORT_CSV) {
      throw new AppError(LIMIT_MESSAGES.EXPORT_NOT_ALLOWED, 403, {
        code: 'PREMIUM_REQUIRED',
        feature: 'export',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: проверка доступа к кастомным категориям
 */
export async function checkCustomCategoryAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramUser = req.telegramUser as TelegramUser;
    
    if (!telegramUser) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await userService.getOrCreateUser(telegramUser);
    
    if (!user.isPremium && !LIMITS.FREE.CUSTOM_CATEGORIES) {
      throw new AppError(LIMIT_MESSAGES.CUSTOM_CATEGORIES_NOT_ALLOWED, 403, {
        code: 'PREMIUM_REQUIRED',
        feature: 'custom_categories',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// Расширяем Request для TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: User;
      limitInfo?: {
        monthlyUsed: number;
        monthlyLimit: number;
        remaining: number;
      };
    }
  }
}
