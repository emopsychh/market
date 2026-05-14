from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib import messages

from .models import User, DeliveryAddress

try:
    from unfold.admin import ModelAdmin as UnfoldModelAdmin
except ImportError:  # pragma: no cover - fallback when unfold is not installed
    UnfoldModelAdmin = admin.ModelAdmin


@admin.register(User)
class UserAdmin(BaseUserAdmin, UnfoldModelAdmin):
    list_display = ('email', 'username', 'role', 'seller_status', 'is_staff')
    list_filter = ('role', 'seller_status', 'is_staff', 'is_active')
    search_fields = ('email', 'username')
    ordering = ('email',)
    filter_horizontal = ()
    actions = ('approve_seller_accounts', 'reject_seller_accounts')
    actions_on_top = True
    actions_on_bottom = False
    actions_selection_counter = False
    fieldsets = BaseUserAdmin.fieldsets + (
        (
            'Модерация продавца',
            {
                'fields': ('role', 'seller_status', 'seller_rejection_reason'),
            },
        ),
    )

    @admin.action(description='Одобрить выбранные заявки продавцов')
    def approve_seller_accounts(self, request, queryset):
        updated = queryset.filter(role=User.Role.SELLER).update(
            seller_status=User.SellerStatus.APPROVED,
            seller_rejection_reason='',
        )
        self.message_user(request, f'Одобрено заявок продавцов: {updated}', level=messages.SUCCESS)

    @admin.action(description='Отклонить выбранные заявки продавцов')
    def reject_seller_accounts(self, request, queryset):
        updated = queryset.filter(role=User.Role.SELLER).update(
            seller_status=User.SellerStatus.REJECTED,
            seller_rejection_reason='Заявка отклонена модератором',
        )
        self.message_user(request, f'Отклонено заявок продавцов: {updated}', level=messages.WARNING)


@admin.register(DeliveryAddress)
class DeliveryAddressAdmin(UnfoldModelAdmin):
    list_display = ('user', 'city', 'street', 'building', 'is_default')
    list_filter = ('city',)
    search_fields = ('user__email', 'city', 'street')
