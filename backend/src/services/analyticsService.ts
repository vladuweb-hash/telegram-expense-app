import { query } from '../db/index.js';
import { logger } from '../utils/logger.js';

// ==================== ТИПЫ ====================

export interface DailyMetrics {
  date: string;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalExpenses: number;
  totalExpenseAmount: number;
  avgExpensesPerUser: number;
  avgExpenseAmount: number;
  premiumUsers: number;
  premiumConversionRate: number;
  retentionRate: number | null;
}

export interface UserActivityMetrics {
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  dauWauRatio: number;
  dauMauRatio: number;
}

export interface PremiumMetrics {
  totalPremium: number;
  totalFree: number;
  conversionRate: number;
  newPremiumToday: number;
  churnedToday: number;
  mrr: number; // Monthly Recurring Revenue (в Stars)
}

export interface ExpenseMetrics {
  totalToday: number;
  totalAmount: number;
  avgPerUser: number;
  avgAmount: number;
  topCategories: Array<{ category: string; count: number; amount: number }>;
}

// ==================== СЕРВИС ====================

export class AnalyticsService {
  /**
   * Собрать и сохранить ежедневные метрики
   */
  async collectDailyMetrics(): Promise<DailyMetrics> {
    const date = new Date().toISOString().split('T')[0];
    
    logger.info(`Collecting daily metrics for ${date}`);

    // Собираем все метрики параллельно
    const [
      userStats,
      expenseStats,
      premiumStats,
      retentionStats,
    ] = await Promise.all([
      this.getUserStats(),
      this.getExpenseStats(),
      this.getPremiumStats(),
      this.getRetentionRate(),
    ]);

    const metrics: DailyMetrics = {
      date,
      totalUsers: userStats.total,
      activeUsers: userStats.activeToday,
      newUsers: userStats.newToday,
      totalExpenses: expenseStats.totalToday,
      totalExpenseAmount: expenseStats.totalAmount,
      avgExpensesPerUser: userStats.activeToday > 0 
        ? expenseStats.totalToday / userStats.activeToday 
        : 0,
      avgExpenseAmount: expenseStats.totalToday > 0
        ? expenseStats.totalAmount / expenseStats.totalToday
        : 0,
      premiumUsers: premiumStats.totalPremium,
      premiumConversionRate: premiumStats.conversionRate,
      retentionRate: retentionStats,
    };

    // Сохраняем в БД
    await this.saveMetrics(metrics);

    logger.info('Daily metrics collected', metrics);

    return metrics;
  }

