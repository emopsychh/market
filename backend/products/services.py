from django.db.models import Q

from .models import Category, Product


def collect_category_descendant_ids(category_id: int) -> set[int]:
    """Сама категория и все вложенные подкатегории (для «Футболки» и т.п.)."""
    ids = {category_id}
    frontier = [category_id]
    while frontier:
        children = list(
            Category.objects.filter(parent_id__in=frontier).values_list('id', flat=True),
        )
        new = [cid for cid in children if cid not in ids]
        if not new:
            break
        ids.update(new)
        frontier = new
    return ids


def apply_category_filter(queryset, raw_category):
    if not raw_category:
        return queryset
    try:
        category_id = int(raw_category)
    except ValueError:
        return queryset.none()
    category_ids = collect_category_descendant_ids(category_id)
    return queryset.filter(
        Q(category_id__in=category_ids) | Q(listing_categories__id__in=category_ids),
    ).distinct()


def get_active_product(product_id):
    try:
        return Product.objects.get(
            pk=product_id,
            status=Product.Status.ACTIVE,
            publication_status=Product.PublicationStatus.PUBLISHED,
        )
    except Product.DoesNotExist:
        return None
