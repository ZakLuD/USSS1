# Аудит жетонов: Netlify/GitHub + Apps Script backend

Эта версия не использует Google Cloud и не требует банковскую карту.

Схема:

```text
Сайт на Netlify или GitHub Pages
        ->
Netlify Functions proxy
        ->
Google Apps Script Web App
        ->
Google Sheets
```

Apps Script нужен только как backend для доступа к Google Sheets. Пользователи открывают сайт на Netlify/GitHub, а не `script.google.com`.

## Файлы

```text
index.html
Code.gs
netlify.toml
package.json
.env.example
.gitignore
DEPLOY_GUIDE.md
netlify/functions/admin.js
netlify/functions/tokens.js
netlify/functions/_appsScriptProxy.js
```

## Что нужно настроить

1. Вставить `Code.gs` в Google Apps Script.
2. Опубликовать Apps Script как Web App.
3. В Netlify добавить переменную:

```text
APPS_SCRIPT_URL=https://script.google.com/macros/s/...../exec
```

4. Загрузить остальные файлы в GitHub.
5. Подключить GitHub repository к Netlify.

Подробная инструкция лежит в `DEPLOY_GUIDE.md`.

