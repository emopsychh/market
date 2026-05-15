from django import forms
from django.contrib import admin
from .models import Brand, Category, Product, ProductImage

try:
    from unfold.admin import ModelAdmin as UnfoldModelAdmin
    from unfold.admin import TabularInline as UnfoldTabularInline
except ImportError:  # pragma: no cover - fallback when unfold is not installed
    UnfoldModelAdmin = admin.ModelAdmin
    UnfoldTabularInline = admin.TabularInline


@admin.register(Brand)
class BrandAdmin(UnfoldModelAdmin):
    list_display = ('name', 'slug', 'order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('order', 'name')


@admin.register(Category)
class CategoryAdmin(UnfoldModelAdmin):
    list_display = ('name', 'slug', 'parent', 'order')
    list_filter = ('parent',)
    search_fields = ('name', 'slug')
    actions_on_top = True
    actions_on_bottom = False
    actions_selection_counter = False


class ProductImageInline(UnfoldTabularInline):
    model = ProductImage
    extra = 1


class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        publication_status = cleaned_data.get('publication_status')
        moderation_note = (cleaned_data.get('moderation_note') or '').strip()
        if publication_status == Product.PublicationStatus.REJECTED and not moderation_note:
            self.add_error('moderation_note', 'Укажите причину отклонения товара.')
        return cleaned_data


@admin.register(Product)
class ProductAdmin(UnfoldModelAdmin):
    form = ProductAdminForm
    list_display = (
        'name',
        'price',
        'category',
        'brand',
        'gender',
        'seller',
        'status',
        'publication_status',
        'created_at',
    )
    list_filter = ('status', 'publication_status', 'category', 'brand', 'gender')
    search_fields = ('name', 'description')
    inlines = [ProductImageInline]
    actions = ('publish_products', 'reject_products')
    actions_on_top = True
    actions_on_bottom = False
    actions_selection_counter = False

    @admin.action(description='Опубликовать выбранные товары')
    def publish_products(self, request, queryset):
        updated = queryset.update(
            publication_status=Product.PublicationStatus.PUBLISHED,
            moderation_note='',
        )
        self.message_user(request, f'Опубликовано товаров: {updated}')

    @admin.action(description='Отклонить выбранные товары')
    def reject_products(self, request, queryset):
        updated = queryset.update(
            publication_status=Product.PublicationStatus.REJECTED,
            moderation_note='Отклонено модератором',
        )
        self.message_user(request, f'Отклонено товаров: {updated}')
