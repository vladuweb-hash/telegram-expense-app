import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../services/expenseService.js';
import { UserService } from '../services/userService.js';
import { CategoryService } from '../services/categoryService.js';
import { AppError } from '../utils/AppError.js';
import { createExpenseSchema, historyParamsSchema } from '../validators/expenseValidators.js';
import { TelegramUser, User } from '../types/index.js';

const expenseService = new ExpenseService();
const userService = new UserService();
const categoryService = new CategoryService();

export class ExpenseController {
  /**
   * POST /expenses - Создать расход
   */
  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const limitInfo = req.limitInfo;

      // Валидация входных данных
      const validation = createExpenseSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError('Validation error', 400, validation.error.errors);
      }

      const { category, amount } = validation.data;

      // Проверяем существование категории (стандартной или кастомной)
      const categoryExists = await categoryService.categoryExists(user.id, category);
      if (!categoryExists) {
        throw new AppError('Категория не найдена', 400);
      }

      // Создаём расход
      const expense = await expenseService.createExpense(user.id, { category, amount });

      res.status(201).json({
        success: true,
        data: expense,
        limits: limitInfo ? {
          monthlyUsed: limitInfo.monthlyUsed + 1,
          monthlyLimit: limitInfo.monthlyLimit,
          remaining: limitInfo.remaining - 1,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /expenses/today - Получить расходы за сегодня
   */
  async getTodayExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const result = await expenseService.getTodayExpenses(user.id);
      const limitsInfo = await expenseService.getUserLimitsInfo(user.id, user.isPremium);

      res.json({
        success: true,
        data: result,
        limits: limitsInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /expenses/history - Получить историю расходов
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const validation = historyParamsSchema.safeParse(req.query);
      if (!validation.success) {
        throw new AppError('Validation error', 400, validation.error.errors);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const result = await expenseService.getHistory(user.id, validation.data);

      res.json({
        success: true,
        data: result.expenses,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /expenses/export - Экспорт в CSV (только Premium)
   */
  async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const csvContent = await expenseService.exportToCSV(user.id, startDate, endDate);

      // Устанавливаем заголовки для скачивания файла
      const filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Добавляем BOM для корректного отображения кириллицы в Excel
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /expenses/limits - Получить информацию о лимитах
   */
  async getLimits(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const limitsInfo = await expenseService.getUserLimitsInfo(user.id, user.isPremium);

      res.json({
        success: true,
        data: limitsInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /expenses/:id - Удалить расход
   */
  async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;
      const expenseId = parseInt(req.params.id, 10);

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      if (isNaN(expenseId)) {
        throw new AppError('Invalid expense ID', 400);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      await expenseService.deleteExpense(expenseId, user.id);

      res.json({
        success: true,
        message: 'Expense deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /expenses/stats - Получить статистику по категориям
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const stats = await expenseService.getCategoryStats(user.id, startDate, endDate);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
