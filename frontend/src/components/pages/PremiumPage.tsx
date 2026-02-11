import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { usePremiumStore } from '@/store/premiumStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

function PremiumPage() {
  const navigate = useNavigate();
  const { webApp, hapticFeedback, notificationFeedback, showAlert } = useTelegram();
  const {
    isPremium,
    premiumUntil,
    daysRemaining,
    price,
    duration,
    features,
    isLoading,
    isCreatingInvoice,
    error,
    fetchPremiumInfo,
    purchasePremium,
  } = usePremiumStore();

  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Загружаем информацию о Premium
  useEffect(() => {
    fetchPremiumInfo();
  }, [fetchPremiumInfo]);

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

  // Обработка покупки
  const handlePurchase = async () => {
    hapticFeedback('medium');

    const invoiceLink = await purchasePremium();

    if (!invoiceLink) {
      // Уже Premium или ошибка
      if (isPremium) {
        showAlert('У вас уже есть Premium подписка!');
      }
      return;
    }

    // Открываем инвойс через Telegram WebApp
    if (webApp?.openInvoice) {
      webApp.openInvoice(invoiceLink, (status) => {
        if (status === 'paid') {
          // Успешная оплата
          notificationFeedback('success');
          setPaymentSuccess(true);
          
          // Обновляем информацию о Premium
          fetchPremiumInfo();
          
          // Показываем уведомление
          showAlert('🎉 Поздравляем! Premium активирован!');
        } else if (status === 'cancelled') {
          hapticFeedback('light');
        } else if (status === 'failed') {
          hapticFeedback('heavy');
          showAlert('Ошибка оплаты. Попробуйте ещё раз.');
        }
      });
    } else {
      // Fallback - открываем ссылку в браузере
      window.open(invoiceLink, '_blank');
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-tg-button border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="text-center py-6">
        <div className="text-6xl mb-4">⭐</div>
        <h1 className="text-2xl font-bold">Premium</h1>
        <p className="text-tg-hint mt-1">Расширенные возможности</p>
      </div>

      {/* Текущий статус Premium */}
      {isPremium && (
        <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👑</span>
            <div>
              <p className="font-semibold">Premium активен</p>
              {premiumUntil && (
                <p className="text-sm text-tg-hint">
                  до {formatDate(premiumUntil)} ({daysRemaining} дн.)
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Успешная оплата */}
      {paymentSuccess && !isPremium && (
        <Card className="bg-green-500/20 border border-green-500/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-semibold">Оплата прошла успешно!</p>
              <p className="text-sm text-tg-hint">Premium скоро будет активирован</p>
            </div>
          </div>
        </Card>
      )}

      {/* Преимущества */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Что входит в Premium</h2>
        
        {features.length > 0 ? (
          features.map((feature, index) => (
            <Card key={index} className="flex items-start gap-3">
              <span className="text-2xl">{feature.icon}</span>
              <div>
                <p className="font-medium">{feature.title}</p>
                <p className="text-sm text-tg-hint">{feature.description}</p>
              </div>
            </Card>
          ))
        ) : (
          <>
            <Card className="flex items-start gap-3">
              <span className="text-2xl">♾️</span>
              <div>
                <p className="font-medium">Без лимитов</p>
                <p className="text-sm text-tg-hint">Неограниченное количество расходов</p>
              </div>
            </Card>
            <Card className="flex items-start gap-3">
              <span className="text-2xl">🏷️</span>
              <div>
                <p className="font-medium">Свои категории</p>
                <p className="text-sm text-tg-hint">Создавайте до 20 своих категорий</p>
              </div>
            </Card>
            <Card className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-medium">Экспорт данных</p>
                <p className="text-sm text-tg-hint">Выгружайте расходы в CSV</p>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Цена и кнопка покупки */}
      {!isPremium && (
        <div className="space-y-4 pt-4">
          <div className="text-center">
            <p className="text-3xl font-bold">
              {price} <span className="text-xl">⭐</span>
            </p>
            <p className="text-tg-hint">за {duration} дней</p>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button
            onClick={handlePurchase}
            fullWidth
            loading={isCreatingInvoice}
          >
            Оформить Premium
          </Button>

          <p className="text-xs text-tg-hint text-center">
            Оплата через Telegram Stars. Подписка не продлевается автоматически.
          </p>
        </div>
      )}

      {/* Если Premium активен - кнопка продления */}
      {isPremium && daysRemaining !== null && daysRemaining <= 7 && (
        <div className="space-y-4 pt-4">
          <p className="text-center text-tg-hint">
            Ваша подписка скоро закончится. Продлите Premium, чтобы не потерять доступ.
          </p>
          <Button
            onClick={handlePurchase}
            fullWidth
            loading={isCreatingInvoice}
          >
            Продлить за {price} ⭐
          </Button>
        </div>
      )}
    </div>
  );
}

export default PremiumPage;
