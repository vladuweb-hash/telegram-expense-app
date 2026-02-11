import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useUserStore } from '@/store/userStore';
import { useExpenseStore } from '@/store/expenseStore';
import { usePremiumStore } from '@/store/premiumStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

function HomePage() {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { telegramUser } = useUserStore();
  const { getTodayTotal, getTodayExpenses, getCategoryById, removeExpense } = useExpenseStore();
  const { isPremium, fetchPremiumInfo } = usePremiumStore();

  const todayTotal = getTodayTotal();
  const todayExpenses = getTodayExpenses();

  // Загружаем статус Premium
  useEffect(() => {
    fetchPremiumInfo();
  }, [fetchPremiumInfo]);

  const handleAddExpense = () => {
    hapticFeedback('light');
    navigate('/expense/category');
  };

  const handleRemoveExpense = (id: string) => {
    hapticFeedback('medium');
    removeExpense(id);
  };

  const handlePremiumClick = () => {
    hapticFeedback('light');
    navigate('/premium');
  };

  const handleSettingsClick = () => {
    hapticFeedback('light');
    navigate('/settings');
  };

  // Форматирование суммы
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Приветствие + кнопки */}
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-tg-hint text-sm">
            {telegramUser?.firstName ? `Привет, ${telegramUser.firstName}!` : 'Привет!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePremiumClick}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${isPremium 
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600' 
                : 'bg-tg-secondary-bg text-tg-hint hover:text-tg-text'
              }`}
          >
            {isPremium ? '👑' : '⭐'}
          </button>
          <button
            onClick={handleSettingsClick}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint hover:text-tg-text transition-colors"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Сумма за сегодня */}
      <Card className="text-center py-8">
        <p className="text-tg-hint text-sm mb-2">Расходы за сегодня</p>
        <p className="text-4xl font-bold">
          {formatAmount(todayTotal)} <span className="text-2xl">₽</span>
        </p>
      </Card>

      {/* Кнопка добавления */}
      <Button onClick={handleAddExpense} fullWidth>
        + Добавить расход
      </Button>

      {/* Баннер Premium для free пользователей */}
      {!isPremium && todayExpenses.length >= 3 && (
        <button
          onClick={handlePremiumClick}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 
                     border border-yellow-500/20 text-left transition-all hover:border-yellow-500/40"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-medium">Оформите Premium</p>
              <p className="text-sm text-tg-hint">Без лимитов, свои категории, экспорт</p>
            </div>
          </div>
        </button>
      )}

      {/* Список расходов за сегодня */}
      {todayExpenses.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Сегодня</h2>
          
          {todayExpenses.map((expense) => {
            const category = getCategoryById(expense.categoryId);
            
            return (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 rounded-xl bg-tg-secondary-bg"
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="w-10 h-10 flex items-center justify-center rounded-full text-xl"
                    style={{ backgroundColor: category ? `${category.color}20` : '#f0f0f0' }}
                  >
                    {category?.icon || '📦'}
                  </span>
                  <div>
                    <p className="font-medium">{category?.name || 'Другое'}</p>
                    <p className="text-xs text-tg-hint">
                      {new Date(expense.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {formatAmount(expense.amount)} ₽
                  </span>
                  <button
                    onClick={() => handleRemoveExpense(expense.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full 
                               text-tg-hint hover:bg-red-100 hover:text-red-500 
                               transition-colors"
                    aria-label="Удалить"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Пустое состояние */}
      {todayExpenses.length === 0 && (
        <div className="text-center py-8 text-tg-hint">
          <p className="text-4xl mb-3">📝</p>
          <p>Пока нет расходов</p>
          <p className="text-sm">Добавьте первый расход</p>
        </div>
      )}
    </div>
  );
}

export default HomePage;
