import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { AppError } from '../utils/AppError.js';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  /**
   * GET /analytics/summary - Сводка метрик
   */
  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await analyticsService.getMetricsSummary();

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /analytics/activity - Метрики активности (DAU/WAU/MAU)
   */
  async getActivityMetrics(_req: Request, res: Response, next: NextFunction) {
    try {
      const activity = await analyticsService.getUserActivityMetrics();

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /analytics/history - Исторические метрики
   */
  async getHistoricalMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      
      if (days < 1 || days > 365) {
        throw new AppError('Days must be between 1 and 365', 400);
      }

      const metrics = await analyticsService.getHistoricalMetrics(days);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /analytics/categories - Топ категорий
   */
  async getTopCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string, 10) || 7;
      
      if (days < 1 || days > 90) {
        throw new AppError('Days must be between 1 and 90', 400);
      }

      const categories = await analyticsService.getTopCategories(days);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /analytics/collect - Ручной сбор метрик
   */
  async collectMetrics(_req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await analyticsService.collectDailyMetrics();

      res.json({
        success: true,
        data: metrics,
        message: 'Metrics collected successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
