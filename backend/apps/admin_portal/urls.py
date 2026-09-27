from django.urls import path
from .views import (
    AdminDashboardStatsView,
    AdminUserListView,
    AdminUserDetailView,
    AdminUserStatusUpdateView,
    AdminTransactionListView,
    AdminRefundListView,
    AdminRefundActionView,
    AdminAuditLogListView
)

urlpatterns = [
    path('stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('users/', AdminUserListView.as_view(), name='admin-users-list'),
    path('users/<uuid:user_id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('users/<uuid:user_id>/status/', AdminUserStatusUpdateView.as_view(), name='admin-user-status'),
    path('transactions/', AdminTransactionListView.as_view(), name='admin-transactions-list'),
    path('refunds/', AdminRefundListView.as_view(), name='admin-refunds-list'),
    path('refunds/<str:refund_id>/action/', AdminRefundActionView.as_view(), name='admin-refund-action'),
    path('audit-logs/', AdminAuditLogListView.as_view(), name='admin-audit-logs'),
]
