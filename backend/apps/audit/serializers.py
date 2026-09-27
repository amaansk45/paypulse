from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            'id',
            'username',
            'user_email',
            'action',
            'status',
            'ip_address',
            'user_agent',
            'reference_id',
            'metadata',
            'timestamp'
        )
