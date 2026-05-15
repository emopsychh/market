"""Вспомогательные функции для публичных профилей продавцов."""

from .models import SellerApplication, User


def get_seller_storefront_name(user: User) -> str:
    """Публичное имя витрины: название из заявки или ФИО / username."""
    app = (
        user.seller_applications.filter(status=SellerApplication.Status.APPROVED)
        .order_by('-reviewed_at', '-created_at')
        .first()
    )
    if app and app.display_name.strip():
        return app.display_name.strip()
    full = (user.get_full_name() or '').strip()
    if full:
        return full
    if user.username:
        return user.username
    return f'Продавец #{user.pk}'


def is_public_seller_profile(user: User) -> bool:
    if user.role == User.Role.ADMIN:
        return True
    return user.role == User.Role.SELLER and user.seller_status == User.SellerStatus.APPROVED


def get_seller_rating_avg(user: User):
    return None


def get_seller_sold_units(user: User) -> int:
    from django.db.models import Sum
    from orders.models import Order, OrderItem

    total = OrderItem.objects.filter(
        seller=user,
        order__status__in=[
            Order.Status.CONFIRMED,
            Order.Status.SHIPPED,
            Order.Status.DELIVERED,
        ],
    ).aggregate(s=Sum('quantity'))['s']
    return int(total or 0)


def get_seller_showcase_count(user: User) -> int:
    from products.models import Product

    return Product.objects.filter(
        seller=user,
        status=Product.Status.ACTIVE,
        publication_status=Product.PublicationStatus.PUBLISHED,
    ).count()
