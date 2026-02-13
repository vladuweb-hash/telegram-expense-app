import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useExpenseStore } from '@/store/expenseStore';
import Button from '@/components/ui/Button';

function AmountInputPage() {
  const navigate = useNavigate();
  const { webApp, hapticFeedback, notificationFeedback } = useTelegram();
  const { selectedCategory, addExpense, clearSelectedCategory } = useExpenseStore();
  
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  // Если категория не выбрана - вернуться назад
  useEffect(() => {
    if (!selectedCategory) {
      navigate('/expense/category');
    }
  }, [selectedCategory, navigate]);

  // Кнопка "Назад"
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show();
      const handleBack = () => {
        hapticFeedback('light');
        clearSelectedCategory();
        navigate('/expense/category');
      };
      webApp.BackButton.onClick(handleBack);

      return () => {
        webApp.BackButton.offClick(handleBack);
        webApp.BackButton.hide();
      };
    }
  }, [webApp, navigate, hapticFeedback, clearSelectedCategory]);

  // Обработка ввода суммы
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Разрешаем только цифры и одну точку/запятую
    const sanitized = value
      .replace(/[^\d.,]/g, '')
      .replace(',', '.')
      .replace(/(\..*)\./g, '$1');
    
    // Ограничиваем до 2 знаков после точки
    const parts = sanitized.split('.');
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].slice(0, 2);
    }
    
    const finalValue = parts.join('.');
    
    // Ограничиваем максимальную сумму
    if (parseFloat(finalValue) > 10000000) {
      return;
    }
    
    setAmount(finalValue);
    setError('');
  };

  // Сохранение расхода
  const handleSave = useCallback(async () => {
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Введите корректную сумму');
      hapticFeedback('heavy');
      return;
    }

    try {
      await addExpense(numAmount);
      notificationFeedback('success');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сервера';
      setError(msg.includes('Telegram') ? 'Откройте приложение из Telegram (кнопка меню бота).' : `Не удалось сохранить: ${msg}`);
      notificationFeedback('error');
    }
  }, [amount, addExpense, navigate, hapticFeedback, notificationFeedback]);

  // Быстрые суммы
  const quickAmounts = [100, 500, 1000, 2000];

  const handleQuickAmount = (value: number) => {
    hapticFeedback('light');
    setAmount(value.toString());
    setError('');
  };

  if (!selectedCategory) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)]">
      {/* Категория */}
      <div className="text-center py-6">
        <div 
          className="inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl mb-3"
          style={{ backgroundColor: `${selectedCategory.color}20` }}
        >
          {selectedCategory.icon}
        </div>
        <h1 className="text-xl font-bold">{selectedCategory.name}</h1>
      </div>

      {/* Поле ввода суммы */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0"
            autoFocus
            className="w-full text-center text-5xl font-bold bg-transparent border-none 
                       outline-none text-tg-text placeholder:text-tg-hint"
          />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-3xl text-tg-hint">
            ₽
          </span>
        </div>
        
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

        {/* Быстрые суммы */}
        <div className="flex gap-2 mt-6 flex-wrap justify-center">
          {quickAmounts.map((value) => (
            <button
              key={value}
              onClick={() => handleQuickAmount(value)}
              className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-sm font-medium
                         hover:opacity-80 active:scale-[0.98] transition-all"
            >
              {value} ₽
            </button>
          ))}
        </div>
      </div>

      {/* Кнопка сохранения */}
      <div className="p-4 pb-8">
        <Button 
          onClick={handleSave} 
          fullWidth
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Сохранить
        </Button>
      </div>
    </div>
  );
}

export default AmountInputPage;
