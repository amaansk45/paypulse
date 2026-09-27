from django.urls import path
from .views import MyQRCodeView, GenerateDynamicQRCodeView, ValidateQRCodeView, QRPayView

urlpatterns = [
    path('my/', MyQRCodeView.as_view(), name='qr-my'),
    path('generate/', GenerateDynamicQRCodeView.as_view(), name='qr-generate'),
    path('validate/', ValidateQRCodeView.as_view(), name='qr-validate'),
    path('pay/', QRPayView.as_view(), name='qr-pay'),
]
