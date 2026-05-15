from django.db import migrations, models
import django.db.models.deletion


DEFAULT_BRANDS = [
    ('adidas', 'Adidas'),
    ('armani', 'Armani'),
    ('asos', 'ASOS'),
    ('balenciaga', 'Balenciaga'),
    ('burberry', 'Burberry'),
    ('calvin-klein', 'Calvin Klein'),
    ('cartier', 'Cartier'),
    ('chanel', 'Chanel'),
    ('columbia', 'Columbia'),
    ('converse', 'Converse'),
    ('crocs', 'Crocs'),
    ('dior', 'Dior'),
    ('dolce-gabbana', 'Dolce & Gabbana'),
    ('fendi', 'Fendi'),
    ('gucci', 'Gucci'),
    ('hugo-boss', 'Hugo Boss'),
    ('kenzo', 'Kenzo'),
    ('louis-vuitton', 'Louis Vuitton'),
    ('lvmh', 'LVMH'),
    ('lyle-scott', 'Lyle & Scott'),
    ('miu-miu', 'Miu Miu'),
    ('new-balance', 'New Balance'),
    ('nike', 'Nike'),
    ('puma', 'Puma'),
    ('quiksilver', 'Quiksilver'),
    ('ralph-lauren', 'Ralph Lauren'),
    ('reebok', 'Reebok'),
    ('under-armour', 'Under Armour'),
    ('valentino', 'Valentino'),
    ('vogue', 'Vogue'),
    ('zara', 'Zara'),
]


def seed_brands_and_link_products(apps, schema_editor):
    Brand = apps.get_model('products', 'Brand')
    Product = apps.get_model('products', 'Product')

    by_slug = {}
    for order, (slug, name) in enumerate(DEFAULT_BRANDS):
        brand, _ = Brand.objects.get_or_create(
            slug=slug,
            defaults={'name': name, 'order': order, 'is_active': True},
        )
        by_slug[slug] = brand

    for product in Product.objects.exclude(brand_old='').exclude(brand_old__isnull=True):
        slug = (product.brand_old or '').strip()
        if not slug:
            continue
        brand = by_slug.get(slug)
        if brand is None:
            brand, _ = Brand.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': slug.replace('-', ' ').title(),
                    'order': Brand.objects.count(),
                    'is_active': True,
                },
            )
            by_slug[slug] = brand
        product.brand = brand
        product.save(update_fields=['brand'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0010_product_compare_at_price'),
    ]

    operations = [
        migrations.CreateModel(
            name='Brand',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='Название')),
                ('slug', models.SlugField(max_length=100, unique=True, verbose_name='Slug')),
                ('logo', models.ImageField(blank=True, null=True, upload_to='brands/%Y/%m/', verbose_name='Логотип')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Порядок')),
                ('is_active', models.BooleanField(default=True, help_text='Скрытые бренды не показываются в навигации', verbose_name='Активен')),
            ],
            options={
                'verbose_name': 'Бренд',
                'verbose_name_plural': 'Бренды',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.RenameField(
            model_name='product',
            old_name='brand',
            new_name='brand_old',
        ),
        migrations.AddField(
            model_name='product',
            name='brand',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='products',
                to='products.brand',
                verbose_name='Бренд',
            ),
        ),
        migrations.RunPython(seed_brands_and_link_products, noop_reverse),
        migrations.RemoveField(
            model_name='product',
            name='brand_old',
        ),
    ]
