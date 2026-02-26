from django.contrib import admin
from .models import Bill


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('description', 'project', 'amount', 'due_date', 'status')
    list_filter = ('status', 'due_date')
