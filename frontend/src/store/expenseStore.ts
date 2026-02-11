import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

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

interface ExpenseState {
  // Данные
  expenses: Expense[];
  selectedCategory: Category | null;
  
  // Computed
  getTodayTotal: () => number;
  getTodayExpenses: () => Expense[];
  getExpensesByDate: (date: string) => Expense[];
  getCategoryById: (id: string) => Category | undefined;
  
  // Actions
  selectCategory: (category: Category) => void;
  clearSelectedCategory: () => void;
  addExpense: (amount: number) => void;
  removeExpense: (id: string) => void;
  clearAllExpenses: () => void;
}

// Получить сегодняшнюю дату в формате YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Генерация уникального ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useExpenseStore = create<ExpenseState>()(
  devtools(
    persist(
      (set, get) => ({
        expenses: [],
        selectedCategory: null,

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

        // Добавить расход
        addExpense: (amount) => {
          const { selectedCategory, expenses } = get();
          
          if (!selectedCategory || amount <= 0) {
            return;
          }

          const newExpense: Expense = {
            id: generateId(),
            categoryId: selectedCategory.id,
            amount,
            date: getTodayDate(),
            createdAt: new Date().toISOString(),
          };

          set({
            expenses: [...expenses, newExpense],
            selectedCategory: null,
          });
        },

        // Удалить расход
        removeExpense: (id) => {
          set({
            expenses: get().expenses.filter((e) => e.id !== id),
          });
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
