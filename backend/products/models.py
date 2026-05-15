from django.db import models
from django.conf import settings


class Brand(models.Model):
    """Бренд товара — управляется в админке."""

    name = models.CharField('Название', max_length=100)
    slug = models.SlugField('Slug', max_length=100, unique=True)
    logo = models.ImageField('Логотип', upload_to='brands/%Y/%m/', blank=True, null=True)
    order = models.PositiveIntegerField('Порядок', default=0)
    is_active = models.BooleanField('Активен', default=True, help_text='Скрытые бренды не показываются в навигации')

    class Meta:
        verbose_name = 'Бренд'
        verbose_name_plural = 'Бренды'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Category(models.Model):
    """Product category (e.g. Women, Men, Kids, Accessories)."""

    name = models.CharField('Название', max_length=100)
    slug = models.CharField(
        'Slug (для URL, можно кириллица)',
        max_length=100,
        unique=True,
        help_text='Например: женщины, мужчины, аксессуары'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Родительская категория'
    )
    order = models.PositiveIntegerField('Порядок', default=0)

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """Clothing product."""

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Активен'
        MODERATION = 'moderation', 'На модерации'
        INACTIVE = 'inactive', 'Неактивен'

    class PublicationStatus(models.TextChoices):
        DRAFT = 'draft', 'Черновик'
        PENDING_REVIEW = 'pending_review', 'На модерации'
        PUBLISHED = 'published', 'Опубликован'
        REJECTED = 'rejected', 'Отклонен'

    class Gender(models.TextChoices):
        MALE = 'male', 'Мужской'
        FEMALE = 'female', 'Женский'
        UNISEX = 'unisex', 'Унисекс'

    name = models.CharField('Название', max_length=200)
    description = models.TextField('Описание', blank=True)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        'Цена до скидки',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Если указана и выше текущей цены, в каталоге показывается зачёркнутая «старая» цена и скидка.',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name='Категория'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name='Продавец'
    )
    sizes = models.JSONField(
        'Размеры',
        default=list,
        help_text='Список размеров, например: ["S", "M", "L", "XL"]'
    )
    colors = models.JSONField(
        'Цвета',
        default=list,
        help_text='Список цветов, например: ["Чёрный", "Белый"]'
    )
    gender = models.CharField(
        'Пол',
        max_length=10,
        choices=Gender.choices,
        default=Gender.MALE,
        help_text='Для выдачи в категориях «Мужчинам» / «Женщинам» (slug в GENDER_CATEGORY_SLUGS)',
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Бренд',
    )
    listing_categories = models.ManyToManyField(
        Category,
        related_name='listed_products',
        blank=True,
        verbose_name='Категории для каталога',
        help_text='Заполняется автоматически: выбранная категория + корень по полу',
    )
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    publication_status = models.CharField(
        'Статус публикации',
        max_length=20,
        choices=PublicationStatus.choices,
        default=PublicationStatus.DRAFT,
    )
    moderation_note = models.CharField('Комментарий модерации', max_length=255, blank=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлён', auto_now=True)

    class Meta:
        verbose_name = 'Товар'
        verbose_name_plural = 'Товары'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def sync_listing_categories(self):
        """Связать выдачу с выбранной категорией и корнем по полу."""
        from .constants import get_gender_root_category

        ids = {self.category_id}
        root = get_gender_root_category(self.gender)
        if root:
            ids.add(root.id)

        # Унисекс должен отображаться и в разделе "Женщинам".
        if self.gender == self.Gender.UNISEX:
            female_root = get_gender_root_category(self.Gender.FEMALE)
            if female_root:
                ids.add(female_root.id)

        self.listing_categories.set(ids)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Важно: синхронизация M2M после save() обязательна для актуальной выдачи в каталоге.
        # Любые изменения порядка/условий вызова могут менять видимость товара по разделам.
        self.sync_listing_categories()


class ProductImage(models.Model):
    """Product image."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='Товар'
    )
    image = models.ImageField('Изображение', upload_to='products/%Y/%m/')
    order = models.PositiveIntegerField('Порядок', default=0)
    created_at = models.DateTimeField('Создано', auto_now_add=True)

    class Meta:
        verbose_name = 'Изображение товара'
        verbose_name_plural = 'Изображения товаров'
        ordering = ['order']


class WishlistItem(models.Model):
    """User wishlist item."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlist_items',
        verbose_name='Пользователь',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlist_items',
        verbose_name='Товар',
    )
    created_at = models.DateTimeField('Добавлен', auto_now_add=True)

    class Meta:
        verbose_name = 'Избранное'
        verbose_name_plural = 'Избранное'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='uniq_user_product_wishlist')
        ]
