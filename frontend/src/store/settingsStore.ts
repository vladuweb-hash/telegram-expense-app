import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  getAllSettings,
  updateNotificationSettings,
  NotificationSettings,
} from '@/api/settings';

interface SettingsState {
  // Данные
  remindersEnabled: boolean;
  canDisableReminders: boolean;
  
  // Loading
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Actions
  fetchSettings: () => Promise<void>;
  toggleReminders: () => Promise<void>;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      remindersEnabled: true,
      canDisableReminders: false,
      isLoading: false,
      isSaving: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });

        try {
          const settings = await getAllSettings();
          set({
            remindersEnabled: settings.notifications.remindersEnabled,
            canDisableReminders: settings.notifications.canDisableReminders,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch settings';
          set({ error: message, isLoading: false });
        }
      },

      toggleReminders: async () => {
        const { remindersEnabled, canDisableReminders } = get();
        
        if (!canDisableReminders) {
          set({ error: 'Отключение напоминаний доступно только для Premium' });
          return;
        }

        set({ isSaving: true, error: null });

        try {
          const newValue = !remindersEnabled;
          const settings = await updateNotificationSettings(newValue);
          set({
            remindersEnabled: settings.remindersEnabled,
            isSaving: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update settings';
          set({ error: message, isSaving: false });
        }
      },

      setRemindersEnabled: async (enabled: boolean) => {
        const { canDisableReminders } = get();
        
        if (!canDisableReminders && !enabled) {
          set({ error: 'Отключение напоминаний доступно только для Premium' });
          return;
        }

        set({ isSaving: true, error: null });

        try {
          const settings = await updateNotificationSettings(enabled);
          set({
            remindersEnabled: settings.remindersEnabled,
            isSaving: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update settings';
          set({ error: message, isSaving: false });
        }
      },
    }),
    { name: 'SettingsStore' }
  )
);
