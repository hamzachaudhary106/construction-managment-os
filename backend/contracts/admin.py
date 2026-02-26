from django.contrib import admin
from .models import Contract, ContractPaymentSchedule


class ContractPaymentScheduleInline(admin.TabularInline):
    model = ContractPaymentSchedule
    extra = 0


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'contractor_name', 'total_value', 'status')
    list_filter = ('status',)
    inlines = [ContractPaymentScheduleInline]


@admin.register(ContractPaymentSchedule)
class ContractPaymentScheduleAdmin(admin.ModelAdmin):
    list_display = ('contract', 'description', 'amount', 'due_date', 'status')
