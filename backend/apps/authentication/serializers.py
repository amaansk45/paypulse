import re
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from apps.users.models import User
from .models import OTP, DeviceSession


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone_number', 'password', 'confirm_password')

    def validate_username(self, value):
        val = value.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_.-]+$', val):
            raise serializers.ValidationError("Username can only contain letters, numbers, underscores, and hyphens.")
        if User.objects.filter(username__iexact=val).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return val

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        # Generate initial registration OTP
        OTP.create_otp(identifier=user.email, purpose='REGISTRATION', user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username_input = attrs.get('username', '').strip()
        password = attrs.get('password', '')

        # Lookup user by username or email
        user = User.objects.filter(username__iexact=username_input).first()
        if not user:
            user = User.objects.filter(email__iexact=username_input).first()

        if not user:
            raise serializers.ValidationError("Invalid credentials provided.")

        if user.is_account_locked():
            diff = user.locked_until - timezone.now()
            mins = max(1, int(diff.total_seconds() / 60))
            raise serializers.ValidationError(f"Account locked due to consecutive failed attempts. Try again in {mins} minutes.")

        if not user.check_password(password):
            user.record_login_failure()
            remaining = getattr(user, 'MAX_FAILED_LOGIN_ATTEMPTS', 5) - user.failed_login_attempts
            if user.is_account_locked():
                raise serializers.ValidationError("Account has been locked due to excessive failed attempts.")
            raise serializers.ValidationError(f"Invalid credentials. {remaining} attempt(s) remaining.")

        if not user.is_active or user.account_status != 'ACTIVE':
            raise serializers.ValidationError("Your account has been suspended. Please contact support.")

        user.reset_failed_logins()
        attrs['user'] = user
        return attrs


class VerifyOTPSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    code = serializers.CharField(max_length=8)
    purpose = serializers.ChoiceField(choices=OTP.PURPOSE_CHOICES)

    def validate(self, attrs):
        identifier = attrs.get('identifier').strip().lower()
        code = attrs.get('code').strip()
        purpose = attrs.get('purpose')

        otp = OTP.objects.filter(
            identifier=identifier,
            code=code,
            purpose=purpose,
            is_used=False
        ).first()

        if not otp:
            raise serializers.ValidationError("Invalid OTP code or identifier.")

        if not otp.is_valid():
            raise serializers.ValidationError("This OTP has expired. Please request a new code.")

        attrs['otp_instance'] = otp
        return attrs


class ResendOTPSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    purpose = serializers.ChoiceField(choices=OTP.PURPOSE_CHOICES)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        val = value.strip().lower()
        if not User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("No account is associated with this email address.")
        return val


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=8)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        if attrs.get('new_password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs['new_password'])

        email = attrs.get('email').strip().lower()
        code = attrs.get('otp_code').strip()

        otp = OTP.objects.filter(
            identifier=email,
            code=code,
            purpose='RESET_PASSWORD',
            is_used=False
        ).first()

        if not otp or not otp.is_valid():
            raise serializers.ValidationError({"otp_code": "Invalid or expired OTP code."})

        attrs['otp_instance'] = otp
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        if attrs.get('new_password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        validate_password(attrs['new_password'])
        return attrs


class SetTransactionPINSerializer(serializers.Serializer):
    pin = serializers.CharField(min_length=4, max_length=6)
    confirm_pin = serializers.CharField(min_length=4, max_length=6)

    def validate(self, attrs):
        pin = attrs.get('pin', '').strip()
        if not pin.isdigit():
            raise serializers.ValidationError({"pin": "Transaction PIN must contain only digits."})
        if pin != attrs.get('confirm_pin', '').strip():
            raise serializers.ValidationError({"confirm_pin": "PINs do not match."})
        return attrs


class VerifyTransactionPINSerializer(serializers.Serializer):
    pin = serializers.CharField(min_length=4, max_length=6)


class DeviceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceSession
        fields = ('id', 'device_name', 'ip_address', 'user_agent', 'is_active', 'last_active', 'created_at')
