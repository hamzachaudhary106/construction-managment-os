from django.contrib import admin
from .models import Budget, Expense, Income


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('project', 'category', 'amount')
    list_filter = ('category',)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('project', 'category', 'amount', 'description', 'date')
    list_filter = ('category', 'date')


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ('project', 'amount', 'description', 'date')
