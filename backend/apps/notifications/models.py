import uuid
from django.db import models
from apps.users.models import User


class Notification(models.Model):
    NOTIFICATION_TYPE_CHOICES = (
        ('REGISTRATION', 'Registration'),
        ('LOGIN', 'Login Activity'),
        ('MONEY_SENT', 'Money Sent'),
        ('MONEY_RECEIVED', 'Money Received'),
        ('PAYMENT_REQUEST', 'Payment Request'),
        ('REQUEST_ACCEPTED', 'Payment Request Accepted'),
        ('REQUEST_REJECTED', 'Payment Request Rejected'),
        ('QR_PAYMENT', 'QR Payment'),
        ('ADD_MONEY', 'Wallet Top-up'),
        ('REFUND', 'Refund Update'),
        ('SECURITY_ALERT', 'Security Alert'),
        ('SYSTEM', 'System Announcement'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=150)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES, default='SYSTEM')
    is_read = models.BooleanField(default=False, db_index=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title} (Read: {self.is_read})"
