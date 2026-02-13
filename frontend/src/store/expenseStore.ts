import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import * as expensesApi from '@/api/expenses';

// Категории расходов
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Еда', icon: '🍔', color: '#FF6B6B' },
  { id: 'transport', name: 'Транспорт', icon: '🚗', color: '#4ECDC4' },
  { id: 'shopping', name: 'Покупки', icon: '🛒', color: '#45B7D1' },
  { id: 'entertainment', name: 'Развлечения', icon: '🎮', color: '#96CEB4' },
  { id: 'health', name: 'Здоровье', icon: '💊', color: '#FFEAA7' },
  { id: 'bills', name: 'Счета', icon: '📄', color: '#DDA0DD' },
  { id: 'education', name: 'Образование', icon: '📚', color: '#98D8C8' },
  { id: 'other', name: 'Другое', icon: '📦', color: '#B8B8B8' },
];

// Расход
export interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  date: string; // ISO string
  createdAt: string;
}

/** Преобразование расхода с API в локальный формат */
function expenseFromApi(item: expensesApi.ExpenseFromApi): Expense {
  const date = item.createdAt.split('T')[0];
  return {
    id: String(item.id),
    categoryId: item.category,
    amount: item.amount,
    date,
    createdAt: item.createdAt,
  };
}

interface ExpenseState {
  // Данные
  expenses: Expense[];
  selectedCategory: Category | null;
  expensesLoading: boolean;
  expensesError: string | null;

  // Computed
  getTodayTotal: () => number;
  getTodayExpenses: () => Expense[];
  getExpensesByDate: (date: string) => Expense[];
  getCategoryById: (id: string) => Category | undefined;

  // Actions
  selectCategory: (category: Category) => void;
  clearSelectedCategory: () => void;
  fetchTodayExpenses: () => Promise<void>;
  addExpense: (amount: number) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  clearAllExpenses: () => void;
}

// Получить сегодняшнюю дату в формате YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export const useExpenseStore = create<ExpenseState>()(
  devtools(
    persist(
      (set, get) => ({
        expenses: [],
        selectedCategory: null,
        expensesLoading: false,
        expensesError: null,

        // Получить сумму за сегодня
        getTodayTotal: () => {
          const today = getTodayDate();
          return get()
            .expenses.filter((e) => e.date === today)
            .reduce((sum, e) => sum + e.amount, 0);
        },

        // Получить расходы за сегодня
        getTodayExpenses: () => {
          const today = getTodayDate();
          return get()
            .expenses.filter((e) => e.date === today)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },

        // Получить расходы по дате
        getExpensesByDate: (date: string) => {
          return get()
            .expenses.filter((e) => e.date === date)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },

        // Получить категорию по ID
        getCategoryById: (id: string) => {
          return CATEGORIES.find((c) => c.id === id);
        },

        // Выбрать категорию
        selectCategory: (category) => {
          set({ selectedCategory: category });
        },

        // Очистить выбранную категорию
        clearSelectedCategory: () => {
          set({ selectedCategory: null });
        },

        // Загрузить расходы за сегодня с сервера
        fetchTodayExpenses: async () => {
          set({ expensesLoading: true, expensesError: null });
          try {
            const result = await expensesApi.getTodayExpenses();
            const today = getTodayDate();
            const mapped = result.expenses.map(expenseFromApi).filter((e) => e.date === today);
            set({
              expenses: get().expenses.filter((e) => e.date !== today).concat(mapped),
              expensesLoading: false,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Ошибка загрузки';
            set({ expensesError: message, expensesLoading: false });
          }
        },

        // Добавить расход (с отправкой на сервер)
        addExpense: async (amount) => {
          const { selectedCategory, expenses } = get();

          if (!selectedCategory || amount <= 0) {
            return;
          }

          try {
            const created = await expensesApi.createExpense(selectedCategory.id, amount);
            const newExpense = expenseFromApi(created);
            set({
              expenses: [...expenses, newExpense],
              selectedCategory: null,
            });
          } catch {
            set({ selectedCategory: null });
            throw new Error('Не удалось сохранить расход');
          }
        },

        // Удалить расход (с удалением на сервере)
        removeExpense: async (id) => {
          const numericId = parseInt(id, 10);
          if (Number.isNaN(numericId)) {
            set({ expenses: get().expenses.filter((e) => e.id !== id) });
            return;
          }
          try {
            await expensesApi.deleteExpense(numericId);
            set({
              expenses: get().expenses.filter((e) => e.id !== id),
            });
          } catch {
            set({
              expenses: get().expenses.filter((e) => e.id !== id),
            });
          }
        },

        // Очистить все расходы
        clearAllExpenses: () => {
          set({ expenses: [] });
        },
      }),
      {
        name: 'expense-storage',
        partialize: (state) => ({
          expenses: state.expenses,
        }),
      }
    ),
    { name: 'ExpenseStore' }
  )
);
