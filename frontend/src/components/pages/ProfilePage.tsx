import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useUserStore } from '@/store/userStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

function ProfilePage() {
  const navigate = useNavigate();
  const { webApp, hapticFeedback } = useTelegram();
  const { telegramUser, userData, isLoading, error } = useUserStore();

  useEffect(() => {
    // Show back button
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

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold">Профиль</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-full bg-tg-button flex items-center justify-center text-tg-button-text text-3xl font-bold">
          {telegramUser?.firstName?.[0] || '?'}
        </div>
      </div>

      {/* Telegram Data */}
      <Card>
        <h2 className="text-lg font-semibold mb-3">Telegram</h2>
        {telegramUser ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-tg-hint">ID:</span>
              <span>{telegramUser.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tg-hint">Имя:</span>
              <span>{telegramUser.firstName}</span>
            </div>
            {telegramUser.lastName && (
              <div className="flex justify-between">
                <span className="text-tg-hint">Фамилия:</span>
                <span>{telegramUser.lastName}</span>
              </div>
            )}
            {telegramUser.username && (
              <div className="flex justify-between">
                <span className="text-tg-hint">Username:</span>
                <span>@{telegramUser.username}</span>
              </div>
            )}
            {telegramUser.languageCode && (
              <div className="flex justify-between">
                <span className="text-tg-hint">Язык:</span>
                <span>{telegramUser.languageCode.toUpperCase()}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-tg-hint text-sm">Данные недоступны</p>
        )}
      </Card>

      {/* Backend Data */}
      <Card>
        <h2 className="text-lg font-semibold mb-3">Данные с сервера</h2>
        {isLoading ? (
          <p className="text-tg-hint text-sm">Загрузка...</p>
        ) : error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : userData ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-tg-hint">User ID:</span>
              <span>{userData.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tg-hint">Создан:</span>
              <span>{new Date(userData.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-tg-hint text-sm">Нет данных</p>
        )}
      </Card>

      {/* Actions */}
      <Button 
        onClick={() => {
          hapticFeedback('light');
          navigate('/');
        }} 
        fullWidth
      >
        На главную
      </Button>
    </div>
  );
}

export default ProfilePage;
