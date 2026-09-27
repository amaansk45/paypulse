from rest_framework import serializers
from .models import User, Profile
from common.utils import mask_email, mask_phone


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = (
            'full_name',
            'avatar',
            'date_of_birth',
            'address',
            'city',
            'country',
            'kyc_status',
            'kyc_document_type',
            'kyc_document_number',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('kyc_status', 'created_at', 'updated_at')


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    wallet_number = serializers.SerializerMethodField()
    wallet_balance = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'phone_number',
            'role',
            'account_status',
            'is_verified',
            'is_pin_set',
            'profile',
            'wallet_number',
            'wallet_balance',
            'date_joined'
        )
        read_only_fields = ('id', 'role', 'account_status', 'is_verified', 'is_pin_set', 'date_joined')

    def get_wallet_number(self, obj):
        return getattr(obj.wallet, 'wallet_number', None) if hasattr(obj, 'wallet') else None

    def get_wallet_balance(self, obj):
        return str(getattr(obj.wallet, 'balance', '0.00')) if hasattr(obj, 'wallet') else '0.00'


class PublicUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='profile.full_name', read_only=True)
    avatar = serializers.ImageField(source='profile.avatar', read_only=True)
    masked_email = serializers.SerializerMethodField()
    masked_phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name', 'avatar', 'masked_email', 'masked_phone')

    def get_masked_email(self, obj):
        return mask_email(obj.email)

    def get_masked_phone(self, obj):
        return mask_phone(obj.phone_number) if obj.phone_number else None


class KYCSubmissionSerializer(serializers.Serializer):
    document_type = serializers.CharField(max_length=50)
    document_number = serializers.CharField(max_length=50)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
