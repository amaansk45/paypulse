from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from common.response import api_success, api_error
from apps.payments.serializers import TransactionSerializer
from .models import QRCode
from .services import QRService
from .serializers import (
    QRCodeSerializer,
    GenerateDynamicQRSerializer,
    ValidateQRSerializer,
    QRPaySerializer
)


class MyQRCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qr_obj = QRService.get_or_create_personal_qr(request.user)
        serializer = QRCodeSerializer(qr_obj, context={'request': request})
        return api_success(data=serializer.data)


class GenerateDynamicQRCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateDynamicQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        qr_obj = QRService.create_dynamic_qr(
            user=request.user,
            amount=serializer.validated_data['amount'],
            note=serializer.validated_data.get('note', ''),
            expiry_minutes=serializer.validated_data.get('expiry_minutes', 30)
        )

        out_serializer = QRCodeSerializer(qr_obj, context={'request': request})
        return api_success(
            data=out_serializer.data,
            message="Dynamic QR invoice generated successfully.",
            status_code=status.HTTP_201_CREATED
        )


class ValidateQRCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ValidateQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validation_result = QRService.validate_qr(
            raw_identifier=serializer.validated_data['qr_data'],
            scanning_user=request.user
        )

        return api_success(
            data=validation_result,
            message="QR code verified successfully."
        )


class QRPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = QRPaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        txn = QRService.pay_via_qr(
            payer=request.user,
            raw_identifier=serializer.validated_data['qr_data'],
            amount=serializer.validated_data.get('amount'),
            pin=serializer.validated_data.get('pin'),
            note=serializer.validated_data.get('note', ''),
            request=request
        )

        return api_success(
            data=TransactionSerializer(txn, context={'request': request}).data,
            message=f"QR payment of {txn.currency} {txn.amount} processed successfully."
        )
