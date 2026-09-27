from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from django.utils import timezone
from django.conf import settings

from apps.users.models import User
from apps.audit.services import record_audit_log
from apps.notifications.services import send_notification
from common.response import api_success, api_error
from common.utils import get_client_ip, get_user_agent
from .models import OTP, DeviceSession
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    VerifyOTPSerializer,
    ResendOTPSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer,
    SetTransactionPINSerializer,
    VerifyTransactionPINSerializer,
    DeviceSessionSerializer
)


def get_tokens_for_user(user: User):
    refresh = RefreshToken.for_user(user)
    refresh['username'] = user.username
    refresh['email'] = user.email
    refresh['role'] = user.role
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        tokens = get_tokens_for_user(user)

        # Record audit log & notification
        record_audit_log(request=request, user=user, action="USER_REGISTERED", status="SUCCESS")
        send_notification(
            user=user,
            title="Welcome to PayPulse!",
            message="Your account and digital wallet have been successfully created.",
            notification_type="REGISTRATION"
        )

        # Get the newly generated OTP for test/sandbox convenience
        latest_otp = OTP.objects.filter(identifier=user.email, purpose='REGISTRATION', is_used=False).first()

        data = {
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
                "is_verified": user.is_verified,
                "is_pin_set": user.is_pin_set
            },
            "tokens": tokens,
            # In sandbox / development, include debug OTP for immediate testing
            "debug_otp": latest_otp.code if (settings.DEBUG and latest_otp) else None
        }
        return api_success(data=data, message="Registration successful. Please verify your OTP.", status_code=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        tokens = get_tokens_for_user(user)

        # Record session
        ip = get_client_ip(request)
        ua = get_user_agent(request)
        DeviceSession.objects.create(
            user=user,
            ip_address=ip,
            user_agent=ua,
            device_name=ua.split()[0] if ua else "Web Browser"
        )

        record_audit_log(request=request, user=user, action="USER_LOGIN", status="SUCCESS")
        send_notification(
            user=user,
            title="New Sign-In Detected",
            message=f"Signed in from IP {ip} at {timezone.now().strftime('%H:%M:%S UTC')}.",
            notification_type="LOGIN"
        )

        data = {
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
                "is_verified": user.is_verified,
                "is_pin_set": user.is_pin_set,
                "full_name": getattr(user.profile, 'full_name', user.username),
                "avatar": user.profile.avatar.url if getattr(user.profile, 'avatar', None) else None,
            },
            "tokens": tokens
        }
        return api_success(data=data, message="Login successful.")


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            # Mark current session inactive
            ip = get_client_ip(request)
            DeviceSession.objects.filter(user=request.user, ip_address=ip, is_active=True).update(is_active=False)

            record_audit_log(request=request, user=request.user, action="USER_LOGOUT", status="SUCCESS")
            return api_success(message="Successfully logged out.")
        except Exception:
            return api_success(message="Session terminated.")


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp = serializer.validated_data['otp_instance']

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        # If registration or verification OTP, mark user as verified
        user = otp.user
        if not user:
            user = User.objects.filter(email__iexact=otp.identifier).first()

        if user and otp.purpose in ['REGISTRATION', 'VERIFICATION']:
            user.is_verified = True
            user.save(update_fields=['is_verified'])

        record_audit_log(request=request, user=user, action=f"OTP_VERIFIED_{otp.purpose}", status="SUCCESS")
        return api_success(message="OTP verified successfully.")


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier'].strip().lower()
        purpose = serializer.validated_data['purpose']

        user = User.objects.filter(email__iexact=identifier).first()
        new_otp = OTP.create_otp(identifier=identifier, purpose=purpose, user=user)

        data = {}
        if settings.DEBUG:
            data['debug_otp'] = new_otp.code

        return api_success(data=data, message="New OTP has been dispatched to your email/mobile.")


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()

        new_otp = OTP.create_otp(identifier=email, purpose='RESET_PASSWORD', user=user)

        data = {}
        if settings.DEBUG:
            data['debug_otp'] = new_otp.code

        record_audit_log(request=request, user=user, action="FORGOT_PASSWORD_REQUEST", status="SUCCESS")
        return api_success(data=data, message="Password reset code sent to your email.")


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp = serializer.validated_data['otp_instance']
        new_password = serializer.validated_data['new_password']

        user = otp.user or User.objects.filter(email__iexact=serializer.validated_data['email']).first()
        user.set_password(new_password)
        user.reset_failed_logins()
        user.save()

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        record_audit_log(request=request, user=user, action="PASSWORD_RESET_SUCCESS", status="SUCCESS")
        send_notification(
            user=user,
            title="Password Changed",
            message="Your account password was successfully reset using OTP verification.",
            notification_type="SECURITY_ALERT"
        )

        return api_success(message="Password has been reset successfully. You can now log in.")


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        if not user.check_password(serializer.validated_data['old_password']):
            return api_error(message="Current password is incorrect.", status_code=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        record_audit_log(request=request, user=user, action="PASSWORD_CHANGED", status="SUCCESS")
        send_notification(
            user=user,
            title="Security Alert: Password Changed",
            message="Your password was recently modified from your account settings.",
            notification_type="SECURITY_ALERT"
        )
        return api_success(message="Password updated successfully.")


class SetTransactionPINView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SetTransactionPINSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        user.set_pin(serializer.validated_data['pin'])

        record_audit_log(request=request, user=user, action="TRANSACTION_PIN_SET", status="SUCCESS")
        send_notification(
            user=user,
            title="Transaction PIN Configured",
            message="Your secure transaction PIN has been set. Use this to authorize high-value payments.",
            notification_type="SECURITY_ALERT"
        )
        return api_success(message="Transaction PIN has been updated successfully.")


class VerifyTransactionPINView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VerifyTransactionPINSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        if not user.is_pin_set:
            return api_error(message="No transaction PIN is currently set for this account.")

        is_valid = user.check_pin(serializer.validated_data['pin'])
        if not is_valid:
            return api_error(message="Invalid transaction PIN.", status_code=status.HTTP_400_BAD_REQUEST)

        return api_success(message="PIN verified successfully.")


class DeviceSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = DeviceSession.objects.filter(user=request.user)
        serializer = DeviceSessionSerializer(sessions, many=True)
        return api_success(data=serializer.data)

    def delete(self, request):
        # Terminate other sessions
        session_id = request.data.get("session_id")
        if session_id:
            DeviceSession.objects.filter(user=request.user, id=session_id).update(is_active=False)
        else:
            DeviceSession.objects.filter(user=request.user).update(is_active=False)
        return api_success(message="Session(s) terminated.")
