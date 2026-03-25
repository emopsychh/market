from django.contrib import admin
from .models import Category, Product, ProductImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent', 'order')
    list_filter = ('parent',)
    search_fields = ('name', 'slug')


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'category', 'gender', 'seller', 'status', 'created_at')
    list_filter = ('status', 'category', 'gender')
    search_fields = ('name', 'description')
    inlines = [ProductImageInline]
