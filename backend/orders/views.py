from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CartItem, Order
from .serializers import (
    CartSerializer,
    CartItemAddSerializer,
    OrderSerializer,
    OrderCreateSerializer,
)
from .services import (
    add_item_to_cart,
    create_order_from_cart,
    get_cart_item_for_user,
    get_or_create_cart,
    resolve_delivery_payload,
    update_or_delete_cart_item_quantity,
    user_can_update_order_status,
)


@extend_schema(responses={200: CartSerializer}, operation_id='cart_retrieve')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cart_detail(request):
    """Get current user's cart."""
    cart = get_or_create_cart(request.user)
    serializer = CartSerializer(cart)
    return Response(serializer.data)


@extend_schema(request=CartItemAddSerializer, responses={201: CartSerializer}, operation_id='cart_add_item')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cart_add_item(request):
    """Add item to cart."""
    cart = get_or_create_cart(request.user)
    serializer = CartItemAddSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    add_item_to_cart(
        cart,
        product=serializer.validated_data['product'],
        size=serializer.validated_data['size'],
        color=serializer.validated_data['color'],
    )

    return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0, required=False)


class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_cart_item(self, request, pk):
        return get_cart_item_for_user(request.user, pk)

    @extend_schema(
        request=CartItemQuantitySerializer,
        responses={200: CartSerializer},
        operation_id='cart_item_update',
    )
    def put(self, request, pk):
        try:
            item = self.get_cart_item(request, pk)
        except CartItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = CartItemQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data.get('quantity')
        if quantity is not None:
            update_or_delete_cart_item_quantity(item, quantity)
        return Response(CartSerializer(get_or_create_cart(request.user)).data)

    @extend_schema(responses={204: None}, operation_id='cart_item_delete')
    def delete(self, request, pk):
        try:
            item = self.get_cart_item(request, pk)
        except CartItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(responses={200: OrderSerializer(many=True)}, operation_id='orders_list')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_list(request):
    """List user's orders."""
    orders = Order.objects.filter(buyer=request.user)
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@extend_schema(responses={200: OrderSerializer}, operation_id='orders_retrieve')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, pk):
    """Get order detail."""
    try:
        order = Order.objects.get(pk=pk, buyer=request.user)
    except Order.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    serializer = OrderSerializer(order)
    return Response(serializer.data)


@extend_schema(request=OrderCreateSerializer, responses={201: OrderSerializer}, operation_id='orders_create')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def order_create(request):
    """Create order from cart."""
    cart = get_or_create_cart(request.user)
    if not cart.items.exists():
        return Response(
            {'detail': 'Корзина пуста'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = OrderCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    delivery_payload = resolve_delivery_payload(serializer.validated_data, request.user)
    if not delivery_payload:
        return Response(
            {'detail': 'Адрес не найден'},
            status=status.HTTP_400_BAD_REQUEST
        )

    order = create_order_from_cart(request.user, cart, delivery_payload)
    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[c[0] for c in Order.Status.choices])


@extend_schema(
    request=OrderStatusSerializer,
    responses={200: OrderSerializer},
    operation_id='orders_status_update',
)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def order_status_update(request, pk):
    """Update order status (seller only)."""
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not user_can_update_order_status(request.user, order):
        return Response({'detail': 'Нет доступа'}, status=status.HTTP_403_FORBIDDEN)

    new_status = request.data.get('status')
    valid_statuses = [c[0] for c in Order.Status.choices]
    if new_status not in valid_statuses:
        return Response(
            {'detail': f'Недопустимый статус. Доступные: {valid_statuses}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    order.status = new_status
    order.save()
    return Response(OrderSerializer(order).data)
