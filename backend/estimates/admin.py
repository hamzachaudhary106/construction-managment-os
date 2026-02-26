from django.contrib import admin
from .models import Estimate, EstimateItem, ConstructionRate


class EstimateItemInline(admin.TabularInline):
    model = EstimateItem
    extra = 0
    fields = ('category', 'description', 'quantity', 'unit', 'unit_rate', 'amount')


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ('name', 'scope_display', 'version', 'status', 'estimate_date', 'total_display')
    list_filter = ('status', 'project')
    search_fields = ('name', 'project__name')
    inlines = [EstimateItemInline]
    readonly_fields = ('created_at', 'updated_at')

    def scope_display(self, obj):
        return obj.project.name if obj.project_id else 'Standalone'
    scope_display.short_description = 'Scope'

    def total_display(self, obj):
        return f"PKR {obj.total:,.2f}"
    total_display.short_description = 'Total (PKR)'


@admin.register(EstimateItem)
class EstimateItemAdmin(admin.ModelAdmin):
    list_display = ('description', 'estimate', 'category', 'quantity', 'unit', 'unit_rate', 'amount')
    list_filter = ('category', 'unit')


@admin.register(ConstructionRate)
class ConstructionRateAdmin(admin.ModelAdmin):
    list_display = ('city', 'construction_type', 'construction_mode', 'rate_per_sft', 'rate_min', 'rate_max', 'effective_date', 'company')
    list_filter = ('city', 'construction_type', 'construction_mode', 'company')
    search_fields = ('city',)
