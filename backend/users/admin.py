from django.contrib import admin
from django.contrib.admin.utils import unquote
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib import messages
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html
from django.utils.text import Truncator

from .models import User, DeliveryAddress, SellerApplication

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
            'Профиль',
            {
                'fields': ('bio',),
            },
        ),
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


class SellerApplicationQueueFilter(admin.SimpleListFilter):
    title = 'Очередь'
    parameter_name = 'queue'

    def lookups(self, request, model_admin):
        return (
            ('pending', 'На рассмотрении'),
            ('archive', 'Архив (обработанные)'),
            ('all', 'Все заявки'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'archive':
            return queryset.exclude(status=SellerApplication.Status.SUBMITTED)
        if self.value() == 'all':
            return queryset
        if self.value() is None and request.GET.get('q'):
            return queryset
        return queryset.filter(status=SellerApplication.Status.SUBMITTED)


@admin.register(SellerApplication)
class SellerApplicationAdmin(UnfoldModelAdmin):
    list_display = (
        'id',
        'display_name',
        'full_name',
        'user',
        'seller_type',
        'status',
        'phone',
        'city',
        'country',
        'description_short',
        'moderation_short',
        'created_at',
        'reviewed_at',
        'row_actions',
    )
    list_filter = (SellerApplicationQueueFilter, 'seller_type')
    search_fields = ('user__email', 'display_name', 'full_name', 'phone', 'city', 'description')
    readonly_fields = (
        'user',
        'seller_type',
        'display_name',
        'full_name',
        'phone',
        'city',
        'country',
        'description',
        'terms_accepted',
        'terms_accepted_at',
        'created_at',
    )
    fieldsets = (
        (
            'Модерация',
            {
                'fields': (
                    'status',
                    'moderation_comment',
                    'reviewed_at',
                    'reviewed_by',
                ),
            },
        ),
        (
            'Данные заявки',
            {
                'fields': (
                    'user',
                    'seller_type',
                    'display_name',
                    'full_name',
                    'phone',
                    'city',
                    'country',
                    'description',
                    'terms_accepted',
                    'terms_accepted_at',
                    'created_at',
                ),
            },
        ),
    )
    actions = ('approve_applications', 'reject_applications')
    actions_on_top = True
    actions_on_bottom = False
    actions_selection_counter = False

    @admin.display(description='Описание')
    def description_short(self, obj):
        return str(Truncator(obj.description).chars(100))

    @admin.display(description='Комментарий')
    def moderation_short(self, obj):
        if not obj.moderation_comment:
            return '—'
        return str(Truncator(obj.moderation_comment).chars(80))

    @admin.display(description='Действия')
    def row_actions(self, obj):
        if obj.status != SellerApplication.Status.SUBMITTED:
            return '—'
        approve_url = reverse('admin:users_sellerapplication_row_approve', args=[obj.pk])
        reject_url = reverse('admin:users_sellerapplication_row_reject', args=[obj.pk])
        return format_html(
            '<a href="{}">Одобрить</a> · <a href="{}">Отклонить</a>',
            approve_url,
            reject_url,
        )

    def get_urls(self):
        info = self.model._meta.app_label, self.model._meta.model_name
        return [
            path(
                '<path:object_id>/row-approve/',
                self.admin_site.admin_view(self.row_approve_view),
                name='%s_%s_row_approve' % info,
            ),
            path(
                '<path:object_id>/row-reject/',
                self.admin_site.admin_view(self.row_reject_view),
                name='%s_%s_row_reject' % info,
            ),
        ] + super().get_urls()

    def changelist_view(self, request, extra_context=None):
        if 'queue' not in request.GET and not request.GET.get('q'):
            params = request.GET.copy()
            params['queue'] = 'pending'
            return HttpResponseRedirect(f'{request.path}?{params.urlencode()}')
        return super().changelist_view(request, extra_context)

    def _approve_one(self, request, app: SellerApplication):
        app.status = SellerApplication.Status.APPROVED
        app.reviewed_at = timezone.now()
        app.reviewed_by = request.user
        app.save(update_fields=['status', 'reviewed_at', 'reviewed_by'])
        u = app.user
        u.role = User.Role.SELLER
        u.seller_status = User.SellerStatus.APPROVED
        u.seller_rejection_reason = ''
        u.save(update_fields=['role', 'seller_status', 'seller_rejection_reason'])

    def _reject_one(self, request, app: SellerApplication, comment: str):
        text = (comment or '').strip() or 'Заявка не прошла модерацию'
        app.status = SellerApplication.Status.REJECTED
        app.moderation_comment = text
        app.reviewed_at = timezone.now()
        app.reviewed_by = request.user
        app.save(update_fields=['status', 'moderation_comment', 'reviewed_at', 'reviewed_by'])
        u = app.user
        u.seller_status = User.SellerStatus.REJECTED
        u.seller_rejection_reason = text
        u.save(update_fields=['seller_status', 'seller_rejection_reason'])

    def row_approve_view(self, request, object_id):
        if not self.has_change_permission(request):
            return HttpResponseRedirect(reverse('admin:index'))
        app = get_object_or_404(SellerApplication, pk=unquote(object_id))
        if app.status != SellerApplication.Status.SUBMITTED:
            self.message_user(request, 'Эта заявка уже обработана.', level=messages.WARNING)
            return HttpResponseRedirect(reverse('admin:users_sellerapplication_changelist'))
        if request.method == 'POST':
            self._approve_one(request, app)
            self.message_user(request, 'Заявка одобрена.', level=messages.SUCCESS)
            return HttpResponseRedirect(reverse('admin:users_sellerapplication_changelist'))
        return render(
            request,
            'admin/users/sellerapplication/approve_confirm.html',
            {'app': app, **self.admin_site.each_context(request)},
        )

    def row_reject_view(self, request, object_id):
        if not self.has_change_permission(request):
            return HttpResponseRedirect(reverse('admin:index'))
        app = get_object_or_404(SellerApplication, pk=unquote(object_id))
        if app.status != SellerApplication.Status.SUBMITTED:
            self.message_user(request, 'Эта заявка уже обработана.', level=messages.WARNING)
            return HttpResponseRedirect(reverse('admin:users_sellerapplication_changelist'))
        if request.method == 'POST':
            reason = (request.POST.get('reason') or '').strip()
            if not reason:
                self.message_user(request, 'Укажите текст комментария (причину отклонения).', level=messages.ERROR)
            else:
                self._reject_one(request, app, reason)
                self.message_user(request, 'Заявка отклонена, комментарий сохранён.', level=messages.SUCCESS)
                return HttpResponseRedirect(reverse('admin:users_sellerapplication_changelist'))
        return render(
            request,
            'admin/users/sellerapplication/reject_reason.html',
            {'app': app, **self.admin_site.each_context(request)},
        )

    @admin.action(description='Одобрить выбранные заявки')
    def approve_applications(self, request, queryset):
        pending = queryset.filter(status=SellerApplication.Status.SUBMITTED)
        skipped = queryset.count() - pending.count()
        count = 0
        for app in pending:
            self._approve_one(request, app)
            count += 1
        if count:
            self.message_user(request, f'Одобрено заявок: {count}', level=messages.SUCCESS)
        if skipped:
            self.message_user(
                request,
                f'Пропущено записей (не в статусе «Подана»): {skipped}. Для них действие не применяется.',
                level=messages.WARNING,
            )
        if not count and not skipped:
            self.message_user(request, 'Нет выбранных заявок.', level=messages.WARNING)

    @admin.action(description='Отклонить выбранные заявки (комментарий из карточки или типовой текст)')
    def reject_applications(self, request, queryset):
        default_reason = 'Заявка не прошла модерацию'
        pending = queryset.filter(status=SellerApplication.Status.SUBMITTED)
        skipped = queryset.count() - pending.count()
        count = 0
        for app in pending:
            comment = (app.moderation_comment or '').strip() or default_reason
            self._reject_one(request, app, comment)
            count += 1
        if count:
            self.message_user(request, f'Отклонено заявок: {count}', level=messages.WARNING)
        if skipped:
            self.message_user(
                request,
                f'Пропущено записей (не в статусе «Подана»): {skipped}. Отклонённые заявки повторно не обрабатываются.',
                level=messages.INFO,
            )
        if not count and not skipped:
            self.message_user(request, 'Нет выбранных заявок.', level=messages.WARNING)


@admin.register(DeliveryAddress)
class DeliveryAddressAdmin(UnfoldModelAdmin):
    list_display = ('user', 'city', 'street', 'building', 'is_default')
    list_filter = ('city',)
    search_fields = ('user__email', 'city', 'street')
