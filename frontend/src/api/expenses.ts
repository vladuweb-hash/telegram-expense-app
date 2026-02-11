import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types';

/** Расход с бэкенда */
export interface ExpenseFromApi {
  id: number;
  userId: number;
  category: string;
  amount: number;
  createdAt: string;
}

export interface TodayExpensesResponse {
  expenses: ExpenseFromApi[];
  total: number;
  count: number;
}

export interface CreateExpenseResponse {
  id: number;
  userId: number;
  category: string;
  amount: number;
  createdAt: string;
}

/** Расходы за сегодня */
export async function getTodayExpenses(): Promise<TodayExpensesResponse> {
  const response = await apiClient.get<ApiResponse<TodayExpensesResponse>>('/expenses/today');
  const data = response.data;
  if (!data.success || !data.data) {
    throw new Error('Failed to fetch today expenses');
  }
  return data.data;
}

/** Создать расход */
export async function createExpense(category: string, amount: number): Promise<CreateExpenseResponse> {
  const response = await apiClient.post<ApiResponse<CreateExpenseResponse>>('/expenses', {
    category,
    amount,
  });
  const data = response.data;
  if (!data.success || !data.data) {
    throw new Error((data as { message?: string }).message || 'Failed to create expense');
  }
  return data.data;
}

/** Удалить расход */
export async function deleteExpense(id: number): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}
