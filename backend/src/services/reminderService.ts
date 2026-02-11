import { query } from '../db/index.js';
import { TelegramService } from './telegramService.js';
import { logger } from '../utils/logger.js';

interface UserForReminder {
  id: number;
  telegramId: number;
  firstName: string | null;
  isPremium: boolean;
  remindersEnabled: boolean;
}

interface ReminderStats {
  totalUsers: number;
  usersWithoutExpenses: number;
  remindersSent: number;
  errors: number;
}

const telegramService = new TelegramService();

export class ReminderService {
  /**
   * Отправить напоминания пользователям без расходов за сегодня
   */
  async sendDailyReminders(): Promise<ReminderStats> {
    const stats: ReminderStats = {
      totalUsers: 0,
      usersWithoutExpenses: 0,
      remindersSent: 0,
      errors: 0,
    };

    try {
      // Получаем пользователей, у которых:
      // 1. Включены напоминания (reminders_enabled = true)
      // 2. Нет расходов за сегодня
      const usersResult = await query<UserForReminder>(
        `SELECT 
           u.id,
           u.telegram_id as "telegramId",
           u.first_name as "firstName",
           u.is_premium as "isPremium",
           COALESCE(u.reminders_enabled, true) as "remindersEnabled"
         FROM users u
         WHERE COALESCE(u.reminders_enabled, true) = true
           AND NOT EXISTS (
             SELECT 1 FROM expenses e 
             WHERE e.user_id = u.id 
               AND e.created_at >= CURRENT_DATE
               AND e.created_at < CURRENT_DATE + INTERVAL '1 day'
           )`
      );

      stats.totalUsers = usersResult.rowCount || 0;
      stats.usersWithoutExpenses = usersResult.rows.length;

      logger.info(`Found ${stats.usersWithoutExpenses} users without expenses today`);

      // Отправляем напоминания
      for (const user of usersResult.rows) {
        try {
          await this.sendReminder(user);
          stats.remindersSent++;
          
          // Небольшая задержка между сообщениями (избегаем rate limit)
          await this.sleep(50);
        } catch (error) {
          stats.errors++;
          logger.error(`Failed to send reminder to user ${user.id}`, { error });
        }
      }

      logger.info('Daily reminders completed', stats);
      
      return stats;
    } catch (error) {
      logger.error('Failed to send daily reminders', { error });
      throw error;
    }
  }

  /**
   * Отправить напоминание конкретному пользователю
   */
  private async sendReminder(user: UserForReminder): Promise<void> {
    const message = this.buildReminderMessage(user);
    
    await telegramService.sendMessage(user.telegramId, message);
    
    // Логируем отправку
    await this.logReminderSent(user.id);
    
    logger.debug(`Reminder sent to user ${user.id}`);
  }

  /**
   * Формирование текста напоминания
   */
  private buildReminderMessage(user: UserForReminder): string {
    const greeting = user.firstName ? `${user.firstName}, вы` : 'Вы';
    
    return `📝 <b>Напоминание</b>\n\n${greeting} ещё не записали расходы за сегодня.\n\nОткройте приложение и добавьте траты, чтобы не потерять контроль над финансами!`;
  }

  /**
   * Логирование отправленного напоминания
   */
  private async logReminderSent(userId: number): Promise<void> {
    await query(
      `INSERT INTO reminder_logs (user_id, sent_at) VALUES ($1, CURRENT_TIMESTAMP)`,
      [userId]
    );
  }

  /**
   * Получить настройки уведомлений пользователя
   */
  async getUserNotificationSettings(userId: number): Promise<{
    remindersEnabled: boolean;
    canDisableReminders: boolean;
  }> {
    const result = await query<{ reminders_enabled: boolean; is_premium: boolean }>(
      `SELECT COALESCE(reminders_enabled, true) as reminders_enabled, is_premium 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { remindersEnabled: true, canDisableReminders: false };
    }

    const { reminders_enabled, is_premium } = result.rows[0];
    
    return {
      remindersEnabled: reminders_enabled,
      // Premium пользователи могут отключить напоминания
      canDisableReminders: is_premium,
    };
  }

  /**
   * Обновить настройки уведомлений (только для Premium)
   */
  async updateNotificationSettings(
    userId: number,
    remindersEnabled: boolean
  ): Promise<{ remindersEnabled: boolean }> {
    // Проверяем, что пользователь Premium
    const userResult = await query<{ is_premium: boolean }>(
      'SELECT is_premium FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    if (!userResult.rows[0].is_premium) {
      throw new Error('Only Premium users can change notification settings');
    }

    // Обновляем настройки
    await query(
      'UPDATE users SET reminders_enabled = $2 WHERE id = $1',
      [userId, remindersEnabled]
    );

    logger.info(`User ${userId} updated reminders_enabled to ${remindersEnabled}`);

    return { remindersEnabled };
  }

  /**
   * Получить статистику напоминаний
   */
  async getReminderStats(days: number = 7): Promise<{
    totalSent: number;
    byDay: Array<{ date: string; count: number }>;
  }> {
    const result = await query<{ date: string; count: number }>(
      `SELECT 
         DATE(sent_at) as date,
         COUNT(*)::int as count
       FROM reminder_logs
       WHERE sent_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(sent_at)
       ORDER BY date DESC`
    );

    const totalResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int as total FROM reminder_logs 
       WHERE sent_at >= CURRENT_DATE - INTERVAL '${days} days'`
    );

    return {
      totalSent: totalResult.rows[0]?.total || 0,
      byDay: result.rows,
    };
  }

  /**
   * Вспомогательная функция для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
