import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useExpenseStore } from '@/store/expenseStore';
import { getExpenseStats, type CategoryStatItem } from '@/api/expenses';
import Card from '@/components/ui/Card';

type Period = 'week' | 'month';

function getPeriodDates(period: Period): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function StatsPage() {
  const navigate = useNavigate();
  const { webApp, hapticFeedback } = useTelegram();
  const { getCategoryById } = useExpenseStore();
  const [period, setPeriod] = useState<Period>('week');
  const [stats, setStats] = useState<CategoryStatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate } = getPeriodDates(period);
  const total = stats.reduce((sum, s) => sum + s.total, 0);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getExpenseStats(startDate, endDate)
      .then((data) => {
        if (!cancelled) {
          setStats(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const handlePeriodChange = (p: Period) => {
    hapticFeedback('light');
    setPeriod(p);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Статистика</h1>
      </div>

      {/* Период */}
      <div className="flex gap-2 p-1 rounded-xl bg-tg-secondary-bg">
        <button
          type="button"
          onClick={() => handlePeriodChange('week')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            period === 'week'
              ? 'bg-tg-bg text-tg-text shadow'
              : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          Неделя
        </button>
        <button
          type="button"
          onClick={() => handlePeriodChange('month')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            period === 'month'
              ? 'bg-tg-bg text-tg-text shadow'
              : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          Месяц
        </button>
      </div>

      {loading && (
        <div className="py-8 text-center text-tg-hint">Загрузка...</div>
      )}

      {error && (
        <p className="text-red-500 text-sm text-center py-4">{error}</p>
      )}

      {!loading && !error && (
        <>
          <Card className="text-center py-6">
            <p className="text-tg-hint text-sm mb-1">
              Всего за {period === 'week' ? 'неделю' : 'месяц'}
            </p>
            <p className="text-3xl font-bold">{formatAmount(total)} ₽</p>
          </Card>

          {stats.length === 0 ? (
            <div className="text-center py-8 text-tg-hint">
              <p className="text-4xl mb-3">📊</p>
              <p>Нет расходов за выбранный период</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">По категориям</h2>
              {stats.map((item) => {
                const category = getCategoryById(item.category);
                const percent = total > 0 ? (item.total / total) * 100 : 0;
                return (
                  <div
                    key={item.category}
                    className="p-3 rounded-xl bg-tg-secondary-bg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 flex items-center justify-center rounded-full text-xl"
                          style={{
                            backgroundColor: category
                              ? `${category.color}25`
                              : '#f0f0f0',
                          }}
                        >
                          {category?.icon ?? '📦'}
                        </span>
                        <span className="font-medium">
                          {category?.name ?? item.category}
                        </span>
                      </div>
                      <span className="font-semibold">
                        {formatAmount(item.total)} ₽
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-tg-bg overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(percent, 100)}%`,
                          backgroundColor: category?.color ?? '#B8B8B8',
                        }}
                      />
                    </div>
                    <p className="text-xs text-tg-hint mt-1">
                      {percent.toFixed(0)}% · {item.count}{' '}
                      {item.count === 1 ? 'расход' : 'расходов'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StatsPage;
