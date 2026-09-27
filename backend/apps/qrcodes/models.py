import uuid
import hmac
import hashlib
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.users.models import User
from common.utils import generate_payment_identifier


class QRCode(models.Model):
    QR_TYPE_CHOICES = (
        ('PERSONAL', 'Personal User QR'),
        ('DYNAMIC', 'Dynamic Invoice QR'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='qr_codes')
    payment_identifier = models.CharField(max_length=64, unique=True, db_index=True)
    qr_type = models.CharField(max_length=20, choices=QR_TYPE_CHOICES, default='PERSONAL')

    amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='INR')
    note = models.CharField(max_length=255, blank=True)

    signature = models.CharField(max_length=128, blank=True)
    is_used = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    qr_image = models.ImageField(upload_to='qrcodes/', null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"QR {self.payment_identifier} ({self.qr_type}) - {self.user.username}"

    def save(self, *args, **kwargs):
        if not self.payment_identifier:
            self.payment_identifier = generate_payment_identifier()
        if not self.signature:
            self.signature = self.compute_signature()
        super().save(*args, **kwargs)

    def compute_signature(self) -> str:
        """
        Creates an HMAC SHA-256 signature to protect QR payload integrity.
        """
        key = getattr(settings, 'SECRET_KEY', 'default-key').encode('utf-8')
        raw_msg = f"{self.user_id}:{self.payment_identifier}:{self.qr_type}:{self.amount}:{self.expires_at}"
        return hmac.new(key, raw_msg.encode('utf-8'), hashlib.sha256).hexdigest()

    def is_valid_for_payment(self) -> tuple[bool, str]:
        """
        Validates QR code usability: active, unused (for dynamic), not expired, signature match.
        """
        if not self.is_active:
            return False, "This QR code has been deactivated."
        if self.qr_type == 'DYNAMIC' and self.is_used:
            return False, "This single-use dynamic QR code has already been redeemed."
        if self.expires_at and timezone.now() > self.expires_at:
            return False, "This QR code has expired."
        expected_sig = self.compute_signature()
        if not hmac.compare_digest(self.signature, expected_sig):
            return False, "Tampered QR code detected. Cryptographic signature invalid."
        return True, "Valid"
