from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db.models import Sum

from common.response import api_success, api_error
from apps.payments.services import PaymentService
from apps.payments.gateway import SandboxPaymentGateway
from .models import Wallet, WalletLedger
from .services import WalletService
from .serializers import (
    WalletSerializer,
    WalletLedgerSerializer,
    AddMoneyInitiateSerializer,
    AddMoneyCompleteSerializer
)


class WalletDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet = WalletService.get_or_create_wallet(request.user)
        serializer = WalletSerializer(wallet)

        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Monthly metrics
        monthly_spent = wallet.ledger_entries.filter(
            entry_type='DEBIT',
            created_at__gte=start_of_month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        monthly_income = wallet.ledger_entries.filter(
            entry_type='CREDIT',
            created_at__gte=start_of_month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        recent_entries = wallet.ledger_entries.all()[:5]

        data = {
            **serializer.data,
            "metrics": {
                "monthly_spent": str(monthly_spent),
                "monthly_income": str(monthly_income),
                "available_daily_limit": str(max(Decimal('0.00'), wallet.daily_limit - monthly_spent))
            },
            "recent_ledger": WalletLedgerSerializer(recent_entries, many=True).data
        }
        return api_success(data=data)


class WalletLedgerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet = WalletService.get_or_create_wallet(request.user)
        entries = wallet.ledger_entries.all()

        entry_type = request.query_params.get('type')
        if entry_type in ['CREDIT', 'DEBIT']:
            entries = entries.filter(entry_type=entry_type)

        ref_type = request.query_params.get('reference_type')
        if ref_type:
            entries = entries.filter(reference_type=ref_type)

        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 20
        paginated_entries = paginator.paginate_queryset(entries, request)

        serializer = WalletLedgerSerializer(paginated_entries, many=True)
        return paginator.get_paginated_response(serializer.data)


class AddMoneyInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddMoneyInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = PaymentService.add_money_initiate(
            user=request.user,
            amount=serializer.validated_data['amount'],
            payment_method=serializer.validated_data.get('payment_method', 'SANDBOX_GATEWAY'),
            request=request
        )

        return api_success(
            data=result,
            message="Sandbox payment intent initialized successfully."
        )


class AddMoneyCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddMoneyCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        txn = PaymentService.add_money_complete(
            user=request.user,
            transaction_id=serializer.validated_data['transaction_id'],
            gateway_payment_id=serializer.validated_data['gateway_payment_id'],
            gateway_order_id=serializer.validated_data['gateway_order_id'],
            gateway_signature=serializer.validated_data['gateway_signature'],
            payment_method=serializer.validated_data.get('payment_method', 'CARD'),
            request=request
        )

        from apps.payments.serializers import TransactionSerializer
        return api_success(
            data=TransactionSerializer(txn).data,
            message=f"Wallet credited successfully with {txn.currency} {txn.amount:.2f}."
        )


class SandboxMockPayView(APIView):
    """
    Convenience sandbox endpoint: simulates instant test card/UPI payment completion
    without third-party network calls. Ideal for frontend testing and demos.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        transaction_id = request.data.get('transaction_id')
        order_id = request.data.get('order_id')
        payment_method = request.data.get('payment_method', 'CARD')

        if not transaction_id or not order_id:
            return api_error(message="transaction_id and order_id are required.")

        mock_confirmation = SandboxPaymentGateway.generate_mock_payment_confirmation(order_id)

        txn = PaymentService.add_money_complete(
            user=request.user,
            transaction_id=transaction_id,
            gateway_payment_id=mock_confirmation['payment_id'],
            gateway_order_id=mock_confirmation['order_id'],
            gateway_signature=mock_confirmation['signature'],
            payment_method=payment_method,
            request=request
        )

        from apps.payments.serializers import TransactionSerializer
        return api_success(
            data=TransactionSerializer(txn).data,
            message=f"Sandbox test payment simulated successfully! Wallet credited with {txn.currency} {txn.amount}."
        )
