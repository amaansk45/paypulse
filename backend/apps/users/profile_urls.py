from django.urls import path
from .views import CurrentUserProfileView, UploadAvatarView, SubmitKYCView

urlpatterns = [
    path('', CurrentUserProfileView.as_view(), name='profile-detail'),
    path('avatar/', UploadAvatarView.as_view(), name='profile-avatar'),
    path('kyc/', SubmitKYCView.as_view(), name='profile-kyc'),
]
