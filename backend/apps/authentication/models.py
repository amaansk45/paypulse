import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from apps.users.models import User
from common.utils import generate_otp_code


class OTP(models.Model):
    PURPOSE_CHOICES = (
        ('REGISTRATION', 'Registration'),
        ('LOGIN', 'Login'),
        ('RESET_PASSWORD', 'Reset Password'),
        ('TRANSACTION', 'Transaction'),
        ('VERIFICATION', 'Verification'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps', null=True, blank=True)
    identifier = models.CharField(max_length=150, db_index=True)
    code = models.CharField(max_length=8)
    purpose = models.CharField(max_length=30, choices=PURPOSE_CHOICES)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'OTP'
        verbose_name_plural = 'OTPs'
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP({self.purpose}) for {self.identifier} - Used: {self.is_used}"

    def is_valid(self) -> bool:
        return (not self.is_used) and (timezone.now() <= self.expires_at)

    @classmethod
    def create_otp(cls, identifier: str, purpose: str, user=None, expiry_minutes: int = None) -> 'OTP':
        """
        Invalidates any pending unused OTPs for this identifier/purpose and creates a new one.
        """
        if expiry_minutes is None:
            expiry_minutes = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)

        # Invalidate previous unused OTPs
        cls.objects.filter(identifier=identifier, purpose=purpose, is_used=False).update(is_used=True)

        code = generate_otp_code(6)
        expires_at = timezone.now() + timedelta(minutes=expiry_minutes)

        return cls.objects.create(
            user=user,
            identifier=identifier,
            code=code,
            purpose=purpose,
            expires_at=expires_at
        )


class DeviceSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='device_sessions')
    device_name = models.CharField(max_length=150, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-last_active']

    def __str__(self):
        return f"{self.user.username} - {self.device_name or 'Web Session'} ({self.ip_address})"
