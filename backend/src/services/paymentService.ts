import { query } from '../db/index.js';
import { TelegramService } from './telegramService.js';
import { PREMIUM_CONFIG } from '../config/premium.js';
import { logger } from '../utils/logger.js';
import { User } from '../types/index.js';

export interface Payment {
  id: number;
  oderId: number;
  telegramPaymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
}

export interface SuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

const telegramService = new TelegramService();

export class PaymentService {
  /**
   * Создать инвойс для Premium подписки
   */
  async createPremiumInvoice(userId: number): Promise<{ invoiceLink: string }> {
    const invoiceLink = await telegramService.createPremiumInvoiceLink(userId);
    
    // Логируем создание инвойса
    logger.info(`Premium invoice created for user ${userId}`);
    
    return { invoiceLink };
  }

  /**
   * Обработать успешный платёж
   */
  async handleSuccessfulPayment(
    telegramUserId: number,
    payment: SuccessfulPayment
  ): Promise<void> {
    const { invoice_payload, telegram_payment_charge_id, total_amount, currency } = payment;

    // Проверяем payload
    if (!invoice_payload.startsWith(PREMIUM_CONFIG.PAYLOAD_PREFIX)) {
      logger.warn('Invalid payment payload', { payload: invoice_payload });
      return;
    }

    // Извлекаем userId из payload
    const payloadParts = invoice_payload.replace(PREMIUM_CONFIG.PAYLOAD_PREFIX, '').split('_');
    const payloadUserId = parseInt(payloadParts[0], 10);

    // Верифицируем что это тот же пользователь
    if (payloadUserId !== telegramUserId) {
      logger.warn('User ID mismatch in payment', { payloadUserId, telegramUserId });
    }

    // Получаем пользователя из БД
    const userResult = await query<User>(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramUserId]
    );

    if (userResult.rows.length === 0) {
      logger.error('User not found for payment', { telegramUserId });
      return;
    }

    const user = userResult.rows[0];

    // Сохраняем информацию о платеже
    await query(
      `INSERT INTO payments (user_id, telegram_payment_id, amount, currency, status, payload)
       VALUES ($1, $2, $3, $4, 'completed', $5)`,
      [user.id, telegram_payment_charge_id, total_amount, currency, invoice_payload]
    );

    // Активируем Premium
    await this.activatePremium(user.id);

    // Отправляем подтверждение пользователю
    await telegramService.sendMessage(
      telegramUserId,
      `🎉 <b>Premium активирован!</b>\n\n` +
      `Спасибо за покупку! Ваша Premium подписка активна на ${PREMIUM_CONFIG.DURATION_DAYS} дней.\n\n` +
      `Теперь вам доступно:\n` +
      `✅ Безлимитные расходы\n` +
      `✅ Свои категории\n` +
      `✅ Экспорт в CSV`
    );

    logger.info(`Premium activated for user ${user.id}`, { telegramUserId, paymentId: telegram_payment_charge_id });
  }

  /**
   * Активировать Premium подписку
   */
  async activatePremium(userId: number): Promise<void> {
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + PREMIUM_CONFIG.DURATION_DAYS);

    await query(
      `UPDATE users SET 
         is_premium = TRUE, 
         premium_until = $2
       WHERE id = $1`,
      [userId, premiumUntil.toISOString()]
    );

    logger.info(`Premium activated for user ${userId} until ${premiumUntil.toISOString()}`);
  }

  /**
   * Проверить и деактивировать истекшие подписки
   */
  async checkExpiredSubscriptions(): Promise<number> {
    const result = await query(
      `UPDATE users SET is_premium = FALSE 
       WHERE is_premium = TRUE 
         AND premium_until IS NOT NULL 
         AND premium_until < CURRENT_TIMESTAMP
       RETURNING id, telegram_id`
    );

    const expiredCount = result.rowCount || 0;

    if (expiredCount > 0) {
      logger.info(`Deactivated ${expiredCount} expired Premium subscriptions`);
      
      // Уведомляем пользователей об истечении
      for (const user of result.rows as { id: number; telegram_id: number }[]) {
        try {
          await telegramService.sendMessage(
            user.telegram_id,
            `⏰ <b>Ваша Premium подписка истекла</b>\n\n` +
            `Чтобы продолжить пользоваться расширенными возможностями, продлите подписку.`
          );
        } catch (error) {
          logger.error(`Failed to notify user ${user.id} about expiration`, { error });
        }
      }
    }

    return expiredCount;
  }

  /**
   * Получить статус Premium пользователя
   */
  async getPremiumStatus(userId: number): Promise<{
    isPremium: boolean;
    premiumUntil: string | null;
    daysRemaining: number | null;
  }> {
    const result = await query<{ is_premium: boolean; premium_until: string | null }>(
      'SELECT is_premium, premium_until FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { isPremium: false, premiumUntil: null, daysRemaining: null };
    }

    const { is_premium, premium_until } = result.rows[0];

    let daysRemaining: number | null = null;
    if (is_premium && premium_until) {
      const now = new Date();
      const until = new Date(premium_until);
      daysRemaining = Math.max(0, Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      isPremium: is_premium,
      premiumUntil: premium_until,
      daysRemaining,
    };
  }

  /**
   * Получить историю платежей пользователя
   */
  async getPaymentHistory(userId: number): Promise<Payment[]> {
    const result = await query<Payment>(
      `SELECT 
         id, 
         user_id as "userId",
         telegram_payment_id as "telegramPaymentId",
         amount,
         currency,
         status,
         created_at as "createdAt"
       FROM payments 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    return result.rows;
  }
}
