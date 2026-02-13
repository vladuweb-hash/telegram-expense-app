# Telegram Mini App — Трекер расходов

## Статус: Рабочий, задеплоен

---

## Ссылки

- **Frontend (Vercel):** https://telegram-expense-app.vercel.app (уточни свой домен)
- **Backend (Railway):** https://telegram-expense-app-production-9994.up.railway.app
- **GitHub:** https://github.com/vladuweb-hash/telegram-expense-app
- **Бот:** @BotFather → твой бот

---

## Стек технологий

### Frontend
- React + TypeScript + Vite
- TailwindCSS
- Zustand (стейт-менеджер)
- Telegram WebApp SDK
- Деплой: **Vercel**

### Backend
- Node.js + Express + TypeScript
- PostgreSQL
- Winston (логирование)
- node-cron (планировщик)
- Деплой: **Railway**

---

## Переменные окружения

### Vercel (frontend)
- `VITE_API_URL` = https://telegram-expense-app-production-9994.up.railway.app

### Railway (backend)
- `DATABASE_URL` = (публичный URL PostgreSQL с Railway)
- `TELEGRAM_BOT_TOKEN` = (токен бота)
- `CORS_ORIGIN` = (URL фронтенда на Vercel)
- `TELEGRAM_SKIP_HASH_VALIDATION` = true (временно, пока не решён hash_mismatch)
- `NODE_ENV` = production
- `PORT` = 8080

---

## Что работает

- [x] Авторизация через Telegram initData
- [x] Добавление расходов
- [x] Категории расходов
- [x] Статистика (по неделе/месяцу)
- [x] Оплата Premium через Telegram Stars (100 Stars)
- [x] Webhook для обработки платежей
- [x] Premium подписка (30 дней)
- [x] Напоминания (cron, 20:00 MSK)
- [x] Настройки пользователя

---

## Webhook

Установлен командой:
```
https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=https://telegram-expense-app-production-9994.up.railway.app/webhook/telegram
```

Проверить транзакции Stars:
```
https://api.telegram.org/bot<ТОКЕН>/getStarTransactions
```

---

## Известные проблемы

1. **hash_mismatch** — initData от Telegram не проходит валидацию хэша. Временно обходится через `TELEGRAM_SKIP_HASH_VALIDATION=true`. Приложение работает, но нужно разобраться с причиной.

2. **Telegram Premium vs App Premium** — исправлено. При создании пользователя `is_premium` всегда `false`. App Premium включается только после оплаты Stars.

3. **Race condition при создании пользователя** — исправлено. Если два запроса одновременно пытаются создать пользователя, второй подхватывает уже созданного.

---

## Деплой

### Frontend (Vercel)
- Автоматический деплой при `git push` в `main`
- Сборка: `vite build` (без tsc)

### Backend (Railway)
- Автоматический деплой при `git push` в `main`
- После изменений в БД: `npm run db:migrate` (локально, с публичным DATABASE_URL)

---

## Идеи для развития / переделки

1. **Запись на услуги** (барберы, мастера) — у тебя уже есть авторизация + платежи
2. **Платные подписки на контент** — продажа доступа к закрытым каналам
3. **Мини-маркетплейс** — доска объявлений в Telegram
4. **Квизы с призами** (вирусная) — платный вход, победитель забирает банк Stars
5. **Челленджи с друзьями** (вирусная) — депозит Stars, кто сорвался — теряет

Самые вирусные: квизы (4) и челленджи (5) — не нужна аудитория, пользователи сами приводят друзей.

---

## Полезные команды

```bash
# Локальная разработка
cd frontend && npm run dev
cd backend && npm run dev

# Сборка
cd frontend && npm run build
cd backend && npm run build

# Миграции БД (подставить публичный DATABASE_URL)
cd backend && DATABASE_URL="postgresql://..." npm run db:migrate

# Git
git add -A
git commit -m "описание"
git push
```

---

*Последнее обновление: 13 февраля 2026*
