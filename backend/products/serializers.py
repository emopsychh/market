from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import Brand, Category, Product, ProductImage, WishlistItem

PREVIEW_IMAGES_LIMIT = 4


class BrandSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo', 'order']

    @extend_schema_field(serializers.URLField(allow_null=True))
    def get_logo(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.logo.url)
        return obj.logo.url


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
    brand = serializers.SlugRelatedField(slug_field='slug', read_only=True, allow_null=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True, allow_null=True)
    seller = serializers.IntegerField(source='seller_id', read_only=True)
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    seller_display_name = serializers.SerializerMethodField()
    first_image = serializers.SerializerMethodField()
    preview_images = serializers.SerializerMethodField()
    images_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'price', 'compare_at_price', 'category', 'category_name',
            'sizes', 'colors', 'gender', 'brand', 'brand_name',
            'seller', 'seller_username', 'seller_display_name',
            'first_image', 'preview_images', 'images_count',
            'status', 'publication_status',
        ]

    def get_seller_display_name(self, obj):
        from users.services import get_seller_storefront_name
        if not obj.seller_id:
            return ''
        return get_seller_storefront_name(obj.seller)

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
    brand = serializers.SlugRelatedField(slug_field='slug', read_only=True, allow_null=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True, allow_null=True)
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    seller_display_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    listing_category_ids = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'compare_at_price', 'category', 'category_name',
            'seller', 'seller_name', 'seller_username', 'seller_display_name',
            'sizes', 'colors', 'gender', 'brand', 'brand_name', 'listing_category_ids',
            'images', 'status', 'publication_status', 'moderation_note',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['seller']

    def get_seller_display_name(self, obj):
        from users.services import get_seller_storefront_name
        if not obj.seller_id:
            return ''
        return get_seller_storefront_name(obj.seller)

    def get_seller_name(self, obj):
        return self.get_seller_display_name(obj)

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_listing_category_ids(self, obj):
        return list(obj.listing_categories.values_list('id', flat=True))


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for create/update - seller only. Images добавляются через POST /products/:id/images/"""

    brand = serializers.SlugRelatedField(
        slug_field='slug',
        queryset=Brand.objects.filter(is_active=True),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'compare_at_price', 'category', 'sizes', 'colors',
            'gender', 'brand', 'status', 'publication_status',
        ]

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        price = attrs.get('price')
        if price is None and instance is not None:
            price = instance.price
        if 'compare_at_price' in attrs:
            compare = attrs['compare_at_price']
        else:
            compare = instance.compare_at_price if instance is not None else None
        if compare is not None and price is not None and compare <= price:
            raise serializers.ValidationError(
                {'compare_at_price': 'Цена до скидки должна быть выше текущей цены.'}
            )
        return attrs

    def validate_status(self, value):
        request = self.context.get('request')
        if request and not request.user.is_admin:
            if value not in (Product.Status.ACTIVE, Product.Status.INACTIVE):
                raise serializers.ValidationError('Доступны только «Активен» и «Скрыт с витрины».')
        return value

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
        if validated_data.get('colors') is None:
            validated_data['colors'] = []
        # Каталог отдаёт только published; создавать могут только админ и подтверждённый продавец.
        validated_data['publication_status'] = Product.PublicationStatus.PUBLISHED
        validated_data['moderation_note'] = ''
        return Product.objects.create(**validated_data)

    def update(self, instance, validated_data):
        request_user = self.context['request'].user
        if not request_user.is_admin:
            validated_data.pop('publication_status', None)
            if validated_data:
                validated_data['publication_status'] = Product.PublicationStatus.PENDING_REVIEW
                validated_data['moderation_note'] = ''
                # Модерация — через publication_status, не ручной status
                if validated_data.get('status') == Product.Status.MODERATION:
                    validated_data['status'] = Product.Status.ACTIVE
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
