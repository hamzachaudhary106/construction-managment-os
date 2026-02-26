from django.contrib import admin
from .models import FundTransfer


@admin.register(FundTransfer)
class FundTransferAdmin(admin.ModelAdmin):
    list_display = ('from_project', 'to_project', 'amount', 'transfer_date')
