from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from django.db.models import Q

from common.response import api_success, api_error
from apps.audit.services import record_audit_log
from .models import User, Profile
from .serializers import UserSerializer, ProfileSerializer, PublicUserSerializer, KYCSubmissionSerializer


class CurrentUserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return api_success(data=serializer.data)

    def put(self, request):
        return self.patch(request)

    def patch(self, request):
        user = request.user
        profile = user.profile

        # Update user attributes
        phone = request.data.get('phone_number')
        if phone is not None:
            clean_phone = phone.strip()
            if clean_phone and User.objects.filter(phone_number=clean_phone).exclude(id=user.id).exists():
                return api_error(message="Phone number already in use by another account.")
            user.phone_number = clean_phone or None
            user.save(update_fields=['phone_number'])

        # Update profile attributes
        profile_serializer = ProfileSerializer(profile, data=request.data, partial=True)
        profile_serializer.is_valid(raise_exception=True)
        profile_serializer.save()

        record_audit_log(request=request, user=user, action="PROFILE_UPDATED", status="SUCCESS")
        user_serializer = UserSerializer(user)
        return api_success(data=user_serializer.data, message="Profile updated successfully.")


class UploadAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('avatar')
        if not file_obj:
            return api_error(message="No avatar image file provided.")

        profile = request.user.profile
        profile.avatar = file_obj
        profile.save(update_fields=['avatar'])

        record_audit_log(request=request, user=request.user, action="AVATAR_UPLOADED", status="SUCCESS")
        return api_success(
            data={"avatar_url": profile.avatar.url},
            message="Profile image updated successfully."
        )


class SubmitKYCView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = KYCSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = request.user.profile
        profile.kyc_document_type = serializer.validated_data['document_type']
        profile.kyc_document_number = serializer.validated_data['document_number']
        if serializer.validated_data.get('address'):
            profile.address = serializer.validated_data['address']
        if serializer.validated_data.get('city'):
            profile.city = serializer.validated_data['city']

        profile.kyc_status = 'PENDING'
        profile.save()

        record_audit_log(request=request, user=request.user, action="KYC_SUBMITTED", status="SUCCESS")
        return api_success(
            data={"kyc_status": profile.kyc_status},
            message="KYC documents submitted successfully. Verification is pending."
        )


class SearchUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return api_success(data=[])

        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(phone_number__icontains=query) |
            Q(profile__full_name__icontains=query)
        ).exclude(id=request.user.id).filter(
            is_active=True,
            account_status='ACTIVE'
        )[:10]

        serializer = PublicUserSerializer(users, many=True)
        return api_success(data=serializer.data)
