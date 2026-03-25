# Пересинхронизация listing_categories после улучшения get_gender_root_category

from django.db import migrations


def resync_listing(apps, schema_editor):
    from products.models import Product

    for p in Product.objects.all():
        p.sync_listing_categories()


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_product_gender_listing_categories'),
    ]

    operations = [
        migrations.RunPython(resync_listing, migrations.RunPython.noop),
    ]