  /**
   * Получить статистику по пользователям
   */
  private async getUserStats(): Promise<{
    total: number;
    activeToday: number;
    newToday: number;
  }> {
    const result = await query<{
      total: string;
      active_today: string;
      new_today: string;
    }>(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN id IN (
          SELECT DISTINCT user_id FROM expenses 
          WHERE created_at >= CURRENT_DATE
        ) THEN 1 END)::int as active_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int as new_today
      FROM users
    `);

    const row = result.rows[0];
    return {
      total: parseInt(row?.total || '0', 10),
      activeToday: parseInt(row?.active_today || '0', 10),
      newToday: parseInt(row?.new_today || '0', 10),
    };
  }

  /**
   * Получить статистику по расходам за сегодня
   */
  private async getExpenseStats(): Promise<{
    totalToday: number;
    totalAmount: number;
  }> {
    const result = await query<{
      total_today: string;
      total_amount: string;
    }>(`
      SELECT 
        COUNT(*)::int as total_today,
        COALESCE(SUM(amount), 0)::float as total_amount
      FROM expenses
      WHERE created_at >= CURRENT_DATE
    `);

    const row = result.rows[0];
    return {
      totalToday: parseInt(row?.total_today || '0', 10),
      totalAmount: parseFloat(row?.total_amount || '0'),
    };
  }

  /**
   * Получить статистику Premium
   */
  private async getPremiumStats(): Promise<PremiumMetrics> {
    const result = await query<{
      total_premium: string;
      total_free: string;
      new_premium_today: string;
      churned_today: string;
    }>(`
      SELECT 
        COUNT(CASE WHEN is_premium = true THEN 1 END)::int as total_premium,
        COUNT(CASE WHEN is_premium = false THEN 1 END)::int as total_free,
        COUNT(CASE WHEN is_premium = true 
          AND id IN (
            SELECT user_id FROM payments 
            WHERE created_at >= CURRENT_DATE AND status = 'completed'
          ) THEN 1 END)::int as new_premium_today,
        COUNT(CASE WHEN is_premium = false 
          AND premium_until IS NOT NULL 
          AND premium_until >= CURRENT_DATE - INTERVAL '1 day'
          AND premium_until < CURRENT_DATE
          THEN 1 END)::int as churned_today
      FROM users
    `);

    const row = result.rows[0];
    const totalPremium = parseInt(row?.total_premium || '0', 10);
    const totalFree = parseInt(row?.total_free || '0', 10);
    const total = totalPremium + totalFree;

    return {
      totalPremium,
      totalFree,
      conversionRate: total > 0 ? (totalPremium / total) * 100 : 0,
      newPremiumToday: parseInt(row?.new_premium_today || '0', 10),
      churnedToday: parseInt(row?.churned_today || '0', 10),
      mrr: totalPremium * 100, // 100 Stars за подписку
    };
  }

  /**
   * Рассчитать retention rate (D1)
   */
  private async getRetentionRate(): Promise<number | null> {
    // Пользователи, зарегистрированные вчера
    const yesterdayUsersResult = await query<{ count: string }>(`
      SELECT COUNT(*)::int as count FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
        AND created_at < CURRENT_DATE
    `);
    
    const yesterdayUsers = parseInt(yesterdayUsersResult.rows[0]?.count || '0', 10);
    
    if (yesterdayUsers === 0) {
      return null;
    }

    // Из них активны сегодня
    const retainedResult = await query<{ count: string }>(`
      SELECT COUNT(DISTINCT u.id)::int as count 
      FROM users u
      JOIN expenses e ON e.user_id = u.id
      WHERE u.created_at >= CURRENT_DATE - INTERVAL '1 day'
        AND u.created_at < CURRENT_DATE
        AND e.created_at >= CURRENT_DATE
    `);

    const retained = parseInt(retainedResult.rows[0]?.count || '0', 10);

    return (retained / yesterdayUsers) * 100;
  }

  /**
   * Сохранить метрики в БД
   */
  private async saveMetrics(metrics: DailyMetrics): Promise<void> {
    await query(`
      INSERT INTO daily_metrics (
        date, total_users, active_users, new_users,
        total_expenses, total_expense_amount, avg_expenses_per_user,
        avg_expense_amount, premium_users, premium_conversion_rate, retention_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_users = EXCLUDED.active_users,
        new_users = EXCLUDED.new_users,
        total_expenses = EXCLUDED.total_expenses,
        total_expense_amount = EXCLUDED.total_expense_amount,
        avg_expenses_per_user = EXCLUDED.avg_expenses_per_user,
        avg_expense_amount = EXCLUDED.avg_expense_amount,
        premium_users = EXCLUDED.premium_users,
        premium_conversion_rate = EXCLUDED.premium_conversion_rate,
        retention_rate = EXCLUDED.retention_rate,
        updated_at = CURRENT_TIMESTAMP
    `, [
      metrics.date,
      metrics.totalUsers,
      metrics.activeUsers,
      metrics.newUsers,
      metrics.totalExpenses,
      metrics.totalExpenseAmount,
      metrics.avgExpensesPerUser,
      metrics.avgExpenseAmount,
      metrics.premiumUsers,
      metrics.premiumConversionRate,
      metrics.retentionRate,
    ]);
  }

  /**
   * Получить метрики активности пользователей
   */
  async getUserActivityMetrics(): Promise<UserActivityMetrics> {
    const result = await query<{
      dau: string;
      wau: string;
      mau: string;
    }>(`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN created_at >= CURRENT_DATE THEN user_id 
        END)::int as dau,
        COUNT(DISTINCT CASE 
          WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN user_id 
        END)::int as wau,
        COUNT(DISTINCT CASE 
          WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN user_id 
        END)::int as mau
      FROM expenses
    `);

    const row = result.rows[0];
    const dau = parseInt(row?.dau || '0', 10);
    const wau = parseInt(row?.wau || '0', 10);
    const mau = parseInt(row?.mau || '0', 10);

    return {
      dau,
      wau,
      mau,
      dauWauRatio: wau > 0 ? (dau / wau) * 100 : 0,
      dauMauRatio: mau > 0 ? (dau / mau) * 100 : 0,
    };
  }

  /**
   * Получить топ категорий расходов
   */
  async getTopCategories(days: number = 7): Promise<Array<{
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }>> {
    const result = await query<{
      category: string;
      count: string;
      amount: string;
    }>(`
      SELECT 
        category,
        COUNT(*)::int as count,
        SUM(amount)::float as amount
      FROM expenses
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return result.rows.map((row) => ({
      category: row.category,
      count: parseInt(row.count, 10),
      amount: parseFloat(row.amount),
      percentage: total > 0 ? (parseInt(row.count, 10) / total) * 100 : 0,
    }));
  }

