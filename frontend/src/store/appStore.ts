import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AppState {
  isInitialized: boolean;
  isOnline: boolean;
  theme: 'light' | 'dark';
  // Actions
  setInitialized: (value: boolean) => void;
  setOnline: (value: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      isInitialized: false,
      isOnline: navigator.onLine,
      theme: 'light',

      setInitialized: (value) => {
        set({ isInitialized: value });
      },

      setOnline: (value) => {
        set({ isOnline: value });
      },

      setTheme: (theme) => {
        set({ theme });
      },
    }),
    { name: 'AppStore' }
  )
);

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOnline(true);
  });
  window.addEventListener('offline', () => {
    useAppStore.getState().setOnline(false);
  });
}
