import { apiClient } from './client';

export interface PremiumFeature {
  icon: string;
  title: string;
  description: string;
}

export interface PremiumInfo {
  isPremium: boolean;
  premiumUntil: string | null;
  daysRemaining: number | null;
  price: number;
  currency: string;
  duration: number;
  features: PremiumFeature[];
}

export interface InvoiceResponse {
  invoiceLink?: string;
  alreadyPremium?: boolean;
  premiumUntil?: string;
  daysRemaining?: number;
  price?: number;
  currency?: string;
  duration?: number;
}

export interface Payment {
  id: number;
  userId: number;
  telegramPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

/**
 * Получить информацию о Premium
 */
export async function getPremiumInfo(): Promise<PremiumInfo> {
  const response = await apiClient.get<{ success: boolean; data: PremiumInfo }>(
    '/payments/premium-info'
  );
  return response.data.data;
}

/**
 * Создать инвойс для оплаты
 */
export async function createInvoice(): Promise<InvoiceResponse> {
  const response = await apiClient.post<{ success: boolean; data: InvoiceResponse }>(
    '/payments/create-invoice'
  );
  return response.data.data;
}

/**
 * Получить историю платежей
 */
export async function getPaymentHistory(): Promise<Payment[]> {
  const response = await apiClient.get<{ success: boolean; data: Payment[] }>(
    '/payments/history'
  );
  return response.data.data;
}
