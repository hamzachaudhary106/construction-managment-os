from rest_framework import serializers
from .models import Equipment, EquipmentAllocation, EquipmentMaintenance


class EquipmentSerializer(serializers.ModelSerializer):
    owner_type_display = serializers.CharField(source='get_owner_type_display', read_only=True)

    class Meta:
        model = Equipment
        fields = '__all__'


class EquipmentAllocationSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = EquipmentAllocation
        fields = '__all__'


class EquipmentMaintenanceSerializer(serializers.ModelSerializer):
    maintenance_type_display = serializers.CharField(source='get_maintenance_type_display', read_only=True)
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)

    class Meta:
        model = EquipmentMaintenance
        fields = '__all__'
