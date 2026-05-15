"""Корневые категории «Мужчинам» / «Женщинам»: сначала slug из settings, затем эвристика по названию."""

from django.conf import settings

DEFAULT_GENDER_CATEGORY_SLUGS = {
    'male': 'muzhchinam',
    'female': 'zhenshchinam',
}

GENDER_SLUG_ALTERNATES = {
    'male': ('muzhchinam', 'm', 'men', 'мужчинам'),
    'female': ('zhenshchinam', 'f', 'women', 'женщинам'),
}

GENDER_NAME_EXACT = {
    'male': ('Для него', 'Мужчинам', 'Men'),
    'female': ('Для неё', 'Для нее', 'Женщинам', 'Women'),
}

MALE_CATEGORY_LOOKUPS = (
    ('name__iexact', 'Для него'),
    ('slug__iexact', 'm'),
    ('name__icontains', 'мужчин'),
    ('slug__icontains', 'muzhchin'),
    ('slug__iexact', 'men'),
    ('name__iexact', 'Men'),
)

FEMALE_CATEGORY_LOOKUPS = (
    ('name__iexact', 'Для неё'),
    ('name__iexact', 'Для нее'),
    ('slug__iexact', 'f'),
    ('name__icontains', 'женщин'),
    ('slug__icontains', 'zhenshchin'),
    ('slug__iexact', 'women'),
    ('name__iexact', 'Women'),
)

FEMALE_TARGET_GENDERS = {'female', 'unisex'}


def get_gender_root_category(gender: str):
    """
    Возвращает Category-корень для пола или None.

    1) Точное совпадение slug из GENDER_CATEGORY_SLUGS / env.
    2) Среди корневых категорий (parent is None) — по вхождению в название
       («Мужчинам», «Женщинам» и т.п.) — на случай кириллических slug в админке.
    """
    from .models import Category

    slugs = getattr(
        settings,
        'GENDER_CATEGORY_SLUGS',
        DEFAULT_GENDER_CATEGORY_SLUGS,
    )
    slug = slugs.get(gender)
    if slug:
        cat = Category.objects.filter(slug=slug).first()
        if cat:
            return cat

    for alt_slug in GENDER_SLUG_ALTERNATES.get(gender, ()):
        cat = Category.objects.filter(slug=alt_slug).first()
        if cat:
            return cat

    for exact_name in GENDER_NAME_EXACT.get(gender, ()):
        cat = Category.objects.filter(parent__isnull=True, name__iexact=exact_name).first()
        if cat:
            return cat

    roots = Category.objects.filter(parent__isnull=True)

    if gender == 'male':
        for lookup, value in MALE_CATEGORY_LOOKUPS:
            q = roots.filter(**{lookup: value})
            cat = q.first()
            if cat:
                return cat
    elif gender in FEMALE_TARGET_GENDERS:
        for lookup, value in FEMALE_CATEGORY_LOOKUPS:
            q = roots.filter(**{lookup: value})
            cat = q.first()
            if cat:
                return cat

    return None


def get_gender_root_category_ids() -> list[int]:
    """ID корней «Мужчинам» / «Женщинам» для навигации и фильтров."""
    ids: list[int] = []
    for gender in ('male', 'female'):
        root = get_gender_root_category(gender)
        if root:
            ids.append(root.id)
    return ids
