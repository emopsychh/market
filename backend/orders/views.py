from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Cart, CartItem, Order, OrderItem
from .serializers import (
    CartSerializer,
    CartItemAddSerializer,
    OrderSerializer,
    OrderCreateSerializer,
)
from users.models import DeliveryAddress
from products.models import Product


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


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

    product = serializer.validated_data['product']
    size = serializer.validated_data['size']
    color = serializer.validated_data['color']
    quantity = 1

    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        size=size,
        color=color,
        defaults={'quantity': quantity}
    )
    if not created:
        if cart_item.quantity != 1:
            cart_item.quantity = 1
            cart_item.save()

    return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0, required=False)


class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_cart_item(self, request, pk):
        cart = get_or_create_cart(request.user)
        return CartItem.objects.get(pk=pk, cart=cart)

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
            if quantity > 0:
                item.quantity = 1
                item.save(update_fields=['quantity'])
            else:
                item.delete()
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

    # Get delivery address
    if address_id := serializer.validated_data.get('address_id'):
        try:
            addr = DeliveryAddress.objects.get(pk=address_id, user=request.user)
        except DeliveryAddress.DoesNotExist:
            return Response(
                {'detail': 'Адрес не найден'},
                status=status.HTTP_400_BAD_REQUEST
            )
        delivery_city = addr.city
        delivery_street = addr.street
        delivery_building = addr.building
        delivery_apartment = addr.apartment
        delivery_postal_code = addr.postal_code
    else:
        delivery_city = serializer.validated_data['delivery_city']
        delivery_street = serializer.validated_data['delivery_street']
        delivery_building = serializer.validated_data['delivery_building']
        delivery_apartment = serializer.validated_data.get('delivery_apartment', '')
        delivery_postal_code = serializer.validated_data.get('delivery_postal_code', '')

    # Group cart items by seller (for simplicity we create one order per seller)
    # Or one order with all items - let's do one order with all items
    order = Order.objects.create(
        buyer=request.user,
        delivery_city=delivery_city,
        delivery_street=delivery_street,
        delivery_building=delivery_building,
        delivery_apartment=delivery_apartment,
        delivery_postal_code=delivery_postal_code,
    )

    for cart_item in cart.items.select_related('product', 'product__seller').all():
        OrderItem.objects.create(
            order=order,
            product=cart_item.product,
            product_name=cart_item.product.name,
            product_price=cart_item.product.price,
            size=cart_item.size,
            color=cart_item.color,
            quantity=cart_item.quantity,
            seller=cart_item.product.seller,
        )

    cart.items.all().delete()
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

    user = request.user
    is_seller = user.role in ('seller', 'admin') or user.is_staff
    is_order_seller = order.items.filter(seller=user).exists()

    if not (is_seller and (user.is_admin or is_order_seller)):
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
