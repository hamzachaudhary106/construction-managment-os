from rest_framework import serializers
from .models import Project, ProjectPhase, ProjectMilestone, ProjectPhoto


class ProjectPhaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectPhase
        fields = '__all__'


class ProjectSerializer(serializers.ModelSerializer):
    phases = ProjectPhaseSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = '__all__'


class ProjectPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectPhoto
        fields = '__all__'
        read_only_fields = ('created_at',)
