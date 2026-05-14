from django.db import migrations, models


def resync_listing(apps, schema_editor):
    # Историческая миграция: используем apps.get_model, чтобы не зависеть от актуальной модели.
    # Не менять логику постфактум без отдельного плана миграции данных.
    Product = apps.get_model('products', 'Product')
    Category = apps.get_model('products', 'Category')

    female_roots = list(Category.objects.filter(slug__in=['zhenshchinam', 'женщинам']).values_list('id', flat=True))
    male_roots = list(Category.objects.filter(slug__in=['muzhchinam', 'мужчинам']).values_list('id', flat=True))

    for product in Product.objects.all().iterator():
        ids = {product.category_id}
        if product.gender == 'female':
            ids.update(female_roots)
        elif product.gender == 'unisex':
            ids.update(female_roots)
            ids.update(male_roots)
        else:
            ids.update(male_roots)
        product.listing_categories.set(ids)


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_resync_listing_categories'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='gender',
            field=models.CharField(
                choices=[('male', 'Мужской'), ('female', 'Женский'), ('unisex', 'Унисекс')],
                default='male',
                help_text='Для выдачи в категориях «Мужчинам» / «Женщинам» (slug в GENDER_CATEGORY_SLUGS)',
                max_length=10,
                verbose_name='Пол',
            ),
        ),
        migrations.RunPython(resync_listing, migrations.RunPython.noop),
    ]
