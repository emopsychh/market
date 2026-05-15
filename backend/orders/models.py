from decimal import Decimal
from django.db import models
from django.conf import settings

from products.models import Product


class Cart(models.Model):
    """Shopping cart."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
        verbose_name='Пользователь'
    )
    created_at = models.DateTimeField('Создана', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлена', auto_now=True)

    class Meta:
        verbose_name = 'Корзина'
        verbose_name_plural = 'Корзины'

    def __str__(self):
        return f'Корзина {self.user.email}'

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())


class CartItem(models.Model):
    """Cart item."""

    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Корзина'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='cart_items',
        verbose_name='Товар'
    )
    size = models.CharField('Размер', max_length=20, blank=True, default='')
    color = models.CharField('Цвет', max_length=50, blank=True, default='')
    quantity = models.PositiveIntegerField('Количество', default=1)
    created_at = models.DateTimeField('Добавлено', auto_now_add=True)

    class Meta:
        verbose_name = 'Позиция корзины'
        verbose_name_plural = 'Позиции корзины'
        unique_together = ['cart', 'product', 'size', 'color']

    def __str__(self):
        return f'{self.product.name} ({self.size}, {self.color})'

    @property
    def subtotal(self):
        return self.product.price * self.quantity


class Order(models.Model):
    """Order."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидает обработки'
        CONFIRMED = 'confirmed', 'Подтверждён'
        SHIPPED = 'shipped', 'Отправлен'
        DELIVERED = 'delivered', 'Доставлен'
        CANCELLED = 'cancelled', 'Отменён'

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name='Покупатель'
    )
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    # Delivery address (stored at order time)
    delivery_city = models.CharField('Город', max_length=100)
    delivery_street = models.CharField('Улица', max_length=200)
    delivery_building = models.CharField('Дом', max_length=20)
    delivery_apartment = models.CharField('Квартира', max_length=20, blank=True)
    delivery_postal_code = models.CharField('Индекс', max_length=10, blank=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлён', auto_now=True)

    class Meta:
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ['-created_at']

    def __str__(self):
        return f'Заказ #{self.id} от {self.buyer.email}'

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())


class OrderItem(models.Model):
    """Order item."""

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Заказ'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
        verbose_name='Товар',
        help_text='Может быть пустым после удаления карточки товара; в заказе сохраняются название и цена.',
    )
    product_name = models.CharField('Название', max_length=200)
    product_price = models.DecimalField(
        'Цена на момент заказа',
        max_digits=10,
        decimal_places=2
    )
    size = models.CharField('Размер', max_length=20, blank=True, default='')
    color = models.CharField('Цвет', max_length=50, blank=True, default='')
    quantity = models.PositiveIntegerField('Количество')
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='sold_orders',
        verbose_name='Продавец'
    )

    class Meta:
        verbose_name = 'Позиция заказа'
        verbose_name_plural = 'Позиции заказа'

    def __str__(self):
        return f'{self.product_name} x {self.quantity}'

    @property
    def subtotal(self):
        return self.product_price * self.quantity
