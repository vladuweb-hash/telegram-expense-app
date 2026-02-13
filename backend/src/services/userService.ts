import { query } from '../db/index.js';
import { TelegramUser, User } from '../types/index.js';

export class UserService {
  /**
   * Получить пользователя по Telegram ID
   */
  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    const result = await query<User>(
      `SELECT 
         id, 
         telegram_id as "telegramId", 
         first_name as "firstName",
         last_name as "lastName", 
         username, 
         language_code as "languageCode",
         is_premium as "isPremium",
         premium_until as "premiumUntil",
         reminders_enabled as "remindersEnabled",
         created_at as "createdAt", 
         updated_at as "updatedAt"
       FROM users 
       WHERE telegram_id = $1`,
      [telegramId]
    );

    return result.rows[0] || null;
  }

  /**
   * Создать пользователя из данных Telegram
   */
  async createUser(telegramUser: TelegramUser): Promise<User> {
    // is_premium в нашей БД = подписка на Premium нашего приложения, а не Telegram Premium.
    // При создании пользователя всегда FALSE; включается только после оплаты через Stars.
    const result = await query<User>(
      `INSERT INTO users (telegram_id, first_name, last_name, username, language_code, is_premium)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING 
         id, 
         telegram_id as "telegramId", 
         first_name as "firstName",
         last_name as "lastName", 
         username, 
         language_code as "languageCode",
         is_premium as "isPremium",
         premium_until as "premiumUntil",
         reminders_enabled as "remindersEnabled",
         created_at as "createdAt", 
         updated_at as "updatedAt"`,
      [
        telegramUser.id,
        telegramUser.first_name || null,
        telegramUser.last_name || null,
        telegramUser.username || null,
        telegramUser.language_code || null,
        false,
      ]
    );

    return result.rows[0];
  }

  /**
   * Получить или создать пользователя
   */
  async getOrCreateUser(telegramUser: TelegramUser): Promise<User> {
    let user = await this.getUserByTelegramId(telegramUser.id);

    if (!user) {
      user = await this.createUser(telegramUser);
    } else {
      // Синхронизируем данные из Telegram
      user = await this.syncTelegramData(telegramUser);
    }

    return user;
  }

  /**
   * Синхронизировать данные из Telegram
   */
  async syncTelegramData(telegramUser: TelegramUser): Promise<User> {
    const result = await query<User>(
      `UPDATE users SET 
         first_name = $2,
         last_name = $3,
         username = $4,
         language_code = $5
       WHERE telegram_id = $1
       RETURNING 
         id, 
         telegram_id as "telegramId", 
         first_name as "firstName",
         last_name as "lastName", 
         username, 
         language_code as "languageCode",
         is_premium as "isPremium",
         premium_until as "premiumUntil",
         reminders_enabled as "remindersEnabled",
         created_at as "createdAt", 
         updated_at as "updatedAt"`,
      [
        telegramUser.id,
        telegramUser.first_name || null,
        telegramUser.last_name || null,
        telegramUser.username || null,
        telegramUser.language_code || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Обновить данные пользователя по Telegram ID
   */
  async updateUser(
    telegramId: number,
    data: { firstName?: string; lastName?: string | null }
  ): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users SET 
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name)
       WHERE telegram_id = $1
       RETURNING 
         id, 
         telegram_id as "telegramId", 
         first_name as "firstName",
         last_name as "lastName", 
         username, 
         language_code as "languageCode",
         is_premium as "isPremium",
         premium_until as "premiumUntil",
         reminders_enabled as "remindersEnabled",
         created_at as "createdAt", 
         updated_at as "updatedAt"`,
      [telegramId, data.firstName ?? null, data.lastName ?? null]
    );
    return result.rows[0] || null;
  }

  /**
   * Получить пользователя по ID
   */
  async getUserById(id: number): Promise<User | null> {
    const result = await query<User>(
      `SELECT 
         id, 
         telegram_id as "telegramId", 
         first_name as "firstName",
         last_name as "lastName", 
         username, 
         language_code as "languageCode",
         is_premium as "isPremium",
         premium_until as "premiumUntil",
         reminders_enabled as "remindersEnabled",
         created_at as "createdAt", 
         updated_at as "updatedAt"
       FROM users 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }
}
