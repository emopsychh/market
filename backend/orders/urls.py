from django.urls import path
from . import views

urlpatterns = [
    path('cart/', views.cart_detail),
    path('cart/items/', views.cart_add_item),
    path('cart/items/<int:pk>/', views.CartItemDetailView.as_view()),
    path('orders/', views.order_list),
    path('orders/create/', views.order_create),
    path('orders/<int:pk>/', views.order_detail),
    path('orders/<int:pk>/status/', views.order_status_update),
]
