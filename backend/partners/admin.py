from django.contrib import admin
from .models import Partner, ProjectInvestment, PartnerWithdrawal


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'company')
    list_filter = ('company',)
    search_fields = ('name',)


@admin.register(ProjectInvestment)
class ProjectInvestmentAdmin(admin.ModelAdmin):
    list_display = ('project', 'amount', 'investment_date', 'partner', 'created_at')
    list_filter = ('project', 'partner')
    date_hierarchy = 'investment_date'


@admin.register(PartnerWithdrawal)
class PartnerWithdrawalAdmin(admin.ModelAdmin):
    list_display = ('project', 'partner', 'amount', 'withdrawal_date', 'created_at')
    list_filter = ('project', 'partner')
    date_hierarchy = 'withdrawal_date'
