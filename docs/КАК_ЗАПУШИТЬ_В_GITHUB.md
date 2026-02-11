# Как запушить изменения в GitHub

Пошагово, для новичков.

---

## Что это значит

**Запушить** — отправить сохранённые изменения кода из твоего компьютера в репозиторий на GitHub. Railway подтягивает код с GitHub и пересобирает бэкенд.

---

## Шаг 1. Открыть терминал в папке проекта

1. Открой **PowerShell** или **cmd** (поиск Windows → «PowerShell» или «Командная строка»).
2. Перейди в папку проекта:
   ```powershell
   cd C:\Users\HP\telegram-mini-app
   ```
3. Нажми Enter.

---

## Шаг 2. Посмотреть, что изменилось

Введи:
```powershell
git status
```
Нажми Enter. Появится список изменённых и новых файлов (красным или зелёным).

---

## Шаг 3. Добавить файлы в «коммит»

Добавить все изменения:
```powershell
git add .
```
Нажми Enter. (Точка = «все файлы».)

Или добавить только бэкенд и документы:
```powershell
git add backend/
git add docs/
git add frontend/.env.example
```

---

## Шаг 4. Сделать коммит (сохранить с описанием)

Введи (кавычки обязательны):
```powershell
git commit -m "fix: CORS и синхронизация расходов с API"
```
Нажми Enter. Если Git спросит имя и почту — один раз настрой (см. «Если Git просит имя и email» ниже).

---

## Шаг 5. Отправить на GitHub (push)

Введи:
```powershell
git push
```
Нажми Enter. Может попросить логин и пароль GitHub; пароль сейчас — это **Personal Access Token** (см. ниже).

Готово. Railway сам подхватит новый код и пересоберёт бэкенд (если репозиторий подключён).

---

## Если Git просит имя и email (первый раз)

Выполни один раз (подставь свои данные):
```powershell
git config --global user.name "Твоё Имя"
git config --global user.email "tvoy@email.com"
```

---

## Если git push просит логин и пароль

GitHub больше не принимает обычный пароль при push. Нужен **токен**:

1. Зайди на **https://github.com** → свой профиль (иконка справа вверху) → **Settings**.
2. В левом меню внизу: **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
3. **Generate new token (classic)**. Название, например: `railway-push`. Выбери срок (например, 90 days). Отметь право **repo**.
4. **Generate token**. Скопируй токен (один раз показывают).
5. При `git push` в поле **Password** вставь этот токен (не логин и не пароль от аккаунта).

---

## Кратко: три команды подряд

```powershell
cd C:\Users\HP\telegram-mini-app
git add .
git commit -m "fix: CORS и синхронизация с API"
git push
```

После этого подожди 1–2 минуты и проверь в Railway, что пошла новая сборка.
