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
    if (!this.botToken) {
      logger.error('Telegram API call skipped: TELEGRAM_BOT_TOKEN is not set');
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    let response: Response;
    try {
      response = await fetch(`${this.apiUrl}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Telegram API request failed: ${method}`, { error: msg });
      throw new Error(`Telegram API request failed: ${msg}`);
    }

    const data = (await response.json()) as TelegramApiResponse<T>;

    if (!data.ok) {
      const desc = data.description || 'Unknown error';
      logger.error(`Telegram API error: ${method}`, { error: desc, code: data.error_code });
      throw new Error(desc);
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
   * Parse initData query string into key-value pairs, keeping values raw (as in Telegram docs).
   */
  private parseInitDataRaw(initData: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const part of initData.split('&')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const key = part.slice(0, eq);
      const value = part.slice(eq + 1);
      map.set(key, value);
    }
    return map;
  }

  /**
   * Validate Telegram WebApp init data.
   * Data-check-string must use raw parameter values (no URL decode) to match Telegram's hash.
   */
  validateInitData(initData: string): ParsedInitData | null {
    if (!initData || !this.botToken) {
      return null;
    }

    try {
      const params = this.parseInitDataRaw(initData);
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

      const userRaw = params.get('user');
      const authDateRaw = params.get('auth_date');

      if (!authDateRaw) {
        return null;
      }

      const authTimestamp = parseInt(authDateRaw, 10);
      if (Number.isNaN(authTimestamp)) {
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const maxAge = 24 * 60 * 60;

      if (now - authTimestamp > maxAge) {
        return null;
      }

      let user: TelegramUser | undefined;
      if (userRaw) {
        try {
          user = JSON.parse(decodeURIComponent(userRaw)) as TelegramUser;
        } catch {
          return null;
        }
      }

      return {
        query_id: params.get('query_id') || undefined,
        user,
        auth_date: authTimestamp,
        hash,
      };
    } catch {
      return null;
    }
  }

  /**
   * Returns a short reason why validation failed (for logging). Does not run full validation.
   */
  getValidationFailureReason(initData: string): string {
    if (!this.botToken) return 'missing_bot_token';
    if (!initData?.trim()) return 'empty_init_data';
    try {
      const params = this.parseInitDataRaw(initData);
      if (!params.get('hash')) return 'no_hash';
      const authDateRaw = params.get('auth_date');
      if (!authDateRaw) return 'no_auth_date';
      const authTimestamp = parseInt(authDateRaw, 10);
      if (Number.isNaN(authTimestamp)) return 'invalid_auth_date';
      const now = Math.floor(Date.now() / 1000);
      if (now - authTimestamp > 24 * 60 * 60) return 'auth_expired';
      return 'hash_mismatch';
    } catch {
      return 'parse_error';
    }
  }

  /**
   * Parse user from init data without validation (for development)
   */
  parseInitDataUnsafe(initData: string): TelegramUser | null {
    try {
      const params = this.parseInitDataRaw(initData);
      const userRaw = params.get('user');
      if (!userRaw) return null;
      return JSON.parse(decodeURIComponent(userRaw)) as TelegramUser;
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
