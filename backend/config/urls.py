from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from common.response import api_success


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check and platform status endpoint.
    """
    return api_success(
        data={
            "service": "PayPulse Digital Payment API",
            "version": "1.0.0",
            "status": "operational",
            "environment": "development" if settings.DEBUG else "production",
        },
        message="PayPulse API is healthy and operational."
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='api-health'),

    # API Modules
    path('api/auth/', include('apps.authentication.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/profile/', include('apps.users.profile_urls')),
    path('api/wallet/', include('apps.wallets.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/transactions/', include('apps.payments.transaction_urls')),
    path('api/qr/', include('apps.qrcodes.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/admin/', include('apps.admin_portal.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
