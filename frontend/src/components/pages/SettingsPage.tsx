import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useSettingsStore } from '@/store/settingsStore';
import { usePremiumStore } from '@/store/premiumStore';
import Card from '@/components/ui/Card';

function SettingsPage() {
  const navigate = useNavigate();
  const { webApp, hapticFeedback, showAlert } = useTelegram();
  const {
    remindersEnabled,
    canDisableReminders,
    isLoading,
    isSaving,
    error,
    fetchSettings,
    toggleReminders,
  } = useSettingsStore();
  const { isPremium } = usePremiumStore();

  // Загружаем настройки
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Кнопка "Назад"
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show();
      const handleBack = () => {
        hapticFeedback('light');
        navigate('/');
      };
      webApp.BackButton.onClick(handleBack);

      return () => {
        webApp.BackButton.offClick(handleBack);
        webApp.BackButton.hide();
      };
    }
  }, [webApp, navigate, hapticFeedback]);

  // Обработка переключения напоминаний
  const handleToggleReminders = async () => {
    if (!canDisableReminders) {
      hapticFeedback('heavy');
      showAlert('Отключение напоминаний доступно только для Premium пользователей');
      return;
    }

    hapticFeedback('light');
    await toggleReminders();
  };

  // Переход на Premium
  const handlePremiumClick = () => {
    hapticFeedback('light');
    navigate('/premium');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-tg-button border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="py-4">
        <h1 className="text-2xl font-bold">Настройки</h1>
      </div>

      {/* Уведомления */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Уведомления</h2>

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Напоминания о расходах</p>
              <p className="text-sm text-tg-hint mt-1">
                Напоминание в 20:00, если нет расходов за день
              </p>
            </div>
            
            <button
              onClick={handleToggleReminders}
              disabled={isSaving}
              className={`relative w-14 h-8 rounded-full transition-colors duration-200 
                ${remindersEnabled ? 'bg-tg-button' : 'bg-gray-300'}
                ${!canDisableReminders ? 'opacity-50' : ''}
                ${isSaving ? 'cursor-wait' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200
                  ${remindersEnabled ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>

          {/* Premium badge если нельзя отключить */}
          {!canDisableReminders && (
            <button
              onClick={handlePremiumClick}
              className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl 
                         bg-gradient-to-r from-yellow-500/10 to-orange-500/10 
                         border border-yellow-500/20 text-sm"
            >
              <span>⭐</span>
              <span className="text-tg-hint">Отключение доступно в Premium</span>
            </button>
          )}
        </Card>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
      </div>

      {/* Аккаунт */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Аккаунт</h2>

        <Card>
          <button
            onClick={handlePremiumClick}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isPremium ? '👑' : '⭐'}</span>
              <div className="text-left">
                <p className="font-medium">Premium</p>
                <p className="text-sm text-tg-hint">
                  {isPremium ? 'Активен' : 'Получить доступ'}
                </p>
              </div>
            </div>
            <span className="text-tg-hint">→</span>
          </button>
        </Card>

        <Card>
          <button
            onClick={() => {
              hapticFeedback('light');
              navigate('/profile');
            }}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <div className="text-left">
                <p className="font-medium">Профиль</p>
                <p className="text-sm text-tg-hint">Информация о пользователе</p>
              </div>
            </div>
            <span className="text-tg-hint">→</span>
          </button>
        </Card>
      </div>

      {/* О приложении */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">О приложении</h2>

        <Card>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-tg-hint">Версия</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tg-hint">Разработчик</span>
              <span>@your_username</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SettingsPage;
