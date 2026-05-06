from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from .models import Category, Product, ProductImage, WishlistItem
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    WishlistItemSerializer,
)
from .permissions import IsSellerOrAdmin
from .services import apply_category_filter, get_active_product


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    filter_backends = []

    def get_queryset(self):
        qs = Category.objects.all().order_by('order', 'name')
        parent = self.request.query_params.get('parent')
        if parent is not None and parent != '':
            try:
                parent_id = int(parent)
                return qs.filter(parent_id=parent_id)
            except ValueError:
                return qs.none()
        return qs.filter(parent=None)

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsSellerOrAdmin()]
        return [AllowAny()]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_url_kwarg = 'pk'

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsSellerOrAdmin()]


class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = (
            Product.objects.filter(status=Product.Status.ACTIVE)
            .select_related('category')
            .prefetch_related('images', 'listing_categories')
        )
        qs = apply_category_filter(qs, self.request.query_params.get('category'))
        # Фильтр по размеру
        size = self.request.query_params.get('size')
        if size:
            qs = qs.filter(sizes__contains=[size])
        # Фильтр по цвету
        color = self.request.query_params.get('color')
        if color:
            qs = qs.filter(colors__contains=[color])
        # Фильтр по цене
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        # Поиск
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        # Фильтр по бренду
        brand = self.request.query_params.get('brand')
        if brand:
            qs = qs.filter(brand=brand)
        return qs


class SellerProductListView(generics.ListAPIView):
    """Товары текущего продавца (редактирование / удаление)."""

    serializer_class = ProductListSerializer
    permission_classes = [IsAuthenticated, IsSellerOrAdmin]

    def get_queryset(self):
        return (
            Product.objects.filter(seller=self.request.user)
            .select_related('category')
            .prefetch_related('images', 'listing_categories')
            .order_by('-created_at')
        )


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.all().select_related('category', 'seller').prefetch_related(
        'images', 'listing_categories'
    )
    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]


class ProductCreateView(generics.CreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsSellerOrAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]


class ProductUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsSellerOrAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_url_kwarg = 'pk'

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Product.objects.all()
        return Product.objects.filter(seller=user)


class ProductImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()


@extend_schema(
    methods=['GET'],
    responses={200: WishlistItemSerializer(many=True)},
)
@extend_schema(
    methods=['POST'],
    request=WishlistItemSerializer,
    responses={201: WishlistItemSerializer},
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def wishlist_items(request):
    if request.method == 'GET':
        items = (
            WishlistItem.objects.filter(user=request.user)
            .select_related('product', 'product__category')
            .prefetch_related('product__images', 'product__listing_categories')
        )
        serializer = WishlistItemSerializer(items, many=True, context={'request': request})
        return Response(serializer.data)

    product_id = request.data.get('product') or request.data.get('product_id')
    if not product_id:
        return Response({'detail': 'Поле product обязательно'}, status=status.HTTP_400_BAD_REQUEST)

    product = get_active_product(product_id)
    if not product:
        return Response({'detail': 'Товар не найден'}, status=status.HTTP_404_NOT_FOUND)

    item, created = WishlistItem.objects.get_or_create(user=request.user, product=product)
    serializer = WishlistItemSerializer(item, context={'request': request})
    code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return Response(serializer.data, status=code)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def wishlist_item_delete(request, product_id):
    deleted, _ = WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
    if not deleted:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(request=ProductImageUploadSerializer, responses={201: None}, operation_id='product_images_create')
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSellerOrAdmin])
def product_images(request, pk):
    """Add image to product."""
    try:
        product = Product.objects.get(pk=pk)
        if not request.user.is_admin and product.seller != request.user:
            return Response({'detail': 'Нет доступа'}, status=status.HTTP_403_FORBIDDEN)
    except Product.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    image = request.FILES.get('image')
    if not image:
        return Response({'detail': 'Файл image обязателен'}, status=status.HTTP_400_BAD_REQUEST)

    order = ProductImage.objects.filter(product=product).count()
    ProductImage.objects.create(product=product, image=image, order=order)
    return Response({'detail': 'OK'}, status=status.HTTP_201_CREATED)
