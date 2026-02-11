# Telegram Mini App

Full-stack Telegram Mini App с React фронтендом и Express бэкендом.

## 🛠 Технологии

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- Zustand (state management)
- Telegram WebApp SDK

### Backend
- Node.js + Express
- PostgreSQL
- TypeScript

## 📁 Структура проекта

```
telegram-mini-app/
├── frontend/           # React приложение
│   ├── src/
│   │   ├── components/ # UI компоненты
│   │   ├── hooks/      # Кастомные хуки
│   │   ├── store/      # Zustand store
│   │   ├── types/      # TypeScript типы
│   │   ├── utils/      # Утилиты
│   │   └── api/        # API клиент
│   └── ...
├── backend/            # Express сервер
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   └── types/
│   └── ...
└── README.md
```

## 🚀 Быстрый старт

### Требования
- Node.js >= 18
- PostgreSQL >= 14
- npm или yarn

### 1. Клонирование и установка

```bash
# Клонировать репозиторий
git clone <repository-url>
cd telegram-mini-app

# Установка зависимостей frontend
cd frontend
npm install

# Установка зависимостей backend
cd ../backend
npm install
```

### 2. Настройка окружения

```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

Отредактируйте `.env` файлы с вашими настройками.

### 3. Настройка базы данных

```bash
# Создать базу данных
psql -U postgres
CREATE DATABASE telegram_mini_app;
\q

# Применить миграции
cd backend
npm run db:migrate
```

### 4. Запуск в режиме разработки

```bash
# Терминал 1 - Backend
cd backend
npm run dev

# Терминал 2 - Frontend
cd frontend
npm run dev
```

Frontend будет доступен на `http://localhost:5173`
Backend API на `http://localhost:3000`

## 📦 Скрипты

### Frontend

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск dev сервера |
| `npm run build` | Production сборка |
| `npm run preview` | Превью production сборки |
| `npm run lint` | Проверка ESLint |
| `npm run type-check` | Проверка TypeScript |

### Backend

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск с hot-reload |
| `npm run build` | Компиляция TypeScript |
| `npm run start` | Запуск production |
| `npm run db:migrate` | Применить миграции |
| `npm run lint` | Проверка ESLint |

## 🔧 Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Настройте Mini App:
   ```
   /newapp
   ```
4. Укажите URL вашего приложения (для разработки используйте ngrok или аналог)

## 🌐 Деплой

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Загрузите папку dist/
```

### Backend (Railway/Render/VPS)

```bash
cd backend
npm run build
npm start
```

## 🔒 Безопасность

- Всегда валидируйте `initData` от Telegram на бэкенде
- Используйте HTTPS в production
- Не храните секреты в коде
- Регулярно обновляйте зависимости

## 📝 API Endpoints

### Users
- `GET /api/users/me` - Получить текущего пользователя
- `PUT /api/users/me` - Обновить профиль

### Health
- `GET /api/health` - Проверка состояния сервера

## 📄 Лицензия

MIT
