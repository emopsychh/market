from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_cart_order_item_blank_color_size'),
        ('products', '0011_brand_model'),
    ]

    operations = [
        migrations.AlterField(
            model_name='orderitem',
            name='product',
            field=models.ForeignKey(
                blank=True,
                help_text='Может быть пустым после удаления карточки товара; в заказе сохраняются название и цена.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='order_items',
                to='products.product',
                verbose_name='Товар',
            ),
        ),
    ]