  /**
   * Получить исторические метрики
   */
  async getHistoricalMetrics(days: number = 30): Promise<DailyMetrics[]> {
    const result = await query<{
      date: string;
      total_users: string;
      active_users: string;
      new_users: string;
      total_expenses: string;
      total_expense_amount: string;
      avg_expenses_per_user: string;
      avg_expense_amount: string;
      premium_users: string;
      premium_conversion_rate: string;
      retention_rate: string | null;
    }>(`
      SELECT * FROM daily_metrics
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date DESC
    `);

    return result.rows.map((row) => ({
      date: row.date,
      totalUsers: parseInt(row.total_users, 10),
      activeUsers: parseInt(row.active_users, 10),
      newUsers: parseInt(row.new_users, 10),
      totalExpenses: parseInt(row.total_expenses, 10),
      totalExpenseAmount: parseFloat(row.total_expense_amount),
      avgExpensesPerUser: parseFloat(row.avg_expenses_per_user),
      avgExpenseAmount: parseFloat(row.avg_expense_amount),
      premiumUsers: parseInt(row.premium_users, 10),
      premiumConversionRate: parseFloat(row.premium_conversion_rate),
      retentionRate: row.retention_rate ? parseFloat(row.retention_rate) : null,
    }));
  }

  /**
   * Получить сводку метрик
   */
  async getMetricsSummary(): Promise<{
    today: DailyMetrics | null;
    activity: UserActivityMetrics;
    premium: PremiumMetrics;
    topCategories: Array<{ category: string; count: number; amount: number; percentage: number }>;
    trends: {
      usersGrowth: number;
      expensesGrowth: number;
      premiumGrowth: number;
    };
  }> {
    // Сегодняшние метрики
    const todayResult = await query<any>(`
      SELECT * FROM daily_metrics WHERE date = CURRENT_DATE
    `);
    
    // Вчерашние метрики для расчёта трендов
    const yesterdayResult = await query<any>(`
      SELECT * FROM daily_metrics WHERE date = CURRENT_DATE - INTERVAL '1 day'
    `);

    const today = todayResult.rows[0];
    const yesterday = yesterdayResult.rows[0];

    const [activity, premium, topCategories] = await Promise.all([
      this.getUserActivityMetrics(),
      this.getPremiumStats(),
      this.getTopCategories(7),
    ]);

    // Расчёт трендов
    const trends = {
      usersGrowth: yesterday?.active_users > 0
        ? ((today?.active_users || 0) - yesterday.active_users) / yesterday.active_users * 100
        : 0,
      expensesGrowth: yesterday?.total_expenses > 0
        ? ((today?.total_expenses || 0) - yesterday.total_expenses) / yesterday.total_expenses * 100
        : 0,
      premiumGrowth: yesterday?.premium_users > 0
        ? ((today?.premium_users || 0) - yesterday.premium_users) / yesterday.premium_users * 100
        : 0,
    };

    return {
      today: today ? {
        date: today.date,
        totalUsers: parseInt(today.total_users, 10),
        activeUsers: parseInt(today.active_users, 10),
        newUsers: parseInt(today.new_users, 10),
        totalExpenses: parseInt(today.total_expenses, 10),
        totalExpenseAmount: parseFloat(today.total_expense_amount),
        avgExpensesPerUser: parseFloat(today.avg_expenses_per_user),
        avgExpenseAmount: parseFloat(today.avg_expense_amount),
        premiumUsers: parseInt(today.premium_users, 10),
        premiumConversionRate: parseFloat(today.premium_conversion_rate),
        retentionRate: today.retention_rate ? parseFloat(today.retention_rate) : null,
      } : null,
      activity,
      premium,
      topCategories,
      trends,
    };
  }
}
