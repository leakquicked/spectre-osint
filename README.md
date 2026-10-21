# SPECTRE — OSINT Intelligence Platform

Профессиональная OSINT-платформа на чистом HTML/CSS/JS. Работает прямо в браузере, без сервера и базы данных.

![SPECTRE](https://img.shields.io/badge/SPECTRE-OSINT%20Platform-00d4ff?style=flat-square&labelColor=0a0e1a)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-22c55e?style=flat-square)
![No Backend](https://img.shields.io/badge/Backend-None-7c3aed?style=flat-square)

---

## Модули

| Модуль | Описание | API |
|---|---|---|
| **Dashboard** | Обзор активности, быстрый запуск | — |
| **EXIF Analyzer** | Метаданные изображений, GPS-координаты | — |
| **Domain Intel** | RDAP lookup, DNS (Cloudflare DoH) | Публичные |
| **Link Analysis** | Canvas-граф связей, импорт/экспорт | — |
| **Investigation** | Рабочее пространство расследования | — |
| **Reports** | Генерация отчётов MD/JSON/CSV | — |
| **AI Analyst** | Чат с Gemini 2.0 Flash | Gemini (ключ пользователя) |

---

## Публикация на GitHub Pages

### 1. Создай репозиторий

```
GitHub → New repository → Public → Create
```

### 2. Загрузи файлы

```bash
git clone https://github.com/USERNAME/REPO.git
cp -r osint-site/* REPO/
cd REPO
git add .
git commit -m "Initial SPECTRE deploy"
git push origin main
```

### 3. Включи GitHub Pages

```
GitHub → Repository → Settings → Pages
→ Source: Deploy from a branch
→ Branch: main → / (root)
→ Save
```

### 4. Готово

Через 1–2 минуты сайт будет доступен по адресу:
```
https://USERNAME.github.io/REPO/
```

---

## Gemini API (AI Analyst)

1. Открой [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Нажми **Create API key** — это бесплатно (~60 запросов/мин)
3. При первом открытии сайта введи ключ в форму
4. Ключ сохранится в **localStorage твоего браузера** — никуда не передаётся

> **Важно:** не вставляй API-ключ в код и не коммить его в репозиторий.

---

## Архитектура

```
index.html              — точка входа
assets/
  css/
    style.css           — вся стилистика (CSS variables, dark theme)
  js/
    app.js              — роутер, тосты, часы, онбординг
    dashboard.js        — главная панель
    exif.js             — EXIF-анализатор (нативный парсер)
    domain.js           — Domain Intel (RDAP + Cloudflare DoH)
    graph.js            — Canvas Link Analysis граф
    workspace.js        — Investigation Workspace
    reports.js          — Report Generator
    ai.js               — AI Analyst (Gemini 2.0 Flash)
  images/
    favicon.svg         — SVG favicon
.gitignore
.env.example
README.md
```

---

## Хранение данных

Все данные хранятся в `localStorage` браузера пользователя:

| Ключ | Содержимое |
|---|---|
| `spectre_investigations` | Список расследований |
| `spectre_graph` | Граф связей |
| `spectre_exif_history` | История EXIF-анализов |
| `spectre_domain_history` | История domain lookups |
| `spectre_gemini_key` | Gemini API ключ пользователя |
| `spectre_author` | Имя аналитика |

Данные не покидают браузер. Очистить: DevTools → Application → Local Storage.

---

## Ограничения

- **CORS:** RDAP-запросы с GitHub Pages могут блокироваться браузером. DNS-запросы работают через Cloudflare DoH (поддерживает CORS).
- **EXIF:** Полноценно извлекается только из JPEG/TIFF. PNG, WebP, HEIC — только базовые сведения о файле.
- **AI:** Требует Gemini API ключ. Ключ хранится только на устройстве пользователя.
- **Без сервера:** Нет серверной части, нет базы данных, нет авторизации.

---

## Лицензия

MIT — используй свободно, не удаляй упоминание SPECTRE.
