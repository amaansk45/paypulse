from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework import status

from common.response import api_success, api_error
from common.permissions import IsAdminUserRole
from apps.users.models import User, Profile
from apps.users.serializers import UserSerializer
from apps.wallets.models import Wallet, WalletLedger
from apps.wallets.serializers import WalletSerializer, WalletLedgerSerializer
from apps.payments.models import Transaction, Refund
from apps.payments.serializers import TransactionSerializer, RefundSerializer
from apps.payments.services import PaymentService
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer
from apps.audit.services import record_audit_log


class AdminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # Users stats
        total_users = User.objects.count()
        active_users = User.objects.filter(account_status='ACTIVE').count()
        suspended_users = User.objects.filter(account_status__in=['SUSPENDED', 'BLOCKED']).count()
        verified_users = User.objects.filter(is_verified=True).count()

        # Transactions stats
        total_transactions = Transaction.objects.count()
        successful_transactions = Transaction.objects.filter(status='SUCCESS').count()
        failed_transactions = Transaction.objects.filter(status='FAILED').count()
        total_volume = Transaction.objects.filter(status='SUCCESS').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Wallet stats
        total_system_balance = Wallet.objects.aggregate(total=Sum('balance'))['total'] or Decimal('0.00')

        # Refunds stats
        pending_refunds = Refund.objects.filter(status__in=['REQUESTED', 'UNDER_REVIEW']).count()

        # 7-day daily activity chart
        daily_chart = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            day_txns = Transaction.objects.filter(created_at__date=day, status='SUCCESS')
            vol = day_txns.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            count = day_txns.count()
            daily_chart.append({
                "date": day.strftime('%b %d'),
                "volume": float(vol),
                "count": count
            })

        return api_success(data={
            "users": {
                "total": total_users,
                "active": active_users,
                "suspended": suspended_users,
                "verified": verified_users,
            },
            "transactions": {
                "total": total_transactions,
                "successful": successful_transactions,
                "failed": failed_transactions,
                "total_volume": str(total_volume),
            },
            "wallets": {
                "total_system_balance": str(total_system_balance),
            },
            "refunds": {
                "pending_count": pending_refunds,
            },
            "daily_chart": daily_chart
        })


class AdminUserListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        queryset = User.objects.select_related('profile', 'wallet').order_by('-date_joined')

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(account_status=status_filter)

        role_filter = request.query_params.get('role')
        if role_filter:
            queryset = queryset.filter(role=role_filter)

        search_query = request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(username__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(phone_number__icontains=search_query) |
                Q(profile__full_name__icontains=search_query)
            )

        paginator = AdminPagination()
        paginated_users = paginator.paginate_queryset(queryset, request)
        serializer = UserSerializer(paginated_users, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request, user_id):
        target_user = User.objects.filter(id=user_id).select_related('profile', 'wallet').first()
        if not target_user:
            return api_error(message="User not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = UserSerializer(target_user)
        recent_txns = Transaction.objects.filter(
            Q(sender=target_user) | Q(receiver=target_user)
        )[:10]

        wallet = getattr(target_user, 'wallet', None)
        recent_ledger = wallet.ledger_entries.all()[:10] if wallet else []

        data = {
            "user": serializer.data,
            "recent_transactions": TransactionSerializer(recent_txns, many=True).data,
            "recent_ledger": WalletLedgerSerializer(recent_ledger, many=True).data
        }
        return api_success(data=data)


class AdminUserStatusUpdateView(APIView):
    permission_classes = [IsAdminUserRole]

    def patch(self, request, user_id):
        target_user = User.objects.filter(id=user_id).first()
        if not target_user:
            return api_error(message="User not found.", status_code=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', '').upper()
        reason = request.data.get('reason', '')

        if action == 'SUSPEND':
            target_user.account_status = 'SUSPENDED'
            target_user.save(update_fields=['account_status'])
        elif action == 'ACTIVATE':
            target_user.account_status = 'ACTIVE'
            target_user.is_active = True
            target_user.locked_until = None
            target_user.failed_login_attempts = 0
            target_user.save()
        elif action == 'BLOCK':
            target_user.account_status = 'BLOCKED'
            target_user.is_active = False
            target_user.save(update_fields=['account_status', 'is_active'])
        elif action == 'VERIFY_KYC':
            target_user.is_verified = True
            target_user.save(update_fields=['is_verified'])
            if hasattr(target_user, 'profile'):
                target_user.profile.kyc_status = 'VERIFIED'
                target_user.profile.save(update_fields=['kyc_status'])
        elif action == 'REJECT_KYC':
            if hasattr(target_user, 'profile'):
                target_user.profile.kyc_status = 'REJECTED'
                target_user.profile.save(update_fields=['kyc_status'])
        else:
            return api_error(message="Invalid status action.")

        record_audit_log(
            request=request,
            user=request.user,
            action=f"ADMIN_USER_{action}",
            status="SUCCESS",
            reference_id=str(target_user.id),
            metadata={"target_username": target_user.username, "reason": reason}
        )

        return api_success(
            data=UserSerializer(target_user).data,
            message=f"User {target_user.username} status updated to {target_user.account_status}."
        )


class AdminTransactionListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        queryset = Transaction.objects.select_related('sender', 'receiver').order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        type_filter = request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(transaction_type=type_filter)

        search_query = request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(transaction_id__icontains=search_query) |
                Q(reference_id__icontains=search_query) |
                Q(sender__username__icontains=search_query) |
                Q(receiver__username__icontains=search_query)
            )

        paginator = AdminPagination()
        paginated_txns = paginator.paginate_queryset(queryset, request)
        serializer = TransactionSerializer(paginated_txns, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminRefundListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        queryset = Refund.objects.select_related('transaction', 'requester').order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        paginator = AdminPagination()
        paginated_refunds = paginator.paginate_queryset(queryset, request)
        serializer = RefundSerializer(paginated_refunds, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminRefundActionView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, refund_id):
        action = request.data.get('action')
        admin_notes = request.data.get('admin_notes', '')

        if not action:
            return api_error(message="Action ('APPROVE' or 'REJECT') is required.")

        rfd = PaymentService.process_refund(
            admin_user=request.user,
            refund_id=refund_id,
            action=action,
            admin_notes=admin_notes,
            request=request
        )

        return api_success(
            data=RefundSerializer(rfd).data,
            message=f"Refund {rfd.refund_id} has been {rfd.status.lower()}."
        )


class AdminAuditLogListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        queryset = AuditLog.objects.select_related('user').order_by('-timestamp')

        action_filter = request.query_params.get('action')
        if action_filter:
            queryset = queryset.filter(action__icontains=action_filter)

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        search_query = request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(action__icontains=search_query) |
                Q(reference_id__icontains=search_query) |
                Q(user__username__icontains=search_query)
            )

        paginator = AdminPagination()
        paginated_logs = paginator.paginate_queryset(queryset, request)
        serializer = AuditLogSerializer(paginated_logs, many=True)
        return paginator.get_paginated_response(serializer.data)
