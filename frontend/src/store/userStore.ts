import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '@/api/client';

interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
}

interface UserData {
  id: number;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  // Telegram user data
  telegramUser: TelegramUser | null;
  // Backend user data
  userData: UserData | null;
  // Loading states
  isLoading: boolean;
  error: string | null;
  // Actions
  setUser: (user: TelegramUser) => void;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<UserData>) => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        telegramUser: null,
        userData: null,
        isLoading: false,
        error: null,

        setUser: (user) => {
          set({ telegramUser: user });
        },

        fetchUser: async () => {
          const { telegramUser } = get();
          if (!telegramUser) return;

          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.get<UserData>('/users/me');
            set({ userData: response.data, isLoading: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch user';
            set({ error: message, isLoading: false });
          }
        },

        updateUser: async (data) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.put<UserData>('/users/me', data);
            set({ userData: response.data, isLoading: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update user';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        clearUser: () => {
          set({ telegramUser: null, userData: null, error: null });
        },
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({
          telegramUser: state.telegramUser,
        }),
      }
    ),
    { name: 'UserStore' }
  )
);
