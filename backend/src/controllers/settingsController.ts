import { Request, Response, NextFunction } from 'express';
import { ReminderService } from '../services/reminderService.js';
import { UserService } from '../services/userService.js';
import { AppError } from '../utils/AppError.js';
import { TelegramUser } from '../types/index.js';
import { z } from 'zod';

const reminderService = new ReminderService();
const userService = new UserService();

// Валидация настроек уведомлений
const updateNotificationSettingsSchema = z.object({
  remindersEnabled: z.boolean(),
});

export class SettingsController {
  /**
   * GET /settings/notifications - Получить настройки уведомлений
   */
  async getNotificationSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const settings = await reminderService.getUserNotificationSettings(user.id);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /settings/notifications - Обновить настройки уведомлений (только Premium)
   */
  async updateNotificationSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      // Валидация входных данных
      const validation = updateNotificationSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError('Validation error', 400, validation.error.errors);
      }

      const user = await userService.getOrCreateUser(telegramUser);

      // Проверяем, что пользователь Premium
      if (!user.isPremium) {
        throw new AppError(
          'Отключение напоминаний доступно только для Premium пользователей',
          403,
          { code: 'PREMIUM_REQUIRED' }
        );
      }

      const settings = await reminderService.updateNotificationSettings(
        user.id,
        validation.data.remindersEnabled
      );

      res.json({
        success: true,
        data: {
          ...settings,
          canDisableReminders: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /settings - Получить все настройки пользователя
   */
  async getAllSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const notificationSettings = await reminderService.getUserNotificationSettings(user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            telegramId: user.telegramId,
            firstName: user.firstName,
            isPremium: user.isPremium,
            premiumUntil: user.premiumUntil,
          },
          notifications: notificationSettings,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
