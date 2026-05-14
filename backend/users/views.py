from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, DeliveryAddress
from .serializers import (
    DeliveryAddressSerializer,
    SellerApplicationSerializer,
    UserRegisterSerializer,
    UserSerializer,
)


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


@extend_schema(request=SellerApplicationSerializer, responses={200: UserSerializer})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def seller_application(request):
    serializer = SellerApplicationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if user.is_admin:
        return Response({'detail': 'Администратору не требуется заявка продавца'}, status=status.HTTP_400_BAD_REQUEST)

    user.role = User.Role.SELLER
    user.seller_status = User.SellerStatus.PENDING
    user.seller_rejection_reason = ''
    user.save(update_fields=['role', 'seller_status', 'seller_rejection_reason'])

    return Response(UserSerializer(user, context={'request': request}).data)
