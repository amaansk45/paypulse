from rest_framework import permissions


class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to authenticated users with ADMIN role or staff flag.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (getattr(request.user, 'role', '') == 'ADMIN' or request.user.is_staff or request.user.is_superuser)
        )


class IsActiveUser(permissions.BasePermission):
    """
    Allows access only to authenticated active users whose account is not suspended.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        account_status = getattr(request.user, 'account_status', 'ACTIVE')
        return request.user.is_active and account_status == 'ACTIVE'


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to allow only owners of an object or admins to access/edit.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if getattr(request.user, 'role', '') == 'ADMIN' or request.user.is_staff:
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'sender') and hasattr(obj, 'receiver'):
            return obj.sender == request.user or obj.receiver == request.user
        return False
