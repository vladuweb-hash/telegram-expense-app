import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * Middleware: проверка доступа к аналитике
 * В production требует API ключ или другую авторизацию
 */
function analyticsAuth(req: Request, _res: Response, next: NextFunction) {
  // В development доступ открыт
  if (config.isDevelopment) {
    return next();
  }

  // В production проверяем API ключ
  const apiKey = req.headers['x-analytics-key'] as string;
  const validKey = process.env.ANALYTICS_API_KEY;

  if (!validKey) {
    // Если ключ не настроен, запрещаем доступ в production
    throw new AppError('Analytics not configured', 503);
  }

  if (apiKey !== validKey) {
    throw new AppError('Invalid analytics API key', 401);
  }

  next();
}

// Все маршруты требуют авторизации
router.use(analyticsAuth);

// GET /api/analytics/summary - Сводка метрик
router.get('/summary', analyticsController.getSummary);

// GET /api/analytics/activity - DAU/WAU/MAU
router.get('/activity', analyticsController.getActivityMetrics);

// GET /api/analytics/history?days=30 - Исторические метрики
router.get('/history', analyticsController.getHistoricalMetrics);

// GET /api/analytics/categories?days=7 - Топ категорий
router.get('/categories', analyticsController.getTopCategories);

// POST /api/analytics/collect - Ручной сбор метрик
router.post('/collect', analyticsController.collectMetrics);

export default router;
