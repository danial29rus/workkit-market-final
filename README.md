# WorkKit Market — deploy-ready MVP

Готовый монорепозиторий: React/Vite + FastAPI + PostgreSQL + Alembic + Caddy.

## Что поднимается одной командой

```bash
docker compose up -d --build
```

Compose запускает:

- `db` — PostgreSQL 17 с постоянным volume `postgres_data`;
- `backend` — FastAPI, автоматически выполняет `alembic upgrade head` и безопасный initial seed;
- `frontend` — production build React, который отдаёт nginx;
- `caddy` — единая точка входа, reverse proxy и автоматический HTTPS для реального домена.

Frontend всегда обращается к `/api`, поэтому при смене IP или домена его пересобирать с новым URL не требуется.

## Первый запуск локально

В корне уже лежит `.env` с локальными значениями, поэтому достаточно:

```bash
docker compose up -d --build
```

Открыть:

- сайт: `http://localhost`
- Swagger: `http://localhost/docs`
- админка: `http://localhost/admin`
- вход/регистрация: `http://localhost/login`

Посмотреть контейнеры:

```bash
docker compose ps
```

Логи:

```bash
./scripts/logs.sh
```

или:

```bash
docker compose logs -f --tail=200
```

## Развёртывание на сервере с доменом

1. Распакуйте папку на сервер, например `/opt/workkit-market`.
2. Направьте A/AAAA DNS-запись домена на IP сервера.
3. Откройте входящие TCP `80` и `443` (для HTTP/HTTPS), при желании UDP `443` для HTTP/3.
4. Отредактируйте корневой `.env`.

Пример:

```env
SITE_ADDRESS=shop.example.ru
FRONTEND_ORIGIN=https://shop.example.ru
ACME_EMAIL=admin@example.ru

POSTGRES_DB=workkit
POSTGRES_USER=workkit
POSTGRES_PASSWORD=CHANGE_TO_RANDOM_HEX

ADMIN_TOKEN=CHANGE_TO_LONG_RANDOM_TOKEN
JWT_SECRET=CHANGE_TO_LONG_RANDOM_SECRET
ACCESS_TOKEN_MINUTES=720
APP_NAME="WorkKit Studio API"
```

Безопасные значения можно получить так:

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # ADMIN_TOKEN
openssl rand -hex 48   # JWT_SECRET
```

После этого единственная команда запуска:

```bash
docker compose up -d --build
```

При `SITE_ADDRESS=shop.example.ru` Caddy сам запросит и будет обновлять TLS-сертификат. Если DNS ещё не настроен, оставьте `SITE_ADDRESS=http://localhost` для локальной проверки.

## Данные и перезапуски

PostgreSQL хранится в named volume. Эти команды безопасны для данных:

```bash
docker compose restart
docker compose down
docker compose up -d
```

**Не выполняйте `docker compose down -v`, если хотите сохранить базу:** `-v` удалит volume PostgreSQL.

Alembic автоматически применяется перед стартом API. Seed тоже запускается автоматически, но только добавляет отсутствующие первоначальные карточки. Изменения, сделанные через админку, и созданные вручную товары при рестарте не перезаписываются.

## Предзаполнено

После первого старта автоматически появляются категории и несколько услуг с разными пакетами и ценами, включая суммы с копейками. Настройки бренда и юридические данные редактируются через `/admin`.

В админке можно:

- смотреть сводку и заказы;
- искать заказы;
- менять статус заказа;
- создавать и редактировать предложения;
- менять цену, старую цену и тип исполнения;
- скрывать/показывать карточки;
- переключать формат сайта (`services`, digital products, subscription-oriented wording);
- менять бренд, hero, CTA, контакты и реквизиты продавца.

Для входа в `/admin` используется значение `ADMIN_TOKEN` из `.env`.

## Платёжная интеграция

Сейчас настоящие реквизиты банковской карты сайт не принимает. Payment endpoint оставлен как адаптер-заглушка до выбора агрегатора. Когда провайдер будет выбран, схема рассчитана на hosted checkout/redirect и webhook — фронт и каталог переделывать не потребуется.

## Backup

Сделать дамп PostgreSQL:

```bash
./scripts/backup.sh
```

Файл появится в `./backups/`.

Восстановить дамп:

```bash
./scripts/restore.sh backups/workkit-YYYYMMDD-HHMMSS.dump
```

Перед restore рекомендуется сделать свежий backup.

## Обновление кода на сервере

После замены файлов:

```bash
docker compose up -d --build
```

Compose пересоберёт изменившиеся сервисы; backend перед запуском сам применит новые Alembic migrations. PostgreSQL volume останется прежним.

## Полезные команды

```bash
# Состояние
docker compose ps

# Все логи
docker compose logs -f --tail=200

# Только backend
docker compose logs -f backend

# Перезапуск backend
docker compose restart backend

# Выполнить Alembic вручную
docker compose exec backend alembic current

docker compose exec backend alembic upgrade head

# Открыть psql
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## Структура

```text
.
├── .env
├── .env.example
├── Caddyfile
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── alembic/
│   └── app/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
└── scripts/
    ├── backup.sh
    ├── restore.sh
    └── logs.sh
```

## Перед публичным запуском

Обязательно замените в `.env` `POSTGRES_PASSWORD`, `ADMIN_TOKEN`, `JWT_SECRET`, домен и ACME email. В `/admin` заполните реальные контакты и реквизиты продавца и проверьте финальный текст оферты/политики под фактическую модель работы.
