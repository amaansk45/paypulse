from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    VerifyOTPView,
    ResendOTPView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
    SetTransactionPINView,
    VerifyTransactionPINView,
    DeviceSessionsView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('verify-otp/', VerifyOTPView.as_view(), name='auth-verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='auth-resend-otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('set-pin/', SetTransactionPINView.as_view(), name='auth-set-pin'),
    path('verify-pin/', VerifyTransactionPINView.as_view(), name='auth-verify-pin'),
    path('sessions/', DeviceSessionsView.as_view(), name='auth-sessions'),
]
