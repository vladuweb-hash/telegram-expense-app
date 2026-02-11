/**
 * Лимиты для Free и Premium пользователей
 */
export const LIMITS = {
  FREE: {
    // Максимум расходов в месяц
    MONTHLY_EXPENSES: 50,
    // Нельзя создавать свои категории
    CUSTOM_CATEGORIES: false,
    // Нельзя экспортировать CSV
    EXPORT_CSV: false,
  },
  PREMIUM: {
    // Без лимитов
    MONTHLY_EXPENSES: Infinity,
    // Можно создавать свои категории
    CUSTOM_CATEGORIES: true,
    // Можно экспортировать CSV
    EXPORT_CSV: true,
    // Максимум кастомных категорий
    MAX_CUSTOM_CATEGORIES: 20,
  },
} as const;

/**
 * Сообщения об ошибках лимитов
 */
export const LIMIT_MESSAGES = {
  MONTHLY_EXPENSES_EXCEEDED: 'Достигнут лимит расходов в месяц (50). Оформите Premium для снятия ограничений.',
  CUSTOM_CATEGORIES_NOT_ALLOWED: 'Создание своих категорий доступно только в Premium.',
  EXPORT_NOT_ALLOWED: 'Экспорт данных доступен только в Premium.',
  MAX_CUSTOM_CATEGORIES_REACHED: 'Достигнут лимит кастомных категорий (20).',
} as const;
