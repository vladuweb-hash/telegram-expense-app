import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js';
import { AppError } from '../utils/AppError.js';
import { updateUserSchema } from '../validators/userValidators.js';
import { TelegramUser } from '../types/index.js';

const userService = new UserService();

export class UserController {
  /**
   * Get current authenticated user
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;
      
      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }
      
      // Get or create user
      const user = await userService.getOrCreateUser(telegramUser);
      
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update current user
   */
  async updateCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;
      
      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }
      
      // Validate input
      const validation = updateUserSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError('Validation error', 400, validation.error.errors);
      }
      
      // Update user
      const user = await userService.updateUser(telegramUser.id, validation.data as { firstName?: string; lastName?: string | null });
      
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
