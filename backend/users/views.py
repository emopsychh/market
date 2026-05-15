from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, DeliveryAddress, SellerApplication
from .serializers import (
    DeliveryAddressSerializer,
    PasswordChangeSerializer,
    SellerApplicationBriefSerializer,
    SellerApplicationCreateSerializer,
    SellerApplicationResultSerializer,
    UserRegisterSerializer,
    UserSerializer,
    PublicSellerProfileSerializer,
)
from .services import is_public_seller_profile


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


@extend_schema(request=PasswordChangeSerializer, responses={204: None})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = PasswordChangeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if not request.user.check_password(serializer.validated_data['current_password']):
        return Response({'current_password': ['Неверный текущий пароль.']}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save(update_fields=['password'])
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=['GET'],
    responses={200: DeliveryAddressSerializer(many=True)},
)
@extend_schema(
    methods=['POST'],
    request=DeliveryAddressSerializer,
    responses={201: DeliveryAddressSerializer},
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def addresses(request):
    if request.method == 'GET':
        addresses = DeliveryAddress.objects.filter(user=request.user)
        serializer = DeliveryAddressSerializer(addresses, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = DeliveryAddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(request=DeliveryAddressSerializer, responses={200: DeliveryAddressSerializer, 204: None})
@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def address_detail(request, pk):
    try:
        addr = DeliveryAddress.objects.get(pk=pk, user=request.user)
    except DeliveryAddress.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        serializer = DeliveryAddressSerializer(addr, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    if request.method == 'DELETE':
        addr.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    request=SellerApplicationCreateSerializer,
    responses={201: SellerApplicationResultSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def seller_application(request):
    user = request.user
    if user.is_admin:
        return Response(
            {'detail': 'Администратору не требуется заявка продавца'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.role == User.Role.SELLER and user.seller_status == User.SellerStatus.APPROVED:
        return Response({'detail': 'Вы уже подтверждённый продавец'}, status=status.HTTP_400_BAD_REQUEST)

    if SellerApplication.objects.filter(user=user, status=SellerApplication.Status.SUBMITTED).exists():
        return Response({'detail': 'Уже есть заявка на рассмотрении'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = SellerApplicationCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    application = serializer.save(
        user=user,
        status=SellerApplication.Status.SUBMITTED,
    )
    if application.terms_accepted:
        application.terms_accepted_at = timezone.now()
        application.save(update_fields=['terms_accepted_at'])

    user.role = User.Role.SELLER
    user.seller_status = User.SellerStatus.PENDING
    user.seller_rejection_reason = ''
    user.phone = application.phone
    user.save(update_fields=['role', 'seller_status', 'seller_rejection_reason', 'phone'])

    payload = {
        'user': UserSerializer(user, context={'request': request}).data,
        'application': SellerApplicationBriefSerializer(application).data,
    }
    return Response(payload, status=status.HTTP_201_CREATED)


class PublicSellerProfileView(generics.RetrieveAPIView):
    """Публичная витрина продавца — без email и служебных полей."""

    serializer_class = PublicSellerProfileSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = 'pk'

    def get_queryset(self):
        return User.objects.all()

    def get_object(self):
        user = get_object_or_404(self.get_queryset(), pk=self.kwargs['pk'])
        if not is_public_seller_profile(user):
            from rest_framework.exceptions import NotFound
            raise NotFound('Профиль продавца недоступен')
        return user
