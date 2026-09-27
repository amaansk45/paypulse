import logging
from .models import AuditLog
from common.utils import get_client_ip, get_user_agent

logger = logging.getLogger(__name__)


def record_audit_log(request=None, user=None, action="", status="SUCCESS", reference_id="", metadata=None):
    """
    Safely creates an immutable audit trail entry.
    """
    try:
        current_user = user
        ip = None
        ua = ""

        if request is not None:
            if current_user is None and getattr(request, 'user', None) and request.user.is_authenticated:
                current_user = request.user
            ip = get_client_ip(request)
            ua = get_user_agent(request)

        AuditLog.objects.create(
            user=current_user,
            action=action,
            status=status,
            ip_address=ip,
            user_agent=ua,
            reference_id=reference_id,
            metadata=metadata or {}
        )
    except Exception as e:
        logger.error(f"Failed to record audit log for action '{action}': {str(e)}")
