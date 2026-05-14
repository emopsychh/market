from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


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
    bio = models.TextField('О себе', blank=True, default='')

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


class SellerApplication(models.Model):
    """Заявка на статус продавца с данными для модерации."""

    class SellerType(models.TextChoices):
        INDIVIDUAL = 'individual', 'Физическое лицо'
        SELF_EMPLOYED = 'self_employed', 'Самозанятый'
        IE = 'ie', 'ИП'
        LLC = 'llc', 'Юридическое лицо'

    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Подана'
        APPROVED = 'approved', 'Одобрена'
        REJECTED = 'rejected', 'Отклонена'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='seller_applications',
        verbose_name='Пользователь',
    )
    seller_type = models.CharField(
        'Тип продавца',
        max_length=20,
        choices=SellerType.choices,
    )
    display_name = models.CharField('Название магазина (публичное)', max_length=120)
    full_name = models.CharField('ФИО контактного лица', max_length=200)
    phone = models.CharField('Телефон для связи', max_length=20)
    city = models.CharField('Город', max_length=100)
    country = models.CharField('Страна', max_length=100, default='Россия')
    description = models.TextField('Описание деятельности')
    terms_accepted = models.BooleanField('Согласие с правилами площадки', default=False)
    terms_accepted_at = models.DateTimeField('Время принятия правил', null=True, blank=True)
    status = models.CharField(
        'Статус заявки',
        max_length=20,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )
    moderation_comment = models.CharField('Комментарий модератора', max_length=500, blank=True)
    reviewed_at = models.DateTimeField('Рассмотрена', null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_seller_applications',
        verbose_name='Кто рассмотрел',
    )
    created_at = models.DateTimeField('Создана', auto_now_add=True)

    class Meta:
        verbose_name = 'Заявка продавца'
        verbose_name_plural = 'Заявки продавцов'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.display_name} ({self.user.email}) — {self.get_status_display()}'

    def mark_terms_accepted(self):
        if self.terms_accepted and not self.terms_accepted_at:
            self.terms_accepted_at = timezone.now()
