# Маркетплейс одежды

Фронтенд на React и бэкенд на Django (REST API). Покупатели смотрят каталог с витринами «Для него» / «Для неё», корзину и заказы; продавцы ведут товары и публичную витрину; админ — пользователей, бренды, категории и модерацию.

## Состав

| Часть | Содержание |
|-------|------------|
| `frontend/` | Сайт: главная, каталог, мега-меню, карточка товара, корзина, профиль, избранное, страница продавца |
| `backend/` | Django + DRF: JWT, бренды, категории, товары, корзина, заказы, избранное |

## Роли

| Роль | Доступ |
|------|--------|
| Покупатель | Каталог (витрина по полу, фильтры, поиск), корзина, заказ, профиль, избранное, публичные страницы продавцов |
| Продавец | После одобрения заявки: свои товары (CRUD, фото), заказы по своим позициям, публичный профиль `/seller/:id` |
| Админ | Пользователи и заявки продавцов в Django admin, бренды, категории, модерация публикации товаров (`/moderate/`) |

## Данные (схематично)

```
User — роль, адреса доставки, заявка продавца (seller_status, витрина)
Brand — название, slug, логотип (справочник в админке)
Category — дерево (parent), порядок; корни «Для него» / «Для неё» для витрин
Product — категория, listing_categories, продавец, бренд, пол (gender),
          цена, compare_at_price, размеры, цвета, фото, status, publication_status
Cart / CartItem — пользователь, товар, размер, цвет, количество
Order — покупатель, статус, адрес доставки
OrderItem — заказ, product (nullable при удалении карточки), snapshot названия/цены, продавец позиции
WishlistItem — пользователь, товар
```

## Дорожная карта маркетплейса

Список невыполненных и приоритетных направлений (оплата, подзаказы по продавцам, отзывы и т.д.) — в **[`MARKETPLACE_ROADMAP.md`](./MARKETPLACE_ROADMAP.md)**.

## Что есть в коде

- Регистрация, вход и обновление JWT (`/auth/refresh/`)
- Справочник брендов (`GET /api/brands/`), управление в админке
- Дерево категорий, мега-меню в шапке, витрины «Для него» / «Для неё» (`shop_gender`)
- Команда `python manage.py seed_categories` — типовые подкатегории под корни витрин
- Товары у продавца: создание, редактирование, удаление, загрузка изображений; пол, бренд, скидочная цена
- Каталог: фильтры (категория, размер, цвет, цена, бренд, продавец), поиск, витрина по полу
- Модерация публикации (админ): `publication_status`, `PUT .../moderate/`
- Корзина и оформление заказа на странице корзины (оплата не подключена)
- История заказов; при удалении товара позиция заказа сохраняется (product → NULL, snapshot в OrderItem)
- Профиль: активность (заказы, избранное) и настройки (данные, адреса, смена пароля)
- Заявка на статус продавца (`/seller/apply`)
- Публичная страница продавца и API профиля
- Избранное (список, добавление, удаление)

## API (кратко)

Корень: `http://127.0.0.1:8000/api/`. Описание схемы: `/api/schema/swagger-ui/` и `/api/schema/redoc/`.

Пути с завершающим `/` (как в Django и во фронтенде).

**Авторизация и профиль**

```
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/refresh/
GET    /api/auth/me/
PATCH  /api/auth/me/
POST   /api/auth/password-change/
POST   /api/auth/seller-application/
GET    /api/auth/sellers/<id>/          публичный профиль продавца
GET    /api/auth/addresses/
POST   /api/auth/addresses/
PUT    /api/auth/addresses/<id>/
DELETE /api/auth/addresses/<id>/
```

**Бренды**

```
GET    /api/brands/                     активные бренды для навигации и форм
```

**Категории**

```
GET    /api/categories/                 query: parent, for_nav, shop_gender (male|female)
GET    /api/categories/<id>/
POST   /api/categories/                 продавец / админ
PUT    /api/categories/<id>/
DELETE /api/categories/<id>/
```

**Товары**

```
GET    /api/products/                   query: category, size, color, min_price, max_price,
                                        search, brand (slug), shop_gender (male|female), seller
GET    /api/products/<id>/
POST   /api/products/create/
GET    /api/products/mine/              товары текущего продавца
PUT    /api/products/<id>/manage/
DELETE /api/products/<id>/manage/
PUT    /api/products/<id>/moderate/     админ: публикация / отклонение
POST   /api/products/<id>/images/       multipart: image
```

**Избранное**

```
GET    /api/products/wishlist/
POST   /api/products/wishlist/          тело: { "product": <id> }
DELETE /api/products/wishlist/<product_id>/
```

**Корзина**

```
GET    /api/cart/
POST   /api/cart/items/
PUT    /api/cart/items/<id>/
DELETE /api/cart/items/<id>/
```

**Заказы**

```
GET    /api/orders/
GET    /api/orders/<id>/
POST   /api/orders/create/
PUT    /api/orders/<id>/status/         продавец / админ
```

## Экраны фронтенда

| Маршрут | Назначение |
|---------|------------|
| `/` | Главная, витрина по выбранному полу в шапке |
| `/products` | Каталог с фильтрами |
| `/products/:id` | Карточка товара |
| `/products/new`, `/products/:id/edit` | Создание и редактирование (продавец / админ) |
| `/cart` | Корзина и оформление заказа |
| `/profile` | Заказы, избранное, недавно просмотренные |
| `/profile/settings` | Данные, адреса, пароль |
| `/seller/apply` | Заявка продавца |
| `/seller/:sellerId` | Публичная витрина продавца |
| `/login`, `/register` | Вход и регистрация |

Модерация, бренды и пользователи — в **Django admin** (`/admin/`, тема Unfold). Отдельного админ-UI в React нет.

## Стек

| | |
|--|--|
| Backend | Python 3, Django, Django REST Framework |
| БД | PostgreSQL по переменным окружения `DB_*` |
| Фронтенд | React, Vite |
| Аутентификация | JWT (djangorestframework-simplejwt) |
| Медиа | Локальная папка `media/` (Pillow) |

## Запуск

**Бэкенд**

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Копия настроек: из `.env.example` в `.env` (обязательно задать `DB_NAME`; при необходимости `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`).

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_categories   # опционально: дерево категорий для мега-меню
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/`. Админка: `http://127.0.0.1:8000/admin/`.

Опционально для единого стиля backend-кода:

```bash
pip install -r requirements-dev.txt
ruff check .
black --check .
```

**Фронтенд**

```bash
cd frontend
npm install
npm run dev
```

Сайт: `http://localhost:3000`. Запросы `/api` и `/media` уходят на порт 8000 через настройку прокси в Vite.

## Товар и заказ

- **Размер и цвет** задаются в позиции корзины и заказа; у товара — списки допустимых значений и набор изображений.
- **Пол (`gender`)** и **бренд** влияют на выдачу: унисекс показывается в обеих витринах; бренд фильтруется по `slug`.
- **`compare_at_price`** — зачёркнутая «старая» цена и скидка в каталоге, если выше текущей цены.
- **`listing_categories`** синхронизируется при сохранении товара (категория + корень витрины по полу).
- В **OrderItem** при удалении карточки поле `product` обнуляется; название и цена остаются в snapshot.

## Лицензия

Учебный проект. Коммерческое использование запрещено.
