from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from products.models import Product
from products.serializers import ProductListSerializer
from .models import Cart, CartItem, Order, OrderItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'size', 'color', 'quantity', 'subtotal']


class CartItemAddSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(status='active'))

    class Meta:
        model = CartItem
        fields = ['product', 'size', 'color', 'quantity']
        extra_kwargs = {
            'size': {'required': False, 'allow_blank': True},
            'color': {'required': False, 'allow_blank': True},
            'quantity': {'required': False},
        }

    def validate_quantity(self, value):
        # Маркетплейс: один лот = одна единица в корзине.
        return 1

    def validate(self, attrs):
        product = attrs['product']
        size = (attrs.get('size') or '').strip()
        color = (attrs.get('color') or '').strip()

        if product.sizes:
            if size not in product.sizes:
                raise serializers.ValidationError(
                    {'size': f'Доступные размеры: {product.sizes}'}
                )
        else:
            size = ''

        if product.colors:
            if color not in product.colors:
                raise serializers.ValidationError(
                    {'color': f'Доступные цвета: {product.colors}'}
                )
        else:
            color = ''

        attrs['size'] = size
        attrs['color'] = color
        attrs['quantity'] = 1
        return attrs


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'updated_at']

    @extend_schema_field(serializers.DecimalField(max_digits=10, decimal_places=2))
    def get_total(self, obj):
        return obj.total


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'product_price', 'size', 'color', 'quantity', 'subtotal']

    @extend_schema_field(serializers.DecimalField(max_digits=10, decimal_places=2))
    def get_subtotal(self, obj):
        return obj.subtotal


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'delivery_city', 'delivery_street', 'delivery_building',
            'delivery_apartment', 'delivery_postal_code', 'items', 'total',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['status']

    @extend_schema_field(serializers.DecimalField(max_digits=10, decimal_places=2))
    def get_total(self, obj):
        return obj.total


class OrderCreateSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(required=False)
    delivery_city = serializers.CharField(max_length=100, required=False)
    delivery_street = serializers.CharField(max_length=200, required=False)
    delivery_building = serializers.CharField(max_length=20, required=False)
    delivery_apartment = serializers.CharField(max_length=20, required=False, allow_blank=True)
    delivery_postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get('address_id'):
            return attrs
        if not all([attrs.get('delivery_city'), attrs.get('delivery_street'), attrs.get('delivery_building')]):
            raise serializers.ValidationError(
                'Укажите address_id или delivery_city, delivery_street, delivery_building'
            )
        return attrs
