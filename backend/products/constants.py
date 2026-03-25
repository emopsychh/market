"""Корневые категории «Мужчинам» / «Женщинам»: сначала slug из settings, затем эвристика по названию."""

from django.conf import settings


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
        {'male': 'muzhchinam', 'female': 'zhenshchinam'},
    )
    slug = slugs.get(gender)
    if slug:
        cat = Category.objects.filter(slug=slug).first()
        if cat:
            return cat

    roots = Category.objects.filter(parent__isnull=True)

    if gender == 'male':
        for q in (
            roots.filter(name__icontains='мужчин'),
            roots.filter(slug__icontains='muzhchin'),
            roots.filter(slug__iexact='men'),
            roots.filter(name__iexact='Men'),
        ):
            cat = q.first()
            if cat:
                return cat
    elif gender in ('female', 'unisex'):
        for q in (
            roots.filter(name__icontains='женщин'),
            roots.filter(slug__icontains='zhenshchin'),
            roots.filter(slug__iexact='women'),
            roots.filter(name__iexact='Women'),
        ):
            cat = q.first()
            if cat:
                return cat

    return None
