# Деплой на Railway

Пошаговая инструкция, как задеплоить backend (и при желании frontend) telegram-mini-app на Railway.

---

## Что понадобится

- Аккаунт на [Railway](https://railway.app) (логин через GitHub)
- Проект в репозитории на **GitHub**
- База **PostgreSQL** (можно создать на Railway или использовать внешнюю: Neon, Supabase)

---

## Шаг 1: Проект в GitHub

1. Зайдите на [github.com](https://github.com), создайте репозиторий (если ещё нет).
2. В папке проекта выполните (подставьте свой URL репозитория):

```powershell
cd C:\Users\HP\telegram-mini-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/НАЗВАНИЕ_РЕПО.git
git push -u origin main
```

Если репозиторий уже создан и подключён — просто убедитесь, что последние изменения запушены:

```powershell
git add .
git commit -m "fix: build and deploy"
git push
```

---

## Шаг 2: Создать проект на Railway

1. Откройте [railway.app](https://railway.app) и войдите через **GitHub**.
2. Нажмите **"New Project"**.
3. Выберите **"Deploy from GitHub repo"**.
4. Укажите репозиторий с telegram-mini-app и (при необходимости) ветку `main`.
5. Railway создаст проект и начнёт первую сборку. Пока можно не настраивать — сначала добавим БД и переменные.

---

## Шаг 3: Добавить PostgreSQL

1. В проекте Railway нажмите **"+ New"**.
2. Выберите **"Database"** → **"PostgreSQL"**.
3. Дождитесь создания БД. Откройте её, перейдите во вкладку **"Variables"** или **"Connect"**.
4. Скопируйте **`DATABASE_URL`** (или строку подключения). Она понадобится для backend.

---

## Шаг 4: Настроить Backend-сервис

1. В проекте Railway откройте сервис, который деплоится из GitHub (ваш репозиторий).
2. Нажмите на сервис → **"Settings"** (или **"Variables"**).

### Root Directory (обязательно)

- В настройках найдите **"Root Directory"** (или **"Build"** → **Root Directory**).
- Укажите: **`backend`**.
- Так Railway будет собирать и запускать только папку `backend`, а не корень репозитория.

### Build & Start

- **Build Command:** `npm ci` или `npm install` (часто подставляется автоматически).
- **Start Command:** `npm run start` или `npm start` (должно запускать `node dist/index.js`).
- **Watch Paths:** можно оставить пустым или `backend/**`, чтобы пересборка шла только при изменении backend.

Если в **package.json** в `backend` уже есть:

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js"
}
```

то Railway обычно сам подхватывает `npm run build` и `npm run start`.

### Переменные окружения (Variables)

В разделе **"Variables"** добавьте:

| Переменная | Значение | Обязательно |
|------------|----------|-------------|
| `DATABASE_URL` | Строка из шага 3 (PostgreSQL на Railway или своя) | Да |
| `NODE_ENV` | `production` | Рекомендуется |
| `PORT` | Railway подставляет сам (часто `3000`) | Обычно не нужно |
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather | Да, для бота |
| `CORS_ORIGIN` | URL вашего фронта, например `https://ваш-фронт.vercel.app` | Да |
| `APP_URL` | URL того же фронта или backend (для webhook) | По желанию |

Сохраните переменные. Railway перезапустит сервис.

---

## Шаг 5: Миграции БД

После первого деплоя таблицы в БД нужно создать один раз.

**Вариант A — через Railway CLI**

1. Установите [Railway CLI](https://docs.railway.app/develop/cli).
2. Выполните в корне проекта (не в `backend`):

```powershell
railway link   # выбрать проект и сервис
railway run -d backend npm run db:migrate
```

**Вариант B — вручную**

1. В Railway откройте PostgreSQL → вкладка **"Data"** или **"Query"** (если есть).
2. Либо подключитесь к БД с помощью клиента (DBeaver, pgAdmin), используя `DATABASE_URL`.
3. Выполните SQL из файла `backend/src/db/schema.sql` или запустите миграции локально, указав `DATABASE_URL` от Railway в своём `.env` и выполнив в папке `backend`:  
   `npm run db:migrate`

После этого backend сможет работать с таблицами.

---

## Шаг 6: Домен и проверка

1. В настройках backend-сервиса откройте **"Settings"** → **"Networking"** → **"Generate Domain"**.
2. Скопируйте URL вида `https://ваш-сервис.up.railway.app`.
3. Проверьте: откройте в браузере `https://ваш-сервис.up.railway.app/health` — должен вернуться JSON (например `{"status":"ok"}` или как у вас в коде).
4. В **CORS_ORIGIN** и **APP_URL** укажите URL фронта (или этот же домен для теста).

---

## Деплой Frontend (отдельно)

Frontend (React/Vite) обычно деплоят на **Vercel** или **Netlify**:

1. Залейте код на GitHub (уже сделано).
2. Зайдите на [vercel.com](https://vercel.com) или [netlify.com](https://netlify.com), подключите тот же репозиторий.
3. Укажите **Root Directory**: `frontend`.
4. Build: `npm run build`, выходная папка: `dist`.
5. В переменных окружения задайте `VITE_API_URL=https://ваш-backend.up.railway.app/api` (URL вашего backend на Railway).

После деплоя подставьте URL фронта в **CORS_ORIGIN** в Railway и перезапустите backend.

---

## Краткий чек-лист

- [ ] Код в GitHub, последний push выполнен
- [ ] Railway: New Project → Deploy from GitHub → выбран репозиторий
- [ ] Добавлена БД PostgreSQL, скопирован `DATABASE_URL`
- [ ] У backend указан **Root Directory**: `backend`
- [ ] В Variables заданы: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `CORS_ORIGIN`, при необходимости `APP_URL`
- [ ] Выполнены миграции БД (один раз)
- [ ] Сгенерирован домен, проверен `/health`
- [ ] (Опционально) Frontend задеплоен на Vercel/Netlify, его URL прописан в `CORS_ORIGIN`

Если на каком-то шаге появится ошибка — пришлите текст ошибки или скрин, подскажу, что исправить.
