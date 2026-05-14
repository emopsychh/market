from .models import Cart, CartItem, Order, OrderItem
from users.models import DeliveryAddress, User

SINGLE_ITEM_QUANTITY = 1


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def get_cart_item_for_user(user, item_id):
    cart = get_or_create_cart(user)
    return CartItem.objects.get(pk=item_id, cart=cart)


def add_item_to_cart(cart, *, product, size, color):
    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        size=size,
        color=color,
        defaults={'quantity': SINGLE_ITEM_QUANTITY},
    )
    if not created and cart_item.quantity != SINGLE_ITEM_QUANTITY:
        cart_item.quantity = SINGLE_ITEM_QUANTITY
        cart_item.save(update_fields=['quantity'])
    return cart_item, created


def update_or_delete_cart_item_quantity(item, quantity):
    if quantity > 0:
        item.quantity = SINGLE_ITEM_QUANTITY
        item.save(update_fields=['quantity'])
        return
    item.delete()


def resolve_delivery_payload(validated_data, user):
    address_id = validated_data.get('address_id')
    if address_id:
        try:
            addr = DeliveryAddress.objects.get(pk=address_id, user=user)
        except DeliveryAddress.DoesNotExist:
            return None
        return {
            'delivery_city': addr.city,
            'delivery_street': addr.street,
            'delivery_building': addr.building,
            'delivery_apartment': addr.apartment,
            'delivery_postal_code': addr.postal_code,
        }

    return {
        'delivery_city': validated_data['delivery_city'],
        'delivery_street': validated_data['delivery_street'],
        'delivery_building': validated_data['delivery_building'],
        'delivery_apartment': validated_data.get('delivery_apartment', ''),
        'delivery_postal_code': validated_data.get('delivery_postal_code', ''),
    }


def create_order_from_cart(user, cart, delivery_payload):
    order = Order.objects.create(buyer=user, **delivery_payload)
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
    return order


def user_can_update_order_status(user, order):
    is_seller = user.role in (User.Role.SELLER, User.Role.ADMIN) or user.is_staff
    is_order_seller = order.items.filter(seller=user).exists()
    return is_seller and (user.is_admin or is_order_seller)
