from django.contrib import admin

from .models import Employee, PayrollPeriod, PayrollEntry


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'code', 'company', 'designation', 'department', 'employment_type', 'salary_type', 'base_salary', 'is_active')
    list_filter = ('company', 'employment_type', 'salary_type', 'is_active', 'department')
    search_fields = ('first_name', 'last_name', 'code', 'cnic', 'phone', 'email')


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ('company', 'year', 'month', 'status', 'created_at', 'locked_at')
    list_filter = ('company', 'year', 'month', 'status')


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = ('period', 'employee', 'basic_salary', 'net_salary', 'is_paid', 'paid_date')
    list_filter = ('period__company', 'period__year', 'period__month', 'is_paid')

