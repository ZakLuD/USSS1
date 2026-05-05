# Подробная инструкция: без Google Cloud

Эта инструкция для варианта:

```text
GitHub + Netlify сайт
        ->
Netlify Functions
        ->
Google Apps Script
        ->
твоя Google Sheets таблица
```

Google Cloud не нужен. Банковская карта не нужна.

## 1. Что скачать

В архиве должны быть:

```text
index.html
Code.gs
netlify.toml
package.json
README.md
DEPLOY_GUIDE.md
.gitignore
.env.example
netlify/functions/admin.js
netlify/functions/tokens.js
netlify/functions/_appsScriptProxy.js
```

## 2. Настрой Apps Script backend

1. Открой https://script.google.com/
2. Создай новый проект.
3. Удали весь стандартный код.
4. Вставь содержимое файла `Code.gs`.
5. Нажми `Save`.

В `Code.gs` уже прописана твоя таблица:

```text
1MZ-3YdoViw8nDyop-0GVuylYF9oRYuplYbep2A1Juq8
```

## 3. Задай пароль администратора

В Apps Script открой:

```text
Project Settings -> Script Properties
```

Добавь property:

```text
ADMIN_PASSWORD
```

Значение: твой пароль администратора.

Если не добавить property, будет использован пароль из кода:

```text
wZ3inB6gsIbt
```

Лучше всё-таки задать свой пароль.

## 4. Опубликуй Apps Script как Web App

В Apps Script:

1. Нажми `Deploy`.
2. Выбери `New deployment`.
3. Нажми на шестерёнку и выбери `Web app`.
4. Настройки:

```text
Execute as: Me
Who has access: Anyone
```

5. Нажми `Deploy`.
6. Разреши доступ к Google Sheets.
7. Скопируй Web App URL.

Он выглядит примерно так:

```text
https://script.google.com/macros/s/AKfycb.../exec
```

Это будет значение для Netlify переменной `APPS_SCRIPT_URL`.

## 5. Создай GitHub repository

1. Открой https://github.com/
2. Нажми `New repository`.
3. Назови, например:

```text
tokens-audit
```

4. Нажми `Create repository`.

## 6. Загрузи файлы в GitHub

Самый простой способ:

1. Открой repository.
2. Нажми `Add file`.
3. Нажми `Upload files`.
4. Перетащи все файлы из архива.
5. Нажми `Commit changes`.

Важно: `Code.gs` можно оставить в репозитории как копию backend-кода. Секретов в нём нет, если ты задал `ADMIN_PASSWORD` через Script Properties.

## 7. Подключи Netlify

1. Открой https://app.netlify.com/
2. Нажми `Add new site`.
3. Выбери `Import an existing project`.
4. Выбери GitHub.
5. Выбери свой repository.

Настройки:

```text
Build command: echo Static site ready
Publish directory: .
Functions directory: netlify/functions
```

`Functions directory` уже прописан в `netlify.toml`.

Важно: строка `Site configuration -> Environment variables` не должна быть в `Publish directory`, `Base directory`, `Build command` или `Functions directory`. Это просто путь в интерфейсе Netlify, куда нужно зайти мышкой, чтобы добавить переменную `APPS_SCRIPT_URL`.

## 8. Добавь переменную в Netlify

В Netlify открой:

```text
Site configuration -> Environment variables
```

Добавь:

```text
APPS_SCRIPT_URL=https://script.google.com/macros/s/ТВОЙ_ID/exec
```

Вставь туда ссылку Web App из Apps Script.

## 9. Сделай деплой

В Netlify:

1. Открой вкладку `Deploys`.
2. Нажми `Trigger deploy`.
3. Выбери `Deploy site`.

После деплоя открой ссылку Netlify:

```text
https://your-site-name.netlify.app
```

Проверь:

1. Загружается ли список жетонов.
2. Работает ли добавление.
3. Работает ли вход администратора.
4. Работает ли редактирование.
5. Работает ли удаление.

## 10. Если хочешь frontend на GitHub Pages

Проще держать сайт на Netlify, потому что там уже есть Functions.

Но если хочешь GitHub Pages отдельно:

1. Backend proxy всё равно должен остаться на Netlify.
2. В `index.html` найди:

```js
const API_BASE_URL = '';
```

3. Замени на URL Netlify:

```js
const API_BASE_URL = 'https://your-site-name.netlify.app';
```

4. После этого GitHub Pages будет обращаться к Netlify Functions.

## 11. Частые ошибки

### Список не загружается

Открой прямую проверку функции:

```text
https://your-site-name.netlify.app/.netlify/functions/health
```

Если там `ok: true`, backend работает.

Проверь:

```text
APPS_SCRIPT_URL
```

Он должен заканчиваться на:

```text
/exec
```

### Добавление не работает

Проверь, что Apps Script Web App опубликован с настройкой:

```text
Execute as: Me
Who has access: Anyone
```

### Редактирование или удаление не работает

Войди в админ-режим заново. Админ-сессия живёт 2 часа.

### Поменял Code.gs, но сайт работает по-старому

В Apps Script нужно сделать новый деплой:

```text
Deploy -> Manage deployments -> Edit -> Version -> New version -> Deploy
```
