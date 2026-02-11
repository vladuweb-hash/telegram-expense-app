import crypto from 'crypto';
import { config } from '../config/index.js';
import { PREMIUM_CONFIG } from '../config/premium.js';
import { TelegramUser } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface ParsedInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export class TelegramService {
  private botToken: string;
  private apiUrl: string;

  constructor() {
    this.botToken = config.telegramBotToken;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Вызов Telegram Bot API
   */
  private async callApi<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${this.apiUrl}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = (await response.json()) as TelegramApiResponse<T>;

    if (!data.ok) {
      logger.error(`Telegram API error: ${method}`, { error: data.description });
      throw new Error(data.description || 'Telegram API error');
    }

    return data.result as T;
  }

  /**
   * Создать ссылку на инвойс для оплаты Stars
   */
  async createPremiumInvoiceLink(userId: number): Promise<string> {
    // Уникальный payload для идентификации платежа
    const payload = `${PREMIUM_CONFIG.PAYLOAD_PREFIX}${userId}_${Date.now()}`;

    const invoiceLink = await this.callApi<string>('createInvoiceLink', {
      title: PREMIUM_CONFIG.PRODUCT.title,
      description: PREMIUM_CONFIG.PRODUCT.description,
      payload,
      currency: 'XTR', // XTR = Telegram Stars
      prices: [
        {
          label: PREMIUM_CONFIG.PRODUCT.title,
          amount: PREMIUM_CONFIG.PRICE_STARS,
        },
      ],
    });

    logger.info(`Created invoice link for user ${userId}`, { payload });

    return invoiceLink;
  }

  /**
   * Отправить инвойс напрямую пользователю
   */
  async sendPremiumInvoice(chatId: number, userId: number): Promise<void> {
    const payload = `${PREMIUM_CONFIG.PAYLOAD_PREFIX}${userId}_${Date.now()}`;

    await this.callApi('sendInvoice', {
      chat_id: chatId,
      title: PREMIUM_CONFIG.PRODUCT.title,
      description: PREMIUM_CONFIG.PRODUCT.description,
      payload,
      currency: 'XTR',
      prices: [
        {
          label: PREMIUM_CONFIG.PRODUCT.title,
          amount: PREMIUM_CONFIG.PRICE_STARS,
        },
      ],
    });

    logger.info(`Sent invoice to chat ${chatId}`, { payload });
  }

  /**
   * Подтвердить pre_checkout_query (обязательно для приёма платежей)
   */
  async answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string): Promise<void> {
    await this.callApi('answerPreCheckoutQuery', {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      error_message: errorMessage,
    });

    logger.info(`Answered pre_checkout_query ${preCheckoutQueryId}`, { ok, errorMessage });
  }

  /**
   * Отправить сообщение пользователю
   */
  async sendMessage(chatId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<void> {
    await this.callApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    });
  }

  /**
   * Validate Telegram WebApp init data
   */
  validateInitData(initData: string): ParsedInitData | null {
    if (!initData || !this.botToken) {
      return null;
    }

    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');

      if (!hash) {
        return null;
      }

      params.delete('hash');

      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      if (calculatedHash !== hash) {
        return null;
      }

      const userData = params.get('user');
      const authDate = params.get('auth_date');

      if (!authDate) {
        return null;
      }

      const authTimestamp = parseInt(authDate, 10);
      const now = Math.floor(Date.now() / 1000);
      const maxAge = 24 * 60 * 60;

      if (now - authTimestamp > maxAge) {
        return null;
      }

      return {
        query_id: params.get('query_id') || undefined,
        user: userData ? JSON.parse(userData) : undefined,
        auth_date: authTimestamp,
        hash,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse user from init data without validation (for development)
   */
  parseInitDataUnsafe(initData: string): TelegramUser | null {
    try {
      const params = new URLSearchParams(initData);
      const userData = params.get('user');

      if (!userData) {
        return null;
      }

      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  /**
   * Проверить подпись webhook от Telegram
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!config.telegramWebhookSecret) {
      // Если секрет не настроен, пропускаем проверку (небезопасно для production)
      return config.isDevelopment;
    }

    const hmac = crypto
      .createHmac('sha256', config.telegramWebhookSecret)
      .update(body)
      .digest('hex');

    return hmac === signature;
  }
}
