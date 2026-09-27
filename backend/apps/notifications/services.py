import logging
from .models import Notification

logger = logging.getLogger(__name__)


def send_notification(user, title: str, message: str, notification_type: str = "SYSTEM", data: dict = None) -> Notification:
    """
    Creates an in-app notification record and dispatches any real-time alerts.
    """
    try:
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            data=data or {}
        )
        return notification
    except Exception as e:
        logger.error(f"Failed to deliver notification to user {user.id}: {str(e)}")
        return None
