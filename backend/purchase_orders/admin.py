from django.contrib import admin
from .models import PurchaseOrder, PurchaseOrderItem


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'project', 'supplier', 'status', 'order_date')
    list_filter = ('status',)
    inlines = [PurchaseOrderItemInline]
