import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.users.models import User
from common.utils import generate_transaction_id, generate_reference_id


class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = (
        ('SEND', 'Send Money'),
        ('RECEIVE', 'Receive Money'),
        ('ADD_MONEY', 'Add Money to Wallet'),
        ('WITHDRAW', 'Withdrawal'),
        ('PAYMENT_REQUEST', 'Payment Request'),
        ('QR_PAYMENT', 'QR Payment'),
        ('REFUND', 'Refund'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
        ('REFUNDED', 'Refunded'),
        ('REVERSED', 'Reversed'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('WALLET', 'Wallet Balance'),
        ('SANDBOX_GATEWAY', 'Sandbox Payment Gateway'),
        ('UPI', 'UPI Test Gateway'),
        ('CARD', 'Debit/Credit Card Sandbox'),
        ('NETBANKING', 'Netbanking Sandbox'),
        ('QR', 'QR Code Scan'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_id = models.CharField(max_length=40, unique=True, db_index=True)
    reference_id = models.CharField(max_length=64, blank=True, db_index=True)

    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_transactions')
    receiver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_transactions')

    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    net_amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='WALLET')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)

    description = models.TextField(blank=True)
    failure_reason = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=150, null=True, blank=True, unique=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['receiver', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.transaction_id} | {self.transaction_type} | {self.currency} {self.amount} | {self.status}"

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            self.transaction_id = generate_transaction_id()
        if not self.reference_id:
            self.reference_id = generate_reference_id(prefix="REF")
        if self.net_amount is None:
            self.net_amount = self.amount - self.fee
        super().save(*args, **kwargs)


class PaymentRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_id = models.CharField(max_length=40, unique=True, db_index=True)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='money_requests_created')
    payer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='money_requests_received')
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='INR')
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)

    transaction = models.OneToOneField(Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='request_source')
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Request {self.request_id} from {self.requester.username} to {self.payer.username} ({self.currency} {self.amount}) [{self.status}]"

    def save(self, *args, **kwargs):
        if not self.request_id:
            self.request_id = generate_reference_id(prefix="REQ")
        super().save(*args, **kwargs)


class Refund(models.Model):
    STATUS_CHOICES = (
        ('REQUESTED', 'Requested'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('PROCESSED', 'Processed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund_id = models.CharField(max_length=40, unique=True, db_index=True)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='refund_records')
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refund_requests')
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='INR')
    reason = models.TextField()
    admin_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REQUESTED', db_index=True)

    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='refunds_reviewed')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Refund {self.refund_id} for TXN {self.transaction.transaction_id} ({self.amount} {self.currency}) [{self.status}]"

    def save(self, *args, **kwargs):
        if not self.refund_id:
            self.refund_id = generate_reference_id(prefix="RFD")
        super().save(*args, **kwargs)
