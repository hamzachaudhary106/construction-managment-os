from django.contrib import admin
from .models import Equipment, EquipmentAllocation


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'equipment_type', 'owner_type')


@admin.register(EquipmentAllocation)
class EquipmentAllocationAdmin(admin.ModelAdmin):
    list_display = ('equipment', 'project', 'from_date', 'to_date', 'rate_per_day')
