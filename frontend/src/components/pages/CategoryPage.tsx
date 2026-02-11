import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useExpenseStore, CATEGORIES, Category } from '@/store/expenseStore';

function CategoryPage() {
  const navigate = useNavigate();
  const { webApp, hapticFeedback } = useTelegram();
  const { selectCategory } = useExpenseStore();

  useEffect(() => {
    // Показать кнопку "Назад"
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

  const handleCategorySelect = (category: Category) => {
    hapticFeedback('light');
    selectCategory(category);
    navigate('/expense/amount');
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold">Выберите категорию</h1>
        <p className="text-tg-hint mt-1">На что потратили?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category)}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-tg-secondary-bg 
                       hover:opacity-80 active:scale-[0.98] transition-all duration-200"
          >
            <span 
              className="text-4xl mb-2 w-16 h-16 flex items-center justify-center rounded-full"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {category.icon}
            </span>
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CategoryPage;
