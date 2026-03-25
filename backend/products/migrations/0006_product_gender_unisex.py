from django.db import migrations, models


def resync_listing(apps, schema_editor):
    from products.models import Product

    for product in Product.objects.all().iterator():
        product.sync_listing_categories()


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
