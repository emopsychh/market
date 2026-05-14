from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_product_publication_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='compare_at_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Если указана и выше текущей цены, в каталоге показывается зачёркнутая «старая» цена и скидка.',
                max_digits=10,
                null=True,
                verbose_name='Цена до скидки',
            ),
        ),
    ]
