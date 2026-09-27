from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.db.models import Q
from django.utils.dateparse import parse_date

from common.response import api_success, api_error
from common.permissions import IsOwnerOrAdmin
from .models import Transaction, PaymentRequest, Refund
from .services import PaymentService
from .serializers import (
    TransactionSerializer,
    SendMoneySerializer,
    CreatePaymentRequestSerializer,
    AcceptPaymentRequestSerializer,
    PaymentRequestSerializer,
    CreateRefundSerializer,
    RefundSerializer
)


class StandardResultsPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class SendMoneyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendMoneySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        txn = PaymentService.send_money(
            sender=request.user,
            recipient_identifier=serializer.validated_data['recipient'],
            amount=serializer.validated_data['amount'],
            note=serializer.validated_data.get('note', ''),
            pin=serializer.validated_data.get('pin'),
            idempotency_key=serializer.validated_data.get('idempotency_key'),
            payment_method='WALLET',
            request=request
        )

        txn_serializer = TransactionSerializer(txn, context={'request': request})
        return api_success(
            data=txn_serializer.data,
            message=f"Successfully sent {txn.currency} {txn.amount:.2f} to {txn.receiver.username}."
        )


class TransactionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        queryset = Transaction.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).select_related('sender', 'receiver', 'sender__profile', 'receiver__profile').distinct()

        # Filtering
        txn_type = request.query_params.get('type')
        if txn_type:
            queryset = queryset.filter(transaction_type=txn_type)

        txn_status = request.query_params.get('status')
        if txn_status:
            queryset = queryset.filter(status=txn_status)

        search_query = request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(transaction_id__icontains=search_query) |
                Q(reference_id__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(sender__username__icontains=search_query) |
                Q(receiver__username__icontains=search_query)
            )

        start_date = request.query_params.get('start_date')
        if start_date:
            d = parse_date(start_date)
            if d:
                queryset = queryset.filter(created_at__date__gte=d)

        end_date = request.query_params.get('end_date')
        if end_date:
            d = parse_date(end_date)
            if d:
                queryset = queryset.filter(created_at__date__lte=d)

        # Ordering
        order_by = request.query_params.get('ordering', '-created_at')
        if order_by in ['created_at', '-created_at', 'amount', '-amount']:
            queryset = queryset.order_by(order_by)

        paginator = StandardResultsPagination()
        paginated_txns = paginator.paginate_queryset(queryset, request)
        serializer = TransactionSerializer(paginated_txns, many=True, context={'request': request})

        return paginator.get_paginated_response(serializer.data)


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk_or_txnid):
        user = request.user
        txn = Transaction.objects.filter(
            Q(id__exact=pk_or_txnid if len(str(pk_or_txnid)) == 36 else None) |
            Q(transaction_id=pk_or_txnid)
        ).select_related('sender', 'receiver', 'sender__profile', 'receiver__profile').first()

        if not txn:
            return api_error(message="Transaction not found.", status_code=status.HTTP_404_NOT_FOUND)

        if txn.sender != user and txn.receiver != user and getattr(user, 'role', '') != 'ADMIN' and not user.is_staff:
            return api_error(message="Unauthorized to view this transaction.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = TransactionSerializer(txn, context={'request': request})
        return api_success(data=serializer.data)


class TransactionReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk_or_txnid):
        user = request.user
        txn = Transaction.objects.filter(
            Q(id__exact=pk_or_txnid if len(str(pk_or_txnid)) == 36 else None) |
            Q(transaction_id=pk_or_txnid)
        ).select_related('sender', 'receiver', 'sender__profile', 'receiver__profile').first()

        if not txn:
            return api_error(message="Transaction record not found.", status_code=status.HTTP_404_NOT_FOUND)

        if txn.sender != user and txn.receiver != user and getattr(user, 'role', '') != 'ADMIN' and not user.is_staff:
            return api_error(message="Unauthorized to access this receipt.", status_code=status.HTTP_403_FORBIDDEN)

        sender_name = getattr(txn.sender.profile, 'full_name', txn.sender.username) if txn.sender else "External Gateway"
        receiver_name = getattr(txn.receiver.profile, 'full_name', txn.receiver.username) if txn.receiver else "External Beneficiary"

        receipt_data = {
            "application_name": "PayPulse Digital Payment Network",
            "receipt_id": f"REC-{txn.transaction_id}",
            "transaction_id": txn.transaction_id,
            "reference_id": txn.reference_id,
            "date": txn.completed_at.strftime('%Y-%m-%d %H:%M:%S UTC') if txn.completed_at else txn.created_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
            "amount": str(txn.amount),
            "fee": str(txn.fee),
            "net_amount": str(txn.net_amount),
            "currency": txn.currency,
            "status": txn.status,
            "payment_method": txn.payment_method,
            "transaction_type": txn.transaction_type,
            "note": txn.description,
            "sender": {
                "name": sender_name,
                "username": txn.sender.username if txn.sender else None,
                "email": txn.sender.email if txn.sender else None,
            },
            "receiver": {
                "name": receiver_name,
                "username": txn.receiver.username if txn.receiver else None,
                "email": txn.receiver.email if txn.receiver else None,
            }
        }
        return api_success(data=receipt_data)


class PaymentRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tab = request.query_params.get('tab', 'all')

        if tab == 'incoming':
            qs = PaymentRequest.objects.filter(payer=user)
        elif tab == 'outgoing':
            qs = PaymentRequest.objects.filter(requester=user)
        else:
            qs = PaymentRequest.objects.filter(Q(payer=user) | Q(requester=user))

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        paginator = StandardResultsPagination()
        paginated_qs = paginator.paginate_queryset(qs, request)
        serializer = PaymentRequestSerializer(paginated_qs, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = CreatePaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        req = PaymentService.create_payment_request(
            requester=request.user,
            payer_identifier=serializer.validated_data['payer'],
            amount=serializer.validated_data['amount'],
            note=serializer.validated_data.get('note', ''),
            request=request
        )

        out_serializer = PaymentRequestSerializer(req, context={'request': request})
        return api_success(
            data=out_serializer.data,
            message=f"Payment request sent to {req.payer.username}.",
            status_code=status.HTTP_201_CREATED
        )


class PaymentRequestAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        serializer = AcceptPaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        txn = PaymentService.accept_payment_request(
            payer=request.user,
            request_id=request_id,
            pin=serializer.validated_data.get('pin'),
            request=request
        )

        return api_success(
            data=TransactionSerializer(txn, context={'request': request}).data,
            message=f"Request accepted and payment of {txn.currency} {txn.amount} completed."
        )


class PaymentRequestRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        req = PaymentService.reject_payment_request(
            payer=request.user,
            request_id=request_id,
            request=request
        )

        return api_success(
            data=PaymentRequestSerializer(req, context={'request': request}).data,
            message="Payment request declined."
        )


class RefundListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        refunds = Refund.objects.filter(requester=request.user).select_related('transaction')
        serializer = RefundSerializer(refunds, many=True)
        return api_success(data=serializer.data)

    def post(self, request):
        serializer = CreateRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rfd = PaymentService.request_refund(
            requester=request.user,
            transaction_id=serializer.validated_data['transaction_id'],
            amount=serializer.validated_data['amount'],
            reason=serializer.validated_data['reason'],
            request=request
        )

        return api_success(
            data=RefundSerializer(rfd).data,
            message="Refund request submitted successfully and is pending review.",
            status_code=status.HTTP_201_CREATED
        )
