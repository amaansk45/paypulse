from decimal import Decimal
from rest_framework import serializers
from apps.users.serializers import PublicUserSerializer
from .models import QRCode


class QRCodeSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    qr_image_url = serializers.SerializerMethodField()

    class Meta:
        model = QRCode
        fields = (
            'id',
            'payment_identifier',
            'qr_type',
            'amount',
            'currency',
            'note',
            'qr_image_url',
            'expires_at',
            'is_used',
            'user',
            'created_at'
        )

    def get_qr_image_url(self, obj):
        if obj.qr_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_image.url)
            return obj.qr_image.url
        return None


class GenerateDynamicQRSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)
    expiry_minutes = serializers.IntegerField(required=False, default=30, min_value=1, max_value=1440)


class ValidateQRSerializer(serializers.Serializer):
    qr_data = serializers.CharField(max_length=1000)


class QRPaySerializer(serializers.Serializer):
    qr_data = serializers.CharField(max_length=1000)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal('1.00'))
    pin = serializers.CharField(required=False, allow_blank=True, max_length=6)
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)
