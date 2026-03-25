from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import Category, Product, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'order']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'order']


class ProductListSerializer(serializers.ModelSerializer):
    """Light serializer for list view."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    first_image = serializers.SerializerMethodField()
    preview_images = serializers.SerializerMethodField()
    images_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'price', 'category', 'category_name',
            'sizes', 'colors', 'gender', 'first_image', 'preview_images', 'images_count',
            'status',
        ]

    def _image_url(self, img):
        if not img or not img.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(img.image.url)
        return img.image.url

    @extend_schema_field(serializers.URLField(allow_null=True))
    def get_first_image(self, obj):
        first = obj.images.first()
        return self._image_url(first)

    @extend_schema_field(serializers.ListField(child=serializers.URLField()))
    def get_preview_images(self, obj):
        """До 4 URL для сетки на карточке в списке."""
        urls = []
        for img in obj.images.all()[:4]:
            u = self._image_url(img)
            if u:
                urls.append(u)
        return urls

    @extend_schema_field(serializers.IntegerField())
    def get_images_count(self, obj):
        return len(obj.images.all())


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail view."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    listing_category_ids = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'category', 'category_name',
            'seller', 'seller_name', 'sizes', 'colors', 'gender', 'listing_category_ids',
            'images', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['seller']

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_listing_category_ids(self, obj):
        return list(obj.listing_categories.values_list('id', flat=True))


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for create/update - seller only. Images добавляются через POST /products/:id/images/"""

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'category', 'sizes', 'colors',
            'gender', 'status',
        ]

    def create(self, validated_data):
        validated_data['seller'] = self.context['request'].user
        if validated_data.get('colors') is None:
            validated_data['colors'] = []
        return Product.objects.create(**validated_data)
