from decimal import Decimal
from rest_framework import serializers
from .models import Wallet, WalletLedger


class WalletLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletLedger
        fields = (
            'id',
            'entry_type',
            'amount',
            'balance_before',
            'balance_after',
            'reference_type',
            'reference_id',
            'description',
            'created_at'
        )


class WalletSerializer(serializers.ModelSerializer):
    total_credited = serializers.SerializerMethodField()
    total_debited = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = (
            'id',
            'wallet_number',
            'balance',
            'currency',
            'is_frozen',
            'daily_limit',
            'monthly_limit',
            'total_credited',
            'total_debited',
            'created_at',
            'updated_at'
        )
        read_only_fields = fields

    def get_total_credited(self, obj):
        from django.db.models import Sum
        val = obj.ledger_entries.filter(entry_type='CREDIT').aggregate(total=Sum('amount'))['total']
        return str(val or Decimal('0.00'))

    def get_total_debited(self, obj):
        from django.db.models import Sum
        val = obj.ledger_entries.filter(entry_type='DEBIT').aggregate(total=Sum('amount'))['total']
        return str(val or Decimal('0.00'))


class AddMoneyInitiateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    payment_method = serializers.ChoiceField(
        choices=['SANDBOX_GATEWAY', 'CARD', 'UPI', 'NETBANKING'],
        default='SANDBOX_GATEWAY'
    )


class AddMoneyCompleteSerializer(serializers.Serializer):
    transaction_id = serializers.CharField()
    gateway_payment_id = serializers.CharField()
    gateway_order_id = serializers.CharField()
    gateway_signature = serializers.CharField()
    payment_method = serializers.CharField(default='CARD')
