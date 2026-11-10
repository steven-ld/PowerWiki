# Документация PowerWiki

<div align="center">

<img src="../assets/powerwiki-logo.svg" alt="PowerWiki" width="360" />
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js->=14-339933?style=for-the-badge&logo=node.js&logoColor=white)

Современная Git-based вики-система с поддержкой Markdown, автоматической синхронизацией, подсветкой синтаксиса и интерфейсом в стиле Feishu.

**🔗 Онлайн-демо: [https://powerwiki.ga666666.cn](https://powerwiki.ga666666.cn)**

[English](README.md) • [中文](README_ZH.md) • [日本語](docs/README_JA.md) • [한국어](docs/README_KO.md) • [Español](docs/README_ES.md) • [Français](docs/README_FR.md) • [Deutsch](docs/README_DE.md) • [Русский](README_RU.md)

</div>

---

## Выбор языка

Документация на других языках：

- [English](README.md)
- [中文](README_ZH.md)
- [日本語](README_JA.md)
- [한국어](README_KO.md)
- [Español](README_ES.md)
- [Français](README_FR.md)
- [Deutsch](README_DE.md)
- [Русский](README_RU.md)

## Функции

- **Автоматическая синхронизация** - Автоматическое получение и обновление документов из Git-репозиториев
- **Подсветка синтаксиса** - Подсветка синтаксиса для нескольких языков программирования
- **Адаптивный дизайн** - Идеально адаптирован под любые размеры экрана
- **Автооглавление** - Автоматическая генерация оглавления
- **Современный интерфейс** - Чистый и интуитивный дизайн интерфейса
- **Поддержка PDF** - Рендеринг PDF-файлов в высоком качестве
- **Статистика просмотров** - Автоматическая статистика просмотров статей
- **Легковесность** - Не требуется база данных
- **SEO оптимизация** - Видимость в поисковых системах полностью оптимизирована
- **Поддержка Frontmatter** - Парсинг YAML-метаданных
- **Локальные изображения** - Поддержка локальных изображений в Markdown
- **HTML-статьи** - HTML-файлы репозитория как статьи, с режимом песочницы для полноценных интерактивных страниц
- **Многоязычность** - Поддержка русского и английского языков
- **Поддержка Docker** - Полная поддержка Docker-развёртывания

## Быстрый старт

### Предварительные требования

- Node.js >= 14.0.0
- Git

### Использование Docker (Рекомендуется)

```bash
# Клонировать репозиторий
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Создать файл конфигурации
cp config.example.json config.json
# Редактировать config.json с URL вашего Git-репозитория

# Запустить с Docker Compose
docker-compose up -d
```

### Использование Node.js

```bash
# Клонировать репозиторий
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Установить зависимости
npm install

# Создать файл конфигурации
cp config.example.json config.json
# Редактировать config.json с URL вашего Git-репозитория

# Запустить сервер
npm start```

Откройте в браузере `http://localhost:3150`.

## Конфигурация

Редактировать `config.json`：

```json
{
  "gitRepo": "https://github.com/your-username/your-wiki-repo.git",
  "repoBranch": "main",
  "port": 3150,
  "siteTitle": "My Wiki",
  "siteDescription": "Knowledge Base",
  "autoSyncInterval": 180000,
  "html": {
    "enabled": true,
    "sanitize": true
  },
  "pages": {
    "home": "README.md",
    "about": "ABOUT.md",
    "notFound": "404.html"
  }
}
```

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `gitRepo` | URL Git-репозитория | - |
| `repoBranch` | Имя ветки | `main` |
| `mdPath` | Подкаталог Markdown-файлов | `""` |
| `port` | Порт сервера | `3150` |
| `siteTitle` | Заголовок сайта | `PowerWiki` |
| `siteDescription` | Описание сайта | `Wiki` |
| `autoSyncInterval` | Интервал авто-синхронизации (мс) | `180000` |
| `sortOrder` | Порядок сортировки (`modified` или `name`) | `modified` |
| `pages.home` | Файл главной страницы | `""` |
| `pages.about` | Файл страницы О нас | `""` |
| `pages.notFound` | Собственная страница 404 (`.html` или `.md`) | встроенная страница |
| `html.enabled` | Включать HTML-файлы как статьи | `true` |
| `html.sanitize` | Очищать тело статьи по белому списку | `true` |

## Docker-развёртывание

### Docker-образ

**[@sayunchuan](https://github.com/sayunchuan)** предоставляет Docker-образ для PowerWiki.

- **Образ**: `sayunchuan/powerwiki`
- **Docker Hub**: [sayunchuan/powerwiki](https://hub.docker.com/r/sayunchuan/powerwiki)
- **Теги**: `latest`, `1.4.5`, `20260207`

### Быстрый старт

```bash
# Самый простой способ
docker run -d -p 3150:3150 sayunchuan/powerwiki

# С пользовательской конфигурацией
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v powerwiki_data:/app/data \
  -v powerwiki_cache:/app/cache \
  sayunchuan/powerwiki
```

### Развёртывание с Docker Compose

```yaml
version: '3.8'
services:
  powerwiki:
    image: sayunchuan/powerwiki:latest
    ports:
      - "3150:3150"
    environment:
      - NODE_ENV=production
      - LANG=ru
    volumes:
      - ./config.json:/app/config.json:ro
      - powerwiki_data:/app/data
      - powerwiki_cache:/app/cache
    restart: unless-stopped

volumes:
  powerwiki_data:
  powerwiki_cache:
```

```bash
# Запустить сервисы
docker-compose up -d

# Просмотреть логи
docker-compose logs -f

# Остановить сервисы
docker-compose down
```

**Благодарность**: Спасибо [@sayunchuan](https://github.com/sayunchuan) за предоставление Docker-образа, что делает развёртывание PowerWiki более удобным.

## Организация статей

PowerWiki поддерживает иерархическую структуру папок для организации статей：

```
your-wiki-repo/
├── README.md              # Главная страница
├── ABOUT.md               # Страница О нас
├── images/                # Глобальные изображения (опционально)
├── Architecture/          # Папка категории
│   ├── images/            # Изображения категории
│   ├── IoT-Device-Standards.md
│   ├── TLS-Encryption.md
│   └── README.md          # Индекс категории
└── Projects/              # Другая категория
    ├── images/
    ├── URL-Shortener.md
    └── README.md
```

### Frontmatter статьи

Каждая статья может содержать метаданные YAML frontmatter：

```yaml
---
title: Заголовок статьи
description: Описание статьи для SEO
author: Имя автора
date: 2026-01-10
updated: 2026-01-10
keywords: ключевое слово1, ключевое слово2, ключевое слово3
tags: [тег1, тег2]
---
```

## HTML-статьи

HTML-файлы обрабатываются как статьи Markdown: они появляются в боковой панели, отдаются по `/post/<путь в репозитории>` и используют тот же режим чтения (оглавление, копирование, исходный вид, ссылка для общего доступа и SEO). Старые адреса вроде `/docs/page` или `/docs/page.html` перенаправляются с 301 на `/post/docs/page.html`. Рендерится только `<body>`; `<title>` и `<meta name="description|keywords">` дают метаданные статьи. `pages.home` тоже может указывать на `.html`-файл.

![HTML-файл отображается как статья PowerWiki с оглавлением и инструментами чтения](../assets/screenshots/html-article-plain.jpg)

Тело по умолчанию очищается: удаляются `<script>`, `<style>`, `<iframe>`, формы, встроенные обработчики событий и атрибуты `style`, отбрасываются URL `javascript:`. Относительные адреса переписываются на сервере: изображения — на `/api/image/...`, ссылки на другие HTML/Markdown/PDF — на `/post/...`, остальные ресурсы разрешаются относительно каталога страницы. `html.sanitize: false` — только для полностью доверенного контента.

### Полные HTML-страницы (режим песочницы)

Интерактивные страницы включают песочницу в `<head>`:

```html
<meta name="powerwiki-render" content="sandbox">
```

Тогда тело не очищается, а встраивается в `iframe`: разрешены скрипты, формы, всплывающие окна, загрузки и переходы верхнего уровня по действию пользователя, но не `allow-same-origin`. Страница работает в непрозрачном источнике и не может читать cookie, localStorage или same-origin API Wiki. Оригинал также доступен по `/full/<путь в репозитории>` с `Content-Security-Policy: sandbox ...`; этот маршрут отдаёт только HTML и статические ресурсы и отклоняет traversal, скрытые сегменты пути, симлинки и файлы больше 50 МБ.

![Интерактивный HTML-дашборд открыт в режиме иммерсивного чтения PowerWiki](../assets/screenshots/html-article.jpg)

### Иммерсивное чтение

Страницы песочницы и HTML-главная открываются сразу в иммерсивном режиме: область чтения занимает весь экран, `Esc` или кнопка в правом верхнем углу возвращают обычный вид, а `iframe` не перезагружается. Сервер отдаёт иммерсивное состояние с первого кадра, поэтому при загрузке нет скачка ширины. Высота следует за переданным содержимым (240–20000px), так что вне иммерсивного режима не появляется вторая полоса прокрутки. Обычные HTML-статьи без песочницы не имеют `iframe`, прокручиваются как обычная страница, а их кнопка **Во весь экран** открывает `/full/...` в новой вкладке.

Оболочка статьи отправляет страницам песочницы `{ type: 'powerwiki:context', version: 1, theme, lang }` при загрузке и при смене темы; страница может запросить его через `parent.postMessage({ type: 'powerwiki:request-context' }, '*')`.

## Технологический стек

- **Бэкенд**: Express.js
- **Фронтенд**: Vanilla JavaScript
- **Git**: simple-git
- **Markdown**: marked + highlight.js
- **PDF**: pdfjs-dist
- **Контейнеризация**: Docker

## Структура проекта

```
PowerWiki/
├── src/                     # Исходный код
│   ├── index.js             # Входная точка сервера Express
│   ├── routes/              # Модули маршрутов
│   │   ├── api.js           # API маршруты
│   │   ├── feeds.js         # RSS/Sitemap маршруты
│   │   └── static.js        # Маршруты статических файлов
│   ├── config/              # Модули конфигурации
│   │   ├── env.js           # Переменные окружения
│   │   └── i18n.js          # Интернационализация
│   └── utils/               # Утилитарные модули
│       ├── cacheManager.js  # Управление кэшем
│       ├── gitManager.js    # Git операции
│       └── markdownParser.js# Markdown парсер
├── locales/                 # Файлы переводов
├── templates/               # HTML шаблоны
├── public/                  # Статические файлы
│   ├── index.html          # HTML фронтенда
│   ├── app.js             # Главная точка входа (модульная)
│   ├── js/                # JavaScript модули
│   │   ├── theme.js       # Управление темами
│   │   ├── i18n.js        # Интернационализация
│   │   ├── cache.js       # Клиентское кэширование
│   │   ├── utils.js       # Утилиты
│   │   ├── posts.js       # Список статей и дерево
│   │   ├── article.js     # Рендеринг статей
│   │   ├── toc.js         # Генерация оглавления
│   │   └── media.js       # Копирование кода, просмотр изображений, PDF
│   └── css/               # CSS модули
│       ├── base.css       # Базовые стили и переменные
│       ├── layout.css     # Макет
│       ├── sidebar.css    # Навигационное меню
│       ├── article.css    # Статьи и Markdown
│       ├── toc.css        # Правая панель оглавления
│       ├── media.css      # Адаптивный дизайн
│       └── components.css # UI компоненты
├── config.example.json      # Шаблон конфигурации
└── package.json             # Зависимости
```

## Лицензия

MIT License - см. [LICENSE](LICENSE) для подробностей.

## Вклад

- [@sayunchuan](https://github.com/sayunchuan) - Добавлена многоязычная поддержка, Mermaid, исправлены различные проблемы

---

<div align="center">

**Если этот проект вам помог, поставьте ⭐ Звезду!**

</div>
