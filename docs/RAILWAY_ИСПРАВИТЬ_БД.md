# Ошибка ECONNREFUSED / приложение не работает на Railway

Если в Deploy Logs видишь `Error: connect ECONNREFUSED ::1:5432` или приложение не стартует — бэкенд не может подключиться к базе. Нужно **привязать** переменную DATABASE_URL от сервиса Postgres к сервису приложения.

---

## Способ 1: Reference (рекомендуется)

1. В Railway открой **сервис telegram-expense-app** (не Postgres).
2. Вкладка **Variables**.
3. Нажми **"+ New Variable"** или **"Add Variable"** / **"Reference"**.
4. Выбери вариант вроде **"Add Reference"** или **"From another service"**.
5. Укажи сервис **Postgres** и переменную **DATABASE_URL**.
6. Сохрани. Должна появиться строка вида `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (или похоже).
7. Дождись перезапуска (1–2 мин). В Deploy Logs должно появиться `Database connected`.

---

## Способ 2: Скопировать значение вручную

1. Открой сервис **Postgres** в том же проекте Railway.
2. Вкладка **Variables** или **Connect** → скопируй значение **DATABASE_URL** (длинная строка `postgresql://...`).
3. Открой сервис **telegram-expense-app** → **Variables**.
4. Если есть переменная **DATABASE_URL** — нажми на неё и **полностью замени** значение на скопированное. Если нет — **"+ New Variable"** → имя `DATABASE_URL`, значение — вставь строку.
5. Важно: в значении не должно быть `localhost` и не должно быть `127.0.0.1`. Должен быть хост вида `*.railway.app` или `*.railway.internal`.
6. Сохрани, дождись перезапуска.

---

## Проверка

- Deploy Logs сервиса **telegram-expense-app**: должны быть строки `Database connected` и `Server running on port...`.
- В браузере открой `https://telegram-expense-app-production-9994.up.railway.app/health` — должен вернуться JSON `{"status":"ok",...}`.

Если после этого в логах по-прежнему ECONNREFUSED или сообщение про DATABASE_URL — пришли скрин вкладки **Variables** сервиса telegram-expense-app (значения можно замазать, важны имена и то, откуда берётся DATABASE_URL).
