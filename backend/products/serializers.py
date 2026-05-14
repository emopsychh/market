from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import Category, Product, ProductImage, WishlistItem

PREVIEW_IMAGES_LIMIT = 4


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
            'sizes', 'colors', 'gender', 'brand', 'first_image', 'preview_images', 'images_count',
            'status', 'publication_status',
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
        """До PREVIEW_IMAGES_LIMIT URL для сетки на карточке в списке."""
        urls = []
        for img in obj.images.all()[:PREVIEW_IMAGES_LIMIT]:
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
            'seller', 'seller_name', 'sizes', 'colors', 'gender', 'brand', 'listing_category_ids',
            'images', 'status', 'publication_status', 'moderation_note',
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
            'gender', 'brand', 'status', 'publication_status',
        ]

    def validate_publication_status(self, value):
        request = self.context.get('request')
        if not request or request.user.is_admin:
            return value
        if value not in (Product.PublicationStatus.DRAFT, Product.PublicationStatus.PENDING_REVIEW):
            raise serializers.ValidationError('Продавец может установить только draft или pending_review')
        return value

    def create(self, validated_data):
        request_user = self.context['request'].user
        validated_data['seller'] = request_user
        if not request_user.is_admin:
            validated_data['publication_status'] = Product.PublicationStatus.PENDING_REVIEW
            validated_data['moderation_note'] = ''
        if validated_data.get('colors') is None:
            validated_data['colors'] = []
        return Product.objects.create(**validated_data)

    def update(self, instance, validated_data):
        request_user = self.context['request'].user
        if not request_user.is_admin:
            if 'publication_status' in validated_data:
                validated_data['publication_status'] = Product.PublicationStatus.PENDING_REVIEW
            if validated_data:
                validated_data['moderation_note'] = ''
        return super().update(instance, validated_data)


class ProductModerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['publication_status', 'moderation_note']

    def validate_publication_status(self, value):
        if value not in (Product.PublicationStatus.PUBLISHED, Product.PublicationStatus.REJECTED):
            raise serializers.ValidationError('Модерация допускает только published или rejected')
        return value

    def validate(self, attrs):
        publication_status = attrs.get('publication_status')
        moderation_note = (attrs.get('moderation_note') or '').strip()
        if publication_status == Product.PublicationStatus.REJECTED and not moderation_note:
            raise serializers.ValidationError({'moderation_note': 'Укажите причину отклонения товара.'})
        return attrs


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = WishlistItem
        fields = ['id', 'product', 'product_id', 'created_at']
        read_only_fields = ['id', 'product', 'created_at']
