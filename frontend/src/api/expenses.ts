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

/** Статистика по категориям (с бэкенда) */
export interface CategoryStatItem {
  category: string;
  total: number;
  count: number;
}

export interface ExpenseHistoryParams {
  page?: number;
  limit?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseHistoryResponse {
  expenses: ExpenseFromApi[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Статистика по категориям за период */
export async function getExpenseStats(
  startDate?: string,
  endDate?: string
): Promise<CategoryStatItem[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const query = params.toString();
  const url = query ? `/expenses/stats?${query}` : '/expenses/stats';
  const response = await apiClient.get<ApiResponse<CategoryStatItem[]>>(url);
  const data = response.data;
  if (!data.success || !data.data) {
    throw new Error('Failed to fetch stats');
  }
  return data.data;
}

/** История расходов с пагинацией */
export async function getExpenseHistory(
  params: ExpenseHistoryParams
): Promise<ExpenseHistoryResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.category) search.set('category', params.category);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  const query = search.toString();
  const url = query ? `/expenses/history?${query}` : '/expenses/history';
  const response = await apiClient.get<{
    success: boolean;
    data: ExpenseFromApi[];
    pagination: ExpenseHistoryResponse['pagination'];
  }>(url);
  const res = response.data;
  if (!res.success || !res.data) {
    throw new Error('Failed to fetch history');
  }
  return {
    expenses: res.data,
    pagination: res.pagination,
  };
}
