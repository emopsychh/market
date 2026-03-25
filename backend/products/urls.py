from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.CategoryListCreateView.as_view()),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view()),
    path('products/', views.ProductListView.as_view()),
    path('products/create/', views.ProductCreateView.as_view()),
    path('products/mine/', views.SellerProductListView.as_view()),
    path('products/<int:pk>/', views.ProductDetailView.as_view()),  # GET - public
    path('products/<int:pk>/manage/', views.ProductUpdateDestroyView.as_view()),  # PUT, DELETE - seller
    path('products/<int:pk>/images/', views.product_images),
]
