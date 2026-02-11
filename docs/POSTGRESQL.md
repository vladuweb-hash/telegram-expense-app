# Настройка PostgreSQL для telegram-mini-app

## Вариант 1: Установка на Windows (локально)

### 1. Скачать и установить

1. Откройте: **https://www.postgresql.org/download/windows/**
2. Нажмите **"Download the installer"** (от EDB) или перейдите на https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
3. Выберите версию **16** (или 15) для **Windows x86-64**
4. Скачайте и запустите установщик.

### 2. Шаги установки

- **Select Components:** оставьте всё по умолчанию (PostgreSQL Server, pgAdmin, Command Line Tools).
- **Data Directory:** можно не менять.
- **Password:** придумайте и **запомните пароль** для пользователя `postgres` (например `postgres` или свой пароль). Он понадобится в `DATABASE_URL`.
- **Port:** оставьте **5432**.
- Дальше — Next до конца, затем Finish.

### 3. Проверка, что PostgreSQL запущен

- Откройте **Диспетчер задач** → вкладка **Службы** (или **Services** в поиске Windows).
- Найдите службу **postgresql-x64-16** (или похожее) — статус должен быть **Выполняется**.
- Если нет: ПКМ → **Запустить**.

Или в PowerShell (от имени администратора):

```powershell
Get-Service -Name "postgresql*"
# Запуск, если остановлена:
# Start-Service -Name "postgresql-x64-16"
```

### 4. Создание базы данных

**Способ A — через pgAdmin (если установлен):**

1. Откройте **pgAdmin** из меню Пуск.
2. Подключитесь к серверу (двойной клик, введите пароль `postgres`, который задали при установке).
3. ПКМ по **Databases** → **Create** → **Database**.
4. Имя: `telegram_mini_app` → Save.

**Способ B — через командную строку:**

Откройте **PowerShell** или **cmd** и выполните (подставьте свой пароль вместо `ВАШ_ПАРОЛЬ`):

```powershell
$env:PGPASSWORD = "ВАШ_ПАРОЛЬ"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE telegram_mini_app;"
```

Если PostgreSQL установлен в другую папку (например 15), замените `16` на свою версию. Путь можно посмотреть в меню Пуск: PostgreSQL → папка с версией.

### 5. Настройка backend/.env

Откройте файл `backend/.env` и задайте строку подключения:

```
DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/telegram_mini_app
```

Замените `ВАШ_ПАРОЛЬ` на пароль пользователя `postgres`, который вы задали при установке.

Пример: если пароль `mypass123`:

```
DATABASE_URL=postgresql://postgres:mypass123@localhost:5432/telegram_mini_app
```

### 6. Применение миграций

В терминале:

```powershell
cd C:\Users\HP\telegram-mini-app\backend
npm run db:migrate
```

Должно появиться: `Migrations completed successfully`. После этого можно запускать backend: `npm run dev`.

---

## Вариант 2: Облачная БД (без установки PostgreSQL на ПК)

Если не хотите ставить PostgreSQL на компьютер:

1. Зарегистрируйтесь на одном из сервисов:
   - **Neon** — https://neon.tech (бесплатный tier)
   - **Supabase** — https://supabase.com (бесплатный tier)
   - **Railway** — https://railway.app

2. Создайте новый проект и **PostgreSQL** базу.

3. Скопируйте **Connection string** (URL подключения). Обычно выглядит так:
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```

4. Вставьте его в `backend/.env`:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
   ```

5. Запустите миграции:
   ```powershell
   cd C:\Users\HP\telegram-mini-app\backend
   npm run db:migrate
   ```

---

## Частые ошибки

| Ошибка | Решение |
|--------|--------|
| `ECONNREFUSED` на порту 5432 | PostgreSQL не запущен. Запустите службу (см. п. 3) или установите PostgreSQL. |
| `password authentication failed` | Неверный пароль в `DATABASE_URL`. Укажите пароль пользователя `postgres`. |
| `database "telegram_mini_app" does not exist` | Создайте базу (п. 4). |
| `psql` не найден | Добавьте в PATH папку `C:\Program Files\PostgreSQL\16\bin` или используйте pgAdmin. |

---

## Итог

После выполнения шагов 1–6 (или Вариант 2) у вас будут:

- Работающий PostgreSQL с базой `telegram_mini_app`
- Применённые таблицы (миграции)
- Готовый к запуску backend: `cd backend` → `npm run dev`
