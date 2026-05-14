from rest_framework import serializers
from .models import User, DeliveryAddress, SellerApplication


class DeliveryAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAddress
        fields = ['id', 'city', 'street', 'building', 'apartment', 'postal_code', 'is_default']


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Пароли не совпадают'})
        return attrs


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'first_name', 'last_name', 'role']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Пароли не совпадают'})
        attrs.pop('password_confirm')
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        if validated_data.get('role') == User.Role.SELLER:
            validated_data['seller_status'] = User.SellerStatus.PENDING
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class SellerApplicationBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerApplication
        fields = ['id', 'status', 'display_name', 'created_at', 'seller_type']


class UserSerializer(serializers.ModelSerializer):
    addresses = DeliveryAddressSerializer(many=True, read_only=True)
    seller_application = serializers.SerializerMethodField()
    seller_rating_avg = serializers.SerializerMethodField()
    seller_sold_units = serializers.SerializerMethodField()
    seller_showcase_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'bio',
            'date_joined',
            'role',
            'phone',
            'seller_status',
            'seller_rejection_reason',
            'addresses',
            'seller_application',
            'seller_rating_avg',
            'seller_sold_units',
            'seller_showcase_count',
        ]
        read_only_fields = [
            'id',
            'email',
            'seller_status',
            'seller_rejection_reason',
            'seller_application',
            'date_joined',
            'seller_rating_avg',
            'seller_sold_units',
            'seller_showcase_count',
        ]

    def validate_bio(self, value):
        if value and len(value) > 800:
            raise serializers.ValidationError('Не больше 800 символов.')
        return value

    def get_seller_application(self, obj):
        app = obj.seller_applications.order_by('-created_at').first()
        if not app:
            return None
        return SellerApplicationBriefSerializer(app).data

    def get_seller_rating_avg(self, obj):
        """Средняя оценка продавца; позже — из модели отзывов."""
        return None

    def get_seller_sold_units(self, obj):
        from django.db.models import Sum
        from orders.models import Order, OrderItem

        total = OrderItem.objects.filter(
            seller=obj,
            order__status__in=[
                Order.Status.CONFIRMED,
                Order.Status.SHIPPED,
                Order.Status.DELIVERED,
            ],
        ).aggregate(s=Sum('quantity'))['s']
        return int(total or 0)

    def get_seller_showcase_count(self, obj):
        from products.models import Product

        return Product.objects.filter(
            seller=obj,
            status=Product.Status.ACTIVE,
            publication_status=Product.PublicationStatus.PUBLISHED,
        ).count()

    def validate_role(self, value):
        """Пользователь может выбрать только buyer или seller. Admin — только через админку."""
        request = self.context.get('request')
        if not request or not request.user:
            return value
        user = request.user
        if user.is_admin:
            return value
        if value not in (User.Role.BUYER, User.Role.SELLER):
            raise serializers.ValidationError('Доступны только роли Покупатель и Продавец')
        return value


class SellerApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerApplication
        fields = [
            'seller_type',
            'display_name',
            'full_name',
            'phone',
            'city',
            'country',
            'description',
            'terms_accepted',
        ]

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError('Необходимо принять правила площадки.')
        return value


class SellerApplicationResultSerializer(serializers.Serializer):
    user = UserSerializer()
    application = SellerApplicationBriefSerializer()
