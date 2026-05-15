"""
Заполняет дерево категорий типовыми подкатегориями для витрин «Для него» / «Для неё».

Запуск: python manage.py seed_categories
Только добавляет отсутствующие записи (по slug), существующие не трогает.
"""

from django.core.management.base import BaseCommand

from products.constants import get_gender_root_category
from products.models import Category

# slug_suffix, название, order
TOP_LEVEL = [
    ('brands', 'Бренды', 0),
    ('clothes', 'Одежда', 10),
    ('shoes', 'Обувь', 20),
    ('bags', 'Сумки', 30),
    ('accessories', 'Аксессуары', 40),
]

# Ключ — суффикс родителя (brands/clothes/shoes/…); для мужского «boots» и «Access» тоже учтены
SUBCATEGORIES: dict[str, list[tuple[str, str, int]]] = {
    'clothes': [
        ('tshirts', 'Футболки и майки', 0),
        ('hoodies', 'Худи и свитшоты', 10),
        ('jackets', 'Куртки и пальто', 20),
        ('pants', 'Брюки и джинсы', 30),
        ('shirts', 'Рубашки', 40),
        ('knitwear', 'Трикотаж', 50),
    ],
    'shoes': [
        ('sneakers', 'Кроссовки', 0),
        ('boots', 'Ботинки', 10),
        ('sandals', 'Сандалии', 20),
        ('loafers', 'Лоферы', 30),
    ],
    'bags': [
        ('backpacks', 'Рюкзаки', 0),
        ('crossbody', 'Через плечо', 10),
        ('totes', 'Тоуты', 20),
        ('clutches', 'Клатчи', 30),
    ],
    'accessories': [
        ('hats', 'Головные уборы', 0),
        ('eyewear', 'Очки', 10),
        ('belts', 'Ремни', 20),
        ('jewelry', 'Украшения', 30),
        ('scarves', 'Шарфы и платки', 40),
    ],
}

# Соответствие фактических slug родителя → ключ в SUBCATEGORIES
PARENT_SLUG_ALIASES = {
    'boots': 'shoes',
    'access': 'accessories',
}

# Уже созданные вручную slug верхнего уровня (мужская витрина)
MALE_TOP_SLUG_MAP = {
    'brands': ('brands',),
    'clothes': ('clothes',),
    'shoes': ('boots', 'shoes', 'm-shoes'),
    'bags': ('bags',),
    'accessories': ('access', 'accessories', 'm-accessories'),
}


def _gender_slug_prefix(gender: str) -> str:
    return 'm' if gender == 'male' else 'f'


def _top_slug(prefix: str, suffix: str) -> str:
    return f'{prefix}-{suffix}'


def _child_slug(parent_slug: str, suffix: str) -> str:
    return f'{parent_slug}-{suffix}'


def _ensure_category(slug: str, name: str, parent: Category | None, order: int) -> tuple[Category, bool]:
    obj, created = Category.objects.get_or_create(
        slug=slug,
        defaults={'name': name, 'parent': parent, 'order': order},
    )
    if not created:
        updated = []
        if obj.name != name:
            obj.name = name
            updated.append('name')
        if obj.parent_id != (parent.id if parent else None):
            obj.parent = parent
            updated.append('parent')
        if obj.order != order:
            obj.order = order
            updated.append('order')
        if updated:
            obj.save(update_fields=updated)
    return obj, created


def _parent_sub_key(parent: Category) -> str | None:
    slug = parent.slug.lower()
    for part in ('brands', 'clothes', 'shoes', 'bags', 'accessories', 'boots', 'access'):
        if part in slug or slug.endswith(f'-{part}') or slug == part:
            return PARENT_SLUG_ALIASES.get(part, part)
    return None


def _remove_duplicate_male_tops(root: Category) -> int:
    """Убрать лишние m-shoes / m-accessories, если уже есть boots и Access."""
    removed = 0
    has_boots = Category.objects.filter(parent=root, slug='boots').exists()
    has_access = Category.objects.filter(parent=root, slug__in=('access', 'Access')).exists()
    for slug in ('m-shoes', 'm-accessories'):
        if slug == 'm-shoes' and not has_boots:
            continue
        if slug == 'm-accessories' and not has_access:
            continue
        dup = Category.objects.filter(parent=root, slug=slug).first()
        if not dup:
            continue
        Category.objects.filter(parent=dup).delete()
        dup.delete()
        removed += 1
    return removed


class Command(BaseCommand):
    help = 'Добавляет типовые подкатегории под «Для него» и «Для неё» (идемпотентно).'

    def handle(self, *args, **options):
        created_total = 0
        for gender in ('male', 'female'):
            root = get_gender_root_category(gender)
            if not root:
                self.stderr.write(self.style.WARNING(f'Корень витрины не найден: {gender}'))
                continue

            prefix = _gender_slug_prefix(gender)
            self.stdout.write(f'\n{root.name} (id={root.id}, slug={root.slug})')

            if gender == 'male':
                n = _remove_duplicate_male_tops(root)
                if n:
                    self.stdout.write(f'  - removed duplicate tops: {n}')

            top_by_key: dict[str, Category] = {}

            for suffix, name, order in TOP_LEVEL:
                if gender == 'male':
                    slug_candidates = MALE_TOP_SLUG_MAP.get(suffix, (suffix, _top_slug(prefix, suffix)))
                    existing = Category.objects.filter(parent=root, slug__in=slug_candidates).first()
                    if existing:
                        top_by_key[suffix] = existing
                        self.stdout.write(f'  = {existing.name} [{existing.slug}]')
                        continue

                slug = _top_slug(prefix, suffix)
                cat, created = _ensure_category(slug, name, root, order)
                top_by_key[suffix] = cat
                mark = '+' if created else '~'
                self.stdout.write(f'  {mark} {name} [{slug}]')
                if created:
                    created_total += 1

            # Подкатегории 2-го уровня
            parents = Category.objects.filter(parent=root).order_by('order', 'name')
            for parent in parents:
                key = _parent_sub_key(parent)
                if not key or key == 'brands':
                    continue
                children_def = SUBCATEGORIES.get(key)
                if not children_def:
                    continue

                self.stdout.write(f'    > {parent.name}:')
                for child_suffix, child_name, child_order in children_def:
                    child_slug = _child_slug(parent.slug, child_suffix)
                    _, created = _ensure_category(child_slug, child_name, parent, child_order)
                    mark = '+' if created else '.'
                    self.stdout.write(f'      {mark} {child_name} [{child_slug}]')
                    if created:
                        created_total += 1

        self.stdout.write(self.style.SUCCESS(f'\nГотово. Создано новых категорий: {created_total}'))
