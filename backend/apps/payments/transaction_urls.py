from django.urls import path
from .views import TransactionListView, TransactionDetailView, TransactionReceiptView

urlpatterns = [
    path('', TransactionListView.as_view(), name='transaction-list'),
    path('<str:pk_or_txnid>/', TransactionDetailView.as_view(), name='transaction-detail'),
    path('<str:pk_or_txnid>/receipt/', TransactionReceiptView.as_view(), name='transaction-receipt'),
]
