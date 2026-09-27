from django.urls import path
from .views import (
    WalletDetailView,
    WalletLedgerView,
    AddMoneyInitiateView,
    AddMoneyCompleteView,
    SandboxMockPayView
)

urlpatterns = [
    path('', WalletDetailView.as_view(), name='wallet-detail'),
    path('ledger/', WalletLedgerView.as_view(), name='wallet-ledger'),
    path('add-money/initiate/', AddMoneyInitiateView.as_view(), name='wallet-add-initiate'),
    path('add-money/complete/', AddMoneyCompleteView.as_view(), name='wallet-add-complete'),
    path('add-money/sandbox-mock/', SandboxMockPayView.as_view(), name='wallet-sandbox-mock'),
]
