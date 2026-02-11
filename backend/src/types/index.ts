// ==================== TELEGRAM ====================
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

// ==================== USER ====================
export interface User {
  id: number;
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium: boolean;
  premiumUntil?: string | null;
  remindersEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
}

// ==================== EXPENSE ====================
export interface Expense {
  id: number;
  userId: number;
  category: string;
  amount: number;
  createdAt: string;
}

export interface CreateExpenseData {
  category: string;
  amount: number;
}

export interface ExpenseWithCategory extends Expense {
  categoryName?: string;
}

// Категории расходов
export const EXPENSE_CATEGORIES = [
  'food',
  'transport', 
  'shopping',
  'entertainment',
  'health',
  'bills',
  'education',
  'other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// ==================== API ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TodayExpensesResponse {
  expenses: Expense[];
  total: number;
  count: number;
}

export interface HistoryParams {
  page?: number;
  limit?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

// ==================== EXPRESS ====================
declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramUser;
      userId?: number;
      user?: User;
      limitInfo?: {
        monthlyUsed: number;
        monthlyLimit: number;
        remaining: number;
      };
    }
  }
}
