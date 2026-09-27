from decimal import Decimal
from rest_framework import serializers
from apps.users.serializers import PublicUserSerializer
from .models import Transaction, PaymentRequest, Refund


class TransactionSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)
    receiver = PublicUserSerializer(read_only=True)
    is_debit = serializers.SerializerMethodField()
    counterparty = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            'id',
            'transaction_id',
            'reference_id',
            'sender',
            'receiver',
            'amount',
            'fee',
            'net_amount',
            'currency',
            'transaction_type',
            'payment_method',
            'status',
            'description',
            'failure_reason',
            'is_debit',
            'counterparty',
            'completed_at',
            'created_at'
        )

    def get_is_debit(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        # If user is sender, it is a debit (-); if receiver of send, it's credit (+)
        return obj.sender == request.user

    def get_counterparty(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return None
        if obj.sender == request.user:
            return PublicUserSerializer(obj.receiver).data if obj.receiver else {"username": "External"}
        else:
            return PublicUserSerializer(obj.sender).data if obj.sender else {"username": "Top-up Source"}


class SendMoneySerializer(serializers.Serializer):
    recipient = serializers.CharField(max_length=150)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)
    pin = serializers.CharField(required=False, allow_blank=True, max_length=6)
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=150)


class CreatePaymentRequestSerializer(serializers.Serializer):
    payer = serializers.CharField(max_length=150)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class AcceptPaymentRequestSerializer(serializers.Serializer):
    pin = serializers.CharField(required=False, allow_blank=True, max_length=6)


class PaymentRequestSerializer(serializers.ModelSerializer):
    requester = PublicUserSerializer(read_only=True)
    payer = PublicUserSerializer(read_only=True)
    is_incoming = serializers.SerializerMethodField()

    class Meta:
        model = PaymentRequest
        fields = (
            'id',
            'request_id',
            'requester',
            'payer',
            'amount',
            'currency',
            'note',
            'status',
            'is_incoming',
            'expires_at',
            'created_at',
            'updated_at'
        )

    def get_is_incoming(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.payer == request.user


class CreateRefundSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(max_length=60)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    reason = serializers.CharField(max_length=500)


class RefundSerializer(serializers.ModelSerializer):
    requester = PublicUserSerializer(read_only=True)
    transaction = TransactionSerializer(read_only=True)

    class Meta:
        model = Refund
        fields = (
            'id',
            'refund_id',
            'transaction',
            'requester',
            'amount',
            'currency',
            'reason',
            'admin_notes',
            'status',
            'reviewed_at',
            'created_at',
            'updated_at'
        )
