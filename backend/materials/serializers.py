from rest_framework import serializers
from .models import Material, ProjectMaterial


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = '__all__'
        read_only_fields = ('created_at',)


class ProjectMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = ProjectMaterial
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
