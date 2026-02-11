# Подключение фронта к бэкенду на Railway

Ты уже задеплоил бэкенд на Railway. Чтобы приложение (фронт) ходило в твой API на Railway, сделай следующее.

---

## 1. Узнай URL бэкенда на Railway

1. Зайди в [railway.app](https://railway.app) → свой проект.
2. Открой сервис с бэкендом (тот, у которого Root Directory = `backend`).
3. Вкладка **Settings** → **Networking** → **Generate Domain** (если домена ещё нет).
4. Скопируй URL, например: `https://telegram-mini-app-backend.up.railway.app`

Проверка: открой в браузере `https://ТВОЙ-URL/health` — должен вернуться JSON с `"status":"ok"`.

---

## 2. Настрой фронтенд

### Если запускаешь фронт **локально** (на своём компьютере)

1. Открой файл **`frontend/.env`** (если его нет — скопируй из `frontend/.env.example` и переименуй в `.env`).
2. Замени строку с API на URL твоего бэкенда (в конце добавь `/api`):

   ```env
   VITE_API_URL=https://ТВОЙ-ПРОЕКТ.up.railway.app/api
   ```

   Пример:
   ```env
   VITE_API_URL=https://telegram-mini-app-backend.up.railway.app/api
   ```

3. Сохрани файл и **перезапусти** фронт:
   - Останови текущий `npm run dev` (Ctrl+C).
   - Снова выполни: `cd C:\Users\HP\telegram-mini-app\frontend` и `npm run dev`.
4. Открой http://localhost:5173 — приложение должно сохранять расходы через бэкенд на Railway.

### Настрой CORS на Railway

Чтобы браузер мог обращаться с localhost к твоему бэкенду на Railway:

1. В Railway → сервис бэкенда → **Variables**.
2. Добавь или измени переменную:
   - **CORS_ORIGIN** = `http://localhost:5173`
3. Сохрани. Railway перезапустит сервис.

---

## 3. Если фронт задеплоен (Vercel / Netlify / другой хостинг)

1. В настройках **сборки фронта** (Vercel/Netlify) добавь переменную окружения:
   - **VITE_API_URL** = `https://ТВОЙ-БЭКЕНД.up.railway.app/api`
2. В Railway у бэкенда в **Variables** задай:
   - **CORS_ORIGIN** = URL твоего фронта, например `https://твой-проект.vercel.app`
3. Сделай пересборку фронта (Redeploy), чтобы подхватилась новая переменная.

---

## Кратко

| Где запущен фронт   | VITE_API_URL (в .env или на хостинге)     | CORS_ORIGIN (в Railway)        |
|---------------------|-------------------------------------------|--------------------------------|
| Локально (localhost)| `https://твой-backend.up.railway.app/api` | `http://localhost:5173`        |
| Vercel / Netlify    | `https://твой-backend.up.railway.app/api`  | `https://твой-фронт.vercel.app` |

После смены `VITE_API_URL` фронт нужно перезапустить или пересобрать.
