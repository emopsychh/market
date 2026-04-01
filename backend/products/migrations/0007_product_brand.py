from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_product_gender_unisex'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='brand',
            field=models.CharField(
                blank=True,
                choices=[
                    ('adidas', 'Adidas'),
                    ('burberry', 'Burberry'),
                    ('calvin-klein', 'Calvin Klein'),
                    ('gucci', 'Gucci'),
                    ('louis-vuitton', 'Louis Vuitton'),
                    ('new-balance', 'New Balance'),
                    ('vogue', 'Vogue'),
                    ('zara', 'Zara'),
                ],
                default='',
                max_length=32,
                verbose_name='Бренд',
            ),
        ),
    ]
