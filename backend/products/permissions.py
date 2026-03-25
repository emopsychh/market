from rest_framework.permissions import BasePermission


class IsSellerOrAdmin(BasePermission):
    """Allow access to sellers and admins."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('seller', 'admin') or request.user.is_staff
