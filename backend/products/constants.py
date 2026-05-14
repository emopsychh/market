"""Корневые категории «Мужчинам» / «Женщинам»: сначала slug из settings, затем эвристика по названию."""

from django.conf import settings

DEFAULT_GENDER_CATEGORY_SLUGS = {
    'male': 'muzhchinam',
    'female': 'zhenshchinam',
}

MALE_CATEGORY_LOOKUPS = (
    ('name__icontains', 'мужчин'),
    ('slug__icontains', 'muzhchin'),
    ('slug__iexact', 'men'),
    ('name__iexact', 'Men'),
)

FEMALE_CATEGORY_LOOKUPS = (
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
