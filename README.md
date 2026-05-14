# Маркетплейс одежды

Фронтенд на React и бэкенд на Django (REST API). Покупатели смотрят каталог, корзину и заказы; продавцы ведут товары; админ — пользователей и категории.

## Состав

| Часть | Содержание |
|-------|------------|
| `frontend/` | Сайт: каталог, карточка товара, корзина, заказы, профиль, избранное |
| `backend/` | Django + DRF: JWT, товары, корзина, заказы, избранное |

## Роли

| Роль | Доступ |
|------|--------|
| Покупатель | Каталог, фильтры, поиск, корзина, заказ, профиль, избранное |
| Продавец | Свои товары (CRUD, фото), заказы по своим позициям |
| Админ | Пользователи, категории, модерация товаров |

## Данные (схематично)

```
User — роль, адреса доставки
Category
Product — категория, продавец, цена, размеры, цвета, фото, статус
Cart / CartItem — пользователь, товар, размер, цвет, количество
Order — покупатель, статус, адрес доставки
OrderItem — заказ, товар, цена и название на момент заказа, продавец позиции
WishlistItem — пользователь, товар
```

## Дорожная карта маркетплейса

Список невыполненных и приоритетных направлений (оплата, подзаказы по продавцам, витрина продавца и т.д.) лежит в **[`MARKETPLACE_ROADMAP.md`](./MARKETPLACE_ROADMAP.md)** — его можно вести галочками, чтобы ничего не потерять во время работы над дизайном.

## Что есть в коде

- Регистрация и вход (JWT)
- Категории (CRUD у админа)
- Товары у продавца: создание, редактирование, удаление, загрузка изображений
- Каталог: фильтры, поиск
- Корзина и оформление заказа (оплата не подключена)
- История заказов, смена статуса продавцом
- Профиль и адреса доставки
- Избранное (список, добавление, удаление)

## API (кратко)

Корень: `http://127.0.0.1:8000/api/`. Описание схемы: `/api/schema/swagger-ui/` и `/api/schema/redoc/`.

**Авторизация**

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

**Категории**

```
GET    /api/categories/
GET    /api/categories/<id>/
POST   /api/categories/
PUT    /api/categories/<id>/
DELETE /api/categories/<id>/
```

**Товары**

```
GET    /api/products/                    список, query: category, size, color, min_price, max_price, search
GET    /api/products/<id>/
POST   /api/products/create/
GET    /api/products/mine/               товары продавца
PUT    /api/products/<id>/manage/
DELETE /api/products/<id>/manage/
POST   /api/products/<id>/images/
```

**Избранное**

```
GET    /api/products/wishlist/
POST   /api/products/wishlist/           тело: { "product": <id> }
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
GET /api/orders/
GET /api/orders/<id>/
POST /api/orders/create/
PUT /api/orders/<id>/status/
```

## Экраны фронтенда

Главная, каталог с фильтрами, карточка товара, корзина, оформление заказа, профиль (заказы, данные, адреса, избранное), раздел продавца (товары, заказы), админские разделы по ролям.

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
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/`. Админка: `http://127.0.0.1:8000/admin/`.

Админка использует тему Django Unfold (устанавливается из `requirements.txt`).

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

## Одежда в модели

Размер и цвет хранятся в позиции корзины и заказа. У товара — списки допустимых размеров и цветов и набор изображений.

## Лицензия

Учебный проект. Коммерческое использование запрещено.
