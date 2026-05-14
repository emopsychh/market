from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    UserProfileView,
    addresses,
    address_detail,
    seller_application,
)

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', CustomTokenObtainPairView.as_view()),
    path('refresh/', TokenRefreshView.as_view()),
    path('me/', UserProfileView.as_view()),
    path('seller-application/', seller_application),
    path('addresses/', addresses),
    path('addresses/<int:pk>/', address_detail),
]
