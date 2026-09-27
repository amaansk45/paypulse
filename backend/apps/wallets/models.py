import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.users.models import User
from common.utils import generate_reference_id


class Wallet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    wallet_number = models.CharField(max_length=32, unique=True, db_index=True)
    balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=3, default='INR')
    is_frozen = models.BooleanField(default=False)
    daily_limit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('50000.00'))
    monthly_limit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('200000.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Wallet'
        verbose_name_plural = 'Wallets'

    def __str__(self):
        return f"Wallet {self.wallet_number} ({self.user.username}) - {self.currency} {self.balance}"

    @classmethod
    def generate_wallet_number(cls) -> str:
        return generate_reference_id(prefix="WAL")


class WalletLedger(models.Model):
    ENTRY_TYPE_CHOICES = (
        ('CREDIT', 'Credit (+)'),
        ('DEBIT', 'Debit (-)'),
    )

    REFERENCE_TYPE_CHOICES = (
        ('ADD_MONEY', 'Add Money'),
        ('SEND', 'Send Money'),
        ('RECEIVE', 'Receive Money'),
        ('PAYMENT_REQUEST', 'Payment Request'),
        ('QR_PAYMENT', 'QR Payment'),
        ('WITHDRAW', 'Withdrawal'),
        ('REFUND', 'Refund'),
        ('ADJUSTMENT', 'Administrative Adjustment'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='ledger_entries')
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES)
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    balance_before = models.DecimalField(max_digits=14, decimal_places=2)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    reference_type = models.CharField(max_length=30, choices=REFERENCE_TYPE_CHOICES)
    reference_id = models.CharField(max_length=100, db_index=True)
    idempotency_key = models.CharField(max_length=150, null=True, blank=True, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Wallet Ledger Entry'
        verbose_name_plural = 'Wallet Ledger Entries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', 'created_at']),
            models.Index(fields=['reference_type', 'reference_id']),
        ]

    def __str__(self):
        sign = "+" if self.entry_type == 'CREDIT' else "-"
        return f"{self.wallet.wallet_number} | {sign}{self.wallet.currency} {self.amount} | {self.reference_type} | After: {self.balance_after}"
