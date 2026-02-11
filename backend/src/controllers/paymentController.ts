import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService.js';
import { UserService } from '../services/userService.js';
import { TelegramService } from '../services/telegramService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { TelegramUser } from '../types/index.js';
import { PREMIUM_CONFIG, PREMIUM_FEATURES } from '../config/premium.js';

const paymentService = new PaymentService();
const userService = new UserService();
const telegramService = new TelegramService();

export class PaymentController {
  /**
   * POST /payments/create-invoice - Создать инвойс для оплаты
   */
  async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      // Получаем пользователя
      const user = await userService.getOrCreateUser(telegramUser);

      // Проверяем, не активен ли уже Premium
      const premiumStatus = await paymentService.getPremiumStatus(user.id);
      if (premiumStatus.isPremium && premiumStatus.daysRemaining && premiumStatus.daysRemaining > 0) {
        return res.json({
          success: true,
          data: {
            alreadyPremium: true,
            premiumUntil: premiumStatus.premiumUntil,
            daysRemaining: premiumStatus.daysRemaining,
          },
        });
      }

      // Создаём инвойс
      const { invoiceLink } = await paymentService.createPremiumInvoice(user.id);

      res.json({
        success: true,
        data: {
          invoiceLink,
          price: PREMIUM_CONFIG.PRICE_STARS,
          currency: 'XTR',
          duration: PREMIUM_CONFIG.DURATION_DAYS,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /payments/premium-info - Информация о Premium
   */
  async getPremiumInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const premiumStatus = await paymentService.getPremiumStatus(user.id);

      res.json({
        success: true,
        data: {
          ...premiumStatus,
          price: PREMIUM_CONFIG.PRICE_STARS,
          currency: 'XTR',
          duration: PREMIUM_CONFIG.DURATION_DAYS,
          features: PREMIUM_FEATURES,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /payments/history - История платежей
   */
  async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUser = req.telegramUser as TelegramUser;

      if (!telegramUser) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await userService.getOrCreateUser(telegramUser);
      const payments = await paymentService.getPaymentHistory(user.id);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /webhook/telegram - Webhook для обработки событий от Telegram
   */
  async handleWebhook(req: Request, res: Response, _next: NextFunction) {
    try {
      const update = req.body;

      logger.debug('Received Telegram webhook', { update_id: update.update_id });

      // Обработка pre_checkout_query (подтверждение перед оплатой)
      if (update.pre_checkout_query) {
        const query = update.pre_checkout_query;
        
        logger.info('Received pre_checkout_query', { 
          id: query.id, 
          userId: query.from.id,
          payload: query.invoice_payload,
        });

        // Подтверждаем готовность принять платёж
        await telegramService.answerPreCheckoutQuery(query.id, true);
        
        return res.json({ ok: true });
      }

      // Обработка успешного платежа
      if (update.message?.successful_payment) {
        const message = update.message;
        const payment = message.successful_payment;

        logger.info('Received successful_payment', {
          userId: message.from.id,
          amount: payment.total_amount,
          currency: payment.currency,
          paymentId: payment.telegram_payment_charge_id,
        });

        // Обрабатываем платёж
        await paymentService.handleSuccessfulPayment(message.from.id, payment);

        return res.json({ ok: true });
      }

      // Другие события игнорируем
      res.json({ ok: true });
    } catch (error) {
      logger.error('Webhook error', { error });
      // Всегда отвечаем 200, чтобы Telegram не переотправлял
      res.json({ ok: true });
    }
  }
}
