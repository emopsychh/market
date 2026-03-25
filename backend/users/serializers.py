from rest_framework import serializers
from .models import User, DeliveryAddress


class DeliveryAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAddress
        fields = ['id', 'city', 'street', 'building', 'apartment', 'postal_code', 'is_default']


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
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    addresses = DeliveryAddressSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'role', 'phone', 'addresses']
        read_only_fields = ['id', 'email']

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
