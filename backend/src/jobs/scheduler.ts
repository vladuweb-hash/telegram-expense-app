import cron from 'node-cron';
import { ReminderService } from '../services/reminderService.js';
import { PaymentService } from '../services/paymentService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { REMINDER_CONFIG } from '../config/reminders.js';
import { logger } from '../utils/logger.js';

const reminderService = new ReminderService();
const paymentService = new PaymentService();
const analyticsService = new AnalyticsService();

/**
 * Инициализация всех cron задач
 */
export function initScheduler(): void {
  logger.info('Initializing scheduler...');

  // ==================== НАПОМИНАНИЯ ====================
  // Каждый день в 20:00 по указанной таймзоне
  cron.schedule(
    REMINDER_CONFIG.CRON_SCHEDULE,
    async () => {
      logger.info('Running daily reminders job...');
      
      try {
        const stats = await reminderService.sendDailyReminders();
        logger.info('Daily reminders job completed', stats);
      } catch (error) {
        logger.error('Daily reminders job failed', { error });
      }
    },
    {
      timezone: REMINDER_CONFIG.TIMEZONE,
      scheduled: true,
    }
  );

  logger.info(`Reminders scheduled for ${REMINDER_CONFIG.REMINDER_HOUR}:00 ${REMINDER_CONFIG.TIMEZONE}`);

  // ==================== ПРОВЕРКА ИСТЕКШИХ ПОДПИСОК ====================
  // Каждый час проверяем истекшие Premium подписки
  cron.schedule(
    '0 * * * *', // Каждый час в 0 минут
    async () => {
      logger.info('Running expired subscriptions check...');
      
      try {
        const expiredCount = await paymentService.checkExpiredSubscriptions();
        logger.info(`Expired subscriptions check completed: ${expiredCount} deactivated`);
      } catch (error) {
        logger.error('Expired subscriptions check failed', { error });
      }
    },
    {
      timezone: REMINDER_CONFIG.TIMEZONE,
      scheduled: true,
    }
  );

  // ==================== СБОР МЕТРИК ====================
  // Каждый день в 23:55 собираем метрики за день
  cron.schedule(
    '55 23 * * *', // В 23:55 каждый день
    async () => {
      logger.info('Running daily metrics collection...');
      
      try {
        const metrics = await analyticsService.collectDailyMetrics();
        logger.info('Daily metrics collected', { 
          activeUsers: metrics.activeUsers,
          totalExpenses: metrics.totalExpenses,
          premiumConversion: metrics.premiumConversionRate.toFixed(2) + '%',
        });
      } catch (error) {
        logger.error('Daily metrics collection failed', { error });
      }
    },
    {
      timezone: REMINDER_CONFIG.TIMEZONE,
      scheduled: true,
    }
  );

  // Также собираем метрики каждые 4 часа для более актуальных данных
  cron.schedule(
    '0 */4 * * *', // Каждые 4 часа
    async () => {
      logger.info('Running periodic metrics update...');
      
      try {
        const metrics = await analyticsService.collectDailyMetrics();
        logger.info('Periodic metrics updated', {
          activeUsers: metrics.activeUsers,
        });
      } catch (error) {
        logger.error('Periodic metrics update failed', { error });
      }
    },
    {
      timezone: REMINDER_CONFIG.TIMEZONE,
      scheduled: true,
    }
  );

  logger.info('Scheduler initialized successfully');
}

/**
 * Ручной запуск напоминаний (для тестирования)
 */
export async function triggerReminders(): Promise<void> {
  logger.info('Manually triggering reminders...');
  const stats = await reminderService.sendDailyReminders();
  logger.info('Manual reminders completed', stats);
}

/**
 * Ручной сбор метрик (для тестирования)
 */
export async function triggerMetricsCollection(): Promise<void> {
  logger.info('Manually triggering metrics collection...');
  const metrics = await analyticsService.collectDailyMetrics();
  logger.info('Manual metrics collection completed', metrics);
}
