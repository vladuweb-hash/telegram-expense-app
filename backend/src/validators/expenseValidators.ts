import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../types/index.js';

// Валидация создания расхода
export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(10000000, 'Amount is too large'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// Валидация параметров истории
export const historyParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

export type HistoryParamsInput = z.infer<typeof historyParamsSchema>;
