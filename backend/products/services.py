from django.db.models import Q

from .models import Product


def apply_category_filter(queryset, raw_category):
    if not raw_category:
        return queryset
    try:
        category_id = int(raw_category)
    except ValueError:
        return queryset.none()
    return queryset.filter(Q(category_id=category_id) | Q(listing_categories__id=category_id)).distinct()


def get_active_product(product_id):
    try:
        return Product.objects.get(
            pk=product_id,
            status=Product.Status.ACTIVE,
            publication_status=Product.PublicationStatus.PUBLISHED,
        )
    except Product.DoesNotExist:
        return None
