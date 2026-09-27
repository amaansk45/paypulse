from django.urls import path
from .views import (
    SendMoneyView,
    PaymentRequestListCreateView,
    PaymentRequestAcceptView,
    PaymentRequestRejectView,
    RefundListCreateView
)

urlpatterns = [
    path('send/', SendMoneyView.as_view(), name='payment-send'),
    path('request/', PaymentRequestListCreateView.as_view(), name='payment-request-list-create'),
    path('request/<str:request_id>/accept/', PaymentRequestAcceptView.as_view(), name='payment-request-accept'),
    path('request/<str:request_id>/reject/', PaymentRequestRejectView.as_view(), name='payment-request-reject'),
    path('refunds/', RefundListCreateView.as_view(), name='payment-refund-list-create'),
]
