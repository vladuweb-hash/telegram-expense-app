import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/categoryService.js';
import { UserService } from '../services/userService.js';
import { AppError } from '../utils/AppError.js';
import { TelegramUser, User } from '../types/index.js';
import { z } from 'zod';

const categoryService = new CategoryService();
const userService = new UserService();

// Валидация создания категории
const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// Валидация обновления категории
const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export class CategoryController {
  /**
   * GET /categories - Получить все категории
   */
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const result = await categoryService.getAllCategories(user.id, user.isPremium);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /categories - Создать кастомную категорию (Premium)
   */
  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;

      const validation = createCategorySchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError('Validation error', 400, validation.error.errors);
      }

      const category = await categoryService.createCustomCategory(user.id, validation.data);

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /categories/:id - Обновить кастомную категорию (Premium)
   */
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const categoryId = parseInt(req.params.id, 10);

      if (isNaN(categoryId)) {
        throw new AppError('Invalid category ID', 400);
      }

      const validation = updateCategorySchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError('Validation error', 400, validation.error.errors);
      }

      const category = await categoryService.updateCustomCategory(
        user.id,
        categoryId,
        validation.data
      );

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /categories/:id - Удалить кастомную категорию (Premium)
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const categoryId = parseInt(req.params.id, 10);

      if (isNaN(categoryId)) {
        throw new AppError('Invalid category ID', 400);
      }

      await categoryService.deleteCustomCategory(user.id, categoryId);

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
