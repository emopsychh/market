from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with roles."""

    class Role(models.TextChoices):
        BUYER = 'buyer', 'Покупатель'
        SELLER = 'seller', 'Продавец'
        ADMIN = 'admin', 'Администратор'

    class SellerStatus(models.TextChoices):
        NOT_REQUESTED = 'not_requested', 'Не запрошено'
        PENDING = 'pending', 'На рассмотрении'
        APPROVED = 'approved', 'Подтвержден'
        REJECTED = 'rejected', 'Отклонен'

    email = models.EmailField('Email', unique=True)
    role = models.CharField(
        'Роль',
        max_length=10,
        choices=Role.choices,
        default=Role.BUYER
    )
    phone = models.CharField('Телефон', max_length=20, blank=True)
    seller_status = models.CharField(
        'Статус продавца',
        max_length=20,
        choices=SellerStatus.choices,
        default=SellerStatus.NOT_REQUESTED,
    )
    seller_rejection_reason = models.CharField('Причина отклонения продавца', max_length=255, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return self.email

    @property
    def is_seller(self):
        return self.is_admin or (
            self.role == self.Role.SELLER and self.seller_status == self.SellerStatus.APPROVED
        )

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN


class DeliveryAddress(models.Model):
    """Delivery address for user orders."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='addresses',
        verbose_name='Пользователь'
    )
    city = models.CharField('Город', max_length=100)
    street = models.CharField('Улица', max_length=200)
    building = models.CharField('Дом', max_length=20)
    apartment = models.CharField('Квартира', max_length=20, blank=True)
    postal_code = models.CharField('Индекс', max_length=10, blank=True)
    is_default = models.BooleanField('По умолчанию', default=False)

    class Meta:
        verbose_name = 'Адрес доставки'
        verbose_name_plural = 'Адреса доставки'

    def __str__(self):
        return f'{self.city}, {self.street}, {self.building}'
