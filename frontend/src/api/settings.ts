import { apiClient } from './client';

export interface NotificationSettings {
  remindersEnabled: boolean;
  canDisableReminders: boolean;
}

export interface UserSettings {
  user: {
    id: number;
    telegramId: number;
    firstName: string;
    isPremium: boolean;
    premiumUntil: string | null;
  };
  notifications: NotificationSettings;
}

/**
 * Получить все настройки пользователя
 */
export async function getAllSettings(): Promise<UserSettings> {
  const response = await apiClient.get<{ success: boolean; data: UserSettings }>(
    '/settings'
  );
  return response.data.data;
}

/**
 * Получить настройки уведомлений
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await apiClient.get<{ success: boolean; data: NotificationSettings }>(
    '/settings/notifications'
  );
  return response.data.data;
}

/**
 * Обновить настройки уведомлений
 */
export async function updateNotificationSettings(
  remindersEnabled: boolean
): Promise<NotificationSettings> {
  const response = await apiClient.put<{ success: boolean; data: NotificationSettings }>(
    '/settings/notifications',
    { remindersEnabled }
  );
  return response.data.data;
}
