"""
URL configuration for Clothing Marketplace project.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (  # type: ignore[reportMissingImports]
    SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
)


def api_root(request):
    return JsonResponse({
        'name': 'Clothing Marketplace API',
        'endpoints': {
            'auth': '/api/auth/',
            'categories': '/api/categories/',
            'products': '/api/products/',
            'cart': '/api/cart/',
            'orders': '/api/orders/',
            'admin': '/admin/',
        },
        'docs': {
            'swagger': '/api/schema/swagger-ui/',
            'redoc': '/api/schema/redoc/',
            'schema': '/api/schema/',
        }
    })


urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/', include('products.urls')),
    path('api/', include('orders.urls')),
    # Swagger / OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
