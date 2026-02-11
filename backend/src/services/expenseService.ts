import { query } from '../db/index.js';
import { Expense, CreateExpenseData, TodayExpensesResponse, HistoryParams } from '../types/index.js';
import { AppError } from '../utils/AppError.js';

export class ExpenseService {
  /**
   * Создать новый расход
   */
  async createExpense(userId: number, data: CreateExpenseData): Promise<Expense> {
    const result = await query<Expense>(
      `INSERT INTO expenses (user_id, category, amount)
       VALUES ($1, $2, $3)
       RETURNING 
         id, 
         user_id as "userId", 
         category, 
         amount::float, 
         created_at as "createdAt"`,
      [userId, data.category, data.amount]
    );

    return result.rows[0];
  }

  /**
   * Получить количество расходов за текущий месяц
   */
  async getMonthlyExpenseCount(userId: number): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::int as count
       FROM expenses
       WHERE user_id = $1
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
         AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`,
      [userId]
    );

    return parseInt(result.rows[0]?.count || '0', 10);
  }

  /**
   * Получить расходы за сегодня
   */
  async getTodayExpenses(userId: number): Promise<TodayExpensesResponse> {
    const expensesResult = await query<Expense>(
      `SELECT 
         id, 
         user_id as "userId", 
         category, 
         amount::float, 
         created_at as "createdAt"
       FROM expenses
       WHERE user_id = $1
         AND created_at >= CURRENT_DATE
         AND created_at < CURRENT_DATE + INTERVAL '1 day'
       ORDER BY created_at DESC`,
      [userId]
    );

    const totalResult = await query<{ total: string; count: string }>(
      `SELECT 
         COALESCE(SUM(amount), 0)::float as total,
         COUNT(*)::int as count
       FROM expenses
       WHERE user_id = $1
         AND created_at >= CURRENT_DATE
         AND created_at < CURRENT_DATE + INTERVAL '1 day'`,
      [userId]
    );

    return {
      expenses: expensesResult.rows,
      total: parseFloat(totalResult.rows[0]?.total || '0'),
      count: parseInt(totalResult.rows[0]?.count || '0', 10),
    };
  }

  /**
   * Получить историю расходов с пагинацией и фильтрами
   */
  async getHistory(userId: number, params: HistoryParams) {
    const { page = 1, limit = 20, category, startDate, endDate } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(category);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}::date`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
      values.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::int as count FROM expenses WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const expensesResult = await query<Expense>(
      `SELECT 
         id, 
         user_id as "userId", 
         category, 
         amount::float, 
         created_at as "createdAt"
       FROM expenses
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    return {
      expenses: expensesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получить расход по ID
   */
  async getExpenseById(expenseId: number, userId: number): Promise<Expense | null> {
    const result = await query<Expense>(
      `SELECT 
         id, 
         user_id as "userId", 
         category, 
         amount::float, 
         created_at as "createdAt"
       FROM expenses
       WHERE id = $1 AND user_id = $2`,
      [expenseId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Удалить расход
   */
  async deleteExpense(expenseId: number, userId: number): Promise<boolean> {
    const expense = await this.getExpenseById(expenseId, userId);
    
    if (!expense) {
      throw new AppError('Expense not found', 404);
    }

    await query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [expenseId, userId]);
    
    return true;
  }

  /**
   * Получить статистику по категориям
   */
  async getCategoryStats(userId: number, startDate?: string, endDate?: string) {
    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}::date`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
      values.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query<{ category: string; total: number; count: number }>(
      `SELECT 
         category,
         SUM(amount)::float as total,
         COUNT(*)::int as count
       FROM expenses
       WHERE ${whereClause}
       GROUP BY category
       ORDER BY total DESC`,
      values
    );

    return result.rows;
  }

  /**
   * Экспорт расходов в CSV формат (только Premium)
   */
  async exportToCSV(userId: number, startDate?: string, endDate?: string): Promise<string> {
    const conditions: string[] = ['e.user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`e.created_at >= $${paramIndex++}::date`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`e.created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
      values.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query<Expense & { categoryName?: string }>(
      `SELECT 
         e.id, 
         e.category,
         COALESCE(cc.name, e.category) as "categoryName",
         e.amount::float as amount, 
         e.created_at as "createdAt"
       FROM expenses e
       LEFT JOIN custom_categories cc ON cc.user_id = e.user_id AND cc.slug = e.category
       WHERE ${whereClause}
       ORDER BY e.created_at DESC`,
      values
    );

    // Формируем CSV
    const headers = ['ID', 'Категория', 'Сумма', 'Дата'];
    const rows = result.rows.map((expense) => [
      expense.id,
      expense.categoryName || expense.category,
      expense.amount.toFixed(2),
      new Date(expense.createdAt).toLocaleString('ru-RU'),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.join(';')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Получить информацию о лимитах пользователя
   */
  async getUserLimitsInfo(userId: number, isPremium: boolean) {
    const monthlyCount = await this.getMonthlyExpenseCount(userId);
    
    if (isPremium) {
      return {
        isPremium: true,
        monthlyUsed: monthlyCount,
        monthlyLimit: null,
        remaining: null,
        canAddExpense: true,
      };
    }

    const limit = 50;
    return {
      isPremium: false,
      monthlyUsed: monthlyCount,
      monthlyLimit: limit,
      remaining: Math.max(0, limit - monthlyCount),
      canAddExpense: monthlyCount < limit,
    };
  }
}
