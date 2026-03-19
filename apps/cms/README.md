# CMS Bootstrap

Этот каталог зарезервирован под Strapi CMS для "Новый Мир".

## Планируемые сущности

- products
- services
- orders
- pickup-points
- producers
- pages
- news
- documents
- returns
- stock-movements

## Рекомендуемая следующая команда

После поднятия PostgreSQL и подтверждения параметров БД можно выполнить локальную инициализацию Strapi в этом каталоге.

Пример направления:

`npx create-strapi@latest`

## Что важно заложить сразу

- локализацию RU / UKR / ENG;
- rich-content редактор для страниц и новостей;
- media library для фото и видео;
- роли: member, seller, organizer, admin;
- аудит изменений для складских операций и возвратов.

## Вкладка Home в админ-панели (Strapi target)

Для полной CMS-реализации главной страницы рекомендуется Single Type `home-page` с локализацией.

Поля:

- `heroTitle` (string)
- `heroText` (text)
- `heroImage` (media)
- `primaryAction` (string)
- `secondaryAction` (string)
- `featureTitle` (string)
- `featureItems` (repeatable component: title, text, icon)
- `processTitle` (string)
- `processItems` (repeatable component: title, text, icon)
- `storyLeft` (component: title, text, image)
- `storyRight` (component: title, text, image)
- `teamSection` (component: title, text, image)

Фронтенд уже использует эквивалентную структуру данных на странице Home, поэтому после инициализации Strapi можно напрямую подключить API без переработки UI.
