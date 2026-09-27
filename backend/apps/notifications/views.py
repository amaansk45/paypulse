from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from common.response import api_success, api_error
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        notifications = Notification.objects.filter(user=user)

        is_read_filter = request.query_params.get('is_read')
        if is_read_filter is not None:
            if is_read_filter.lower() in ['true', '1']:
                notifications = notifications.filter(is_read=True)
            elif is_read_filter.lower() in ['false', '0']:
                notifications = notifications.filter(is_read=False)

        unread_count = Notification.objects.filter(user=user, is_read=False).count()
        serializer = NotificationSerializer(notifications[:50], many=True)

        return api_success(
            data=serializer.data,
            unread_count=unread_count
        )


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notif = Notification.objects.filter(id=pk, user=request.user).first()
        if not notif:
            return api_error(message="Notification not found.", status_code=status.HTTP_404_NOT_FOUND)

        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return api_success(message="Notification marked as read.")


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return api_success(message="All notifications marked as read.")


class NotificationDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        notif = Notification.objects.filter(id=pk, user=request.user).first()
        if not notif:
            return api_error(message="Notification not found.", status_code=status.HTTP_404_NOT_FOUND)

        notif.delete()
        return api_success(message="Notification deleted.")
