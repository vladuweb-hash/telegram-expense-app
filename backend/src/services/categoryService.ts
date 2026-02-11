import { query } from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { LIMITS, LIMIT_MESSAGES } from '../config/limits.js';
import { EXPENSE_CATEGORIES } from '../types/index.js';

export interface CustomCategory {
  id: number;
  userId: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface CreateCategoryData {
  name: string;
  icon?: string;
  color?: string;
}

export class CategoryService {
  /**
   * Получить все категории пользователя (стандартные + кастомные)
   */
  async getAllCategories(userId: number, isPremium: boolean) {
    // Стандартные категории
    const standardCategories = [
      { slug: 'food', name: 'Еда', icon: '🍔', color: '#FF6B6B', isCustom: false },
      { slug: 'transport', name: 'Транспорт', icon: '🚗', color: '#4ECDC4', isCustom: false },
      { slug: 'shopping', name: 'Покупки', icon: '🛒', color: '#45B7D1', isCustom: false },
      { slug: 'entertainment', name: 'Развлечения', icon: '🎮', color: '#96CEB4', isCustom: false },
      { slug: 'health', name: 'Здоровье', icon: '💊', color: '#FFEAA7', isCustom: false },
      { slug: 'bills', name: 'Счета', icon: '📄', color: '#DDA0DD', isCustom: false },
      { slug: 'education', name: 'Образование', icon: '📚', color: '#98D8C8', isCustom: false },
      { slug: 'other', name: 'Другое', icon: '📦', color: '#B8B8B8', isCustom: false },
    ];

    // Если не Premium - только стандартные
    if (!isPremium) {
      return {
        categories: standardCategories,
        canAddCustom: false,
      };
    }

    // Получаем кастомные категории Premium пользователя
    const customResult = await query<CustomCategory>(
      `SELECT 
         id,
         user_id as "userId",
         name,
         slug,
         icon,
         color,
         created_at as "createdAt"
       FROM custom_categories
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );

    const customCategories = customResult.rows.map((cat) => ({
      ...cat,
      isCustom: true,
    }));

    return {
      categories: [...standardCategories, ...customCategories],
      canAddCustom: customCategories.length < LIMITS.PREMIUM.MAX_CUSTOM_CATEGORIES,
      customCount: customCategories.length,
      maxCustom: LIMITS.PREMIUM.MAX_CUSTOM_CATEGORIES,
    };
  }

  /**
   * Создать кастомную категорию (только Premium)
   */
  async createCustomCategory(userId: number, data: CreateCategoryData): Promise<CustomCategory> {
    // Проверяем лимит кастомных категорий
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*)::int as count FROM custom_categories WHERE user_id = $1',
      [userId]
    );
    const currentCount = parseInt(countResult.rows[0]?.count || '0', 10);

    if (currentCount >= LIMITS.PREMIUM.MAX_CUSTOM_CATEGORIES) {
      throw new AppError(LIMIT_MESSAGES.MAX_CUSTOM_CATEGORIES_REACHED, 400);
    }

    // Генерируем slug из названия
    const slug = this.generateSlug(data.name);

    // Проверяем что slug не совпадает со стандартными категориями
    if (EXPENSE_CATEGORIES.includes(slug as any)) {
      throw new AppError('Название категории совпадает со стандартной', 400);
    }

    // Проверяем уникальность slug для пользователя
    const existingResult = await query(
      'SELECT id FROM custom_categories WHERE user_id = $1 AND slug = $2',
      [userId, slug]
    );

    if (existingResult.rows.length > 0) {
      throw new AppError('Категория с таким названием уже существует', 400);
    }

    const result = await query<CustomCategory>(
      `INSERT INTO custom_categories (user_id, name, slug, icon, color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING 
         id,
         user_id as "userId",
         name,
         slug,
         icon,
         color,
         created_at as "createdAt"`,
      [
        userId,
        data.name,
        slug,
        data.icon || '📌',
        data.color || '#808080',
      ]
    );

    return result.rows[0];
  }

  /**
   * Удалить кастомную категорию
   */
  async deleteCustomCategory(userId: number, categoryId: number): Promise<boolean> {
    // Проверяем что категория принадлежит пользователю
    const categoryResult = await query<CustomCategory>(
      'SELECT * FROM custom_categories WHERE id = $1 AND user_id = $2',
      [categoryId, userId]
    );

    if (categoryResult.rows.length === 0) {
      throw new AppError('Категория не найдена', 404);
    }

    const category = categoryResult.rows[0];

    // Переносим расходы в категорию "other"
    await query(
      `UPDATE expenses SET category = 'other' WHERE user_id = $1 AND category = $2`,
      [userId, category.slug]
    );

    // Удаляем категорию
    await query('DELETE FROM custom_categories WHERE id = $1', [categoryId]);

    return true;
  }

  /**
   * Обновить кастомную категорию
   */
  async updateCustomCategory(
    userId: number,
    categoryId: number,
    data: Partial<CreateCategoryData>
  ): Promise<CustomCategory> {
    // Проверяем что категория принадлежит пользователю
    const existingResult = await query<CustomCategory>(
      'SELECT * FROM custom_categories WHERE id = $1 AND user_id = $2',
      [categoryId, userId]
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Категория не найдена', 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.icon) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(data.icon);
    }
    if (data.color) {
      updates.push(`color = $${paramIndex++}`);
      values.push(data.color);
    }

    if (updates.length === 0) {
      return existingResult.rows[0];
    }

    values.push(categoryId, userId);

    const result = await query<CustomCategory>(
      `UPDATE custom_categories 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING 
         id,
         user_id as "userId",
         name,
         slug,
         icon,
         color,
         created_at as "createdAt"`,
      values
    );

    return result.rows[0];
  }

  /**
   * Проверить существование категории (стандартной или кастомной)
   */
  async categoryExists(userId: number, categorySlug: string): Promise<boolean> {
    // Проверяем стандартные категории
    if (EXPENSE_CATEGORIES.includes(categorySlug as any)) {
      return true;
    }

    // Проверяем кастомные категории
    const result = await query(
      'SELECT id FROM custom_categories WHERE user_id = $1 AND slug = $2',
      [userId, categorySlug]
    );

    return result.rows.length > 0;
  }

  /**
   * Генерация slug из названия
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\sа-яё-]/gi, '')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 50);
  }
}
