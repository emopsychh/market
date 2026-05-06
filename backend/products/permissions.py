from rest_framework.permissions import BasePermission
from users.models import User


class IsSellerOrAdmin(BasePermission):
    """Allow access to sellers and admins."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in (User.Role.SELLER, User.Role.ADMIN) or request.user.is_staff
