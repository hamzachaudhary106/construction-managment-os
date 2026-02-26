from django.contrib import admin
from .models import BankGuarantee


@admin.register(BankGuarantee)
class BankGuaranteeAdmin(admin.ModelAdmin):
    list_display = ('project', 'guarantee_type', 'bank_name', 'amount', 'validity_to')
    list_filter = ('guarantee_type',)
